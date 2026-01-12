import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach, type MockInstance } from 'vitest';
import { UserAnalyticsService } from '../../src/user-analytics/user-analytics.service';
import { ClickHouseService } from '../../src/shared/clickhouse/clickhouse.service';

describe('UserAnalyticsService', () => {
  let service: UserAnalyticsService;
  let clickhouseService: {
    query: MockInstance;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserAnalyticsService,
        {
          provide: ClickHouseService,
          useValue: {
            query: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserAnalyticsService>(UserAnalyticsService);
    clickhouseService = module.get(ClickHouseService);
  });

  describe('getUserSummary', () => {
    it('should return user summary with all metrics', async () => {
      const mockSummary = {
        total_sessions: 10,
        total_duration: 3600,
        total_page_views: 50,
        total_clicks: 100,
        last_session_at: '2026-01-12T10:00:00Z',
        first_session_at: '2026-01-01T10:00:00Z',
      };

      const mockCountries = [{ country_code: 'US' }, { country_code: 'KR' }];
      const mockDevices = [{ device: 'Chrome / Windows' }, { device: 'Safari / macOS' }];

      clickhouseService.query
        .mockResolvedValueOnce({ data: [mockSummary] })
        .mockResolvedValueOnce({ data: mockCountries })
        .mockResolvedValueOnce({ data: mockDevices });

      const result = await service.getUserSummary('user-123');

      expect(result).toEqual({
        userId: 'user-123',
        totalSessions: 10,
        totalDuration: 3600,
        totalPageViews: 50,
        totalClicks: 100,
        lastSessionAt: '2026-01-12T10:00:00Z',
        firstSessionAt: '2026-01-01T10:00:00Z',
        countries: ['US', 'KR'],
        devices: ['Chrome / Windows', 'Safari / macOS'],
      });
    });

    it('should return empty summary when no data found', async () => {
      clickhouseService.query.mockResolvedValue({ data: [] });

      const result = await service.getUserSummary('user-123');

      expect(result).toEqual({
        userId: 'user-123',
        totalSessions: 0,
        totalDuration: 0,
        totalPageViews: 0,
        totalClicks: 0,
        lastSessionAt: '',
        firstSessionAt: '',
        countries: [],
        devices: [],
      });
    });

    it('should handle errors gracefully', async () => {
      clickhouseService.query.mockRejectedValue(new Error('Connection error'));

      const result = await service.getUserSummary('user-123');

      expect(result.totalSessions).toBe(0);
      expect(result.countries).toEqual([]);
      expect(result.devices).toEqual([]);
    });

    it('should filter by completed status', async () => {
      clickhouseService.query
        .mockResolvedValueOnce({ data: [{ total_sessions: 5 }] })
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [] });

      await service.getUserSummary('user-123');

      expect(clickhouseService.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'completed'"),
        expect.any(Object),
      );
    });
  });

  describe('getUserSessions', () => {
    it('should return paginated user sessions', async () => {
      const mockSessions = [
        {
          session_id: 'session-1',
          actor_email: 'user@example.com',
          service_slug: 'web-app',
          started_at: '2026-01-12T10:00:00Z',
          ended_at: '2026-01-12T10:05:00Z',
          duration_seconds: 300,
          page_views: 5,
          clicks: 10,
          entry_page: '/home',
          browser: 'Chrome',
          os: 'Windows',
          device_type: 'desktop',
          country_code: 'US',
          status: 'completed',
        },
      ];

      clickhouseService.query
        .mockResolvedValueOnce({ data: mockSessions })
        .mockResolvedValueOnce({ data: [{ total: 1 }] });

      const result = await service.getUserSessions('user-123', 1, 20);

      expect(result.sessions).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.sessions[0]).toEqual({
        sessionId: 'session-1',
        actorEmail: 'user@example.com',
        serviceSlug: 'web-app',
        startedAt: '2026-01-12T10:00:00Z',
        endedAt: '2026-01-12T10:05:00Z',
        durationSeconds: 300,
        pageViews: 5,
        clicks: 10,
        entryPage: '/home',
        browser: 'Chrome',
        os: 'Windows',
        deviceType: 'desktop',
        countryCode: 'US',
        status: 'completed',
      });
    });

    it('should apply date filters', async () => {
      clickhouseService.query
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [{ total: 0 }] });

      await service.getUserSessions('user-123', 1, 20, '2026-01-01', '2026-01-31');

      expect(clickhouseService.query).toHaveBeenCalledWith(
        expect.stringContaining('started_at >= {startDate:DateTime}'),
        expect.objectContaining({
          startDate: '2026-01-01',
          endDate: '2026-01-31',
        }),
      );
    });

    it('should calculate pagination correctly', async () => {
      clickhouseService.query
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [{ total: 50 }] });

      const result = await service.getUserSessions('user-123', 3, 10);

      expect(result.page).toBe(3);
      expect(result.totalPages).toBe(5);
      expect(clickhouseService.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          limit: 10,
          skip: 20, // (3 - 1) * 10
        }),
      );
    });

    it('should handle errors and return empty result', async () => {
      clickhouseService.query.mockRejectedValue(new Error('Query error'));

      const result = await service.getUserSessions('user-123', 1, 20);

      expect(result.sessions).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should handle null ended_at', async () => {
      const mockSessions = [
        {
          session_id: 'session-1',
          actor_email: 'user@example.com',
          service_slug: 'web-app',
          started_at: '2026-01-12T10:00:00Z',
          ended_at: null,
          duration_seconds: 0,
          page_views: 0,
          clicks: 0,
          entry_page: '',
          browser: 'Chrome',
          os: 'Windows',
          device_type: 'desktop',
          country_code: 'US',
          status: 'recording',
        },
      ];

      clickhouseService.query
        .mockResolvedValueOnce({ data: mockSessions })
        .mockResolvedValueOnce({ data: [{ total: 1 }] });

      const result = await service.getUserSessions('user-123', 1, 20);

      expect(result.sessions[0].endedAt).toBe('');
    });
  });

  describe('getUserLocations', () => {
    it('should return user locations with metrics', async () => {
      const mockLocations = [
        { country_code: 'US', session_count: 10, total_duration: 7200 },
        { country_code: 'KR', session_count: 5, total_duration: 3600 },
      ];

      clickhouseService.query.mockResolvedValue({ data: mockLocations });

      const result = await service.getUserLocations('user-123');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        countryCode: 'US',
        sessionCount: 10,
        totalDuration: 7200,
      });
      expect(result[1]).toEqual({
        countryCode: 'KR',
        sessionCount: 5,
        totalDuration: 3600,
      });
    });

    it('should order by session count DESC', async () => {
      clickhouseService.query.mockResolvedValue({ data: [] });

      await service.getUserLocations('user-123');

      expect(clickhouseService.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY session_count DESC'),
        expect.any(Object),
      );
    });

    it('should filter out empty country codes', async () => {
      clickhouseService.query.mockResolvedValue({ data: [] });

      await service.getUserLocations('user-123');

      expect(clickhouseService.query).toHaveBeenCalledWith(
        expect.stringContaining("country_code != ''"),
        expect.any(Object),
      );
    });

    it('should handle errors and return empty array', async () => {
      clickhouseService.query.mockRejectedValue(new Error('Query error'));

      const result = await service.getUserLocations('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('getTopUsers', () => {
    it('should return top users by session count', async () => {
      const mockUsers = [
        {
          actor_id: 'user-1',
          actor_email: 'user1@example.com',
          session_count: 100,
          last_active: '2026-01-12T10:00:00Z',
        },
        {
          actor_id: 'user-2',
          actor_email: 'user2@example.com',
          session_count: 50,
          last_active: '2026-01-12T09:00:00Z',
        },
      ];

      clickhouseService.query.mockResolvedValue({ data: mockUsers });

      const result = await service.getTopUsers(10);

      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.users[0]).toEqual({
        userId: 'user-1',
        email: 'user1@example.com',
        sessionCount: 100,
        lastActive: '2026-01-12T10:00:00Z',
      });
    });

    it('should limit results correctly', async () => {
      clickhouseService.query.mockResolvedValue({ data: [] });

      await service.getTopUsers(5);

      expect(clickhouseService.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT {limit:UInt32}'),
        { limit: 5 },
      );
    });

    it('should order by session count DESC', async () => {
      clickhouseService.query.mockResolvedValue({ data: [] });

      await service.getTopUsers(10);

      expect(clickhouseService.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY session_count DESC'),
        expect.any(Object),
      );
    });

    it('should handle errors and return empty result', async () => {
      clickhouseService.query.mockRejectedValue(new Error('Query error'));

      const result = await service.getTopUsers(10);

      expect(result.users).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getUsersOverview', () => {
    it('should return paginated users overview', async () => {
      const mockUsers = [
        {
          actor_id: 'user-1',
          actor_email: 'user1@example.com',
          session_count: 10,
          last_active: '2026-01-12T10:00:00Z',
        },
      ];

      clickhouseService.query
        .mockResolvedValueOnce({ data: mockUsers })
        .mockResolvedValueOnce({ data: [{ total: 50 }] });

      const result = await service.getUsersOverview(1, 20);

      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(50);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(3);
      expect(result.users[0]).toEqual({
        userId: 'user-1',
        email: 'user1@example.com',
        sessionCount: 10,
        lastActive: '2026-01-12T10:00:00Z',
      });
    });

    it('should apply search filter', async () => {
      clickhouseService.query
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [{ total: 0 }] });

      await service.getUsersOverview(1, 20, 'john');

      expect(clickhouseService.query).toHaveBeenCalledWith(
        expect.stringContaining('actor_email LIKE {search:String}'),
        expect.objectContaining({
          search: '%john%',
        }),
      );
    });

    it('should calculate pagination correctly', async () => {
      clickhouseService.query
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [{ total: 100 }] });

      const result = await service.getUsersOverview(3, 10);

      expect(result.totalPages).toBe(10);
      expect(clickhouseService.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          limit: 10,
          skip: 20, // (3 - 1) * 10
        }),
      );
    });

    it('should handle errors and return empty result', async () => {
      clickhouseService.query.mockRejectedValue(new Error('Query error'));

      const result = await service.getUsersOverview(1, 20);

      expect(result.users).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should filter out empty actor_id', async () => {
      clickhouseService.query
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [{ total: 0 }] });

      await service.getUsersOverview(1, 20);

      expect(clickhouseService.query).toHaveBeenCalledWith(
        expect.stringContaining("actor_id != ''"),
        expect.any(Object),
      );
    });

    it('should filter by completed status', async () => {
      clickhouseService.query
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [{ total: 0 }] });

      await service.getUsersOverview(1, 20);

      expect(clickhouseService.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'completed'"),
        expect.any(Object),
      );
    });
  });
});
