import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { UnifiedAuthGuard } from './unified-auth.guard';
import { IS_PUBLIC_KEY } from '@my-girok/nest-common';

describe('UnifiedAuthGuard', () => {
  let guard: UnifiedAuthGuard;

  const mockReflector = {
    getAllAndOverride: vi.fn(),
  };

  const createMockExecutionContext = (): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
      getHandler: () => vi.fn(),
      getClass: () => vi.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UnifiedAuthGuard, { provide: Reflector, useValue: mockReflector }],
    }).compile();

    guard = module.get<UnifiedAuthGuard>(UnifiedAuthGuard);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true when endpoint is public', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockExecutionContext();

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        expect.any(Function),
        expect.any(Function),
      ]);
    });

    it('should call parent canActivate when endpoint is not public', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext();

      // The parent class AuthGuard('unified-jwt') will handle the actual validation
      // We can spy on the super.canActivate method
      const superCanActivateSpy = vi.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(guard)),
        'canActivate',
      );
      superCanActivateSpy.mockReturnValue(true);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(superCanActivateSpy).toHaveBeenCalledWith(context);
    });

    it('should call parent canActivate when isPublic is undefined', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext();

      const superCanActivateSpy = vi.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(guard)),
        'canActivate',
      );
      superCanActivateSpy.mockReturnValue(true);

      // Act
      guard.canActivate(context);

      // Assert
      expect(superCanActivateSpy).toHaveBeenCalledWith(context);
    });

    it('should correctly check at handler and class level', () => {
      // Arrange
      const handlerFn = vi.fn();
      const classFn = vi.fn();
      mockReflector.getAllAndOverride.mockReturnValue(true);

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({}),
        }),
        getHandler: () => handlerFn,
        getClass: () => classFn,
      } as unknown as ExecutionContext;

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        handlerFn,
        classFn,
      ]);
    });
  });

  describe('handleRequest', () => {
    it('should return user when authentication succeeds', () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        type: 'USER',
      };

      // Act
      const result = guard.handleRequest(null, mockUser, null);

      // Assert
      expect(result).toBe(mockUser);
    });

    it('should throw UnauthorizedException when user is null', () => {
      // Act & Assert
      expect(() => guard.handleRequest(null, null, null)).toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(null, null, null)).toThrow('Invalid or expired token');
    });

    it('should throw UnauthorizedException when user is undefined', () => {
      // Act & Assert
      expect(() => guard.handleRequest(null, undefined, null)).toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(null, undefined, null)).toThrow('Invalid or expired token');
    });

    it('should throw the provided error when error is present', () => {
      // Arrange
      const customError = new Error('Custom authentication error');

      // Act & Assert
      expect(() => guard.handleRequest(customError, null, null)).toThrow(customError);
    });

    it('should throw the provided error even when user is present', () => {
      // Arrange
      const customError = new Error('Token expired');
      const mockUser = { id: 'user-123' };

      // Act & Assert
      expect(() => guard.handleRequest(customError, mockUser, null)).toThrow(customError);
    });

    it('should throw UnauthorizedException for false user value', () => {
      // Act & Assert
      expect(() => guard.handleRequest(null, false, null)).toThrow(UnauthorizedException);
    });

    it('should handle user with admin type', () => {
      // Arrange
      const mockAdmin = {
        id: 'admin-123',
        email: 'admin@example.com',
        type: 'ADMIN',
        scope: 'SYSTEM',
      };

      // Act
      const result = guard.handleRequest(null, mockAdmin, null);

      // Assert
      expect(result).toBe(mockAdmin);
    });

    it('should handle user with operator type', () => {
      // Arrange
      const mockOperator = {
        id: 'operator-123',
        email: 'operator@example.com',
        type: 'OPERATOR',
        serviceSlug: 'my-girok',
      };

      // Act
      const result = guard.handleRequest(null, mockOperator, null);

      // Assert
      expect(result).toBe(mockOperator);
    });
  });
});
