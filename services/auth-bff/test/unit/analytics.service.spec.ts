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
      expect(result.lastSessionAt).toBe('2026-01-12T10:00:00Z');
      expect(result.firstSessionAt).toBe('2026-01-01T10:00:00Z');
      expect(analyticsClient.getUserSummary).toHaveBeenCalledWith('user-123');
    });

    it('should return empty summary when gRPC returns null', async () => {
      analyticsClient.getUserSummary.mockResolvedValueOnce(null);

      const result = await service.getUserSummary('user-123');

      expect(result.userId).toBe('user-123');
      expect(result.email).toBe('');
      expect(result.totalSessions).toBe(0);
      expect(result.totalDuration).toBe(0);
      expect(result.totalPageViews).toBe(0);
      expect(result.totalClicks).toBe(0);
      expect(result.countries).toEqual([]);
      expect(result.devices).toEqual([]);
      expect(result.lastSessionAt).toBeDefined();
      expect(result.firstSessionAt).toBeDefined();
    });

    it('should return empty summary when gRPC returns partial data', async () => {
      const mockResponse = {
        userId: 'user-456',
        totalSessions: 5,
        totalDuration: 1800,
        totalPageViews: 25,
        totalClicks: 50,
        countries: [],
        devices: [],
        lastSessionAt: null,
        firstSessionAt: null,
      };

      analyticsClient.getUserSummary.mockResolvedValueOnce(mockResponse);

      const result = await service.getUserSummary('user-456');

      expect(result.userId).toBe('user-456');
      expect(result.totalSessions).toBe(5);
      expect(result.countries).toEqual([]);
      expect(result.devices).toEqual([]);
      expect(result.lastSessionAt).toBeDefined();
      expect(result.firstSessionAt).toBeDefined();
    });

    it('should handle gRPC errors gracefully', async () => {
      analyticsClient.getUserSummary.mockRejectedValueOnce(new Error('gRPC error'));

      const result = await service.getUserSummary('user-123');

      expect(result.userId).toBe('user-123');
      expect(result.totalSessions).toBe(0);
      expect(result.totalDuration).toBe(0);
      expect(result.totalPageViews).toBe(0);
      expect(result.totalClicks).toBe(0);
      expect(result.countries).toEqual([]);
      expect(result.devices).toEqual([]);
    });

    it('should handle network timeouts', async () => {
      analyticsClient.getUserSummary.mockRejectedValueOnce(new Error('DEADLINE_EXCEEDED: Timeout'));

      const result = await service.getUserSummary('user-789');

      expect(result.userId).toBe('user-789');
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
      expect(result.data[0].serviceSlug).toBe('web-app');
      expect(result.data[0].durationSeconds).toBe(3600);
      expect(result.data[0].status).toBe('completed');
      expect(analyticsClient.getUserSessions).toHaveBeenCalledWith(
        'user-123',
        1,
        20,
        undefined,
        undefined,
      );
    });

    it('should handle sessions with null endedAt', async () => {
      const mockResponse = {
        sessions: [
          {
            sessionId: 'session-2',
            actorEmail: 'active@example.com',
            serviceSlug: 'web-app',
            startedAt: '2026-01-12T10:00:00Z',
            endedAt: null,
            durationSeconds: 0,
            pageViews: 5,
            clicks: 10,
            entryPage: '/dashboard',
            browser: 'Firefox',
            os: 'macOS',
            deviceType: 'desktop',
            countryCode: 'KR',
            status: 'active',
          },
        ],
        total: 1,
        page: 1,
        totalPages: 1,
      };

      analyticsClient.getUserSessions.mockResolvedValueOnce(mockResponse);

      const result = await service.getUserSessions('user-456', { page: 1, limit: 20 });

      expect(result.data[0].endedAt).toBeNull();
      expect(result.data[0].status).toBe('active');
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

    it('should handle multiple sessions across pages', async () => {
      const mockResponse = {
        sessions: Array.from({ length: 20 }, (_, i) => ({
          sessionId: `session-${i}`,
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
        })),
        total: 50,
        page: 2,
        totalPages: 3,
      };

      analyticsClient.getUserSessions.mockResolvedValueOnce(mockResponse);

      const result = await service.getUserSessions('user-123', { page: 2, limit: 20 });

      expect(result.data).toHaveLength(20);
      expect(result.total).toBe(50);
    });

    it('should return empty results when gRPC returns null', async () => {
      analyticsClient.getUserSessions.mockResolvedValueOnce(null);

      const result = await service.getUserSessions('user-123', { page: 1, limit: 20 });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
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
      expect(result[0].totalDuration).toBe(7200);
      expect(result[1].countryCode).toBe('KR');
      expect(result[1].sessionCount).toBe(5);
      expect(result[1].totalDuration).toBe(3600);
      expect(analyticsClient.getUserLocations).toHaveBeenCalledWith('user-123');
    });

    it('should return empty array when no locations found', async () => {
      analyticsClient.getUserLocations.mockResolvedValueOnce([]);

      const result = await service.getUserLocations('user-456');

      expect(result).toEqual([]);
    });

    it('should handle single location', async () => {
      const mockLocations = [{ countryCode: 'JP', sessionCount: 3, totalDuration: 1800 }];

      analyticsClient.getUserLocations.mockResolvedValueOnce(mockLocations);

      const result = await service.getUserLocations('user-789');

      expect(result).toHaveLength(1);
      expect(result[0].countryCode).toBe('JP');
    });

    it('should return empty array on gRPC error', async () => {
      analyticsClient.getUserLocations.mockRejectedValueOnce(new Error('gRPC error'));

      const result = await service.getUserLocations('user-123');

      expect(result).toEqual([]);
    });

    it('should handle network errors', async () => {
      analyticsClient.getUserLocations.mockRejectedValueOnce(new Error('Connection refused'));

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
      expect(result.data[0].email).toBe('user1@example.com');
      expect(result.data[0].sessionCount).toBe(100);
      expect(result.data[0].lastActive).toBe('2026-01-12T10:00:00Z');
      expect(result.data[1].sessionCount).toBe(50);
      expect(result.total).toBe(2);
      expect(analyticsClient.getTopUsers).toHaveBeenCalledWith(10);
    });

    it('should handle different limit values', async () => {
      const mockResponse = {
        users: Array.from({ length: 5 }, (_, i) => ({
          userId: `user-${i}`,
          email: `user${i}@example.com`,
          sessionCount: 100 - i * 10,
          lastActive: '2026-01-12T10:00:00Z',
        })),
        total: 5,
      };

      analyticsClient.getTopUsers.mockResolvedValueOnce(mockResponse);

      const result = await service.getTopUsers(5);

      expect(result.data).toHaveLength(5);
      expect(analyticsClient.getTopUsers).toHaveBeenCalledWith(5);
    });

    it('should return empty results when gRPC returns null', async () => {
      analyticsClient.getTopUsers.mockResolvedValueOnce(null);

      const result = await service.getTopUsers(10);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle empty user list', async () => {
      const mockResponse = {
        users: [],
        total: 0,
      };

      analyticsClient.getTopUsers.mockResolvedValueOnce(mockResponse);

      const result = await service.getTopUsers(10);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
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
      expect(result.data[0].userId).toBe('user-1');
      expect(result.data[0].email).toBe('user1@example.com');
      expect(result.data[0].sessionCount).toBe(10);
      expect(result.data[0].lastActive).toBe('2026-01-12T10:00:00Z');
      expect(result.total).toBe(50);
      expect(result.totalPages).toBe(3);
      expect(result.page).toBe(1);
      expect(analyticsClient.getUsersOverview).toHaveBeenCalledWith(1, 20, undefined);
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

    it('should handle empty search results', async () => {
      const mockResponse = {
        users: [],
        total: 0,
        page: 1,
        totalPages: 0,
      };

      analyticsClient.getUsersOverview.mockResolvedValueOnce(mockResponse);

      const result = await service.getUsersOverview({ page: 1, limit: 20, search: 'nonexistent' });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should return empty results when gRPC returns null', async () => {
      analyticsClient.getUsersOverview.mockResolvedValueOnce(null);

      const result = await service.getUsersOverview({ page: 1, limit: 20 });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(0);
    });

    it('should handle multiple pages correctly', async () => {
      const mockResponse = {
        users: Array.from({ length: 20 }, (_, i) => ({
          userId: `user-${i + 21}`,
          email: `user${i + 21}@example.com`,
          sessionCount: 5,
          lastActive: '2026-01-12T10:00:00Z',
        })),
        total: 50,
        page: 2,
        totalPages: 3,
      };

      analyticsClient.getUsersOverview.mockResolvedValueOnce(mockResponse);

      const result = await service.getUsersOverview({ page: 2, limit: 20 });

      expect(result.data).toHaveLength(20);
      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(3);
    });

    it('should handle different limit values', async () => {
      const mockResponse = {
        users: Array.from({ length: 50 }, (_, i) => ({
          userId: `user-${i}`,
          email: `user${i}@example.com`,
          sessionCount: 3,
          lastActive: '2026-01-12T10:00:00Z',
        })),
        total: 100,
        page: 1,
        totalPages: 2,
      };

      analyticsClient.getUsersOverview.mockResolvedValueOnce(mockResponse);

      const result = await service.getUsersOverview({ page: 1, limit: 50 });

      expect(result.data).toHaveLength(50);
      expect(analyticsClient.getUsersOverview).toHaveBeenCalledWith(1, 50, undefined);
    });

    it('should handle gRPC errors', async () => {
      analyticsClient.getUsersOverview.mockRejectedValueOnce(new Error('gRPC error'));

      const result = await service.getUsersOverview({ page: 1, limit: 20 });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(0);
    });
  });
});
