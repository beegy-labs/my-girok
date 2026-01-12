import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach, type MockInstance } from 'vitest';
import { AnalyticsService } from '../../src/admin/analytics/analytics.service';
import { ClickHouseService } from '../../src/common/services/clickhouse.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let clickhouseService: {
    query: MockInstance;
    queryOne: MockInstance;
    isClientConnected: MockInstance;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: ClickHouseService,
          useValue: {
            query: vi.fn(),
            queryOne: vi.fn(),
            isClientConnected: vi.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    clickhouseService = module.get(ClickHouseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserSummary', () => {
    it('should return user summary statistics', async () => {
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

      clickhouseService.queryOne.mockResolvedValueOnce(mockSummary);
      clickhouseService.query
        .mockResolvedValueOnce(mockCountries)
        .mockResolvedValueOnce(mockDevices);

      const result = await service.getUserSummary('user-123');

      expect(result.userId).toBe('user-123');
      expect(result.totalSessions).toBe(10);
      expect(result.totalDuration).toBe(3600);
      expect(result.totalPageViews).toBe(50);
      expect(result.totalClicks).toBe(100);
      expect(result.countries).toEqual(['US', 'KR']);
      expect(result.devices).toEqual(['Chrome / Windows', 'Safari / macOS']);
    });

    it('should return empty summary when no data found', async () => {
      clickhouseService.queryOne.mockResolvedValueOnce(null);

      const result = await service.getUserSummary('user-123');

      expect(result.totalSessions).toBe(0);
      expect(result.totalDuration).toBe(0);
      expect(result.countries).toEqual([]);
      expect(result.devices).toEqual([]);
    });

    it('should handle query errors gracefully', async () => {
      clickhouseService.queryOne.mockRejectedValueOnce(new Error('ClickHouse error'));

      const result = await service.getUserSummary('user-123');

      expect(result.totalSessions).toBe(0);
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
          ended_at: '2026-01-12T11:00:00Z',
          duration_seconds: 3600,
          page_views: 10,
          clicks: 20,
          entry_page: '/home',
          browser: 'Chrome',
          os: 'Windows',
          device_type: 'desktop',
          country_code: 'US',
          status: 'completed',
        },
      ];

      clickhouseService.query.mockResolvedValueOnce(mockSessions);
      clickhouseService.queryOne.mockResolvedValueOnce({ total: 1 });

      const result = await service.getUserSessions('user-123', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].sessionId).toBe('session-1');
      expect(result.data[0].actorEmail).toBe('user@example.com');
    });

    it('should apply date filters', async () => {
      clickhouseService.query.mockResolvedValueOnce([]);
      clickhouseService.queryOne.mockResolvedValueOnce({ total: 0 });

      await service.getUserSessions('user-123', {
        page: 1,
        limit: 20,
        startDate: '2026-01-01',
        endDate: '2026-01-12',
      });

      expect(clickhouseService.query).toHaveBeenCalledWith(
        expect.stringContaining('started_at >= {startDate:DateTime}'),
        expect.objectContaining({ startDate: '2026-01-01' }),
      );
    });

    it('should handle errors and return empty results', async () => {
      clickhouseService.query.mockRejectedValueOnce(new Error('Query error'));

      const result = await service.getUserSessions('user-123', { page: 1, limit: 20 });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getUserLocations', () => {
    it('should return user location statistics', async () => {
      const mockLocations = [
        { country_code: 'US', session_count: 10, total_duration: 7200 },
        { country_code: 'KR', session_count: 5, total_duration: 3600 },
      ];

      clickhouseService.query.mockResolvedValueOnce(mockLocations);

      const result = await service.getUserLocations('user-123');

      expect(result).toHaveLength(2);
      expect(result[0].countryCode).toBe('US');
      expect(result[0].sessionCount).toBe(10);
      expect(result[1].countryCode).toBe('KR');
    });

    it('should return empty array on error', async () => {
      clickhouseService.query.mockRejectedValueOnce(new Error('Error'));

      const result = await service.getUserLocations('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('getTopUsers', () => {
    it('should return top active users', async () => {
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

      clickhouseService.query.mockResolvedValueOnce(mockUsers);

      const result = await service.getTopUsers(10);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].userId).toBe('user-1');
      expect(result.data[0].sessionCount).toBe(100);
      expect(result.total).toBe(2);
    });

    it('should handle errors', async () => {
      clickhouseService.query.mockRejectedValueOnce(new Error('Error'));

      const result = await service.getTopUsers(10);

      expect(result.data).toEqual([]);
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

      clickhouseService.query.mockResolvedValueOnce(mockUsers);
      clickhouseService.queryOne.mockResolvedValueOnce({ total: 50 });

      const result = await service.getUsersOverview({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(50);
      expect(result.totalPages).toBe(3);
      expect(result.page).toBe(1);
    });

    it('should apply search filter', async () => {
      clickhouseService.query.mockResolvedValueOnce([]);
      clickhouseService.queryOne.mockResolvedValueOnce({ total: 0 });

      await service.getUsersOverview({ page: 1, limit: 20, search: 'john' });

      expect(clickhouseService.query).toHaveBeenCalledWith(
        expect.stringContaining('actor_email LIKE {search:String}'),
        expect.objectContaining({ search: '%john%' }),
      );
    });

    it('should handle errors', async () => {
      clickhouseService.query.mockRejectedValueOnce(new Error('Error'));

      const result = await service.getUsersOverview({ page: 1, limit: 20 });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
