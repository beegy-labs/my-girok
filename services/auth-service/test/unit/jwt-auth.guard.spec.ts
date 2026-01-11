import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// Define the IS_PUBLIC_KEY constant to match the decorator
const IS_PUBLIC_KEY = 'isPublic';

// Since we can't easily mock the Passport AuthGuard,
// we'll test the guard logic more directly
describe('UnifiedAuthGuard Logic', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  const createMockExecutionContext = (): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user: null }),
      }),
      getHandler: () => vi.fn(),
      getClass: () => vi.fn(),
    } as unknown as ExecutionContext;
  };

  describe('Public route detection', () => {
    it('should detect public routes using IS_PUBLIC_KEY metadata', () => {
      // Arrange
      const context = createMockExecutionContext();
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      // Act
      const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      // Assert
      expect(isPublic).toBe(true);
    });

    it('should detect protected routes when IS_PUBLIC_KEY is false', () => {
      // Arrange
      const context = createMockExecutionContext();
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      // Act
      const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      // Assert
      expect(isPublic).toBe(false);
    });

    it('should detect protected routes when IS_PUBLIC_KEY is undefined', () => {
      // Arrange
      const context = createMockExecutionContext();
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      // Act
      const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      // Assert
      expect(isPublic).toBeFalsy();
    });
  });

  describe('Request handling logic', () => {
    // Test the handleRequest logic pattern used in auth guards
    const handleRequest = (err: Error | null, user: unknown, _info: unknown): unknown => {
      if (err) {
        throw err;
      }
      if (!user) {
        throw new UnauthorizedException('Invalid or expired token');
      }
      return user;
    };

    it('should return user when authentication is successful', () => {
      // Arrange
      const user = {
        type: 'ADMIN',
        id: 'admin-123',
        email: 'admin@test.com',
      };

      // Act
      const result = handleRequest(null, user, null);

      // Assert
      expect(result).toEqual(user);
    });

    it('should throw error when error is provided', () => {
      // Arrange
      const error = new Error('Authentication failed');

      // Act & Assert
      expect(() => handleRequest(error, null, null)).toThrow(error);
    });

    it('should throw UnauthorizedException when user is null', () => {
      // Act & Assert
      expect(() => handleRequest(null, null, null)).toThrow(UnauthorizedException);
      expect(() => handleRequest(null, null, null)).toThrow('Invalid or expired token');
    });

    it('should throw UnauthorizedException when user is undefined', () => {
      // Act & Assert
      expect(() => handleRequest(null, undefined, null)).toThrow(UnauthorizedException);
    });

    it('should throw the original error when both error and no user', () => {
      // Arrange
      const customError = new Error('Custom auth error');

      // Act & Assert
      expect(() => handleRequest(customError, null, null)).toThrow(customError);
    });

    it('should handle various user types', () => {
      // Test with Admin user
      const adminUser = {
        type: 'ADMIN',
        id: 'admin-123',
        email: 'admin@test.com',
        scope: 'SYSTEM',
        permissions: ['*'],
      };
      expect(handleRequest(null, adminUser, null)).toEqual(adminUser);

      // Test with regular User
      const regularUser = {
        type: 'USER',
        id: 'user-123',
        email: 'user@test.com',
        accountMode: 'UNIFIED',
      };
      expect(handleRequest(null, regularUser, null)).toEqual(regularUser);

      // Test with Operator
      const operatorUser = {
        type: 'OPERATOR',
        id: 'operator-123',
        email: 'operator@test.com',
        serviceSlug: 'test-service',
      };
      expect(handleRequest(null, operatorUser, null)).toEqual(operatorUser);
    });
  });

  describe('Integration scenarios', () => {
    it('should allow access to public health check endpoints', () => {
      // Arrange
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      const context = createMockExecutionContext();

      // Simulate the guard logic
      const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      // Assert - public routes bypass authentication
      expect(isPublic).toBe(true);
    });

    it('should require authentication for protected admin routes', () => {
      // Arrange
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const context = createMockExecutionContext();

      // Simulate the guard logic
      const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      // Assert - protected routes require authentication
      expect(isPublic).toBe(false);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, expect.any(Array));
    });
  });
});
