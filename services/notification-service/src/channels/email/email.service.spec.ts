import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { EmailService } from './email.service';
import { MailGrpcClient, EmailTemplate } from '../../grpc-clients/mail.client';
import {
  NotificationChannel,
  NotificationType,
  Priority,
  ChannelDeliveryRequest,
} from '../../notification/notification.interface';

describe('EmailService', () => {
  let service: EmailService;
  let mailClient: {
    sendEmail: Mock;
    isServiceConnected: Mock;
  };

  const mockDeliveryRequest: ChannelDeliveryRequest = {
    notificationId: 'notif-123',
    tenantId: 'tenant-1',
    accountId: 'account-1',
    type: NotificationType.NOTIFICATION_TYPE_ADMIN_INVITE,
    channel: NotificationChannel.NOTIFICATION_CHANNEL_EMAIL,
    title: 'You have been invited',
    body: 'You have been invited to join the admin team.',
    data: {
      email: 'user@example.com',
      inviterName: 'John Doe',
      organizationName: 'Test Org',
    },
    locale: 'en',
    priority: Priority.PRIORITY_NORMAL,
  };

  beforeEach(async () => {
    const mockMailClient = {
      sendEmail: vi.fn(),
      isServiceConnected: vi.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService, { provide: MailGrpcClient, useValue: mockMailClient }],
    }).compile();

    service = module.get<EmailService>(EmailService);
    mailClient = module.get(MailGrpcClient);
  });

  describe('send', () => {
    it('should send email successfully via mail-service', async () => {
      mailClient.sendEmail.mockResolvedValue({
        success: true,
        emailLogId: 'email-log-123',
        message: 'Email sent successfully',
      });

      const result = await service.send(mockDeliveryRequest);

      expect(result.success).toBe(true);
      expect(result.externalId).toBe('email-log-123');
      expect(mailClient.sendEmail).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        toEmail: 'user@example.com',
        template: EmailTemplate.EMAIL_TEMPLATE_ADMIN_INVITE,
        locale: 'en',
        variables: mockDeliveryRequest.data,
        sourceService: 'notification-service',
        fromEmail: 'noreply@example.com',
        metadata: {
          notificationId: 'notif-123',
          notificationType: String(NotificationType.NOTIFICATION_TYPE_ADMIN_INVITE),
        },
      });
    });

    it('should return failure when no email address provided', async () => {
      const requestNoEmail: ChannelDeliveryRequest = {
        ...mockDeliveryRequest,
        data: { inviterName: 'John' },
      };

      const result = await service.send(requestNoEmail);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No email address provided');
      expect(mailClient.sendEmail).not.toHaveBeenCalled();
    });

    it('should handle mail service errors', async () => {
      mailClient.sendEmail.mockResolvedValue({
        success: false,
        emailLogId: '',
        message: 'Mail service error: Template not found',
      });

      const result = await service.send(mockDeliveryRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Mail service error: Template not found');
    });

    it('should handle gRPC client errors gracefully', async () => {
      mailClient.sendEmail.mockRejectedValue(new Error('gRPC connection failed'));

      const result = await service.send(mockDeliveryRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Email error');
    });

    it('should use custom fromEmail when provided', async () => {
      mailClient.sendEmail.mockResolvedValue({
        success: true,
        emailLogId: 'email-log-123',
        message: 'Success',
      });

      const requestWithFromEmail: ChannelDeliveryRequest = {
        ...mockDeliveryRequest,
        data: {
          ...mockDeliveryRequest.data,
          fromEmail: 'custom@example.com',
        },
      };

      await service.send(requestWithFromEmail);

      expect(mailClient.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          fromEmail: 'custom@example.com',
        }),
      );
    });
  });

  describe('notification type to email template mapping', () => {
    const templateTestCases = [
      {
        type: NotificationType.NOTIFICATION_TYPE_ADMIN_INVITE,
        template: EmailTemplate.EMAIL_TEMPLATE_ADMIN_INVITE,
      },
      {
        type: NotificationType.NOTIFICATION_TYPE_PARTNER_INVITE,
        template: EmailTemplate.EMAIL_TEMPLATE_PARTNER_INVITE,
      },
      {
        type: NotificationType.NOTIFICATION_TYPE_PASSWORD_RESET,
        template: EmailTemplate.EMAIL_TEMPLATE_PASSWORD_RESET,
      },
      {
        type: NotificationType.NOTIFICATION_TYPE_MFA_CODE,
        template: EmailTemplate.EMAIL_TEMPLATE_MFA_CODE,
      },
      {
        type: NotificationType.NOTIFICATION_TYPE_ACCOUNT_LOCKED,
        template: EmailTemplate.EMAIL_TEMPLATE_ACCOUNT_LOCKED,
      },
      {
        type: NotificationType.NOTIFICATION_TYPE_SYSTEM,
        template: EmailTemplate.EMAIL_TEMPLATE_UNSPECIFIED,
      },
      {
        type: NotificationType.NOTIFICATION_TYPE_SECURITY_ALERT,
        template: EmailTemplate.EMAIL_TEMPLATE_UNSPECIFIED,
      },
      {
        type: NotificationType.NOTIFICATION_TYPE_MARKETING,
        template: EmailTemplate.EMAIL_TEMPLATE_UNSPECIFIED,
      },
    ];

    templateTestCases.forEach(({ type, template }) => {
      it(`should map ${NotificationType[type]} to ${EmailTemplate[template]}`, async () => {
        mailClient.sendEmail.mockResolvedValue({
          success: true,
          emailLogId: 'email-log-123',
          message: 'Success',
        });

        const request: ChannelDeliveryRequest = {
          ...mockDeliveryRequest,
          type,
        };

        await service.send(request);

        expect(mailClient.sendEmail).toHaveBeenCalledWith(
          expect.objectContaining({
            template,
          }),
        );
      });
    });
  });

  describe('sendToEmail', () => {
    it('should send email directly to address', async () => {
      mailClient.sendEmail.mockResolvedValue({
        success: true,
        emailLogId: 'email-log-456',
        message: 'Success',
      });

      const result = await service.sendToEmail(
        'tenant-1',
        'account-1',
        'direct@example.com',
        EmailTemplate.EMAIL_TEMPLATE_WELCOME,
        { name: 'Test User' },
        'ko',
      );

      expect(result.success).toBe(true);
      expect(result.externalId).toBe('email-log-456');
      expect(mailClient.sendEmail).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        toEmail: 'direct@example.com',
        template: EmailTemplate.EMAIL_TEMPLATE_WELCOME,
        locale: 'ko',
        variables: { name: 'Test User' },
        sourceService: 'notification-service',
        fromEmail: 'noreply@example.com',
      });
    });

    it('should use default locale when not provided', async () => {
      mailClient.sendEmail.mockResolvedValue({
        success: true,
        emailLogId: 'email-log-789',
        message: 'Success',
      });

      await service.sendToEmail(
        'tenant-1',
        'account-1',
        'user@example.com',
        EmailTemplate.EMAIL_TEMPLATE_PASSWORD_RESET,
        { resetLink: 'https://example.com/reset' },
      );

      expect(mailClient.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          locale: 'en',
        }),
      );
    });

    it('should handle sendToEmail errors gracefully', async () => {
      mailClient.sendEmail.mockRejectedValue(new Error('Connection timeout'));

      const result = await service.sendToEmail(
        'tenant-1',
        'account-1',
        'user@example.com',
        EmailTemplate.EMAIL_TEMPLATE_MFA_CODE,
        { code: '123456' },
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Email error');
    });

    it('should use fromEmail from variables when provided', async () => {
      mailClient.sendEmail.mockResolvedValue({
        success: true,
        emailLogId: 'email-log-123',
        message: 'Success',
      });

      await service.sendToEmail(
        'tenant-1',
        'account-1',
        'user@example.com',
        EmailTemplate.EMAIL_TEMPLATE_ADMIN_INVITE,
        {
          inviterName: 'Admin',
          fromEmail: 'admin@custom.com',
        },
      );

      expect(mailClient.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          fromEmail: 'admin@custom.com',
        }),
      );
    });

    it('should propagate mail service failure messages', async () => {
      mailClient.sendEmail.mockResolvedValue({
        success: false,
        emailLogId: '',
        message: 'Rate limit exceeded',
      });

      const result = await service.sendToEmail(
        'tenant-1',
        'account-1',
        'user@example.com',
        EmailTemplate.EMAIL_TEMPLATE_WELCOME,
        {},
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded');
    });
  });

  describe('locale handling', () => {
    it('should use provided locale', async () => {
      mailClient.sendEmail.mockResolvedValue({
        success: true,
        emailLogId: 'email-log-123',
        message: 'Success',
      });

      const koreanRequest: ChannelDeliveryRequest = {
        ...mockDeliveryRequest,
        locale: 'ko',
      };

      await service.send(koreanRequest);

      expect(mailClient.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          locale: 'ko',
        }),
      );
    });

    it('should default to en when locale is empty', async () => {
      mailClient.sendEmail.mockResolvedValue({
        success: true,
        emailLogId: 'email-log-123',
        message: 'Success',
      });

      const noLocaleRequest: ChannelDeliveryRequest = {
        ...mockDeliveryRequest,
        locale: '',
      };

      await service.send(noLocaleRequest);

      expect(mailClient.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          locale: 'en',
        }),
      );
    });
  });
});
