import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionAuditService } from './permission-audit.service';
import { PERMISSIONS_KEY } from '../../admin/decorators/permissions.decorator';

/**
 * Metadata key for audit permission options.
 */
export const AUDIT_PERMISSION_KEY = 'audit_permission';

/**
 * Options for the AuditPermission decorator.
 */
export interface AuditPermissionOptions {
  /** The resource being accessed (e.g., 'user', 'role', 'permission') */
  resource: string;
  /** The action being performed (e.g., 'read', 'create', 'update', 'delete') */
  action: string;
  /** Whether to log successful permission checks (default: true) */
  logSuccess?: boolean;
  /** Whether to log failed permission checks (default: true) */
  logFailure?: boolean;
  /** Additional metadata to include in audit logs */
  metadata?: Record<string, unknown>;
}

/**
 * PermissionAuditGuard logs all permission check attempts.
 *
 * This guard works in conjunction with existing permission guards
 * to provide audit logging for authorization decisions.
 *
 * Features:
 * - Logs both successful and failed permission checks
 * - Captures user context, required permissions, and resource info
 * - Uses PermissionAuditService for PII masking and structured logging
 * - Supports configurable logging via @AuditPermission decorator
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard, PermissionsGuard, PermissionAuditGuard)
 * @RequirePermissions(Permission.USERS_READ)
 * @AuditPermission({ resource: 'users', action: 'list' })
 * @Get()
 * async findAll() {
 *   return this.usersService.findAll();
 * }
 * ```
 */
@Injectable()
export class PermissionAuditGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionAuditService: PermissionAuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const handler = context.getHandler();
    const controller = context.getClass();

    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      handler,
      controller,
    ]);

    // Get audit options from decorator
    const auditOptions = this.reflector.getAllAndOverride<AuditPermissionOptions>(
      AUDIT_PERMISSION_KEY,
      [handler, controller],
    );

    const resource =
      auditOptions?.resource ?? controller.name.replace('Controller', '').toLowerCase();
    const action = auditOptions?.action ?? handler.name;
    const logSuccess = auditOptions?.logSuccess ?? true;
    const logFailure = auditOptions?.logFailure ?? true;

    // Check if user has required permissions
    const userPermissions = user?.permissions ?? [];
    const hasPermission =
      !requiredPermissions ||
      requiredPermissions.length === 0 ||
      requiredPermissions.every((perm: string) => userPermissions.includes(perm));

    const operatorId = user?.id ?? user?.sub ?? 'anonymous';
    const ipAddress = this.getClientIp(request);

    // Use PermissionAuditService for logging with PII masking
    if (hasPermission && logSuccess) {
      await this.permissionAuditService.logPermissionCheck({
        operatorId,
        operatorEmail: user?.email,
        ipAddress,
        resource,
        action,
        requiredPermissions: requiredPermissions ?? [],
        operatorPermissions: userPermissions,
        result: 'GRANTED',
        resourceId: request.params?.id,
        method: request.method,
        path: request.url,
        userAgent: request.headers?.['user-agent'],
        metadata: auditOptions?.metadata,
      });
    } else if (!hasPermission && logFailure) {
      await this.permissionAuditService.logPermissionCheck({
        operatorId,
        operatorEmail: user?.email,
        ipAddress,
        resource,
        action,
        requiredPermissions: requiredPermissions ?? [],
        operatorPermissions: userPermissions,
        result: 'DENIED',
        resourceId: request.params?.id,
        method: request.method,
        path: request.url,
        userAgent: request.headers?.['user-agent'],
        metadata: auditOptions?.metadata,
      });
    }

    // This guard only logs; it doesn't block access
    // The actual permission enforcement is done by PermissionsGuard
    return true;
  }

  private getClientIp(request: any): string {
    return (
      request.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ??
      request.headers?.['x-real-ip'] ??
      request.ip ??
      request.connection?.remoteAddress ??
      'unknown'
    );
  }
}
