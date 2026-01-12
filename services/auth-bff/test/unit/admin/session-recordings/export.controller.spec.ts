import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach, type MockInstance } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Response } from 'express';
import { SessionRecordingsExportController } from '../../../../src/admin/session-recordings/export.controller';
import { SessionRecordingsService } from '../../../../src/admin/session-recordings/session-recordings.service';

describe('SessionRecordingsExportController', () => {
  let controller: SessionRecordingsExportController;
  let sessionRecordingsService: {
    getSessionById: MockInstance;
  };
  let cacheManager: {
    set: MockInstance;
    get: MockInstance;
    del: MockInstance;
  };

  const mockSession = {
    sessionId: 'session-123',
    actorId: 'user-123',
    actorEmail: 'test@example.com',
    serviceSlug: 'web-app',
    metadata: {
      browser: 'Chrome',
      os: 'Windows',
      deviceType: 'desktop',
    },
    events: [
      { type: 'dom-snapshot', timestamp: Date.now(), data: {} },
      { type: 'mouse-move', timestamp: Date.now(), data: { x: 100, y: 200 } },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionRecordingsExportController],
      providers: [
        {
          provide: SessionRecordingsService,
          useValue: {
            getSessionById: vi.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            set: vi.fn(),
            get: vi.fn(),
            del: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SessionRecordingsExportController>(SessionRecordingsExportController);
    sessionRecordingsService = module.get(SessionRecordingsService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  describe('shareSession', () => {
    it('should generate share link with 1 hour expiry', async () => {
      sessionRecordingsService.getSessionById.mockResolvedValue(mockSession);
      cacheManager.set.mockResolvedValue(undefined);

      const result = await controller.shareSession('session-123', { expiresIn: '1h' });

      expect(result.shareUrl).toContain('/admin/session-recordings/shared/');
      expect(result.token).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);

      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('session_share_link:'),
        expect.objectContaining({
          sessionId: 'session-123',
          expiresAt: expect.any(Date),
        }),
        expect.any(Number),
      );
    });

    it('should generate share link with 24 hour expiry', async () => {
      sessionRecordingsService.getSessionById.mockResolvedValue(mockSession);
      cacheManager.set.mockResolvedValue(undefined);

      const result = await controller.shareSession('session-123', { expiresIn: '24h' });

      expect(result.expiresAt).toBeInstanceOf(Date);
      const expiryTime = result.expiresAt!.getTime() - Date.now();
      expect(expiryTime).toBeGreaterThan(23 * 60 * 60 * 1000); // At least 23 hours
      expect(expiryTime).toBeLessThan(25 * 60 * 60 * 1000); // Less than 25 hours
    });

    it('should generate share link with never expiry', async () => {
      sessionRecordingsService.getSessionById.mockResolvedValue(mockSession);
      cacheManager.set.mockResolvedValue(undefined);

      const result = await controller.shareSession('session-123', { expiresIn: 'never' });

      expect(result.expiresAt).toBeNull();
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ expiresAt: null }),
        expect.any(Number),
      );
    });

    it('should throw NotFoundException when session not found', async () => {
      sessionRecordingsService.getSessionById.mockResolvedValue(null);

      await expect(controller.shareSession('nonexistent', { expiresIn: '24h' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should generate unique tokens for each share link', async () => {
      sessionRecordingsService.getSessionById.mockResolvedValue(mockSession);
      cacheManager.set.mockResolvedValue(undefined);

      const result1 = await controller.shareSession('session-123', { expiresIn: '24h' });
      const result2 = await controller.shareSession('session-123', { expiresIn: '24h' });

      expect(result1.token).not.toBe(result2.token);
      expect(result1.shareUrl).not.toBe(result2.shareUrl);
    });
  });

  describe('getSharedSession', () => {
    it('should retrieve shared session with valid token', async () => {
      const mockShareLink = {
        token: 'valid-token',
        sessionId: 'session-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        createdAt: new Date(),
      };

      cacheManager.get.mockResolvedValue(mockShareLink);
      sessionRecordingsService.getSessionById.mockResolvedValue(mockSession);

      const result = await controller.getSharedSession('valid-token');

      expect(result.session).toEqual(mockSession);
      expect(result.sharedAt).toEqual(mockShareLink.createdAt);
      expect(result.expiresAt).toEqual(mockShareLink.expiresAt);
    });

    it('should throw NotFoundException for invalid token', async () => {
      cacheManager.get.mockResolvedValue(null);

      await expect(controller.getSharedSession('invalid-token')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for expired link', async () => {
      const mockShareLink = {
        token: 'expired-token',
        sessionId: 'session-123',
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
        createdAt: new Date(),
      };

      cacheManager.get.mockResolvedValue(mockShareLink);

      await expect(controller.getSharedSession('expired-token')).rejects.toThrow(NotFoundException);

      expect(cacheManager.del).toHaveBeenCalledWith('session_share_link:expired-token');
    });

    it('should throw NotFoundException when session not found', async () => {
      const mockShareLink = {
        token: 'valid-token',
        sessionId: 'nonexistent-session',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      cacheManager.get.mockResolvedValue(mockShareLink);
      sessionRecordingsService.getSessionById.mockResolvedValue(null);

      await expect(controller.getSharedSession('valid-token')).rejects.toThrow(NotFoundException);
    });
  });

  describe('exportSession', () => {
    let mockResponse: Partial<Response>;

    beforeEach(() => {
      mockResponse = {
        setHeader: vi.fn(),
        json: vi.fn(),
        send: vi.fn(),
      };
    });

    it('should export session as JSON successfully', async () => {
      sessionRecordingsService.getSessionById.mockResolvedValue(mockSession);

      await controller.exportSession(
        'session-123',
        { format: 'json', includeMetadata: true, includeEvents: true },
        mockResponse as Response,
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="session-session-123.json"',
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: mockSession.metadata,
          events: mockSession.events,
        }),
      );
    });

    it('should export JSON without metadata when includeMetadata is false', async () => {
      sessionRecordingsService.getSessionById.mockResolvedValue(mockSession);

      await controller.exportSession(
        'session-123',
        { format: 'json', includeMetadata: false, includeEvents: true },
        mockResponse as Response,
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          events: mockSession.events,
        }),
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.not.objectContaining({
          metadata: expect.anything(),
        }),
      );
    });

    it('should throw NotFoundException when session not found', async () => {
      sessionRecordingsService.getSessionById.mockResolvedValue(null);

      await expect(
        controller.exportSession('nonexistent', { format: 'json' }, mockResponse as Response),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for video format (not implemented)', async () => {
      sessionRecordingsService.getSessionById.mockResolvedValue(mockSession);

      await expect(
        controller.exportSession('session-123', { format: 'video' }, mockResponse as Response),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for PDF format (not implemented)', async () => {
      sessionRecordingsService.getSessionById.mockResolvedValue(mockSession);

      await expect(
        controller.exportSession('session-123', { format: 'pdf' }, mockResponse as Response),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Redis/Valkey Integration', () => {
    it('should use correct cache key format', async () => {
      sessionRecordingsService.getSessionById.mockResolvedValue(mockSession);
      cacheManager.set.mockResolvedValue(undefined);

      const result = await controller.shareSession('session-123', { expiresIn: '24h' });

      expect(cacheManager.set).toHaveBeenCalledWith(
        `session_share_link:${result.token}`,
        expect.any(Object),
        expect.any(Number),
      );
    });

    it('should calculate correct TTL for Redis', async () => {
      sessionRecordingsService.getSessionById.mockResolvedValue(mockSession);
      cacheManager.set.mockResolvedValue(undefined);

      await controller.shareSession('session-123', { expiresIn: '7d' });

      const ttlArg = cacheManager.set.mock.calls[0][2];
      const expectedTTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

      // TTL should be approximately 7 days (allowing for small timing differences)
      expect(ttlArg).toBeGreaterThan(expectedTTL - 1000);
      expect(ttlArg).toBeLessThan(expectedTTL + 1000);
    });
  });
});
