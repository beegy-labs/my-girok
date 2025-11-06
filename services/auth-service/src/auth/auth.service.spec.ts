import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    signAsync: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_ACCESS_EXPIRATION: '15m',
        JWT_REFRESH_EXPIRATION: '7d',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
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
        password: 'Plain123!',
        name: 'Test User',
      };

      const mockUser = {
        id: '123',
        email: registerDto.email,
        password: 'hashed_password',
        name: registerDto.name,
        avatar: null,
        role: 'USER',
        provider: 'LOCAL',
        providerId: null,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValueOnce('access-token');
      mockJwtService.signAsync.mockResolvedValueOnce('refresh-token');
      mockPrismaService.session.create.mockResolvedValue({
        id: 'session-123',
        userId: mockUser.id,
        refreshToken: 'refresh-token',
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
        password: 'Pass123!',
        name: 'Existing User',
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '456',
        email: registerDto.email,
      });

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('should hash password with bcrypt using 12 rounds', async () => {
      // Arrange
      const registerDto = {
        email: 'hash@example.com',
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
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
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
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValueOnce('login-access-token');
      mockJwtService.signAsync.mockResolvedValueOnce('login-refresh-token');
      mockPrismaService.session.create.mockResolvedValue({
        id: 'session-456',
        userId: mockUser.id,
        refreshToken: 'login-refresh-token',
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
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
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
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
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
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
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
      };

      const mockSession = {
        id: 'session-123',
        userId: mockUser.id,
        refreshToken: validRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        createdAt: new Date(),
        user: mockUser,
      };

      mockJwtService.verify.mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
      });
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);
      mockJwtService.signAsync.mockResolvedValueOnce('new-access-token');
      mockJwtService.signAsync.mockResolvedValueOnce('new-refresh-token');
      mockPrismaService.session.update.mockResolvedValue({
        id: mockSession.id,
        userId: mockUser.id,
        refreshToken: 'new-refresh-token',
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
      expect(mockPrismaService.session.update).toHaveBeenCalledWith({
        where: { id: mockSession.id },
        data: expect.objectContaining({
          refreshToken: 'new-refresh-token',
        }),
      });
    });

    it('should throw UnauthorizedException for expired refresh token', async () => {
      // Arrange
      const expiredRefreshToken = 'expired-refresh-token';
      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        refreshToken: expiredRefreshToken,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        createdAt: new Date(),
        user: { id: 'user-123', email: 'user@example.com' },
      };

      mockJwtService.verify = jest.fn().mockReturnValue({});
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);

      // Act & Assert
      await expect(service.refreshToken(expiredRefreshToken)).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('should throw UnauthorizedException for non-existent session', async () => {
      // Arrange
      const invalidRefreshToken = 'non-existent-token';

      mockJwtService.verify = jest.fn().mockReturnValue({});
      mockPrismaService.session.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.refreshToken(invalidRefreshToken)).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('should throw UnauthorizedException for invalid JWT signature', async () => {
      // Arrange
      const invalidToken = 'invalid-jwt-signature';

      mockJwtService.verify = jest.fn().mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(service.refreshToken(invalidToken)).rejects.toThrow();
    });
  });

});
