import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  GetPreferencesRequest,
  GetPreferencesResponse,
  UpdatePreferencesRequest,
  UpdatePreferencesResponse,
  ChannelPreference,
  TypePreference,
  NotificationChannel,
  NotificationType,
} from '../notification/notification.interface';

@Injectable()
export class PreferencesService {
  private readonly logger = new Logger(PreferencesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get notification preferences for an account
   */
  async getPreferences(request: GetPreferencesRequest): Promise<GetPreferencesResponse> {
    const { tenantId, accountId } = request;

    try {
      // Get channel preferences
      const channelPrefs = await this.prisma.channelPreference.findMany({
        where: { tenantId, accountId },
      });

      // Get type preferences
      const typePrefs = await this.prisma.typePreference.findMany({
        where: { tenantId, accountId },
      });

      // Convert to response format
      const channelPreferences: ChannelPreference[] = channelPrefs.map((pref) => ({
        channel: this.stringToChannel(pref.channel),
        enabled: pref.enabled,
      }));

      const typePreferences: TypePreference[] = typePrefs.map((pref) => ({
        type: this.stringToType(pref.type),
        enabledChannels: (pref.enabledChannels as string[]).map((ch) => this.stringToChannel(ch)),
      }));

      // If no preferences exist, return defaults
      if (channelPreferences.length === 0) {
        return {
          channelPreferences: this.getDefaultChannelPreferences(),
          typePreferences: this.getDefaultTypePreferences(),
        };
      }

      return {
        channelPreferences,
        typePreferences,
      };
    } catch (error) {
      this.logger.error(`Failed to get preferences: ${error}`);
      // Return defaults on error
      return {
        channelPreferences: this.getDefaultChannelPreferences(),
        typePreferences: this.getDefaultTypePreferences(),
      };
    }
  }

  /**
   * Update notification preferences for an account
   */
  async updatePreferences(request: UpdatePreferencesRequest): Promise<UpdatePreferencesResponse> {
    const { tenantId, accountId, channelPreferences, typePreferences } = request;

    try {
      await this.prisma.$transaction(async (tx) => {
        // Upsert channel preferences
        for (const pref of channelPreferences || []) {
          const channelStr = this.channelToString(pref.channel);
          await tx.channelPreference.upsert({
            where: {
              tenantId_accountId_channel: {
                tenantId,
                accountId,
                channel: channelStr,
              },
            },
            create: {
              tenantId,
              accountId,
              channel: channelStr,
              enabled: pref.enabled,
            },
            update: {
              enabled: pref.enabled,
            },
          });
        }

        // Upsert type preferences
        for (const pref of typePreferences || []) {
          const typeStr = this.typeToString(pref.type);
          const enabledChannelsStr = (pref.enabledChannels || []).map((ch) =>
            this.channelToString(ch),
          );

          await tx.typePreference.upsert({
            where: {
              tenantId_accountId_type: {
                tenantId,
                accountId,
                type: typeStr,
              },
            },
            create: {
              tenantId,
              accountId,
              type: typeStr,
              enabledChannels: enabledChannelsStr,
            },
            update: {
              enabledChannels: enabledChannelsStr,
            },
          });
        }
      });

      this.logger.log(`Updated preferences for account ${accountId}`);

      return {
        success: true,
        message: 'Preferences updated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to update preferences: ${error}`);
      return {
        success: false,
        message: `Failed to update preferences: ${error}`,
      };
    }
  }

  /**
   * Check if a channel is enabled for an account
   */
  async isChannelEnabled(
    tenantId: string,
    accountId: string,
    channel: NotificationChannel,
  ): Promise<boolean> {
    try {
      const pref = await this.prisma.channelPreference.findUnique({
        where: {
          tenantId_accountId_channel: {
            tenantId,
            accountId,
            channel: this.channelToString(channel),
          },
        },
      });

      // Default to enabled if no preference exists
      return pref?.enabled ?? true;
    } catch {
      return true;
    }
  }

  /**
   * Check if a notification type is enabled for a channel
   */
  async isTypeEnabledForChannel(
    tenantId: string,
    accountId: string,
    type: NotificationType,
    channel: NotificationChannel,
  ): Promise<boolean> {
    try {
      const pref = await this.prisma.typePreference.findUnique({
        where: {
          tenantId_accountId_type: {
            tenantId,
            accountId,
            type: this.typeToString(type),
          },
        },
      });

      if (!pref) {
        // Default: all channels enabled for all types except marketing
        return type !== NotificationType.NOTIFICATION_TYPE_MARKETING;
      }

      const enabledChannels = pref.enabledChannels as string[];
      return enabledChannels.includes(this.channelToString(channel));
    } catch {
      return true;
    }
  }

  /**
   * Get enabled channels for a notification type
   */
  async getEnabledChannelsForType(
    tenantId: string,
    accountId: string,
    type: NotificationType,
    requestedChannels: NotificationChannel[],
  ): Promise<NotificationChannel[]> {
    const enabledChannels: NotificationChannel[] = [];

    for (const channel of requestedChannels) {
      const channelEnabled = await this.isChannelEnabled(tenantId, accountId, channel);
      const typeEnabled = await this.isTypeEnabledForChannel(tenantId, accountId, type, channel);

      if (channelEnabled && typeEnabled) {
        enabledChannels.push(channel);
      }
    }

    return enabledChannels;
  }

  // Helper methods

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

  private getDefaultChannelPreferences(): ChannelPreference[] {
    return [
      { channel: NotificationChannel.NOTIFICATION_CHANNEL_IN_APP, enabled: true },
      { channel: NotificationChannel.NOTIFICATION_CHANNEL_PUSH, enabled: true },
      { channel: NotificationChannel.NOTIFICATION_CHANNEL_SMS, enabled: true },
      { channel: NotificationChannel.NOTIFICATION_CHANNEL_EMAIL, enabled: true },
    ];
  }

  private getDefaultTypePreferences(): TypePreference[] {
    const allChannels = [
      NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
      NotificationChannel.NOTIFICATION_CHANNEL_PUSH,
      NotificationChannel.NOTIFICATION_CHANNEL_EMAIL,
    ];

    return [
      { type: NotificationType.NOTIFICATION_TYPE_SYSTEM, enabledChannels: allChannels },
      { type: NotificationType.NOTIFICATION_TYPE_SECURITY_ALERT, enabledChannels: allChannels },
      { type: NotificationType.NOTIFICATION_TYPE_LOGIN_ALERT, enabledChannels: allChannels },
      {
        type: NotificationType.NOTIFICATION_TYPE_MARKETING,
        enabledChannels: [NotificationChannel.NOTIFICATION_CHANNEL_EMAIL],
      },
    ];
  }
}
