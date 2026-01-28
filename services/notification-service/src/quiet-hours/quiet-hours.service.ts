import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  GetQuietHoursRequest,
  GetQuietHoursResponse,
  UpdateQuietHoursRequest,
  UpdateQuietHoursResponse,
  Priority,
} from '../notification/notification.interface';
import { isInQuietHours, isValidTimezone, QuietHoursConfig } from './quiet-hours.util';

@Injectable()
export class QuietHoursService {
  private readonly logger = new Logger(QuietHoursService.name);

  private static readonly DEFAULT_QUIET_HOURS: GetQuietHoursResponse = {
    enabled: false,
    startTime: '22:00',
    endTime: '08:00',
    timezone: 'UTC',
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get quiet hours settings for an account
   */
  async getQuietHours(request: GetQuietHoursRequest): Promise<GetQuietHoursResponse> {
    const { tenantId, accountId } = request;

    try {
      const quietHours = await this.prisma.quietHours.findUnique({
        where: {
          tenantId_accountId: {
            tenantId,
            accountId,
          },
        },
      });

      if (!quietHours) {
        return QuietHoursService.DEFAULT_QUIET_HOURS;
      }

      return {
        enabled: quietHours.enabled,
        startTime: quietHours.startTime,
        endTime: quietHours.endTime,
        timezone: quietHours.timezone,
      };
    } catch (error) {
      this.logger.error(`Failed to get quiet hours: ${error}`);
      return QuietHoursService.DEFAULT_QUIET_HOURS;
    }
  }

  /**
   * Update quiet hours settings for an account
   */
  async updateQuietHours(request: UpdateQuietHoursRequest): Promise<UpdateQuietHoursResponse> {
    const { tenantId, accountId, enabled, startTime, endTime, timezone } = request;

    // Validate timezone
    if (timezone && !isValidTimezone(timezone)) {
      return {
        success: false,
        message: `Invalid timezone: ${timezone}`,
      };
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (startTime && !timeRegex.test(startTime)) {
      return {
        success: false,
        message: `Invalid start time format: ${startTime}. Expected HH:MM`,
      };
    }
    if (endTime && !timeRegex.test(endTime)) {
      return {
        success: false,
        message: `Invalid end time format: ${endTime}. Expected HH:MM`,
      };
    }

    try {
      await this.prisma.quietHours.upsert({
        where: {
          tenantId_accountId: {
            tenantId,
            accountId,
          },
        },
        create: {
          tenantId,
          accountId,
          enabled: enabled ?? false,
          startTime: startTime || '22:00',
          endTime: endTime || '08:00',
          timezone: timezone || 'UTC',
        },
        update: {
          enabled: enabled ?? false,
          startTime: startTime || '22:00',
          endTime: endTime || '08:00',
          timezone: timezone || 'UTC',
        },
      });

      this.logger.log(`Updated quiet hours for account ${accountId}: enabled=${enabled}`);

      return {
        success: true,
        message: 'Quiet hours updated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to update quiet hours: ${error}`);
      return {
        success: false,
        message: `Failed to update quiet hours: ${error}`,
      };
    }
  }

  /**
   * Check if notifications should be suppressed for an account
   * URGENT priority notifications bypass quiet hours
   */
  async shouldSuppressNotification(
    tenantId: string,
    accountId: string,
    priority: Priority,
  ): Promise<boolean> {
    // URGENT priority bypasses quiet hours
    if (priority === Priority.PRIORITY_URGENT) {
      return false;
    }

    try {
      const quietHours = await this.prisma.quietHours.findUnique({
        where: {
          tenantId_accountId: {
            tenantId,
            accountId,
          },
        },
      });

      if (!quietHours || !quietHours.enabled) {
        return false;
      }

      const config: QuietHoursConfig = {
        enabled: quietHours.enabled,
        startTime: quietHours.startTime,
        endTime: quietHours.endTime,
        timezone: quietHours.timezone,
      };

      return isInQuietHours(config);
    } catch (error) {
      this.logger.error(`Failed to check quiet hours: ${error}`);
      return false;
    }
  }

  /**
   * Get quiet hours config for scheduling delayed notifications
   */
  async getQuietHoursConfig(tenantId: string, accountId: string): Promise<QuietHoursConfig | null> {
    try {
      const quietHours = await this.prisma.quietHours.findUnique({
        where: {
          tenantId_accountId: {
            tenantId,
            accountId,
          },
        },
      });

      if (!quietHours || !quietHours.enabled) {
        return null;
      }

      return {
        enabled: quietHours.enabled,
        startTime: quietHours.startTime,
        endTime: quietHours.endTime,
        timezone: quietHours.timezone,
      };
    } catch {
      return null;
    }
  }
}
