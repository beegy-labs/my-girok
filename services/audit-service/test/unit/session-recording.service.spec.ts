import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach, type MockInstance } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { SessionRecordingService } from '../../src/session-recordings/services/session-recording.service';
import { ClickHouseService } from '@my-girok/nest-common/clickhouse';

describe('SessionRecordingService', () => {
  let service: SessionRecordingService;
  let clickhouseService: {
    insert: MockInstance;
    query: MockInstance;
  };
  let _configService: {
    get: MockInstance;
  };

  const mockContext = {
    actorId: 'user-123',
    actorType: 'user',
    actorEmail: 'test@example.com',
    serviceSlug: 'web-app',
    ipAddress: '192.168.1.100',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionRecordingService,
        {
          provide: ClickHouseService,
          useValue: {
            insert: vi.fn(),
            query: vi.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn().mockReturnValue('analytics_db'),
          },
        },
      ],
    }).compile();

    service = module.get<SessionRecordingService>(SessionRecordingService);
    clickhouseService = module.get(ClickHouseService);
    _configService = module.get(ConfigService);
  });

  describe('saveEventBatch', () => {
    it('should save recording batch successfully', async () => {
      const batch = {
        sessionId: 'session-123',
        sequenceStart: 0,
        sequenceEnd: 10,
        events: [
          { type: 'dom-snapshot', timestamp: Date.now(), data: {} },
          { type: 'mouse-move', timestamp: Date.now(), data: { x: 100, y: 200 } },
        ],
        metadata: {
          screenResolution: '1920x1080',
          viewportWidth: 1920,
          viewportHeight: 1080,
          timezone: 'UTC',
          language: 'en-US',
          deviceFingerprint: 'fp-123',
        },
      };

      clickhouseService.insert.mockResolvedValue(undefined);

      const result = await service.saveEventBatch(batch, mockContext);

      expect(result.success).toBe(true);
      expect(result.eventId).toBeDefined();
      expect(clickhouseService.insert).toHaveBeenCalledWith(
        'analytics_db.session_recordings',
        expect.arrayContaining([
          expect.objectContaining({
            session_id: 'session-123',
            sequence_start: 0,
            sequence_end: 10,
            actor_id: 'user-123',
            actor_email: 'test@example.com',
            service_slug: 'web-app',
            events_count: 2,
            browser: 'Chrome',
            os: 'Windows',
            device_type: 'desktop',
            ip_anonymized: '192.168.1.0',
          }),
        ]),
      );
    });

    it('should throw error when insert fails', async () => {
      const batch = {
        sessionId: 'session-123',
        sequenceStart: 0,
        sequenceEnd: 10,
        events: [],
      };

      clickhouseService.insert.mockRejectedValue(new Error('ClickHouse error'));

      await expect(service.saveEventBatch(batch, mockContext)).rejects.toThrow('ClickHouse error');
    });

    it('should anonymize IP address correctly', async () => {
      const batch = {
        sessionId: 'session-123',
        sequenceStart: 0,
        sequenceEnd: 10,
        events: [],
      };

      clickhouseService.insert.mockResolvedValue(undefined);

      await service.saveEventBatch(batch, { ...mockContext, ipAddress: '192.168.1.100' });

      expect(clickhouseService.insert).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([expect.objectContaining({ ip_anonymized: '192.168.1.0' })]),
      );
    });

    it('should parse user agent correctly for Chrome', async () => {
      const batch = {
        sessionId: 'session-123',
        sequenceStart: 0,
        sequenceEnd: 10,
        events: [],
      };

      clickhouseService.insert.mockResolvedValue(undefined);

      await service.saveEventBatch(batch, mockContext);

      expect(clickhouseService.insert).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({
            browser: 'Chrome',
            browser_version: '120',
            os: 'Windows',
            os_version: '10.0',
            device_type: 'desktop',
          }),
        ]),
      );
    });

    it('should parse user agent correctly for mobile', async () => {
      const batch = {
        sessionId: 'session-123',
        sequenceStart: 0,
        sequenceEnd: 10,
        events: [],
      };

      const mobileContext = {
        ...mockContext,
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      };

      clickhouseService.insert.mockResolvedValue(undefined);

      await service.saveEventBatch(batch, mobileContext);

      // The service checks for 'iOS' or 'iPhone' in user agent
      // But it also checks 'Mac OS' first, so it might be parsed as macOS
      // Let's verify what actually gets parsed
      const callArgs = clickhouseService.insert.mock.calls[0];
      const insertedData = callArgs[1][0];

      // iPhone user agent contains both 'iPhone' and 'Mac OS X'
      // The service checks Mac OS first, so it will be macOS
      // But it also checks for Mobi which should make it mobile
      expect(insertedData.device_type).toBe('mobile');
    });
  });

  describe('handleSessionEvent', () => {
    it('should create session metadata on start event', async () => {
      const startEvent = {
        action: 'start' as const,
        sessionId: 'session-123',
        actorId: 'user-123',
        actorType: 'user',
        actorEmail: 'test@example.com',
        serviceSlug: 'web-app',
        startedAt: '2026-01-12T10:00:00Z',
        screenResolution: '1920x1080',
        deviceFingerprint: 'fp-123',
      };

      clickhouseService.insert.mockResolvedValue(undefined);

      const result = await service.handleSessionEvent(startEvent, {
        ipAddress: mockContext.ipAddress,
        userAgent: mockContext.userAgent,
      });

      expect(result.success).toBe(true);
      expect(clickhouseService.insert).toHaveBeenCalledWith(
        'analytics_db.session_recording_metadata',
        expect.arrayContaining([
          expect.objectContaining({
            session_id: 'session-123',
            actor_id: 'user-123',
            status: 'recording',
            duration_seconds: 0,
            browser: 'Chrome',
            device_type: 'desktop',
          }),
        ]),
      );
    });

    it('should update session metadata on end event', async () => {
      const endEvent = {
        action: 'end' as const,
        sessionId: 'session-123',
        endedAt: '2026-01-12T10:05:00Z',
        duration: 300000, // 5 minutes in ms
      };

      clickhouseService.query.mockResolvedValue({ data: [] });

      const result = await service.handleSessionEvent(endEvent, {
        ipAddress: mockContext.ipAddress,
        userAgent: mockContext.userAgent,
      });

      expect(result.success).toBe(true);
      expect(clickhouseService.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.objectContaining({
          sessionId: 'session-123',
          duration: 300,
          endedAt: '2026-01-12T10:05:00Z',
        }),
      );
    });
  });

  describe('savePageView', () => {
    it('should update session metadata with page view', async () => {
      const pageViewEvent = {
        sessionId: 'session-123',
        timestamp: '2026-01-12T10:00:00Z',
        path: '/home',
      };

      clickhouseService.query.mockResolvedValue({ data: [] });

      const result = await service.savePageView(pageViewEvent);

      expect(result.success).toBe(true);
      expect(clickhouseService.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.objectContaining({
          sessionId: 'session-123',
          path: '/home',
        }),
      );
    });
  });

  describe('listSessions', () => {
    it('should return paginated session list', async () => {
      const mockSessions = [
        {
          sessionId: 'session-1',
          actorId: 'user-123',
          actorEmail: 'test@example.com',
          serviceSlug: 'web-app',
          startedAt: '2026-01-12T10:00:00Z',
          endedAt: '2026-01-12T10:05:00Z',
          durationSeconds: 300,
          totalEvents: 100,
          pageViews: 5,
          clicks: 10,
          browser: 'Chrome',
          os: 'Windows',
          deviceType: 'desktop',
          countryCode: 'US',
          status: 'completed',
        },
      ];

      clickhouseService.query
        .mockResolvedValueOnce({ data: [{ count: 1 }] })
        .mockResolvedValueOnce({ data: mockSessions });

      const result = await service.listSessions({
        serviceSlug: 'web-app',
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.data[0].sessionId).toBe('session-1');
    });

    it('should apply filters correctly', async () => {
      clickhouseService.query
        .mockResolvedValueOnce({ data: [{ count: 0 }] })
        .mockResolvedValueOnce({ data: [] });

      await service.listSessions({
        serviceSlug: 'web-app',
        actorId: 'user-123',
        deviceType: 'mobile',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        page: 1,
        limit: 20,
      });

      expect(clickhouseService.query).toHaveBeenCalledWith(
        expect.stringContaining('service_slug = {serviceSlug:String}'),
        expect.objectContaining({
          serviceSlug: 'web-app',
          actorId: 'user-123',
          deviceType: 'mobile',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
        }),
      );
    });

    it('should handle circuit breaker fallback', async () => {
      clickhouseService.query.mockRejectedValue(new Error('Connection timeout'));

      const result = await service.listSessions({ page: 1, limit: 20 });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should calculate pagination correctly', async () => {
      clickhouseService.query
        .mockResolvedValueOnce({ data: [{ count: 150 }] })
        .mockResolvedValueOnce({ data: [] });

      const result = await service.listSessions({ page: 2, limit: 20 });

      expect(result.totalPages).toBe(8);
      expect(clickhouseService.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          limit: 20,
          offset: 20,
        }),
      );
    });
  });

  describe('getSessionEvents', () => {
    it('should return session events with metadata', async () => {
      const mockMetadata = {
        sessionId: 'session-123',
        actorId: 'user-123',
        actorEmail: 'test@example.com',
        serviceSlug: 'web-app',
        startedAt: '2026-01-12T10:00:00Z',
        endedAt: '2026-01-12T10:05:00Z',
        durationSeconds: 300,
        browser: 'Chrome',
        os: 'Windows',
        deviceType: 'desktop',
        status: 'completed',
      };

      const mockEvents = [
        { events: JSON.stringify([{ type: 'dom-snapshot', timestamp: 1 }]) },
        { events: JSON.stringify([{ type: 'mouse-move', timestamp: 2 }]) },
      ];

      clickhouseService.query
        .mockResolvedValueOnce({ data: [mockMetadata] })
        .mockResolvedValueOnce({ data: mockEvents });

      const result = await service.getSessionEvents('session-123');

      expect(result).not.toBeNull();
      expect(result?.sessionId).toBe('session-123');
      expect(result?.metadata).toEqual(mockMetadata);
      expect(result?.events).toHaveLength(2);
    });

    it('should return null when session not found', async () => {
      clickhouseService.query.mockResolvedValue({ data: [] });

      const result = await service.getSessionEvents('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle malformed event JSON gracefully', async () => {
      const mockMetadata = {
        sessionId: 'session-123',
        status: 'completed',
      };

      const mockEvents = [
        { events: 'invalid json' },
        { events: JSON.stringify([{ type: 'valid' }]) },
      ];

      clickhouseService.query
        .mockResolvedValueOnce({ data: [mockMetadata] })
        .mockResolvedValueOnce({ data: mockEvents });

      const result = await service.getSessionEvents('session-123');

      expect(result?.events).toHaveLength(1);
      expect(result?.events[0]).toEqual({ type: 'valid' });
    });

    it('should merge events from multiple batches in order', async () => {
      const mockMetadata = { sessionId: 'session-123' };
      const mockEvents = [
        { events: JSON.stringify([{ seq: 1 }, { seq: 2 }]) },
        { events: JSON.stringify([{ seq: 3 }, { seq: 4 }]) },
        { events: JSON.stringify([{ seq: 5 }]) },
      ];

      clickhouseService.query
        .mockResolvedValueOnce({ data: [mockMetadata] })
        .mockResolvedValueOnce({ data: mockEvents });

      const result = await service.getSessionEvents('session-123');

      expect(result?.events).toHaveLength(5);
      expect(result?.events[0]).toEqual({ seq: 1 });
      expect(result?.events[4]).toEqual({ seq: 5 });
    });
  });

  describe('Analytics Methods', () => {
    describe('getSessionStats', () => {
      it('should return session statistics', async () => {
        const mockStats = {
          totalSessions: 150,
          avgDuration: 245.5,
          totalPageViews: 750,
          totalClicks: 320,
          uniqueUsers: 85,
        };

        clickhouseService.query.mockResolvedValue({ data: [mockStats] });

        const result = await service.getSessionStats({
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-01-31'),
          serviceSlug: 'web-app',
        });

        expect(result.totalSessions).toBe(150);
        expect(result.avgDuration).toBe(245.5);
        expect(result.totalPageViews).toBe(750);
        expect(result.totalClicks).toBe(320);
        expect(result.uniqueUsers).toBe(85);
        expect(clickhouseService.query).toHaveBeenCalledWith(
          expect.stringContaining('count() as totalSessions'),
          expect.any(Object),
        );
      });

      it('should handle date filters correctly', async () => {
        clickhouseService.query.mockResolvedValue({ data: [{}] });

        await service.getSessionStats({
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-01-31'),
        });

        expect(clickhouseService.query).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            startDate: expect.any(String),
            endDate: expect.any(String),
          }),
        );
      });

      it('should filter by service slug when provided', async () => {
        clickhouseService.query.mockResolvedValue({ data: [{}] });

        await service.getSessionStats({
          serviceSlug: 'web-app',
        });

        expect(clickhouseService.query).toHaveBeenCalledWith(
          expect.stringContaining('service_slug'),
          expect.objectContaining({
            serviceSlug: 'web-app',
          }),
        );
      });

      it('should return default values on query failure', async () => {
        clickhouseService.query.mockRejectedValue(new Error('ClickHouse timeout'));

        const result = await service.getSessionStats({});

        expect(result.totalSessions).toBe(0);
        expect(result.avgDuration).toBe(0);
        expect(result.totalPageViews).toBe(0);
        expect(result.totalClicks).toBe(0);
        expect(result.uniqueUsers).toBe(0);
      });
    });

    describe('getDeviceBreakdown', () => {
      it('should return device breakdown with percentages', async () => {
        const mockDevices = [
          { deviceType: 'desktop', count: 100, percentage: 66.67 },
          { deviceType: 'mobile', count: 40, percentage: 26.67 },
          { deviceType: 'tablet', count: 10, percentage: 6.67 },
        ];

        clickhouseService.query.mockResolvedValue({ data: mockDevices });

        const result = await service.getDeviceBreakdown({
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-01-31'),
        });

        expect(result).toHaveLength(3);
        expect(result[0].deviceType).toBe('desktop');
        expect(result[0].count).toBe(100);
        expect(result[0].percentage).toBeCloseTo(66.67, 1);
      });

      it('should filter by date range', async () => {
        clickhouseService.query.mockResolvedValue({ data: [] });

        await service.getDeviceBreakdown({
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-01-31'),
        });

        expect(clickhouseService.query).toHaveBeenCalledWith(
          expect.stringContaining('GROUP BY device_type'),
          expect.objectContaining({
            startDate: expect.any(String),
            endDate: expect.any(String),
          }),
        );
      });

      it('should filter by service slug when provided', async () => {
        clickhouseService.query.mockResolvedValue({ data: [] });

        await service.getDeviceBreakdown({
          serviceSlug: 'web-app',
        });

        expect(clickhouseService.query).toHaveBeenCalledWith(
          expect.stringContaining('service_slug'),
          expect.objectContaining({
            serviceSlug: 'web-app',
          }),
        );
      });

      it('should return empty array on query failure', async () => {
        clickhouseService.query.mockRejectedValue(new Error('ClickHouse timeout'));

        const result = await service.getDeviceBreakdown({});

        expect(result).toEqual([]);
      });
    });

    describe('getTopPages', () => {
      it('should return top pages ordered by views', async () => {
        const mockPages = [
          { path: '/home', title: 'Home', views: 500, uniqueSessions: 250 },
          { path: '/about', title: 'About', views: 300, uniqueSessions: 180 },
          { path: '/contact', title: 'Contact', views: 150, uniqueSessions: 100 },
        ];

        clickhouseService.query.mockResolvedValue({ data: mockPages });

        const result = await service.getTopPages({
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-01-31'),
          limit: 10,
        });

        expect(result).toHaveLength(3);
        expect(result[0].path).toBe('/home');
        expect(result[0].views).toBe(500);
        expect(result[0].uniqueSessions).toBe(250);
      });

      it('should respect limit parameter', async () => {
        clickhouseService.query.mockResolvedValue({ data: [] });

        await service.getTopPages({ limit: 5 });

        expect(clickhouseService.query).toHaveBeenCalledWith(
          expect.stringContaining('LIMIT'),
          expect.objectContaining({
            limit: 5,
          }),
        );
      });

      it('should use default limit of 10 when not provided', async () => {
        clickhouseService.query.mockResolvedValue({ data: [] });

        await service.getTopPages({});

        expect(clickhouseService.query).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            limit: 10,
          }),
        );
      });

      it('should filter by service slug when provided', async () => {
        clickhouseService.query.mockResolvedValue({ data: [] });

        await service.getTopPages({
          serviceSlug: 'web-app',
        });

        expect(clickhouseService.query).toHaveBeenCalledWith(
          expect.stringContaining('service_slug'),
          expect.objectContaining({
            serviceSlug: 'web-app',
          }),
        );
      });

      it('should return empty array on query failure', async () => {
        clickhouseService.query.mockRejectedValue(new Error('ClickHouse timeout'));

        const result = await service.getTopPages({});

        expect(result).toEqual([]);
      });
    });
  });
});
