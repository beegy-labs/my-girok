import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CacheService } from '../cache';
import { IdentityPrismaService } from '../../database/identity-prisma.service';

export const PERMISSIONS_KEY = 'permissions';
export const REQUIRE_ANY_KEY = 'requireAny';

/**
 * Permission decorator - require ALL specified permissions
 */
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * RequireAnyPermission decorator - require ANY of the specified permissions
 */
export const RequireAnyPermission = (...permissions: string[]) => {
  return (target: object, key?: string | symbol, descriptor?: PropertyDescriptor) => {
    SetMetadata(PERMISSIONS_KEY, permissions)(target, key!, descriptor!);
    SetMetadata(REQUIRE_ANY_KEY, true)(target, key!, descriptor!);
  };
};

/**
 * Permission Guard
 *
 * Validates user permissions against required permissions.
 * Supports:
 * - AND logic (all permissions required) - default
 * - OR logic (any permission sufficient) - with @RequireAnyPermission
 * - Wildcard permissions (e.g., 'accounts:*')
 * - Resource-action-scope pattern (e.g., 'accounts:read:own')
 *
 * Cache:
 * - Permissions are cached for 5 minutes per account
 * - Cache is invalidated when permissions change
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly cacheService: CacheService,
    private readonly prisma: IdentityPrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No permissions required - allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // Check if ANY permission is sufficient (OR logic)
    const requireAny = this.reflector.getAllAndOverride<boolean>(REQUIRE_ANY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Get user from request
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as unknown as { user?: { sub?: string; permissions?: string[] } }).user;

    if (!user?.sub) {
      throw new ForbiddenException('Authentication required');
    }

    // Get user permissions (from cache or database)
    const userPermissions = await this.getUserPermissions(user.sub);

    // Check for superadmin wildcard
    if (userPermissions.includes('*')) {
      return true;
    }

    // Validate permissions
    if (requireAny) {
      // OR logic: any permission is sufficient
      const hasAny = requiredPermissions.some((required) =>
        this.matchesPermission(userPermissions, required),
      );

      if (!hasAny) {
        this.logger.warn(
          `Access denied for user ${user.sub}: requires any of [${requiredPermissions.join(', ')}]`,
        );
        throw new ForbiddenException('Insufficient permissions');
      }
    } else {
      // AND logic: all permissions required
      for (const required of requiredPermissions) {
        if (!this.matchesPermission(userPermissions, required)) {
          this.logger.warn(`Access denied for user ${user.sub}: missing permission '${required}'`);
          throw new ForbiddenException('Insufficient permissions');
        }
      }
    }

    return true;
  }

  /**
   * Get user permissions from cache or database
   */
  private async getUserPermissions(accountId: string): Promise<string[]> {
    // Try cache first
    const cached = await this.cacheService.getUserPermissions(accountId);
    if (cached) {
      return cached;
    }

    // Query database for permissions
    // This queries through account -> roles -> permissions
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: accountId },
        select: {
          id: true,
          status: true,
        },
      });

      if (!account || account.status === 'DELETED' || account.status === 'SUSPENDED') {
        return [];
      }

      // For now, return empty array since RBAC is in auth-service
      // In the future, this could query auth-service via gRPC
      // or store permissions locally
      const permissions: string[] = [];

      // Cache the result
      await this.cacheService.setUserPermissions(accountId, permissions);

      return permissions;
    } catch (error) {
      this.logger.error(`Failed to get permissions for account ${accountId}: ${error}`);
      return [];
    }
  }

  /**
   * Check if user permissions match a required permission
   * Supports wildcards (e.g., 'accounts:*' matches 'accounts:read')
   */
  private matchesPermission(userPermissions: string[], required: string): boolean {
    for (const userPerm of userPermissions) {
      // Exact match
      if (userPerm === required) {
        return true;
      }

      // Wildcard match (e.g., 'accounts:*' matches 'accounts:read')
      if (userPerm.endsWith(':*')) {
        const prefix = userPerm.slice(0, -1); // Remove '*'
        if (required.startsWith(prefix)) {
          return true;
        }
      }

      // Global wildcard
      if (userPerm === '*') {
        return true;
      }
    }

    return false;
  }
}
