import { Injectable, Logger } from '@nestjs/common';
import { maskIpAddress, maskUuid } from '@my-girok/nest-common';
import { AuditService } from '../services/audit.service';

/**
 * Permission check result.
 */
export type PermissionCheckResult = 'GRANTED' | 'DENIED';

/**
 * Permission audit log entry.
 */
export interface PermissionAuditEntry {
  /** Operator/Admin/User ID performing the action */
  operatorId: string;
  /** Email of the operator (optional) */
  operatorEmail?: string;
  /** Client IP address */
  ipAddress: string;
  /** The resource being accessed (e.g., 'users', 'roles') */
  resource: string;
  /** The action being performed (e.g., 'read', 'create', 'update') */
  action: string;
  /** Required permissions for the action */
  requiredPermissions: string[];
  /** Permissions the operator has */
  operatorPermissions: string[];
  /** Result of the permission check */
  result: PermissionCheckResult;
  /** Optional resource ID being accessed */
  resourceId?: string;
  /** HTTP method (GET, POST, etc.) */
  method?: string;
  /** Request path */
  path?: string;
  /** User agent string */
  userAgent?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * PermissionAuditService handles audit logging for permission checks.
 *
 * This service:
 * - Masks PII (operatorId, ipAddress) in logs
 * - Logs DENIED checks as warnings
 * - Logs GRANTED checks as debug
 * - Integrates with the main AuditService for persistence
 *
 * @example
 * ```typescript
 * await permissionAuditService.logPermissionCheck({
 *   operatorId: admin.id,
 *   operatorEmail: admin.email,
 *   ipAddress: request.ip,
 *   resource: 'users',
 *   action: 'update',
 *   requiredPermissions: ['user:update'],
 *   operatorPermissions: admin.permissions,
 *   result: 'GRANTED',
 * });
 * ```
 */
@Injectable()
export class PermissionAuditService {
  private readonly logger = new Logger(PermissionAuditService.name);

  constructor(private readonly auditService: AuditService) {}

  /**
   * Log a permission check attempt.
   *
   * @param entry - The permission audit entry
   */
  async logPermissionCheck(entry: PermissionAuditEntry): Promise<void> {
    // Mask PII for logging
    const maskedOperatorId = maskUuid(entry.operatorId);
    const maskedIpAddress = maskIpAddress(entry.ipAddress);

    const logContext = {
      operatorId: maskedOperatorId,
      operatorEmail: entry.operatorEmail,
      ipAddress: maskedIpAddress,
      resource: entry.resource,
      action: entry.action,
      requiredPermissions: entry.requiredPermissions,
      result: entry.result,
      resourceId: entry.resourceId,
      method: entry.method,
      path: entry.path,
    };

    // Log based on result
    if (entry.result === 'DENIED') {
      this.logger.warn({
        message: 'Permission check DENIED',
        ...logContext,
        operatorPermissions: entry.operatorPermissions,
      });
    } else {
      this.logger.debug({
        message: 'Permission check GRANTED',
        ...logContext,
      });
    }

    // Persist to audit log
    await this.auditService.log({
      actorType: 'ADMIN', // Permission checks are typically admin/operator actions
      actorId: entry.operatorId,
      actorEmail: entry.operatorEmail,
      resource: entry.resource,
      action: entry.action,
      targetId: entry.resourceId,
      method: entry.method,
      path: entry.path,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      success: entry.result === 'GRANTED',
      metadata: {
        requiredPermissions: entry.requiredPermissions,
        operatorPermissions: entry.operatorPermissions,
        result: entry.result,
        ...entry.metadata,
      },
    });
  }

  /**
   * Log a successful permission check (convenience method).
   */
  async logGranted(
    operatorId: string,
    ipAddress: string,
    resource: string,
    action: string,
    options: Partial<
      Omit<PermissionAuditEntry, 'operatorId' | 'ipAddress' | 'resource' | 'action' | 'result'>
    > = {},
  ): Promise<void> {
    await this.logPermissionCheck({
      operatorId,
      ipAddress,
      resource,
      action,
      result: 'GRANTED',
      requiredPermissions: options.requiredPermissions ?? [],
      operatorPermissions: options.operatorPermissions ?? [],
      ...options,
    });
  }

  /**
   * Log a denied permission check (convenience method).
   */
  async logDenied(
    operatorId: string,
    ipAddress: string,
    resource: string,
    action: string,
    options: Partial<
      Omit<PermissionAuditEntry, 'operatorId' | 'ipAddress' | 'resource' | 'action' | 'result'>
    > = {},
  ): Promise<void> {
    await this.logPermissionCheck({
      operatorId,
      ipAddress,
      resource,
      action,
      result: 'DENIED',
      requiredPermissions: options.requiredPermissions ?? [],
      operatorPermissions: options.operatorPermissions ?? [],
      ...options,
    });
  }
}
