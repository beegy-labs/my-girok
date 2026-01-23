import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { InappService } from './inapp.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NotificationChannel,
  NotificationType,
  NotificationStatus,
  Priority,
  ChannelDeliveryRequest,
} from '../../notification/notification.interface';

// Type for mocked Prisma models
type MockPrismaNotification = {
  create: Mock;
  findMany: Mock;
  findUnique: Mock;
  count: Mock;
  update: Mock;
  updateMany: Mock;
};

describe('InappService', () => {
  let service: InappService;
  let prisma: { notification: MockPrismaNotification };

  const mockNotification = {
    id: 'notif-123',
    tenantId: 'tenant-1',
    accountId: 'account-1',
    type: 'SYSTEM',
    channel: 'IN_APP',
    title: 'Test Notification',
    body: 'This is a test notification body',
    data: { key: 'value' },
    status: 'DELIVERED',
    sourceService: 'test-service',
    priority: 'NORMAL',
    externalId: null,
    readAt: null,
    sentAt: new Date(),
    deliveredAt: new Date(),
    error: null,
    retryCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDeliveryRequest: ChannelDeliveryRequest = {
    notificationId: 'notif-123',
    tenantId: 'tenant-1',
    accountId: 'account-1',
    type: NotificationType.NOTIFICATION_TYPE_SYSTEM,
    channel: NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
    title: 'Test Notification',
    body: 'This is a test notification body',
    data: { key: 'value' },
    locale: 'en',
    priority: Priority.PRIORITY_NORMAL,
  };

  beforeEach(async () => {
    const mockPrisma = {
      notification: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [InappService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<InappService>(InappService);
    prisma = module.get(PrismaService);
  });

  describe('send', () => {
    it('should create notification record successfully', async () => {
      prisma.notification.create.mockResolvedValue(mockNotification);

      const result = await service.send(mockDeliveryRequest);

      expect(result.success).toBe(true);
      expect(result.externalId).toBe('notif-123');
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: 'notif-123',
          tenantId: 'tenant-1',
          accountId: 'account-1',
          type: 'SYSTEM',
          channel: 'IN_APP',
          title: 'Test Notification',
          body: 'This is a test notification body',
          status: 'DELIVERED',
        }),
      });
    });

    it('should handle different notification types', async () => {
      prisma.notification.create.mockResolvedValue({
        ...mockNotification,
        type: 'SECURITY_ALERT',
      });

      const securityRequest: ChannelDeliveryRequest = {
        ...mockDeliveryRequest,
        type: NotificationType.NOTIFICATION_TYPE_SECURITY_ALERT,
      };

      const result = await service.send(securityRequest);

      expect(result.success).toBe(true);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'SECURITY_ALERT',
        }),
      });
    });

    it('should handle different priorities', async () => {
      prisma.notification.create.mockResolvedValue({
        ...mockNotification,
        priority: 'URGENT',
      });

      const urgentRequest: ChannelDeliveryRequest = {
        ...mockDeliveryRequest,
        priority: Priority.PRIORITY_URGENT,
      };

      const result = await service.send(urgentRequest);

      expect(result.success).toBe(true);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          priority: 'URGENT',
        }),
      });
    });

    it('should handle database errors gracefully', async () => {
      prisma.notification.create.mockRejectedValue(new Error('DB connection failed'));

      const result = await service.send(mockDeliveryRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to store notification');
    });

    it('should handle empty data object', async () => {
      prisma.notification.create.mockResolvedValue({
        ...mockNotification,
        data: {},
      });

      const requestWithEmptyData: ChannelDeliveryRequest = {
        ...mockDeliveryRequest,
        data: {},
      };

      const result = await service.send(requestWithEmptyData);

      expect(result.success).toBe(true);
    });
  });

  describe('getNotifications (getByAccountId)', () => {
    it('should return paginated notifications', async () => {
      const notifications = [
        { ...mockNotification, id: 'notif-1' },
        { ...mockNotification, id: 'notif-2' },
      ];

      prisma.notification.findMany.mockResolvedValue(notifications);
      prisma.notification.count.mockResolvedValueOnce(10).mockResolvedValueOnce(5);

      const result = await service.getNotifications('tenant-1', 'account-1', {
        page: 1,
        pageSize: 20,
      });

      expect(result.notifications).toHaveLength(2);
      expect(result.totalCount).toBe(10);
      expect(result.unreadCount).toBe(5);
    });

    it('should filter by channel', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      await service.getNotifications('tenant-1', 'account-1', {
        channel: NotificationChannel.NOTIFICATION_CHANNEL_PUSH,
        page: 1,
        pageSize: 20,
      });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            channel: 'PUSH',
          }),
        }),
      );
    });

    it('should filter unread only', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      await service.getNotifications('tenant-1', 'account-1', {
        unreadOnly: true,
        page: 1,
        pageSize: 20,
      });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            readAt: null,
          }),
        }),
      );
    });

    it('should apply correct pagination', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      await service.getNotifications('tenant-1', 'account-1', {
        page: 3,
        pageSize: 10,
      });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3-1) * 10
          take: 10,
        }),
      );
    });

    it('should order by createdAt descending', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      await service.getNotifications('tenant-1', 'account-1', {
        page: 1,
        pageSize: 20,
      });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should handle database errors gracefully', async () => {
      prisma.notification.findMany.mockRejectedValue(new Error('DB error'));

      const result = await service.getNotifications('tenant-1', 'account-1', {
        page: 1,
        pageSize: 20,
      });

      expect(result.notifications).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.unreadCount).toBe(0);
    });

    it('should map notification data correctly', async () => {
      const now = new Date();
      prisma.notification.findMany.mockResolvedValue([
        {
          ...mockNotification,
          readAt: now,
          createdAt: now,
        },
      ]);
      prisma.notification.count.mockResolvedValue(1);

      const result = await service.getNotifications('tenant-1', 'account-1', {
        page: 1,
        pageSize: 20,
      });

      expect(result.notifications[0].type).toBe(NotificationType.NOTIFICATION_TYPE_SYSTEM);
      expect(result.notifications[0].channel).toBe(NotificationChannel.NOTIFICATION_CHANNEL_IN_APP);
      expect(result.notifications[0].status).toBe(NotificationStatus.NOTIFICATION_STATUS_DELIVERED);
      expect(result.notifications[0].readAt?.seconds).toBe(Math.floor(now.getTime() / 1000));
    });
  });

  describe('markAsRead', () => {
    it('should mark notifications as read', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAsRead('tenant-1', 'account-1', [
        'notif-1',
        'notif-2',
        'notif-3',
      ]);

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(3);
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['notif-1', 'notif-2', 'notif-3'] },
          tenantId: 'tenant-1',
          accountId: 'account-1',
          readAt: null,
        },
        data: {
          readAt: expect.any(Date),
          status: 'READ',
        },
      });
    });

    it('should handle already read notifications', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markAsRead('tenant-1', 'account-1', ['already-read']);

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      prisma.notification.updateMany.mockRejectedValue(new Error('DB error'));

      const result = await service.markAsRead('tenant-1', 'account-1', ['notif-1']);

      expect(result.success).toBe(false);
      expect(result.updatedCount).toBe(0);
    });

    it('should handle empty notification IDs', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markAsRead('tenant-1', 'account-1', []);

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(0);
    });
  });

  describe('getStatus', () => {
    it('should return notification status', async () => {
      prisma.notification.findUnique.mockResolvedValue(mockNotification);

      const result = await service.getStatus('notif-123');

      expect(result).not.toBeNull();
      expect(result!.notificationId).toBe('notif-123');
      expect(result!.status).toBe(NotificationStatus.NOTIFICATION_STATUS_DELIVERED);
      expect(result!.channel).toBe('IN_APP');
    });

    it('should return null for non-existent notification', async () => {
      prisma.notification.findUnique.mockResolvedValue(null);

      const result = await service.getStatus('non-existent');

      expect(result).toBeNull();
    });

    it('should include error information for failed notifications', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        ...mockNotification,
        status: 'FAILED',
        error: 'Delivery failed',
        retryCount: 3,
      });

      const result = await service.getStatus('notif-123');

      expect(result!.status).toBe(NotificationStatus.NOTIFICATION_STATUS_FAILED);
      expect(result!.error).toBe('Delivery failed');
      expect(result!.retryCount).toBe(3);
    });

    it('should handle database errors gracefully', async () => {
      prisma.notification.findUnique.mockRejectedValue(new Error('DB error'));

      const result = await service.getStatus('notif-123');

      expect(result).toBeNull();
    });

    it('should include timestamp data when available', async () => {
      const sentAt = new Date('2024-01-15T10:00:00Z');
      const deliveredAt = new Date('2024-01-15T10:00:05Z');

      prisma.notification.findUnique.mockResolvedValue({
        ...mockNotification,
        sentAt,
        deliveredAt,
      });

      const result = await service.getStatus('notif-123');

      expect(result!.sentAt).toEqual(sentAt);
      expect(result!.deliveredAt).toEqual(deliveredAt);
    });
  });

  describe('updateStatus', () => {
    it('should update notification status', async () => {
      prisma.notification.update.mockResolvedValue(mockNotification);

      await service.updateStatus('notif-123', NotificationStatus.NOTIFICATION_STATUS_READ);

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-123' },
        data: expect.objectContaining({
          status: 'READ',
        }),
      });
    });

    it('should set sentAt when status is SENT', async () => {
      prisma.notification.update.mockResolvedValue(mockNotification);

      await service.updateStatus('notif-123', NotificationStatus.NOTIFICATION_STATUS_SENT);

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-123' },
        data: expect.objectContaining({
          status: 'SENT',
          sentAt: expect.any(Date),
        }),
      });
    });

    it('should set deliveredAt when status is DELIVERED', async () => {
      prisma.notification.update.mockResolvedValue(mockNotification);

      await service.updateStatus('notif-123', NotificationStatus.NOTIFICATION_STATUS_DELIVERED);

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-123' },
        data: expect.objectContaining({
          status: 'DELIVERED',
          deliveredAt: expect.any(Date),
        }),
      });
    });

    it('should include external ID when provided', async () => {
      prisma.notification.update.mockResolvedValue(mockNotification);

      await service.updateStatus(
        'notif-123',
        NotificationStatus.NOTIFICATION_STATUS_DELIVERED,
        'external-id-123',
      );

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-123' },
        data: expect.objectContaining({
          externalId: 'external-id-123',
        }),
      });
    });

    it('should include error when provided', async () => {
      prisma.notification.update.mockResolvedValue(mockNotification);

      await service.updateStatus(
        'notif-123',
        NotificationStatus.NOTIFICATION_STATUS_FAILED,
        undefined,
        'Delivery failed',
      );

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-123' },
        data: expect.objectContaining({
          status: 'FAILED',
          error: 'Delivery failed',
        }),
      });
    });

    it('should handle database errors silently', async () => {
      prisma.notification.update.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect(
        service.updateStatus('notif-123', NotificationStatus.NOTIFICATION_STATUS_READ),
      ).resolves.not.toThrow();
    });
  });
});
