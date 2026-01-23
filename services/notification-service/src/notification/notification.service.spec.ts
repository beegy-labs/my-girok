import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { NotificationService } from './notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChannelRouterService } from '../channels/channel-router.service';

// Type for route results
interface RouteResult {
  channel: NotificationChannel;
  result: { success: boolean; externalId?: string; error?: string };
}
import { InappService } from '../channels/inapp/inapp.service';
import { AuditService } from '../audit/audit.service';
import {
  NotificationChannel,
  NotificationType,
  NotificationStatus,
  Priority,
  SendNotificationRequest,
  SendBulkNotificationRequest,
} from './notification.interface';

// Type for mocked services
type MockPrismaNotification = {
  findFirst: Mock;
  findUnique: Mock;
  create: Mock;
  findMany: Mock;
  count: Mock;
  update: Mock;
  updateMany: Mock;
};

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: { notification: MockPrismaNotification };
  let channelRouter: {
    route: Mock;
    getRecommendedChannels: Mock;
  };
  let inappService: {
    getNotifications: Mock;
    markAsRead: Mock;
    getStatus: Mock;
  };
  let auditService: {
    logNotificationSent: Mock;
  };

  const mockNotification = {
    id: 'notif-123',
    tenantId: 'tenant-1',
    accountId: 'account-1',
    type: 'SYSTEM',
    channel: 'IN_APP',
    title: 'Test Notification',
    body: 'This is a test notification',
    data: { key: 'value' },
    status: 'DELIVERED',
    sourceService: 'test-service',
    priority: 'NORMAL',
    readAt: null,
    sentAt: new Date(),
    deliveredAt: new Date(),
    error: null,
    retryCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      notification: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
    };

    const mockChannelRouter = {
      route: vi.fn(),
      getRecommendedChannels: vi.fn(),
    };

    const mockInappService = {
      getNotifications: vi.fn(),
      markAsRead: vi.fn(),
      getStatus: vi.fn(),
    };

    const mockAuditService = {
      logNotificationSent: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ChannelRouterService, useValue: mockChannelRouter },
        { provide: InappService, useValue: mockInappService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    prisma = module.get(PrismaService);
    channelRouter = module.get(ChannelRouterService);
    inappService = module.get(InappService);
    auditService = module.get(AuditService);
  });

  describe('sendNotification', () => {
    const validRequest: SendNotificationRequest = {
      tenantId: 'tenant-1',
      accountId: 'account-1',
      type: NotificationType.NOTIFICATION_TYPE_SYSTEM,
      channels: [NotificationChannel.NOTIFICATION_CHANNEL_IN_APP],
      title: 'Test Title',
      body: 'Test Body',
      locale: 'en',
      data: { key: 'value' },
      sourceService: 'test-service',
      priority: Priority.PRIORITY_NORMAL,
    };

    it('should send notification successfully to specified channels', async () => {
      const routeResult: RouteResult[] = [
        {
          channel: NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
          result: { success: true, externalId: 'ext-123' },
        },
      ];

      channelRouter.route.mockResolvedValue(routeResult);
      auditService.logNotificationSent.mockResolvedValue(undefined);

      const result = await service.sendNotification(validRequest);

      expect(result.success).toBe(true);
      expect(result.notificationId).toBeDefined();
      expect(result.message).toContain('Sent to 1 channel(s)');
      expect(channelRouter.route).toHaveBeenCalled();
      expect(auditService.logNotificationSent).toHaveBeenCalled();
    });

    it('should throw validation error when no channels specified', async () => {
      const requestNoChannels: SendNotificationRequest = {
        ...validRequest,
        channels: [],
      };

      await expect(service.sendNotification(requestNoChannels)).rejects.toThrow(
        'at least one channel is required',
      );
      expect(channelRouter.route).not.toHaveBeenCalled();
    });

    it('should throw validation error when tenant_id is missing', async () => {
      const requestNoTenant: SendNotificationRequest = {
        ...validRequest,
        tenantId: '',
      };

      await expect(service.sendNotification(requestNoTenant)).rejects.toThrow(
        'tenant_id is required',
      );
    });

    it('should throw validation error when account_id is missing', async () => {
      const requestNoAccount: SendNotificationRequest = {
        ...validRequest,
        accountId: '',
      };

      await expect(service.sendNotification(requestNoAccount)).rejects.toThrow(
        'account_id is required',
      );
    });

    it('should throw validation error when title is empty', async () => {
      const requestNoTitle: SendNotificationRequest = {
        ...validRequest,
        title: '   ',
      };

      await expect(service.sendNotification(requestNoTitle)).rejects.toThrow('title is required');
    });

    it('should return existing notification for duplicate idempotency key', async () => {
      const requestWithIdempotency: SendNotificationRequest = {
        ...validRequest,
        idempotencyKey: 'idem-key-123',
      };

      prisma.notification.findFirst.mockResolvedValue(mockNotification);

      const result = await service.sendNotification(requestWithIdempotency);

      expect(result.success).toBe(true);
      expect(result.notificationId).toBe('notif-123');
      expect(result.message).toContain('idempotent');
      expect(channelRouter.route).not.toHaveBeenCalled();
    });

    it('should handle failed channel delivery', async () => {
      const routeResult: RouteResult[] = [
        {
          channel: NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
          result: { success: false, error: 'Failed to store' },
        },
      ];

      channelRouter.route.mockResolvedValue(routeResult);
      auditService.logNotificationSent.mockResolvedValue(undefined);

      const result = await service.sendNotification(validRequest);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to send');
    });

    it('should handle partial channel success', async () => {
      const requestMultiChannel: SendNotificationRequest = {
        ...validRequest,
        channels: [
          NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
          NotificationChannel.NOTIFICATION_CHANNEL_PUSH,
        ],
      };

      const routeResult: RouteResult[] = [
        {
          channel: NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
          result: { success: true },
        },
        {
          channel: NotificationChannel.NOTIFICATION_CHANNEL_PUSH,
          result: { success: false, error: 'No device tokens' },
        },
      ];

      channelRouter.route.mockResolvedValue(routeResult);
      auditService.logNotificationSent.mockResolvedValue(undefined);

      const result = await service.sendNotification(requestMultiChannel);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Sent to 1 channel(s)');
    });

    it('should handle routing errors gracefully', async () => {
      channelRouter.route.mockRejectedValue(new Error('Routing failed'));

      const result = await service.sendNotification(validRequest);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to send notification');
    });
  });

  describe('sendBulkNotification', () => {
    const bulkRequest: SendBulkNotificationRequest = {
      tenantId: 'tenant-1',
      sourceService: 'test-service',
      notifications: [
        {
          accountId: 'account-1',
          type: NotificationType.NOTIFICATION_TYPE_SYSTEM,
          channels: [NotificationChannel.NOTIFICATION_CHANNEL_IN_APP],
          title: 'Title 1',
          body: 'Body 1',
          locale: 'en',
          data: {},
          priority: Priority.PRIORITY_NORMAL,
        },
        {
          accountId: 'account-2',
          type: NotificationType.NOTIFICATION_TYPE_SYSTEM,
          channels: [NotificationChannel.NOTIFICATION_CHANNEL_IN_APP],
          title: 'Title 2',
          body: 'Body 2',
          locale: 'en',
          data: {},
          priority: Priority.PRIORITY_NORMAL,
        },
      ],
    };

    it('should send bulk notifications successfully', async () => {
      channelRouter.route.mockResolvedValue([
        {
          channel: NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
          result: { success: true },
        },
      ]);
      auditService.logNotificationSent.mockResolvedValue(undefined);

      const result = await service.sendBulkNotification(bulkRequest);

      expect(result.success).toBe(true);
      expect(result.totalCount).toBe(2);
      expect(result.sentCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.results).toHaveLength(2);
    });

    it('should handle partial bulk failures', async () => {
      channelRouter.route
        .mockResolvedValueOnce([
          {
            channel: NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
            result: { success: true },
          },
        ])
        .mockResolvedValueOnce([
          {
            channel: NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
            result: { success: false, error: 'Failed' },
          },
        ]);
      auditService.logNotificationSent.mockResolvedValue(undefined);

      const result = await service.sendBulkNotification(bulkRequest);

      expect(result.success).toBe(false);
      expect(result.sentCount).toBe(1);
      expect(result.failedCount).toBe(1);
    });

    it('should handle empty notifications array', async () => {
      const emptyRequest: SendBulkNotificationRequest = {
        ...bulkRequest,
        notifications: [],
      };

      const result = await service.sendBulkNotification(emptyRequest);

      expect(result.success).toBe(true);
      expect(result.totalCount).toBe(0);
      expect(result.sentCount).toBe(0);
      expect(result.failedCount).toBe(0);
    });
  });

  describe('getNotifications', () => {
    it('should return paginated notifications', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          type: NotificationType.NOTIFICATION_TYPE_SYSTEM,
          channel: NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
          title: 'Title 1',
          body: 'Body 1',
          data: {},
          status: NotificationStatus.NOTIFICATION_STATUS_DELIVERED,
          sourceService: 'test',
          priority: Priority.PRIORITY_NORMAL,
          createdAt: { seconds: Math.floor(Date.now() / 1000), nanos: 0 },
        },
      ];

      inappService.getNotifications.mockResolvedValue({
        notifications: mockNotifications,
        totalCount: 10,
        unreadCount: 5,
      });

      const result = await service.getNotifications({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        page: 1,
        pageSize: 20,
      });

      expect(result.notifications).toHaveLength(1);
      expect(result.totalCount).toBe(10);
      expect(result.unreadCount).toBe(5);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should filter by channel', async () => {
      inappService.getNotifications.mockResolvedValue({
        notifications: [],
        totalCount: 0,
        unreadCount: 0,
      });

      await service.getNotifications({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        channel: NotificationChannel.NOTIFICATION_CHANNEL_PUSH,
        page: 1,
        pageSize: 20,
      });

      expect(inappService.getNotifications).toHaveBeenCalledWith(
        'tenant-1',
        'account-1',
        expect.objectContaining({
          channel: NotificationChannel.NOTIFICATION_CHANNEL_PUSH,
        }),
      );
    });

    it('should filter unread only', async () => {
      inappService.getNotifications.mockResolvedValue({
        notifications: [],
        totalCount: 0,
        unreadCount: 0,
      });

      await service.getNotifications({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        unreadOnly: true,
        page: 1,
        pageSize: 20,
      });

      expect(inappService.getNotifications).toHaveBeenCalledWith(
        'tenant-1',
        'account-1',
        expect.objectContaining({
          unreadOnly: true,
        }),
      );
    });

    it('should use default pagination values', async () => {
      inappService.getNotifications.mockResolvedValue({
        notifications: [],
        totalCount: 0,
        unreadCount: 0,
      });

      const result = await service.getNotifications({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        page: 0,
        pageSize: 0,
      });

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });
  });

  describe('markAsRead', () => {
    it('should mark notifications as read', async () => {
      inappService.markAsRead.mockResolvedValue({
        success: true,
        updatedCount: 3,
      });

      const result = await service.markAsRead({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        notificationIds: ['notif-1', 'notif-2', 'notif-3'],
      });

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(3);
      expect(inappService.markAsRead).toHaveBeenCalledWith('tenant-1', 'account-1', [
        'notif-1',
        'notif-2',
        'notif-3',
      ]);
    });

    it('should handle no notifications to mark', async () => {
      inappService.markAsRead.mockResolvedValue({
        success: true,
        updatedCount: 0,
      });

      const result = await service.markAsRead({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        notificationIds: [],
      });

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(0);
    });
  });

  describe('getNotificationStatus', () => {
    it('should return notification status', async () => {
      inappService.getStatus.mockResolvedValue({
        notificationId: 'notif-123',
        status: NotificationStatus.NOTIFICATION_STATUS_DELIVERED,
        channel: 'IN_APP',
        sentAt: new Date(),
        deliveredAt: new Date(),
        retryCount: 0,
      });

      const result = await service.getNotificationStatus({
        notificationId: 'notif-123',
      });

      expect(result.notificationId).toBe('notif-123');
      expect(result.status).toBe(NotificationStatus.NOTIFICATION_STATUS_DELIVERED);
      expect(result.channel).toBe('IN_APP');
    });

    it('should return unspecified status for non-existent notification', async () => {
      inappService.getStatus.mockResolvedValue(null);

      const result = await service.getNotificationStatus({
        notificationId: 'non-existent',
      });

      expect(result.status).toBe(NotificationStatus.NOTIFICATION_STATUS_UNSPECIFIED);
      expect(result.error).toBe('Notification not found');
    });

    it('should include timestamp data when available', async () => {
      const sentAt = new Date('2024-01-15T10:00:00Z');
      const deliveredAt = new Date('2024-01-15T10:00:05Z');

      inappService.getStatus.mockResolvedValue({
        notificationId: 'notif-123',
        status: NotificationStatus.NOTIFICATION_STATUS_DELIVERED,
        channel: 'IN_APP',
        sentAt,
        deliveredAt,
        retryCount: 0,
      });

      const result = await service.getNotificationStatus({
        notificationId: 'notif-123',
      });

      expect(result.sentAt).toBeDefined();
      expect(result.sentAt?.seconds).toBe(Math.floor(sentAt.getTime() / 1000));
      expect(result.deliveredAt).toBeDefined();
      expect(result.deliveredAt?.seconds).toBe(Math.floor(deliveredAt.getTime() / 1000));
    });

    it('should include error information for failed notifications', async () => {
      inappService.getStatus.mockResolvedValue({
        notificationId: 'notif-123',
        status: NotificationStatus.NOTIFICATION_STATUS_FAILED,
        channel: 'PUSH',
        error: 'Device token invalid',
        retryCount: 3,
      });

      const result = await service.getNotificationStatus({
        notificationId: 'notif-123',
      });

      expect(result.status).toBe(NotificationStatus.NOTIFICATION_STATUS_FAILED);
      expect(result.error).toBe('Device token invalid');
      expect(result.retryCount).toBe(3);
    });
  });

  describe('idempotency', () => {
    it('should process new notification without idempotency key', async () => {
      channelRouter.route.mockResolvedValue([
        {
          channel: NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
          result: { success: true },
        },
      ]);
      auditService.logNotificationSent.mockResolvedValue(undefined);

      const result = await service.sendNotification({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        type: NotificationType.NOTIFICATION_TYPE_SYSTEM,
        channels: [NotificationChannel.NOTIFICATION_CHANNEL_IN_APP],
        title: 'Test',
        body: 'Test',
        locale: 'en',
        data: {},
        sourceService: 'test',
        priority: Priority.PRIORITY_NORMAL,
      });

      expect(result.success).toBe(true);
      expect(prisma.notification.findFirst).not.toHaveBeenCalled();
    });

    it('should check idempotency when key is provided', async () => {
      prisma.notification.findFirst.mockResolvedValue(null);
      channelRouter.route.mockResolvedValue([
        {
          channel: NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
          result: { success: true },
        },
      ]);
      auditService.logNotificationSent.mockResolvedValue(undefined);

      await service.sendNotification({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        type: NotificationType.NOTIFICATION_TYPE_SYSTEM,
        channels: [NotificationChannel.NOTIFICATION_CHANNEL_IN_APP],
        title: 'Test',
        body: 'Test',
        locale: 'en',
        data: {},
        sourceService: 'test',
        priority: Priority.PRIORITY_NORMAL,
        idempotencyKey: 'unique-key-123',
      });

      expect(prisma.notification.findFirst).toHaveBeenCalledWith({
        where: { idempotencyKey: 'unique-key-123' },
      });
    });
  });
});
