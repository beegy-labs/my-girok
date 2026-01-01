import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
  Logger,
  applyDecorators,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CacheService } from '../cache';
import { IdentityPrismaService } from '../../database/identity-prisma.service';
import { maskUuid } from '../utils/masking.util';

export const PERMISSIONS_KEY = 'permissions';
export const REQUIRE_ANY_KEY = 'requireAny';
export const ROLES_KEY = 'roles';

/**
 * Permission decorator - require ALL specified permissions
 */
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * RequireAnyPermission decorator - require ANY of the specified permissions
 */
export const RequireAnyPermission = (...permissions: string[]) => {
  return applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    SetMetadata(REQUIRE_ANY_KEY, true),
  );
};

/**
 * Roles decorator - require specific roles
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * JWT user payload expected structure
 */
interface JwtUser {
  sub: string;
  permissions?: string[];
  roles?: string[];
  accountMode?: string;
}

/**
 * Permission Guard
 *
 * Validates user permissions against required permissions.
 *
 * 2026 Best Practices:
 * - Reads permissions from JWT payload (set by auth-service)
 * - Falls back to cache/database lookup if JWT doesn't contain permissions
 * - Supports hierarchical permission matching
 *
 * Supports:
 * - AND logic (all permissions required) - default
 * - OR logic (any permission sufficient) - with @RequireAnyPermission
 * - Wildcard permissions (e.g., 'accounts:*')
 * - Resource-action-scope pattern (e.g., 'accounts:read:own')
 * - Role-based access control with @Roles decorator
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

    // Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No permissions or roles required - allow access
    if (
      (!requiredPermissions || requiredPermissions.length === 0) &&
      (!requiredRoles || requiredRoles.length === 0)
    ) {
      return true;
    }

    // Check if ANY permission is sufficient (OR logic)
    const requireAny = this.reflector.getAllAndOverride<boolean>(REQUIRE_ANY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Get user from request
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as unknown as { user?: JwtUser }).user;

    if (!user?.sub) {
      throw new ForbiddenException('Authentication required');
    }

    // Get user permissions (from JWT, cache, or database)
    const userPermissions = await this.getUserPermissions(user);
    const userRoles = user.roles || [];

    // Check for superadmin wildcard
    if (userPermissions.includes('*') || userRoles.includes('system_super')) {
      return true;
    }

    // Check role requirements first (if any)
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRequiredRole = requiredRoles.some((role) => userRoles.includes(role));
      if (!hasRequiredRole) {
        this.logger.warn(
          `Access denied for user ${maskUuid(user.sub)}: requires role [${requiredRoles.join(', ')}]`,
        );
        throw new ForbiddenException('Insufficient role');
      }
    }

    // Check permission requirements (if any)
    if (requiredPermissions && requiredPermissions.length > 0) {
      if (requireAny) {
        // OR logic: any permission is sufficient
        const hasAny = requiredPermissions.some((required) =>
          this.matchesPermission(userPermissions, required),
        );

        if (!hasAny) {
          this.logger.warn(
            `Access denied for user ${maskUuid(user.sub)}: requires any of [${requiredPermissions.join(', ')}]`,
          );
          throw new ForbiddenException('Insufficient permissions');
        }
      } else {
        // AND logic: all permissions required
        for (const required of requiredPermissions) {
          if (!this.matchesPermission(userPermissions, required)) {
            this.logger.warn(
              `Access denied for user ${maskUuid(user.sub)}: missing permission '${required}'`,
            );
            throw new ForbiddenException('Insufficient permissions');
          }
        }
      }
    }

    return true;
  }

  /**
   * Get user permissions from JWT, cache, or database
   *
   * Priority:
   * 1. JWT payload (permissions set by auth-service)
   * 2. Cache (if JWT doesn't contain permissions)
   * 3. Database (if cache miss)
   */
  private async getUserPermissions(user: JwtUser): Promise<string[]> {
    // First, check if permissions are in JWT payload (recommended approach)
    if (user.permissions && user.permissions.length > 0) {
      return user.permissions;
    }

    // Try cache
    const cached = await this.cacheService.getUserPermissions(user.sub);
    if (cached && cached.length > 0) {
      return cached;
    }

    // Query database - check if account is valid
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: user.sub },
        select: {
          id: true,
          status: true,
        },
      });

      if (!account || account.status === 'DELETED' || account.status === 'SUSPENDED') {
        this.logger.warn(`Account ${maskUuid(user.sub)} is not active or doesn't exist`);
        return [];
      }

      // For now, we rely on JWT containing permissions from auth-service
      // This is a fallback that returns empty permissions if JWT didn't include them
      // In production, auth-service should always include permissions in JWT
      const permissions: string[] = [];

      // Cache the result (even if empty, to prevent repeated DB queries)
      await this.cacheService.setUserPermissions(user.sub, permissions);

      return permissions;
    } catch (error) {
      this.logger.error(`Failed to get permissions for account ${maskUuid(user.sub)}: ${error}`);
      return [];
    }
  }

  /**
   * Check if user permissions match a required permission
   *
   * Supports:
   * - Exact match (e.g., 'accounts:read' matches 'accounts:read')
   * - Wildcard match (e.g., 'accounts:*' matches 'accounts:read')
   * - Hierarchical match (e.g., 'accounts:*:own' matches 'accounts:read:own')
   * - Global wildcard (e.g., '*' matches everything)
   */
  private matchesPermission(userPermissions: string[], required: string): boolean {
    for (const userPerm of userPermissions) {
      // Exact match
      if (userPerm === required) {
        return true;
      }

      // Global wildcard
      if (userPerm === '*') {
        return true;
      }

      // Wildcard match at any level
      if (userPerm.includes('*')) {
        const userParts = userPerm.split(':');
        const requiredParts = required.split(':');

        // Check each segment
        let matches = true;
        for (let i = 0; i < Math.max(userParts.length, requiredParts.length); i++) {
          const userPart = userParts[i];
          const requiredPart = requiredParts[i];

          // If user has wildcard at this position, it matches
          if (userPart === '*') {
            continue;
          }

          // If parts don't match, no match
          if (userPart !== requiredPart) {
            matches = false;
            break;
          }
        }

        if (matches) {
          return true;
        }
      }
    }

    return false;
  }
}
