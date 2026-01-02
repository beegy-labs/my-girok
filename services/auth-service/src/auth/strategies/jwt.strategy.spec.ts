import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from '../auth.service';
import { JwtPayload, Role } from '@my-girok/types';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let mockAuthService: { validateUser: jest.Mock };
  let mockConfigService: { get: jest.Mock };

  // New user structure after gRPC migration (no role, provider, name, avatar)
  const mockUser = {
    id: 'user-123',
    email: 'user@example.com',
    username: 'testuser',
    emailVerified: true,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    mockAuthService = {
      validateUser: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') {
          return 'test-jwt-secret-key-for-testing';
        }
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    const validPayload: JwtPayload = {
      sub: 'user-123',
      email: 'user@example.com',
      role: Role.USER,
      type: 'ACCESS',
    };

    it('should return user for valid JWT payload', async () => {
      // Arrange
      mockAuthService.validateUser.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(validPayload);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockAuthService.validateUser).toHaveBeenCalledWith('user-123');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      // Arrange
      mockAuthService.validateUser.mockResolvedValue(null);

      // Act & Assert
      await expect(strategy.validate(validPayload)).rejects.toThrow(UnauthorizedException);
      expect(mockAuthService.validateUser).toHaveBeenCalledWith('user-123');
    });

    it('should throw UnauthorizedException when validateUser returns undefined', async () => {
      // Arrange
      mockAuthService.validateUser.mockResolvedValue(undefined);

      // Act & Assert
      await expect(strategy.validate(validPayload)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle payload with MANAGER role', async () => {
      // Arrange
      const managerPayload: JwtPayload = {
        sub: 'manager-456',
        email: 'manager@example.com',
        role: Role.MANAGER,
        type: 'ACCESS',
      };

      const mockManager = {
        id: 'manager-456',
        email: 'manager@example.com',
        username: 'manager',
        emailVerified: true,
        createdAt: new Date(),
      };

      mockAuthService.validateUser.mockResolvedValue(mockManager);

      // Act
      const result = await strategy.validate(managerPayload);

      // Assert
      expect(result).toEqual(mockManager);
      expect(result.id).toBe('manager-456');
    });

    it('should handle payload with MASTER role', async () => {
      // Arrange
      const masterPayload: JwtPayload = {
        sub: 'master-789',
        email: 'master@example.com',
        role: Role.MASTER,
        type: 'ACCESS',
      };

      const mockMaster = {
        id: 'master-789',
        email: 'master@example.com',
        username: 'master',
        emailVerified: true,
        createdAt: new Date(),
      };

      mockAuthService.validateUser.mockResolvedValue(mockMaster);

      // Act
      const result = await strategy.validate(masterPayload);

      // Assert
      expect(result).toEqual(mockMaster);
      expect(result.id).toBe('master-789');
    });

    it('should handle payload with REFRESH token type', async () => {
      // Arrange
      const refreshPayload: JwtPayload = {
        sub: 'user-123',
        email: 'user@example.com',
        role: Role.USER,
        type: 'REFRESH',
      };

      mockAuthService.validateUser.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(refreshPayload);

      // Assert
      expect(result).toEqual(mockUser);
    });

    it('should handle payload with DOMAIN_ACCESS token type', async () => {
      // Arrange
      const domainPayload: JwtPayload = {
        sub: 'user-123',
        email: 'user@example.com',
        role: Role.USER,
        type: 'DOMAIN_ACCESS',
        domain: 'resume',
      };

      mockAuthService.validateUser.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(domainPayload);

      // Assert
      expect(result).toEqual(mockUser);
    });

    it('should use sub claim for user ID lookup', async () => {
      // Arrange
      const payloadWithDifferentSub: JwtPayload = {
        sub: 'different-user-id-999',
        email: 'different@example.com',
        role: Role.USER,
        type: 'ACCESS',
      };

      const differentUser = {
        id: 'different-user-id-999',
        email: 'different@example.com',
        username: 'differentuser',
        emailVerified: true,
        createdAt: new Date(),
      };

      mockAuthService.validateUser.mockResolvedValue(differentUser);

      // Act
      await strategy.validate(payloadWithDifferentSub);

      // Assert
      expect(mockAuthService.validateUser).toHaveBeenCalledWith('different-user-id-999');
    });
  });

  describe('Edge Cases', () => {
    it('should handle validateUser throwing an error', async () => {
      // Arrange
      const payload: JwtPayload = {
        sub: 'user-123',
        email: 'user@example.com',
        role: Role.USER,
        type: 'ACCESS',
      };

      mockAuthService.validateUser.mockRejectedValue(new Error('Database connection error'));

      // Act & Assert
      await expect(strategy.validate(payload)).rejects.toThrow('Database connection error');
    });

    it('should handle OAuth user validation', async () => {
      // Arrange
      const payload: JwtPayload = {
        sub: 'oauth-user-123',
        email: 'oauth@example.com',
        role: Role.USER,
        type: 'ACCESS',
      };

      // OAuth user returns same structure (provider info is in identity-service)
      const mockOAuthUser = {
        id: 'oauth-user-123',
        email: 'oauth@example.com',
        username: 'oauthuser',
        emailVerified: true,
        createdAt: new Date(),
      };

      mockAuthService.validateUser.mockResolvedValue(mockOAuthUser);

      // Act
      const result = await strategy.validate(payload);

      // Assert
      expect(result).toEqual(mockOAuthUser);
      expect(result.email).toBe('oauth@example.com');
    });
  });
});
