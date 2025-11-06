import { Test, TestingModule } from '@nestjs/testing';
import { OAuthConfigController } from './oauth-config.controller';
import { OAuthConfigService } from './oauth-config.service';
import { AuthProvider, Role } from '@my-girok/types';

describe('OAuthConfigController', () => {
  let controller: OAuthConfigController;
  let service: OAuthConfigService;

  const mockOAuthConfigService = {
    getAllProviders: jest.fn(),
    getProviderConfig: jest.fn(),
    toggleProvider: jest.fn(),
    isProviderEnabled: jest.fn(),
  };

  const mockAdminUser = {
    id: 'admin-123',
    email: 'admin@beegy.net',
    role: Role.MASTER,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OAuthConfigController],
      providers: [
        {
          provide: OAuthConfigService,
          useValue: mockOAuthConfigService,
        },
      ],
    }).compile();

    controller = module.get<OAuthConfigController>(OAuthConfigController);
    service = module.get<OAuthConfigService>(OAuthConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /oauth-config', () => {
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
      ];

      mockOAuthConfigService.getAllProviders.mockResolvedValue(mockConfigs);

      // Act
      const result = await controller.getAllProviders();

      // Assert
      expect(result).toEqual(mockConfigs);
      expect(service.getAllProviders).toHaveBeenCalled();
    });
  });

  describe('GET /oauth-config/:provider', () => {
    it('should return specific provider configuration', async () => {
      // Arrange
      const provider = AuthProvider.GOOGLE;
      const mockConfig = {
        id: '1',
        provider: AuthProvider.GOOGLE,
        enabled: true,
        displayName: 'Google',
        description: 'Login with Google',
      };

      mockOAuthConfigService.getProviderConfig.mockResolvedValue(mockConfig);

      // Act
      const result = await controller.getProviderConfig(provider);

      // Assert
      expect(result).toEqual(mockConfig);
      expect(service.getProviderConfig).toHaveBeenCalledWith(provider);
    });
  });

  describe('PATCH /oauth-config/:provider/toggle', () => {
    it('should enable a provider', async () => {
      // Arrange
      const provider = AuthProvider.KAKAO;
      const dto = { enabled: true };
      const mockUpdatedConfig = {
        id: '2',
        provider: AuthProvider.KAKAO,
        enabled: true,
        displayName: 'Kakao',
        updatedBy: mockAdminUser.id,
      };

      mockOAuthConfigService.toggleProvider.mockResolvedValue(mockUpdatedConfig);

      // Act
      const result = await controller.toggleProvider(
        provider,
        dto,
        mockAdminUser,
      );

      // Assert
      expect(result).toEqual(mockUpdatedConfig);
      expect(service.toggleProvider).toHaveBeenCalledWith(
        provider,
        true,
        mockAdminUser.id,
      );
    });

    it('should disable a provider', async () => {
      // Arrange
      const provider = AuthProvider.GOOGLE;
      const dto = { enabled: false };
      const mockUpdatedConfig = {
        id: '1',
        provider: AuthProvider.GOOGLE,
        enabled: false,
        displayName: 'Google',
        updatedBy: mockAdminUser.id,
      };

      mockOAuthConfigService.toggleProvider.mockResolvedValue(mockUpdatedConfig);

      // Act
      const result = await controller.toggleProvider(
        provider,
        dto,
        mockAdminUser,
      );

      // Assert
      expect(result).toEqual(mockUpdatedConfig);
      expect(service.toggleProvider).toHaveBeenCalledWith(
        provider,
        false,
        mockAdminUser.id,
      );
    });
  });

  describe('GET /oauth-config/:provider/status', () => {
    it('should return provider enabled status', async () => {
      // Arrange
      const provider = AuthProvider.NAVER;
      mockOAuthConfigService.isProviderEnabled.mockResolvedValue(true);

      // Act
      const result = await controller.getProviderStatus(provider);

      // Assert
      expect(result).toEqual({
        provider: AuthProvider.NAVER,
        enabled: true,
      });
      expect(service.isProviderEnabled).toHaveBeenCalledWith(provider);
    });

    it('should return false for disabled provider', async () => {
      // Arrange
      const provider = AuthProvider.KAKAO;
      mockOAuthConfigService.isProviderEnabled.mockResolvedValue(false);

      // Act
      const result = await controller.getProviderStatus(provider);

      // Assert
      expect(result).toEqual({
        provider: AuthProvider.KAKAO,
        enabled: false,
      });
    });
  });
});
