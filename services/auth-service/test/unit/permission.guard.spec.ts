import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PermissionGuard } from '../../src/admin/guards/permission.guard';
import { PERMISSIONS_KEY } from '../../src/admin/decorators/permissions.decorator';

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionGuard(reflector);
  });

  const createMockExecutionContext = (user: unknown): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => vi.fn(),
      getClass: () => vi.fn(),
    } as unknown as ExecutionContext;
  };

  const createMockExecutionContextWithAdmin = (admin: unknown): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ admin }),
      }),
      getHandler: () => vi.fn(),
      getClass: () => vi.fn(),
    } as unknown as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should return true when no permissions are required', () => {
      // Arrange
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const context = createMockExecutionContext({});

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when required permissions is empty array', () => {
      // Arrange
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
      const context = createMockExecutionContext({});

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user is not found', () => {
      // Arrange
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['legal:read']);
      const context = createMockExecutionContext(null);

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('Admin context not found');
    });

    it('should throw ForbiddenException when user is not an admin', () => {
      // Arrange
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['legal:read']);
      const user = { type: 'USER', id: 'user-123', email: 'user@test.com' };
      const context = createMockExecutionContext(user);

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('Admin authentication required');
    });

    it('should return true for system super admin with wildcard permission', () => {
      // Arrange
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['legal:read', 'legal:create']);
      const admin = {
        type: 'ADMIN',
        id: 'admin-123',
        email: 'admin@test.com',
        permissions: ['*'], // Super admin
      };
      const context = createMockExecutionContext(admin);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when admin has all required permissions', () => {
      // Arrange
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['legal:read', 'legal:create']);
      const admin = {
        type: 'ADMIN',
        id: 'admin-123',
        email: 'admin@test.com',
        permissions: ['legal:read', 'legal:create', 'audit:read'],
      };
      const context = createMockExecutionContext(admin);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when admin is missing required permissions', () => {
      // Arrange
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['legal:read', 'legal:delete']);
      const admin = {
        type: 'ADMIN',
        id: 'admin-123',
        email: 'admin@test.com',
        permissions: ['legal:read'], // Missing legal:delete
      };
      const context = createMockExecutionContext(admin);

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Missing required permissions: legal:read, legal:delete',
      );
    });

    it('should support resource wildcard permission (resource:*)', () => {
      // Arrange
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['legal:read', 'legal:create']);
      const admin = {
        type: 'ADMIN',
        id: 'admin-123',
        email: 'admin@test.com',
        permissions: ['legal:*'], // Wildcard for all legal actions
      };
      const context = createMockExecutionContext(admin);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should work with legacy request.admin property', () => {
      // Arrange
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['audit:read']);
      const admin = {
        type: 'ADMIN',
        id: 'admin-123',
        email: 'admin@test.com',
        permissions: ['audit:read'],
      };
      const context = createMockExecutionContextWithAdmin(admin);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should use PERMISSIONS_KEY for metadata lookup', () => {
      // Arrange
      const getAllAndOverrideSpy = vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
      const context = createMockExecutionContext({});

      // Act
      guard.canActivate(context);

      // Assert
      expect(getAllAndOverrideSpy).toHaveBeenCalledWith(PERMISSIONS_KEY, [
        expect.any(Function), // handler
        expect.any(Function), // class
      ]);
    });
  });

  describe('permission matching', () => {
    it('should match exact permission', () => {
      // Arrange
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['content:read']);
      const admin = {
        type: 'ADMIN',
        id: 'admin-123',
        email: 'admin@test.com',
        permissions: ['content:read'],
      };
      const context = createMockExecutionContext(admin);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should not match different resource', () => {
      // Arrange
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['content:read']);
      const admin = {
        type: 'ADMIN',
        id: 'admin-123',
        email: 'admin@test.com',
        permissions: ['user:read'],
      };
      const context = createMockExecutionContext(admin);

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should not match different action', () => {
      // Arrange
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['content:delete']);
      const admin = {
        type: 'ADMIN',
        id: 'admin-123',
        email: 'admin@test.com',
        permissions: ['content:read'],
      };
      const context = createMockExecutionContext(admin);

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should handle multiple required permissions', () => {
      // Arrange
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        'content:read',
        'content:create',
        'content:delete',
      ]);
      const admin = {
        type: 'ADMIN',
        id: 'admin-123',
        email: 'admin@test.com',
        permissions: ['content:read', 'content:create', 'content:delete', 'audit:read'],
      };
      const context = createMockExecutionContext(admin);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should fail if any required permission is missing', () => {
      // Arrange
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        'content:read',
        'content:create',
        'content:delete',
      ]);
      const admin = {
        type: 'ADMIN',
        id: 'admin-123',
        email: 'admin@test.com',
        permissions: ['content:read', 'content:create'], // Missing content:delete
      };
      const context = createMockExecutionContext(admin);

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});
