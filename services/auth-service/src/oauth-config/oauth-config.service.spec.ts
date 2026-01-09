import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { OAuthConfigService } from './oauth-config.service';
import { PrismaService } from '../database/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthProvider } from '@my-girok/types';

describe('OAuthConfigService', () => {
  let service: OAuthConfigService;

  const mockPrismaService = {
    oAuthProviderConfig: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OAuthConfigService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<OAuthConfigService>(OAuthConfigService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('isProviderEnabled', () => {
    it('should return true if provider is enabled', async () => {
      // Arrange
      const provider = AuthProvider.GOOGLE;
      mockPrismaService.oAuthProviderConfig.findUnique.mockResolvedValue({
        id: '1',
        provider: AuthProvider.GOOGLE,
        enabled: true,
        displayName: 'Google',
      });

      // Act
      const result = await service.isProviderEnabled(provider);

      // Assert
      expect(result).toBe(true);
      expect(mockPrismaService.oAuthProviderConfig.findUnique).toHaveBeenCalledWith({
        where: { provider },
      });
    });

    it('should return false if provider is disabled', async () => {
      // Arrange
      const provider = AuthProvider.KAKAO;
      mockPrismaService.oAuthProviderConfig.findUnique.mockResolvedValue({
        id: '2',
        provider: AuthProvider.KAKAO,
        enabled: false,
        displayName: 'Kakao',
      });

      // Act
      const result = await service.isProviderEnabled(provider);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true if provider config does not exist (default enabled)', async () => {
      // Arrange
      const provider = AuthProvider.NAVER;
      mockPrismaService.oAuthProviderConfig.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.isProviderEnabled(provider);

      // Assert
      expect(result).toBe(true); // Default to enabled
    });

    it('should always return true for LOCAL provider', async () => {
      // Arrange
      const provider = AuthProvider.LOCAL;

      // Act
      const result = await service.isProviderEnabled(provider);

      // Assert
      expect(result).toBe(true);
      expect(mockPrismaService.oAuthProviderConfig.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('getAllProviders', () => {
    it('should return all OAuth provider configurations', async () => {
      // Arrange
      const mockConfigs = [
        {
          id: '1',
          provider: AuthProvider.GOOGLE,
          enabled: true,
          displayName: 'Google',
          description: 'Login with Google',
        },
        {
          id: '2',
          provider: AuthProvider.KAKAO,
          enabled: false,
          displayName: 'Kakao',
          description: 'Login with Kakao',
        },
        {
          id: '3',
          provider: AuthProvider.NAVER,
          enabled: true,
          displayName: 'Naver',
          description: 'Login with Naver',
        },
      ];

      mockPrismaService.oAuthProviderConfig.findMany.mockResolvedValue(mockConfigs);

      // Act
      const result = await service.getAllProviders();

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].provider).toBe(AuthProvider.GOOGLE);
      expect(result[1].provider).toBe(AuthProvider.KAKAO);
    });

    it('should return empty array if no configs exist', async () => {
      // Arrange
      mockPrismaService.oAuthProviderConfig.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getAllProviders();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('toggleProvider', () => {
    it('should enable a disabled provider', async () => {
      // Arrange
      const provider = AuthProvider.KAKAO;
      const adminUserId = 'admin-123';
      const existingConfig = {
        id: '2',
        provider: AuthProvider.KAKAO,
        enabled: false,
        displayName: 'Kakao',
      };

      mockPrismaService.oAuthProviderConfig.findUnique.mockResolvedValue(existingConfig);
      mockPrismaService.oAuthProviderConfig.update.mockResolvedValue({
        ...existingConfig,
        enabled: true,
        updatedBy: adminUserId,
      });

      // Act
      const result = await service.toggleProvider(provider, true, adminUserId);

      // Assert
      expect(result.enabled).toBe(true);
      expect(mockPrismaService.oAuthProviderConfig.update).toHaveBeenCalledWith({
        where: { provider },
        data: {
          enabled: true,
          updatedBy: adminUserId,
        },
      });
    });

    it('should disable an enabled provider', async () => {
      // Arrange
      const provider = AuthProvider.GOOGLE;
      const adminUserId = 'admin-456';
      const existingConfig = {
        id: '1',
        provider: AuthProvider.GOOGLE,
        enabled: true,
        displayName: 'Google',
      };

      mockPrismaService.oAuthProviderConfig.findUnique.mockResolvedValue(existingConfig);
      mockPrismaService.oAuthProviderConfig.update.mockResolvedValue({
        ...existingConfig,
        enabled: false,
        updatedBy: adminUserId,
      });

      // Act
      const result = await service.toggleProvider(provider, false, adminUserId);

      // Assert
      expect(result.enabled).toBe(false);
    });

    it('should create config if not exists', async () => {
      // Arrange
      const provider = AuthProvider.NAVER;
      const adminUserId = 'admin-789';

      mockPrismaService.oAuthProviderConfig.findUnique.mockResolvedValue(null);
      mockPrismaService.oAuthProviderConfig.upsert.mockResolvedValue({
        id: '3',
        provider: AuthProvider.NAVER,
        enabled: true,
        displayName: 'Naver',
        updatedBy: adminUserId,
      });

      // Act
      const result = await service.toggleProvider(provider, true, adminUserId);

      // Assert
      expect(result.enabled).toBe(true);
      expect(mockPrismaService.oAuthProviderConfig.upsert).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when trying to disable LOCAL provider', async () => {
      // Arrange
      const provider = AuthProvider.LOCAL;
      const adminUserId = 'admin-123';

      // Act & Assert
      await expect(service.toggleProvider(provider, false, adminUserId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getProviderConfig', () => {
    it('should return provider configuration by provider type', async () => {
      // Arrange
      const provider = AuthProvider.GOOGLE;
      const mockConfig = {
        id: '1',
        provider: AuthProvider.GOOGLE,
        enabled: true,
        displayName: 'Google',
        description: 'Login with Google',
        callbackUrl: 'http://localhost:3001/api/v1/auth/google/callback',
      };

      mockPrismaService.oAuthProviderConfig.findUnique.mockResolvedValue(mockConfig);

      // Act
      const result = await service.getProviderConfig(provider);

      // Assert
      expect(result).toEqual(mockConfig);
      expect(result.provider).toBe(AuthProvider.GOOGLE);
    });

    it('should throw NotFoundException if provider config does not exist', async () => {
      // Arrange
      const provider = AuthProvider.NAVER;
      mockPrismaService.oAuthProviderConfig.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getProviderConfig(provider)).rejects.toThrow(NotFoundException);
    });
  });
});
