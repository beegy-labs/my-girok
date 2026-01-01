import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { IdentityPrismaService } from '../../database/identity-prisma.service';
import { CryptoService } from '../../common/crypto';

describe('SessionsService', () => {
  let service: SessionsService;
  let prisma: jest.Mocked<IdentityPrismaService>;
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
      get: jest.fn((key: string, defaultValue: unknown) => defaultValue),
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
  });
});
