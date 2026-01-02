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
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Audit log entry interface for permission checks
 */
export interface PermissionAuditLog {
  /** Timestamp of the audit event */
  timestamp: Date;
  /** User ID performing the action */
  userId: string;
  /** HTTP method */
  method: string;
  /** Request path */
  path: string;
  /** Required permissions */
  requiredPermissions: string[];
  /** User's permissions */
  userPermissions: string[];
  /** Whether access was granted */
  granted: boolean;
  /** Denial reason if not granted */
  reason?: string;
  /** Request IP address */
  ipAddress?: string;
  /** Request user agent */
  userAgent?: string;
}

/**
 * Audit logger interface for permission checks
 * Implement this interface to provide custom audit logging
 */
export interface IPermissionAuditLogger {
  /**
   * Log a permission audit event
   */
  log(entry: PermissionAuditLog): void | Promise<void>;
}

/**
 * Injection token for permission audit logger
 */
export const PERMISSION_AUDIT_LOGGER = 'PERMISSION_AUDIT_LOGGER';

/**
 * User interface for permission checks
 */
export interface PermissionUser {
  /** User's unique identifier */
  id: string;
  /** Array of permission strings in "resource:action" format */
  permissions?: string[];
}

/**
 * Permission Guard - Fine-grained Permission-Based Access Control
 *
 * Lightweight guard focused specifically on permission checks.
 * Supports:
 * - Wildcard permission matching
 * - Optional audit logging
 * - Flexible permission format (resource:action)
 *
 * For combined role + permission + level checks, use RbacGuard instead.
 *
 * @example
 * ```typescript
 * // Basic usage
 * @UseGuards(JwtAuthGuard, PermissionGuard)
 * @RequirePermission('users:read')
 * @Get('users')
 * listUsers() { ... }
 *
 * // With audit logging
 * @Module({
 *   providers: [
 *     {
 *       provide: PERMISSION_AUDIT_LOGGER,
 *       useClass: MyAuditLogger,
 *     },
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @Optional()
    @Inject(PERMISSION_AUDIT_LOGGER)
    private readonly auditLogger?: IPermissionAuditLogger,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // Get request and user
    const request = context.switchToHttp().getRequest();
    const user: PermissionUser | undefined = request.user;

    if (!user) {
      await this.logAudit(request, null, requiredPermissions, false, 'User not authenticated');
      throw new ForbiddenException('Access denied: User not authenticated');
    }

    const userPermissions = user.permissions || [];
    const hasPermission = this.checkPermissions(userPermissions, requiredPermissions);

    // Audit logging
    await this.logAudit(
      request,
      user,
      requiredPermissions,
      hasPermission,
      hasPermission ? undefined : 'Insufficient permissions',
    );

    if (!hasPermission) {
      this.logger.warn(
        `Permission check failed for user ${user.id}: required=${requiredPermissions.join(',')} user=${userPermissions.join(',') || 'none'}`,
      );
      throw new ForbiddenException('Access denied: Insufficient permissions');
    }

    return true;
  }

  /**
   * Check if user has any of the required permissions
   */
  private checkPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.some((required) => this.hasPermission(userPermissions, required));
  }

  /**
   * Check if user has a specific permission with wildcard support
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
   * Supports wildcards:
   * - '*' matches everything
   * - 'resource:*' matches all actions on resource
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

  /**
   * Log permission check to audit logger if configured
   */
  private async logAudit(
    request: any,
    user: PermissionUser | null,
    requiredPermissions: string[],
    granted: boolean,
    reason?: string,
  ): Promise<void> {
    if (!this.auditLogger) {
      return;
    }

    try {
      const entry: PermissionAuditLog = {
        timestamp: new Date(),
        userId: user?.id || 'anonymous',
        method: request.method,
        path: request.url || request.path,
        requiredPermissions,
        userPermissions: user?.permissions || [],
        granted,
        reason,
        ipAddress: this.getClientIp(request),
        userAgent: request.headers?.['user-agent'],
      };

      await this.auditLogger.log(entry);
    } catch (error) {
      this.logger.error('Failed to write permission audit log', error);
    }
  }

  /**
   * Extract client IP address from request
   */
  private getClientIp(request: any): string | undefined {
    return (
      request.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers?.['x-real-ip'] ||
      request.ip ||
      request.connection?.remoteAddress
    );
  }
}
