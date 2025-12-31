import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma, Device } from '.prisma/identity-client';
import { IdentityPrismaService } from '../../database/identity-prisma.service';
import { RegisterDeviceDto, DeviceQueryDto } from './dto/register-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

/**
 * Pagination meta information
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Device response type
 */
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
  lastActiveAt: Date | null;
  lastIpAddress: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(private readonly prisma: IdentityPrismaService) {}

  /**
   * Register a new device
   */
  async register(dto: RegisterDeviceDto): Promise<DeviceResponse> {
    this.logger.log(`Registering device for account: ${dto.accountId}`);

    // Verify account exists
    const account = await this.prisma.account.findUnique({
      where: { id: dto.accountId },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${dto.accountId} not found`);
    }

    // Check if device with same fingerprint already exists for this account
    const existingDevice = await this.prisma.device.findUnique({
      where: {
        accountId_fingerprint: {
          accountId: dto.accountId,
          fingerprint: dto.fingerprint,
        },
      },
    });

    if (existingDevice) {
      // Update existing device and return it
      const updated = await this.prisma.device.update({
        where: { id: existingDevice.id },
        data: {
          name: dto.name || existingDevice.name,
          deviceType: dto.deviceType,
          platform: dto.platform,
          osVersion: dto.osVersion,
          appVersion: dto.appVersion,
          browserName: dto.browserName,
          browserVersion: dto.browserVersion,
          pushToken: dto.pushToken,
          pushPlatform: dto.pushPlatform,
          lastActiveAt: new Date(),
          lastIpAddress: dto.ipAddress,
        },
      });

      this.logger.log(`Device ${updated.id} updated for account ${dto.accountId}`);
      return this.toDeviceResponse(updated);
    }

    // Create new device
    const device = await this.prisma.device.create({
      data: {
        accountId: dto.accountId,
        fingerprint: dto.fingerprint,
        name: dto.name,
        deviceType: dto.deviceType,
        platform: dto.platform,
        osVersion: dto.osVersion,
        appVersion: dto.appVersion,
        browserName: dto.browserName,
        browserVersion: dto.browserVersion,
        pushToken: dto.pushToken,
        pushPlatform: dto.pushPlatform,
        lastActiveAt: new Date(),
        lastIpAddress: dto.ipAddress,
      },
    });

    this.logger.log(`Device ${device.id} registered for account ${dto.accountId}`);
    return this.toDeviceResponse(device);
  }

  /**
   * Find device by ID
   */
  async findById(id: string): Promise<DeviceResponse> {
    const device = await this.prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    return this.toDeviceResponse(device);
  }

  /**
   * Find device by fingerprint for account
   */
  async findByFingerprint(accountId: string, fingerprint: string): Promise<DeviceResponse | null> {
    const device = await this.prisma.device.findUnique({
      where: {
        accountId_fingerprint: {
          accountId,
          fingerprint,
        },
      },
    });

    if (!device) {
      return null;
    }

    return this.toDeviceResponse(device);
  }

  /**
   * List devices with pagination and filtering
   */
  async findAll(params: DeviceQueryDto): Promise<PaginatedResponse<DeviceResponse>> {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.DeviceWhereInput = {};

    if (params.accountId) {
      where.accountId = params.accountId;
    }
    if (params.deviceType) {
      where.deviceType = params.deviceType;
    }
    if (params.isTrusted !== undefined) {
      where.isTrusted = params.isTrusted;
    }

    const [devices, total] = await Promise.all([
      this.prisma.device.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastActiveAt: 'desc' },
      }),
      this.prisma.device.count({ where }),
    ]);

    return {
      data: devices.map((device) => this.toDeviceResponse(device)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a device
   */
  async update(id: string, dto: UpdateDeviceDto): Promise<DeviceResponse> {
    const device = await this.prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    const updated = await this.prisma.device.update({
      where: { id },
      data: {
        name: dto.name,
        platform: dto.platform,
        osVersion: dto.osVersion,
        appVersion: dto.appVersion,
        browserName: dto.browserName,
        browserVersion: dto.browserVersion,
        pushToken: dto.pushToken,
        pushPlatform: dto.pushPlatform,
      },
    });

    this.logger.log(`Device ${id} updated`);
    return this.toDeviceResponse(updated);
  }

  /**
   * Remove a device
   */
  async remove(id: string): Promise<void> {
    const device = await this.prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    // Also revoke all sessions associated with this device
    await this.prisma.session.updateMany({
      where: { deviceId: id, isActive: true },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: 'Device removed',
      },
    });

    await this.prisma.device.delete({
      where: { id },
    });

    this.logger.log(`Device ${id} removed`);
  }

  /**
   * Trust a device
   */
  async trust(id: string): Promise<DeviceResponse> {
    const device = await this.prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    if (device.isTrusted) {
      throw new ConflictException('Device is already trusted');
    }

    const updated = await this.prisma.device.update({
      where: { id },
      data: {
        isTrusted: true,
        trustedAt: new Date(),
      },
    });

    this.logger.log(`Device ${id} trusted`);
    return this.toDeviceResponse(updated);
  }

  /**
   * Untrust a device
   */
  async untrust(id: string): Promise<DeviceResponse> {
    const device = await this.prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    if (!device.isTrusted) {
      throw new BadRequestException('Device is not trusted');
    }

    const updated = await this.prisma.device.update({
      where: { id },
      data: {
        isTrusted: false,
        trustedAt: null,
      },
    });

    this.logger.log(`Device ${id} untrusted`);
    return this.toDeviceResponse(updated);
  }

  /**
   * Update device activity
   */
  async updateActivity(id: string, ipAddress?: string): Promise<void> {
    const device = await this.prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      return; // Silently fail for non-existent devices
    }

    await this.prisma.device.update({
      where: { id },
      data: {
        lastActiveAt: new Date(),
        lastIpAddress: ipAddress || device.lastIpAddress,
      },
    });
  }

  /**
   * Get device count for account
   */
  async getDeviceCount(accountId: string): Promise<number> {
    return this.prisma.device.count({
      where: { accountId },
    });
  }

  /**
   * Get trusted device count for account
   */
  async getTrustedDeviceCount(accountId: string): Promise<number> {
    return this.prisma.device.count({
      where: { accountId, isTrusted: true },
    });
  }

  /**
   * Remove all devices for account
   */
  async removeAllForAccount(accountId: string): Promise<number> {
    // First revoke all sessions
    await this.prisma.session.updateMany({
      where: {
        accountId,
        isActive: true,
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: 'All devices removed',
      },
    });

    const result = await this.prisma.device.deleteMany({
      where: { accountId },
    });

    this.logger.log(`Removed ${result.count} devices for account ${accountId}`);
    return result.count;
  }

  /**
   * Convert Prisma device to response type
   */
  private toDeviceResponse(device: Device): DeviceResponse {
    return {
      id: device.id,
      accountId: device.accountId,
      fingerprint: device.fingerprint,
      name: device.name,
      deviceType: device.deviceType,
      platform: device.platform,
      osVersion: device.osVersion,
      appVersion: device.appVersion,
      browserName: device.browserName,
      browserVersion: device.browserVersion,
      pushToken: device.pushToken,
      pushPlatform: device.pushPlatform,
      isTrusted: device.isTrusted,
      trustedAt: device.trustedAt,
      lastActiveAt: device.lastActiveAt,
      lastIpAddress: device.lastIpAddress,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
    };
  }
}
