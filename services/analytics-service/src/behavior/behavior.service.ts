import { Injectable } from '@nestjs/common';
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
    const categoryFilter = query.category ? `AND event_category = '${query.category}'` : '';

    const sql = `
      SELECT
        event_name as eventName,
        event_category as category,
        count() as count
      FROM analytics_db.events
      WHERE timestamp >= '${query.startDate}'
        AND timestamp <= '${query.endDate}'
        ${categoryFilter}
      GROUP BY event_name, event_category
      ORDER BY count DESC
      LIMIT ${query.limit || 10}
    `;

    const result = await this.clickhouse.query<{
      eventName: string;
      category: string;
      count: string;
    }>(sql);

    return result.data.map((row) => ({
      eventName: row.eventName,
      category: row.category,
      count: parseInt(row.count, 10),
    }));
  }

  async getTimeSeries(query: BehaviorQueryDto): Promise<TimeSeriesResult[]> {
    const interval = query.interval || AggregationInterval.DAY;
    const truncFunc = this.getDateTruncFunction(interval);

    const sql = `
      SELECT
        ${truncFunc}(timestamp) as timestamp,
        count() as count
      FROM analytics_db.events
      WHERE timestamp >= '${query.startDate}'
        AND timestamp <= '${query.endDate}'
      GROUP BY timestamp
      ORDER BY timestamp ASC
      LIMIT ${query.limit || 1000}
    `;

    const result = await this.clickhouse.query<{
      timestamp: string;
      count: string;
    }>(sql);

    return result.data.map((row) => ({
      timestamp: row.timestamp,
      count: parseInt(row.count, 10),
    }));
  }

  async getUserActivity(query: UserBehaviorQueryDto): Promise<UserActivityResult> {
    const dateFilter = this.buildDateFilter(query.startDate, query.endDate);

    const [summary, topEvents] = await Promise.all([
      this.getUserSummary(query.userId, dateFilter),
      this.getUserTopEvents(query.userId, dateFilter, query.limit || 10),
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
      WHERE timestamp >= '${query.startDate}'
        AND timestamp <= '${query.endDate}'
      GROUP BY event_category
      ORDER BY count DESC
    `;

    const result = await this.clickhouse.query<{
      category: string;
      count: string;
    }>(sql);

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
      WHERE timestamp >= '${query.startDate}'
        AND timestamp <= '${query.endDate}'
    `;

    const result = await this.clickhouse.query<{ count: string }>(sql);
    return parseInt(result.data[0]?.count || '0', 10);
  }

  private async getUniqueUsers(query: BehaviorQueryDto): Promise<number> {
    const sql = `
      SELECT uniq(user_id) as count
      FROM analytics_db.events
      WHERE timestamp >= '${query.startDate}'
        AND timestamp <= '${query.endDate}'
        AND user_id IS NOT NULL
    `;

    const result = await this.clickhouse.query<{ count: string }>(sql);
    return parseInt(result.data[0]?.count || '0', 10);
  }

  private async getUniqueSessions(query: BehaviorQueryDto): Promise<number> {
    const sql = `
      SELECT uniq(session_id) as count
      FROM analytics_db.events
      WHERE timestamp >= '${query.startDate}'
        AND timestamp <= '${query.endDate}'
    `;

    const result = await this.clickhouse.query<{ count: string }>(sql);
    return parseInt(result.data[0]?.count || '0', 10);
  }

  private async getUserSummary(
    userId: string,
    dateFilter: string,
  ): Promise<{ totalEvents: number; uniqueSessions: number; firstSeen: string; lastSeen: string }> {
    const sql = `
      SELECT
        count() as totalEvents,
        uniq(session_id) as uniqueSessions,
        min(timestamp) as firstSeen,
        max(timestamp) as lastSeen
      FROM analytics_db.events
      WHERE user_id = '${userId}'
        ${dateFilter}
    `;

    const result = await this.clickhouse.query<{
      totalEvents: string;
      uniqueSessions: string;
      firstSeen: string;
      lastSeen: string;
    }>(sql);

    const row = result.data[0];
    return {
      totalEvents: parseInt(row?.totalEvents || '0', 10),
      uniqueSessions: parseInt(row?.uniqueSessions || '0', 10),
      firstSeen: row?.firstSeen || '',
      lastSeen: row?.lastSeen || '',
    };
  }

  private async getUserTopEvents(
    userId: string,
    dateFilter: string,
    limit: number,
  ): Promise<EventCountResult[]> {
    const sql = `
      SELECT
        event_name as eventName,
        event_category as category,
        count() as count
      FROM analytics_db.events
      WHERE user_id = '${userId}'
        ${dateFilter}
      GROUP BY event_name, event_category
      ORDER BY count DESC
      LIMIT ${limit}
    `;

    const result = await this.clickhouse.query<{
      eventName: string;
      category: string;
      count: string;
    }>(sql);

    return result.data.map((row) => ({
      eventName: row.eventName,
      category: row.category,
      count: parseInt(row.count, 10),
    }));
  }

  private getDateTruncFunction(interval: AggregationInterval): string {
    switch (interval) {
      case AggregationInterval.HOUR:
        return 'toStartOfHour';
      case AggregationInterval.DAY:
        return 'toStartOfDay';
      case AggregationInterval.WEEK:
        return 'toStartOfWeek';
      case AggregationInterval.MONTH:
        return 'toStartOfMonth';
      default:
        return 'toStartOfDay';
    }
  }

  private buildDateFilter(startDate?: string, endDate?: string): string {
    const filters: string[] = [];
    if (startDate) filters.push(`timestamp >= '${startDate}'`);
    if (endDate) filters.push(`timestamp <= '${endDate}'`);
    return filters.length > 0 ? `AND ${filters.join(' AND ')}` : '';
  }
}
