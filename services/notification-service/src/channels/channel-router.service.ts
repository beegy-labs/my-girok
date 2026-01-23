import { Injectable, Logger } from '@nestjs/common';
import { InappService } from './inapp/inapp.service';
import { PushService } from './push/push.service';
import { SmsService } from './sms/sms.service';
import { EmailService } from './email/email.service';
import { PreferencesService } from '../preferences/preferences.service';
import { QuietHoursService } from '../quiet-hours/quiet-hours.service';
import {
  ChannelDeliveryRequest,
  ChannelDeliveryResult,
  NotificationChannel,
  NotificationType,
  Priority,
} from '../notification/notification.interface';

export interface RouteResult {
  channel: NotificationChannel;
  result: ChannelDeliveryResult;
}

@Injectable()
export class ChannelRouterService {
  private readonly logger = new Logger(ChannelRouterService.name);

  constructor(
    private readonly inappService: InappService,
    private readonly pushService: PushService,
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
    private readonly preferencesService: PreferencesService,
    private readonly quietHoursService: QuietHoursService,
  ) {}

  /**
   * Route a notification to the appropriate channels
   *
   * This method:
   * 1. Checks user preferences for each channel
   * 2. Checks quiet hours (unless URGENT priority)
   * 3. Sends to each enabled channel
   */
  async route(
    request: ChannelDeliveryRequest,
    requestedChannels: NotificationChannel[],
  ): Promise<RouteResult[]> {
    const results: RouteResult[] = [];

    // Filter channels based on preferences
    const enabledChannels = await this.preferencesService.getEnabledChannelsForType(
      request.tenantId,
      request.accountId,
      request.type,
      requestedChannels,
    );

    if (enabledChannels.length === 0) {
      this.logger.debug(
        `No enabled channels for account ${request.accountId}, type ${request.type}`,
      );
      return results;
    }

    // Check quiet hours (skip for URGENT priority)
    const inQuietHours = await this.quietHoursService.shouldSuppressNotification(
      request.tenantId,
      request.accountId,
      request.priority,
    );

    if (inQuietHours) {
      this.logger.debug(`Notification suppressed due to quiet hours for ${request.accountId}`);

      // Still send in-app notification (silent)
      if (enabledChannels.includes(NotificationChannel.NOTIFICATION_CHANNEL_IN_APP)) {
        const result = await this.sendToChannel(
          NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
          request,
        );
        results.push({
          channel: NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
          result,
        });
      }

      return results;
    }

    // Send to each enabled channel
    for (const channel of enabledChannels) {
      const result = await this.sendToChannel(channel, request);
      results.push({ channel, result });
    }

    return results;
  }

  /**
   * Send notification to a specific channel
   */
  async sendToChannel(
    channel: NotificationChannel,
    request: ChannelDeliveryRequest,
  ): Promise<ChannelDeliveryResult> {
    switch (channel) {
      case NotificationChannel.NOTIFICATION_CHANNEL_IN_APP:
        return this.inappService.send(request);

      case NotificationChannel.NOTIFICATION_CHANNEL_PUSH:
        return this.pushService.send(request);

      case NotificationChannel.NOTIFICATION_CHANNEL_SMS:
        return this.smsService.send(request);

      case NotificationChannel.NOTIFICATION_CHANNEL_EMAIL:
        return this.emailService.send(request);

      default:
        this.logger.warn(`Unknown channel: ${channel}`);
        return {
          success: false,
          error: `Unknown channel: ${channel}`,
        };
    }
  }

  /**
   * Send notification to all specified channels without preference checking
   * Used for system/admin notifications that should bypass user preferences
   */
  async sendToAllChannels(
    request: ChannelDeliveryRequest,
    channels: NotificationChannel[],
  ): Promise<RouteResult[]> {
    const results: RouteResult[] = [];

    for (const channel of channels) {
      const result = await this.sendToChannel(channel, request);
      results.push({ channel, result });
    }

    return results;
  }

  /**
   * Check if a notification type is security-related
   * Security notifications may have special handling
   */
  isSecurityNotification(type: NotificationType): boolean {
    const securityTypes = [
      NotificationType.NOTIFICATION_TYPE_SECURITY_ALERT,
      NotificationType.NOTIFICATION_TYPE_MFA_CODE,
      NotificationType.NOTIFICATION_TYPE_ACCOUNT_LOCKED,
      NotificationType.NOTIFICATION_TYPE_LOGIN_ALERT,
      NotificationType.NOTIFICATION_TYPE_PASSWORD_RESET,
    ];

    return securityTypes.includes(type);
  }

  /**
   * Get recommended channels for a notification type
   */
  getRecommendedChannels(type: NotificationType, priority: Priority): NotificationChannel[] {
    // High/Urgent priority gets all channels
    if (priority >= Priority.PRIORITY_HIGH) {
      return [
        NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
        NotificationChannel.NOTIFICATION_CHANNEL_PUSH,
        NotificationChannel.NOTIFICATION_CHANNEL_EMAIL,
      ];
    }

    // Security notifications should use push and email
    if (this.isSecurityNotification(type)) {
      return [
        NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
        NotificationChannel.NOTIFICATION_CHANNEL_PUSH,
        NotificationChannel.NOTIFICATION_CHANNEL_EMAIL,
      ];
    }

    // Marketing only goes to email (and needs explicit opt-in)
    if (type === NotificationType.NOTIFICATION_TYPE_MARKETING) {
      return [NotificationChannel.NOTIFICATION_CHANNEL_EMAIL];
    }

    // Default: in-app and email
    return [
      NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
      NotificationChannel.NOTIFICATION_CHANNEL_EMAIL,
    ];
  }
}
