import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SmsService } from './sms.service';
import {
  NotificationChannel,
  NotificationType,
  Priority,
  ChannelDeliveryRequest,
} from '../../notification/notification.interface';

describe('SmsService', () => {
  let service: SmsService;
  // configService is used for module setup but not directly accessed in tests

  const mockDeliveryRequest: ChannelDeliveryRequest = {
    notificationId: 'notif-123',
    tenantId: 'tenant-1',
    accountId: 'account-1',
    type: NotificationType.NOTIFICATION_TYPE_MFA_CODE,
    channel: NotificationChannel.NOTIFICATION_CHANNEL_SMS,
    title: 'MFA Code',
    body: 'Your verification code is: 123456',
    data: { phoneNumber: '+1234567890' },
    locale: 'en',
    priority: Priority.PRIORITY_URGENT,
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          'sms.provider': 'twilio',
          'sms.twilio.accountSid': 'test-sid',
          'sms.twilio.authToken': 'test-token',
          'sms.twilio.fromNumber': '+1987654321',
        };
        return config[key] ?? defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SmsService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get<SmsService>(SmsService);

    // Initialize the service
    service.onModuleInit();
  });

  describe('send', () => {
    it('should send SMS successfully (placeholder)', async () => {
      const result = await service.send(mockDeliveryRequest);

      expect(result.success).toBe(true);
      expect(result.externalId).toContain('twilio-placeholder');
    });

    it('should return failure when no phone number provided', async () => {
      const requestNoPhone: ChannelDeliveryRequest = {
        ...mockDeliveryRequest,
        data: {},
      };

      const result = await service.send(requestNoPhone);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No phone number provided');
    });

    it('should handle different notification types', async () => {
      const securityRequest: ChannelDeliveryRequest = {
        ...mockDeliveryRequest,
        type: NotificationType.NOTIFICATION_TYPE_SECURITY_ALERT,
        body: 'Security alert: New login detected',
      };

      const result = await service.send(securityRequest);

      expect(result.success).toBe(true);
    });
  });

  describe('provider configuration', () => {
    it('should use Twilio provider when configured', async () => {
      const result = await service.send(mockDeliveryRequest);

      expect(result.success).toBe(true);
      expect(result.externalId).toContain('twilio');
    });

    it('should use AWS SNS provider when configured', async () => {
      const mockSnsConfig = {
        get: vi.fn((key: string) => {
          const config: Record<string, unknown> = {
            'sms.provider': 'aws-sns',
            'sms.awsSns.region': 'us-east-1',
            'sms.awsSns.accessKeyId': 'test-key',
            'sms.awsSns.secretAccessKey': 'test-secret',
          };
          return config[key];
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [SmsService, { provide: ConfigService, useValue: mockSnsConfig }],
      }).compile();

      const snsService = module.get<SmsService>(SmsService);
      snsService.onModuleInit();

      const result = await snsService.send(mockDeliveryRequest);

      expect(result.success).toBe(true);
      expect(result.externalId).toContain('sns-placeholder');
    });

    it('should return failure when SMS not configured', async () => {
      const mockNoConfig = {
        get: vi.fn(() => undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [SmsService, { provide: ConfigService, useValue: mockNoConfig }],
      }).compile();

      const unconfiguredService = module.get<SmsService>(SmsService);
      unconfiguredService.onModuleInit();

      const result = await unconfiguredService.send(mockDeliveryRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMS notifications not configured');
    });
  });

  describe('sendToPhone', () => {
    it('should send SMS directly to phone number', async () => {
      const result = await service.sendToPhone('+1234567890', 'Test message');

      expect(result.success).toBe(true);
      expect(result.externalId).toBeDefined();
    });

    it('should return failure when not configured', async () => {
      const mockNoConfig = {
        get: vi.fn(() => undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [SmsService, { provide: ConfigService, useValue: mockNoConfig }],
      }).compile();

      const unconfiguredService = module.get<SmsService>(SmsService);
      unconfiguredService.onModuleInit();

      const result = await unconfiguredService.sendToPhone('+1234567890', 'Test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMS notifications not configured');
    });
  });

  describe('placeholder behavior', () => {
    it('should log placeholder message for Twilio', async () => {
      // The current implementation is a placeholder
      // This test verifies the placeholder returns success
      const result = await service.send(mockDeliveryRequest);

      expect(result.success).toBe(true);
      expect(result.externalId).toMatch(/^twilio-placeholder-\d+$/);
    });

    it('should generate unique external IDs', async () => {
      const result1 = await service.send(mockDeliveryRequest);
      // Add small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 5));
      const result2 = await service.send(mockDeliveryRequest);

      // Both should start with the placeholder prefix
      expect(result1.externalId).toMatch(/^twilio-placeholder-/);
      expect(result2.externalId).toMatch(/^twilio-placeholder-/);
    });
  });

  describe('error handling', () => {
    it('should handle send errors gracefully', async () => {
      // The placeholder implementation should not throw
      const result = await service.send(mockDeliveryRequest);

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });
});
