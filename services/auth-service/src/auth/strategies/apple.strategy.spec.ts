import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppleStrategy } from './apple.strategy';
import { AuthService } from '../auth.service';
import { OAuthConfigService } from '../../oauth-config/oauth-config.service';
import { AuthProvider } from '@my-girok/types';
import * as fs from 'fs';

// Mock fs module
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
}));

describe('AppleStrategy', () => {
  let strategy: AppleStrategy;
  let authService: AuthService;
  let oauthConfigService: OAuthConfigService;
  let configService: ConfigService;

  const mockAuthService = {
    findOrCreateOAuthUser: vi.fn(),
  };

  const mockOAuthConfigService = {
    getDecryptedCredentials: vi.fn(),
  };

  const mockConfigService = {
    get: vi.fn((key: string) => {
      const config: Record<string, string> = {
        APPLE_TEAM_ID: 'test-team-id',
        APPLE_KEY_ID: 'test-key-id',
        APPLE_PRIVATE_KEY: 'test-private-key',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock getDecryptedCredentials to return valid credentials by default
    mockOAuthConfigService.getDecryptedCredentials.mockResolvedValue({
      clientId: 'apple-client-id',
      clientSecret: null, // Apple doesn't use client secret in JWT flow
      callbackUrl: 'https://auth-bff.girok.dev/oauth/apple/callback',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppleStrategy,
        { provide: AuthService, useValue: mockAuthService },
        { provide: OAuthConfigService, useValue: mockOAuthConfigService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<AppleStrategy>(AppleStrategy);
    authService = module.get<AuthService>(AuthService);
    oauthConfigService = module.get<OAuthConfigService>(OAuthConfigService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should validate Apple profile with full name', async () => {
      const profile = {
        id: 'apple-user-123',
        emails: [{ value: 'user@example.com', type: 'email' }],
        name: { firstName: 'John', lastName: 'Doe' },
      };

      const mockUser = {
        id: 'user-id-123',
        email: 'user@example.com',
        displayName: 'John Doe',
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockUser);

      const done = vi.fn();
      await strategy.validate('access-token', 'refresh-token', profile as any, done);

      expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
        'user@example.com',
        AuthProvider.APPLE,
        'apple-user-123',
        'John Doe',
        undefined,
      );
      expect(done).toHaveBeenCalledWith(null, mockUser);
    });

    it('should validate Apple profile with only first name', async () => {
      const profile = {
        id: 'apple-user-456',
        emails: [{ value: 'jane@example.com', type: 'email' }],
        name: { firstName: 'Jane', lastName: '' },
      };

      const mockUser = {
        id: 'user-id-456',
        email: 'jane@example.com',
        displayName: 'Jane',
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockUser);

      const done = vi.fn();
      await strategy.validate('access-token', 'refresh-token', profile as any, done);

      expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
        'jane@example.com',
        AuthProvider.APPLE,
        'apple-user-456',
        'Jane',
        undefined,
      );
      expect(done).toHaveBeenCalledWith(null, mockUser);
    });

    it('should validate Apple profile with no name and fallback to email username', async () => {
      const profile = {
        id: 'apple-user-789',
        emails: [{ value: 'noname@example.com', type: 'email' }],
        name: undefined,
      };

      const mockUser = {
        id: 'user-id-789',
        email: 'noname@example.com',
        displayName: 'noname',
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockUser);

      const done = vi.fn();
      await strategy.validate('access-token', 'refresh-token', profile as any, done);

      expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
        'noname@example.com',
        AuthProvider.APPLE,
        'apple-user-789',
        'noname',
        undefined,
      );
      expect(done).toHaveBeenCalledWith(null, mockUser);
    });

    it('should call done with error when no email is provided', async () => {
      const profile = {
        id: 'apple-user-no-email',
        emails: [],
        name: { firstName: 'Test', lastName: 'User' },
      };

      const done = vi.fn();
      await strategy.validate('access-token', 'refresh-token', profile as any, done);

      expect(mockAuthService.findOrCreateOAuthUser).not.toHaveBeenCalled();
      expect(done).toHaveBeenCalledWith(expect.any(Error), undefined);
      expect(done.mock.calls[0][0].message).toContain('Email not provided');
    });

    it('should call done with error when emails array is undefined', async () => {
      const profile = {
        id: 'apple-user-undefined-emails',
        emails: undefined,
        name: { firstName: 'Test', lastName: 'User' },
      };

      const done = vi.fn();
      await strategy.validate('access-token', 'refresh-token', profile as any, done);

      expect(mockAuthService.findOrCreateOAuthUser).not.toHaveBeenCalled();
      expect(done).toHaveBeenCalledWith(expect.any(Error), undefined);
    });

    it('should handle error during user creation', async () => {
      const profile = {
        id: 'apple-user-error',
        emails: [{ value: 'error@example.com', type: 'email' }],
        name: { firstName: 'Error', lastName: 'Test' },
      };

      const error = new Error('Database error');
      mockAuthService.findOrCreateOAuthUser.mockRejectedValue(error);

      const done = vi.fn();
      await strategy.validate('access-token', 'refresh-token', profile as any, done);

      expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalled();
      expect(done).toHaveBeenCalledWith(error, undefined);
    });

    it('should not provide profile photo (Apple limitation)', async () => {
      const profile = {
        id: 'apple-user-photo',
        emails: [{ value: 'photo@example.com', type: 'email' }],
        name: { firstName: 'Photo', lastName: 'Test' },
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue({
        id: 'user-id-photo',
        email: 'photo@example.com',
      });

      const done = vi.fn();
      await strategy.validate('access-token', 'refresh-token', profile as any, done);

      expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
        'photo@example.com',
        AuthProvider.APPLE,
        'apple-user-photo',
        'Photo Test',
        undefined, // Profile photo should be undefined
      );
    });
  });

  describe('loadPrivateKey', () => {
    it('should load private key from file when APPLE_PRIVATE_KEY_PATH is set', () => {
      const keyContent = '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----';
      (fs.readFileSync as Mock).mockReturnValue(keyContent);

      const testConfigService = {
        get: vi.fn((key: string) => {
          if (key === 'APPLE_PRIVATE_KEY_PATH') return '/path/to/key.p8';
          return undefined;
        }),
      };

      const result = (AppleStrategy as any).loadPrivateKey(testConfigService);

      expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/key.p8', 'utf8');
      expect(result).toBe(keyContent);
    });

    it('should load private key from environment variable when APPLE_PRIVATE_KEY is set', () => {
      const keyContent = '-----BEGIN PRIVATE KEY-----\nenv-key\n-----END PRIVATE KEY-----';
      const testConfigService = {
        get: vi.fn((key: string) => {
          if (key === 'APPLE_PRIVATE_KEY') return keyContent;
          return undefined;
        }),
      };

      const result = (AppleStrategy as any).loadPrivateKey(testConfigService);

      expect(fs.readFileSync).not.toHaveBeenCalled();
      expect(result).toBe(keyContent);
    });

    it('should return placeholder when no key is configured', () => {
      const testConfigService = {
        get: vi.fn(() => undefined),
      };

      const result = (AppleStrategy as any).loadPrivateKey(testConfigService);

      expect(fs.readFileSync).not.toHaveBeenCalled();
      expect(result).toBe('placeholder');
    });

    it('should return placeholder when file read fails', () => {
      (fs.readFileSync as Mock).mockImplementation(() => {
        throw new Error('File not found');
      });

      const testConfigService = {
        get: vi.fn((key: string) => {
          if (key === 'APPLE_PRIVATE_KEY_PATH') return '/invalid/path.p8';
          return undefined;
        }),
      };

      const result = (AppleStrategy as any).loadPrivateKey(testConfigService);

      expect(fs.readFileSync).toHaveBeenCalled();
      expect(result).toBe('placeholder');
    });
  });

  describe('initializeFromDatabase', () => {
    it('should initialize with database credentials on success', async () => {
      // This test verifies the behavior during construction
      // The credentials mock is already set in beforeEach
      expect(mockOAuthConfigService.getDecryptedCredentials).toHaveBeenCalledWith(
        AuthProvider.APPLE,
      );
    });

    it('should handle missing credentials gracefully', async () => {
      mockOAuthConfigService.getDecryptedCredentials.mockResolvedValue({
        clientId: null,
        clientSecret: null,
        callbackUrl: null,
      });

      // Create new strategy instance with null credentials
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AppleStrategy,
          { provide: AuthService, useValue: mockAuthService },
          { provide: OAuthConfigService, useValue: mockOAuthConfigService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const newStrategy = module.get<AppleStrategy>(AppleStrategy);

      expect(newStrategy).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      mockOAuthConfigService.getDecryptedCredentials.mockRejectedValue(
        new Error('Database connection failed'),
      );

      // Create new strategy instance with database error
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AppleStrategy,
          { provide: AuthService, useValue: mockAuthService },
          { provide: OAuthConfigService, useValue: mockOAuthConfigService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const newStrategy = module.get<AppleStrategy>(AppleStrategy);

      expect(newStrategy).toBeDefined();
    });
  });
});
