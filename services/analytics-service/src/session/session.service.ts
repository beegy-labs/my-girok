import { Injectable } from '@nestjs/common';
import { ClickHouseService } from '../shared/clickhouse/clickhouse.service';
import {
  SessionQueryDto,
  SessionSummary,
  SessionDetail,
  SessionTimeline,
  SessionDistribution,
} from './dto/session-query.dto';

@Injectable()
export class SessionService {
  constructor(private readonly clickhouse: ClickHouseService) {}

  async getSummary(query: SessionQueryDto): Promise<SessionSummary> {
    const filters = this.buildFilters(query);

    const [basicMetrics, byDevice, byCountry, bySource] = await Promise.all([
      this.getBasicMetrics(query.startDate, query.endDate, filters),
      this.getByDimension('device_type', query.startDate, query.endDate, filters),
      this.getByDimension('country_code', query.startDate, query.endDate, filters),
      this.getByDimension('utm_source', query.startDate, query.endDate, filters),
    ]);

    return {
      ...basicMetrics,
      byDevice,
      byCountry,
      bySource,
    };
  }

  async getSessions(query: SessionQueryDto): Promise<SessionDetail[]> {
    const filters = this.buildFilters(query);
    const limit = query.limit || 100;

    const sql = `
      SELECT
        session_id as sessionId,
        user_id as userId,
        anonymous_id as anonymousId,
        toString(started_at) as startedAt,
        toString(ended_at) as endedAt,
        duration_seconds as duration,
        is_bounce as isBounce,
        is_converted as isConverted,
        entry_page as entryPage,
        exit_page as exitPage,
        page_view_count as pageViewCount,
        event_count as eventCount,
        device_type as deviceType,
        browser,
        os,
        country_code as countryCode,
        region,
        city,
        utm_source as utmSource,
        utm_medium as utmMedium,
        utm_campaign as utmCampaign
      FROM analytics_db.sessions
      WHERE started_at >= '${query.startDate}'
        AND started_at <= '${query.endDate}'
        ${filters}
      ORDER BY started_at DESC
      LIMIT ${limit}
    `;

    const result = await this.clickhouse.query<{
      sessionId: string;
      userId: string | null;
      anonymousId: string;
      startedAt: string;
      endedAt: string | null;
      duration: string;
      isBounce: string;
      isConverted: string;
      entryPage: string;
      exitPage: string;
      pageViewCount: string;
      eventCount: string;
      deviceType: string;
      browser: string;
      os: string;
      countryCode: string | null;
      region: string | null;
      city: string | null;
      utmSource: string | null;
      utmMedium: string | null;
      utmCampaign: string | null;
    }>(sql);

    return result.data.map((row) => ({
      sessionId: row.sessionId,
      userId: row.userId,
      anonymousId: row.anonymousId,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      duration: parseInt(row.duration, 10),
      isBounce: row.isBounce === '1',
      isConverted: row.isConverted === '1',
      entryPage: row.entryPage,
      exitPage: row.exitPage,
      pageViewCount: parseInt(row.pageViewCount, 10),
      eventCount: parseInt(row.eventCount, 10),
      device: {
        type: row.deviceType,
        browser: row.browser,
        os: row.os,
      },
      location: {
        country: row.countryCode,
        region: row.region,
        city: row.city,
      },
      utm: {
        source: row.utmSource,
        medium: row.utmMedium,
        campaign: row.utmCampaign,
      },
    }));
  }

  async getSessionTimeline(sessionId: string): Promise<SessionTimeline> {
    const [pageViews, events] = await Promise.all([
      this.getSessionPageViews(sessionId),
      this.getSessionEvents(sessionId),
    ]);

    const timeline = [
      ...pageViews.map((pv) => ({
        timestamp: pv.timestamp,
        type: 'page_view' as const,
        name: pv.pageTitle || pv.pagePath,
        path: pv.pagePath,
      })),
      ...events.map((ev) => ({
        timestamp: ev.timestamp,
        type: 'event' as const,
        name: ev.eventName,
        properties: ev.properties ? JSON.parse(ev.properties) : undefined,
      })),
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return {
      sessionId,
      events: timeline,
    };
  }

  async getDistribution(query: SessionQueryDto): Promise<SessionDistribution> {
    const filters = this.buildFilters(query);

    const [durationBuckets, pageViewBuckets, hourlyDist, dayDist] = await Promise.all([
      this.getDurationDistribution(query.startDate, query.endDate, filters),
      this.getPageViewDistribution(query.startDate, query.endDate, filters),
      this.getHourlyDistribution(query.startDate, query.endDate, filters),
      this.getDayOfWeekDistribution(query.startDate, query.endDate, filters),
    ]);

    return {
      durationBuckets,
      pageViewBuckets,
      hourlyDistribution: hourlyDist,
      dayOfWeekDistribution: dayDist,
    };
  }

  private async getBasicMetrics(
    startDate: string,
    endDate: string,
    filters: string,
  ): Promise<{
    totalSessions: number;
    uniqueUsers: number;
    avgDuration: number;
    avgPageViews: number;
    avgEvents: number;
    bounceRate: number;
    conversionRate: number;
  }> {
    const sql = `
      SELECT
        count() as totalSessions,
        uniq(user_id) as uniqueUsers,
        avg(duration_seconds) as avgDuration,
        avg(page_view_count) as avgPageViews,
        avg(event_count) as avgEvents,
        countIf(is_bounce = true) * 100.0 / count() as bounceRate,
        countIf(is_converted = true) * 100.0 / count() as conversionRate
      FROM analytics_db.sessions
      WHERE started_at >= '${startDate}'
        AND started_at <= '${endDate}'
        ${filters}
    `;

    const result = await this.clickhouse.query<{
      totalSessions: string;
      uniqueUsers: string;
      avgDuration: string;
      avgPageViews: string;
      avgEvents: string;
      bounceRate: string;
      conversionRate: string;
    }>(sql);

    const row = result.data[0];
    return {
      totalSessions: parseInt(row?.totalSessions || '0', 10),
      uniqueUsers: parseInt(row?.uniqueUsers || '0', 10),
      avgDuration: parseFloat(row?.avgDuration || '0'),
      avgPageViews: parseFloat(row?.avgPageViews || '0'),
      avgEvents: parseFloat(row?.avgEvents || '0'),
      bounceRate: parseFloat(row?.bounceRate || '0'),
      conversionRate: parseFloat(row?.conversionRate || '0'),
    };
  }

  private async getByDimension(
    dimension: string,
    startDate: string,
    endDate: string,
    filters: string,
  ): Promise<Record<string, number>> {
    const sql = `
      SELECT
        ${dimension} as dimension,
        count() as count
      FROM analytics_db.sessions
      WHERE started_at >= '${startDate}'
        AND started_at <= '${endDate}'
        AND ${dimension} IS NOT NULL
        AND ${dimension} != ''
        ${filters}
      GROUP BY ${dimension}
      ORDER BY count DESC
      LIMIT 20
    `;

    const result = await this.clickhouse.query<{ dimension: string; count: string }>(sql);
    return result.data.reduce(
      (acc, row) => {
        acc[row.dimension] = parseInt(row.count, 10);
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private async getSessionPageViews(
    sessionId: string,
  ): Promise<{ timestamp: string; pagePath: string; pageTitle: string }[]> {
    const sql = `
      SELECT
        toString(timestamp) as timestamp,
        page_path as pagePath,
        page_title as pageTitle
      FROM analytics_db.page_views
      WHERE session_id = '${sessionId}'
      ORDER BY timestamp ASC
    `;

    const result = await this.clickhouse.query<{
      timestamp: string;
      pagePath: string;
      pageTitle: string;
    }>(sql);
    return result.data;
  }

  private async getSessionEvents(
    sessionId: string,
  ): Promise<{ timestamp: string; eventName: string; properties: string }[]> {
    const sql = `
      SELECT
        toString(timestamp) as timestamp,
        event_name as eventName,
        properties
      FROM analytics_db.events
      WHERE session_id = '${sessionId}'
      ORDER BY timestamp ASC
    `;

    const result = await this.clickhouse.query<{
      timestamp: string;
      eventName: string;
      properties: string;
    }>(sql);
    return result.data;
  }

  private async getDurationDistribution(
    startDate: string,
    endDate: string,
    filters: string,
  ): Promise<{ range: string; count: number }[]> {
    const sql = `
      SELECT
        multiIf(
          duration_seconds < 10, '0-10s',
          duration_seconds < 30, '10-30s',
          duration_seconds < 60, '30-60s',
          duration_seconds < 180, '1-3m',
          duration_seconds < 600, '3-10m',
          duration_seconds < 1800, '10-30m',
          '>30m'
        ) as range,
        count() as count
      FROM analytics_db.sessions
      WHERE started_at >= '${startDate}'
        AND started_at <= '${endDate}'
        ${filters}
      GROUP BY range
      ORDER BY
        CASE range
          WHEN '0-10s' THEN 1
          WHEN '10-30s' THEN 2
          WHEN '30-60s' THEN 3
          WHEN '1-3m' THEN 4
          WHEN '3-10m' THEN 5
          WHEN '10-30m' THEN 6
          ELSE 7
        END
    `;

    const result = await this.clickhouse.query<{ range: string; count: string }>(sql);
    return result.data.map((row) => ({
      range: row.range,
      count: parseInt(row.count, 10),
    }));
  }

  private async getPageViewDistribution(
    startDate: string,
    endDate: string,
    filters: string,
  ): Promise<{ range: string; count: number }[]> {
    const sql = `
      SELECT
        multiIf(
          page_view_count = 1, '1 page',
          page_view_count <= 3, '2-3 pages',
          page_view_count <= 5, '4-5 pages',
          page_view_count <= 10, '6-10 pages',
          '>10 pages'
        ) as range,
        count() as count
      FROM analytics_db.sessions
      WHERE started_at >= '${startDate}'
        AND started_at <= '${endDate}'
        ${filters}
      GROUP BY range
      ORDER BY
        CASE range
          WHEN '1 page' THEN 1
          WHEN '2-3 pages' THEN 2
          WHEN '4-5 pages' THEN 3
          WHEN '6-10 pages' THEN 4
          ELSE 5
        END
    `;

    const result = await this.clickhouse.query<{ range: string; count: string }>(sql);
    return result.data.map((row) => ({
      range: row.range,
      count: parseInt(row.count, 10),
    }));
  }

  private async getHourlyDistribution(
    startDate: string,
    endDate: string,
    filters: string,
  ): Promise<{ hour: number; count: number }[]> {
    const sql = `
      SELECT
        toHour(started_at) as hour,
        count() as count
      FROM analytics_db.sessions
      WHERE started_at >= '${startDate}'
        AND started_at <= '${endDate}'
        ${filters}
      GROUP BY hour
      ORDER BY hour
    `;

    const result = await this.clickhouse.query<{ hour: string; count: string }>(sql);
    return result.data.map((row) => ({
      hour: parseInt(row.hour, 10),
      count: parseInt(row.count, 10),
    }));
  }

  private async getDayOfWeekDistribution(
    startDate: string,
    endDate: string,
    filters: string,
  ): Promise<{ day: string; count: number }[]> {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const sql = `
      SELECT
        toDayOfWeek(started_at) as dayNum,
        count() as count
      FROM analytics_db.sessions
      WHERE started_at >= '${startDate}'
        AND started_at <= '${endDate}'
        ${filters}
      GROUP BY dayNum
      ORDER BY dayNum
    `;

    const result = await this.clickhouse.query<{ dayNum: string; count: string }>(sql);
    return result.data.map((row) => ({
      day: days[parseInt(row.dayNum, 10) % 7],
      count: parseInt(row.count, 10),
    }));
  }

  private buildFilters(query: SessionQueryDto): string {
    const filters: string[] = [];

    if (query.userId) {
      filters.push(`user_id = '${query.userId}'`);
    }
    if (query.deviceType) {
      filters.push(`device_type = '${query.deviceType}'`);
    }
    if (query.countryCode) {
      filters.push(`country_code = '${query.countryCode}'`);
    }
    if (query.utmSource) {
      filters.push(`utm_source = '${query.utmSource}'`);
    }
    if (query.bouncedOnly) {
      filters.push(`is_bounce = true`);
    }
    if (query.convertedOnly) {
      filters.push(`is_converted = true`);
    }

    return filters.length > 0 ? `AND ${filters.join(' AND ')}` : '';
  }
}
