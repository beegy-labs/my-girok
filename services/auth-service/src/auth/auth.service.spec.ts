import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthProvider } from '@my-girok/types';

describe('AuthService', () => {
  let service: AuthService;
  let mockPrismaService: {
    user: { findUnique: jest.Mock; findFirst: jest.Mock; create: jest.Mock };
    session: {
      create: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    domainAccessToken: { create: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let mockJwtService: { sign: jest.Mock; signAsync: jest.Mock; verify: jest.Mock };
  let mockConfigService: { get: jest.Mock };

  beforeEach(async () => {
    // Create fresh mocks for each test
    mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      session: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      domainAccessToken: {
        create: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn(),
      signAsync: jest.fn(),
      verify: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string) => {
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user with hashed password', async () => {
      // Arrange
      const registerDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Plain123!',
        name: 'Test User',
      };

      const mockUser = {
        id: '123',
        email: registerDto.email,
        username: registerDto.username,
        password: 'hashed_password',
        name: registerDto.name,
        avatar: null,
        role: 'USER',
        provider: 'LOCAL',
        providerId: null,
        emailVerified: false,
        accountMode: 'SERVICE',
        countryCode: 'KR',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.$queryRaw.mockResolvedValue([]);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      mockPrismaService.session.create.mockResolvedValue({
        id: 'session-123',
        subjectId: mockUser.id,
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
      // Password is not included in UserPayload type (security by design)
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(mockPrismaService.user.create).toHaveBeenCalled();

      // Verify password was hashed
      const createCall = mockPrismaService.user.create.mock.calls[0][0];
      expect(createCall.data.password).not.toBe('Plain123!');
    });

    it('should throw ConflictException if email already exists', async () => {
      // Arrange
      const registerDto = {
        email: 'existing@example.com',
        username: 'existinguser',
        password: 'Pass123!',
        name: 'Existing User',
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '456',
        email: registerDto.email,
        username: registerDto.username,
      });

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('should hash password with bcrypt using 12 rounds', async () => {
      // Arrange
      const registerDto = {
        email: 'hash@example.com',
        username: 'hashtest',
        password: 'TestPass123!',
        name: 'Hash Test',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockImplementation(async (args: any) => ({
        id: '789',
        ...args.data,
        role: 'USER',
        provider: 'LOCAL',
        providerId: null,
        emailVerified: false,
        accountMode: 'SERVICE',
        countryCode: 'KR',
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      mockPrismaService.$queryRaw.mockResolvedValue([]);
      mockJwtService.signAsync.mockResolvedValue('token');
      mockPrismaService.session.create.mockResolvedValue({} as any);

      // Act
      await service.register(registerDto);

      // Assert
      const createCall = mockPrismaService.user.create.mock.calls[0][0];
      const hashedPassword = createCall.data.password;

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe('TestPass123!');
      expect(hashedPassword.startsWith('$2b$12$')).toBe(true); // bcrypt with 12 rounds
      expect(await bcrypt.compare('TestPass123!', hashedPassword)).toBe(true);
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      // Arrange
      const loginDto = {
        email: 'user@example.com',
        password: 'ValidPass123!',
      };

      const hashedPassword = await bcrypt.hash(loginDto.password, 12);
      const mockUser = {
        id: 'user-123',
        email: loginDto.email,
        password: hashedPassword,
        name: 'Test User',
        avatar: null,
        role: 'USER',
        provider: 'LOCAL',
        providerId: null,
        emailVerified: true,
        accountMode: 'SERVICE',
        countryCode: 'KR',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      // $queryRaw for user services
      mockPrismaService.$queryRaw.mockResolvedValue([]);
      mockJwtService.signAsync
        .mockResolvedValueOnce('login-access-token')
        .mockResolvedValueOnce('login-refresh-token');
      mockPrismaService.session.create.mockResolvedValue({
        id: 'session-456',
        subjectId: mockUser.id,
        subjectType: 'USER',
        tokenHash: 'hashed-token',
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.user.email).toBe(loginDto.email);
      expect(result.user.id).toBe(mockUser.id);
      expect(result.accessToken).toBe('login-access-token');
      expect(result.refreshToken).toBe('login-refresh-token');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      // Arrange
      const loginDto = {
        email: 'user@example.com',
        password: 'WrongPassword123!',
      };

      const correctHashedPassword = await bcrypt.hash('CorrectPass123!', 12);
      const mockUser = {
        id: 'user-123',
        email: loginDto.email,
        password: correctHashedPassword,
        name: 'Test User',
        role: 'USER',
        provider: 'LOCAL',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
      expect(mockPrismaService.session.create).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      // Arrange
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'AnyPassword123!',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
      expect(mockPrismaService.session.create).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for OAuth users', async () => {
      // Arrange
      const loginDto = {
        email: 'oauth@example.com',
        password: 'SomePassword123!',
      };

      const mockOAuthUser = {
        id: 'oauth-user-123',
        email: loginDto.email,
        password: null, // OAuth users have no password
        name: 'OAuth User',
        role: 'USER',
        provider: 'GOOGLE',
        providerId: 'google-123',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockOAuthUser);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens with valid refresh token', async () => {
      // Arrange
      const validRefreshToken = 'valid-refresh-token-xyz';
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        role: 'USER',
        provider: 'LOCAL',
        emailVerified: true,
        accountMode: 'SERVICE',
        countryCode: 'KR',
      };

      // Session uses tokenHash, not plain token
      const mockSession = {
        id: 'session-123',
        subjectId: mockUser.id,
        subjectType: 'USER',
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        revokedAt: null,
        createdAt: new Date(),
      };

      mockJwtService.verify.mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
      });
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      // $queryRaw for user services
      mockPrismaService.$queryRaw.mockResolvedValue([]);
      mockJwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');
      mockPrismaService.session.update.mockResolvedValue({
        id: mockSession.id,
        subjectId: mockUser.id,
        subjectType: 'USER',
        tokenHash: 'new-hashed-token',
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      // Act
      const result = await service.refreshToken(validRefreshToken);

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(mockJwtService.verify).toHaveBeenCalledWith(validRefreshToken);
      expect(mockPrismaService.session.update).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for expired refresh token', async () => {
      // Arrange
      const expiredRefreshToken = 'expired-refresh-token';
      const mockSession = {
        id: 'session-123',
        subjectId: 'user-123',
        subjectType: 'USER',
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        revokedAt: null,
        createdAt: new Date(),
      };

      mockJwtService.verify.mockReturnValue({});
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);

      // Act & Assert
      await expect(service.refreshToken(expiredRefreshToken)).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('should throw UnauthorizedException for non-existent session', async () => {
      // Arrange
      const invalidRefreshToken = 'non-existent-token';

      mockJwtService.verify.mockReturnValue({});
      mockPrismaService.session.findUnique.mockResolvedValue(null);

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

    it('should throw UnauthorizedException for revoked session', async () => {
      // Arrange
      const revokedToken = 'revoked-refresh-token';
      const mockSession = {
        id: 'session-123',
        subjectId: 'user-123',
        subjectType: 'USER',
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: new Date(), // Session has been revoked
        createdAt: new Date(),
      };

      mockJwtService.verify.mockReturnValue({});
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);

      // Act & Assert
      await expect(service.refreshToken(revokedToken)).rejects.toThrow('Invalid refresh token');
    });

    it('should throw UnauthorizedException for non-USER session type', async () => {
      // Arrange
      const adminToken = 'admin-refresh-token';
      const mockSession = {
        id: 'session-123',
        subjectId: 'admin-123',
        subjectType: 'ADMIN', // Not USER type
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: null,
        createdAt: new Date(),
      };

      mockJwtService.verify.mockReturnValue({});
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);

      // Act & Assert
      await expect(service.refreshToken(adminToken)).rejects.toThrow('Invalid refresh token');
    });

    it('should throw UnauthorizedException when user not found during refresh', async () => {
      // Arrange
      const validToken = 'valid-refresh-token';
      const mockSession = {
        id: 'session-123',
        subjectId: 'deleted-user-123',
        subjectType: 'USER',
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: null,
        createdAt: new Date(),
      };

      mockJwtService.verify.mockReturnValue({});
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.user.findUnique.mockResolvedValue(null); // User no longer exists

      // Act & Assert
      await expect(service.refreshToken(validToken)).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('register - username conflict', () => {
    it('should throw ConflictException if username already exists', async () => {
      // Arrange
      const registerDto = {
        email: 'new@example.com',
        username: 'existinguser',
        password: 'Pass123!',
        name: 'New User',
      };

      // Email check passes (no existing email), username check fails (existing username)
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // First call for email - not found
        .mockResolvedValueOnce({ id: '456', username: 'existinguser' }); // Second call for username - found

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException with correct message for existing username', async () => {
      // Arrange
      const registerDto = {
        email: 'new2@example.com',
        username: 'takenuser',
        password: 'Pass123!',
        name: 'New User 2',
      };

      // Email check passes (no existing email), username check fails (existing username)
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // First call for email - not found
        .mockResolvedValueOnce({ id: '789', username: 'takenuser' }); // Second call for username - found

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow('Username already taken');
    });
  });

  describe('logout', () => {
    it('should revoke user session on logout', async () => {
      // Arrange
      const userId = 'user-123';
      const refreshToken = 'refresh-token-to-revoke';

      mockPrismaService.session.updateMany.mockResolvedValue({ count: 1 });

      // Act
      await service.logout(userId, refreshToken);

      // Assert
      expect(mockPrismaService.session.updateMany).toHaveBeenCalledWith({
        where: {
          subjectId: userId,
          subjectType: 'USER',
          tokenHash: expect.any(String),
        },
        data: {
          revokedAt: expect.any(Date),
        },
      });
    });

    it('should handle logout when session does not exist', async () => {
      // Arrange
      const userId = 'user-123';
      const invalidToken = 'non-existent-token';

      mockPrismaService.session.updateMany.mockResolvedValue({ count: 0 });

      // Act & Assert - should not throw
      await expect(service.logout(userId, invalidToken)).resolves.toBeUndefined();
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
    it('should handle $queryRaw error gracefully and continue with empty services', async () => {
      // Arrange
      const userId = 'user-123';
      const email = 'test@example.com';
      const role = 'USER';

      const mockUser = {
        id: userId,
        email,
        accountMode: 'SERVICE',
        countryCode: 'KR',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.$queryRaw.mockRejectedValue(
        new Error('Table user_services does not exist'),
      );
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      // Spy on console.debug
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      // Act
      const result = await service.generateTokens(userId, email, role);

      // Assert
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AuthService] user_services query skipped'),
      );

      consoleSpy.mockRestore();
    });

    it('should include user services in access token when available', async () => {
      // Arrange
      const userId = 'user-123';
      const email = 'test@example.com';
      const role = 'USER';

      const mockUser = {
        id: userId,
        email,
        accountMode: 'UNIFIED',
        countryCode: 'US',
      };

      const mockUserServices = [
        { status: 'ACTIVE', countryCode: 'US', serviceSlug: 'girok' },
        { status: 'ACTIVE', countryCode: 'KR', serviceSlug: 'girok' },
        { status: 'ACTIVE', countryCode: 'US', serviceSlug: 'resume' },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
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
          accountMode: 'UNIFIED',
          countryCode: 'US',
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
    it('should return user when found', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await service.validateUser(userId);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should return null when user not found', async () => {
      // Arrange
      const userId = 'non-existent-user';

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.validateUser(userId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findOrCreateOAuthUser', () => {
    it('should return existing OAuth user when found', async () => {
      // Arrange
      const email = 'oauth@example.com';
      const provider = AuthProvider.GOOGLE;
      const providerId = 'google-user-123';

      const mockExistingUser = {
        id: 'user-123',
        email,
        username: 'oauthuser123',
        name: 'OAuth User',
        avatar: 'https://avatar.url/photo.jpg',
        provider,
        providerId,
        role: 'USER',
        emailVerified: true,
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockExistingUser);

      // Act
      const result = await service.findOrCreateOAuthUser(
        email,
        provider,
        providerId,
        'OAuth User',
        'https://avatar.url/photo.jpg',
      );

      // Assert
      expect(result).toEqual(mockExistingUser);
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          provider,
          providerId,
        },
      });
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('should create new OAuth user when not found', async () => {
      // Arrange
      const email = 'new-oauth@example.com';
      const provider = AuthProvider.GOOGLE;
      const providerId = 'google-new-user-456';
      const name = 'New OAuth User';
      const avatar = 'https://avatar.url/new-photo.jpg';

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(null); // For externalId uniqueness check

      const mockCreatedUser = {
        id: 'new-user-789',
        email,
        username: expect.stringMatching(/^newoauth[a-z0-9]+$/),
        externalId: expect.any(String),
        name,
        avatar,
        provider,
        providerId,
        role: 'USER',
        emailVerified: true,
      };

      mockPrismaService.user.create.mockResolvedValue(mockCreatedUser);

      // Act
      const result = await service.findOrCreateOAuthUser(email, provider, providerId, name, avatar);

      // Assert
      expect(result).toBeDefined();
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          provider,
          providerId,
        },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email,
          provider,
          providerId,
          name,
          avatar,
          role: 'USER',
          emailVerified: true,
        }),
      });
    });

    it('should generate unique username from email prefix', async () => {
      // Arrange
      const email = 'Test.User+tag@example.com';
      const provider = AuthProvider.KAKAO;
      const providerId = 'kakao-123';

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockImplementation(async (args) => ({
        id: 'created-id',
        ...args.data,
      }));

      // Act
      await service.findOrCreateOAuthUser(email, provider, providerId);

      // Assert
      const createCall = mockPrismaService.user.create.mock.calls[0][0];
      // Username should be sanitized: lowercase, alphanumeric only, plus random suffix
      expect(createCall.data.username).toMatch(/^testusertag[a-z0-9]{6}$/);
    });

    it('should handle OAuth user creation without optional name and avatar', async () => {
      // Arrange
      const email = 'minimal@example.com';
      const provider = AuthProvider.NAVER;
      const providerId = 'naver-123';

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockImplementation(async (args) => ({
        id: 'created-id',
        ...args.data,
      }));

      // Act
      await service.findOrCreateOAuthUser(email, provider, providerId);

      // Assert
      const createCall = mockPrismaService.user.create.mock.calls[0][0];
      expect(createCall.data.name).toBeUndefined();
      expect(createCall.data.avatar).toBeUndefined();
    });
  });

  describe('saveRefreshToken', () => {
    it('should save session with ipAddress and userAgent', async () => {
      // Arrange
      const userId = 'user-123';
      const refreshToken = 'refresh-token-xyz';
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0)';

      mockPrismaService.session.create.mockResolvedValue({
        id: 'session-123',
        subjectId: userId,
        subjectType: 'USER',
        tokenHash: 'hashed-token',
        expiresAt: new Date(),
        ipAddress,
        userAgent,
      });

      // Act
      await service.saveRefreshToken(userId, refreshToken, ipAddress, userAgent);

      // Assert
      expect(mockPrismaService.session.create).toHaveBeenCalledWith({
        data: {
          subjectId: userId,
          subjectType: 'USER',
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
          ipAddress,
          userAgent,
        },
      });
    });

    it('should save session without optional ipAddress and userAgent', async () => {
      // Arrange
      const userId = 'user-456';
      const refreshToken = 'refresh-token-abc';

      mockPrismaService.session.create.mockResolvedValue({
        id: 'session-456',
        subjectId: userId,
        subjectType: 'USER',
        tokenHash: 'hashed-token',
        expiresAt: new Date(),
      });

      // Act
      await service.saveRefreshToken(userId, refreshToken);

      // Assert
      expect(mockPrismaService.session.create).toHaveBeenCalledWith({
        data: {
          subjectId: userId,
          subjectType: 'USER',
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
          ipAddress: undefined,
          userAgent: undefined,
        },
      });
    });
  });
});
