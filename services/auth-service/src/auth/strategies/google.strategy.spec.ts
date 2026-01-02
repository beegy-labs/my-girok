import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GoogleStrategy } from './google.strategy';
import { AuthService } from '../auth.service';
import { AuthProvider, Role } from '@my-girok/types';

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;
  let mockAuthService: { findOrCreateOAuthUser: jest.Mock };
  let mockConfigService: { get: jest.Mock };

  beforeEach(async () => {
    mockAuthService = {
      findOrCreateOAuthUser: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          GOOGLE_CLIENT_ID: 'test-google-client-id',
          GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
          GOOGLE_CALLBACK_URL: 'http://localhost:3001/api/v1/auth/google/callback',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleStrategy,
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<GoogleStrategy>(GoogleStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    const mockAccessToken = 'mock-google-access-token';
    const mockRefreshToken = 'mock-google-refresh-token';

    it('should create or find user and call done callback with user', async () => {
      // Arrange
      const mockProfile = {
        id: 'google-user-id-123',
        emails: [{ value: 'googleuser@gmail.com', verified: true }],
        displayName: 'Google User',
        photos: [{ value: 'https://lh3.googleusercontent.com/photo.jpg' }],
      };

      const mockUser = {
        id: 'user-123',
        email: 'googleuser@gmail.com',
        name: 'Google User',
        avatar: 'https://lh3.googleusercontent.com/photo.jpg',
        role: Role.USER,
        provider: AuthProvider.GOOGLE,
        providerId: 'google-user-id-123',
        emailVerified: true,
        createdAt: new Date(),
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockUser);

      const mockDone = jest.fn();

      // Act
      await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile, mockDone);

      // Assert
      expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
        'googleuser@gmail.com',
        AuthProvider.GOOGLE,
        'google-user-id-123',
        'Google User',
        'https://lh3.googleusercontent.com/photo.jpg',
      );
      expect(mockDone).toHaveBeenCalledWith(null, mockUser);
    });

    it('should handle profile without photos', async () => {
      // Arrange
      const mockProfile = {
        id: 'google-user-id-456',
        emails: [{ value: 'noavatar@gmail.com', verified: true }],
        displayName: 'No Avatar User',
        photos: undefined,
      };

      const mockUser = {
        id: 'user-456',
        email: 'noavatar@gmail.com',
        name: 'No Avatar User',
        avatar: null,
        role: Role.USER,
        provider: AuthProvider.GOOGLE,
        providerId: 'google-user-id-456',
        emailVerified: true,
        createdAt: new Date(),
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockUser);

      const mockDone = jest.fn();

      // Act
      await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile, mockDone);

      // Assert
      expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
        'noavatar@gmail.com',
        AuthProvider.GOOGLE,
        'google-user-id-456',
        'No Avatar User',
        undefined,
      );
      expect(mockDone).toHaveBeenCalledWith(null, mockUser);
    });

    it('should handle profile with empty photos array', async () => {
      // Arrange
      const mockProfile = {
        id: 'google-user-id-789',
        emails: [{ value: 'emptyphotos@gmail.com', verified: true }],
        displayName: 'Empty Photos User',
        photos: [],
      };

      const mockUser = {
        id: 'user-789',
        email: 'emptyphotos@gmail.com',
        name: 'Empty Photos User',
        avatar: null,
        role: Role.USER,
        provider: AuthProvider.GOOGLE,
        providerId: 'google-user-id-789',
        emailVerified: true,
        createdAt: new Date(),
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockUser);

      const mockDone = jest.fn();

      // Act
      await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile, mockDone);

      // Assert
      expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
        'emptyphotos@gmail.com',
        AuthProvider.GOOGLE,
        'google-user-id-789',
        'Empty Photos User',
        undefined,
      );
    });

    it('should handle multiple emails and use the first one', async () => {
      // Arrange
      const mockProfile = {
        id: 'google-user-id-multi',
        emails: [
          { value: 'primary@gmail.com', verified: true },
          { value: 'secondary@gmail.com', verified: true },
        ],
        displayName: 'Multi Email User',
        photos: [{ value: 'https://photo.url/image.jpg' }],
      };

      const mockUser = {
        id: 'user-multi',
        email: 'primary@gmail.com',
        name: 'Multi Email User',
        avatar: 'https://photo.url/image.jpg',
        role: Role.USER,
        provider: AuthProvider.GOOGLE,
        providerId: 'google-user-id-multi',
        emailVerified: true,
        createdAt: new Date(),
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockUser);

      const mockDone = jest.fn();

      // Act
      await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile, mockDone);

      // Assert
      expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
        'primary@gmail.com',
        AuthProvider.GOOGLE,
        'google-user-id-multi',
        'Multi Email User',
        'https://photo.url/image.jpg',
      );
    });

    it('should pass null access and refresh tokens correctly', async () => {
      // Arrange - accessToken and refreshToken prefixed with _ in actual code
      // means they're intentionally unused, but we should test the flow
      const mockProfile = {
        id: 'google-user-id-999',
        emails: [{ value: 'test@gmail.com', verified: true }],
        displayName: 'Test User',
        photos: [{ value: 'https://photo.url/test.jpg' }],
      };

      const mockUser = {
        id: 'user-999',
        email: 'test@gmail.com',
        name: 'Test User',
        avatar: 'https://photo.url/test.jpg',
        role: Role.USER,
        provider: AuthProvider.GOOGLE,
        providerId: 'google-user-id-999',
        emailVerified: true,
        createdAt: new Date(),
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockUser);

      const mockDone = jest.fn();

      // Act
      await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile, mockDone);

      // Assert - the strategy should not use access/refresh tokens for anything
      // It only uses them to make the API call (which is done by passport)
      expect(mockDone).toHaveBeenCalledWith(null, mockUser);
    });

    it('should handle findOrCreateOAuthUser errors', async () => {
      // Arrange
      const mockProfile = {
        id: 'google-user-id-error',
        emails: [{ value: 'error@gmail.com', verified: true }],
        displayName: 'Error User',
        photos: [],
      };

      mockAuthService.findOrCreateOAuthUser.mockRejectedValue(new Error('Database error'));

      const mockDone = jest.fn();

      // Act & Assert
      await expect(
        strategy.validate(mockAccessToken, mockRefreshToken, mockProfile, mockDone),
      ).rejects.toThrow('Database error');
    });

    it('should handle existing user returning from findOrCreateOAuthUser', async () => {
      // Arrange
      const mockProfile = {
        id: 'existing-google-id',
        emails: [{ value: 'existing@gmail.com', verified: true }],
        displayName: 'Updated Display Name',
        photos: [{ value: 'https://new-photo.url/image.jpg' }],
      };

      // Existing user with original data
      const mockExistingUser = {
        id: 'existing-user-id',
        email: 'existing@gmail.com',
        name: 'Original Name', // Name might not be updated
        avatar: 'https://old-photo.url/image.jpg',
        role: Role.USER,
        provider: AuthProvider.GOOGLE,
        providerId: 'existing-google-id',
        emailVerified: true,
        createdAt: new Date('2024-01-01'),
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockExistingUser);

      const mockDone = jest.fn();

      // Act
      await strategy.validate(mockAccessToken, mockRefreshToken, mockProfile, mockDone);

      // Assert
      expect(mockDone).toHaveBeenCalledWith(null, mockExistingUser);
    });
  });

  describe('strategy configuration', () => {
    it('should use correct config values', () => {
      // Assert that ConfigService was called with correct keys
      expect(mockConfigService.get).toHaveBeenCalledWith('GOOGLE_CLIENT_ID');
      expect(mockConfigService.get).toHaveBeenCalledWith('GOOGLE_CLIENT_SECRET');
      expect(mockConfigService.get).toHaveBeenCalledWith('GOOGLE_CALLBACK_URL');
    });
  });
});
