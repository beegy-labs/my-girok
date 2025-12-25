import { Injectable } from '@nestjs/common';
import { ClickHouseService } from '../shared/clickhouse/clickhouse.service';
import {
  FunnelQueryDto,
  FunnelResult,
  FunnelStepResult,
  FunnelComparison,
} from './dto/funnel-query.dto';

@Injectable()
export class FunnelService {
  constructor(private readonly clickhouse: ClickHouseService) {}

  async analyzeFunnel(query: FunnelQueryDto): Promise<FunnelResult> {
    const { steps, startDate, endDate, conversionWindow = 86400, groupBy = 'user' } = query;
    const groupColumn = groupBy === 'user' ? 'user_id' : 'session_id';

    const stepResults = await this.getStepCounts(
      steps,
      startDate,
      endDate,
      conversionWindow,
      groupColumn,
    );

    const avgTimes = await this.getAverageTimeBetweenSteps(steps, startDate, endDate, groupColumn);

    const funnelSteps: FunnelStepResult[] = steps.map((step, idx) => {
      const entered = stepResults[idx] || 0;
      const completed = stepResults[idx + 1] || 0;
      const prevEntered = idx === 0 ? entered : stepResults[idx - 1] || 0;

      return {
        step,
        stepNumber: idx + 1,
        entered,
        completed: idx === steps.length - 1 ? entered : completed,
        dropoffRate: prevEntered > 0 ? ((prevEntered - entered) / prevEntered) * 100 : 0,
        conversionRate: stepResults[0] > 0 ? (entered / stepResults[0]) * 100 : 0,
        avgTimeToNext: avgTimes[idx] || null,
      };
    });

    const totalEntered = stepResults[0] || 0;
    const totalCompleted = stepResults[steps.length - 1] || 0;

    const totalAvgTime = avgTimes.reduce((sum: number, t) => sum + (t || 0), 0);

    return {
      steps: funnelSteps,
      overallConversionRate: totalEntered > 0 ? (totalCompleted / totalEntered) * 100 : 0,
      totalEntered,
      totalCompleted,
      avgTimeToComplete: totalAvgTime > 0 ? totalAvgTime : null,
    };
  }

  async compareFunnels(
    query: FunnelQueryDto,
    previousStartDate: string,
    previousEndDate: string,
  ): Promise<FunnelComparison> {
    const [current, previous] = await Promise.all([
      this.analyzeFunnel(query),
      this.analyzeFunnel({
        ...query,
        startDate: previousStartDate,
        endDate: previousEndDate,
      }),
    ]);

    const stepChanges = current.steps.map((step, idx) => ({
      step: step.step,
      currentRate: step.conversionRate,
      previousRate: previous.steps[idx]?.conversionRate || 0,
      change: step.conversionRate - (previous.steps[idx]?.conversionRate || 0),
    }));

    return {
      current,
      previous,
      conversionChange: current.overallConversionRate - previous.overallConversionRate,
      stepChanges,
    };
  }

  async getDropoffUsers(
    query: FunnelQueryDto,
    atStep: number,
  ): Promise<{ userId: string; lastEvent: string; lastEventTime: string }[]> {
    const { steps, startDate, endDate, groupBy = 'user' } = query;
    const groupColumn = groupBy === 'user' ? 'user_id' : 'session_id';

    if (atStep < 1 || atStep >= steps.length) {
      return [];
    }

    const completedStep = steps[atStep - 1];
    const nextStep = steps[atStep];

    const sql = `
      WITH completed AS (
        SELECT DISTINCT ${groupColumn} as id, max(timestamp) as completed_time
        FROM analytics_db.events
        WHERE event_name = '${completedStep}'
          AND timestamp >= '${startDate}'
          AND timestamp <= '${endDate}'
        GROUP BY ${groupColumn}
      ),
      progressed AS (
        SELECT DISTINCT ${groupColumn} as id
        FROM analytics_db.events
        WHERE event_name = '${nextStep}'
          AND timestamp >= '${startDate}'
          AND timestamp <= '${endDate}'
      )
      SELECT
        c.id as userId,
        '${completedStep}' as lastEvent,
        toString(c.completed_time) as lastEventTime
      FROM completed c
      LEFT JOIN progressed p ON c.id = p.id
      WHERE p.id IS NULL
      LIMIT 100
    `;

    const result = await this.clickhouse.query<{
      userId: string;
      lastEvent: string;
      lastEventTime: string;
    }>(sql);

    return result.data;
  }

  private async getStepCounts(
    steps: string[],
    startDate: string,
    endDate: string,
    conversionWindow: number,
    groupColumn: string,
  ): Promise<number[]> {
    const stepConditions = steps.map((step) => `event_name = '${step}'`).join(', ');

    const sql = `
      SELECT
        level,
        count() as users
      FROM (
        SELECT
          ${groupColumn},
          windowFunnel(${conversionWindow})(timestamp, ${stepConditions}) as level
        FROM analytics_db.events
        WHERE timestamp >= '${startDate}'
          AND timestamp <= '${endDate}'
          AND event_name IN (${steps.map((s) => `'${s}'`).join(', ')})
          ${groupColumn === 'user_id' ? 'AND user_id IS NOT NULL' : ''}
        GROUP BY ${groupColumn}
      )
      GROUP BY level
      ORDER BY level
    `;

    const result = await this.clickhouse.query<{ level: string; users: string }>(sql);

    // Convert to cumulative counts
    const levelCounts = new Map<number, number>();
    result.data.forEach((row) => {
      levelCounts.set(parseInt(row.level, 10), parseInt(row.users, 10));
    });

    // Calculate users at each step (cumulative from the end)
    const stepCounts: number[] = [];
    let cumulative = 0;
    for (let i = steps.length; i >= 0; i--) {
      cumulative += levelCounts.get(i) || 0;
      stepCounts[i] = cumulative;
    }

    return stepCounts.slice(1); // Remove the 0-level count
  }

  private async getAverageTimeBetweenSteps(
    steps: string[],
    startDate: string,
    endDate: string,
    groupColumn: string,
  ): Promise<(number | null)[]> {
    const avgTimes: (number | null)[] = [];

    for (let i = 0; i < steps.length - 1; i++) {
      const currentStep = steps[i];
      const nextStep = steps[i + 1];

      const sql = `
        SELECT avg(time_diff) as avg_time
        FROM (
          SELECT
            dateDiff('second', e1.timestamp, e2.timestamp) as time_diff
          FROM analytics_db.events e1
          JOIN analytics_db.events e2
            ON e1.${groupColumn} = e2.${groupColumn}
            AND e2.timestamp > e1.timestamp
          WHERE e1.event_name = '${currentStep}'
            AND e2.event_name = '${nextStep}'
            AND e1.timestamp >= '${startDate}'
            AND e1.timestamp <= '${endDate}'
            ${groupColumn === 'user_id' ? 'AND e1.user_id IS NOT NULL' : ''}
        )
      `;

      const result = await this.clickhouse.query<{ avg_time: string }>(sql);
      avgTimes.push(result.data[0]?.avg_time ? parseFloat(result.data[0].avg_time) : null);
    }

    return avgTimes;
  }
}
