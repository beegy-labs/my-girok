import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { AuthController } from '../../src/auth/auth.controller';
import { AuthService } from '../../src/auth/auth.service';
import { resetTestCounter } from '../utils/test-factory';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: {
    register: Mock;
    login: Mock;
    refreshToken: Mock;
    logout: Mock;
    generateTokens: Mock;
    saveRefreshToken: Mock;
    grantDomainAccess: Mock;
  };
  let mockConfigService: {
    get: Mock;
  };

  const userId = '00000000-0000-7000-0000-000000000001';

  beforeEach(async () => {
    resetTestCounter();

    mockAuthService = {
      register: vi.fn(),
      login: vi.fn(),
      refreshToken: vi.fn(),
      logout: vi.fn(),
      generateTokens: vi.fn(),
      saveRefreshToken: vi.fn(),
      grantDomainAccess: vi.fn(),
    };
    mockConfigService = {
      get: vi.fn().mockReturnValue('http://localhost:3000'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      // Arrange
      const dto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123!',
        name: 'Test User',
      };
      const mockResponse = {
        user: {
          id: userId,
          email: dto.email,
          username: dto.username,
          name: dto.name,
          role: 'USER',
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockAuthService.register.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.register(dto);

      // Assert
      expect(result.user.email).toBe(dto.email);
      expect(result.accessToken).toBe('access-token');
      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      // Arrange
      const dto = {
        email: 'test@example.com',
        password: 'Password123!',
      };
      const mockResponse = {
        user: {
          id: userId,
          email: dto.email,
          name: 'Test User',
          role: 'USER',
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockAuthService.login.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.login(dto);

      // Assert
      expect(result.user.email).toBe(dto.email);
      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens', async () => {
      // Arrange
      const dto = { refreshToken: 'old-refresh-token' };
      const mockResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockAuthService.refreshToken.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.refreshToken(dto);

      // Assert
      expect(result.accessToken).toBe('new-access-token');
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('old-refresh-token');
    });
  });

  describe('logout', () => {
    it('should logout user', async () => {
      // Arrange
      const user = { id: userId };
      const dto = { refreshToken: 'refresh-token' };
      mockAuthService.logout.mockResolvedValue(undefined);

      // Act
      await controller.logout(user, dto);

      // Assert
      expect(mockAuthService.logout).toHaveBeenCalledWith(userId, 'refresh-token');
    });
  });

  describe('googleAuthCallback', () => {
    it('should handle Google OAuth callback', async () => {
      // Arrange
      const mockUser = {
        id: userId,
        email: 'google@example.com',
        role: 'USER',
      };
      const mockReq = {
        user: mockUser,
      } as any;
      const mockRes = {
        redirect: vi.fn(),
      } as any;

      mockAuthService.generateTokens.mockResolvedValue({
        accessToken: 'google-access-token',
        refreshToken: 'google-refresh-token',
      });
      mockAuthService.saveRefreshToken.mockResolvedValue(undefined);

      // Act
      await controller.googleAuthCallback(mockReq, mockRes);

      // Assert
      expect(mockAuthService.generateTokens).toHaveBeenCalledWith(
        userId,
        'google@example.com',
        'USER',
      );
      expect(mockAuthService.saveRefreshToken).toHaveBeenCalledWith(userId, 'google-refresh-token');
      expect(mockRes.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/auth/callback?token=google-access-token',
      );
    });
  });

  describe('kakaoAuthCallback', () => {
    it('should handle Kakao OAuth callback', async () => {
      // Arrange
      const mockUser = {
        id: userId,
        email: 'kakao@example.com',
        role: 'USER',
      };
      const mockReq = { user: mockUser } as any;
      const mockRes = { redirect: vi.fn() } as any;

      mockAuthService.generateTokens.mockResolvedValue({
        accessToken: 'kakao-access-token',
        refreshToken: 'kakao-refresh-token',
      });
      mockAuthService.saveRefreshToken.mockResolvedValue(undefined);

      // Act
      await controller.kakaoAuthCallback(mockReq, mockRes);

      // Assert
      expect(mockRes.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/auth/callback?token=kakao-access-token',
      );
    });
  });

  describe('naverAuthCallback', () => {
    it('should handle Naver OAuth callback', async () => {
      // Arrange
      const mockUser = {
        id: userId,
        email: 'naver@example.com',
        role: 'USER',
      };
      const mockReq = { user: mockUser } as any;
      const mockRes = { redirect: vi.fn() } as any;

      mockAuthService.generateTokens.mockResolvedValue({
        accessToken: 'naver-access-token',
        refreshToken: 'naver-refresh-token',
      });
      mockAuthService.saveRefreshToken.mockResolvedValue(undefined);

      // Act
      await controller.naverAuthCallback(mockReq, mockRes);

      // Assert
      expect(mockRes.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/auth/callback?token=naver-access-token',
      );
    });
  });

  describe('grantDomainAccess', () => {
    it('should grant domain access', async () => {
      // Arrange
      const user = { id: userId };
      const dto = {
        domain: 'resume',
        recipientEmail: 'recipient@example.com',
        expiresInHours: 24,
      };
      const mockResponse = {
        accessToken: 'domain-access-token',
        expiresAt: new Date(),
        accessUrl: 'http://localhost:3000/resume?token=domain-access-token',
      };

      mockAuthService.grantDomainAccess.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.grantDomainAccess(user, dto);

      // Assert
      expect(result.accessToken).toBe('domain-access-token');
      expect(mockAuthService.grantDomainAccess).toHaveBeenCalledWith(userId, dto);
    });
  });
});
