import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  RegisterDeviceTokenRequest,
  RegisterDeviceTokenResponse,
  UnregisterDeviceTokenRequest,
  UnregisterDeviceTokenResponse,
  GetDeviceTokensRequest,
  GetDeviceTokensResponse,
  DeviceTokenItem,
  Platform,
} from '../notification/notification.interface';

@Injectable()
export class DeviceTokenService {
  private readonly logger = new Logger(DeviceTokenService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Register a device token for push notifications
   */
  async registerDeviceToken(
    request: RegisterDeviceTokenRequest,
  ): Promise<RegisterDeviceTokenResponse> {
    const { tenantId, accountId, token, platform, deviceId, deviceInfo } = request;

    try {
      // Upsert to handle re-registration of same token
      const deviceToken = await this.prisma.deviceToken.upsert({
        where: {
          token, // Token is unique globally
        },
        create: {
          tenantId,
          accountId,
          token,
          platform: this.platformToString(platform),
          deviceId: deviceId || null,
          deviceInfo: deviceInfo || {},
        },
        update: {
          tenantId,
          accountId,
          platform: this.platformToString(platform),
          deviceId: deviceId || null,
          deviceInfo: deviceInfo || {},
          lastUsedAt: new Date(),
        },
      });

      this.logger.log(
        `Device token registered: ${deviceToken.id} for account ${accountId} (${this.platformToString(platform)})`,
      );

      return {
        success: true,
        deviceTokenId: deviceToken.id,
        message: 'Device token registered successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to register device token: ${error}`);
      return {
        success: false,
        deviceTokenId: '',
        message: `Failed to register device token: ${error}`,
      };
    }
  }

  /**
   * Unregister a device token
   */
  async unregisterDeviceToken(
    request: UnregisterDeviceTokenRequest,
  ): Promise<UnregisterDeviceTokenResponse> {
    const { tenantId, accountId, token } = request;

    try {
      const result = await this.prisma.deviceToken.deleteMany({
        where: {
          tenantId,
          accountId,
          token,
        },
      });

      if (result.count === 0) {
        return {
          success: false,
          message: 'Device token not found',
        };
      }

      this.logger.log(`Device token unregistered for account ${accountId}`);

      return {
        success: true,
        message: 'Device token unregistered successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to unregister device token: ${error}`);
      return {
        success: false,
        message: `Failed to unregister device token: ${error}`,
      };
    }
  }

  /**
   * Get all device tokens for an account
   */
  async getDeviceTokens(request: GetDeviceTokensRequest): Promise<GetDeviceTokensResponse> {
    const { tenantId, accountId } = request;

    try {
      const tokens = await this.prisma.deviceToken.findMany({
        where: {
          tenantId,
          accountId,
        },
        orderBy: {
          lastUsedAt: 'desc',
        },
      });

      const items: DeviceTokenItem[] = tokens.map((t) => ({
        id: t.id,
        token: t.token,
        platform: this.stringToPlatform(t.platform),
        deviceId: t.deviceId || undefined,
        lastUsedAt: t.lastUsedAt
          ? { seconds: Math.floor(t.lastUsedAt.getTime() / 1000), nanos: 0 }
          : undefined,
        createdAt: { seconds: Math.floor(t.createdAt.getTime() / 1000), nanos: 0 },
      }));

      return { tokens: items };
    } catch (error) {
      this.logger.error(`Failed to get device tokens: ${error}`);
      return { tokens: [] };
    }
  }

  /**
   * Get active device tokens for sending push notifications
   */
  async getActiveTokensForAccount(tenantId: string, accountId: string): Promise<string[]> {
    try {
      const tokens = await this.prisma.deviceToken.findMany({
        where: {
          tenantId,
          accountId,
        },
        select: {
          token: true,
        },
      });

      return tokens.map((t) => t.token);
    } catch (error) {
      this.logger.error(`Failed to get active tokens: ${error}`);
      return [];
    }
  }

  /**
   * Update last used timestamp for a device token
   */
  async updateLastUsed(tokenId: string): Promise<void> {
    try {
      await this.prisma.deviceToken.update({
        where: { id: tokenId },
        data: { lastUsedAt: new Date() },
      });
    } catch (error) {
      this.logger.warn(`Failed to update last used for token ${tokenId}: ${error}`);
    }
  }

  /**
   * Remove invalid tokens (called when FCM returns invalid token error)
   */
  async removeInvalidToken(token: string): Promise<void> {
    try {
      await this.prisma.deviceToken.deleteMany({
        where: { token },
      });
      this.logger.log(`Removed invalid device token`);
    } catch (error) {
      this.logger.warn(`Failed to remove invalid token: ${error}`);
    }
  }

  // Helper methods

  private platformToString(platform: Platform): string {
    const map: Record<Platform, string> = {
      [Platform.PLATFORM_UNSPECIFIED]: 'UNSPECIFIED',
      [Platform.PLATFORM_IOS]: 'IOS',
      [Platform.PLATFORM_ANDROID]: 'ANDROID',
      [Platform.PLATFORM_WEB]: 'WEB',
    };
    return map[platform] || 'UNSPECIFIED';
  }

  private stringToPlatform(str: string): Platform {
    const map: Record<string, Platform> = {
      UNSPECIFIED: Platform.PLATFORM_UNSPECIFIED,
      IOS: Platform.PLATFORM_IOS,
      ANDROID: Platform.PLATFORM_ANDROID,
      WEB: Platform.PLATFORM_WEB,
    };
    return map[str] || Platform.PLATFORM_UNSPECIFIED;
  }
}
