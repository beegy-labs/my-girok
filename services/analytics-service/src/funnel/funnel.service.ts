import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClickHouseService } from '../shared/clickhouse/clickhouse.service';
import {
  FunnelQueryDto,
  FunnelResult,
  FunnelStepResult,
  FunnelComparison,
} from './dto/funnel-query.dto';

// Whitelist of allowed event names pattern (alphanumeric, underscore, dash)
const EVENT_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

@Injectable()
export class FunnelService {
  private readonly database: string;

  constructor(
    private readonly clickhouse: ClickHouseService,
    private readonly configService: ConfigService,
  ) {
    this.database = this.configService.get<string>('CLICKHOUSE_DATABASE') || 'analytics_db';
  }

  async analyzeFunnel(query: FunnelQueryDto): Promise<FunnelResult> {
    // Validate step names to prevent SQL injection
    this.validateStepNames(query.steps);

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
      const entered = stepResults[idx] ?? 0;
      const completed = stepResults[idx + 1] ?? 0;
      const prevEntered = idx === 0 ? entered : (stepResults[idx - 1] ?? 0);

      return {
        step,
        stepNumber: idx + 1,
        entered,
        completed: idx === steps.length - 1 ? entered : completed,
        dropoffRate: prevEntered > 0 ? ((prevEntered - entered) / prevEntered) * 100 : 0,
        conversionRate: stepResults[0] > 0 ? (entered / stepResults[0]) * 100 : 0,
        avgTimeToNext: avgTimes[idx] ?? null,
      };
    });

    const totalEntered = stepResults[0] ?? 0;
    const totalCompleted = stepResults[steps.length - 1] ?? 0;

    const totalAvgTime = avgTimes.reduce((sum: number, t) => sum + (t ?? 0), 0);

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
      previousRate: previous.steps[idx]?.conversionRate ?? 0,
      change: step.conversionRate - (previous.steps[idx]?.conversionRate ?? 0),
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
    // Validate step names
    this.validateStepNames(query.steps);

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
        FROM ${this.database}.events
        WHERE event_name = {completedStep:String}
          AND timestamp >= {startDate:DateTime64}
          AND timestamp <= {endDate:DateTime64}
        GROUP BY ${groupColumn}
      ),
      progressed AS (
        SELECT DISTINCT ${groupColumn} as id
        FROM ${this.database}.events
        WHERE event_name = {nextStep:String}
          AND timestamp >= {startDate:DateTime64}
          AND timestamp <= {endDate:DateTime64}
      )
      SELECT
        c.id as userId,
        {completedStep:String} as lastEvent,
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
    }>(sql, {
      completedStep,
      nextStep,
      startDate,
      endDate,
    });

    return result.data;
  }

  private validateStepNames(steps: string[]): void {
    for (const step of steps) {
      if (!EVENT_NAME_PATTERN.test(step)) {
        throw new BadRequestException(
          `Invalid step name: "${step}". Only alphanumeric characters, underscores, and dashes are allowed.`,
        );
      }
    }
  }

  private async getStepCounts(
    steps: string[],
    startDate: string,
    endDate: string,
    conversionWindow: number,
    groupColumn: string,
  ): Promise<number[]> {
    // Build windowFunnel conditions dynamically but safely
    // Steps are validated before this method is called
    const stepConditions = steps.map((_, idx) => `event_name = {step${idx}:String}`).join(', ');

    // Build params object with indexed step names
    const params: Record<string, unknown> = {
      startDate,
      endDate,
      conversionWindow,
    };
    steps.forEach((step, idx) => {
      params[`step${idx}`] = step;
    });

    const sql = `
      SELECT
        level,
        count() as users
      FROM (
        SELECT
          ${groupColumn},
          windowFunnel({conversionWindow:UInt32})(timestamp, ${stepConditions}) as level
        FROM ${this.database}.events
        WHERE timestamp >= {startDate:DateTime64}
          AND timestamp <= {endDate:DateTime64}
          AND event_name IN ({steps:Array(String)})
          ${groupColumn === 'user_id' ? 'AND user_id IS NOT NULL' : ''}
        GROUP BY ${groupColumn}
      )
      GROUP BY level
      ORDER BY level
    `;

    params.steps = steps;

    const result = await this.clickhouse.query<{ level: string; users: string }>(sql, params);

    // Convert to cumulative counts
    const levelCounts = new Map<number, number>();
    result.data.forEach((row) => {
      levelCounts.set(parseInt(row.level, 10), parseInt(row.users, 10));
    });

    // Calculate users at each step (cumulative from the end)
    const stepCounts: number[] = [];
    let cumulative = 0;
    for (let i = steps.length; i >= 0; i--) {
      cumulative += levelCounts.get(i) ?? 0;
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
    // Use Promise.all to parallelize queries instead of sequential execution
    const queries = steps.slice(0, -1).map((currentStep, i) => {
      const nextStep = steps[i + 1];

      const sql = `
        SELECT avg(time_diff) as avg_time
        FROM (
          SELECT
            dateDiff('second', e1.timestamp, e2.timestamp) as time_diff
          FROM ${this.database}.events e1
          JOIN analytics_db.events e2
            ON e1.${groupColumn} = e2.${groupColumn}
            AND e2.timestamp > e1.timestamp
          WHERE e1.event_name = {currentStep:String}
            AND e2.event_name = {nextStep:String}
            AND e1.timestamp >= {startDate:DateTime64}
            AND e1.timestamp <= {endDate:DateTime64}
            ${groupColumn === 'user_id' ? 'AND e1.user_id IS NOT NULL' : ''}
        )
      `;

      return this.clickhouse.query<{ avg_time: string }>(sql, {
        currentStep,
        nextStep,
        startDate,
        endDate,
      });
    });

    const results = await Promise.all(queries);

    return results.map((result) =>
      result.data[0]?.avg_time ? parseFloat(result.data[0].avg_time) : null,
    );
  }
}
