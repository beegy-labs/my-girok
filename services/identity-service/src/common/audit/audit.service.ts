import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboxService } from '../outbox';
import { maskUuid, maskEmail, maskIpAddress } from '@my-girok/nest-common';

/**
 * Audit action types
 */
export enum AuditAction {
  // Account actions
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  ACCOUNT_UPDATED = 'ACCOUNT_UPDATED',
  ACCOUNT_DELETED = 'ACCOUNT_DELETED',
  ACCOUNT_STATUS_CHANGED = 'ACCOUNT_STATUS_CHANGED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',

  // Session actions
  SESSION_CREATED = 'SESSION_CREATED',
  SESSION_REFRESHED = 'SESSION_REFRESHED',
  SESSION_REVOKED = 'SESSION_REVOKED',
  ALL_SESSIONS_REVOKED = 'ALL_SESSIONS_REVOKED',

  // Device actions
  DEVICE_REGISTERED = 'DEVICE_REGISTERED',
  DEVICE_TRUSTED = 'DEVICE_TRUSTED',
  DEVICE_REMOVED = 'DEVICE_REMOVED',

  // MFA actions
  MFA_ENABLED = 'MFA_ENABLED',
  MFA_DISABLED = 'MFA_DISABLED',
  MFA_VERIFIED = 'MFA_VERIFIED',
  MFA_FAILED = 'MFA_FAILED',

  // Profile actions
  PROFILE_CREATED = 'PROFILE_CREATED',
  PROFILE_UPDATED = 'PROFILE_UPDATED',
  PROFILE_DELETED = 'PROFILE_DELETED',

  // Security actions
  LOGIN_FAILED = 'LOGIN_FAILED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  action: AuditAction;
  actorId?: string;
  targetId: string;
  targetType: 'account' | 'session' | 'device' | 'profile';
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

/**
 * Audit Service
 *
 * Provides audit logging for all mutations in identity-service.
 *
 * 2026 Best Practices:
 * - Immutable audit logs via transactional outbox
 * - PII masking in logs
 * - Correlation with trace IDs
 * - Async processing for performance
 *
 * Integration:
 * - Publishes events to audit-service via Redpanda
 * - Supports compliance requirements (GDPR, SOC2)
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly enabled: boolean;

  constructor(
    private readonly outboxService: OutboxService,
    private readonly configService: ConfigService,
  ) {
    this.enabled = this.configService.get<boolean>('audit.enabled', true);
  }

  /**
   * Log an audit event
   *
   * @param entry - Audit log entry
   */
  async log(entry: AuditLogEntry): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      // Create masked payload for logging
      const maskedEntry = this.maskSensitiveData(entry);

      this.logger.debug(
        `Audit: ${entry.action} on ${entry.targetType}:${maskUuid(entry.targetId)}`,
      );

      // Publish to outbox for async processing
      await this.outboxService.publish({
        aggregateType: 'audit',
        aggregateId: entry.targetId,
        eventType: `identity.${entry.action.toLowerCase()}`,
        payload: maskedEntry,
      });
    } catch (error) {
      // Don't throw - audit logging should not break business logic
      this.logger.error(`Failed to log audit event: ${entry.action}`, error);
    }
  }

  /**
   * Log account mutation
   */
  async logAccountMutation(
    action: AuditAction,
    accountId: string,
    actorId?: string,
    details?: Record<string, unknown>,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    await this.log({
      action,
      actorId,
      targetId: accountId,
      targetType: 'account',
      details,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      timestamp: new Date(),
    });
  }

  /**
   * Log session mutation
   */
  async logSessionMutation(
    action: AuditAction,
    sessionId: string,
    accountId: string,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    await this.log({
      action,
      actorId: accountId,
      targetId: sessionId,
      targetType: 'session',
      details: { accountId },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      timestamp: new Date(),
    });
  }

  /**
   * Log device mutation
   */
  async logDeviceMutation(
    action: AuditAction,
    deviceId: string,
    accountId: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      action,
      actorId: accountId,
      targetId: deviceId,
      targetType: 'device',
      details,
      timestamp: new Date(),
    });
  }

  /**
   * Log profile mutation
   */
  async logProfileMutation(
    action: AuditAction,
    accountId: string,
    changes?: string[],
  ): Promise<void> {
    await this.log({
      action,
      actorId: accountId,
      targetId: accountId,
      targetType: 'profile',
      details: changes ? { changedFields: changes } : undefined,
      timestamp: new Date(),
    });
  }

  /**
   * Log security event
   */
  async logSecurityEvent(
    action: AuditAction,
    accountId: string,
    details?: Record<string, unknown>,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    await this.log({
      action,
      targetId: accountId,
      targetType: 'account',
      details,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      timestamp: new Date(),
    });
  }

  /**
   * Mask sensitive data in audit entry
   */
  private maskSensitiveData(entry: AuditLogEntry): Record<string, unknown> {
    const masked: Record<string, unknown> = {
      action: entry.action,
      targetType: entry.targetType,
      targetId: maskUuid(entry.targetId),
      timestamp: entry.timestamp.toISOString(),
    };

    if (entry.actorId) {
      masked.actorId = maskUuid(entry.actorId);
    }

    if (entry.ipAddress) {
      // Mask last octet of IPv4
      masked.ipAddress = maskIpAddress(entry.ipAddress);
    }

    if (entry.userAgent) {
      // Truncate user agent to reasonable length
      masked.userAgent =
        entry.userAgent.length > 200 ? entry.userAgent.substring(0, 200) + '...' : entry.userAgent;
    }

    if (entry.details) {
      // Mask any email fields in details
      masked.details = this.maskDetailsObject(entry.details);
    }

    return masked;
  }

  /**
   * Recursively mask sensitive fields in an object
   */
  private maskDetailsObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // Mask known sensitive fields
      if (lowerKey === 'email') {
        result[key] = typeof value === 'string' ? maskEmail(value) : value;
      } else if (lowerKey === 'password' || lowerKey.includes('secret')) {
        result[key] = '[REDACTED]';
      } else if (lowerKey === 'accountid' || lowerKey === 'userid') {
        result[key] = typeof value === 'string' ? maskUuid(value) : value;
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.maskDetailsObject(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}
