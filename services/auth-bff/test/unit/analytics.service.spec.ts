import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach, type MockInstance } from 'vitest';
import { AnalyticsService } from '../../src/admin/analytics/analytics.service';
import { AnalyticsGrpcClient } from '../../src/grpc-clients/analytics.client';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let analyticsClient: {
    getUserSummary: MockInstance;
    getUserSessions: MockInstance;
    getUserLocations: MockInstance;
    getTopUsers: MockInstance;
    getUsersOverview: MockInstance;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: AnalyticsGrpcClient,
          useValue: {
            getUserSummary: vi.fn(),
            getUserSessions: vi.fn(),
            getUserLocations: vi.fn(),
            getTopUsers: vi.fn(),
            getUsersOverview: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    analyticsClient = module.get(AnalyticsGrpcClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserSummary', () => {
    it('should return user summary statistics from gRPC', async () => {
      const mockResponse = {
        userId: 'user-123',
        totalSessions: 10,
        totalDuration: 3600,
        totalPageViews: 50,
        totalClicks: 100,
        lastSessionAt: '2026-01-12T10:00:00Z',
        firstSessionAt: '2026-01-01T10:00:00Z',
        countries: ['US', 'KR'],
        devices: ['Chrome / Windows', 'Safari / macOS'],
      };

      analyticsClient.getUserSummary.mockResolvedValueOnce(mockResponse);

      const result = await service.getUserSummary('user-123');

      expect(result.userId).toBe('user-123');
      expect(result.totalSessions).toBe(10);
      expect(result.totalDuration).toBe(3600);
      expect(result.totalPageViews).toBe(50);
      expect(result.totalClicks).toBe(100);
      expect(result.countries).toEqual(['US', 'KR']);
      expect(result.devices).toEqual(['Chrome / Windows', 'Safari / macOS']);
    });

    it('should return empty summary when gRPC returns null', async () => {
      analyticsClient.getUserSummary.mockResolvedValueOnce(null);

      const result = await service.getUserSummary('user-123');

      expect(result.totalSessions).toBe(0);
      expect(result.totalDuration).toBe(0);
      expect(result.countries).toEqual([]);
      expect(result.devices).toEqual([]);
    });

    it('should handle gRPC errors gracefully', async () => {
      analyticsClient.getUserSummary.mockRejectedValueOnce(new Error('gRPC error'));

      const result = await service.getUserSummary('user-123');

      expect(result.totalSessions).toBe(0);
    });
  });

  describe('getUserSessions', () => {
    it('should return paginated user sessions from gRPC', async () => {
      const mockResponse = {
        sessions: [
          {
            sessionId: 'session-1',
            actorEmail: 'user@example.com',
            serviceSlug: 'web-app',
            startedAt: '2026-01-12T10:00:00Z',
            endedAt: '2026-01-12T11:00:00Z',
            durationSeconds: 3600,
            pageViews: 10,
            clicks: 20,
            entryPage: '/home',
            browser: 'Chrome',
            os: 'Windows',
            deviceType: 'desktop',
            countryCode: 'US',
            status: 'completed',
          },
        ],
        total: 1,
        page: 1,
        totalPages: 1,
      };

      analyticsClient.getUserSessions.mockResolvedValueOnce(mockResponse);

      const result = await service.getUserSessions('user-123', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].sessionId).toBe('session-1');
      expect(result.data[0].actorEmail).toBe('user@example.com');
    });

    it('should pass date filters to gRPC', async () => {
      const mockResponse = {
        sessions: [],
        total: 0,
        page: 1,
        totalPages: 0,
      };

      analyticsClient.getUserSessions.mockResolvedValueOnce(mockResponse);

      await service.getUserSessions('user-123', {
        page: 1,
        limit: 20,
        startDate: '2026-01-01',
        endDate: '2026-01-12',
      });

      expect(analyticsClient.getUserSessions).toHaveBeenCalledWith(
        'user-123',
        1,
        20,
        '2026-01-01',
        '2026-01-12',
      );
    });

    it('should handle gRPC errors and return empty results', async () => {
      analyticsClient.getUserSessions.mockRejectedValueOnce(new Error('gRPC error'));

      const result = await service.getUserSessions('user-123', { page: 1, limit: 20 });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getUserLocations', () => {
    it('should return user location statistics from gRPC', async () => {
      const mockLocations = [
        { countryCode: 'US', sessionCount: 10, totalDuration: 7200 },
        { countryCode: 'KR', sessionCount: 5, totalDuration: 3600 },
      ];

      analyticsClient.getUserLocations.mockResolvedValueOnce(mockLocations);

      const result = await service.getUserLocations('user-123');

      expect(result).toHaveLength(2);
      expect(result[0].countryCode).toBe('US');
      expect(result[0].sessionCount).toBe(10);
      expect(result[1].countryCode).toBe('KR');
    });

    it('should return empty array on gRPC error', async () => {
      analyticsClient.getUserLocations.mockRejectedValueOnce(new Error('gRPC error'));

      const result = await service.getUserLocations('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('getTopUsers', () => {
    it('should return top active users from gRPC', async () => {
      const mockResponse = {
        users: [
          {
            userId: 'user-1',
            email: 'user1@example.com',
            sessionCount: 100,
            lastActive: '2026-01-12T10:00:00Z',
          },
          {
            userId: 'user-2',
            email: 'user2@example.com',
            sessionCount: 50,
            lastActive: '2026-01-12T09:00:00Z',
          },
        ],
        total: 2,
      };

      analyticsClient.getTopUsers.mockResolvedValueOnce(mockResponse);

      const result = await service.getTopUsers(10);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].userId).toBe('user-1');
      expect(result.data[0].sessionCount).toBe(100);
      expect(result.total).toBe(2);
    });

    it('should handle gRPC errors', async () => {
      analyticsClient.getTopUsers.mockRejectedValueOnce(new Error('gRPC error'));

      const result = await service.getTopUsers(10);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getUsersOverview', () => {
    it('should return paginated users overview from gRPC', async () => {
      const mockResponse = {
        users: [
          {
            userId: 'user-1',
            email: 'user1@example.com',
            sessionCount: 10,
            lastActive: '2026-01-12T10:00:00Z',
          },
        ],
        total: 50,
        page: 1,
        totalPages: 3,
      };

      analyticsClient.getUsersOverview.mockResolvedValueOnce(mockResponse);

      const result = await service.getUsersOverview({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(50);
      expect(result.totalPages).toBe(3);
      expect(result.page).toBe(1);
    });

    it('should pass search filter to gRPC', async () => {
      const mockResponse = {
        users: [],
        total: 0,
        page: 1,
        totalPages: 0,
      };

      analyticsClient.getUsersOverview.mockResolvedValueOnce(mockResponse);

      await service.getUsersOverview({ page: 1, limit: 20, search: 'john' });

      expect(analyticsClient.getUsersOverview).toHaveBeenCalledWith(1, 20, 'john');
    });

    it('should handle gRPC errors', async () => {
      analyticsClient.getUsersOverview.mockRejectedValueOnce(new Error('gRPC error'));

      const result = await service.getUsersOverview({ page: 1, limit: 20 });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
