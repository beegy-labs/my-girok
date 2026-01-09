import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException } from '@nestjs/common';
import { AuthProvider } from '@my-girok/types';
import { IdentityGrpcClient } from '@my-girok/nest-common';

describe('AuthService', () => {
  let service: AuthService;
  let mockPrismaService: {
    user: { findUnique: Mock; findFirst: Mock; create: Mock };
    session: {
      create: Mock;
      findUnique: Mock;
      delete: Mock;
      update: Mock;
      updateMany: Mock;
    };
    domainAccessToken: { create: Mock };
    $queryRaw: Mock;
  };
  let mockJwtService: { sign: Mock; signAsync: Mock; verify: Mock };
  let mockConfigService: { get: Mock };
  let mockIdentityGrpcClient: {
    createAccount: Mock;
    getAccount: Mock;
    getAccountByEmail: Mock;
    updateAccount: Mock;
    validateCredentials: Mock;
    validatePassword: Mock;
    createSession: Mock;
    validateSession: Mock;
    revokeSession: Mock;
  };

  beforeEach(async () => {
    // Create fresh mocks for each test
    mockPrismaService = {
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      session: {
        create: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      domainAccessToken: {
        create: vi.fn(),
      },
      $queryRaw: vi.fn(),
    };

    mockJwtService = {
      sign: vi.fn(),
      signAsync: vi.fn(),
      verify: vi.fn(),
    };

    mockConfigService = {
      get: vi.fn((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          JWT_SECRET: 'test-secret',
          JWT_REFRESH_SECRET: 'test-refresh-secret',
          JWT_ACCESS_EXPIRATION: '1h',
          JWT_REFRESH_EXPIRATION: '7d',
          FRONTEND_URL: 'http://localhost:3000',
        };
        return config[key] ?? defaultValue;
      }),
    };

    mockIdentityGrpcClient = {
      createAccount: vi.fn(),
      getAccount: vi.fn(),
      getAccountByEmail: vi.fn(),
      updateAccount: vi.fn(),
      validateCredentials: vi.fn(),
      validatePassword: vi.fn(),
      createSession: vi.fn(),
      validateSession: vi.fn(),
      revokeSession: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: IdentityGrpcClient, useValue: mockIdentityGrpcClient },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user via gRPC', async () => {
      // Arrange
      const registerDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Plain123!',
        name: 'Test User',
      };

      const mockAccount = {
        id: '123',
        email: registerDto.email,
        username: registerDto.username,
        email_verified: false,
        created_at: { seconds: Math.floor(Date.now() / 1000) },
      };

      mockIdentityGrpcClient.createAccount.mockResolvedValue({ account: mockAccount });
      mockPrismaService.$queryRaw.mockResolvedValue([]);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      mockPrismaService.session.create.mockResolvedValue({
        id: 'session-123',
        subjectId: mockAccount.id,
        subjectType: 'USER',
        tokenHash: 'hashed-token',
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.user.email).toBe(registerDto.email);
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(mockIdentityGrpcClient.createAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          email: registerDto.email,
          username: registerDto.username,
          password: registerDto.password,
        }),
      );
    });

    it('should throw ConflictException if email already exists via gRPC', async () => {
      // Arrange
      const registerDto = {
        email: 'existing@example.com',
        username: 'existinguser',
        password: 'Pass123!',
        name: 'Existing User',
      };

      // Mock gRPC ALREADY_EXISTS error
      const grpcError = new Error('email already exists');
      (grpcError as any).code = 6; // ALREADY_EXISTS status code
      mockIdentityGrpcClient.createAccount.mockRejectedValue(grpcError);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if username already exists via gRPC', async () => {
      // Arrange
      const registerDto = {
        email: 'new@example.com',
        username: 'existinguser',
        password: 'Pass123!',
        name: 'New User',
      };

      // Mock gRPC ALREADY_EXISTS error for username
      const grpcError = new Error('username already exists');
      (grpcError as any).code = 6; // ALREADY_EXISTS status code
      mockIdentityGrpcClient.createAccount.mockRejectedValue(grpcError);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login with valid credentials via gRPC', async () => {
      // Arrange
      const loginDto = {
        email: 'user@example.com',
        password: 'ValidPass123!',
      };

      const mockAccount = {
        id: 'user-123',
        email: loginDto.email,
        username: 'testuser',
        email_verified: true,
        mode: 1, // ACCOUNT_MODE_SERVICE
        created_at: { seconds: Math.floor(Date.now() / 1000) },
      };

      mockIdentityGrpcClient.getAccountByEmail.mockResolvedValue({ account: mockAccount });
      mockIdentityGrpcClient.validatePassword.mockResolvedValue({ valid: true });
      mockIdentityGrpcClient.getAccount.mockResolvedValue({ account: mockAccount });
      mockIdentityGrpcClient.createSession.mockResolvedValue({ session: { id: 'session-456' } });
      mockPrismaService.$queryRaw.mockResolvedValue([]);
      mockJwtService.signAsync
        .mockResolvedValueOnce('login-access-token')
        .mockResolvedValueOnce('login-refresh-token');

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.user.email).toBe(loginDto.email);
      expect(result.user.id).toBe(mockAccount.id);
      expect(result.accessToken).toBe('login-access-token');
      expect(result.refreshToken).toBe('login-refresh-token');
      expect(mockIdentityGrpcClient.getAccountByEmail).toHaveBeenCalledWith({
        email: loginDto.email,
      });
      expect(mockIdentityGrpcClient.validatePassword).toHaveBeenCalledWith({
        account_id: mockAccount.id,
        password: loginDto.password,
      });
    });

    it('should throw UnauthorizedException for invalid password via gRPC', async () => {
      // Arrange
      const loginDto = {
        email: 'user@example.com',
        password: 'WrongPassword123!',
      };

      const mockAccount = {
        id: 'user-123',
        email: loginDto.email,
        username: 'testuser',
        email_verified: true,
      };

      mockIdentityGrpcClient.getAccountByEmail.mockResolvedValue({ account: mockAccount });
      mockIdentityGrpcClient.validatePassword.mockResolvedValue({ valid: false });

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
      expect(mockIdentityGrpcClient.createSession).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for non-existent user via gRPC', async () => {
      // Arrange
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'AnyPassword123!',
      };

      // Mock NOT_FOUND error from gRPC
      const notFoundError = new Error('Account not found');
      (notFoundError as any).code = 5; // NOT_FOUND status code
      mockIdentityGrpcClient.getAccountByEmail.mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
      expect(mockIdentityGrpcClient.createSession).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for OAuth users via gRPC', async () => {
      // Arrange
      const loginDto = {
        email: 'oauth@example.com',
        password: 'SomePassword123!',
      };

      const mockOAuthAccount = {
        id: 'oauth-user-123',
        email: loginDto.email,
        username: 'oauthuser',
        email_verified: true,
        provider: 2, // GOOGLE provider
      };

      mockIdentityGrpcClient.getAccountByEmail.mockResolvedValue({ account: mockOAuthAccount });
      // OAuth users can't validate with password - gRPC returns false
      mockIdentityGrpcClient.validatePassword.mockResolvedValue({ valid: false });

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens with valid refresh token via gRPC', async () => {
      // Arrange
      const validRefreshToken = 'valid-refresh-token-xyz';
      const mockAccount = {
        id: 'user-123',
        email: 'user@example.com',
        username: 'testuser',
        email_verified: true,
        mode: 1, // ACCOUNT_MODE_SERVICE
        created_at: { seconds: Math.floor(Date.now() / 1000) },
      };

      mockJwtService.verify.mockReturnValue({
        sub: mockAccount.id,
        email: mockAccount.email,
      });
      mockIdentityGrpcClient.validateSession.mockResolvedValue({
        valid: true,
        account_id: mockAccount.id,
        session_id: 'session-123',
      });
      mockIdentityGrpcClient.getAccount.mockResolvedValue({ account: mockAccount });
      mockIdentityGrpcClient.revokeSession.mockResolvedValue({});
      mockIdentityGrpcClient.createSession.mockResolvedValue({ session: { id: 'new-session' } });
      mockPrismaService.$queryRaw.mockResolvedValue([]);
      mockJwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      // Act
      const result = await service.refreshToken(validRefreshToken);

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(mockJwtService.verify).toHaveBeenCalledWith(validRefreshToken);
      expect(mockIdentityGrpcClient.validateSession).toHaveBeenCalled();
      expect(mockIdentityGrpcClient.revokeSession).toHaveBeenCalledWith({
        session_id: 'session-123',
        reason: 'Token refresh',
      });
    });

    it('should throw UnauthorizedException for invalid session via gRPC', async () => {
      // Arrange
      const invalidRefreshToken = 'invalid-refresh-token';

      mockJwtService.verify.mockReturnValue({});
      mockIdentityGrpcClient.validateSession.mockResolvedValue({
        valid: false,
      });

      // Act & Assert
      await expect(service.refreshToken(invalidRefreshToken)).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('should throw UnauthorizedException for non-existent session via gRPC', async () => {
      // Arrange
      const invalidRefreshToken = 'non-existent-token';

      mockJwtService.verify.mockReturnValue({});
      mockIdentityGrpcClient.validateSession.mockResolvedValue({
        valid: false,
      });

      // Act & Assert
      await expect(service.refreshToken(invalidRefreshToken)).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('should throw UnauthorizedException for invalid JWT signature', async () => {
      // Arrange
      const invalidToken = 'invalid-jwt-signature';

      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(service.refreshToken(invalidToken)).rejects.toThrow();
    });

    it('should throw UnauthorizedException for revoked session via gRPC', async () => {
      // Arrange
      const revokedToken = 'revoked-refresh-token';

      mockJwtService.verify.mockReturnValue({});
      // gRPC returns valid=false for revoked sessions
      mockIdentityGrpcClient.validateSession.mockResolvedValue({
        valid: false,
      });

      // Act & Assert
      await expect(service.refreshToken(revokedToken)).rejects.toThrow('Invalid refresh token');
    });

    it('should throw UnauthorizedException when user not found during refresh via gRPC', async () => {
      // Arrange
      const validToken = 'valid-refresh-token';

      mockJwtService.verify.mockReturnValue({});
      mockIdentityGrpcClient.validateSession.mockResolvedValue({
        valid: true,
        account_id: 'deleted-user-123',
        session_id: 'session-123',
      });
      mockIdentityGrpcClient.getAccount.mockResolvedValue({ account: null });

      // Act & Assert
      await expect(service.refreshToken(validToken)).rejects.toThrow('User not found');
    });
  });

  describe('register - username conflict', () => {
    it('should throw ConflictException if username already exists via gRPC', async () => {
      // Arrange
      const registerDto = {
        email: 'new@example.com',
        username: 'existinguser',
        password: 'Pass123!',
        name: 'New User',
      };

      // Mock gRPC ALREADY_EXISTS error for username
      const grpcError = new Error('username already taken');
      (grpcError as any).code = 6; // ALREADY_EXISTS status code
      mockIdentityGrpcClient.createAccount.mockRejectedValue(grpcError);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException with correct message for existing username', async () => {
      // Arrange
      const registerDto = {
        email: 'new2@example.com',
        username: 'takenuser',
        password: 'Pass123!',
        name: 'New User 2',
      };

      // Mock gRPC ALREADY_EXISTS error for username
      const grpcError = new Error('username already taken');
      (grpcError as any).code = 6; // ALREADY_EXISTS status code
      mockIdentityGrpcClient.createAccount.mockRejectedValue(grpcError);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow('Username already taken');
    });
  });

  describe('logout', () => {
    it('should revoke user session on logout via gRPC', async () => {
      // Arrange
      const userId = 'user-123';
      const refreshToken = 'refresh-token-to-revoke';

      mockIdentityGrpcClient.validateSession.mockResolvedValue({
        valid: true,
        session_id: 'session-123',
        account_id: userId,
      });
      mockIdentityGrpcClient.revokeSession.mockResolvedValue({});

      // Act
      await service.logout(userId, refreshToken);

      // Assert
      expect(mockIdentityGrpcClient.validateSession).toHaveBeenCalled();
      expect(mockIdentityGrpcClient.revokeSession).toHaveBeenCalledWith({
        session_id: 'session-123',
        reason: 'User logout',
      });
    });

    it('should handle logout when session does not exist via gRPC', async () => {
      // Arrange
      const userId = 'user-123';
      const invalidToken = 'non-existent-token';

      // Session not found - validateSession returns valid=false
      mockIdentityGrpcClient.validateSession.mockResolvedValue({
        valid: false,
      });

      // Act & Assert - should not throw
      await expect(service.logout(userId, invalidToken)).resolves.toBeUndefined();
      expect(mockIdentityGrpcClient.revokeSession).not.toHaveBeenCalled();
    });
  });

  describe('grantDomainAccess', () => {
    it('should create domain access token and return access URL', async () => {
      // Arrange
      const userId = 'user-123';
      const dto = {
        domain: 'resume',
        expiresInHours: 24,
        recipientEmail: 'recipient@example.com',
      };

      const mockAccessToken = 'domain-access-jwt-token';
      mockJwtService.sign.mockReturnValue(mockAccessToken);
      mockPrismaService.domainAccessToken.create.mockResolvedValue({
        id: 'token-123',
        userId,
        domain: dto.domain,
        token: mockAccessToken,
        expiresAt: expect.any(Date),
      });

      // Act
      const result = await service.grantDomainAccess(userId, dto);

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBe(mockAccessToken);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.accessUrl).toContain('http://localhost:3000/resume?token=');
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: userId,
          email: dto.recipientEmail,
          role: 'GUEST',
          type: 'DOMAIN_ACCESS',
          domain: dto.domain,
        }),
        { expiresIn: '24h' },
      );
      expect(mockPrismaService.domainAccessToken.create).toHaveBeenCalledWith({
        data: {
          userId,
          domain: dto.domain,
          token: mockAccessToken,
          expiresAt: expect.any(Date),
        },
      });
    });

    it('should handle domain access without recipient email', async () => {
      // Arrange
      const userId = 'user-123';
      const dto = {
        domain: 'portfolio',
        expiresInHours: 48,
      };

      const mockAccessToken = 'domain-access-token';
      mockJwtService.sign.mockReturnValue(mockAccessToken);
      mockPrismaService.domainAccessToken.create.mockResolvedValue({
        id: 'token-456',
        userId,
        domain: dto.domain,
        token: mockAccessToken,
        expiresAt: new Date(),
      });

      // Act
      const result = await service.grantDomainAccess(userId, dto);

      // Assert
      expect(result.accessToken).toBe(mockAccessToken);
      expect(result.accessUrl).toContain('/portfolio?token=');
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          email: '', // Empty when no recipient email
        }),
        { expiresIn: '48h' },
      );
    });
  });

  describe('generateTokens', () => {
    it('should handle gRPC error gracefully and use default values', async () => {
      // Arrange
      const userId = 'user-123';
      const email = 'test@example.com';
      const role = 'USER';

      // Mock gRPC error
      mockIdentityGrpcClient.getAccount.mockRejectedValue(new Error('gRPC unavailable'));
      mockPrismaService.$queryRaw.mockResolvedValue([]);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      // Act
      const result = await service.generateTokens(userId, email, role);

      // Assert
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      // Should use default values (SERVICE mode, KR country)
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          accountMode: 'SERVICE',
          countryCode: 'KR',
        }),
        expect.any(Object),
      );
    });

    it('should include user services in access token when available', async () => {
      // Arrange
      const userId = 'user-123';
      const email = 'test@example.com';
      const role = 'USER';

      const mockAccount = {
        id: userId,
        email,
        mode: 2, // ACCOUNT_MODE_UNIFIED
      };

      const mockUserServices = [
        { status: 'ACTIVE', countryCode: 'US', serviceSlug: 'girok' },
        { status: 'ACTIVE', countryCode: 'KR', serviceSlug: 'girok' },
        { status: 'ACTIVE', countryCode: 'US', serviceSlug: 'resume' },
      ];

      mockIdentityGrpcClient.getAccount.mockResolvedValue({ account: mockAccount });
      mockPrismaService.$queryRaw.mockResolvedValue(mockUserServices);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token-with-services')
        .mockResolvedValueOnce('refresh-token');

      // Act
      const result = await service.generateTokens(userId, email, role);

      // Assert
      expect(result.accessToken).toBe('access-token-with-services');
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: userId,
          email,
          type: 'USER_ACCESS',
          services: {
            girok: { status: 'ACTIVE', countries: ['US', 'KR'] },
            resume: { status: 'ACTIVE', countries: ['US'] },
          },
        }),
        expect.any(Object),
      );
    });
  });

  describe('generateTokensWithServices', () => {
    it('should generate tokens with provided services payload', async () => {
      // Arrange
      const userId = 'user-123';
      const email = 'test@example.com';
      const accountMode: 'UNIFIED' = 'UNIFIED';
      const countryCode = 'US';
      const userServices = [
        { status: 'ACTIVE', countryCode: 'US', serviceSlug: 'girok' },
        { status: 'ACTIVE', countryCode: 'JP', serviceSlug: 'girok' },
      ];

      mockJwtService.signAsync
        .mockResolvedValueOnce('custom-access-token')
        .mockResolvedValueOnce('custom-refresh-token');

      // Act
      const result = await service.generateTokensWithServices(
        userId,
        email,
        accountMode,
        countryCode,
        userServices,
      );

      // Assert
      expect(result.accessToken).toBe('custom-access-token');
      expect(result.refreshToken).toBe('custom-refresh-token');
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: userId,
          email,
          type: 'USER_ACCESS',
          accountMode: 'UNIFIED',
          countryCode: 'US',
          services: {
            girok: { status: 'ACTIVE', countries: ['US', 'JP'] },
          },
        }),
        expect.any(Object),
      );
    });

    it('should handle empty services array', async () => {
      // Arrange
      const userId = 'user-123';
      const email = 'test@example.com';
      const accountMode: 'SERVICE' = 'SERVICE';
      const countryCode = 'KR';
      const userServices: Array<{ status: string; countryCode: string; serviceSlug: string }> = [];

      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      // Act
      const result = await service.generateTokensWithServices(
        userId,
        email,
        accountMode,
        countryCode,
        userServices,
      );

      // Assert
      expect(result.accessToken).toBe('access-token');
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          services: {},
        }),
        expect.any(Object),
      );
    });
  });

  describe('validateUser', () => {
    it('should return user when found via gRPC', async () => {
      // Arrange
      const userId = 'user-123';
      const mockAccount = {
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
        email_verified: true,
        created_at: { seconds: Math.floor(Date.now() / 1000) },
      };

      mockIdentityGrpcClient.getAccount.mockResolvedValue({ account: mockAccount });

      // Act
      const result = await service.validateUser(userId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(userId);
      expect(result?.email).toBe(mockAccount.email);
      expect(mockIdentityGrpcClient.getAccount).toHaveBeenCalledWith({ id: userId });
    });

    it('should return null when user not found via gRPC', async () => {
      // Arrange
      const userId = 'non-existent-user';

      // Mock NOT_FOUND error
      const notFoundError = new Error('Account not found');
      (notFoundError as any).code = 5; // NOT_FOUND status code
      mockIdentityGrpcClient.getAccount.mockRejectedValue(notFoundError);

      // Act
      const result = await service.validateUser(userId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findOrCreateOAuthUser', () => {
    it('should return existing OAuth user when found via gRPC', async () => {
      // Arrange
      const email = 'oauth@example.com';
      const provider = AuthProvider.GOOGLE;
      const providerId = 'google-user-123';

      const mockExistingAccount = {
        id: 'user-123',
        email,
        username: 'oauthuser123',
        email_verified: true,
        created_at: { seconds: Math.floor(Date.now() / 1000) },
      };

      mockIdentityGrpcClient.getAccountByEmail.mockResolvedValue({ account: mockExistingAccount });

      // Act
      const result = await service.findOrCreateOAuthUser(
        email,
        provider,
        providerId,
        'OAuth User',
        'https://avatar.url/photo.jpg',
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(mockExistingAccount.id);
      expect(result.email).toBe(email);
      expect(mockIdentityGrpcClient.getAccountByEmail).toHaveBeenCalledWith({ email });
      expect(mockIdentityGrpcClient.createAccount).not.toHaveBeenCalled();
    });

    it('should create new OAuth user when not found via gRPC', async () => {
      // Arrange
      const email = 'new-oauth@example.com';
      const provider = AuthProvider.GOOGLE;
      const providerId = 'google-new-user-456';
      const name = 'New OAuth User';
      const avatar = 'https://avatar.url/new-photo.jpg';

      // Mock NOT_FOUND error from getAccountByEmail
      const notFoundError = new Error('Account not found');
      (notFoundError as any).code = 5; // NOT_FOUND status code
      mockIdentityGrpcClient.getAccountByEmail.mockRejectedValue(notFoundError);

      const mockCreatedAccount = {
        id: 'new-user-789',
        email,
        username: expect.stringMatching(/^newoauth[a-z0-9]+$/),
        email_verified: true,
        created_at: { seconds: Math.floor(Date.now() / 1000) },
      };

      mockIdentityGrpcClient.createAccount.mockResolvedValue({ account: mockCreatedAccount });

      // Act
      const result = await service.findOrCreateOAuthUser(email, provider, providerId, name, avatar);

      // Assert
      expect(result).toBeDefined();
      expect(mockIdentityGrpcClient.createAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          email,
          provider_id: providerId,
        }),
      );
    });

    it('should generate unique username from email prefix via gRPC', async () => {
      // Arrange
      const email = 'Test.User+tag@example.com';
      const provider = AuthProvider.KAKAO;
      const providerId = 'kakao-123';

      // Mock NOT_FOUND error from getAccountByEmail
      const notFoundError = new Error('Account not found');
      (notFoundError as any).code = 5; // NOT_FOUND status code
      mockIdentityGrpcClient.getAccountByEmail.mockRejectedValue(notFoundError);

      mockIdentityGrpcClient.createAccount.mockResolvedValue({
        account: {
          id: 'created-id',
          email,
          username: 'testusertag123abc',
          email_verified: true,
          created_at: { seconds: Math.floor(Date.now() / 1000) },
        },
      });

      // Act
      await service.findOrCreateOAuthUser(email, provider, providerId);

      // Assert
      const createCall = mockIdentityGrpcClient.createAccount.mock.calls[0][0];
      // Username should be sanitized: lowercase, alphanumeric only, plus random suffix
      expect(createCall.username).toMatch(/^testusertag[a-z0-9]{6}$/);
    });

    it('should handle OAuth user creation without optional name and avatar', async () => {
      // Arrange
      const email = 'minimal@example.com';
      const provider = AuthProvider.NAVER;
      const providerId = 'naver-123';

      // Mock NOT_FOUND error from getAccountByEmail
      const notFoundError = new Error('Account not found');
      (notFoundError as any).code = 5; // NOT_FOUND status code
      mockIdentityGrpcClient.getAccountByEmail.mockRejectedValue(notFoundError);

      mockIdentityGrpcClient.createAccount.mockResolvedValue({
        account: {
          id: 'created-id',
          email,
          username: 'minimal123abc',
          email_verified: true,
          created_at: { seconds: Math.floor(Date.now() / 1000) },
        },
      });

      // Act
      const result = await service.findOrCreateOAuthUser(email, provider, providerId);

      // Assert
      expect(result).toBeDefined();
      expect(mockIdentityGrpcClient.createAccount).toHaveBeenCalled();
    });
  });

  describe('saveRefreshToken', () => {
    it('should save session with ipAddress and userAgent via gRPC', async () => {
      // Arrange
      const userId = 'user-123';
      const refreshToken = 'refresh-token-xyz';
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0)';

      mockIdentityGrpcClient.createSession.mockResolvedValue({
        session: {
          id: 'session-123',
          account_id: userId,
          ip_address: ipAddress,
          user_agent: userAgent,
        },
      });

      // Act
      await service.saveRefreshToken(userId, refreshToken, ipAddress, userAgent);

      // Assert
      expect(mockIdentityGrpcClient.createSession).toHaveBeenCalledWith({
        account_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_in_ms: 14 * 24 * 60 * 60 * 1000, // 14 days
      });
    });

    it('should save session without optional ipAddress and userAgent via gRPC', async () => {
      // Arrange
      const userId = 'user-456';
      const refreshToken = 'refresh-token-abc';

      mockIdentityGrpcClient.createSession.mockResolvedValue({
        session: {
          id: 'session-456',
          account_id: userId,
        },
      });

      // Act
      await service.saveRefreshToken(userId, refreshToken);

      // Assert
      expect(mockIdentityGrpcClient.createSession).toHaveBeenCalledWith({
        account_id: userId,
        ip_address: undefined,
        user_agent: undefined,
        expires_in_ms: 14 * 24 * 60 * 60 * 1000, // 14 days
      });
    });
  });
});
