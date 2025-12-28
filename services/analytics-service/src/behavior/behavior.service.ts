import { Injectable, BadRequestException } from '@nestjs/common';
import { ClickHouseService } from '../shared/clickhouse/clickhouse.service';
import {
  BehaviorQueryDto,
  TopEventsQueryDto,
  UserBehaviorQueryDto,
  EventCountResult,
  TimeSeriesResult,
  UserActivityResult,
  BehaviorSummary,
  AggregationInterval,
} from './dto/behavior-query.dto';

/**
 * Whitelist of allowed date truncation functions in ClickHouse
 * Maps enum values to safe SQL function names
 * This prevents SQL injection via the interval parameter
 */
const DATE_TRUNC_FUNCTIONS: Record<AggregationInterval, string> = {
  [AggregationInterval.HOUR]: 'toStartOfHour',
  [AggregationInterval.DAY]: 'toStartOfDay',
  [AggregationInterval.WEEK]: 'toStartOfWeek',
  [AggregationInterval.MONTH]: 'toStartOfMonth',
};

@Injectable()
export class BehaviorService {
  constructor(private readonly clickhouse: ClickHouseService) {}

  async getSummary(query: BehaviorQueryDto): Promise<BehaviorSummary> {
    const [totalEvents, uniqueUsers, uniqueSessions, topEvents, eventsByCategory, timeSeries] =
      await Promise.all([
        this.getTotalEvents(query),
        this.getUniqueUsers(query),
        this.getUniqueSessions(query),
        this.getTopEvents({ ...query, limit: 10 }),
        this.getEventsByCategory(query),
        this.getTimeSeries(query),
      ]);

    return {
      totalEvents,
      uniqueUsers,
      uniqueSessions,
      topEvents,
      eventsByCategory,
      timeSeries,
    };
  }

  async getTopEvents(query: TopEventsQueryDto): Promise<EventCountResult[]> {
    const conditions: string[] = [
      'timestamp >= {startDate:DateTime64}',
      'timestamp <= {endDate:DateTime64}',
    ];
    const params: Record<string, unknown> = {
      startDate: query.startDate,
      endDate: query.endDate,
      limit: query.limit ?? 10,
    };

    if (query.category) {
      conditions.push('event_category = {category:String}');
      params.category = query.category;
    }

    const whereClause = conditions.join(' AND ');

    const sql = `
      SELECT
        event_name as eventName,
        event_category as category,
        count() as count
      FROM analytics_db.events
      WHERE ${whereClause}
      GROUP BY event_name, event_category
      ORDER BY count DESC
      LIMIT {limit:UInt32}
    `;

    const result = await this.clickhouse.query<{
      eventName: string;
      category: string;
      count: string;
    }>(sql, params);

    return result.data.map((row) => ({
      eventName: row.eventName,
      category: row.category,
      count: parseInt(row.count, 10),
    }));
  }

  async getTimeSeries(query: BehaviorQueryDto): Promise<TimeSeriesResult[]> {
    const interval = query.interval ?? AggregationInterval.DAY;

    // Use whitelist lookup to get safe SQL function name
    // This prevents SQL injection via the interval parameter
    const truncFunc = DATE_TRUNC_FUNCTIONS[interval];
    if (!truncFunc) {
      throw new BadRequestException(`Invalid aggregation interval: ${interval}`);
    }

    const sql = `
      SELECT
        ${truncFunc}(timestamp) as timestamp,
        count() as count
      FROM analytics_db.events
      WHERE timestamp >= {startDate:DateTime64}
        AND timestamp <= {endDate:DateTime64}
      GROUP BY timestamp
      ORDER BY timestamp ASC
      LIMIT {limit:UInt32}
    `;

    const params = {
      startDate: query.startDate,
      endDate: query.endDate,
      limit: query.limit ?? 1000,
    };

    const result = await this.clickhouse.query<{
      timestamp: string;
      count: string;
    }>(sql, params);

    return result.data.map((row) => ({
      timestamp: row.timestamp,
      count: parseInt(row.count, 10),
    }));
  }

  async getUserActivity(query: UserBehaviorQueryDto): Promise<UserActivityResult> {
    const conditions: string[] = ['user_id = {userId:String}'];
    const params: Record<string, unknown> = { userId: query.userId };

    if (query.startDate) {
      conditions.push('timestamp >= {startDate:DateTime64}');
      params.startDate = query.startDate;
    }
    if (query.endDate) {
      conditions.push('timestamp <= {endDate:DateTime64}');
      params.endDate = query.endDate;
    }

    const whereClause = conditions.join(' AND ');

    const [summary, topEvents] = await Promise.all([
      this.getUserSummary(whereClause, params),
      this.getUserTopEvents(whereClause, params, query.limit ?? 10),
    ]);

    return {
      userId: query.userId,
      ...summary,
      topEvents,
    };
  }

  async getEventsByCategory(query: BehaviorQueryDto): Promise<Record<string, number>> {
    const sql = `
      SELECT
        event_category as category,
        count() as count
      FROM analytics_db.events
      WHERE timestamp >= {startDate:DateTime64}
        AND timestamp <= {endDate:DateTime64}
      GROUP BY event_category
      ORDER BY count DESC
      LIMIT 100
    `;

    const params = {
      startDate: query.startDate,
      endDate: query.endDate,
    };

    const result = await this.clickhouse.query<{
      category: string;
      count: string;
    }>(sql, params);

    return result.data.reduce(
      (acc, row) => {
        acc[row.category] = parseInt(row.count, 10);
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private async getTotalEvents(query: BehaviorQueryDto): Promise<number> {
    const sql = `
      SELECT count() as count
      FROM analytics_db.events
      WHERE timestamp >= {startDate:DateTime64}
        AND timestamp <= {endDate:DateTime64}
    `;

    const result = await this.clickhouse.query<{ count: string }>(sql, {
      startDate: query.startDate,
      endDate: query.endDate,
    });
    return parseInt(result.data[0]?.count ?? '0', 10);
  }

  private async getUniqueUsers(query: BehaviorQueryDto): Promise<number> {
    const sql = `
      SELECT uniq(user_id) as count
      FROM analytics_db.events
      WHERE timestamp >= {startDate:DateTime64}
        AND timestamp <= {endDate:DateTime64}
        AND user_id IS NOT NULL
    `;

    const result = await this.clickhouse.query<{ count: string }>(sql, {
      startDate: query.startDate,
      endDate: query.endDate,
    });
    return parseInt(result.data[0]?.count ?? '0', 10);
  }

  private async getUniqueSessions(query: BehaviorQueryDto): Promise<number> {
    const sql = `
      SELECT uniq(session_id) as count
      FROM analytics_db.events
      WHERE timestamp >= {startDate:DateTime64}
        AND timestamp <= {endDate:DateTime64}
    `;

    const result = await this.clickhouse.query<{ count: string }>(sql, {
      startDate: query.startDate,
      endDate: query.endDate,
    });
    return parseInt(result.data[0]?.count ?? '0', 10);
  }

  private async getUserSummary(
    whereClause: string,
    params: Record<string, unknown>,
  ): Promise<{ totalEvents: number; uniqueSessions: number; firstSeen: string; lastSeen: string }> {
    const sql = `
      SELECT
        count() as totalEvents,
        uniq(session_id) as uniqueSessions,
        min(timestamp) as firstSeen,
        max(timestamp) as lastSeen
      FROM analytics_db.events
      WHERE ${whereClause}
    `;

    const result = await this.clickhouse.query<{
      totalEvents: string;
      uniqueSessions: string;
      firstSeen: string;
      lastSeen: string;
    }>(sql, params);

    const row = result.data[0];
    return {
      totalEvents: parseInt(row?.totalEvents ?? '0', 10),
      uniqueSessions: parseInt(row?.uniqueSessions ?? '0', 10),
      firstSeen: row?.firstSeen ?? '',
      lastSeen: row?.lastSeen ?? '',
    };
  }

  private async getUserTopEvents(
    whereClause: string,
    params: Record<string, unknown>,
    limit: number,
  ): Promise<EventCountResult[]> {
    const sql = `
      SELECT
        event_name as eventName,
        event_category as category,
        count() as count
      FROM analytics_db.events
      WHERE ${whereClause}
      GROUP BY event_name, event_category
      ORDER BY count DESC
      LIMIT {eventLimit:UInt32}
    `;

    const result = await this.clickhouse.query<{
      eventName: string;
      category: string;
      count: string;
    }>(sql, { ...params, eventLimit: limit });

    return result.data.map((row) => ({
      eventName: row.eventName,
      category: row.category,
      count: parseInt(row.count, 10),
    }));
  }
}
