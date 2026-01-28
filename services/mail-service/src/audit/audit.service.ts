import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuditGrpcClient,
  AuthEventType,
  AuditAccountType,
  AuthEventResult,
  SecurityEventType,
  SecurityEventSeverity,
} from '@my-girok/nest-common';

/**
 * Email sent log request
 */
export interface LogEmailSentRequest {
  tenantId: string;
  accountId?: string;
  template: string;
  toEmail: string;
  success: boolean;
  errorMessage?: string;
  emailLogId: string;
}

/**
 * Link clicked log request
 */
export interface LogLinkClickedRequest {
  tenantId: string;
  accountId: string;
  template: string;
  link: string;
}

/**
 * Security event log request
 */
export interface LogSecurityEventRequest {
  eventType:
    | 'EMAIL_HARD_BOUNCE'
    | 'EMAIL_SOFT_BOUNCE'
    | 'EMAIL_COMPLAINT'
    | 'EMAIL_DELIVERY_FAILED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  toEmail: string;
  messageId: string;
  details?: Record<string, unknown>;
}

/**
 * Map template name to auth event type
 */
const TEMPLATE_TO_AUTH_EVENT: Record<string, AuthEventType> = {
  'password-reset': AuthEventType.AUTH_EVENT_TYPE_PASSWORD_RESET_EMAIL_SENT,
  'email-verification': AuthEventType.AUTH_EVENT_TYPE_EMAIL_VERIFICATION_SENT,
  'mfa-code': AuthEventType.AUTH_EVENT_TYPE_MFA_CODE_EMAIL_SENT,
  'account-locked': AuthEventType.AUTH_EVENT_TYPE_ACCOUNT_LOCKED_EMAIL_SENT,
  'account-unlocked': AuthEventType.AUTH_EVENT_TYPE_ACCOUNT_UNLOCKED_EMAIL_SENT,
  'admin-invite': AuthEventType.AUTH_EVENT_TYPE_ADMIN_INVITE_EMAIL_SENT,
  'partner-invite': AuthEventType.AUTH_EVENT_TYPE_PARTNER_INVITE_EMAIL_SENT,
};

/**
 * Map template name to click event type
 */
const TEMPLATE_TO_CLICK_EVENT: Record<string, AuthEventType> = {
  'password-reset': AuthEventType.AUTH_EVENT_TYPE_PASSWORD_RESET_EMAIL_CLICKED,
  'email-verification': AuthEventType.AUTH_EVENT_TYPE_EMAIL_VERIFICATION_CLICKED,
};

/**
 * Map security event type to gRPC enum
 */
const SECURITY_EVENT_MAP: Record<string, SecurityEventType> = {
  EMAIL_HARD_BOUNCE: SecurityEventType.SECURITY_EVENT_TYPE_EMAIL_HARD_BOUNCE,
  EMAIL_SOFT_BOUNCE: SecurityEventType.SECURITY_EVENT_TYPE_EMAIL_SOFT_BOUNCE,
  EMAIL_COMPLAINT: SecurityEventType.SECURITY_EVENT_TYPE_EMAIL_COMPLAINT,
  EMAIL_DELIVERY_FAILED: SecurityEventType.SECURITY_EVENT_TYPE_EMAIL_DELIVERY_FAILED,
};

/**
 * Map severity to gRPC enum
 */
const SEVERITY_MAP: Record<string, SecurityEventSeverity> = {
  LOW: SecurityEventSeverity.SECURITY_EVENT_SEVERITY_LOW,
  MEDIUM: SecurityEventSeverity.SECURITY_EVENT_SEVERITY_MEDIUM,
  HIGH: SecurityEventSeverity.SECURITY_EVENT_SEVERITY_HIGH,
  CRITICAL: SecurityEventSeverity.SECURITY_EVENT_SEVERITY_CRITICAL,
};

/**
 * Audit Service
 * Logs auth-related email events to audit-service via gRPC
 */
@Injectable()
export class AuditService implements OnModuleInit {
  private readonly logger = new Logger(AuditService.name);
  private readonly isEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly auditGrpcClient: AuditGrpcClient,
  ) {
    this.isEnabled = this.configService.get<boolean>('audit.enabled', false);
  }

  async onModuleInit(): Promise<void> {
    if (!this.isEnabled) {
      this.logger.warn('Audit service integration is disabled');
      return;
    }

    this.logger.log('Audit service integration enabled');
  }

  /**
   * Log email sent event to audit service
   */
  async logEmailSent(request: LogEmailSentRequest): Promise<void> {
    if (!this.isEnabled) {
      this.logger.debug('Audit disabled, skipping email sent log', {
        template: request.template,
        emailLogId: request.emailLogId,
      });
      return;
    }

    const eventType = TEMPLATE_TO_AUTH_EVENT[request.template];
    if (!eventType) {
      // Not an auth-related template, skip logging
      this.logger.debug('Non-auth template, skipping audit log', {
        template: request.template,
      });
      return;
    }

    try {
      await this.auditGrpcClient.logAuthEvent({
        tenant_id: request.tenantId,
        event_type: eventType,
        account_type: AuditAccountType.ACCOUNT_TYPE_USER,
        account_id: request.accountId || '',
        result: request.success
          ? AuthEventResult.AUTH_EVENT_RESULT_SUCCESS
          : AuthEventResult.AUTH_EVENT_RESULT_FAILURE,
        failure_reason: request.errorMessage,
        metadata: {
          emailLogId: request.emailLogId,
          template: request.template,
          toEmail: request.toEmail,
        },
        source_service: 'mail-service',
      });

      this.logger.debug('Email sent event logged to audit service', {
        emailLogId: request.emailLogId,
        eventType,
      });
    } catch (error) {
      // Don't fail the email operation if audit logging fails
      this.logger.warn('Failed to log email event to audit service', error);
    }
  }

  /**
   * Log verification/reset link clicked event
   */
  async logLinkClicked(request: LogLinkClickedRequest): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    const eventType = TEMPLATE_TO_CLICK_EVENT[request.template];
    if (!eventType) {
      return;
    }

    try {
      await this.auditGrpcClient.logAuthEvent({
        tenant_id: request.tenantId,
        event_type: eventType,
        account_type: AuditAccountType.ACCOUNT_TYPE_USER,
        account_id: request.accountId,
        result: AuthEventResult.AUTH_EVENT_RESULT_SUCCESS,
        metadata: {
          template: request.template,
          link: request.link,
        },
        source_service: 'mail-service',
      });

      this.logger.debug('Link clicked event logged to audit service', {
        accountId: request.accountId,
        eventType,
      });
    } catch (error) {
      this.logger.warn('Failed to log link click to audit service', error);
    }
  }

  /**
   * Log security event (bounce, complaint, etc.)
   */
  async logSecurityEvent(request: LogSecurityEventRequest): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    const eventType = SECURITY_EVENT_MAP[request.eventType];
    const severity = SEVERITY_MAP[request.severity];

    if (!eventType) {
      this.logger.warn('Unknown security event type', { eventType: request.eventType });
      return;
    }

    try {
      await this.auditGrpcClient.logSecurityEvent({
        tenant_id: 'default', // Security events are system-wide
        event_type: eventType,
        severity,
        subject_id: request.toEmail,
        subject_type: AuditAccountType.ACCOUNT_TYPE_UNSPECIFIED,
        description: `Email ${request.eventType.toLowerCase().replace('_', ' ')} for ${request.toEmail}`,
        metadata: {
          messageId: request.messageId,
          ...(request.details
            ? Object.fromEntries(Object.entries(request.details).map(([k, v]) => [k, String(v)]))
            : {}),
        },
        action_taken: false,
        source_service: 'mail-service',
      });

      this.logger.debug('Security event logged to audit service', {
        eventType: request.eventType,
        toEmail: request.toEmail,
      });
    } catch (error) {
      this.logger.warn('Failed to log security event to audit service', error);
    }
  }

  /**
   * Check if audit service is enabled
   */
  isAuditEnabled(): boolean {
    return this.isEnabled;
  }
}
