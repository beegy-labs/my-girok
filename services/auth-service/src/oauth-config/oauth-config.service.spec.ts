import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { OAuthConfigService } from './oauth-config.service';
import { PrismaService } from '../database/prisma.service';
import { CryptoService } from '../common/crypto/crypto.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { AuthProvider } from '@my-girok/types';

describe('OAuthConfigService', () => {
  let service: OAuthConfigService;

  const mockPrismaService = {
    oAuthProviderConfig: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  };

  const mockCryptoService = {
    encrypt: vi.fn(),
    decrypt: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthConfigService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CryptoService, useValue: mockCryptoService },
      ],
    }).compile();

    service = module.get<OAuthConfigService>(OAuthConfigService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('isProviderEnabled', () => {
    it('should return true if provider is enabled', async () => {
      const provider = AuthProvider.GOOGLE;
      mockPrismaService.oAuthProviderConfig.findUnique.mockResolvedValue({
        id: '1',
        provider: AuthProvider.GOOGLE,
        enabled: true,
        displayName: 'Google',
      });

      const result = await service.isProviderEnabled(provider);

      expect(result).toBe(true);
      expect(mockPrismaService.oAuthProviderConfig.findUnique).toHaveBeenCalledWith({
        where: { provider },
      });
    });

    it('should return false if provider is disabled', async () => {
      const provider = AuthProvider.KAKAO;
      mockPrismaService.oAuthProviderConfig.findUnique.mockResolvedValue({
        id: '2',
        provider: AuthProvider.KAKAO,
        enabled: false,
        displayName: 'Kakao',
      });

      const result = await service.isProviderEnabled(provider);

      expect(result).toBe(false);
    });

    it('should return true if provider config does not exist (default enabled)', async () => {
      const provider = AuthProvider.NAVER;
      mockPrismaService.oAuthProviderConfig.findUnique.mockResolvedValue(null);

      const result = await service.isProviderEnabled(provider);

      expect(result).toBe(true);
    });

    it('should always return true for LOCAL provider', async () => {
      const provider = AuthProvider.LOCAL;

      const result = await service.isProviderEnabled(provider);

      expect(result).toBe(true);
      expect(mockPrismaService.oAuthProviderConfig.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('getAllProviders', () => {
    it('should return all OAuth provider configurations', async () => {
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
      ];

      mockPrismaService.oAuthProviderConfig.findMany.mockResolvedValue(mockConfigs);

      const result = await service.getAllProviders();

      expect(result).toHaveLength(2);
      expect(result[0].provider).toBe(AuthProvider.GOOGLE);
    });

    it('should return empty array if no configs exist', async () => {
      mockPrismaService.oAuthProviderConfig.findMany.mockResolvedValue([]);

      const result = await service.getAllProviders();

      expect(result).toEqual([]);
    });
  });

  describe('toggleProvider', () => {
    it('should enable a disabled provider', async () => {
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

      const result = await service.toggleProvider(provider, true, adminUserId);

      expect(result.enabled).toBe(true);
    });

    it('should throw ForbiddenException when trying to disable LOCAL provider', async () => {
      const provider = AuthProvider.LOCAL;
      const adminUserId = 'admin-123';

      await expect(service.toggleProvider(provider, false, adminUserId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getProviderConfig', () => {
    it('should return provider configuration', async () => {
      const provider = AuthProvider.GOOGLE;
      const mockConfig = {
        id: '1',
        provider: AuthProvider.GOOGLE,
        enabled: true,
        displayName: 'Google',
      };

      mockPrismaService.oAuthProviderConfig.findUnique.mockResolvedValue(mockConfig);

      const result = await service.getProviderConfig(provider);

      expect(result).toEqual(mockConfig);
    });

    it('should throw NotFoundException if config does not exist', async () => {
      const provider = AuthProvider.NAVER;
      mockPrismaService.oAuthProviderConfig.findUnique.mockResolvedValue(null);

      await expect(service.getProviderConfig(provider)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProviderCredentials', () => {
    it('should encrypt client secret and update credentials', async () => {
      const provider = AuthProvider.GOOGLE;
      const adminUserId = 'admin-123';
      const dto = {
        clientId: 'new-client-id',
        clientSecret: 'new-secret',
        callbackUrl: 'https://auth-bff.girok.dev/oauth/google/callback',
      };

      const encryptedSecret = 'encrypted:secret:data';
      mockCryptoService.encrypt.mockReturnValue(encryptedSecret);

      const existingConfig = {
        id: '1',
        provider: AuthProvider.GOOGLE,
        enabled: true,
        displayName: 'Google',
      };

      mockPrismaService.oAuthProviderConfig.findUnique.mockResolvedValue(existingConfig);
      mockPrismaService.oAuthProviderConfig.update.mockResolvedValue({
        ...existingConfig,
        clientId: dto.clientId,
        clientSecret: encryptedSecret,
        callbackUrl: dto.callbackUrl,
        updatedBy: adminUserId,
      });

      const result = await service.updateProviderCredentials(provider, dto, adminUserId);

      expect(mockCryptoService.encrypt).toHaveBeenCalledWith(dto.clientSecret);
      expect(mockPrismaService.oAuthProviderConfig.update).toHaveBeenCalled();
      expect(result.clientSecretMasked).toContain('*');
    });

    it('should create new config if not exists', async () => {
      const provider = AuthProvider.APPLE;
      const adminUserId = 'admin-456';
      const dto = {
        clientId: 'apple-client-id',
        clientSecret: 'apple-secret',
      };

      const encryptedSecret = 'encrypted:apple:secret';
      mockCryptoService.encrypt.mockReturnValue(encryptedSecret);

      mockPrismaService.oAuthProviderConfig.findUnique.mockResolvedValue(null);
      mockPrismaService.oAuthProviderConfig.create.mockResolvedValue({
        id: '4',
        provider: AuthProvider.APPLE,
        enabled: true,
        clientId: dto.clientId,
        clientSecret: encryptedSecret,
        displayName: 'Apple',
        updatedBy: adminUserId,
        updatedAt: new Date(),
      });

      await service.updateProviderCredentials(provider, dto, adminUserId);

      expect(mockCryptoService.encrypt).toHaveBeenCalledWith(dto.clientSecret);
      expect(mockPrismaService.oAuthProviderConfig.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid callback URL', async () => {
      const provider = AuthProvider.GOOGLE;
      const adminUserId = 'admin-123';
      const dto = {
        callbackUrl: 'https://evil.com/callback',
      };

      await expect(service.updateProviderCredentials(provider, dto, adminUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should accept valid callback URL domains', async () => {
      const provider = AuthProvider.GOOGLE;
      const adminUserId = 'admin-123';
      const validUrls = [
        'http://localhost:4005/oauth/google/callback',
        'https://girok.dev/oauth/google/callback',
        'https://auth.girok.dev/oauth/google/callback',
        'https://auth-bff.girok.dev/oauth/google/callback',
      ];

      mockPrismaService.oAuthProviderConfig.findUnique.mockResolvedValue({
        id: '1',
        provider: AuthProvider.GOOGLE,
        enabled: true,
      });
      mockPrismaService.oAuthProviderConfig.update.mockResolvedValue({
        id: '1',
        provider: AuthProvider.GOOGLE,
        enabled: true,
        updatedBy: adminUserId,
        updatedAt: new Date(),
      });

      for (const url of validUrls) {
        await expect(
          service.updateProviderCredentials(provider, { callbackUrl: url }, adminUserId),
        ).resolves.toBeDefined();
      }
    });
  });

  describe('getDecryptedCredentials', () => {
    it('should return decrypted credentials', async () => {
      const provider = AuthProvider.GOOGLE;
      const encryptedSecret = 'encrypted:secret:data';
      const decryptedSecret = 'plain-secret';

      mockPrismaService.oAuthProviderConfig.findUnique.mockResolvedValue({
        id: '1',
        provider: AuthProvider.GOOGLE,
        clientId: 'client-123',
        clientSecret: encryptedSecret,
        callbackUrl: 'https://auth-bff.girok.dev/oauth/google/callback',
      });

      mockCryptoService.decrypt.mockReturnValue(decryptedSecret);

      const result = await service.getDecryptedCredentials(provider);

      expect(mockCryptoService.decrypt).toHaveBeenCalledWith(encryptedSecret);
      expect(result.clientId).toBe('client-123');
      expect(result.clientSecret).toBe(decryptedSecret);
      expect(result.callbackUrl).toBe('https://auth-bff.girok.dev/oauth/google/callback');
    });

    it('should return null credentials if config does not exist', async () => {
      const provider = AuthProvider.NAVER;
      mockPrismaService.oAuthProviderConfig.findUnique.mockResolvedValue(null);

      const result = await service.getDecryptedCredentials(provider);

      expect(result).toEqual({
        clientId: null,
        clientSecret: null,
        callbackUrl: null,
      });
    });

    it('should return null clientSecret if decryption fails', async () => {
      const provider = AuthProvider.KAKAO;
      mockPrismaService.oAuthProviderConfig.findUnique.mockResolvedValue({
        id: '2',
        provider: AuthProvider.KAKAO,
        clientId: 'kakao-client',
        clientSecret: 'invalid-encrypted-data',
      });

      mockCryptoService.decrypt.mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      const result = await service.getDecryptedCredentials(provider);

      expect(result.clientSecret).toBeNull();
    });
  });

  describe('getEnabledProviders', () => {
    it('should return only enabled providers without LOCAL', async () => {
      const mockConfigs = [
        {
          provider: AuthProvider.GOOGLE,
          enabled: true,
          displayName: 'Google',
          description: 'Login with Google',
        },
        {
          provider: AuthProvider.KAKAO,
          enabled: true,
          displayName: 'Kakao',
          description: 'Login with Kakao',
        },
        {
          provider: AuthProvider.NAVER,
          enabled: false,
          displayName: 'Naver',
          description: 'Login with Naver',
        },
      ];

      mockPrismaService.oAuthProviderConfig.findMany.mockResolvedValue(mockConfigs.slice(0, 2));

      const result = await service.getEnabledProviders();

      expect(result.providers).toHaveLength(2);
      expect(result.providers[0].provider).toBe(AuthProvider.GOOGLE);
      expect(result.providers[0].displayName).toBe('Google');
      expect(result.providers.find((p) => p.provider === AuthProvider.LOCAL)).toBeUndefined();
    });

    it('should return empty list if no providers enabled', async () => {
      mockPrismaService.oAuthProviderConfig.findMany.mockResolvedValue([]);

      const result = await service.getEnabledProviders();

      expect(result.providers).toHaveLength(0);
    });
  });

  describe('getAllProvidersWithMasking', () => {
    it('should return providers with masked secrets', async () => {
      const mockConfigs = [
        {
          id: '1',
          provider: AuthProvider.GOOGLE,
          enabled: true,
          clientId: 'google-client-id',
          clientSecret: 'encrypted:secret:abcd1234',
          displayName: 'Google',
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.oAuthProviderConfig.findMany.mockResolvedValue(mockConfigs);

      const result = await service.getAllProvidersWithMasking();

      expect(result[0].clientSecretMasked).toContain('*');
      expect(result[0].clientSecretMasked).toContain('1234');
      expect(result[0].clientId).toBe('google-client-id');
    });

    it('should handle providers without secrets', async () => {
      const mockConfigs = [
        {
          id: '2',
          provider: AuthProvider.KAKAO,
          enabled: true,
          clientId: 'kakao-client-id',
          clientSecret: null,
          displayName: 'Kakao',
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.oAuthProviderConfig.findMany.mockResolvedValue(mockConfigs);

      const result = await service.getAllProvidersWithMasking();

      expect(result[0].clientSecretMasked).toBeUndefined();
    });
  });
});
