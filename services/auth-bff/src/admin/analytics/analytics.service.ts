import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsGrpcClient } from '../../grpc-clients/analytics.client';

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

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly analyticsClient: AnalyticsGrpcClient) {}

  /**
   * Get user summary statistics
   */
  async getUserSummary(userId: string) {
    try {
      const result = await this.analyticsClient.getUserSummary(userId);

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

      return {
        userId: result.userId,
        email: '',
        totalSessions: result.totalSessions,
        totalDuration: result.totalDuration,
        totalPageViews: result.totalPageViews,
        totalClicks: result.totalClicks,
        countries: result.countries,
        devices: result.devices,
        lastSessionAt: result.lastSessionAt || new Date().toISOString(),
        firstSessionAt: result.firstSessionAt || new Date().toISOString(),
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
      const result = await this.analyticsClient.getUserSessions(
        userId,
        query.page,
        query.limit,
        query.startDate,
        query.endDate,
      );

      if (!result) {
        return {
          data: [],
          total: 0,
        };
      }

      return {
        data: result.sessions.map((s) => ({
          sessionId: s.sessionId,
          actorEmail: s.actorEmail,
          serviceSlug: s.serviceSlug,
          startedAt: s.startedAt,
          endedAt: s.endedAt || null,
          durationSeconds: s.durationSeconds,
          pageViews: s.pageViews,
          clicks: s.clicks,
          entryPage: s.entryPage,
          browser: s.browser,
          os: s.os,
          deviceType: s.deviceType,
          countryCode: s.countryCode,
          status: s.status,
        })),
        total: result.total,
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
      const results = await this.analyticsClient.getUserLocations(userId);

      return results.map((r) => ({
        countryCode: r.countryCode,
        sessionCount: r.sessionCount,
        totalDuration: r.totalDuration,
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
      const result = await this.analyticsClient.getTopUsers(limit);

      if (!result) {
        return {
          data: [],
          total: 0,
        };
      }

      return {
        data: result.users.map((u) => ({
          userId: u.userId,
          email: u.email,
          sessionCount: u.sessionCount,
          lastActive: u.lastActive,
        })),
        total: result.total,
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
      const result = await this.analyticsClient.getUsersOverview(
        query.page,
        query.limit,
        query.search,
      );

      if (!result) {
        return {
          data: [],
          total: 0,
          page: query.page,
          totalPages: 0,
        };
      }

      return {
        data: result.users.map((u) => ({
          userId: u.userId,
          email: u.email,
          sessionCount: u.sessionCount,
          lastActive: u.lastActive,
        })),
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
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
