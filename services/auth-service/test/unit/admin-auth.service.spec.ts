import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as bcrypt from 'bcrypt';

import { AdminAuthService } from '../../src/admin/services/admin-auth.service';
import { PrismaService } from '../../src/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../utils/mock-prisma';
import { createMockCacheManager, MockCacheManager } from '../utils/mock-cache';
import { generateTestId, resetTestCounter } from '../utils/test-factory';

jest.mock('bcrypt');

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  let mockPrisma: MockPrismaService;
  let mockCache: MockCacheManager;
  let mockJwtService: {
    verify: jest.Mock;
    signAsync: jest.Mock;
  };
  let mockConfigService: {
    get: jest.Mock;
  };

  const adminId = '00000000-0000-7000-0000-000000000001';
  const roleId = '00000000-0000-7000-0000-000000000002';
  const tenantId = '00000000-0000-7000-0000-000000000003';

  const mockAdmin = {
    id: adminId,
    email: 'admin@test.com',
    password: 'hashed-password',
    name: 'Test Admin',
    scope: 'SYSTEM',
    tenantId: null,
    roleId,
    isActive: true,
    lastLoginAt: null,
    accountMode: 'SERVICE',
    countryCode: 'KR',
    tenantSlug: null,
    tenantType: null,
    roleName: 'Super Admin',
    roleDisplayName: 'Super Administrator',
    roleLevel: 100,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    resetTestCounter();

    mockPrisma = createMockPrismaService();
    mockCache = createMockCacheManager();
    mockJwtService = {
      verify: jest.fn(),
      signAsync: jest.fn().mockResolvedValue('mock-token'),
    };
    mockConfigService = {
      get: jest.fn().mockReturnValue('1h'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CACHE_MANAGER, useValue: mockCache },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AdminAuthService>(AdminAuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully login admin with valid credentials', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockAdmin]) // find admin
        .mockResolvedValueOnce([{ key: 'admin:*' }]) // permissions
        .mockResolvedValueOnce([{ count: BigInt(5) }]) // allCount for wildcard check
        .mockResolvedValueOnce([]); // getAdminServices

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.$executeRaw.mockResolvedValue(1);
      mockCache.get.mockResolvedValue(undefined);

      // Act
      const result = await service.login({
        email: 'admin@test.com',
        password: 'password123',
      });

      // Assert
      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
      expect(result.admin.email).toBe('admin@test.com');
      expect(result.admin.scope).toBe('SYSTEM');
    });

    it('should throw UnauthorizedException when admin not found', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      // Act & Assert
      await expect(
        service.login({
          email: 'unknown@test.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when account is deactivated', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ ...mockAdmin, isActive: false }]);

      // Act & Assert
      await expect(
        service.login({
          email: 'admin@test.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([mockAdmin]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(
        service.login({
          email: 'admin@test.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should use cached permissions when available', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([mockAdmin]).mockResolvedValueOnce([]); // getAdminServices

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.$executeRaw.mockResolvedValue(1);
      mockCache.get.mockResolvedValue(['admin:read', 'admin:write']);

      // Act
      const result = await service.login({
        email: 'admin@test.com',
        password: 'password123',
      });

      // Assert
      expect(result.admin.permissions).toEqual(['admin:read', 'admin:write']);
    });
  });

  describe('refresh', () => {
    const refreshToken = 'valid-refresh-token';

    it('should successfully refresh tokens', async () => {
      // Arrange
      const mockSession = {
        id: generateTestId(),
        subjectId: adminId,
        subjectType: 'ADMIN',
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
      };

      mockJwtService.verify.mockReturnValue({ sub: adminId });
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockSession])
        .mockResolvedValueOnce([mockAdmin])
        .mockResolvedValueOnce([]); // getAdminServices

      mockPrisma.$executeRaw.mockResolvedValue(1);
      mockCache.get.mockResolvedValue(['*']);

      // Act
      const result = await service.refresh(refreshToken);

      // Assert
      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
    });

    it('should throw UnauthorizedException when session expired', async () => {
      // Arrange
      const expiredSession = {
        id: generateTestId(),
        subjectId: adminId,
        subjectType: 'ADMIN',
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() - 86400000),
        revokedAt: null,
      };

      mockJwtService.verify.mockReturnValue({ sub: adminId });
      mockPrisma.$queryRaw.mockResolvedValueOnce([expiredSession]);

      // Act & Assert
      await expect(service.refresh(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when session is revoked', async () => {
      // Arrange
      const revokedSession = {
        id: generateTestId(),
        subjectId: adminId,
        subjectType: 'ADMIN',
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: new Date(),
      };

      mockJwtService.verify.mockReturnValue({ sub: adminId });
      mockPrisma.$queryRaw.mockResolvedValueOnce([revokedSession]);

      // Act & Assert
      await expect(service.refresh(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when admin not found', async () => {
      // Arrange
      const mockSession = {
        id: generateTestId(),
        subjectId: adminId,
        subjectType: 'ADMIN',
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
      };

      mockJwtService.verify.mockReturnValue({ sub: adminId });
      mockPrisma.$queryRaw.mockResolvedValueOnce([mockSession]).mockResolvedValueOnce([]);

      // Act & Assert
      await expect(service.refresh(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token verification fails', async () => {
      // Arrange
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(service.refresh('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke session on logout', async () => {
      // Arrange
      mockPrisma.$executeRaw.mockResolvedValue(1);

      // Act
      await service.logout(adminId, 'refresh-token');

      // Assert
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should return admin profile', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([mockAdmin]);
      mockCache.get.mockResolvedValue(['*']);

      // Act
      const result = await service.getProfile(adminId);

      // Assert
      expect(result.id).toBe(adminId);
      expect(result.email).toBe('admin@test.com');
      expect(result.name).toBe('Test Admin');
      expect(result.scope).toBe('SYSTEM');
      expect(result.role.name).toBe('Super Admin');
    });

    it('should return tenant admin profile with tenant info', async () => {
      // Arrange
      const tenantAdmin = {
        ...mockAdmin,
        scope: 'TENANT',
        tenantId,
        tenantSlug: 'partner-corp',
        tenantType: 'PARTNER',
        tenantStatus: 'ACTIVE',
      };
      mockPrisma.$queryRaw.mockResolvedValueOnce([tenantAdmin]);
      mockCache.get.mockResolvedValue(['partner_admin:*']);

      // Act
      const result = await service.getProfile(adminId);

      // Assert
      expect(result.scope).toBe('TENANT');
      expect(result.tenant).toBeDefined();
      expect(result.tenant!.slug).toBe('partner-corp');
    });

    it('should throw UnauthorizedException when admin not found', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      // Act & Assert
      await expect(service.getProfile(adminId)).rejects.toThrow(UnauthorizedException);
    });
  });
});
