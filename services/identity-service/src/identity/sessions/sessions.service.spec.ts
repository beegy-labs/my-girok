import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { IdentityPrismaService } from '../../database/identity-prisma.service';
import { CryptoService } from '../../common/crypto';

// Type for mocked Prisma service with jest.fn() methods
type MockPrismaSession = {
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
  count: jest.Mock;
};

type MockPrismaAccount = {
  findUnique: jest.Mock;
};

type MockPrismaDevice = {
  findUnique: jest.Mock;
};

describe('SessionsService', () => {
  let service: SessionsService;
  let prisma: {
    account: MockPrismaAccount;
    session: MockPrismaSession;
    device: MockPrismaDevice;
  };
  let cryptoService: jest.Mocked<CryptoService>;

  const mockAccount = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
  };

  const mockSession = {
    id: '223e4567-e89b-12d3-a456-426614174001',
    accountId: mockAccount.id,
    tokenHash: 'hashed_access_token',
    refreshTokenHash: 'hashed_refresh_token',
    previousRefreshTokenHash: null,
    deviceId: null,
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    isActive: true,
    expiresAt: new Date(Date.now() + 86400000),
    revokedAt: null,
    revokedReason: null,
    lastActivityAt: new Date(),
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      account: {
        findUnique: jest.fn(),
      },
      session: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      device: {
        findUnique: jest.fn(),
      },
    };

    const mockCryptoService = {
      generateToken: jest.fn().mockReturnValue('random_token_32_bytes_long'),
      hash: jest.fn().mockImplementation((token: string) => `hashed_${token}`),
    };

    const mockConfigService = {
      get: jest.fn((_key: string, defaultValue: unknown) => defaultValue),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: IdentityPrismaService, useValue: mockPrisma },
        { provide: CryptoService, useValue: mockCryptoService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
    prisma = module.get(IdentityPrismaService);
    cryptoService = module.get(CryptoService);
  });

  describe('create', () => {
    it('should create a new session successfully', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount as never);
      prisma.session.count.mockResolvedValue(0);
      prisma.session.create.mockResolvedValue(mockSession as never);

      const result = await service.create({
        accountId: mockAccount.id,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(result.accountId).toBe(mockAccount.id);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(cryptoService.generateToken).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException if account not found', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          accountId: 'nonexistent-id',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if max sessions reached', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount as never);
      prisma.session.count.mockResolvedValue(10);

      await expect(
        service.create({
          accountId: mockAccount.id,
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if device not found', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount as never);
      prisma.session.count.mockResolvedValue(0);
      prisma.device.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          accountId: mockAccount.id,
          deviceId: 'nonexistent-device',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findById', () => {
    it('should return session when found', async () => {
      prisma.session.findUnique.mockResolvedValue(mockSession as never);

      const result = await service.findById(mockSession.id);

      expect(result.id).toBe(mockSession.id);
    });

    it('should throw NotFoundException when session not found', async () => {
      prisma.session.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateAccessToken', () => {
    it('should return session for valid active token', async () => {
      prisma.session.findUnique.mockResolvedValue(mockSession as never);

      const result = await service.validateAccessToken('valid_token');

      expect(result).not.toBeNull();
      expect(result?.isActive).toBe(true);
    });

    it('should return null for invalid token', async () => {
      prisma.session.findUnique.mockResolvedValue(null);

      const result = await service.validateAccessToken('invalid_token');

      expect(result).toBeNull();
    });

    it('should return null for expired session', async () => {
      prisma.session.findUnique.mockResolvedValue({
        ...mockSession,
        expiresAt: new Date(Date.now() - 1000),
      } as never);

      const result = await service.validateAccessToken('expired_token');

      expect(result).toBeNull();
    });

    it('should return null for inactive session', async () => {
      prisma.session.findUnique.mockResolvedValue({
        ...mockSession,
        isActive: false,
      } as never);

      const result = await service.validateAccessToken('inactive_token');

      expect(result).toBeNull();
    });
  });

  describe('refresh', () => {
    it('should refresh session successfully', async () => {
      prisma.session.findFirst.mockResolvedValue(mockSession as never);
      prisma.session.update.mockResolvedValue({
        ...mockSession,
        tokenHash: 'new_hashed_token',
      } as never);

      const result = await service.refresh('valid_refresh_token');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      prisma.session.findFirst.mockResolvedValue(null);

      await expect(service.refresh('invalid_token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for revoked session', async () => {
      prisma.session.findFirst.mockResolvedValue({
        ...mockSession,
        isActive: false,
      } as never);

      await expect(service.refresh('revoked_token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired session', async () => {
      prisma.session.findFirst.mockResolvedValue({
        ...mockSession,
        expiresAt: new Date(Date.now() - 1000),
      } as never);

      await expect(service.refresh('expired_token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('revoke', () => {
    it('should revoke session successfully', async () => {
      prisma.session.findUnique.mockResolvedValue(mockSession as never);
      prisma.session.update.mockResolvedValue({
        ...mockSession,
        isActive: false,
        revokedAt: new Date(),
      } as never);

      await service.revoke(mockSession.id);

      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: mockSession.id },
        data: expect.objectContaining({
          isActive: false,
          revokedAt: expect.any(Date),
        }),
      });
    });

    it('should throw NotFoundException if session not found', async () => {
      prisma.session.findUnique.mockResolvedValue(null);

      await expect(service.revoke('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('revokeAllForAccount', () => {
    it('should revoke all sessions for account', async () => {
      prisma.session.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.revokeAllForAccount(mockAccount.id);

      expect(result).toBe(5);
      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          accountId: mockAccount.id,
          isActive: true,
        }),
        data: expect.objectContaining({
          isActive: false,
        }),
      });
    });

    it('should exclude specified session', async () => {
      prisma.session.updateMany.mockResolvedValue({ count: 4 });

      await service.revokeAllForAccount(mockAccount.id, mockSession.id);

      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          id: { not: mockSession.id },
        }),
        data: expect.any(Object),
      });
    });
  });

  describe('cleanupExpired', () => {
    it('should mark expired sessions as inactive', async () => {
      prisma.session.updateMany.mockResolvedValue({ count: 10 });

      const result = await service.cleanupExpired();

      expect(result).toBe(10);
      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          expiresAt: { lt: expect.any(Date) },
          isActive: true,
        }),
        data: expect.objectContaining({
          isActive: false,
        }),
      });
    });

    it('should return 0 when no sessions to cleanup', async () => {
      prisma.session.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.cleanupExpired();

      expect(result).toBe(0);
    });
  });

  describe('concurrent session handling', () => {
    it('should enforce max sessions per account', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount as never);
      prisma.session.count.mockResolvedValue(10); // Already at limit

      await expect(
        service.create({
          accountId: mockAccount.id,
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow session when below limit', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount as never);
      prisma.session.count.mockResolvedValue(5); // Below limit
      prisma.session.create.mockResolvedValue(mockSession as never);

      const result = await service.create({
        accountId: mockAccount.id,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
    });

    it('should handle multiple concurrent session creations', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount as never);
      prisma.session.count.mockResolvedValue(3);
      prisma.session.create.mockResolvedValue(mockSession as never);

      const promises = [
        service.create({
          accountId: mockAccount.id,
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
        }),
        service.create({
          accountId: mockAccount.id,
          ipAddress: '127.0.0.2',
          userAgent: 'Mozilla/5.0',
        }),
        service.create({
          accountId: mockAccount.id,
          ipAddress: '127.0.0.3',
          userAgent: 'Mozilla/5.0',
        }),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.accessToken).toBeDefined();
        expect(result.refreshToken).toBeDefined();
      });
    });
  });

  describe('session with device', () => {
    it('should create session with device association', async () => {
      const mockDevice = {
        id: 'device-123',
        accountId: mockAccount.id,
      };
      prisma.account.findUnique.mockResolvedValue(mockAccount as never);
      prisma.session.count.mockResolvedValue(0);
      prisma.device.findUnique.mockResolvedValue(mockDevice as never);
      prisma.session.create.mockResolvedValue({
        ...mockSession,
        deviceId: mockDevice.id,
      } as never);

      const result = await service.create({
        accountId: mockAccount.id,
        deviceId: mockDevice.id,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(result.deviceId).toBe(mockDevice.id);
    });

    it('should throw BadRequestException if device does not belong to account', async () => {
      const mockDevice = {
        id: 'device-123',
        accountId: 'different-account-id',
      };
      prisma.account.findUnique.mockResolvedValue(mockAccount as never);
      prisma.session.count.mockResolvedValue(0);
      prisma.device.findUnique.mockResolvedValue(mockDevice as never);

      await expect(
        service.create({
          accountId: mockAccount.id,
          deviceId: mockDevice.id,
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated sessions', async () => {
      const mockSessions = [mockSession, { ...mockSession, id: 'session-2' }];
      prisma.session.findMany.mockResolvedValue(mockSessions as never);
      prisma.session.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('should filter by accountId', async () => {
      prisma.session.findMany.mockResolvedValue([mockSession] as never);
      prisma.session.count.mockResolvedValue(1);

      await service.findAll({ accountId: mockAccount.id });

      expect(prisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ accountId: mockAccount.id }),
        }),
      );
    });

    it('should filter by deviceId', async () => {
      prisma.session.findMany.mockResolvedValue([mockSession] as never);
      prisma.session.count.mockResolvedValue(1);

      await service.findAll({ deviceId: 'device-123' });

      expect(prisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deviceId: 'device-123' }),
        }),
      );
    });

    it('should filter by isActive status', async () => {
      prisma.session.findMany.mockResolvedValue([mockSession] as never);
      prisma.session.count.mockResolvedValue(1);

      await service.findAll({ isActive: true });

      expect(prisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });

    it('should respect maximum limit of 100', async () => {
      prisma.session.findMany.mockResolvedValue([mockSession] as never);
      prisma.session.count.mockResolvedValue(1);

      await service.findAll({ page: 1, limit: 200 });

      expect(prisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });
  });

  describe('touch', () => {
    it('should update session activity timestamp', async () => {
      prisma.session.findUnique.mockResolvedValue(mockSession as never);
      prisma.session.update.mockResolvedValue({
        ...mockSession,
        lastActivityAt: new Date(),
      } as never);

      await service.touch(mockSession.id);

      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: mockSession.id },
        data: { lastActivityAt: expect.any(Date) },
      });
    });

    it('should silently fail for non-existent session', async () => {
      prisma.session.findUnique.mockResolvedValue(null);

      await expect(service.touch('nonexistent-id')).resolves.not.toThrow();
      expect(prisma.session.update).not.toHaveBeenCalled();
    });
  });

  describe('getActiveSessionCount', () => {
    it('should return count of active sessions for account', async () => {
      prisma.session.count.mockResolvedValue(5);

      const result = await service.getActiveSessionCount(mockAccount.id);

      expect(result).toBe(5);
      expect(prisma.session.count).toHaveBeenCalledWith({
        where: {
          accountId: mockAccount.id,
          isActive: true,
          expiresAt: { gt: expect.any(Date) },
        },
      });
    });
  });

  describe('findByTokenHash', () => {
    it('should return session when found by token hash', async () => {
      prisma.session.findUnique.mockResolvedValue(mockSession as never);

      const result = await service.findByTokenHash('hashed_token');

      expect(result).toBeDefined();
      expect(result?.id).toBe(mockSession.id);
    });

    it('should return null when session not found', async () => {
      prisma.session.findUnique.mockResolvedValue(null);

      const result = await service.findByTokenHash('unknown_hash');

      expect(result).toBeNull();
    });
  });

  describe('session revocation with reason', () => {
    it('should revoke session with custom reason', async () => {
      prisma.session.findUnique.mockResolvedValue(mockSession as never);
      prisma.session.update.mockResolvedValue({
        ...mockSession,
        isActive: false,
        revokedReason: 'Security concern',
      } as never);

      await service.revoke(mockSession.id, { reason: 'Security concern' });

      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: mockSession.id },
        data: expect.objectContaining({
          revokedReason: 'Security concern',
        }),
      });
    });

    it('should use default reason when not provided', async () => {
      prisma.session.findUnique.mockResolvedValue(mockSession as never);
      prisma.session.update.mockResolvedValue({
        ...mockSession,
        isActive: false,
        revokedReason: 'User initiated logout',
      } as never);

      await service.revoke(mockSession.id);

      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: mockSession.id },
        data: expect.objectContaining({
          revokedReason: 'User initiated logout',
        }),
      });
    });
  });

  describe('refresh token rotation', () => {
    it('should rotate both access and refresh tokens on refresh', async () => {
      prisma.session.findFirst.mockResolvedValue(mockSession as never);
      prisma.session.update.mockResolvedValue({
        ...mockSession,
        tokenHash: 'new_hashed_access',
        refreshTokenHash: 'new_hashed_refresh',
      } as never);

      const result = await service.refresh('valid_refresh_token');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(cryptoService.generateToken).toHaveBeenCalledTimes(2);
    });

    it('should extend session expiration on refresh', async () => {
      prisma.session.findFirst.mockResolvedValue(mockSession as never);
      prisma.session.update.mockResolvedValue(mockSession as never);

      await service.refresh('valid_refresh_token');

      expect(prisma.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expiresAt: expect.any(Date),
            lastActivityAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('token generation', () => {
    it('should generate unique tokens for each session', async () => {
      const tokens = new Set<string>();
      cryptoService.generateToken
        .mockReturnValueOnce('token1')
        .mockReturnValueOnce('refresh1')
        .mockReturnValueOnce('token2')
        .mockReturnValueOnce('refresh2');

      prisma.account.findUnique.mockResolvedValue(mockAccount as never);
      prisma.session.count.mockResolvedValue(0);
      prisma.session.create.mockResolvedValue(mockSession as never);

      const result1 = await service.create({
        accountId: mockAccount.id,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      });
      tokens.add(result1.accessToken);
      tokens.add(result1.refreshToken);

      const result2 = await service.create({
        accountId: mockAccount.id,
        ipAddress: '127.0.0.2',
        userAgent: 'Mozilla/5.0',
      });
      tokens.add(result2.accessToken);
      tokens.add(result2.refreshToken);

      expect(tokens.size).toBe(4); // All tokens should be unique
    });
  });
});
