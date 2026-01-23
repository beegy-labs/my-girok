import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { ChannelRouterService } from '../channels/channel-router.service';
import { InappService } from '../channels/inapp/inapp.service';
import { AuditService } from '../audit/audit.service';
import {
  SendNotificationRequest,
  SendNotificationResponse,
  SendBulkNotificationRequest,
  SendBulkNotificationResponse,
  BulkNotificationResult,
  GetNotificationsRequest,
  GetNotificationsResponse,
  MarkAsReadRequest,
  MarkAsReadResponse,
  GetNotificationStatusRequest,
  GetNotificationStatusResponse,
  NotificationChannel,
  NotificationStatus,
  ChannelDeliveryRequest,
} from './notification.interface';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly channelRouter: ChannelRouterService,
    private readonly inappService: InappService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Send a single notification
   */
  async sendNotification(request: SendNotificationRequest): Promise<SendNotificationResponse> {
    // Validate required fields
    if (!request.tenantId) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'tenant_id is required',
      });
    }
    if (!request.accountId) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'account_id is required',
      });
    }
    if (!request.title?.trim()) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'title is required',
      });
    }
    if (!request.body?.trim()) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'body is required',
      });
    }
    if (!request.channels?.length) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'at least one channel is required',
      });
    }

    const notificationId = uuidv4();

    // Check for idempotency
    if (request.idempotencyKey) {
      const existing = await this.prisma.notification.findFirst({
        where: { idempotencyKey: request.idempotencyKey },
      });

      if (existing) {
        this.logger.debug(`Duplicate notification request: ${request.idempotencyKey}`);
        return {
          success: true,
          notificationId: existing.id,
          message: 'Notification already sent (idempotent)',
        };
      }
    }

    try {
      // Build channel delivery request
      const deliveryRequest: ChannelDeliveryRequest = {
        notificationId,
        tenantId: request.tenantId,
        accountId: request.accountId,
        type: request.type,
        channel: NotificationChannel.NOTIFICATION_CHANNEL_UNSPECIFIED,
        title: request.title,
        body: request.body,
        data: request.data || {},
        locale: request.locale || 'en',
        priority: request.priority,
      };

      // Route to channels (validation ensures at least one channel)
      const results = await this.channelRouter.route(deliveryRequest, request.channels);

      // Check if any channel succeeded
      const anySuccess = results.some((r) => r.result.success);
      const failedChannels = results.filter((r) => !r.result.success);

      // Log audit for security notifications
      await this.auditService.logNotificationSent({
        accountId: request.accountId,
        notificationType: request.type,
        channels: results.map((r) => this.channelToString(r.channel)),
        success: anySuccess,
        notificationId,
        metadata: {
          sourceService: request.sourceService,
        },
      });

      if (anySuccess) {
        this.logger.log(`Notification sent: ${notificationId} to ${results.length} channel(s)`);
        return {
          success: true,
          notificationId,
          message: `Sent to ${results.filter((r) => r.result.success).length} channel(s)`,
        };
      } else {
        const errors = failedChannels.map((r) => r.result.error).join('; ');
        return {
          success: false,
          notificationId,
          message: `Failed to send: ${errors}`,
        };
      }
    } catch (error) {
      this.logger.error(`Failed to send notification: ${error}`);
      return {
        success: false,
        notificationId,
        message: `Failed to send notification: ${error}`,
      };
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotification(
    request: SendBulkNotificationRequest,
  ): Promise<SendBulkNotificationResponse> {
    const results: BulkNotificationResult[] = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const item of request.notifications || []) {
      const response = await this.sendNotification({
        tenantId: request.tenantId,
        accountId: item.accountId,
        type: item.type,
        channels: item.channels,
        title: item.title,
        body: item.body,
        locale: item.locale,
        data: item.data,
        sourceService: request.sourceService,
        priority: item.priority,
        idempotencyKey: item.idempotencyKey,
      });

      results.push({
        accountId: item.accountId,
        success: response.success,
        notificationId: response.notificationId,
        error: response.success ? undefined : response.message,
      });

      if (response.success) {
        sentCount++;
      } else {
        failedCount++;
      }
    }

    return {
      success: failedCount === 0,
      totalCount: request.notifications?.length || 0,
      sentCount,
      failedCount,
      results,
    };
  }

  /**
   * Get notifications for an account
   */
  async getNotifications(request: GetNotificationsRequest): Promise<GetNotificationsResponse> {
    const { notifications, totalCount, unreadCount } = await this.inappService.getNotifications(
      request.tenantId,
      request.accountId,
      {
        channel: request.channel,
        unreadOnly: request.unreadOnly,
        page: request.page || 1,
        pageSize: request.pageSize || 20,
      },
    );

    return {
      notifications,
      totalCount,
      unreadCount,
      page: request.page || 1,
      pageSize: request.pageSize || 20,
    };
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(request: MarkAsReadRequest): Promise<MarkAsReadResponse> {
    return this.inappService.markAsRead(
      request.tenantId,
      request.accountId,
      request.notificationIds,
    );
  }

  /**
   * Get notification status
   */
  async getNotificationStatus(
    request: GetNotificationStatusRequest,
  ): Promise<GetNotificationStatusResponse> {
    const status = await this.inappService.getStatus(request.notificationId);

    if (!status) {
      return {
        notificationId: request.notificationId,
        status: NotificationStatus.NOTIFICATION_STATUS_UNSPECIFIED,
        channel: '',
        retryCount: 0,
        error: 'Notification not found',
      };
    }

    return {
      notificationId: status.notificationId,
      status: status.status,
      channel: status.channel,
      externalId: undefined,
      sentAt: status.sentAt
        ? { seconds: Math.floor(status.sentAt.getTime() / 1000), nanos: 0 }
        : undefined,
      deliveredAt: status.deliveredAt
        ? { seconds: Math.floor(status.deliveredAt.getTime() / 1000), nanos: 0 }
        : undefined,
      error: status.error,
      retryCount: status.retryCount,
    };
  }

  /**
   * Convert channel enum to string
   */
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
}
