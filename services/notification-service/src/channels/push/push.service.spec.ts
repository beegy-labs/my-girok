import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { PushService } from './push.service';
import { DeviceTokenService } from '../../device-token/device-token.service';
import {
  NotificationChannel,
  NotificationType,
  Priority,
  ChannelDeliveryRequest,
} from '../../notification/notification.interface';

// Mock firebase-admin
vi.mock('firebase-admin', () => ({
  default: {
    apps: [],
    initializeApp: vi.fn(),
    credential: {
      cert: vi.fn(),
    },
    messaging: vi.fn(() => ({
      sendEachForMulticast: vi.fn(),
    })),
  },
  apps: [],
  initializeApp: vi.fn(),
  credential: {
    cert: vi.fn(),
  },
  messaging: vi.fn(() => ({
    sendEachForMulticast: vi.fn(),
  })),
}));

import * as admin from 'firebase-admin';

describe('PushService', () => {
  let service: PushService;
  // configService is used for module setup but not directly accessed in tests
  let deviceTokenService: {
    getActiveTokensForAccount: Mock;
    removeInvalidToken: Mock;
  };
  let mockMessaging: {
    sendEachForMulticast: Mock;
  };

  const mockDeliveryRequest: ChannelDeliveryRequest = {
    notificationId: 'notif-123',
    tenantId: 'tenant-1',
    accountId: 'account-1',
    type: NotificationType.NOTIFICATION_TYPE_SYSTEM,
    channel: NotificationChannel.NOTIFICATION_CHANNEL_PUSH,
    title: 'Test Push',
    body: 'This is a test push notification',
    data: { key: 'value' },
    locale: 'en',
    priority: Priority.PRIORITY_NORMAL,
  };

  beforeEach(async () => {
    mockMessaging = {
      sendEachForMulticast: vi.fn(),
    };

    (admin.messaging as unknown as Mock).mockReturnValue(mockMessaging);

    const mockConfigService = {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          'firebase.projectId': 'test-project',
          'firebase.privateKey': 'test-key',
          'firebase.clientEmail': 'test@test.iam.gserviceaccount.com',
        };
        return config[key] ?? defaultValue;
      }),
    };

    const mockDeviceTokenService = {
      getActiveTokensForAccount: vi.fn(),
      removeInvalidToken: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: DeviceTokenService, useValue: mockDeviceTokenService },
      ],
    }).compile();

    service = module.get<PushService>(PushService);
    deviceTokenService = module.get(DeviceTokenService);

    // Initialize the service
    service.onModuleInit();
  });

  describe('send', () => {
    it('should send push notification successfully', async () => {
      deviceTokenService.getActiveTokensForAccount.mockResolvedValue(['token-1', 'token-2']);
      mockMessaging.sendEachForMulticast.mockResolvedValue({
        successCount: 2,
        failureCount: 0,
        responses: [
          { success: true, messageId: 'msg-1' },
          { success: true, messageId: 'msg-2' },
        ],
      });

      const result = await service.send(mockDeliveryRequest);

      expect(result.success).toBe(true);
      expect(result.externalId).toBe('msg-1');
      expect(mockMessaging.sendEachForMulticast).toHaveBeenCalled();
    });

    it('should return failure when no device tokens exist', async () => {
      deviceTokenService.getActiveTokensForAccount.mockResolvedValue([]);

      const result = await service.send(mockDeliveryRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No registered devices');
      expect(mockMessaging.sendEachForMulticast).not.toHaveBeenCalled();
    });

    it('should handle partial delivery failures', async () => {
      deviceTokenService.getActiveTokensForAccount.mockResolvedValue(['token-1', 'token-2']);
      mockMessaging.sendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 1,
        responses: [
          { success: true, messageId: 'msg-1' },
          { success: false, error: { code: 'messaging/internal-error' } },
        ],
      });

      const result = await service.send(mockDeliveryRequest);

      expect(result.success).toBe(true);
      expect(result.error).toContain('1 device(s) failed');
    });

    it('should remove invalid tokens', async () => {
      deviceTokenService.getActiveTokensForAccount.mockResolvedValue([
        'valid-token',
        'invalid-token',
      ]);
      mockMessaging.sendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 1,
        responses: [
          { success: true, messageId: 'msg-1' },
          { success: false, error: { code: 'messaging/invalid-registration-token' } },
        ],
      });

      await service.send(mockDeliveryRequest);

      expect(deviceTokenService.removeInvalidToken).toHaveBeenCalledWith('invalid-token');
    });

    it('should remove unregistered tokens', async () => {
      deviceTokenService.getActiveTokensForAccount.mockResolvedValue(['token-1']);
      mockMessaging.sendEachForMulticast.mockResolvedValue({
        successCount: 0,
        failureCount: 1,
        responses: [
          { success: false, error: { code: 'messaging/registration-token-not-registered' } },
        ],
      });

      await service.send(mockDeliveryRequest);

      expect(deviceTokenService.removeInvalidToken).toHaveBeenCalledWith('token-1');
    });

    it('should handle FCM errors gracefully', async () => {
      deviceTokenService.getActiveTokensForAccount.mockResolvedValue(['token-1']);
      mockMessaging.sendEachForMulticast.mockRejectedValue(new Error('FCM service unavailable'));

      const result = await service.send(mockDeliveryRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('FCM error');
    });

    it('should include notification data in message', async () => {
      deviceTokenService.getActiveTokensForAccount.mockResolvedValue(['token-1']);
      mockMessaging.sendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true, messageId: 'msg-1' }],
      });

      await service.send(mockDeliveryRequest);

      expect(mockMessaging.sendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens: ['token-1'],
          notification: {
            title: 'Test Push',
            body: 'This is a test push notification',
          },
          data: expect.objectContaining({
            key: 'value',
            notificationId: 'notif-123',
          }),
        }),
      );
    });
  });

  describe('send with different priorities', () => {
    it('should set high priority for URGENT notifications', async () => {
      deviceTokenService.getActiveTokensForAccount.mockResolvedValue(['token-1']);
      mockMessaging.sendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true, messageId: 'msg-1' }],
      });

      const urgentRequest: ChannelDeliveryRequest = {
        ...mockDeliveryRequest,
        priority: Priority.PRIORITY_URGENT,
      };

      await service.send(urgentRequest);

      expect(mockMessaging.sendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          android: expect.objectContaining({
            priority: 'high',
            notification: expect.objectContaining({
              channelId: 'urgent',
            }),
          }),
          apns: expect.objectContaining({
            headers: expect.objectContaining({
              'apns-priority': '10',
            }),
          }),
        }),
      );
    });

    it('should set high priority for HIGH priority notifications', async () => {
      deviceTokenService.getActiveTokensForAccount.mockResolvedValue(['token-1']);
      mockMessaging.sendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true, messageId: 'msg-1' }],
      });

      const highRequest: ChannelDeliveryRequest = {
        ...mockDeliveryRequest,
        priority: Priority.PRIORITY_HIGH,
      };

      await service.send(highRequest);

      expect(mockMessaging.sendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          android: expect.objectContaining({
            priority: 'high',
            notification: expect.objectContaining({
              channelId: 'high',
            }),
          }),
        }),
      );
    });

    it('should set normal priority for NORMAL notifications', async () => {
      deviceTokenService.getActiveTokensForAccount.mockResolvedValue(['token-1']);
      mockMessaging.sendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true, messageId: 'msg-1' }],
      });

      await service.send(mockDeliveryRequest);

      expect(mockMessaging.sendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          android: expect.objectContaining({
            priority: 'normal',
            notification: expect.objectContaining({
              channelId: 'default',
            }),
          }),
          apns: expect.objectContaining({
            headers: expect.objectContaining({
              'apns-priority': '5',
            }),
          }),
        }),
      );
    });
  });

  describe('batch sending (sendToTokens)', () => {
    it('should send to multiple tokens directly', async () => {
      mockMessaging.sendEachForMulticast.mockResolvedValue({
        successCount: 3,
        failureCount: 0,
        responses: [
          { success: true, messageId: 'msg-1' },
          { success: true, messageId: 'msg-2' },
          { success: true, messageId: 'msg-3' },
        ],
      });

      const result = await service.sendToTokens(
        ['token-1', 'token-2', 'token-3'],
        'Batch Title',
        'Batch Body',
        { action: 'open' },
        Priority.PRIORITY_NORMAL,
      );

      expect(result.success).toBe(true);
      expect(mockMessaging.sendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens: ['token-1', 'token-2', 'token-3'],
          notification: {
            title: 'Batch Title',
            body: 'Batch Body',
          },
          data: { action: 'open' },
        }),
      );
    });

    it('should return failure for empty tokens array', async () => {
      const result = await service.sendToTokens([], 'Title', 'Body');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No tokens provided');
    });

    it('should handle batch partial failures', async () => {
      mockMessaging.sendEachForMulticast.mockResolvedValue({
        successCount: 2,
        failureCount: 1,
        responses: [
          { success: true, messageId: 'msg-1' },
          { success: true, messageId: 'msg-2' },
          { success: false, error: { code: 'messaging/internal-error' } },
        ],
      });

      const result = await service.sendToTokens(['token-1', 'token-2', 'token-3'], 'Title', 'Body');

      expect(result.success).toBe(true);
      expect(result.error).toContain('1 failed');
    });
  });

  describe('Firebase initialization', () => {
    it('should not send when Firebase is not configured', async () => {
      // Create a new instance with missing credentials
      const mockConfigNoCredentials = {
        get: vi.fn(() => undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PushService,
          { provide: ConfigService, useValue: mockConfigNoCredentials },
          { provide: DeviceTokenService, useValue: deviceTokenService },
        ],
      }).compile();

      const unconfiguredService = module.get<PushService>(PushService);
      unconfiguredService.onModuleInit();

      const result = await unconfiguredService.send(mockDeliveryRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Push notifications not configured');
    });
  });

  describe('web push configuration', () => {
    it('should include web push options for high priority', async () => {
      deviceTokenService.getActiveTokensForAccount.mockResolvedValue(['token-1']);
      mockMessaging.sendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true, messageId: 'msg-1' }],
      });

      const highRequest: ChannelDeliveryRequest = {
        ...mockDeliveryRequest,
        priority: Priority.PRIORITY_HIGH,
        data: { link: 'https://example.com/action' },
      };

      await service.send(highRequest);

      expect(mockMessaging.sendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          webpush: expect.objectContaining({
            notification: expect.objectContaining({
              requireInteraction: true,
            }),
            fcmOptions: expect.objectContaining({
              link: 'https://example.com/action',
            }),
          }),
        }),
      );
    });
  });
});
