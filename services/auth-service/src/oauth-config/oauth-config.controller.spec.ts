import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { OAuthConfigController } from './oauth-config.controller';
import { OAuthConfigService } from './oauth-config.service';
import { AuthProvider, Role } from '@my-girok/types';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('OAuthConfigController', () => {
  let controller: OAuthConfigController;

  const mockOAuthConfigService = {
    getAllProvidersWithMasking: vi.fn(),
    getProviderConfig: vi.fn(),
    toggleProvider: vi.fn(),
    isProviderEnabled: vi.fn(),
    getEnabledProviders: vi.fn(),
    updateProviderCredentials: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OAuthConfigController],
      providers: [{ provide: OAuthConfigService, useValue: mockOAuthConfigService }],
    }).compile();

    controller = module.get<OAuthConfigController>(OAuthConfigController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllProviders', () => {
    it('should return all providers with masked secrets', async () => {
      const mockProviders = [
        {
          id: '1',
          provider: AuthProvider.GOOGLE,
          enabled: true,
          displayName: 'Google',
          clientId: 'google-client-id',
          clientSecretMasked: '************1234',
          updatedAt: new Date(),
        },
        {
          id: '2',
          provider: AuthProvider.KAKAO,
          enabled: false,
          displayName: 'Kakao',
          clientId: 'kakao-client-id',
          clientSecretMasked: '************5678',
          updatedAt: new Date(),
        },
      ];

      mockOAuthConfigService.getAllProvidersWithMasking.mockResolvedValue(mockProviders);

      const result = await controller.getAllProviders();

      expect(result).toEqual(mockProviders);
      expect(mockOAuthConfigService.getAllProvidersWithMasking).toHaveBeenCalledTimes(1);
    });

    it('should return empty array if no providers configured', async () => {
      mockOAuthConfigService.getAllProvidersWithMasking.mockResolvedValue([]);

      const result = await controller.getAllProviders();

      expect(result).toEqual([]);
    });
  });

  describe('getProviderConfig', () => {
    it('should return specific provider configuration', async () => {
      const provider = AuthProvider.GOOGLE;
      const mockConfig = {
        id: '1',
        provider: AuthProvider.GOOGLE,
        enabled: true,
        displayName: 'Google',
        clientId: 'google-client-id',
      };

      mockOAuthConfigService.getProviderConfig.mockResolvedValue(mockConfig);

      const result = await controller.getProviderConfig(provider);

      expect(result).toEqual(mockConfig);
      expect(mockOAuthConfigService.getProviderConfig).toHaveBeenCalledWith(provider);
    });

    it('should throw NotFoundException if provider config does not exist', async () => {
      const provider = AuthProvider.NAVER;
      mockOAuthConfigService.getProviderConfig.mockRejectedValue(
        new NotFoundException(`OAuth provider configuration for ${provider} not found`),
      );

      await expect(controller.getProviderConfig(provider)).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleProvider', () => {
    it('should enable a disabled provider', async () => {
      const provider = AuthProvider.KAKAO;
      const dto = { enabled: true };
      const user = { id: 'admin-123', role: Role.MASTER };
      const updatedConfig = {
        id: '2',
        provider: AuthProvider.KAKAO,
        enabled: true,
        displayName: 'Kakao',
        updatedBy: user.id,
      };

      mockOAuthConfigService.toggleProvider.mockResolvedValue(updatedConfig);

      const result = await controller.toggleProvider(provider, dto, user);

      expect(result).toEqual(updatedConfig);
      expect(mockOAuthConfigService.toggleProvider).toHaveBeenCalledWith(
        provider,
        dto.enabled,
        user.id,
      );
    });

    it('should disable an enabled provider', async () => {
      const provider = AuthProvider.GOOGLE;
      const dto = { enabled: false };
      const user = { id: 'admin-456', role: Role.MASTER };
      const updatedConfig = {
        id: '1',
        provider: AuthProvider.GOOGLE,
        enabled: false,
        displayName: 'Google',
        updatedBy: user.id,
      };

      mockOAuthConfigService.toggleProvider.mockResolvedValue(updatedConfig);

      const result = await controller.toggleProvider(provider, dto, user);

      expect(result).toEqual(updatedConfig);
    });

    it('should throw ForbiddenException when trying to disable LOCAL provider', async () => {
      const provider = AuthProvider.LOCAL;
      const dto = { enabled: false };
      const user = { id: 'admin-789', role: Role.MASTER };

      mockOAuthConfigService.toggleProvider.mockRejectedValue(
        new ForbiddenException('Cannot disable LOCAL provider'),
      );

      await expect(controller.toggleProvider(provider, dto, user)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getProviderStatus', () => {
    it('should return enabled status for enabled provider', async () => {
      const provider = AuthProvider.GOOGLE;
      mockOAuthConfigService.isProviderEnabled.mockResolvedValue(true);

      const result = await controller.getProviderStatus(provider);

      expect(result).toEqual({ provider, enabled: true });
      expect(mockOAuthConfigService.isProviderEnabled).toHaveBeenCalledWith(provider);
    });

    it('should return disabled status for disabled provider', async () => {
      const provider = AuthProvider.KAKAO;
      mockOAuthConfigService.isProviderEnabled.mockResolvedValue(false);

      const result = await controller.getProviderStatus(provider);

      expect(result).toEqual({ provider, enabled: false });
    });

    it('should return true for LOCAL provider', async () => {
      const provider = AuthProvider.LOCAL;
      mockOAuthConfigService.isProviderEnabled.mockResolvedValue(true);

      const result = await controller.getProviderStatus(provider);

      expect(result).toEqual({ provider, enabled: true });
    });
  });

  describe('getEnabledProviders', () => {
    it('should return list of enabled providers without LOCAL', async () => {
      const mockResponse = {
        providers: [
          { provider: AuthProvider.GOOGLE, displayName: 'Google' },
          { provider: AuthProvider.KAKAO, displayName: 'Kakao' },
        ],
      };

      mockOAuthConfigService.getEnabledProviders.mockResolvedValue(mockResponse);

      const result = await controller.getEnabledProviders();

      expect(result).toEqual(mockResponse);
      expect(result.providers).toHaveLength(2);
      expect(result.providers.find((p) => p.provider === AuthProvider.LOCAL)).toBeUndefined();
    });

    it('should return empty list if no providers enabled', async () => {
      const mockResponse = { providers: [] };
      mockOAuthConfigService.getEnabledProviders.mockResolvedValue(mockResponse);

      const result = await controller.getEnabledProviders();

      expect(result).toEqual(mockResponse);
      expect(result.providers).toHaveLength(0);
    });
  });

  describe('updateCredentials', () => {
    it('should update provider credentials and return masked response', async () => {
      const provider = AuthProvider.GOOGLE;
      const dto = {
        clientId: 'new-google-client-id',
        clientSecret: 'new-google-secret',
        callbackUrl: 'https://auth-bff.girok.dev/oauth/google/callback',
      };
      const user = { id: 'admin-123', role: Role.MASTER };
      const mockResponse = {
        id: '1',
        provider: AuthProvider.GOOGLE,
        enabled: true,
        displayName: 'Google',
        clientId: dto.clientId,
        clientSecretMasked: '************cret',
        callbackUrl: dto.callbackUrl,
        updatedBy: user.id,
        updatedAt: new Date(),
      };

      mockOAuthConfigService.updateProviderCredentials.mockResolvedValue(mockResponse);

      const result = await controller.updateCredentials(provider, dto, user);

      expect(result).toEqual(mockResponse);
      expect(mockOAuthConfigService.updateProviderCredentials).toHaveBeenCalledWith(
        provider,
        dto,
        user.id,
      );
      expect(result.clientSecretMasked).toContain('*');
    });

    it('should update only clientId', async () => {
      const provider = AuthProvider.KAKAO;
      const dto = { clientId: 'new-kakao-client-id' };
      const user = { id: 'admin-456', role: Role.MASTER };
      const mockResponse = {
        id: '2',
        provider: AuthProvider.KAKAO,
        enabled: true,
        displayName: 'Kakao',
        clientId: dto.clientId,
        updatedBy: user.id,
        updatedAt: new Date(),
      };

      mockOAuthConfigService.updateProviderCredentials.mockResolvedValue(mockResponse);

      const result = await controller.updateCredentials(provider, dto, user);

      expect(result).toEqual(mockResponse);
    });

    it('should update only clientSecret', async () => {
      const provider = AuthProvider.NAVER;
      const dto = { clientSecret: 'new-naver-secret' };
      const user = { id: 'admin-789', role: Role.MASTER };
      const mockResponse = {
        id: '3',
        provider: AuthProvider.NAVER,
        enabled: true,
        displayName: 'Naver',
        clientSecretMasked: '************cret',
        updatedBy: user.id,
        updatedAt: new Date(),
      };

      mockOAuthConfigService.updateProviderCredentials.mockResolvedValue(mockResponse);

      const result = await controller.updateCredentials(provider, dto, user);

      expect(result).toEqual(mockResponse);
      expect(result.clientSecretMasked).toContain('*');
    });

    it('should throw BadRequestException for invalid callback URL', async () => {
      const provider = AuthProvider.GOOGLE;
      const dto = { callbackUrl: 'https://evil.com/callback' };
      const user = { id: 'admin-123', role: Role.MASTER };

      mockOAuthConfigService.updateProviderCredentials.mockRejectedValue(
        new BadRequestException('Invalid callback URL domain'),
      );

      await expect(controller.updateCredentials(provider, dto, user)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should accept valid girok.dev callback URLs', async () => {
      const provider = AuthProvider.GOOGLE;
      const validUrls = [
        'http://localhost:4005/oauth/google/callback',
        'https://girok.dev/oauth/google/callback',
        'https://auth.girok.dev/oauth/google/callback',
        'https://auth-bff.girok.dev/oauth/google/callback',
      ];
      const user = { id: 'admin-123', role: Role.MASTER };

      for (const url of validUrls) {
        const dto = { callbackUrl: url };
        const mockResponse = {
          id: '1',
          provider: AuthProvider.GOOGLE,
          enabled: true,
          callbackUrl: url,
          updatedBy: user.id,
          updatedAt: new Date(),
        };

        mockOAuthConfigService.updateProviderCredentials.mockResolvedValue(mockResponse);

        const result = await controller.updateCredentials(provider, dto, user);

        expect(result.callbackUrl).toBe(url);
      }
    });
  });
});
