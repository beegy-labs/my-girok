import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NaverStrategy } from './naver.strategy';
import { AuthService } from '../auth.service';
import { AuthProvider, Role } from '@my-girok/types';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('NaverStrategy', () => {
  let strategy: NaverStrategy;
  let mockAuthService: { findOrCreateOAuthUser: Mock };
  let mockConfigService: { get: Mock };

  beforeEach(async () => {
    mockAuthService = {
      findOrCreateOAuthUser: vi.fn(),
    };

    mockConfigService = {
      get: vi.fn((key: string) => {
        const config: Record<string, string> = {
          NAVER_CLIENT_ID: 'test-naver-client-id',
          NAVER_CLIENT_SECRET: 'test-naver-client-secret',
          NAVER_CALLBACK_URL: 'http://localhost:3001/api/v1/auth/naver/callback',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NaverStrategy,
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<NaverStrategy>(NaverStrategy);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('validate', () => {
    const mockAccessToken = 'mock-naver-access-token';
    const mockRefreshToken = 'mock-naver-refresh-token';
    const mockProfile = {}; // Naver strategy doesn't use profile from passport

    it('should fetch user profile from Naver API and create/find user', async () => {
      // Arrange
      const naverApiResponse = {
        response: {
          id: 'naver-user-id-123',
          email: 'naveruser@naver.com',
          nickname: 'Naver User',
          profile_image: 'https://ssl.pstatic.net/profile.jpg',
        },
      };

      mockFetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue(naverApiResponse),
      });

      const mockUser = {
        id: 'user-123',
        email: 'naveruser@naver.com',
        name: 'Naver User',
        avatar: 'https://ssl.pstatic.net/profile.jpg',
        role: Role.USER,
        provider: AuthProvider.NAVER,
        providerId: 'naver-user-id-123',
        emailVerified: true,
        createdAt: new Date(),
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('https://openapi.naver.com/v1/nid/me', {
        headers: {
          Authorization: `Bearer ${mockAccessToken}`,
        },
      });

      expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
        'naveruser@naver.com',
        AuthProvider.NAVER,
        'naver-user-id-123',
        'Naver User',
        'https://ssl.pstatic.net/profile.jpg',
      );

      expect(result).toEqual(mockUser);
    });

    it('should handle Naver profile without profile_image', async () => {
      // Arrange
      const naverApiResponse = {
        response: {
          id: 'naver-user-id-456',
          email: 'noimage@naver.com',
          nickname: 'No Image User',
          profile_image: undefined,
        },
      };

      mockFetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue(naverApiResponse),
      });

      const mockUser = {
        id: 'user-456',
        email: 'noimage@naver.com',
        name: 'No Image User',
        avatar: null,
        role: Role.USER,
        provider: AuthProvider.NAVER,
        providerId: 'naver-user-id-456',
        emailVerified: true,
        createdAt: new Date(),
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile);

      // Assert
      expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
        'noimage@naver.com',
        AuthProvider.NAVER,
        'naver-user-id-456',
        'No Image User',
        undefined,
      );

      expect(result).toEqual(mockUser);
    });

    it('should handle Naver profile without nickname', async () => {
      // Arrange
      const naverApiResponse = {
        response: {
          id: 'naver-user-id-789',
          email: 'nonickname@naver.com',
          nickname: undefined,
          profile_image: 'https://ssl.pstatic.net/nonickname.jpg',
        },
      };

      mockFetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue(naverApiResponse),
      });

      const mockUser = {
        id: 'user-789',
        email: 'nonickname@naver.com',
        name: null,
        avatar: 'https://ssl.pstatic.net/nonickname.jpg',
        role: Role.USER,
        provider: AuthProvider.NAVER,
        providerId: 'naver-user-id-789',
        emailVerified: true,
        createdAt: new Date(),
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile);

      // Assert
      expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
        'nonickname@naver.com',
        AuthProvider.NAVER,
        'naver-user-id-789',
        undefined,
        'https://ssl.pstatic.net/nonickname.jpg',
      );

      expect(result).toEqual(mockUser);
    });

    it('should handle Naver API fetch error', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(
        strategy.validate(mockAccessToken, mockRefreshToken, mockProfile),
      ).rejects.toThrow('Network error');

      expect(mockAuthService.findOrCreateOAuthUser).not.toHaveBeenCalled();
    });

    it('should handle Naver API returning invalid JSON', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      });

      // Act & Assert
      await expect(
        strategy.validate(mockAccessToken, mockRefreshToken, mockProfile),
      ).rejects.toThrow('Invalid JSON');
    });

    it('should handle findOrCreateOAuthUser errors', async () => {
      // Arrange
      const naverApiResponse = {
        response: {
          id: 'naver-error-id',
          email: 'error@naver.com',
          nickname: 'Error User',
          profile_image: 'https://ssl.pstatic.net/error.jpg',
        },
      };

      mockFetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue(naverApiResponse),
      });

      mockAuthService.findOrCreateOAuthUser.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(
        strategy.validate(mockAccessToken, mockRefreshToken, mockProfile),
      ).rejects.toThrow('Database error');
    });

    it('should use correct authorization header format', async () => {
      // Arrange
      const testAccessToken = 'test-naver-bearer-token-12345';
      const naverApiResponse = {
        response: {
          id: 'naver-bearer-id',
          email: 'bearer@naver.com',
          nickname: 'Bearer User',
          profile_image: null,
        },
      };

      mockFetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue(naverApiResponse),
      });

      const mockUser = {
        id: 'user-bearer',
        email: 'bearer@naver.com',
        name: 'Bearer User',
        avatar: null,
        role: Role.USER,
        provider: AuthProvider.NAVER,
        providerId: 'naver-bearer-id',
        emailVerified: true,
        createdAt: new Date(),
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockUser);

      // Act
      await strategy.validate(testAccessToken, mockRefreshToken, mockProfile);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('https://openapi.naver.com/v1/nid/me', {
        headers: {
          Authorization: 'Bearer test-naver-bearer-token-12345',
        },
      });
    });

    it('should handle existing Naver user login', async () => {
      // Arrange
      const naverApiResponse = {
        response: {
          id: 'existing-naver-id',
          email: 'existing@naver.com',
          nickname: 'Existing Naver User',
          profile_image: 'https://ssl.pstatic.net/existing.jpg',
        },
      };

      mockFetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue(naverApiResponse),
      });

      // Existing user with old data
      const existingUser = {
        id: 'existing-naver-user-id',
        email: 'existing@naver.com',
        name: 'Old Naver Name',
        avatar: 'https://ssl.pstatic.net/old.jpg',
        role: Role.USER,
        provider: AuthProvider.NAVER,
        providerId: 'existing-naver-id',
        emailVerified: true,
        createdAt: new Date('2024-01-01'),
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(existingUser);

      // Act
      const result = await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile);

      // Assert
      expect(result).toEqual(existingUser);
    });

    it('should handle Naver response with null profile_image', async () => {
      // Arrange
      const naverApiResponse = {
        response: {
          id: 'naver-null-image-id',
          email: 'nullimage@naver.com',
          nickname: 'Null Image User',
          profile_image: null,
        },
      };

      mockFetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue(naverApiResponse),
      });

      const mockUser = {
        id: 'user-nullimage',
        email: 'nullimage@naver.com',
        name: 'Null Image User',
        avatar: null,
        role: Role.USER,
        provider: AuthProvider.NAVER,
        providerId: 'naver-null-image-id',
        emailVerified: true,
        createdAt: new Date(),
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile);

      // Assert
      expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
        'nullimage@naver.com',
        AuthProvider.NAVER,
        'naver-null-image-id',
        'Null Image User',
        null,
      );
      expect(result).toEqual(mockUser);
    });

    it('should handle Korean nickname correctly', async () => {
      // Arrange
      const naverApiResponse = {
        response: {
          id: 'naver-korean-id',
          email: 'korean@naver.com',
          nickname: '한글닉네임',
          profile_image: 'https://ssl.pstatic.net/korean.jpg',
        },
      };

      mockFetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue(naverApiResponse),
      });

      const mockUser = {
        id: 'user-korean',
        email: 'korean@naver.com',
        name: '한글닉네임',
        avatar: 'https://ssl.pstatic.net/korean.jpg',
        role: Role.USER,
        provider: AuthProvider.NAVER,
        providerId: 'naver-korean-id',
        emailVerified: true,
        createdAt: new Date(),
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile);

      // Assert
      expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
        'korean@naver.com',
        AuthProvider.NAVER,
        'naver-korean-id',
        '한글닉네임',
        'https://ssl.pstatic.net/korean.jpg',
      );
      expect(result.name).toBe('한글닉네임');
    });

    it('should handle long naver user ID', async () => {
      // Arrange
      const longNaverId = 'a'.repeat(100);
      const naverApiResponse = {
        response: {
          id: longNaverId,
          email: 'longid@naver.com',
          nickname: 'Long ID User',
          profile_image: 'https://ssl.pstatic.net/longid.jpg',
        },
      };

      mockFetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue(naverApiResponse),
      });

      const mockUser = {
        id: 'user-longid',
        email: 'longid@naver.com',
        name: 'Long ID User',
        avatar: 'https://ssl.pstatic.net/longid.jpg',
        role: Role.USER,
        provider: AuthProvider.NAVER,
        providerId: longNaverId,
        emailVerified: true,
        createdAt: new Date(),
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockUser);

      // Act
      await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile);

      // Assert
      expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
        'longid@naver.com',
        AuthProvider.NAVER,
        longNaverId,
        'Long ID User',
        'https://ssl.pstatic.net/longid.jpg',
      );
    });
  });

  describe('strategy configuration', () => {
    it('should use correct Naver OAuth URLs and config values', () => {
      // The strategy is configured with Naver-specific OAuth URLs
      // This is tested implicitly by the strategy being created successfully
      expect(mockConfigService.get).toHaveBeenCalledWith('NAVER_CLIENT_ID');
      expect(mockConfigService.get).toHaveBeenCalledWith('NAVER_CLIENT_SECRET');
      expect(mockConfigService.get).toHaveBeenCalledWith('NAVER_CALLBACK_URL');
    });
  });
});
