import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from '../../src/common/guards/permission.guard';
import { CacheService } from '../../src/common/cache/cache.service';
import { IdentityPrismaService } from '../../src/database/identity-prisma.service';

// Type for mocked Prisma service with vi.fn() methods
type MockPrismaAccount = {
  findUnique: Mock;
};

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: Mocked<Reflector>;
  let cacheService: Mocked<CacheService>;
  let prisma: { account: MockPrismaAccount };

  const mockUser = {
    sub: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    permissions: ['accounts:read', 'profiles:read'],
    roles: ['user'],
    accountMode: 'SERVICE',
  };

  const createMockExecutionContext = (user: object | undefined = mockUser): ExecutionContext => {
    const mockRequest = {
      user,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: vi.fn(),
    };

    const mockCacheService = {
      getUserPermissions: vi.fn(),
      setUserPermissions: vi.fn(),
    };

    const mockPrisma = {
      account: {
        findUnique: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: CacheService, useValue: mockCacheService },
        { provide: IdentityPrismaService, useValue: mockPrisma },
      ],
    }).compile();

    guard = module.get<PermissionGuard>(PermissionGuard);
    reflector = module.get(Reflector);
    cacheService = module.get(CacheService);
    prisma = module.get(IdentityPrismaService);
  });

  describe('canActivate', () => {
    it('should allow access when no permissions required', async () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has required permission', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(['accounts:read']) // PERMISSIONS_KEY
        .mockReturnValueOnce(undefined) // ROLES_KEY
        .mockReturnValueOnce(false); // REQUIRE_ANY_KEY

      const context = createMockExecutionContext(mockUser);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user lacks required permission', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(['accounts:write']) // PERMISSIONS_KEY - user doesn't have this
        .mockReturnValueOnce(undefined) // ROLES_KEY
        .mockReturnValueOnce(false); // REQUIRE_ANY_KEY

      const context = createMockExecutionContext(mockUser);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user is not authenticated', async () => {
      // Set up mock to return permissions requiring authentication (for both assertions)
      (reflector.getAllAndOverride as Mock)
        .mockReturnValueOnce(['accounts:read']) // PERMISSIONS_KEY - first call
        .mockReturnValueOnce(undefined) // ROLES_KEY - first call
        .mockReturnValueOnce(false) // REQUIRE_ANY_KEY - first call
        .mockReturnValueOnce(['accounts:read']) // PERMISSIONS_KEY - second call
        .mockReturnValueOnce(undefined) // ROLES_KEY - second call
        .mockReturnValueOnce(false); // REQUIRE_ANY_KEY - second call

      // Create context with no user (explicitly undefined)
      const mockRequest = { user: undefined };
      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('Authentication required');
    });
  });

  describe('AND logic (default)', () => {
    it('should require ALL permissions when requireAny is false', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(['accounts:read', 'profiles:read']) // Both required
        .mockReturnValueOnce(undefined) // ROLES_KEY
        .mockReturnValueOnce(false); // REQUIRE_ANY_KEY

      const context = createMockExecutionContext(mockUser);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny when missing any required permission', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(['accounts:read', 'accounts:delete']) // Missing delete
        .mockReturnValueOnce(undefined) // ROLES_KEY
        .mockReturnValueOnce(false); // REQUIRE_ANY_KEY

      const context = createMockExecutionContext(mockUser);

      await expect(guard.canActivate(context)).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('OR logic (RequireAnyPermission)', () => {
    it('should allow when user has ANY of the required permissions', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(['accounts:read', 'accounts:delete']) // Only need one
        .mockReturnValueOnce(undefined) // ROLES_KEY
        .mockReturnValueOnce(true); // REQUIRE_ANY_KEY

      const context = createMockExecutionContext(mockUser);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny when user has none of the required permissions', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(['accounts:delete', 'profiles:delete'])
        .mockReturnValueOnce(undefined) // ROLES_KEY
        .mockReturnValueOnce(true); // REQUIRE_ANY_KEY

      const context = createMockExecutionContext(mockUser);

      await expect(guard.canActivate(context)).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('wildcard permissions', () => {
    it('should match global wildcard (*)', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(['accounts:delete']) // Required permission
        .mockReturnValueOnce(undefined) // ROLES_KEY
        .mockReturnValueOnce(false); // REQUIRE_ANY_KEY

      const superUser = {
        ...mockUser,
        permissions: ['*'], // Global wildcard
      };
      const context = createMockExecutionContext(superUser);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should match domain wildcard (accounts:*)', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(['accounts:delete']) // Required permission
        .mockReturnValueOnce(undefined) // ROLES_KEY
        .mockReturnValueOnce(false); // REQUIRE_ANY_KEY

      const domainAdmin = {
        ...mockUser,
        permissions: ['accounts:*'],
      };
      const context = createMockExecutionContext(domainAdmin);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should match hierarchical wildcard (accounts:*:own)', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(['accounts:read:own']) // Required permission
        .mockReturnValueOnce(undefined) // ROLES_KEY
        .mockReturnValueOnce(false); // REQUIRE_ANY_KEY

      const scopedUser = {
        ...mockUser,
        permissions: ['accounts:*:own'],
      };
      const context = createMockExecutionContext(scopedUser);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('role-based access', () => {
    it('should allow access with required role', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(undefined) // PERMISSIONS_KEY
        .mockReturnValueOnce(['user']) // ROLES_KEY
        .mockReturnValueOnce(false); // REQUIRE_ANY_KEY

      const context = createMockExecutionContext(mockUser);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access without required role', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(undefined) // PERMISSIONS_KEY
        .mockReturnValueOnce(['admin']) // ROLES_KEY
        .mockReturnValueOnce(false); // REQUIRE_ANY_KEY

      const context = createMockExecutionContext(mockUser);

      await expect(guard.canActivate(context)).rejects.toThrow('Insufficient role');
    });

    it('should allow system_super role to bypass all checks', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(['super:dangerous:permission']) // PERMISSIONS_KEY
        .mockReturnValueOnce(undefined) // ROLES_KEY
        .mockReturnValueOnce(false); // REQUIRE_ANY_KEY

      const superAdmin = {
        ...mockUser,
        roles: ['system_super'],
        permissions: [],
      };
      const context = createMockExecutionContext(superAdmin);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('permission fallback to cache/database', () => {
    it('should fetch permissions from cache when not in JWT', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(['accounts:read'])
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(false);

      const userWithoutPermissions = {
        sub: mockUser.sub,
        email: mockUser.email,
        // No permissions in JWT
      };
      cacheService.getUserPermissions.mockResolvedValue(['accounts:read']);

      const context = createMockExecutionContext(userWithoutPermissions);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(cacheService.getUserPermissions).toHaveBeenCalledWith(mockUser.sub);
    });

    it('should fetch from database when cache miss', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(['accounts:read'])
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(false);

      const userWithoutPermissions = {
        sub: mockUser.sub,
        email: mockUser.email,
      };
      cacheService.getUserPermissions.mockResolvedValue(undefined);
      prisma.account.findUnique.mockResolvedValue({
        id: mockUser.sub,
        status: 'ACTIVE',
      } as never);
      cacheService.setUserPermissions.mockResolvedValue(undefined);

      const context = createMockExecutionContext(userWithoutPermissions);

      // Since we return empty permissions from DB, this should fail
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);

      expect(prisma.account.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.sub },
        select: { id: true, status: true },
      });
    });

    it('should return empty permissions for deleted account', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(['accounts:read'])
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(false);

      const userWithoutPermissions = {
        sub: mockUser.sub,
        email: mockUser.email,
      };
      cacheService.getUserPermissions.mockResolvedValue(undefined);
      prisma.account.findUnique.mockResolvedValue({
        id: mockUser.sub,
        status: 'DELETED',
      } as never);

      const context = createMockExecutionContext(userWithoutPermissions);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should return empty permissions for suspended account', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(['accounts:read'])
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(false);

      const userWithoutPermissions = {
        sub: mockUser.sub,
        email: mockUser.email,
      };
      cacheService.getUserPermissions.mockResolvedValue(undefined);
      prisma.account.findUnique.mockResolvedValue({
        id: mockUser.sub,
        status: 'SUSPENDED',
      } as never);

      const context = createMockExecutionContext(userWithoutPermissions);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('combined role and permission checks', () => {
    it('should require both role AND permissions when both specified', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(['accounts:read']) // PERMISSIONS_KEY
        .mockReturnValueOnce(['user']) // ROLES_KEY
        .mockReturnValueOnce(false); // REQUIRE_ANY_KEY

      const context = createMockExecutionContext(mockUser);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should fail if role matches but permission does not', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(['accounts:delete']) // PERMISSIONS_KEY
        .mockReturnValueOnce(['user']) // ROLES_KEY
        .mockReturnValueOnce(false); // REQUIRE_ANY_KEY

      const context = createMockExecutionContext(mockUser);

      await expect(guard.canActivate(context)).rejects.toThrow('Insufficient permissions');
    });

    it('should fail if permission matches but role does not', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(['accounts:read']) // PERMISSIONS_KEY
        .mockReturnValueOnce(['admin']) // ROLES_KEY
        .mockReturnValueOnce(false); // REQUIRE_ANY_KEY

      const context = createMockExecutionContext(mockUser);

      await expect(guard.canActivate(context)).rejects.toThrow('Insufficient role');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(['accounts:read'])
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(false);

      const userWithoutPermissions = {
        sub: mockUser.sub,
        email: mockUser.email,
      };
      cacheService.getUserPermissions.mockResolvedValue(undefined);
      prisma.account.findUnique.mockRejectedValue(new Error('Database error'));

      const context = createMockExecutionContext(userWithoutPermissions);

      // Should continue with empty permissions (and fail permission check)
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });
});
