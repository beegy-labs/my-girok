import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { ChannelRouterService } from './channel-router.service';
import { InappService } from './inapp/inapp.service';
import { PushService } from './push/push.service';
import { SmsService } from './sms/sms.service';
import { EmailService } from './email/email.service';
import { PreferencesService } from '../preferences/preferences.service';
import { QuietHoursService } from '../quiet-hours/quiet-hours.service';
import {
  NotificationChannel,
  NotificationType,
  Priority,
  ChannelDeliveryRequest,
} from '../notification/notification.interface';

describe('ChannelRouterService', () => {
  let service: ChannelRouterService;
  let inappService: { send: Mock };
  let pushService: { send: Mock };
  let smsService: { send: Mock };
  let emailService: { send: Mock };
  let preferencesService: { getEnabledChannelsForType: Mock };
  let quietHoursService: { shouldSuppressNotification: Mock };

  const mockDeliveryRequest: ChannelDeliveryRequest = {
    notificationId: 'notif-123',
    tenantId: 'tenant-1',
    accountId: 'account-1',
    type: NotificationType.NOTIFICATION_TYPE_SYSTEM,
    channel: NotificationChannel.NOTIFICATION_CHANNEL_UNSPECIFIED,
    title: 'Test Notification',
    body: 'This is a test',
    data: {},
    locale: 'en',
    priority: Priority.PRIORITY_NORMAL,
  };

  beforeEach(async () => {
    const mockInappService = { send: vi.fn() };
    const mockPushService = { send: vi.fn() };
    const mockSmsService = { send: vi.fn() };
    const mockEmailService = { send: vi.fn() };
    const mockPreferencesService = { getEnabledChannelsForType: vi.fn() };
    const mockQuietHoursService = { shouldSuppressNotification: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelRouterService,
        { provide: InappService, useValue: mockInappService },
        { provide: PushService, useValue: mockPushService },
        { provide: SmsService, useValue: mockSmsService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: PreferencesService, useValue: mockPreferencesService },
        { provide: QuietHoursService, useValue: mockQuietHoursService },
      ],
    }).compile();

    service = module.get<ChannelRouterService>(ChannelRouterService);
    inappService = module.get(InappService);
    pushService = module.get(PushService);
    smsService = module.get(SmsService);
    emailService = module.get(EmailService);
    preferencesService = module.get(PreferencesService);
    quietHoursService = module.get(QuietHoursService);
  });

  describe('route', () => {
    it('should route to correct channels based on preferences', async () => {
      preferencesService.getEnabledChannelsForType.mockResolvedValue([
        NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
        NotificationChannel.NOTIFICATION_CHANNEL_EMAIL,
      ]);
      quietHoursService.shouldSuppressNotification.mockResolvedValue(false);
      inappService.send.mockResolvedValue({ success: true });
      emailService.send.mockResolvedValue({ success: true });

      const results = await service.route(mockDeliveryRequest, [
        NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
        NotificationChannel.NOTIFICATION_CHANNEL_PUSH,
        NotificationChannel.NOTIFICATION_CHANNEL_EMAIL,
      ]);

      expect(results).toHaveLength(2);
      expect(inappService.send).toHaveBeenCalled();
      expect(emailService.send).toHaveBeenCalled();
      expect(pushService.send).not.toHaveBeenCalled();
    });

    it('should return empty array when no channels are enabled', async () => {
      preferencesService.getEnabledChannelsForType.mockResolvedValue([]);

      const results = await service.route(mockDeliveryRequest, [
        NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
      ]);

      expect(results).toHaveLength(0);
      expect(inappService.send).not.toHaveBeenCalled();
    });

    it('should route to all specified channels', async () => {
      preferencesService.getEnabledChannelsForType.mockResolvedValue([
        NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
        NotificationChannel.NOTIFICATION_CHANNEL_PUSH,
        NotificationChannel.NOTIFICATION_CHANNEL_SMS,
        NotificationChannel.NOTIFICATION_CHANNEL_EMAIL,
      ]);
      quietHoursService.shouldSuppressNotification.mockResolvedValue(false);
      inappService.send.mockResolvedValue({ success: true });
      pushService.send.mockResolvedValue({ success: true });
      smsService.send.mockResolvedValue({ success: true });
      emailService.send.mockResolvedValue({ success: true });

      const results = await service.route(mockDeliveryRequest, [
        NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
        NotificationChannel.NOTIFICATION_CHANNEL_PUSH,
        NotificationChannel.NOTIFICATION_CHANNEL_SMS,
        NotificationChannel.NOTIFICATION_CHANNEL_EMAIL,
      ]);

      expect(results).toHaveLength(4);
      expect(inappService.send).toHaveBeenCalled();
      expect(pushService.send).toHaveBeenCalled();
      expect(smsService.send).toHaveBeenCalled();
      expect(emailService.send).toHaveBeenCalled();
    });
  });

  describe('preference checking', () => {
    it('should check preferences before routing', async () => {
      preferencesService.getEnabledChannelsForType.mockResolvedValue([]);

      await service.route(mockDeliveryRequest, [NotificationChannel.NOTIFICATION_CHANNEL_IN_APP]);

      expect(preferencesService.getEnabledChannelsForType).toHaveBeenCalledWith(
        'tenant-1',
        'account-1',
        NotificationType.NOTIFICATION_TYPE_SYSTEM,
        [NotificationChannel.NOTIFICATION_CHANNEL_IN_APP],
      );
    });

    it('should filter out disabled channels', async () => {
      preferencesService.getEnabledChannelsForType.mockResolvedValue([
        NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
      ]);
      quietHoursService.shouldSuppressNotification.mockResolvedValue(false);
      inappService.send.mockResolvedValue({ success: true });

      const results = await service.route(mockDeliveryRequest, [
        NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
        NotificationChannel.NOTIFICATION_CHANNEL_PUSH,
        NotificationChannel.NOTIFICATION_CHANNEL_EMAIL,
      ]);

      expect(results).toHaveLength(1);
      expect(results[0].channel).toBe(NotificationChannel.NOTIFICATION_CHANNEL_IN_APP);
    });
  });

  describe('quiet hours checking', () => {
    it('should suppress notifications during quiet hours', async () => {
      preferencesService.getEnabledChannelsForType.mockResolvedValue([
        NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
        NotificationChannel.NOTIFICATION_CHANNEL_PUSH,
      ]);
      quietHoursService.shouldSuppressNotification.mockResolvedValue(true);
      inappService.send.mockResolvedValue({ success: true });

      const results = await service.route(mockDeliveryRequest, [
        NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
        NotificationChannel.NOTIFICATION_CHANNEL_PUSH,
      ]);

      // Only in-app should be sent during quiet hours
      expect(results).toHaveLength(1);
      expect(results[0].channel).toBe(NotificationChannel.NOTIFICATION_CHANNEL_IN_APP);
      expect(pushService.send).not.toHaveBeenCalled();
    });

    it('should still send in-app notifications during quiet hours', async () => {
      preferencesService.getEnabledChannelsForType.mockResolvedValue([
        NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
        NotificationChannel.NOTIFICATION_CHANNEL_PUSH,
      ]);
      quietHoursService.shouldSuppressNotification.mockResolvedValue(true);
      inappService.send.mockResolvedValue({ success: true });

      await service.route(mockDeliveryRequest, [
        NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
        NotificationChannel.NOTIFICATION_CHANNEL_PUSH,
      ]);

      expect(inappService.send).toHaveBeenCalled();
    });

    it('should not send in-app during quiet hours if not in enabled channels', async () => {
      preferencesService.getEnabledChannelsForType.mockResolvedValue([
        NotificationChannel.NOTIFICATION_CHANNEL_PUSH,
      ]);
      quietHoursService.shouldSuppressNotification.mockResolvedValue(true);

      const results = await service.route(mockDeliveryRequest, [
        NotificationChannel.NOTIFICATION_CHANNEL_PUSH,
      ]);

      expect(results).toHaveLength(0);
      expect(inappService.send).not.toHaveBeenCalled();
    });
  });

  describe('URGENT priority bypass', () => {
    it('should bypass quiet hours for URGENT priority', async () => {
      const urgentRequest: ChannelDeliveryRequest = {
        ...mockDeliveryRequest,
        priority: Priority.PRIORITY_URGENT,
      };

      preferencesService.getEnabledChannelsForType.mockResolvedValue([
        NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
        NotificationChannel.NOTIFICATION_CHANNEL_PUSH,
      ]);
      quietHoursService.shouldSuppressNotification.mockResolvedValue(false);
      inappService.send.mockResolvedValue({ success: true });
      pushService.send.mockResolvedValue({ success: true });

      const results = await service.route(urgentRequest, [
        NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
        NotificationChannel.NOTIFICATION_CHANNEL_PUSH,
      ]);

      expect(results).toHaveLength(2);
      expect(quietHoursService.shouldSuppressNotification).toHaveBeenCalledWith(
        'tenant-1',
        'account-1',
        Priority.PRIORITY_URGENT,
      );
    });
  });

  describe('sendToChannel', () => {
    it('should route to in-app channel', async () => {
      inappService.send.mockResolvedValue({ success: true });

      const result = await service.sendToChannel(
        NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
        mockDeliveryRequest,
      );

      expect(result.success).toBe(true);
      expect(inappService.send).toHaveBeenCalledWith(mockDeliveryRequest);
    });

    it('should route to push channel', async () => {
      pushService.send.mockResolvedValue({ success: true });

      const result = await service.sendToChannel(
        NotificationChannel.NOTIFICATION_CHANNEL_PUSH,
        mockDeliveryRequest,
      );

      expect(result.success).toBe(true);
      expect(pushService.send).toHaveBeenCalledWith(mockDeliveryRequest);
    });

    it('should route to SMS channel', async () => {
      smsService.send.mockResolvedValue({ success: true });

      const result = await service.sendToChannel(
        NotificationChannel.NOTIFICATION_CHANNEL_SMS,
        mockDeliveryRequest,
      );

      expect(result.success).toBe(true);
      expect(smsService.send).toHaveBeenCalledWith(mockDeliveryRequest);
    });

    it('should route to email channel', async () => {
      emailService.send.mockResolvedValue({ success: true });

      const result = await service.sendToChannel(
        NotificationChannel.NOTIFICATION_CHANNEL_EMAIL,
        mockDeliveryRequest,
      );

      expect(result.success).toBe(true);
      expect(emailService.send).toHaveBeenCalledWith(mockDeliveryRequest);
    });

    it('should return failure for unknown channel', async () => {
      const result = await service.sendToChannel(
        NotificationChannel.NOTIFICATION_CHANNEL_UNSPECIFIED,
        mockDeliveryRequest,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown channel');
    });
  });

  describe('sendToAllChannels', () => {
    it('should send to all channels without preference checking', async () => {
      inappService.send.mockResolvedValue({ success: true });
      pushService.send.mockResolvedValue({ success: true });
      emailService.send.mockResolvedValue({ success: true });

      const results = await service.sendToAllChannels(mockDeliveryRequest, [
        NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
        NotificationChannel.NOTIFICATION_CHANNEL_PUSH,
        NotificationChannel.NOTIFICATION_CHANNEL_EMAIL,
      ]);

      expect(results).toHaveLength(3);
      expect(preferencesService.getEnabledChannelsForType).not.toHaveBeenCalled();
    });
  });

  describe('isSecurityNotification', () => {
    it('should identify security-related notifications', () => {
      expect(
        service.isSecurityNotification(NotificationType.NOTIFICATION_TYPE_SECURITY_ALERT),
      ).toBe(true);
      expect(service.isSecurityNotification(NotificationType.NOTIFICATION_TYPE_MFA_CODE)).toBe(
        true,
      );
      expect(
        service.isSecurityNotification(NotificationType.NOTIFICATION_TYPE_ACCOUNT_LOCKED),
      ).toBe(true);
      expect(service.isSecurityNotification(NotificationType.NOTIFICATION_TYPE_LOGIN_ALERT)).toBe(
        true,
      );
      expect(
        service.isSecurityNotification(NotificationType.NOTIFICATION_TYPE_PASSWORD_RESET),
      ).toBe(true);
    });

    it('should identify non-security notifications', () => {
      expect(service.isSecurityNotification(NotificationType.NOTIFICATION_TYPE_SYSTEM)).toBe(false);
      expect(service.isSecurityNotification(NotificationType.NOTIFICATION_TYPE_MARKETING)).toBe(
        false,
      );
      expect(service.isSecurityNotification(NotificationType.NOTIFICATION_TYPE_ADMIN_INVITE)).toBe(
        false,
      );
    });
  });

  describe('getRecommendedChannels', () => {
    it('should return all channels for HIGH priority', () => {
      const channels = service.getRecommendedChannels(
        NotificationType.NOTIFICATION_TYPE_SYSTEM,
        Priority.PRIORITY_HIGH,
      );

      expect(channels).toContain(NotificationChannel.NOTIFICATION_CHANNEL_IN_APP);
      expect(channels).toContain(NotificationChannel.NOTIFICATION_CHANNEL_PUSH);
      expect(channels).toContain(NotificationChannel.NOTIFICATION_CHANNEL_EMAIL);
    });

    it('should return all channels for URGENT priority', () => {
      const channels = service.getRecommendedChannels(
        NotificationType.NOTIFICATION_TYPE_SYSTEM,
        Priority.PRIORITY_URGENT,
      );

      expect(channels).toContain(NotificationChannel.NOTIFICATION_CHANNEL_IN_APP);
      expect(channels).toContain(NotificationChannel.NOTIFICATION_CHANNEL_PUSH);
      expect(channels).toContain(NotificationChannel.NOTIFICATION_CHANNEL_EMAIL);
    });

    it('should return all channels for security notifications', () => {
      const channels = service.getRecommendedChannels(
        NotificationType.NOTIFICATION_TYPE_SECURITY_ALERT,
        Priority.PRIORITY_NORMAL,
      );

      expect(channels).toContain(NotificationChannel.NOTIFICATION_CHANNEL_IN_APP);
      expect(channels).toContain(NotificationChannel.NOTIFICATION_CHANNEL_PUSH);
      expect(channels).toContain(NotificationChannel.NOTIFICATION_CHANNEL_EMAIL);
    });

    it('should return only email for marketing notifications', () => {
      const channels = service.getRecommendedChannels(
        NotificationType.NOTIFICATION_TYPE_MARKETING,
        Priority.PRIORITY_NORMAL,
      );

      expect(channels).toEqual([NotificationChannel.NOTIFICATION_CHANNEL_EMAIL]);
    });

    it('should return in-app and email for default notifications', () => {
      const channels = service.getRecommendedChannels(
        NotificationType.NOTIFICATION_TYPE_SYSTEM,
        Priority.PRIORITY_NORMAL,
      );

      expect(channels).toContain(NotificationChannel.NOTIFICATION_CHANNEL_IN_APP);
      expect(channels).toContain(NotificationChannel.NOTIFICATION_CHANNEL_EMAIL);
      expect(channels).not.toContain(NotificationChannel.NOTIFICATION_CHANNEL_PUSH);
    });
  });
});
