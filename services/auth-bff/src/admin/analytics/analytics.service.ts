import { Injectable, Logger } from '@nestjs/common';
import { ClickHouseService } from '../../common/services/clickhouse.service';

interface UserSessionsQuery {
  page: number;
  limit: number;
  startDate?: string;
  endDate?: string;
}

interface UsersOverviewQuery {
  page: number;
  limit: number;
  search?: string;
}

interface UserSummaryResult {
  total_sessions: number;
  total_duration: number;
  total_page_views: number;
  total_clicks: number;
  last_session_at: string;
  first_session_at: string;
}

interface SessionMetadata {
  session_id: string;
  actor_email: string | null;
  service_slug: string;
  started_at: string;
  ended_at: string | null;
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

interface UserLocationResult {
  country_code: string;
  session_count: number;
  total_duration: number;
}

interface TopUserResult {
  actor_id: string;
  actor_email: string | null;
  session_count: number;
  last_active: string;
}

interface UserOverviewResult {
  actor_id: string;
  actor_email: string | null;
  session_count: number;
  last_active: string;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly clickhouse: ClickHouseService) {}

  /**
   * Get user summary statistics
   */
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
        WHERE actor_id = {userId:UUID}
          AND status = 'completed'
      `;

      const result = await this.clickhouse.queryOne<UserSummaryResult>(query, { userId });

      if (!result) {
        return {
          userId,
          email: '',
          totalSessions: 0,
          totalDuration: 0,
          totalPageViews: 0,
          totalClicks: 0,
          countries: [],
          devices: [],
          lastSessionAt: new Date().toISOString(),
          firstSessionAt: new Date().toISOString(),
        };
      }

      // Get countries and devices
      const countriesQuery = `
        SELECT DISTINCT country_code
        FROM analytics_db.session_recording_metadata
        WHERE actor_id = {userId:UUID}
          AND country_code != ''
        ORDER BY country_code
        LIMIT 10
      `;

      const devicesQuery = `
        SELECT DISTINCT concat(browser, ' / ', os) as device
        FROM analytics_db.session_recording_metadata
        WHERE actor_id = {userId:UUID}
        ORDER BY device
        LIMIT 10
      `;

      const countries = await this.clickhouse.query<{ country_code: string }>(countriesQuery, {
        userId,
      });
      const devices = await this.clickhouse.query<{ device: string }>(devicesQuery, { userId });

      return {
        userId,
        email: '',
        totalSessions: result.total_sessions,
        totalDuration: result.total_duration,
        totalPageViews: result.total_page_views,
        totalClicks: result.total_clicks,
        countries: countries.map((c) => c.country_code),
        devices: devices.map((d) => d.device),
        lastSessionAt: result.last_session_at,
        firstSessionAt: result.first_session_at,
      };
    } catch (error) {
      this.logger.error(`Failed to get user summary: ${error}`);
      return {
        userId,
        email: '',
        totalSessions: 0,
        totalDuration: 0,
        totalPageViews: 0,
        totalClicks: 0,
        countries: [],
        devices: [],
        lastSessionAt: new Date().toISOString(),
        firstSessionAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Get user sessions with pagination
   */
  async getUserSessions(userId: string, query: UserSessionsQuery) {
    try {
      const offset = (query.page - 1) * query.limit;

      let dateFilter = '';
      const params: Record<string, unknown> = {
        userId,
        limit: query.limit,
        offset,
      };

      if (query.startDate) {
        dateFilter += ' AND started_at >= {startDate:DateTime}';
        params.startDate = query.startDate;
      }

      if (query.endDate) {
        dateFilter += ' AND started_at <= {endDate:DateTime}';
        params.endDate = query.endDate;
      }

      const sessionsQuery = `
        SELECT
          session_id,
          actor_email,
          service_slug,
          started_at,
          ended_at,
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
        WHERE actor_id = {userId:UUID}
          ${dateFilter}
        ORDER BY started_at DESC
        LIMIT {limit:UInt32}
        OFFSET {offset:UInt32}
      `;

      const countQuery = `
        SELECT count() as total
        FROM analytics_db.session_recording_metadata
        WHERE actor_id = {userId:UUID}
          ${dateFilter}
      `;

      const [sessions, countResult] = await Promise.all([
        this.clickhouse.query<SessionMetadata>(sessionsQuery, params),
        this.clickhouse.queryOne<{ total: number }>(countQuery, params),
      ]);

      return {
        data: sessions.map((s) => ({
          sessionId: s.session_id,
          actorEmail: s.actor_email,
          serviceSlug: s.service_slug,
          startedAt: s.started_at,
          endedAt: s.ended_at,
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
        total: countResult?.total || 0,
      };
    } catch (error) {
      this.logger.error(`Failed to get user sessions: ${error}`);
      return {
        data: [],
        total: 0,
      };
    }
  }

  /**
   * Get user location statistics
   */
  async getUserLocations(userId: string) {
    try {
      const query = `
        SELECT
          country_code,
          count() as session_count,
          sum(duration_seconds) as total_duration
        FROM analytics_db.session_recording_metadata
        WHERE actor_id = {userId:UUID}
          AND country_code != ''
        GROUP BY country_code
        ORDER BY session_count DESC
        LIMIT 20
      `;

      const results = await this.clickhouse.query<UserLocationResult>(query, { userId });

      return results.map((r) => ({
        countryCode: r.country_code,
        sessionCount: r.session_count,
        totalDuration: r.total_duration,
      }));
    } catch (error) {
      this.logger.error(`Failed to get user locations: ${error}`);
      return [];
    }
  }

  /**
   * Get top active users
   */
  async getTopUsers(limit: number) {
    try {
      const query = `
        SELECT
          actor_id,
          any(actor_email) as actor_email,
          count() as session_count,
          max(last_event_at) as last_active
        FROM analytics_db.session_recording_metadata
        WHERE actor_id IS NOT NULL
        GROUP BY actor_id
        ORDER BY session_count DESC
        LIMIT {limit:UInt32}
      `;

      const results = await this.clickhouse.query<TopUserResult>(query, { limit });

      return {
        data: results.map((r) => ({
          userId: r.actor_id,
          email: r.actor_email || '',
          sessionCount: r.session_count,
          lastActive: r.last_active,
        })),
        total: results.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get top users: ${error}`);
      return {
        data: [],
        total: 0,
      };
    }
  }

  /**
   * Get users overview with search and pagination
   */
  async getUsersOverview(query: UsersOverviewQuery) {
    try {
      const offset = (query.page - 1) * query.limit;

      let searchFilter = '';
      const params: Record<string, unknown> = {
        limit: query.limit,
        offset,
      };

      if (query.search) {
        searchFilter = ' AND actor_email LIKE {search:String}';
        params.search = `%${query.search}%`;
      }

      const usersQuery = `
        SELECT
          actor_id,
          any(actor_email) as actor_email,
          count() as session_count,
          max(last_event_at) as last_active
        FROM analytics_db.session_recording_metadata
        WHERE actor_id IS NOT NULL
          ${searchFilter}
        GROUP BY actor_id
        ORDER BY last_active DESC
        LIMIT {limit:UInt32}
        OFFSET {offset:UInt32}
      `;

      const countQuery = `
        SELECT count(DISTINCT actor_id) as total
        FROM analytics_db.session_recording_metadata
        WHERE actor_id IS NOT NULL
          ${searchFilter}
      `;

      const [users, countResult] = await Promise.all([
        this.clickhouse.query<UserOverviewResult>(usersQuery, params),
        this.clickhouse.queryOne<{ total: number }>(countQuery, params),
      ]);

      const total = countResult?.total || 0;
      const totalPages = Math.ceil(total / query.limit);

      return {
        data: users.map((u) => ({
          userId: u.actor_id,
          email: u.actor_email || '',
          sessionCount: u.session_count,
          lastActive: u.last_active,
        })),
        total,
        page: query.page,
        totalPages,
      };
    } catch (error) {
      this.logger.error(`Failed to get users overview: ${error}`);
      return {
        data: [],
        total: 0,
        page: query.page,
        totalPages: 0,
      };
    }
  }
}
