import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { AuditService } from './audit.service';
import {
  AuditGrpcClient,
  AuthEventType,
  AuditAccountType,
  AuthEventResult,
  SecurityEventType,
  SecurityEventSeverity,
} from '@my-girok/nest-common';

describe('AuditService', () => {
  let service: AuditService;
  let auditGrpcClient: {
    logAuthEvent: Mock;
    logSecurityEvent: Mock;
  };

  const createMockConfigService = (enabled: boolean = true) => ({
    get: vi.fn((key: string, defaultValue?: unknown) => {
      const config: Record<string, unknown> = {
        'audit.enabled': enabled,
      };
      return config[key] ?? defaultValue;
    }),
  });

  const createMockAuditGrpcClient = () => ({
    logAuthEvent: vi.fn().mockResolvedValue(undefined),
    logSecurityEvent: vi.fn().mockResolvedValue(undefined),
  });

  beforeEach(async () => {
    const mockAuditGrpcClient = createMockAuditGrpcClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: ConfigService, useValue: createMockConfigService(true) },
        { provide: AuditGrpcClient, useValue: mockAuditGrpcClient },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    auditGrpcClient = module.get(AuditGrpcClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('logEmailSent', () => {
    it('should log password reset email sent event', async () => {
      await service.logEmailSent({
        tenantId: 'tenant-001',
        accountId: 'account-001',
        template: 'password-reset',
        toEmail: 'user@example.com',
        success: true,
        emailLogId: 'email-log-123',
      });

      expect(auditGrpcClient.logAuthEvent).toHaveBeenCalledWith({
        tenant_id: 'tenant-001',
        event_type: AuthEventType.AUTH_EVENT_TYPE_PASSWORD_RESET_EMAIL_SENT,
        account_type: AuditAccountType.ACCOUNT_TYPE_USER,
        account_id: 'account-001',
        result: AuthEventResult.AUTH_EVENT_RESULT_SUCCESS,
        failure_reason: undefined,
        metadata: {
          emailLogId: 'email-log-123',
          template: 'password-reset',
          toEmail: 'user@example.com',
        },
        source_service: 'mail-service',
      });
    });

    it('should log email verification sent event', async () => {
      await service.logEmailSent({
        tenantId: 'tenant-001',
        accountId: 'account-001',
        template: 'email-verification',
        toEmail: 'user@example.com',
        success: true,
        emailLogId: 'email-log-123',
      });

      expect(auditGrpcClient.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: AuthEventType.AUTH_EVENT_TYPE_EMAIL_VERIFICATION_SENT,
        }),
      );
    });

    it('should log MFA code email sent event', async () => {
      await service.logEmailSent({
        tenantId: 'tenant-001',
        accountId: 'account-001',
        template: 'mfa-code',
        toEmail: 'user@example.com',
        success: true,
        emailLogId: 'email-log-123',
      });

      expect(auditGrpcClient.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: AuthEventType.AUTH_EVENT_TYPE_MFA_CODE_EMAIL_SENT,
        }),
      );
    });

    it('should log account locked email sent event', async () => {
      await service.logEmailSent({
        tenantId: 'tenant-001',
        accountId: 'account-001',
        template: 'account-locked',
        toEmail: 'user@example.com',
        success: true,
        emailLogId: 'email-log-123',
      });

      expect(auditGrpcClient.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: AuthEventType.AUTH_EVENT_TYPE_ACCOUNT_LOCKED_EMAIL_SENT,
        }),
      );
    });

    it('should log account unlocked email sent event', async () => {
      await service.logEmailSent({
        tenantId: 'tenant-001',
        accountId: 'account-001',
        template: 'account-unlocked',
        toEmail: 'user@example.com',
        success: true,
        emailLogId: 'email-log-123',
      });

      expect(auditGrpcClient.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: AuthEventType.AUTH_EVENT_TYPE_ACCOUNT_UNLOCKED_EMAIL_SENT,
        }),
      );
    });

    it('should log admin invite email sent event', async () => {
      await service.logEmailSent({
        tenantId: 'tenant-001',
        accountId: 'account-001',
        template: 'admin-invite',
        toEmail: 'user@example.com',
        success: true,
        emailLogId: 'email-log-123',
      });

      expect(auditGrpcClient.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: AuthEventType.AUTH_EVENT_TYPE_ADMIN_INVITE_EMAIL_SENT,
        }),
      );
    });

    it('should log partner invite email sent event', async () => {
      await service.logEmailSent({
        tenantId: 'tenant-001',
        accountId: 'account-001',
        template: 'partner-invite',
        toEmail: 'user@example.com',
        success: true,
        emailLogId: 'email-log-123',
      });

      expect(auditGrpcClient.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: AuthEventType.AUTH_EVENT_TYPE_PARTNER_INVITE_EMAIL_SENT,
        }),
      );
    });

    it('should log failure result when success is false', async () => {
      await service.logEmailSent({
        tenantId: 'tenant-001',
        accountId: 'account-001',
        template: 'password-reset',
        toEmail: 'user@example.com',
        success: false,
        errorMessage: 'SES quota exceeded',
        emailLogId: 'email-log-123',
      });

      expect(auditGrpcClient.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          result: AuthEventResult.AUTH_EVENT_RESULT_FAILURE,
          failure_reason: 'SES quota exceeded',
        }),
      );
    });

    it('should skip non-auth templates', async () => {
      await service.logEmailSent({
        tenantId: 'tenant-001',
        accountId: 'account-001',
        template: 'welcome',
        toEmail: 'user@example.com',
        success: true,
        emailLogId: 'email-log-123',
      });

      expect(auditGrpcClient.logAuthEvent).not.toHaveBeenCalled();
    });

    it('should handle empty account ID', async () => {
      await service.logEmailSent({
        tenantId: 'tenant-001',
        template: 'password-reset',
        toEmail: 'user@example.com',
        success: true,
        emailLogId: 'email-log-123',
      });

      expect(auditGrpcClient.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          account_id: '',
        }),
      );
    });

    it('should handle gRPC errors gracefully', async () => {
      auditGrpcClient.logAuthEvent.mockRejectedValue(new Error('gRPC connection error'));

      // Should not throw
      await expect(
        service.logEmailSent({
          tenantId: 'tenant-001',
          accountId: 'account-001',
          template: 'password-reset',
          toEmail: 'user@example.com',
          success: true,
          emailLogId: 'email-log-123',
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('logLinkClicked', () => {
    it('should log password reset link clicked event', async () => {
      await service.logLinkClicked({
        tenantId: 'tenant-001',
        accountId: 'account-001',
        template: 'password-reset',
        link: 'https://example.com/reset?token=abc',
      });

      expect(auditGrpcClient.logAuthEvent).toHaveBeenCalledWith({
        tenant_id: 'tenant-001',
        event_type: AuthEventType.AUTH_EVENT_TYPE_PASSWORD_RESET_EMAIL_CLICKED,
        account_type: AuditAccountType.ACCOUNT_TYPE_USER,
        account_id: 'account-001',
        result: AuthEventResult.AUTH_EVENT_RESULT_SUCCESS,
        metadata: {
          template: 'password-reset',
          link: 'https://example.com/reset?token=abc',
        },
        source_service: 'mail-service',
      });
    });

    it('should log email verification link clicked event', async () => {
      await service.logLinkClicked({
        tenantId: 'tenant-001',
        accountId: 'account-001',
        template: 'email-verification',
        link: 'https://example.com/verify?token=xyz',
      });

      expect(auditGrpcClient.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: AuthEventType.AUTH_EVENT_TYPE_EMAIL_VERIFICATION_CLICKED,
        }),
      );
    });

    it('should skip templates without click event mapping', async () => {
      await service.logLinkClicked({
        tenantId: 'tenant-001',
        accountId: 'account-001',
        template: 'welcome',
        link: 'https://example.com/dashboard',
      });

      expect(auditGrpcClient.logAuthEvent).not.toHaveBeenCalled();
    });

    it('should handle gRPC errors gracefully', async () => {
      auditGrpcClient.logAuthEvent.mockRejectedValue(new Error('gRPC error'));

      await expect(
        service.logLinkClicked({
          tenantId: 'tenant-001',
          accountId: 'account-001',
          template: 'password-reset',
          link: 'https://example.com/reset',
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('logSecurityEvent', () => {
    it('should log hard bounce security event', async () => {
      await service.logSecurityEvent({
        eventType: 'EMAIL_HARD_BOUNCE',
        severity: 'MEDIUM',
        toEmail: 'user@example.com',
        messageId: 'ses-msg-123',
        details: {
          bounceType: 'Permanent',
          bounceSubType: 'NoEmail',
        },
      });

      expect(auditGrpcClient.logSecurityEvent).toHaveBeenCalledWith({
        tenant_id: 'default',
        event_type: SecurityEventType.SECURITY_EVENT_TYPE_EMAIL_HARD_BOUNCE,
        severity: SecurityEventSeverity.SECURITY_EVENT_SEVERITY_MEDIUM,
        subject_id: 'user@example.com',
        subject_type: AuditAccountType.ACCOUNT_TYPE_UNSPECIFIED,
        description: 'Email email hard_bounce for user@example.com',
        metadata: {
          messageId: 'ses-msg-123',
          bounceType: 'Permanent',
          bounceSubType: 'NoEmail',
        },
        action_taken: false,
        source_service: 'mail-service',
      });
    });

    it('should log soft bounce security event', async () => {
      await service.logSecurityEvent({
        eventType: 'EMAIL_SOFT_BOUNCE',
        severity: 'LOW',
        toEmail: 'user@example.com',
        messageId: 'ses-msg-123',
      });

      expect(auditGrpcClient.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: SecurityEventType.SECURITY_EVENT_TYPE_EMAIL_SOFT_BOUNCE,
          severity: SecurityEventSeverity.SECURITY_EVENT_SEVERITY_LOW,
        }),
      );
    });

    it('should log complaint security event', async () => {
      await service.logSecurityEvent({
        eventType: 'EMAIL_COMPLAINT',
        severity: 'HIGH',
        toEmail: 'user@example.com',
        messageId: 'ses-msg-123',
        details: {
          feedbackType: 'abuse',
        },
      });

      expect(auditGrpcClient.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: SecurityEventType.SECURITY_EVENT_TYPE_EMAIL_COMPLAINT,
          severity: SecurityEventSeverity.SECURITY_EVENT_SEVERITY_HIGH,
        }),
      );
    });

    it('should log delivery failed security event', async () => {
      await service.logSecurityEvent({
        eventType: 'EMAIL_DELIVERY_FAILED',
        severity: 'MEDIUM',
        toEmail: 'user@example.com',
        messageId: 'ses-msg-123',
      });

      expect(auditGrpcClient.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: SecurityEventType.SECURITY_EVENT_TYPE_EMAIL_DELIVERY_FAILED,
        }),
      );
    });

    it('should handle CRITICAL severity', async () => {
      await service.logSecurityEvent({
        eventType: 'EMAIL_COMPLAINT',
        severity: 'CRITICAL',
        toEmail: 'user@example.com',
        messageId: 'ses-msg-123',
      });

      expect(auditGrpcClient.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: SecurityEventSeverity.SECURITY_EVENT_SEVERITY_CRITICAL,
        }),
      );
    });

    it('should handle empty details', async () => {
      await service.logSecurityEvent({
        eventType: 'EMAIL_HARD_BOUNCE',
        severity: 'MEDIUM',
        toEmail: 'user@example.com',
        messageId: 'ses-msg-123',
      });

      expect(auditGrpcClient.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            messageId: 'ses-msg-123',
          },
        }),
      );
    });

    it('should skip unknown event types', async () => {
      await service.logSecurityEvent({
        eventType: 'UNKNOWN_EVENT' as any,
        severity: 'MEDIUM',
        toEmail: 'user@example.com',
        messageId: 'ses-msg-123',
      });

      expect(auditGrpcClient.logSecurityEvent).not.toHaveBeenCalled();
    });

    it('should handle gRPC errors gracefully', async () => {
      auditGrpcClient.logSecurityEvent.mockRejectedValue(new Error('gRPC error'));

      await expect(
        service.logSecurityEvent({
          eventType: 'EMAIL_HARD_BOUNCE',
          severity: 'MEDIUM',
          toEmail: 'user@example.com',
          messageId: 'ses-msg-123',
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('audit disabled', () => {
    let disabledService: AuditService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuditService,
          { provide: ConfigService, useValue: createMockConfigService(false) },
          { provide: AuditGrpcClient, useValue: createMockAuditGrpcClient() },
        ],
      }).compile();

      disabledService = module.get<AuditService>(AuditService);
    });

    it('should not log email sent when disabled', async () => {
      await disabledService.logEmailSent({
        tenantId: 'tenant-001',
        accountId: 'account-001',
        template: 'password-reset',
        toEmail: 'user@example.com',
        success: true,
        emailLogId: 'email-log-123',
      });

      expect(auditGrpcClient.logAuthEvent).not.toHaveBeenCalled();
    });

    it('should not log link clicked when disabled', async () => {
      await disabledService.logLinkClicked({
        tenantId: 'tenant-001',
        accountId: 'account-001',
        template: 'password-reset',
        link: 'https://example.com/reset',
      });

      expect(auditGrpcClient.logAuthEvent).not.toHaveBeenCalled();
    });

    it('should not log security event when disabled', async () => {
      await disabledService.logSecurityEvent({
        eventType: 'EMAIL_HARD_BOUNCE',
        severity: 'MEDIUM',
        toEmail: 'user@example.com',
        messageId: 'ses-msg-123',
      });

      expect(auditGrpcClient.logSecurityEvent).not.toHaveBeenCalled();
    });

    it('should return false for isAuditEnabled', () => {
      expect(disabledService.isAuditEnabled()).toBe(false);
    });
  });

  describe('isAuditEnabled', () => {
    it('should return true when enabled', () => {
      expect(service.isAuditEnabled()).toBe(true);
    });
  });

  describe('onModuleInit', () => {
    it('should initialize without error when enabled', async () => {
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });

    it('should log warning when disabled', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuditService,
          { provide: ConfigService, useValue: createMockConfigService(false) },
          { provide: AuditGrpcClient, useValue: createMockAuditGrpcClient() },
        ],
      }).compile();

      const disabledService = module.get<AuditService>(AuditService);
      await expect(disabledService.onModuleInit()).resolves.not.toThrow();
    });
  });
});
