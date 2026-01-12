/**
 * User Analytics gRPC Controller
 *
 * Implements the AnalyticsService gRPC interface
 */

import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { UserAnalyticsService } from './user-analytics.service';

// gRPC message types
interface GetUserSummaryRequest {
  userId: string;
}

interface GetUserSummaryResponse {
  userId: string;
  totalSessions: number;
  totalDuration: number;
  totalPageViews: number;
  totalClicks: number;
  lastSessionAt?: string;
  firstSessionAt?: string;
  countries: string[];
  devices: string[];
}

interface GetUserSessionsRequest {
  userId: string;
  page: number;
  limit: number;
  startDate?: string;
  endDate?: string;
}

interface UserSession {
  sessionId: string;
  actorEmail: string;
  serviceSlug: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  pageViews: number;
  clicks: number;
  entryPage: string;
  browser: string;
  os: string;
  deviceType: string;
  countryCode: string;
  status: string;
}

interface GetUserSessionsResponse {
  sessions: UserSession[];
  total: number;
  page: number;
  totalPages: number;
}

interface GetUserLocationsRequest {
  userId: string;
}

interface UserLocation {
  countryCode: string;
  sessionCount: number;
  totalDuration: number;
}

interface GetUserLocationsResponse {
  locations: UserLocation[];
}

interface GetTopUsersRequest {
  limit: number;
}

interface TopUser {
  userId: string;
  email: string;
  sessionCount: number;
  lastActive: string;
}

interface GetTopUsersResponse {
  users: TopUser[];
  total: number;
}

interface GetUsersOverviewRequest {
  page: number;
  limit: number;
  search?: string;
}

interface UserOverview {
  userId: string;
  email: string;
  sessionCount: number;
  lastActive: string;
}

interface GetUsersOverviewResponse {
  users: UserOverview[];
  total: number;
  page: number;
  totalPages: number;
}

@Controller()
export class UserAnalyticsGrpcController {
  private readonly logger = new Logger(UserAnalyticsGrpcController.name);

  constructor(private readonly userAnalyticsService: UserAnalyticsService) {}

  @GrpcMethod('AnalyticsService', 'GetUserSummary')
  async getUserSummary(request: GetUserSummaryRequest): Promise<GetUserSummaryResponse> {
    try {
      return await this.userAnalyticsService.getUserSummary(request.userId);
    } catch (error) {
      this.logger.error(`GetUserSummary failed: ${error}`);
      throw error;
    }
  }

  @GrpcMethod('AnalyticsService', 'GetUserSessions')
  async getUserSessions(request: GetUserSessionsRequest): Promise<GetUserSessionsResponse> {
    try {
      return await this.userAnalyticsService.getUserSessions(
        request.userId,
        request.page,
        request.limit,
        request.startDate,
        request.endDate,
      );
    } catch (error) {
      this.logger.error(`GetUserSessions failed: ${error}`);
      throw error;
    }
  }

  @GrpcMethod('AnalyticsService', 'GetUserLocations')
  async getUserLocations(request: GetUserLocationsRequest): Promise<GetUserLocationsResponse> {
    try {
      const locations = await this.userAnalyticsService.getUserLocations(request.userId);
      return { locations };
    } catch (error) {
      this.logger.error(`GetUserLocations failed: ${error}`);
      throw error;
    }
  }

  @GrpcMethod('AnalyticsService', 'GetTopUsers')
  async getTopUsers(request: GetTopUsersRequest): Promise<GetTopUsersResponse> {
    try {
      return await this.userAnalyticsService.getTopUsers(request.limit);
    } catch (error) {
      this.logger.error(`GetTopUsers failed: ${error}`);
      throw error;
    }
  }

  @GrpcMethod('AnalyticsService', 'GetUsersOverview')
  async getUsersOverview(request: GetUsersOverviewRequest): Promise<GetUsersOverviewResponse> {
    try {
      return await this.userAnalyticsService.getUsersOverview(
        request.page,
        request.limit,
        request.search,
      );
    } catch (error) {
      this.logger.error(`GetUsersOverview failed: ${error}`);
      throw error;
    }
  }
}
