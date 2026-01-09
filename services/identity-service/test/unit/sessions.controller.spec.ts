import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SessionsController } from '../../src/identity/sessions/sessions.controller';
import { SessionsService } from '../../src/identity/sessions/sessions.service';
import { ApiKeyGuard } from '../../src/common/guards/api-key.guard';

describe('SessionsController', () => {
  let controller: SessionsController;
  let service: Mocked<SessionsService>;

  const mockSession = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    accountId: '223e4567-e89b-12d3-a456-426614174001',
    expiresAt: new Date(Date.now() + 3600000),
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    isActive: true,
    lastActivityAt: new Date(),
    createdAt: new Date(),
  };

  const mockCreatedSessionResponse = {
    id: mockSession.id,
    accountId: mockSession.accountId,
    accessToken: 'jwt-access-token',
    refreshToken: 'jwt-refresh-token',
    expiresAt: mockSession.expiresAt,
    ipAddress: mockSession.ipAddress,
    userAgent: mockSession.userAgent,
  };

  const mockPaginatedResponse = {
    data: [mockSession],
    meta: {
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  };

  beforeEach(async () => {
    const mockService = {
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      refresh: vi.fn(),
      revoke: vi.fn(),
      revokeAllForAccount: vi.fn(),
      touch: vi.fn(),
      validateAccessToken: vi.fn(),
      getActiveSessionCount: vi.fn(),
      cleanupExpired: vi.fn(),
    };

    const mockConfigService = {
      get: vi.fn().mockReturnValue('test-api-key'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionsController],
      providers: [
        { provide: SessionsService, useValue: mockService },
        { provide: ConfigService, useValue: mockConfigService },
        Reflector,
        ApiKeyGuard,
      ],
    }).compile();

    controller = module.get<SessionsController>(SessionsController);
    service = module.get(SessionsService);
  });

  describe('create', () => {
    it('should create a new session', async () => {
      service.create.mockResolvedValue(mockCreatedSessionResponse as never);

      const result = await controller.create({
        accountId: mockSession.accountId,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(result.accessToken).toBe('jwt-access-token');
      expect(result.refreshToken).toBe('jwt-refresh-token');
    });

    it('should throw UnauthorizedException for invalid account', async () => {
      service.create.mockRejectedValue(new UnauthorizedException('Account not found'));

      await expect(
        controller.create({
          accountId: 'invalid-account',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('findAll', () => {
    it('should return paginated sessions', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResponse as never);

      const result = await controller.findAll(undefined, undefined, undefined, 1, 20);

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        accountId: undefined,
        deviceId: undefined,
        isActive: undefined,
      });
    });

    it('should filter by accountId', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResponse as never);

      await controller.findAll(mockSession.accountId, undefined, undefined, 1, 20);

      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: mockSession.accountId,
        }),
      );
    });

    it('should filter by deviceId', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResponse as never);

      await controller.findAll(undefined, 'device-123', undefined, 1, 20);

      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'device-123',
        }),
      );
    });

    it('should filter by active status', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResponse as never);

      await controller.findAll(undefined, undefined, true, 1, 20);

      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return session by ID', async () => {
      service.findById.mockResolvedValue(mockSession as never);

      const result = await controller.findById(mockSession.id);

      expect(result).toEqual(mockSession);
      expect(service.findById).toHaveBeenCalledWith(mockSession.id);
    });

    it('should throw NotFoundException when session not found', async () => {
      service.findById.mockRejectedValue(new NotFoundException('Session not found'));

      await expect(controller.findById('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('refresh', () => {
    it('should refresh session tokens', async () => {
      const refreshResult = {
        ...mockCreatedSessionResponse,
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };
      service.refresh.mockResolvedValue(refreshResult as never);

      const result = await controller.refresh({
        refreshToken: 'valid-refresh-token',
      });

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      service.refresh.mockRejectedValue(new UnauthorizedException('Invalid refresh token'));

      await expect(controller.refresh({ refreshToken: 'invalid-token' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('revoke', () => {
    it('should revoke session', async () => {
      service.revoke.mockResolvedValue(undefined);

      await expect(controller.revoke(mockSession.id)).resolves.not.toThrow();
      expect(service.revoke).toHaveBeenCalledWith(mockSession.id, undefined);
    });

    it('should revoke session with reason', async () => {
      service.revoke.mockResolvedValue(undefined);

      await controller.revoke(mockSession.id, {
        reason: 'User logged out',
      });

      expect(service.revoke).toHaveBeenCalledWith(mockSession.id, {
        reason: 'User logged out',
      });
    });

    it('should throw NotFoundException when session not found', async () => {
      service.revoke.mockRejectedValue(new NotFoundException('Session not found'));

      await expect(controller.revoke('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('revokeAllForAccount', () => {
    it('should revoke all sessions for account', async () => {
      service.revokeAllForAccount.mockResolvedValue(3);

      const result = await controller.revokeAllForAccount(mockSession.accountId);

      expect(result.count).toBe(3);
      expect(service.revokeAllForAccount).toHaveBeenCalledWith(mockSession.accountId, undefined);
    });

    it('should exclude current session when specified', async () => {
      service.revokeAllForAccount.mockResolvedValue(2);

      const result = await controller.revokeAllForAccount(mockSession.accountId, mockSession.id);

      expect(result.count).toBe(2);
      expect(service.revokeAllForAccount).toHaveBeenCalledWith(
        mockSession.accountId,
        mockSession.id,
      );
    });

    it('should return 0 when no sessions to revoke', async () => {
      service.revokeAllForAccount.mockResolvedValue(0);

      const result = await controller.revokeAllForAccount('account-without-sessions');

      expect(result.count).toBe(0);
    });
  });

  describe('touch', () => {
    it('should update session activity timestamp', async () => {
      service.touch.mockResolvedValue(undefined);

      await expect(controller.touch(mockSession.id)).resolves.not.toThrow();
      expect(service.touch).toHaveBeenCalledWith(mockSession.id);
    });

    it('should throw NotFoundException when session not found', async () => {
      service.touch.mockRejectedValue(new NotFoundException('Session not found'));

      await expect(controller.touch('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateToken', () => {
    it('should validate valid access token', async () => {
      service.validateAccessToken.mockResolvedValue(mockSession as never);

      const result = await controller.validateToken('valid-access-token');

      expect(result.valid).toBe(true);
      expect(result.session).toBeDefined();
    });

    it('should return invalid for expired token', async () => {
      service.validateAccessToken.mockResolvedValue(null);

      const result = await controller.validateToken('expired-token');

      expect(result.valid).toBe(false);
      expect(result.session).toBeNull();
    });
  });

  describe('getActiveSessionCount', () => {
    it('should return active session count', async () => {
      service.getActiveSessionCount.mockResolvedValue(5);

      const result = await controller.getActiveSessionCount(mockSession.accountId);

      expect(result.count).toBe(5);
      expect(service.getActiveSessionCount).toHaveBeenCalledWith(mockSession.accountId);
    });

    it('should return 0 for account with no active sessions', async () => {
      service.getActiveSessionCount.mockResolvedValue(0);

      const result = await controller.getActiveSessionCount('inactive-account');

      expect(result.count).toBe(0);
    });
  });

  describe('cleanupExpired', () => {
    it('should cleanup expired sessions', async () => {
      service.cleanupExpired.mockResolvedValue(10);

      const result = await controller.cleanupExpired();

      expect(result.count).toBe(10);
      expect(service.cleanupExpired).toHaveBeenCalled();
    });

    it('should return 0 when no sessions to cleanup', async () => {
      service.cleanupExpired.mockResolvedValue(0);

      const result = await controller.cleanupExpired();

      expect(result.count).toBe(0);
    });
  });
});
