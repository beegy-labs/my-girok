import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { AdminAuthGuard } from '../../src/admin/guards/admin-auth.guard';

describe('AdminAuthGuard', () => {
  let guard: AdminAuthGuard;
  let mockJwtService: { verifyAsync: jest.Mock };
  let mockConfigService: { get: jest.Mock };

  const mockAdminPayload = {
    type: 'ADMIN_ACCESS',
    sub: 'admin-123',
    email: 'admin@test.com',
    scope: 'SYSTEM',
    permissions: ['*'],
  };

  beforeEach(async () => {
    mockJwtService = {
      verifyAsync: jest.fn(),
    };
    mockConfigService = {
      get: jest.fn().mockReturnValue('test-jwt-secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuthGuard,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    guard = module.get<AdminAuthGuard>(AdminAuthGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function createMockContext(authHeader?: string): ExecutionContext {
    const mockRequest = {
      headers: {
        authorization: authHeader,
      },
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as ExecutionContext;
  }

  describe('canActivate', () => {
    it('should allow access with valid admin token', async () => {
      // Arrange
      const context = createMockContext('Bearer valid-token');
      mockJwtService.verifyAsync.mockResolvedValue(mockAdminPayload);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
        secret: 'test-jwt-secret',
      });
    });

    it('should attach admin payload to request', async () => {
      // Arrange
      const mockRequest = {
        headers: { authorization: 'Bearer valid-token' },
      } as Record<string, unknown>;
      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;
      mockJwtService.verifyAsync.mockResolvedValue(mockAdminPayload);

      // Act
      await guard.canActivate(context);

      // Assert
      expect(mockRequest.admin).toEqual(mockAdminPayload);
    });

    it('should throw UnauthorizedException when no token provided', async () => {
      // Arrange
      const context = createMockContext();

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Access token required');
    });

    it('should throw UnauthorizedException for non-Bearer token', async () => {
      // Arrange
      const context = createMockContext('Basic invalid-token');

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow('Access token required');
    });

    it('should throw UnauthorizedException for invalid token type', async () => {
      // Arrange
      const context = createMockContext('Bearer valid-token');
      mockJwtService.verifyAsync.mockResolvedValue({
        ...mockAdminPayload,
        type: 'USER_ACCESS', // Wrong type
      });

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow('Invalid token type');
    });

    it('should throw UnauthorizedException for invalid/expired token', async () => {
      // Arrange
      const context = createMockContext('Bearer expired-token');
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Token expired'));

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired token');
    });

    it('should re-throw UnauthorizedException from verify', async () => {
      // Arrange
      const context = createMockContext('Bearer invalid-token');
      mockJwtService.verifyAsync.mockRejectedValue(new UnauthorizedException('Custom error'));

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow('Custom error');
    });
  });
});
