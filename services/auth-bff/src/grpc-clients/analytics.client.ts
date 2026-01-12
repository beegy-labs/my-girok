/**
 * Analytics gRPC Client
 *
 * Client for communicating with the analytics-service via gRPC.
 */

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { Observable, firstValueFrom, catchError, of } from 'rxjs';

// Request/Response types
export interface GetUserSummaryRequest {
  userId: string;
}

export interface GetUserSummaryResponse {
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

export interface GetUserSessionsRequest {
  userId: string;
  page: number;
  limit: number;
  startDate?: string;
  endDate?: string;
}

export interface UserSession {
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

export interface GetUserSessionsResponse {
  sessions: UserSession[];
  total: number;
  page: number;
  totalPages: number;
}

export interface GetUserLocationsRequest {
  userId: string;
}

export interface UserLocation {
  countryCode: string;
  sessionCount: number;
  totalDuration: number;
}

export interface GetUserLocationsResponse {
  locations: UserLocation[];
}

export interface GetTopUsersRequest {
  limit: number;
}

export interface TopUser {
  userId: string;
  email: string;
  sessionCount: number;
  lastActive: string;
}

export interface GetTopUsersResponse {
  users: TopUser[];
  total: number;
}

export interface GetUsersOverviewRequest {
  page: number;
  limit: number;
  search?: string;
}

export interface UserOverview {
  userId: string;
  email: string;
  sessionCount: number;
  lastActive: string;
}

export interface GetUsersOverviewResponse {
  users: UserOverview[];
  total: number;
  page: number;
  totalPages: number;
}

interface AnalyticsServiceClient {
  getUserSummary(request: GetUserSummaryRequest): Observable<GetUserSummaryResponse>;
  getUserSessions(request: GetUserSessionsRequest): Observable<GetUserSessionsResponse>;
  getUserLocations(request: GetUserLocationsRequest): Observable<GetUserLocationsResponse>;
  getTopUsers(request: GetTopUsersRequest): Observable<GetTopUsersResponse>;
  getUsersOverview(request: GetUsersOverviewRequest): Observable<GetUsersOverviewResponse>;
}

@Injectable()
export class AnalyticsGrpcClient implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsGrpcClient.name);
  private analyticsService!: AnalyticsServiceClient;
  private client!: ClientGrpc;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('grpc.analytics.host', 'localhost');
    const port = this.configService.get<number>('grpc.analytics.port', 50056);

    try {
      const protoBasePath = join(process.cwd(), '../../packages/proto');
      const { ClientProxyFactory } = require('@nestjs/microservices');

      this.client = ClientProxyFactory.create({
        transport: Transport.GRPC,
        options: {
          package: 'analytics.v1',
          protoPath: join(protoBasePath, 'analytics/v1/analytics.proto'),
          url: `${host}:${port}`,
          loader: {
            keepCase: false,
            longs: Number,
            enums: Number,
            defaults: true,
            oneofs: true,
            includeDirs: [protoBasePath],
          },
        },
      });

      this.analyticsService = this.client.getService<AnalyticsServiceClient>('AnalyticsService');
      this.isConnected = true;
      this.logger.log(`Analytics gRPC client initialized: ${host}:${port}`);
    } catch (error) {
      this.logger.warn(`Failed to initialize analytics gRPC client: ${error}`);
      this.isConnected = false;
    }
  }

  async getUserSummary(userId: string): Promise<GetUserSummaryResponse | null> {
    if (!this.isConnected || !this.analyticsService) {
      this.logger.warn('Analytics service not connected');
      return null;
    }

    try {
      return await firstValueFrom(
        this.analyticsService.getUserSummary({ userId }).pipe(
          catchError((error) => {
            this.logger.warn(`GetUserSummary failed: ${error.message}`);
            return of(null as any);
          }),
        ),
      );
    } catch (error) {
      this.logger.warn(`GetUserSummary failed: ${error}`);
      return null;
    }
  }

  async getUserSessions(
    userId: string,
    page: number,
    limit: number,
    startDate?: string,
    endDate?: string,
  ): Promise<GetUserSessionsResponse | null> {
    if (!this.isConnected || !this.analyticsService) {
      this.logger.warn('Analytics service not connected');
      return null;
    }

    try {
      return await firstValueFrom(
        this.analyticsService.getUserSessions({ userId, page, limit, startDate, endDate }).pipe(
          catchError((error) => {
            this.logger.warn(`GetUserSessions failed: ${error.message}`);
            return of(null as any);
          }),
        ),
      );
    } catch (error) {
      this.logger.warn(`GetUserSessions failed: ${error}`);
      return null;
    }
  }

  async getUserLocations(userId: string): Promise<UserLocation[]> {
    if (!this.isConnected || !this.analyticsService) {
      this.logger.warn('Analytics service not connected');
      return [];
    }

    try {
      const response = await firstValueFrom(
        this.analyticsService.getUserLocations({ userId }).pipe(
          catchError((error) => {
            this.logger.warn(`GetUserLocations failed: ${error.message}`);
            return of({ locations: [] });
          }),
        ),
      );
      return response.locations;
    } catch (error) {
      this.logger.warn(`GetUserLocations failed: ${error}`);
      return [];
    }
  }

  async getTopUsers(limit: number): Promise<GetTopUsersResponse | null> {
    if (!this.isConnected || !this.analyticsService) {
      this.logger.warn('Analytics service not connected');
      return null;
    }

    try {
      return await firstValueFrom(
        this.analyticsService.getTopUsers({ limit }).pipe(
          catchError((error) => {
            this.logger.warn(`GetTopUsers failed: ${error.message}`);
            return of(null as any);
          }),
        ),
      );
    } catch (error) {
      this.logger.warn(`GetTopUsers failed: ${error}`);
      return null;
    }
  }

  async getUsersOverview(
    page: number,
    limit: number,
    search?: string,
  ): Promise<GetUsersOverviewResponse | null> {
    if (!this.isConnected || !this.analyticsService) {
      this.logger.warn('Analytics service not connected');
      return null;
    }

    try {
      return await firstValueFrom(
        this.analyticsService.getUsersOverview({ page, limit, search }).pipe(
          catchError((error) => {
            this.logger.warn(`GetUsersOverview failed: ${error.message}`);
            return of(null as any);
          }),
        ),
      );
    } catch (error) {
      this.logger.warn(`GetUsersOverview failed: ${error}`);
      return null;
    }
  }

  isServiceConnected(): boolean {
    return this.isConnected;
  }
}
