import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { AuthenticatedRequest } from './jwt-auth.guard';

/**
 * Permission metadata key
 */
export const PERMISSIONS_KEY = 'permissions';
export const REQUIRE_ANY_KEY = 'require_any';

/**
 * Permission definition
 */
export interface PermissionDefinition {
  resource: string;
  action: string;
  scope?: 'own' | 'any' | 'tenant';
}

/**
 * Permission cache TTL (5 minutes)
 */
const PERMISSION_CACHE_TTL = 5 * 60 * 1000;

/**
 * Permission Guard
 * Validates that the authenticated user has the required permissions
 *
 * Features:
 * - Resource-action based permissions
 * - Scope validation (own, any, tenant)
 * - Caching for performance
 * - Wildcard permission support
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @Optional() @Inject(CACHE_MANAGER) private readonly cacheManager?: Cache,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No permissions required
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // Check if any permission is sufficient (OR) or all required (AND)
    const requireAny =
      this.reflector.getAllAndOverride<boolean>(REQUIRE_ANY_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Get user permissions (from token or cache/database)
    const userPermissions = await this.getUserPermissions(user.sub);

    // Check permissions
    const hasPermission = requireAny
      ? requiredPermissions.some((perm) => this.checkPermission(userPermissions, perm))
      : requiredPermissions.every((perm) => this.checkPermission(userPermissions, perm));

    if (!hasPermission) {
      this.logger.warn(
        `Permission denied for user ${user.sub}: required=${requiredPermissions.join(',')}`,
      );
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  /**
   * Get user permissions from cache or database
   */
  private async getUserPermissions(accountId: string): Promise<string[]> {
    const cacheKey = `permissions:${accountId}`;

    // Check cache first
    if (this.cacheManager) {
      const cached = await this.cacheManager.get<string[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // TODO: Fetch from database when auth module is implemented
    // For now, return empty array (no permissions)
    // This will be populated when operators/roles are implemented
    const permissions: string[] = [];

    // Cache the result
    if (this.cacheManager && permissions.length > 0) {
      await this.cacheManager.set(cacheKey, permissions, PERMISSION_CACHE_TTL);
    }

    return permissions;
  }

  /**
   * Check if user has a specific permission
   * Supports wildcards: "accounts:*" matches "accounts:read", "accounts:write"
   */
  private checkPermission(userPermissions: string[], required: string): boolean {
    // Direct match
    if (userPermissions.includes(required)) {
      return true;
    }

    // Wildcard match
    const [resource, action] = required.split(':');

    // Check for resource wildcard (e.g., "accounts:*")
    if (userPermissions.includes(`${resource}:*`)) {
      return true;
    }

    // Check for global wildcard (e.g., "*:*" or "*")
    if (userPermissions.includes('*:*') || userPermissions.includes('*')) {
      return true;
    }

    // Check for action wildcard (e.g., "*:read")
    if (userPermissions.includes(`*:${action}`)) {
      return true;
    }

    return false;
  }

  /**
   * Invalidate permission cache for a user
   * Call this when permissions change
   */
  async invalidatePermissionCache(accountId: string): Promise<void> {
    if (this.cacheManager) {
      const cacheKey = `permissions:${accountId}`;
      await this.cacheManager.del(cacheKey);
      this.logger.debug(`Permission cache invalidated for ${accountId}`);
    }
  }
}

/**
 * Parse permission string to definition
 */
export function parsePermission(permission: string): PermissionDefinition {
  const parts = permission.split(':');
  return {
    resource: parts[0] || '*',
    action: parts[1] || '*',
    scope: (parts[2] as 'own' | 'any' | 'tenant') || 'any',
  };
}

/**
 * Format permission definition to string
 */
export function formatPermission(def: PermissionDefinition): string {
  if (def.scope && def.scope !== 'any') {
    return `${def.resource}:${def.action}:${def.scope}`;
  }
  return `${def.resource}:${def.action}`;
}
