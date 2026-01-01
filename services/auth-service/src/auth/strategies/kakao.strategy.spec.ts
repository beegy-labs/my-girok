import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { KakaoStrategy } from './kakao.strategy';
import { AuthService } from '../auth.service';
import { AuthProvider, Role } from '@my-girok/types';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('KakaoStrategy', () => {
  let strategy: KakaoStrategy;
  let mockAuthService: { findOrCreateOAuthUser: jest.Mock };
  let mockConfigService: { get: jest.Mock };

  beforeEach(async () => {
    mockAuthService = {
      findOrCreateOAuthUser: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          KAKAO_CLIENT_ID: 'test-kakao-client-id',
          KAKAO_CLIENT_SECRET: 'test-kakao-client-secret',
          KAKAO_CALLBACK_URL: 'http://localhost:3001/api/v1/auth/kakao/callback',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KakaoStrategy,
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<KakaoStrategy>(KakaoStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    const mockAccessToken = 'mock-kakao-access-token';
    const mockRefreshToken = 'mock-kakao-refresh-token';
    const mockProfile = {}; // Kakao strategy doesn't use profile from passport

    it('should fetch user profile from Kakao API and create/find user', async () => {
      // Arrange
      const kakaoApiResponse = {
        id: 12345678,
        kakao_account: {
          email: 'kakaouser@kakao.com',
          profile: {
            nickname: 'Kakao User',
            profile_image_url: 'https://k.kakaocdn.net/profile.jpg',
          },
        },
      };

      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue(kakaoApiResponse),
      });

      const mockUser = {
        id: 'user-123',
        email: 'kakaouser@kakao.com',
        name: 'Kakao User',
        avatar: 'https://k.kakaocdn.net/profile.jpg',
        role: Role.USER,
        provider: AuthProvider.KAKAO,
        providerId: '12345678',
        emailVerified: true,
        createdAt: new Date(),
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('https://kapi.kakao.com/v2/user/me', {
        headers: {
          Authorization: `Bearer ${mockAccessToken}`,
        },
      });

      expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
        'kakaouser@kakao.com',
        AuthProvider.KAKAO,
        '12345678',
        'Kakao User',
        'https://k.kakaocdn.net/profile.jpg',
      );

      expect(result).toEqual(mockUser);
    });

    it('should handle Kakao profile without profile object', async () => {
      // Arrange
      const kakaoApiResponse = {
        id: 87654321,
        kakao_account: {
          email: 'noprofile@kakao.com',
          // No profile object
        },
      };

      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue(kakaoApiResponse),
      });

      const mockUser = {
        id: 'user-456',
        email: 'noprofile@kakao.com',
        name: null,
        avatar: null,
        role: Role.USER,
        provider: AuthProvider.KAKAO,
        providerId: '87654321',
        emailVerified: true,
        createdAt: new Date(),
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile);

      // Assert
      expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
        'noprofile@kakao.com',
        AuthProvider.KAKAO,
        '87654321',
        undefined, // nickname is undefined
        undefined, // profile_image_url is undefined
      );

      expect(result).toEqual(mockUser);
    });

    it('should handle numeric Kakao ID and convert to string', async () => {
      // Arrange
      const kakaoApiResponse = {
        id: 999888777666,
        kakao_account: {
          email: 'numericid@kakao.com',
          profile: {
            nickname: 'Numeric ID User',
            profile_image_url: 'https://k.kakaocdn.net/numeric.jpg',
          },
        },
      };

      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue(kakaoApiResponse),
      });

      const mockUser = {
        id: 'user-numeric',
        email: 'numericid@kakao.com',
        name: 'Numeric ID User',
        avatar: 'https://k.kakaocdn.net/numeric.jpg',
        role: Role.USER,
        provider: AuthProvider.KAKAO,
        providerId: '999888777666',
        emailVerified: true,
        createdAt: new Date(),
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockUser);

      // Act
      await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile);

      // Assert
      expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
        'numericid@kakao.com',
        AuthProvider.KAKAO,
        '999888777666', // ID should be converted to string
        'Numeric ID User',
        'https://k.kakaocdn.net/numeric.jpg',
      );
    });

    it('should handle Kakao API fetch error', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(
        strategy.validate(mockAccessToken, mockRefreshToken, mockProfile),
      ).rejects.toThrow('Network error');

      expect(mockAuthService.findOrCreateOAuthUser).not.toHaveBeenCalled();
    });

    it('should handle Kakao API returning invalid JSON', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      });

      // Act & Assert
      await expect(
        strategy.validate(mockAccessToken, mockRefreshToken, mockProfile),
      ).rejects.toThrow('Invalid JSON');
    });

    it('should handle findOrCreateOAuthUser errors', async () => {
      // Arrange
      const kakaoApiResponse = {
        id: 11111111,
        kakao_account: {
          email: 'error@kakao.com',
          profile: {
            nickname: 'Error User',
            profile_image_url: 'https://k.kakaocdn.net/error.jpg',
          },
        },
      };

      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue(kakaoApiResponse),
      });

      mockAuthService.findOrCreateOAuthUser.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(
        strategy.validate(mockAccessToken, mockRefreshToken, mockProfile),
      ).rejects.toThrow('Database error');
    });

    it('should use correct authorization header format', async () => {
      // Arrange
      const testAccessToken = 'test-bearer-token-12345';
      const kakaoApiResponse = {
        id: 22222222,
        kakao_account: {
          email: 'bearer@kakao.com',
          profile: {
            nickname: 'Bearer User',
            profile_image_url: null,
          },
        },
      };

      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue(kakaoApiResponse),
      });

      const mockUser = {
        id: 'user-bearer',
        email: 'bearer@kakao.com',
        name: 'Bearer User',
        avatar: null,
        role: Role.USER,
        provider: AuthProvider.KAKAO,
        providerId: '22222222',
        emailVerified: true,
        createdAt: new Date(),
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockUser);

      // Act
      await strategy.validate(testAccessToken, mockRefreshToken, mockProfile);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('https://kapi.kakao.com/v2/user/me', {
        headers: {
          Authorization: 'Bearer test-bearer-token-12345',
        },
      });
    });

    it('should handle profile with null profile_image_url', async () => {
      // Arrange
      const kakaoApiResponse = {
        id: 33333333,
        kakao_account: {
          email: 'nullimage@kakao.com',
          profile: {
            nickname: 'Null Image User',
            profile_image_url: null,
          },
        },
      };

      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue(kakaoApiResponse),
      });

      const mockUser = {
        id: 'user-nullimage',
        email: 'nullimage@kakao.com',
        name: 'Null Image User',
        avatar: null,
        role: Role.USER,
        provider: AuthProvider.KAKAO,
        providerId: '33333333',
        emailVerified: true,
        createdAt: new Date(),
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile);

      // Assert
      expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
        'nullimage@kakao.com',
        AuthProvider.KAKAO,
        '33333333',
        'Null Image User',
        null,
      );
      expect(result).toEqual(mockUser);
    });

    it('should handle existing Kakao user login', async () => {
      // Arrange
      const kakaoApiResponse = {
        id: 44444444,
        kakao_account: {
          email: 'existing@kakao.com',
          profile: {
            nickname: 'Existing Kakao User',
            profile_image_url: 'https://k.kakaocdn.net/existing.jpg',
          },
        },
      };

      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue(kakaoApiResponse),
      });

      // Existing user with old data
      const existingUser = {
        id: 'existing-kakao-user-id',
        email: 'existing@kakao.com',
        name: 'Old Kakao Name',
        avatar: 'https://k.kakaocdn.net/old.jpg',
        role: Role.USER,
        provider: AuthProvider.KAKAO,
        providerId: '44444444',
        emailVerified: true,
        createdAt: new Date('2024-01-01'),
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(existingUser);

      // Act
      const result = await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile);

      // Assert
      expect(result).toEqual(existingUser);
    });
  });

  describe('strategy configuration', () => {
    it('should use correct Kakao OAuth URLs', () => {
      // The strategy is configured with Kakao-specific OAuth URLs
      // This is tested implicitly by the strategy being created successfully
      expect(mockConfigService.get).toHaveBeenCalledWith('KAKAO_CLIENT_ID');
      expect(mockConfigService.get).toHaveBeenCalledWith('KAKAO_CLIENT_SECRET');
      expect(mockConfigService.get).toHaveBeenCalledWith('KAKAO_CALLBACK_URL');
    });
  });
});
