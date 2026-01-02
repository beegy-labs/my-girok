import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from './local.strategy';
import { AuthService } from '../auth.service';
import { Role, AuthProvider } from '@my-girok/types';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let mockAuthService: { login: jest.Mock };

  beforeEach(async () => {
    mockAuthService = {
      login: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [LocalStrategy, { provide: AuthService, useValue: mockAuthService }],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    const validEmail = 'user@example.com';
    const validPassword = 'ValidPass123!';

    it('should return user for valid credentials', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: validEmail,
        name: 'Test User',
        role: Role.USER,
        provider: AuthProvider.LOCAL,
        emailVerified: true,
        createdAt: new Date(),
      };

      const mockLoginResult = {
        user: mockUser,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      mockAuthService.login.mockResolvedValue(mockLoginResult);

      // Act
      const result = await strategy.validate(validEmail, validPassword);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockAuthService.login).toHaveBeenCalledWith({
        email: validEmail,
        password: validPassword,
      });
    });

    it('should throw UnauthorizedException when login returns null', async () => {
      // Arrange
      mockAuthService.login.mockResolvedValue(null);

      // Act & Assert
      await expect(strategy.validate(validEmail, validPassword)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockAuthService.login).toHaveBeenCalledWith({
        email: validEmail,
        password: validPassword,
      });
    });

    it('should throw UnauthorizedException when login returns undefined', async () => {
      // Arrange
      mockAuthService.login.mockResolvedValue(undefined);

      // Act & Assert
      await expect(strategy.validate(validEmail, validPassword)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle email with different cases', async () => {
      // Arrange
      const upperCaseEmail = 'USER@EXAMPLE.COM';
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        role: Role.USER,
        provider: AuthProvider.LOCAL,
        emailVerified: true,
        createdAt: new Date(),
      };

      const mockLoginResult = {
        user: mockUser,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      mockAuthService.login.mockResolvedValue(mockLoginResult);

      // Act
      const result = await strategy.validate(upperCaseEmail, validPassword);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockAuthService.login).toHaveBeenCalledWith({
        email: upperCaseEmail,
        password: validPassword,
      });
    });

    it('should propagate AuthService errors', async () => {
      // Arrange
      mockAuthService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      // Act & Assert
      await expect(strategy.validate(validEmail, 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle database errors from AuthService', async () => {
      // Arrange
      mockAuthService.login.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(strategy.validate(validEmail, validPassword)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should validate user with MANAGER role', async () => {
      // Arrange
      const mockManager = {
        id: 'manager-456',
        email: 'manager@example.com',
        name: 'Manager User',
        role: Role.MANAGER,
        provider: AuthProvider.LOCAL,
        emailVerified: true,
        createdAt: new Date(),
      };

      const mockLoginResult = {
        user: mockManager,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      mockAuthService.login.mockResolvedValue(mockLoginResult);

      // Act
      const result = await strategy.validate('manager@example.com', 'ManagerPass123!');

      // Assert
      expect(result.role).toBe(Role.MANAGER);
    });

    it('should validate user with MASTER role', async () => {
      // Arrange
      const mockMaster = {
        id: 'master-789',
        email: 'master@example.com',
        name: 'Master Admin',
        role: Role.MASTER,
        provider: AuthProvider.LOCAL,
        emailVerified: true,
        createdAt: new Date(),
      };

      const mockLoginResult = {
        user: mockMaster,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      mockAuthService.login.mockResolvedValue(mockLoginResult);

      // Act
      const result = await strategy.validate('master@example.com', 'MasterPass123!');

      // Assert
      expect(result.role).toBe(Role.MASTER);
    });

    it('should handle empty email', async () => {
      // Arrange
      mockAuthService.login.mockResolvedValue(null);

      // Act & Assert
      await expect(strategy.validate('', validPassword)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle empty password', async () => {
      // Arrange
      mockAuthService.login.mockResolvedValue(null);

      // Act & Assert
      await expect(strategy.validate(validEmail, '')).rejects.toThrow(UnauthorizedException);
    });

    it('should handle special characters in password', async () => {
      // Arrange
      const specialPassword = 'P@ss!w0rd#$%^&*()';
      const mockUser = {
        id: 'user-123',
        email: validEmail,
        name: 'Test User',
        role: Role.USER,
        provider: AuthProvider.LOCAL,
        emailVerified: true,
        createdAt: new Date(),
      };

      const mockLoginResult = {
        user: mockUser,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      mockAuthService.login.mockResolvedValue(mockLoginResult);

      // Act
      const result = await strategy.validate(validEmail, specialPassword);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockAuthService.login).toHaveBeenCalledWith({
        email: validEmail,
        password: specialPassword,
      });
    });

    it('should handle unicode characters in password', async () => {
      // Arrange
      const unicodePassword = 'Password123!한글日本語';
      const mockUser = {
        id: 'user-123',
        email: validEmail,
        name: 'Test User',
        role: Role.USER,
        provider: AuthProvider.LOCAL,
        emailVerified: true,
        createdAt: new Date(),
      };

      const mockLoginResult = {
        user: mockUser,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      mockAuthService.login.mockResolvedValue(mockLoginResult);

      // Act
      const result = await strategy.validate(validEmail, unicodePassword);

      // Assert
      expect(result).toEqual(mockUser);
    });

    it('should handle very long password', async () => {
      // Arrange
      const longPassword = 'A'.repeat(1000) + 'Valid123!';
      const mockUser = {
        id: 'user-123',
        email: validEmail,
        name: 'Test User',
        role: Role.USER,
        provider: AuthProvider.LOCAL,
        emailVerified: true,
        createdAt: new Date(),
      };

      const mockLoginResult = {
        user: mockUser,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      mockAuthService.login.mockResolvedValue(mockLoginResult);

      // Act
      const result = await strategy.validate(validEmail, longPassword);

      // Assert
      expect(result).toEqual(mockUser);
    });
  });

  describe('strategy configuration', () => {
    it('should use email field as username field', async () => {
      // The LocalStrategy is configured with usernameField: 'email'
      // This is implicitly tested by the validate method receiving email as first argument
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: Role.USER,
        provider: AuthProvider.LOCAL,
        emailVerified: true,
        createdAt: new Date(),
      };

      const mockLoginResult = {
        user: mockUser,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      mockAuthService.login.mockResolvedValue(mockLoginResult);

      // Act - email is passed as first argument due to usernameField: 'email' config
      const result = await strategy.validate('test@example.com', 'password123');

      // Assert
      expect(mockAuthService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result).toBeDefined();
    });
  });
});
