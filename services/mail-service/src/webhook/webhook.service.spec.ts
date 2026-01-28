import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { WebhookService } from './webhook.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SesEventNotification, SnsMessage } from './webhook.types';

// Type for mocked Prisma service
type MockPrismaEmailLog = {
  findUnique: Mock;
  update: Mock;
  updateMany: Mock;
};

describe('WebhookService', () => {
  let service: WebhookService;
  let prisma: { emailLog: MockPrismaEmailLog };
  let auditService: {
    logSecurityEvent: Mock;
    logLinkClicked: Mock;
  };

  const mockEmailLog = {
    id: 'email-log-123',
    tenantId: 'tenant-001',
    accountId: 'account-001',
    template: 'email-verification',
    toEmail: 'user@example.com',
  };

  const createSesEvent = (
    notificationType: string,
    overrides: Partial<SesEventNotification> = {},
  ): SesEventNotification => ({
    notificationType: notificationType as SesEventNotification['notificationType'],
    mail: {
      timestamp: '2024-01-01T00:00:00Z',
      messageId: 'ses-msg-123',
      source: 'noreply@example.com',
      destination: ['user@example.com'],
      tags: {
        emailLogId: ['email-log-123'],
      },
    },
    ...overrides,
  });

  beforeEach(async () => {
    const mockPrisma = {
      emailLog: {
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
    };

    const mockAuditService = {
      logSecurityEvent: vi.fn().mockResolvedValue(undefined),
      logLinkClicked: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    prisma = module.get(PrismaService);
    auditService = module.get(AuditService);

    prisma.emailLog.update.mockResolvedValue(mockEmailLog);
    prisma.emailLog.updateMany.mockResolvedValue({ count: 1 });
    prisma.emailLog.findUnique.mockResolvedValue(mockEmailLog);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('processSnsMessage', () => {
    it('should handle SNS subscription confirmation', async () => {
      const message: SnsMessage = {
        Type: 'SubscriptionConfirmation',
        MessageId: 'sns-msg-123',
        TopicArn: 'arn:aws:sns:us-east-1:123456789:mail-events',
        Message: '',
        Timestamp: '2024-01-01T00:00:00Z',
        SignatureVersion: '1',
        Signature: 'signature',
        SubscribeURL: 'https://sns.amazonaws.com/confirm',
      };

      const result = await service.processSnsMessage(message);

      expect(result.success).toBe(true);
      expect(result.eventType).toBe('Send');
      expect(prisma.emailLog.update).not.toHaveBeenCalled();
    });

    it('should parse and process SES event from SNS message', async () => {
      const sesEvent = createSesEvent('Delivery', {
        delivery: {
          timestamp: '2024-01-01T00:00:00Z',
          processingTimeMillis: 500,
          recipients: ['user@example.com'],
          smtpResponse: '250 OK',
        },
      });

      const message: SnsMessage = {
        Type: 'Notification',
        MessageId: 'sns-msg-123',
        TopicArn: 'arn:aws:sns:us-east-1:123456789:mail-events',
        Message: JSON.stringify(sesEvent),
        Timestamp: '2024-01-01T00:00:00Z',
        SignatureVersion: '1',
        Signature: 'signature',
      };

      const result = await service.processSnsMessage(message);

      expect(result.success).toBe(true);
      expect(result.eventType).toBe('Delivery');
    });

    it('should handle parse errors gracefully', async () => {
      const message: SnsMessage = {
        Type: 'Notification',
        MessageId: 'sns-msg-123',
        TopicArn: 'arn:aws:sns:us-east-1:123456789:mail-events',
        Message: 'invalid json',
        Timestamp: '2024-01-01T00:00:00Z',
        SignatureVersion: '1',
        Signature: 'signature',
      };

      const result = await service.processSnsMessage(message);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to parse event');
    });
  });

  describe('handleDelivery', () => {
    it('should update email status to SENT on delivery', async () => {
      const event = createSesEvent('Delivery', {
        delivery: {
          timestamp: '2024-01-01T00:00:00Z',
          processingTimeMillis: 500,
          recipients: ['user@example.com'],
          smtpResponse: '250 OK',
        },
      });

      const result = await service.processEvent(event);

      expect(result.success).toBe(true);
      expect(result.eventType).toBe('Delivery');
      expect(prisma.emailLog.update).toHaveBeenCalledWith({
        where: { id: 'email-log-123' },
        data: expect.objectContaining({
          status: 'SENT',
        }),
      });
    });

    it('should update by messageId when emailLogId not in tags', async () => {
      const event = createSesEvent('Delivery', {
        delivery: {
          timestamp: '2024-01-01T00:00:00Z',
          processingTimeMillis: 500,
          recipients: ['user@example.com'],
          smtpResponse: '250 OK',
        },
      });
      event.mail.tags = undefined;

      await service.processEvent(event);

      expect(prisma.emailLog.updateMany).toHaveBeenCalledWith({
        where: { messageId: 'ses-msg-123' },
        data: expect.objectContaining({
          status: 'SENT',
        }),
      });
    });
  });

  describe('handleOpen', () => {
    it('should update email status to OPENED', async () => {
      const event = createSesEvent('Open', {
        open: {
          timestamp: '2024-01-01T01:00:00Z',
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.1',
        },
      });

      const result = await service.processEvent(event);

      expect(result.success).toBe(true);
      expect(result.eventType).toBe('Open');
      expect(prisma.emailLog.update).toHaveBeenCalledWith({
        where: { id: 'email-log-123' },
        data: expect.objectContaining({
          status: 'OPENED',
          openedAt: expect.any(Date),
        }),
      });
    });

    it('should use current time if open timestamp not provided', async () => {
      const event = createSesEvent('Open', {
        open: {
          timestamp: '',
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.1',
        },
      });

      await service.processEvent(event);

      expect(prisma.emailLog.update).toHaveBeenCalledWith({
        where: { id: 'email-log-123' },
        data: expect.objectContaining({
          openedAt: expect.any(Date),
        }),
      });
    });
  });

  describe('handleClick', () => {
    it('should update email status to CLICKED', async () => {
      const event = createSesEvent('Click', {
        click: {
          timestamp: '2024-01-01T02:00:00Z',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          link: 'https://example.com/verify?token=abc',
        },
      });

      const result = await service.processEvent(event);

      expect(result.success).toBe(true);
      expect(result.eventType).toBe('Click');
      expect(prisma.emailLog.update).toHaveBeenCalledWith({
        where: { id: 'email-log-123' },
        data: expect.objectContaining({
          status: 'CLICKED',
          clickedAt: expect.any(Date),
        }),
      });
    });

    it('should log verification link clicks to audit service', async () => {
      const event = createSesEvent('Click', {
        click: {
          timestamp: '2024-01-01T02:00:00Z',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          link: 'https://example.com/verify?token=abc',
        },
      });

      await service.processEvent(event);

      expect(auditService.logLinkClicked).toHaveBeenCalledWith({
        tenantId: 'tenant-001',
        accountId: 'account-001',
        template: 'email-verification',
        link: 'https://example.com/verify?token=abc',
      });
    });

    it('should log password reset link clicks to audit service', async () => {
      const event = createSesEvent('Click', {
        click: {
          timestamp: '2024-01-01T02:00:00Z',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          link: 'https://example.com/reset-password?token=xyz',
        },
      });

      await service.processEvent(event);

      expect(auditService.logLinkClicked).toHaveBeenCalled();
    });

    it('should not log non-verification link clicks to audit', async () => {
      const event = createSesEvent('Click', {
        click: {
          timestamp: '2024-01-01T02:00:00Z',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          link: 'https://example.com/regular-page',
        },
      });

      await service.processEvent(event);

      expect(auditService.logLinkClicked).not.toHaveBeenCalled();
    });

    it('should handle click when account has no accountId', async () => {
      prisma.emailLog.findUnique.mockResolvedValue({
        ...mockEmailLog,
        accountId: null,
      });

      const event = createSesEvent('Click', {
        click: {
          timestamp: '2024-01-01T02:00:00Z',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          link: 'https://example.com/verify?token=abc',
        },
      });

      await service.processEvent(event);

      expect(auditService.logLinkClicked).not.toHaveBeenCalled();
    });
  });

  describe('handleBounce', () => {
    it('should update email status to BOUNCED', async () => {
      const event = createSesEvent('Bounce', {
        bounce: {
          bounceType: 'Permanent',
          bounceSubType: 'General',
          bouncedRecipients: [
            {
              emailAddress: 'user@example.com',
              diagnosticCode: '550 5.1.1 User unknown',
            },
          ],
          timestamp: '2024-01-01T00:00:00Z',
          feedbackId: 'feedback-123',
        },
      });

      const result = await service.processEvent(event);

      expect(result.success).toBe(true);
      expect(result.eventType).toBe('Bounce');
      expect(prisma.emailLog.update).toHaveBeenCalledWith({
        where: { id: 'email-log-123' },
        data: expect.objectContaining({
          status: 'BOUNCED',
          error: expect.stringContaining('Permanent bounce'),
        }),
      });
    });

    it('should log security event for permanent bounces', async () => {
      const event = createSesEvent('Bounce', {
        bounce: {
          bounceType: 'Permanent',
          bounceSubType: 'General',
          bouncedRecipients: [{ emailAddress: 'user@example.com' }],
          timestamp: '2024-01-01T00:00:00Z',
          feedbackId: 'feedback-123',
        },
      });

      await service.processEvent(event);

      expect(auditService.logSecurityEvent).toHaveBeenCalledWith({
        eventType: 'EMAIL_HARD_BOUNCE',
        severity: 'MEDIUM',
        toEmail: 'user@example.com',
        messageId: 'ses-msg-123',
        details: {
          bounceType: 'Permanent',
          bounceSubType: 'General',
        },
      });
    });

    it('should not log security event for transient bounces', async () => {
      const event = createSesEvent('Bounce', {
        bounce: {
          bounceType: 'Transient',
          bounceSubType: 'MailboxFull',
          bouncedRecipients: [{ emailAddress: 'user@example.com' }],
          timestamp: '2024-01-01T00:00:00Z',
          feedbackId: 'feedback-123',
        },
      });

      await service.processEvent(event);

      expect(auditService.logSecurityEvent).not.toHaveBeenCalled();
    });

    it('should format bounce error message correctly', async () => {
      const event = createSesEvent('Bounce', {
        bounce: {
          bounceType: 'Permanent',
          bounceSubType: 'NoEmail',
          bouncedRecipients: [
            {
              emailAddress: 'user@example.com',
              diagnosticCode: '550 No such user',
            },
          ],
          timestamp: '2024-01-01T00:00:00Z',
          feedbackId: 'feedback-123',
        },
      });

      await service.processEvent(event);

      expect(prisma.emailLog.update).toHaveBeenCalledWith({
        where: { id: 'email-log-123' },
        data: expect.objectContaining({
          error: expect.stringContaining('Permanent bounce (NoEmail)'),
        }),
      });
    });
  });

  describe('handleComplaint', () => {
    it('should update email status to BOUNCED for complaints', async () => {
      const event = createSesEvent('Complaint', {
        complaint: {
          complainedRecipients: [{ emailAddress: 'user@example.com' }],
          timestamp: '2024-01-01T00:00:00Z',
          feedbackId: 'feedback-123',
          complaintFeedbackType: 'abuse',
        },
      });

      const result = await service.processEvent(event);

      expect(result.success).toBe(true);
      expect(result.eventType).toBe('Complaint');
      expect(prisma.emailLog.update).toHaveBeenCalledWith({
        where: { id: 'email-log-123' },
        data: expect.objectContaining({
          status: 'BOUNCED',
          error: 'Complaint: abuse',
        }),
      });
    });

    it('should log security event for complaints', async () => {
      const event = createSesEvent('Complaint', {
        complaint: {
          complainedRecipients: [{ emailAddress: 'user@example.com' }],
          timestamp: '2024-01-01T00:00:00Z',
          feedbackId: 'feedback-123',
          complaintFeedbackType: 'fraud',
        },
      });

      await service.processEvent(event);

      expect(auditService.logSecurityEvent).toHaveBeenCalledWith({
        eventType: 'EMAIL_COMPLAINT',
        severity: 'HIGH',
        toEmail: 'user@example.com',
        messageId: 'ses-msg-123',
        details: {
          feedbackType: 'fraud',
        },
      });
    });

    it('should handle complaint with unknown feedback type', async () => {
      const event = createSesEvent('Complaint', {
        complaint: {
          complainedRecipients: [{ emailAddress: 'user@example.com' }],
          timestamp: '2024-01-01T00:00:00Z',
          feedbackId: 'feedback-123',
        },
      });

      await service.processEvent(event);

      expect(prisma.emailLog.update).toHaveBeenCalledWith({
        where: { id: 'email-log-123' },
        data: expect.objectContaining({
          error: 'Complaint: unknown',
        }),
      });
    });
  });

  describe('handleReject', () => {
    it('should update email status to FAILED on reject', async () => {
      const event = createSesEvent('Reject', {
        reject: {
          reason: 'Bad content',
        },
      });

      const result = await service.processEvent(event);

      expect(result.success).toBe(true);
      expect(result.eventType).toBe('Reject');
      expect(prisma.emailLog.update).toHaveBeenCalledWith({
        where: { id: 'email-log-123' },
        data: expect.objectContaining({
          status: 'FAILED',
          error: 'Rejected: Bad content',
        }),
      });
    });
  });

  describe('handleSend', () => {
    it('should process Send event without updating status', async () => {
      const event = createSesEvent('Send', {
        send: {
          timestamp: '2024-01-01T00:00:00Z',
        },
      });

      const result = await service.processEvent(event);

      expect(result.success).toBe(true);
      expect(result.eventType).toBe('Send');
      // Send events are logged during initial send, no update needed
      expect(prisma.emailLog.update).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle database update errors gracefully in handleDelivery', async () => {
      prisma.emailLog.update.mockRejectedValue(new Error('DB error'));

      const event = createSesEvent('Delivery', {
        delivery: {
          timestamp: '2024-01-01T00:00:00Z',
          processingTimeMillis: 500,
          recipients: ['user@example.com'],
          smtpResponse: '250 OK',
        },
      });

      // The webhook service catches errors in updateEmailLogStatus
      // and logs them but doesn't throw, so processEvent succeeds
      const result = await service.processEvent(event);

      // The service catches the DB error internally but returns success
      // because the event was processed (just the DB update failed)
      expect(result.success).toBe(true);
      expect(prisma.emailLog.update).toHaveBeenCalled();
    });

    it('should handle database update errors gracefully in handleOpen', async () => {
      prisma.emailLog.update.mockRejectedValue(new Error('Connection error'));

      const event = createSesEvent('Open', {
        open: {
          timestamp: '2024-01-01T01:00:00Z',
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.1',
        },
      });

      // Should not throw - error is logged internally
      const result = await service.processEvent(event);

      // Same as above - DB errors are caught and logged
      expect(result.success).toBe(true);
    });

    it('should handle unrecognized event types', async () => {
      const event = {
        notificationType: 'UnknownType' as SesEventNotification['notificationType'],
        mail: {
          timestamp: '2024-01-01T00:00:00Z',
          messageId: 'ses-msg-123',
          source: 'noreply@example.com',
          destination: ['user@example.com'],
          tags: { emailLogId: ['email-log-123'] },
        },
      };

      const result = await service.processEvent(event);

      expect(result.success).toBe(true);
      expect(prisma.emailLog.update).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle missing emailLogId in tags', async () => {
      const event = createSesEvent('Delivery', {
        delivery: {
          timestamp: '2024-01-01T00:00:00Z',
          processingTimeMillis: 500,
          recipients: ['user@example.com'],
          smtpResponse: '250 OK',
        },
      });
      event.mail.tags = {};

      await service.processEvent(event);

      expect(prisma.emailLog.updateMany).toHaveBeenCalled();
      expect(prisma.emailLog.update).not.toHaveBeenCalled();
    });

    it('should handle empty bounced recipients array', async () => {
      const event = createSesEvent('Bounce', {
        bounce: {
          bounceType: 'Permanent',
          bounceSubType: 'General',
          bouncedRecipients: [],
          timestamp: '2024-01-01T00:00:00Z',
          feedbackId: 'feedback-123',
        },
      });

      const result = await service.processEvent(event);

      expect(result.success).toBe(true);
      // Should still log security event but with empty email
      expect(auditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          toEmail: '',
        }),
      );
    });

    it('should handle audit service failure gracefully', async () => {
      auditService.logLinkClicked.mockRejectedValue(new Error('Audit service down'));

      const event = createSesEvent('Click', {
        click: {
          timestamp: '2024-01-01T02:00:00Z',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          link: 'https://example.com/verify?token=abc',
        },
      });

      // Should not throw
      const result = await service.processEvent(event);

      expect(result.success).toBe(true);
    });
  });
});
