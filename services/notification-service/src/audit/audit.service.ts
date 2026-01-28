import { Injectable, Logger } from '@nestjs/common';
import {
  AuditGrpcClient,
  AccountType,
  AuthEventType,
  AuthEventResult,
} from '../grpc-clients/audit.client';
import { NotificationType } from '../notification/notification.interface';

/**
 * Audit Service for notification-related audit events
 *
 * Routes security-related notification events to audit-service for compliance tracking.
 * This is especially important for auth-related notifications like:
 * - Account locked
 * - Login alerts
 * - MFA codes
 * - Password resets
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly auditClient: AuditGrpcClient) {}

  /**
   * Log a notification sent event for audit purposes
   */
  async logNotificationSent(params: {
    accountId: string;
    notificationType: NotificationType;
    channels: string[];
    success: boolean;
    notificationId: string;
    metadata?: Record<string, string>;
  }): Promise<void> {
    // Only audit security-related notifications
    if (!this.isAuditableNotification(params.notificationType)) {
      return;
    }

    try {
      await this.auditClient.logAuthEvent({
        eventType: this.mapNotificationTypeToEventType(params.notificationType),
        accountType: AccountType.USER, // Default to USER, can be overridden
        accountId: params.accountId,
        ipAddress: 'notification-service',
        userAgent: 'notification-service',
        result: params.success ? AuthEventResult.SUCCESS : AuthEventResult.FAILURE,
        metadata: {
          action: 'NOTIFICATION_SENT',
          notificationId: params.notificationId,
          channels: params.channels.join(','),
          notificationType: this.typeToString(params.notificationType),
          ...params.metadata,
        },
      });

      this.logger.debug(`Audit logged for notification ${params.notificationId}`);
    } catch (error) {
      // Don't fail the notification if audit fails
      this.logger.warn(`Failed to log audit event: ${error}`);
    }
  }

  /**
   * Log account locked notification
   */
  async logAccountLockedNotification(params: {
    accountId: string;
    accountType?: AccountType;
    reason?: string;
    notificationId: string;
  }): Promise<void> {
    try {
      await this.auditClient.logAuthEvent({
        eventType: AuthEventType.ACCOUNT_LOCKED,
        accountType: params.accountType || AccountType.USER,
        accountId: params.accountId,
        ipAddress: 'notification-service',
        userAgent: 'notification-service',
        result: AuthEventResult.SUCCESS,
        metadata: {
          action: 'ACCOUNT_LOCKED_NOTIFICATION_SENT',
          notificationId: params.notificationId,
          reason: params.reason || 'Security policy',
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to log account locked audit: ${error}`);
    }
  }

  /**
   * Log login alert notification
   */
  async logLoginAlertNotification(params: {
    accountId: string;
    accountType?: AccountType;
    ipAddress: string;
    userAgent?: string;
    location?: string;
    notificationId: string;
  }): Promise<void> {
    try {
      await this.auditClient.logAuthEvent({
        eventType: AuthEventType.LOGIN_SUCCESS,
        accountType: params.accountType || AccountType.USER,
        accountId: params.accountId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent || 'notification-service',
        result: AuthEventResult.SUCCESS,
        metadata: {
          action: 'LOGIN_ALERT_NOTIFICATION_SENT',
          notificationId: params.notificationId,
          location: params.location || 'Unknown',
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to log login alert audit: ${error}`);
    }
  }

  /**
   * Log MFA code sent notification
   */
  async logMfaCodeSentNotification(params: {
    accountId: string;
    accountType?: AccountType;
    method: string; // SMS, EMAIL, etc.
    notificationId: string;
  }): Promise<void> {
    try {
      await this.auditClient.logAuthEvent({
        eventType: AuthEventType.MFA_VERIFIED, // Using as "MFA code sent"
        accountType: params.accountType || AccountType.USER,
        accountId: params.accountId,
        ipAddress: 'notification-service',
        userAgent: 'notification-service',
        result: AuthEventResult.SUCCESS,
        metadata: {
          action: 'MFA_CODE_NOTIFICATION_SENT',
          notificationId: params.notificationId,
          method: params.method,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to log MFA code audit: ${error}`);
    }
  }

  /**
   * Log password reset notification
   */
  async logPasswordResetNotification(params: {
    accountId: string;
    accountType?: AccountType;
    notificationId: string;
  }): Promise<void> {
    try {
      await this.auditClient.logAuthEvent({
        eventType: AuthEventType.PASSWORD_CHANGED,
        accountType: params.accountType || AccountType.USER,
        accountId: params.accountId,
        ipAddress: 'notification-service',
        userAgent: 'notification-service',
        result: AuthEventResult.SUCCESS,
        metadata: {
          action: 'PASSWORD_RESET_NOTIFICATION_SENT',
          notificationId: params.notificationId,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to log password reset audit: ${error}`);
    }
  }

  /**
   * Check if a notification type should be audited
   */
  private isAuditableNotification(type: NotificationType): boolean {
    const auditableTypes = [
      NotificationType.NOTIFICATION_TYPE_SECURITY_ALERT,
      NotificationType.NOTIFICATION_TYPE_MFA_CODE,
      NotificationType.NOTIFICATION_TYPE_ACCOUNT_LOCKED,
      NotificationType.NOTIFICATION_TYPE_LOGIN_ALERT,
      NotificationType.NOTIFICATION_TYPE_PASSWORD_RESET,
    ];

    return auditableTypes.includes(type);
  }

  /**
   * Map notification type to audit event type
   */
  private mapNotificationTypeToEventType(type: NotificationType): AuthEventType {
    const mapping: Record<NotificationType, AuthEventType> = {
      [NotificationType.NOTIFICATION_TYPE_UNSPECIFIED]: AuthEventType.AUTH_EVENT_TYPE_UNSPECIFIED,
      [NotificationType.NOTIFICATION_TYPE_SYSTEM]: AuthEventType.AUTH_EVENT_TYPE_UNSPECIFIED,
      [NotificationType.NOTIFICATION_TYPE_ADMIN_INVITE]: AuthEventType.AUTH_EVENT_TYPE_UNSPECIFIED,
      [NotificationType.NOTIFICATION_TYPE_PARTNER_INVITE]:
        AuthEventType.AUTH_EVENT_TYPE_UNSPECIFIED,
      [NotificationType.NOTIFICATION_TYPE_PASSWORD_RESET]: AuthEventType.PASSWORD_CHANGED,
      [NotificationType.NOTIFICATION_TYPE_SECURITY_ALERT]:
        AuthEventType.AUTH_EVENT_TYPE_UNSPECIFIED,
      [NotificationType.NOTIFICATION_TYPE_MFA_CODE]: AuthEventType.MFA_VERIFIED,
      [NotificationType.NOTIFICATION_TYPE_ACCOUNT_LOCKED]: AuthEventType.ACCOUNT_LOCKED,
      [NotificationType.NOTIFICATION_TYPE_LOGIN_ALERT]: AuthEventType.LOGIN_SUCCESS,
      [NotificationType.NOTIFICATION_TYPE_MARKETING]: AuthEventType.AUTH_EVENT_TYPE_UNSPECIFIED,
    };

    return mapping[type] || AuthEventType.AUTH_EVENT_TYPE_UNSPECIFIED;
  }

  /**
   * Convert notification type to string
   */
  private typeToString(type: NotificationType): string {
    const map: Record<NotificationType, string> = {
      [NotificationType.NOTIFICATION_TYPE_UNSPECIFIED]: 'UNSPECIFIED',
      [NotificationType.NOTIFICATION_TYPE_SYSTEM]: 'SYSTEM',
      [NotificationType.NOTIFICATION_TYPE_ADMIN_INVITE]: 'ADMIN_INVITE',
      [NotificationType.NOTIFICATION_TYPE_PARTNER_INVITE]: 'PARTNER_INVITE',
      [NotificationType.NOTIFICATION_TYPE_PASSWORD_RESET]: 'PASSWORD_RESET',
      [NotificationType.NOTIFICATION_TYPE_SECURITY_ALERT]: 'SECURITY_ALERT',
      [NotificationType.NOTIFICATION_TYPE_MFA_CODE]: 'MFA_CODE',
      [NotificationType.NOTIFICATION_TYPE_ACCOUNT_LOCKED]: 'ACCOUNT_LOCKED',
      [NotificationType.NOTIFICATION_TYPE_LOGIN_ALERT]: 'LOGIN_ALERT',
      [NotificationType.NOTIFICATION_TYPE_MARKETING]: 'MARKETING',
    };
    return map[type] || 'UNSPECIFIED';
  }
}
