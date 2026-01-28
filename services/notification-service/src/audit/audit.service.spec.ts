import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { AuditService } from './audit.service';
import {
  AuditGrpcClient,
  AccountType,
  AuthEventType,
  AuthEventResult,
} from '../grpc-clients/audit.client';
import { NotificationType } from '../notification/notification.interface';

describe('AuditService', () => {
  let service: AuditService;
  let auditClient: {
    logAuthEvent: Mock;
  };

  beforeEach(async () => {
    const mockAuditClient = {
      logAuthEvent: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService, { provide: AuditGrpcClient, useValue: mockAuditClient }],
    }).compile();

    service = module.get<AuditService>(AuditService);
    auditClient = module.get(AuditGrpcClient);
  });

  describe('logNotificationSent', () => {
    it('should log security notification events', async () => {
      auditClient.logAuthEvent.mockResolvedValue({
        success: true,
        eventId: 'event-123',
        message: 'Event logged',
      });

      await service.logNotificationSent({
        accountId: 'account-1',
        notificationType: NotificationType.NOTIFICATION_TYPE_SECURITY_ALERT,
        channels: ['IN_APP', 'PUSH'],
        success: true,
        notificationId: 'notif-123',
        metadata: { sourceService: 'auth-service' },
      });

      expect(auditClient.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'account-1',
          result: AuthEventResult.SUCCESS,
          metadata: expect.objectContaining({
            action: 'NOTIFICATION_SENT',
            notificationId: 'notif-123',
            channels: 'IN_APP,PUSH',
            notificationType: 'SECURITY_ALERT',
          }),
        }),
      );
    });

    it('should not log non-auditable notification types', async () => {
      await service.logNotificationSent({
        accountId: 'account-1',
        notificationType: NotificationType.NOTIFICATION_TYPE_SYSTEM,
        channels: ['IN_APP'],
        success: true,
        notificationId: 'notif-123',
      });

      expect(auditClient.logAuthEvent).not.toHaveBeenCalled();
    });

    it('should not log marketing notifications', async () => {
      await service.logNotificationSent({
        accountId: 'account-1',
        notificationType: NotificationType.NOTIFICATION_TYPE_MARKETING,
        channels: ['EMAIL'],
        success: true,
        notificationId: 'notif-123',
      });

      expect(auditClient.logAuthEvent).not.toHaveBeenCalled();
    });

    it('should log MFA code notifications', async () => {
      auditClient.logAuthEvent.mockResolvedValue({ success: true });

      await service.logNotificationSent({
        accountId: 'account-1',
        notificationType: NotificationType.NOTIFICATION_TYPE_MFA_CODE,
        channels: ['SMS'],
        success: true,
        notificationId: 'notif-123',
      });

      expect(auditClient.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuthEventType.MFA_VERIFIED,
        }),
      );
    });

    it('should log account locked notifications', async () => {
      auditClient.logAuthEvent.mockResolvedValue({ success: true });

      await service.logNotificationSent({
        accountId: 'account-1',
        notificationType: NotificationType.NOTIFICATION_TYPE_ACCOUNT_LOCKED,
        channels: ['EMAIL'],
        success: true,
        notificationId: 'notif-123',
      });

      expect(auditClient.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuthEventType.ACCOUNT_LOCKED,
        }),
      );
    });

    it('should log login alert notifications', async () => {
      auditClient.logAuthEvent.mockResolvedValue({ success: true });

      await service.logNotificationSent({
        accountId: 'account-1',
        notificationType: NotificationType.NOTIFICATION_TYPE_LOGIN_ALERT,
        channels: ['PUSH'],
        success: true,
        notificationId: 'notif-123',
      });

      expect(auditClient.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuthEventType.LOGIN_SUCCESS,
        }),
      );
    });

    it('should log password reset notifications', async () => {
      auditClient.logAuthEvent.mockResolvedValue({ success: true });

      await service.logNotificationSent({
        accountId: 'account-1',
        notificationType: NotificationType.NOTIFICATION_TYPE_PASSWORD_RESET,
        channels: ['EMAIL'],
        success: true,
        notificationId: 'notif-123',
      });

      expect(auditClient.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuthEventType.PASSWORD_CHANGED,
        }),
      );
    });

    it('should log failed notification delivery', async () => {
      auditClient.logAuthEvent.mockResolvedValue({ success: true });

      await service.logNotificationSent({
        accountId: 'account-1',
        notificationType: NotificationType.NOTIFICATION_TYPE_SECURITY_ALERT,
        channels: ['PUSH'],
        success: false,
        notificationId: 'notif-123',
      });

      expect(auditClient.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          result: AuthEventResult.FAILURE,
        }),
      );
    });

    it('should handle audit client errors gracefully', async () => {
      auditClient.logAuthEvent.mockRejectedValue(new Error('Audit service unavailable'));

      // Should not throw
      await expect(
        service.logNotificationSent({
          accountId: 'account-1',
          notificationType: NotificationType.NOTIFICATION_TYPE_SECURITY_ALERT,
          channels: ['IN_APP'],
          success: true,
          notificationId: 'notif-123',
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('logAccountLockedNotification', () => {
    it('should log account locked notification with reason', async () => {
      auditClient.logAuthEvent.mockResolvedValue({ success: true });

      await service.logAccountLockedNotification({
        accountId: 'account-1',
        accountType: AccountType.USER,
        reason: 'Too many failed login attempts',
        notificationId: 'notif-123',
      });

      expect(auditClient.logAuthEvent).toHaveBeenCalledWith({
        eventType: AuthEventType.ACCOUNT_LOCKED,
        accountType: AccountType.USER,
        accountId: 'account-1',
        ipAddress: 'notification-service',
        userAgent: 'notification-service',
        result: AuthEventResult.SUCCESS,
        metadata: {
          action: 'ACCOUNT_LOCKED_NOTIFICATION_SENT',
          notificationId: 'notif-123',
          reason: 'Too many failed login attempts',
        },
      });
    });

    it('should use default account type when not provided', async () => {
      auditClient.logAuthEvent.mockResolvedValue({ success: true });

      await service.logAccountLockedNotification({
        accountId: 'account-1',
        notificationId: 'notif-123',
      });

      expect(auditClient.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          accountType: AccountType.USER,
        }),
      );
    });

    it('should use default reason when not provided', async () => {
      auditClient.logAuthEvent.mockResolvedValue({ success: true });

      await service.logAccountLockedNotification({
        accountId: 'account-1',
        notificationId: 'notif-123',
      });

      expect(auditClient.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            reason: 'Security policy',
          }),
        }),
      );
    });
  });

  describe('logLoginAlertNotification', () => {
    it('should log login alert with location info', async () => {
      auditClient.logAuthEvent.mockResolvedValue({ success: true });

      await service.logLoginAlertNotification({
        accountId: 'account-1',
        accountType: AccountType.ADMIN,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        location: 'Seoul, South Korea',
        notificationId: 'notif-123',
      });

      expect(auditClient.logAuthEvent).toHaveBeenCalledWith({
        eventType: AuthEventType.LOGIN_SUCCESS,
        accountType: AccountType.ADMIN,
        accountId: 'account-1',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        result: AuthEventResult.SUCCESS,
        metadata: {
          action: 'LOGIN_ALERT_NOTIFICATION_SENT',
          notificationId: 'notif-123',
          location: 'Seoul, South Korea',
        },
      });
    });

    it('should use default location when not provided', async () => {
      auditClient.logAuthEvent.mockResolvedValue({ success: true });

      await service.logLoginAlertNotification({
        accountId: 'account-1',
        ipAddress: '10.0.0.1',
        notificationId: 'notif-123',
      });

      expect(auditClient.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            location: 'Unknown',
          }),
        }),
      );
    });
  });

  describe('logMfaCodeSentNotification', () => {
    it('should log MFA code sent via SMS', async () => {
      auditClient.logAuthEvent.mockResolvedValue({ success: true });

      await service.logMfaCodeSentNotification({
        accountId: 'account-1',
        accountType: AccountType.USER,
        method: 'SMS',
        notificationId: 'notif-123',
      });

      expect(auditClient.logAuthEvent).toHaveBeenCalledWith({
        eventType: AuthEventType.MFA_VERIFIED,
        accountType: AccountType.USER,
        accountId: 'account-1',
        ipAddress: 'notification-service',
        userAgent: 'notification-service',
        result: AuthEventResult.SUCCESS,
        metadata: {
          action: 'MFA_CODE_NOTIFICATION_SENT',
          notificationId: 'notif-123',
          method: 'SMS',
        },
      });
    });

    it('should log MFA code sent via EMAIL', async () => {
      auditClient.logAuthEvent.mockResolvedValue({ success: true });

      await service.logMfaCodeSentNotification({
        accountId: 'account-1',
        method: 'EMAIL',
        notificationId: 'notif-123',
      });

      expect(auditClient.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            method: 'EMAIL',
          }),
        }),
      );
    });
  });

  describe('logPasswordResetNotification', () => {
    it('should log password reset notification', async () => {
      auditClient.logAuthEvent.mockResolvedValue({ success: true });

      await service.logPasswordResetNotification({
        accountId: 'account-1',
        accountType: AccountType.USER,
        notificationId: 'notif-123',
      });

      expect(auditClient.logAuthEvent).toHaveBeenCalledWith({
        eventType: AuthEventType.PASSWORD_CHANGED,
        accountType: AccountType.USER,
        accountId: 'account-1',
        ipAddress: 'notification-service',
        userAgent: 'notification-service',
        result: AuthEventResult.SUCCESS,
        metadata: {
          action: 'PASSWORD_RESET_NOTIFICATION_SENT',
          notificationId: 'notif-123',
        },
      });
    });

    it('should handle audit failure gracefully', async () => {
      auditClient.logAuthEvent.mockRejectedValue(new Error('Connection timeout'));

      await expect(
        service.logPasswordResetNotification({
          accountId: 'account-1',
          notificationId: 'notif-123',
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('auditable notification types', () => {
    const auditableTypes = [
      NotificationType.NOTIFICATION_TYPE_SECURITY_ALERT,
      NotificationType.NOTIFICATION_TYPE_MFA_CODE,
      NotificationType.NOTIFICATION_TYPE_ACCOUNT_LOCKED,
      NotificationType.NOTIFICATION_TYPE_LOGIN_ALERT,
      NotificationType.NOTIFICATION_TYPE_PASSWORD_RESET,
    ];

    const nonAuditableTypes = [
      NotificationType.NOTIFICATION_TYPE_UNSPECIFIED,
      NotificationType.NOTIFICATION_TYPE_SYSTEM,
      NotificationType.NOTIFICATION_TYPE_ADMIN_INVITE,
      NotificationType.NOTIFICATION_TYPE_PARTNER_INVITE,
      NotificationType.NOTIFICATION_TYPE_MARKETING,
    ];

    auditableTypes.forEach((type) => {
      it(`should audit ${NotificationType[type]}`, async () => {
        auditClient.logAuthEvent.mockResolvedValue({ success: true });

        await service.logNotificationSent({
          accountId: 'account-1',
          notificationType: type,
          channels: ['IN_APP'],
          success: true,
          notificationId: 'notif-123',
        });

        expect(auditClient.logAuthEvent).toHaveBeenCalled();
      });
    });

    nonAuditableTypes.forEach((type) => {
      it(`should not audit ${NotificationType[type]}`, async () => {
        await service.logNotificationSent({
          accountId: 'account-1',
          notificationType: type,
          channels: ['IN_APP'],
          success: true,
          notificationId: 'notif-123',
        });

        expect(auditClient.logAuthEvent).not.toHaveBeenCalled();
      });
    });
  });
});
