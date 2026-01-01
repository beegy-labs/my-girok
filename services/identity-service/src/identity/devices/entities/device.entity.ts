import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Device, DeviceType, PushPlatform } from '.prisma/identity-client';
import { Exclude, Expose } from 'class-transformer';

/**
 * Device Entity
 * Serialized response for device data with sensitive fields masked
 */
@Exclude()
export class DeviceEntity {
  @Expose()
  @ApiProperty({ description: 'Device ID' })
  id!: string;

  @Expose()
  @ApiProperty({ description: 'Account ID' })
  accountId!: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Device name (user-defined)' })
  name?: string | null;

  @Expose()
  @ApiProperty({ description: 'Device type', enum: DeviceType })
  deviceType!: DeviceType;

  @Expose()
  @ApiPropertyOptional({ description: 'Platform (iOS, Android, Web, etc.)' })
  platform?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'OS version' })
  osVersion?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'App version' })
  appVersion?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Browser name' })
  browserName?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Browser version' })
  browserVersion?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Push notification platform', enum: PushPlatform })
  pushPlatform?: PushPlatform | null;

  @Expose()
  @ApiProperty({ description: 'Whether push notifications are enabled' })
  hasPushToken!: boolean;

  @Expose()
  @ApiProperty({ description: 'Whether the device is trusted' })
  isTrusted!: boolean;

  @Expose()
  @ApiPropertyOptional({ description: 'When the device was trusted' })
  trustedAt?: Date | null;

  @Expose()
  @ApiProperty({ description: 'Whether the device is active' })
  isActive!: boolean;

  @Expose()
  @ApiPropertyOptional({ description: 'Last activity timestamp' })
  lastActiveAt?: Date | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Last IP address (masked)' })
  lastIpAddress?: string | null;

  @Expose()
  @ApiProperty({ description: 'Device registration time' })
  createdAt!: Date;

  @Expose()
  @ApiProperty({ description: 'Device last update time' })
  updatedAt!: Date;

  // Sensitive fields - NEVER exposed in API responses
  @Exclude()
  fingerprint?: string;

  @Exclude()
  pushToken?: string | null;

  @Exclude()
  pushTokenHash?: string | null;

  /**
   * Create DeviceEntity from Prisma model
   * Masks sensitive data for safe API responses
   */
  static fromPrisma(device: Device): DeviceEntity {
    const entity = new DeviceEntity();
    entity.id = device.id;
    entity.accountId = device.accountId;
    entity.name = device.name;
    entity.deviceType = device.deviceType;
    entity.platform = device.platform;
    entity.osVersion = device.osVersion;
    entity.appVersion = device.appVersion;
    entity.browserName = device.browserName;
    entity.browserVersion = device.browserVersion;
    entity.pushPlatform = device.pushPlatform;
    entity.hasPushToken = !!device.pushToken;
    entity.isTrusted = device.isTrusted;
    entity.trustedAt = device.trustedAt;
    entity.isActive = device.isActive;
    entity.lastActiveAt = device.lastActiveAt;
    entity.lastIpAddress = device.lastIpAddress ? maskIpAddress(device.lastIpAddress) : null;
    entity.createdAt = device.createdAt;
    entity.updatedAt = device.updatedAt;
    // Fingerprint, push token are never included
    return entity;
  }

  /**
   * Create array of DeviceEntity from Prisma models
   */
  static fromPrismaArray(devices: Device[]): DeviceEntity[] {
    return devices.map((device) => DeviceEntity.fromPrisma(device));
  }

  /**
   * Get device display name
   */
  getDisplayName(): string {
    if (this.name) return this.name;

    // Generate name from device info
    const parts: string[] = [];

    if (this.browserName) {
      parts.push(this.browserName);
      if (this.browserVersion) {
        parts.push(this.browserVersion.split('.')[0]);
      }
    } else if (this.platform) {
      parts.push(this.platform);
      if (this.osVersion) {
        parts.push(this.osVersion);
      }
    } else {
      parts.push(this.deviceType);
    }

    return parts.join(' ');
  }

  /**
   * Check if device was recently active (within last hour)
   */
  isRecentlyActive(): boolean {
    if (!this.lastActiveAt) return false;
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return this.lastActiveAt > hourAgo;
  }

  /**
   * Get device age in days
   */
  getAgeDays(): number {
    const ageMs = Date.now() - this.createdAt.getTime();
    return Math.floor(ageMs / (24 * 60 * 60 * 1000));
  }

  /**
   * Check if device supports push notifications
   */
  supportsPushNotifications(): boolean {
    return this.hasPushToken && this.pushPlatform !== null;
  }
}

/**
 * Mask IP address for privacy
 * IPv4: 192.168.1.xxx
 * IPv6: 2001:db8:85a3:xxxx:xxxx:xxxx:xxxx:xxxx
 */
function maskIpAddress(ip: string): string {
  if (ip.includes(':')) {
    // IPv6: mask last 4 segments
    const parts = ip.split(':');
    if (parts.length >= 4) {
      return parts.slice(0, 4).join(':') + ':xxxx:xxxx:xxxx:xxxx';
    }
  } else {
    // IPv4: mask last octet
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
  }
  return ip;
}

// Keep backward compatibility with old interface
export interface DeviceResponse {
  id: string;
  accountId: string;
  fingerprint: string;
  name: string | null;
  deviceType: string;
  platform: string | null;
  osVersion: string | null;
  appVersion: string | null;
  browserName: string | null;
  browserVersion: string | null;
  pushToken: string | null;
  pushPlatform: string | null;
  isTrusted: boolean;
  trustedAt: Date | null;
  isActive: boolean;
  lastActiveAt: Date | null;
  lastIpAddress: string | null;
  createdAt: Date;
  updatedAt: Date;
}
