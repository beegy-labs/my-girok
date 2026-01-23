import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ChannelDeliveryRequest,
  ChannelDeliveryResult,
  NotificationStatus,
  NotificationChannel,
  NotificationType,
  Priority,
  NotificationItem,
} from '../../notification/notification.interface';

@Injectable()
export class InappService {
  private readonly logger = new Logger(InappService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Store an in-app notification
   */
  async send(request: ChannelDeliveryRequest): Promise<ChannelDeliveryResult> {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          id: request.notificationId,
          tenantId: request.tenantId,
          accountId: request.accountId,
          type: this.typeToString(request.type),
          channel: this.channelToString(NotificationChannel.NOTIFICATION_CHANNEL_IN_APP),
          title: request.title,
          body: request.body,
          data: request.data || {},
          status: 'DELIVERED',
          sourceService: request.locale, // Using locale field for sourceService
          priority: this.priorityToString(request.priority),
        },
      });

      this.logger.debug(`In-app notification stored: ${notification.id}`);

      return {
        success: true,
        externalId: notification.id,
      };
    } catch (error) {
      this.logger.error(`Failed to store in-app notification: ${error}`);
      return {
        success: false,
        error: `Failed to store notification: ${error}`,
      };
    }
  }

  /**
   * Get notifications for an account
   */
  async getNotifications(
    tenantId: string,
    accountId: string,
    options: {
      channel?: NotificationChannel;
      unreadOnly?: boolean;
      page: number;
      pageSize: number;
    },
  ): Promise<{
    notifications: NotificationItem[];
    totalCount: number;
    unreadCount: number;
  }> {
    const { channel, unreadOnly, page, pageSize } = options;
    const skip = (page - 1) * pageSize;

    const whereClause: Record<string, unknown> = {
      tenantId,
      accountId,
    };

    if (channel) {
      whereClause.channel = this.channelToString(channel);
    }

    if (unreadOnly) {
      whereClause.readAt = null;
    }

    try {
      const [notifications, totalCount, unreadCount] = await Promise.all([
        this.prisma.notification.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize,
        }),
        this.prisma.notification.count({ where: whereClause }),
        this.prisma.notification.count({
          where: {
            tenantId,
            accountId,
            readAt: null,
          },
        }),
      ]);

      return {
        notifications: notifications.map((n) => this.mapToNotificationItem(n)),
        totalCount,
        unreadCount,
      };
    } catch (error) {
      this.logger.error(`Failed to get notifications: ${error}`);
      return {
        notifications: [],
        totalCount: 0,
        unreadCount: 0,
      };
    }
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(
    tenantId: string,
    accountId: string,
    notificationIds: string[],
  ): Promise<{ success: boolean; updatedCount: number }> {
    try {
      const result = await this.prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          tenantId,
          accountId,
          readAt: null,
        },
        data: {
          readAt: new Date(),
          status: 'READ',
        },
      });

      this.logger.debug(`Marked ${result.count} notifications as read`);

      return {
        success: true,
        updatedCount: result.count,
      };
    } catch (error) {
      this.logger.error(`Failed to mark notifications as read: ${error}`);
      return {
        success: false,
        updatedCount: 0,
      };
    }
  }

  /**
   * Get notification status
   */
  async getStatus(notificationId: string): Promise<{
    notificationId: string;
    status: NotificationStatus;
    channel: string;
    sentAt?: Date;
    deliveredAt?: Date;
    error?: string;
    retryCount: number;
  } | null> {
    try {
      const notification = await this.prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        return null;
      }

      return {
        notificationId: notification.id,
        status: this.stringToStatus(notification.status),
        channel: notification.channel,
        sentAt: notification.sentAt || undefined,
        deliveredAt: notification.deliveredAt || undefined,
        error: notification.error || undefined,
        retryCount: notification.retryCount,
      };
    } catch (error) {
      this.logger.error(`Failed to get notification status: ${error}`);
      return null;
    }
  }

  /**
   * Update notification status
   */
  async updateStatus(
    notificationId: string,
    status: NotificationStatus,
    externalId?: string,
    error?: string,
  ): Promise<void> {
    try {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: this.statusToString(status),
          externalId,
          error,
          ...(status === NotificationStatus.NOTIFICATION_STATUS_SENT && { sentAt: new Date() }),
          ...(status === NotificationStatus.NOTIFICATION_STATUS_DELIVERED && {
            deliveredAt: new Date(),
          }),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update notification status: ${error}`);
    }
  }

  // Helper methods

  private mapToNotificationItem(n: {
    id: string;
    type: string;
    channel: string;
    title: string;
    body: string;
    data: unknown;
    status: string;
    sourceService: string;
    priority: string;
    readAt: Date | null;
    createdAt: Date;
  }): NotificationItem {
    return {
      id: n.id,
      type: this.stringToType(n.type),
      channel: this.stringToChannel(n.channel),
      title: n.title,
      body: n.body,
      data: (n.data as Record<string, string>) || {},
      status: this.stringToStatus(n.status),
      sourceService: n.sourceService,
      priority: this.stringToPriority(n.priority),
      readAt: n.readAt ? { seconds: Math.floor(n.readAt.getTime() / 1000), nanos: 0 } : undefined,
      createdAt: { seconds: Math.floor(n.createdAt.getTime() / 1000), nanos: 0 },
    };
  }

  private typeToString(type: NotificationType): string {
    const map: Record<NotificationType, string> = {
      [NotificationType.NOTIFICATION_TYPE_UNSPECIFIED]: 'UNSPECIFIED',
      [NotificationType.NOTIFICATION_TYPE_SYSTEM]: 'SYSTEM',
      [NotificationType.NOTIFICATION_TYPE_ADMIN_INVITE]: 'ADMIN_INVITE',
      [NotificationType.NOTIFICATION_TYPE_PARTNER_INVITE]: 'PARTNER_INVITE',
      [NotificationType.NOTIFICATION_TYPE_PASSWORD_RESET]: 'PASSWORD_RESET',
      [NotificationType.NOTIFICATION_TYPE_SECURITY_ALERT]: 'SECURITY_ALERT',
      [NotificationType.NOTIFICATION_TYPE_MFA_CODE]: 'MFA_CODE',
      [NotificationType.NOTIFICATION_TYPE_ACCOUNT_LOCKED]: 'ACCOUNT_LOCKED',
      [NotificationType.NOTIFICATION_TYPE_LOGIN_ALERT]: 'LOGIN_ALERT',
      [NotificationType.NOTIFICATION_TYPE_MARKETING]: 'MARKETING',
    };
    return map[type] || 'UNSPECIFIED';
  }

  private stringToType(str: string): NotificationType {
    const map: Record<string, NotificationType> = {
      UNSPECIFIED: NotificationType.NOTIFICATION_TYPE_UNSPECIFIED,
      SYSTEM: NotificationType.NOTIFICATION_TYPE_SYSTEM,
      ADMIN_INVITE: NotificationType.NOTIFICATION_TYPE_ADMIN_INVITE,
      PARTNER_INVITE: NotificationType.NOTIFICATION_TYPE_PARTNER_INVITE,
      PASSWORD_RESET: NotificationType.NOTIFICATION_TYPE_PASSWORD_RESET,
      SECURITY_ALERT: NotificationType.NOTIFICATION_TYPE_SECURITY_ALERT,
      MFA_CODE: NotificationType.NOTIFICATION_TYPE_MFA_CODE,
      ACCOUNT_LOCKED: NotificationType.NOTIFICATION_TYPE_ACCOUNT_LOCKED,
      LOGIN_ALERT: NotificationType.NOTIFICATION_TYPE_LOGIN_ALERT,
      MARKETING: NotificationType.NOTIFICATION_TYPE_MARKETING,
    };
    return map[str] || NotificationType.NOTIFICATION_TYPE_UNSPECIFIED;
  }

  private channelToString(channel: NotificationChannel): string {
    const map: Record<NotificationChannel, string> = {
      [NotificationChannel.NOTIFICATION_CHANNEL_UNSPECIFIED]: 'UNSPECIFIED',
      [NotificationChannel.NOTIFICATION_CHANNEL_IN_APP]: 'IN_APP',
      [NotificationChannel.NOTIFICATION_CHANNEL_PUSH]: 'PUSH',
      [NotificationChannel.NOTIFICATION_CHANNEL_SMS]: 'SMS',
      [NotificationChannel.NOTIFICATION_CHANNEL_EMAIL]: 'EMAIL',
    };
    return map[channel] || 'UNSPECIFIED';
  }

  private stringToChannel(str: string): NotificationChannel {
    const map: Record<string, NotificationChannel> = {
      UNSPECIFIED: NotificationChannel.NOTIFICATION_CHANNEL_UNSPECIFIED,
      IN_APP: NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
      PUSH: NotificationChannel.NOTIFICATION_CHANNEL_PUSH,
      SMS: NotificationChannel.NOTIFICATION_CHANNEL_SMS,
      EMAIL: NotificationChannel.NOTIFICATION_CHANNEL_EMAIL,
    };
    return map[str] || NotificationChannel.NOTIFICATION_CHANNEL_UNSPECIFIED;
  }

  private statusToString(status: NotificationStatus): string {
    const map: Record<NotificationStatus, string> = {
      [NotificationStatus.NOTIFICATION_STATUS_UNSPECIFIED]: 'UNSPECIFIED',
      [NotificationStatus.NOTIFICATION_STATUS_PENDING]: 'PENDING',
      [NotificationStatus.NOTIFICATION_STATUS_SENT]: 'SENT',
      [NotificationStatus.NOTIFICATION_STATUS_DELIVERED]: 'DELIVERED',
      [NotificationStatus.NOTIFICATION_STATUS_FAILED]: 'FAILED',
      [NotificationStatus.NOTIFICATION_STATUS_READ]: 'READ',
    };
    return map[status] || 'UNSPECIFIED';
  }

  private stringToStatus(str: string): NotificationStatus {
    const map: Record<string, NotificationStatus> = {
      UNSPECIFIED: NotificationStatus.NOTIFICATION_STATUS_UNSPECIFIED,
      PENDING: NotificationStatus.NOTIFICATION_STATUS_PENDING,
      SENT: NotificationStatus.NOTIFICATION_STATUS_SENT,
      DELIVERED: NotificationStatus.NOTIFICATION_STATUS_DELIVERED,
      FAILED: NotificationStatus.NOTIFICATION_STATUS_FAILED,
      READ: NotificationStatus.NOTIFICATION_STATUS_READ,
    };
    return map[str] || NotificationStatus.NOTIFICATION_STATUS_UNSPECIFIED;
  }

  private priorityToString(priority: Priority): string {
    const map: Record<Priority, string> = {
      [Priority.PRIORITY_UNSPECIFIED]: 'UNSPECIFIED',
      [Priority.PRIORITY_LOW]: 'LOW',
      [Priority.PRIORITY_NORMAL]: 'NORMAL',
      [Priority.PRIORITY_HIGH]: 'HIGH',
      [Priority.PRIORITY_URGENT]: 'URGENT',
    };
    return map[priority] || 'NORMAL';
  }

  private stringToPriority(str: string): Priority {
    const map: Record<string, Priority> = {
      UNSPECIFIED: Priority.PRIORITY_UNSPECIFIED,
      LOW: Priority.PRIORITY_LOW,
      NORMAL: Priority.PRIORITY_NORMAL,
      HIGH: Priority.PRIORITY_HIGH,
      URGENT: Priority.PRIORITY_URGENT,
    };
    return map[str] || Priority.PRIORITY_NORMAL;
  }
}
