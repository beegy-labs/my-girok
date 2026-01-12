/**
 * User Analytics Service
 *
 * Provides user-level analytics from session recording metadata
 */

import { Injectable, Logger } from '@nestjs/common';
import { ClickHouseService } from '../shared/clickhouse/clickhouse.service';

interface UserSummaryResult {
  total_sessions: number;
  total_duration: number;
  total_page_views: number;
  total_clicks: number;
  last_session_at?: string;
  first_session_at?: string;
}

interface CountryResult {
  country_code: string;
}

interface DeviceResult {
  device: string;
}

interface SessionResult {
  session_id: string;
  actor_email: string;
  service_slug: string;
  started_at: string;
  ended_at?: string;
  duration_seconds: number;
  page_views: number;
  clicks: number;
  entry_page: string;
  browser: string;
  os: string;
  device_type: string;
  country_code: string;
  status: string;
}

interface LocationResult {
  country_code: string;
  session_count: number;
  total_duration: number;
}

interface TopUserResult {
  actor_id: string;
  actor_email: string;
  session_count: number;
  last_active: string;
}

interface UsersOverviewResult {
  actor_id: string;
  actor_email: string;
  session_count: number;
  last_active: string;
}

@Injectable()
export class UserAnalyticsService {
  private readonly logger = new Logger(UserAnalyticsService.name);

  constructor(private readonly clickhouse: ClickHouseService) {}

  async getUserSummary(userId: string) {
    try {
      const query = `
        SELECT
          count() as total_sessions,
          sum(duration_seconds) as total_duration,
          sum(page_views) as total_page_views,
          sum(clicks) as total_clicks,
          max(last_event_at) as last_session_at,
          min(started_at) as first_session_at
        FROM analytics_db.session_recording_metadata
        WHERE actor_id = {userId:String}
          AND status = 'completed'
      `;

      const result = await this.clickhouse.query<UserSummaryResult>(query, { userId });

      if (!result.data || result.data.length === 0) {
        return {
          userId,
          totalSessions: 0,
          totalDuration: 0,
          totalPageViews: 0,
          totalClicks: 0,
          lastSessionAt: '',
          firstSessionAt: '',
          countries: [],
          devices: [],
        };
      }

      const countriesQuery = `
        SELECT DISTINCT country_code
        FROM analytics_db.session_recording_metadata
        WHERE actor_id = {userId:String}
          AND country_code != ''
          AND status = 'completed'
      `;

      const devicesQuery = `
        SELECT DISTINCT concat(browser, ' / ', os) as device
        FROM analytics_db.session_recording_metadata
        WHERE actor_id = {userId:String}
          AND status = 'completed'
      `;

      const [countries, devices] = await Promise.all([
        this.clickhouse.query<CountryResult>(countriesQuery, { userId }),
        this.clickhouse.query<DeviceResult>(devicesQuery, { userId }),
      ]);

      const summaryData = result.data[0];

      return {
        userId,
        totalSessions: summaryData.total_sessions,
        totalDuration: summaryData.total_duration,
        totalPageViews: summaryData.total_page_views,
        totalClicks: summaryData.total_clicks,
        lastSessionAt: summaryData.last_session_at || '',
        firstSessionAt: summaryData.first_session_at || '',
        countries: countries.data.map((c: CountryResult) => c.country_code),
        devices: devices.data.map((d: DeviceResult) => d.device),
      };
    } catch (error) {
      this.logger.error(`Failed to get user summary: ${error}`);
      return {
        userId,
        totalSessions: 0,
        totalDuration: 0,
        totalPageViews: 0,
        totalClicks: 0,
        lastSessionAt: '',
        firstSessionAt: '',
        countries: [],
        devices: [],
      };
    }
  }

  async getUserSessions(
    userId: string,
    page: number,
    limit: number,
    startDate?: string,
    endDate?: string,
  ) {
    try {
      const skip = (page - 1) * limit;

      let whereConditions = ['actor_id = {userId:String}', "status = 'completed'"];
      const params: Record<string, unknown> = { userId, limit, skip };

      if (startDate) {
        whereConditions.push('started_at >= {startDate:DateTime}');
        params.startDate = startDate;
      }

      if (endDate) {
        whereConditions.push('started_at <= {endDate:DateTime}');
        params.endDate = endDate;
      }

      const whereClause = whereConditions.join(' AND ');

      const query = `
        SELECT
          session_id,
          actor_email,
          service_slug,
          formatDateTime(started_at, '%Y-%m-%dT%H:%i:%sZ') as started_at,
          if(ended_at IS NOT NULL, formatDateTime(ended_at, '%Y-%m-%dT%H:%i:%sZ'), NULL) as ended_at,
          duration_seconds,
          page_views,
          clicks,
          entry_page,
          browser,
          os,
          device_type,
          country_code,
          status
        FROM analytics_db.session_recording_metadata
        WHERE ${whereClause}
        ORDER BY started_at DESC
        LIMIT {limit:UInt32}
        OFFSET {skip:UInt32}
      `;

      const countQuery = `
        SELECT count() as total
        FROM analytics_db.session_recording_metadata
        WHERE ${whereClause}
      `;

      const [sessions, countResult] = await Promise.all([
        this.clickhouse.query<SessionResult>(query, params),
        this.clickhouse.query<{ total: number }>(countQuery, params),
      ]);

      const total = countResult.data[0]?.total || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        sessions: sessions.data.map((s: SessionResult) => ({
          sessionId: s.session_id,
          actorEmail: s.actor_email,
          serviceSlug: s.service_slug,
          startedAt: s.started_at,
          endedAt: s.ended_at || '',
          durationSeconds: s.duration_seconds,
          pageViews: s.page_views,
          clicks: s.clicks,
          entryPage: s.entry_page,
          browser: s.browser,
          os: s.os,
          deviceType: s.device_type,
          countryCode: s.country_code,
          status: s.status,
        })),
        total,
        page,
        totalPages,
      };
    } catch (error) {
      this.logger.error(`Failed to get user sessions: ${error}`);
      return {
        sessions: [],
        total: 0,
        page,
        totalPages: 0,
      };
    }
  }

  async getUserLocations(userId: string) {
    try {
      const query = `
        SELECT
          country_code,
          count() as session_count,
          sum(duration_seconds) as total_duration
        FROM analytics_db.session_recording_metadata
        WHERE actor_id = {userId:String}
          AND country_code != ''
          AND status = 'completed'
        GROUP BY country_code
        ORDER BY session_count DESC
      `;

      const locations = await this.clickhouse.query<LocationResult>(query, { userId });

      return locations.data.map((l: LocationResult) => ({
        countryCode: l.country_code,
        sessionCount: l.session_count,
        totalDuration: l.total_duration,
      }));
    } catch (error) {
      this.logger.error(`Failed to get user locations: ${error}`);
      return [];
    }
  }

  async getTopUsers(limit: number) {
    try {
      const query = `
        SELECT
          actor_id,
          any(actor_email) as actor_email,
          count() as session_count,
          max(last_event_at) as last_active
        FROM analytics_db.session_recording_metadata
        WHERE actor_id != ''
          AND status = 'completed'
        GROUP BY actor_id
        ORDER BY session_count DESC
        LIMIT {limit:UInt32}
      `;

      const users = await this.clickhouse.query<TopUserResult>(query, { limit });

      return {
        users: users.data.map((u: TopUserResult) => ({
          userId: u.actor_id,
          email: u.actor_email,
          sessionCount: u.session_count,
          lastActive: u.last_active,
        })),
        total: users.data.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get top users: ${error}`);
      return {
        users: [],
        total: 0,
      };
    }
  }

  async getUsersOverview(page: number, limit: number, search?: string) {
    try {
      const skip = (page - 1) * limit;

      let whereConditions = ["actor_id != ''", "status = 'completed'"];
      const params: Record<string, unknown> = { limit, skip };

      if (search) {
        whereConditions.push('actor_email LIKE {search:String}');
        params.search = `%${search}%`;
      }

      const whereClause = whereConditions.join(' AND ');

      const query = `
        SELECT
          actor_id,
          any(actor_email) as actor_email,
          count() as session_count,
          max(last_event_at) as last_active
        FROM analytics_db.session_recording_metadata
        WHERE ${whereClause}
        GROUP BY actor_id
        ORDER BY session_count DESC
        LIMIT {limit:UInt32}
        OFFSET {skip:UInt32}
      `;

      const countQuery = `
        SELECT count(DISTINCT actor_id) as total
        FROM analytics_db.session_recording_metadata
        WHERE ${whereClause}
      `;

      const [users, countResult] = await Promise.all([
        this.clickhouse.query<UsersOverviewResult>(query, params),
        this.clickhouse.query<{ total: number }>(countQuery, params),
      ]);

      const total = countResult.data[0]?.total || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        users: users.data.map((u: UsersOverviewResult) => ({
          userId: u.actor_id,
          email: u.actor_email,
          sessionCount: u.session_count,
          lastActive: u.last_active,
        })),
        total,
        page,
        totalPages,
      };
    } catch (error) {
      this.logger.error(`Failed to get users overview: ${error}`);
      return {
        users: [],
        total: 0,
        page,
        totalPages: 0,
      };
    }
  }
}
