import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, ROLE_LEVEL_KEY } from '../decorators/require-role.decorator';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * User context interface for RBAC checks
 * Expected to be attached to request by JwtAuthGuard
 */
export interface RbacUser {
  /** User's unique identifier */
  id: string;
  /** Array of role names assigned to user */
  roles?: string[];
  /** User's computed role level (for hierarchical checks) */
  roleLevel?: number;
  /** Array of permission strings in "resource:action" format */
  permissions?: string[];
}

/**
 * Options for RbacGuard behavior
 */
export interface RbacGuardOptions {
  /** If true, user must have ALL specified roles (default: false = ANY role) */
  requireAllRoles?: boolean;
  /** If true, user must have ALL specified permissions (default: false = ANY permission) */
  requireAllPermissions?: boolean;
  /** Custom user property name on request (default: 'user') */
  userProperty?: string;
}

/**
 * RBAC Guard - Role-Based Access Control
 *
 * Comprehensive guard that checks:
 * 1. Roles: User must have one of the required roles (via @RequireRole)
 * 2. Role Level: User's role level must meet minimum (via @RequireRoleLevel)
 * 3. Permissions: User must have required permissions (via @RequirePermission)
 *
 * Supports wildcard permission matching:
 * - '*' grants all permissions
 * - 'users:*' grants all user-related permissions
 * - 'users:read' grants specific permission
 *
 * @example
 * ```typescript
 * // In app.module.ts or controller
 * @UseGuards(JwtAuthGuard, RbacGuard)
 * @Controller('admin')
 * export class AdminController {
 *   @RequireRole('ADMIN')
 *   @Get('users')
 *   listUsers() { ... }
 *
 *   @RequireRoleLevel(100)
 *   @RequirePermission('settings:manage')
 *   @Post('settings')
 *   updateSettings() { ... }
 * }
 * ```
 */
@Injectable()
export class RbacGuard implements CanActivate {
  private readonly logger = new Logger(RbacGuard.name);
  private readonly options: Required<RbacGuardOptions>;

  constructor(
    private readonly reflector: Reflector,
    options?: RbacGuardOptions,
  ) {
    this.options = {
      requireAllRoles: options?.requireAllRoles ?? false,
      requireAllPermissions: options?.requireAllPermissions ?? false,
      userProperty: options?.userProperty ?? 'user',
    };
  }

  canActivate(context: ExecutionContext): boolean {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Get required roles, level, and permissions from decorators
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredRoleLevel = this.reflector.getAllAndOverride<number>(ROLE_LEVEL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no RBAC requirements, allow access
    if (!requiredRoles && requiredRoleLevel === undefined && !requiredPermissions) {
      return true;
    }

    // Get user from request
    const request = context.switchToHttp().getRequest();
    const user: RbacUser | undefined = request[this.options.userProperty];

    if (!user) {
      this.logger.warn('RBAC check failed: No user found on request');
      throw new ForbiddenException('Access denied: User not authenticated');
    }

    // Check roles
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRoleAccess = this.checkRoles(user.roles, requiredRoles);
      if (!hasRoleAccess) {
        this.logger.warn(
          `RBAC role check failed for user ${user.id}: required=${requiredRoles.join(',')} user=${user.roles?.join(',') || 'none'}`,
        );
        throw new ForbiddenException('Access denied: Insufficient role');
      }
    }

    // Check role level
    if (requiredRoleLevel !== undefined) {
      const hasLevelAccess = this.checkRoleLevel(user.roleLevel, requiredRoleLevel);
      if (!hasLevelAccess) {
        this.logger.warn(
          `RBAC level check failed for user ${user.id}: required=${requiredRoleLevel} user=${user.roleLevel || 0}`,
        );
        throw new ForbiddenException('Access denied: Insufficient role level');
      }
    }

    // Check permissions
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasPermissionAccess = this.checkPermissions(user.permissions, requiredPermissions);
      if (!hasPermissionAccess) {
        this.logger.warn(
          `RBAC permission check failed for user ${user.id}: required=${requiredPermissions.join(',')} user=${user.permissions?.join(',') || 'none'}`,
        );
        throw new ForbiddenException('Access denied: Insufficient permissions');
      }
    }

    return true;
  }

  /**
   * Check if user has required roles
   */
  private checkRoles(userRoles: string[] | undefined, requiredRoles: string[]): boolean {
    if (!userRoles || userRoles.length === 0) {
      return false;
    }

    if (this.options.requireAllRoles) {
      // User must have ALL required roles
      return requiredRoles.every((role) => userRoles.includes(role));
    }

    // User must have ANY of the required roles
    return requiredRoles.some((role) => userRoles.includes(role));
  }

  /**
   * Check if user's role level meets minimum requirement
   */
  private checkRoleLevel(userLevel: number | undefined, requiredLevel: number): boolean {
    if (userLevel === undefined) {
      return false;
    }
    return userLevel >= requiredLevel;
  }

  /**
   * Check if user has required permissions
   * Supports wildcard matching
   */
  private checkPermissions(
    userPermissions: string[] | undefined,
    requiredPermissions: string[],
  ): boolean {
    if (!userPermissions || userPermissions.length === 0) {
      return false;
    }

    if (this.options.requireAllPermissions) {
      // User must have ALL required permissions
      return requiredPermissions.every((required) => this.hasPermission(userPermissions, required));
    }

    // User must have ANY of the required permissions
    return requiredPermissions.some((required) => this.hasPermission(userPermissions, required));
  }

  /**
   * Check if user has a specific permission
   * Supports wildcard matching:
   * - '*' matches everything
   * - 'resource:*' matches all actions on resource
   * - 'resource:action' matches exact permission
   */
  private hasPermission(userPermissions: string[], required: string): boolean {
    for (const userPerm of userPermissions) {
      if (this.matchPermission(userPerm, required)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Match a user permission against a required permission
   * Both can contain wildcards
   */
  private matchPermission(userPerm: string, required: string): boolean {
    // Universal wildcard
    if (userPerm === '*') {
      return true;
    }

    // Exact match
    if (userPerm === required) {
      return true;
    }

    // User has resource wildcard (e.g., 'users:*')
    if (userPerm.endsWith(':*')) {
      const userResource = userPerm.slice(0, -2);
      const requiredParts = required.split(':');
      if (requiredParts.length >= 1 && requiredParts[0] === userResource) {
        return true;
      }
    }

    // Required has resource wildcard (e.g., route requires 'users:*')
    if (required.endsWith(':*')) {
      const requiredResource = required.slice(0, -2);
      const userParts = userPerm.split(':');
      if (userParts.length >= 1 && userParts[0] === requiredResource) {
        return true;
      }
    }

    return false;
  }
}

/**
 * Factory function to create RbacGuard with custom options
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard, createRbacGuard({ requireAllRoles: true }))
 * @RequireRole('ADMIN', 'VERIFIED')
 * @Get('sensitive')
 * getSensitiveData() { ... }
 * ```
 */
export function createRbacGuard(
  options: RbacGuardOptions,
): new (reflector: Reflector) => RbacGuard {
  @Injectable()
  class ConfiguredRbacGuard extends RbacGuard {
    constructor(reflector: Reflector) {
      super(reflector, options);
    }
  }
  return ConfiguredRbacGuard;
}
