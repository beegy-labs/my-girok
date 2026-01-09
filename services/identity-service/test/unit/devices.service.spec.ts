import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { DevicesService } from '../../src/identity/devices/devices.service';
import { IdentityPrismaService } from '../../src/database/identity-prisma.service';
import { DeviceType, PushPlatform } from '.prisma/identity-client';

// Type for mocked Prisma service with vi.fn() methods
type MockPrismaDevice = {
  findUnique: Mock;
  findMany: Mock;
  upsert: Mock;
  update: Mock;
  delete: Mock;
  deleteMany: Mock;
  count: Mock;
};

type MockPrismaSession = {
  updateMany: Mock;
};

type MockPrismaAccount = {
  findUnique: Mock;
};

describe('DevicesService', () => {
  let service: DevicesService;
  let prisma: {
    account: MockPrismaAccount;
    device: MockPrismaDevice;
    session: MockPrismaSession;
    $transaction: Mock;
  };

  const mockAccount = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
  };

  const mockDevice = {
    id: '223e4567-e89b-12d3-a456-426614174001',
    accountId: mockAccount.id,
    fingerprint: 'abc123def456ghi789',
    name: 'Chrome on MacBook Pro',
    deviceType: 'WEB' as DeviceType,
    platform: 'macOS',
    osVersion: '14.2',
    appVersion: '1.0.0',
    browserName: 'Chrome',
    browserVersion: '120.0.0',
    pushToken: null,
    pushPlatform: null as PushPlatform | null,
    isTrusted: false,
    trustedAt: null,
    lastActiveAt: new Date(),
    lastIpAddress: '192.168.1.1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaData = {
      account: {
        findUnique: vi.fn(),
      },
      device: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
        count: vi.fn(),
      },
      session: {
        updateMany: vi.fn(),
      },
    };
    const mockPrisma = {
      ...mockPrismaData,
      $transaction: vi.fn((fn: (prisma: typeof mockPrismaData) => unknown) => fn(mockPrismaData)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DevicesService, { provide: IdentityPrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
    prisma = module.get(IdentityPrismaService);
  });

  describe('register', () => {
    it('should register a new device successfully', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount as never);
      prisma.device.upsert.mockResolvedValue(mockDevice as never);

      const result = await service.register({
        accountId: mockAccount.id,
        fingerprint: 'abc123def456ghi789',
        deviceType: 'WEB' as DeviceType,
        name: 'Chrome on MacBook Pro',
        platform: 'macOS',
        osVersion: '14.2',
        appVersion: '1.0.0',
        browserName: 'Chrome',
        browserVersion: '120.0.0',
        ipAddress: '192.168.1.1',
      });

      expect(result.id).toBe(mockDevice.id);
      expect(result.fingerprint).toBe(mockDevice.fingerprint);
      expect(prisma.device.upsert).toHaveBeenCalled();
    });

    it('should throw NotFoundException if account not found', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      await expect(
        service.register({
          accountId: 'nonexistent-id',
          fingerprint: 'abc123def456ghi789',
          deviceType: 'WEB' as DeviceType,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update existing device with same fingerprint (upsert)', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount as never);
      prisma.device.upsert.mockResolvedValue({
        ...mockDevice,
        name: 'Updated Device Name',
      } as never);

      const result = await service.register({
        accountId: mockAccount.id,
        fingerprint: mockDevice.fingerprint,
        deviceType: 'WEB' as DeviceType,
        name: 'Updated Device Name',
      });

      expect(result.name).toBe('Updated Device Name');
      expect(prisma.device.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            accountId_fingerprint: {
              accountId: mockAccount.id,
              fingerprint: mockDevice.fingerprint,
            },
          },
        }),
      );
    });

    it('should register device with push notification token', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount as never);
      prisma.device.upsert.mockResolvedValue({
        ...mockDevice,
        pushToken: 'fcm_token_abc123',
        pushPlatform: 'FCM' as PushPlatform,
      } as never);

      const result = await service.register({
        accountId: mockAccount.id,
        fingerprint: 'abc123def456ghi789',
        deviceType: 'MOBILE' as DeviceType,
        pushToken: 'fcm_token_abc123',
        pushPlatform: 'FCM' as PushPlatform,
      });

      expect(result.pushToken).toBe('fcm_token_abc123');
      expect(result.pushPlatform).toBe('FCM');
    });
  });

  describe('findById', () => {
    it('should return device when found', async () => {
      prisma.device.findUnique.mockResolvedValue(mockDevice as never);

      const result = await service.findById(mockDevice.id);

      expect(result.id).toBe(mockDevice.id);
    });

    it('should throw NotFoundException when device not found', async () => {
      prisma.device.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByFingerprint', () => {
    it('should return device when found by fingerprint', async () => {
      prisma.device.findUnique.mockResolvedValue(mockDevice as never);

      const result = await service.findByFingerprint(mockAccount.id, mockDevice.fingerprint);

      expect(result?.id).toBe(mockDevice.id);
    });

    it('should return null when device not found by fingerprint', async () => {
      prisma.device.findUnique.mockResolvedValue(null);

      const result = await service.findByFingerprint(mockAccount.id, 'unknown-fingerprint');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated devices', async () => {
      const mockDevices = [mockDevice, { ...mockDevice, id: 'device-2' }];
      prisma.device.findMany.mockResolvedValue(mockDevices as never);
      prisma.device.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('should filter by accountId', async () => {
      prisma.device.findMany.mockResolvedValue([mockDevice] as never);
      prisma.device.count.mockResolvedValue(1);

      await service.findAll({ accountId: mockAccount.id });

      expect(prisma.device.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ accountId: mockAccount.id }),
        }),
      );
    });

    it('should filter by deviceType', async () => {
      prisma.device.findMany.mockResolvedValue([mockDevice] as never);
      prisma.device.count.mockResolvedValue(1);

      await service.findAll({ deviceType: 'WEB' as DeviceType });

      expect(prisma.device.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deviceType: 'WEB' }),
        }),
      );
    });

    it('should filter by isTrusted status', async () => {
      prisma.device.findMany.mockResolvedValue([] as never);
      prisma.device.count.mockResolvedValue(0);

      await service.findAll({ isTrusted: true });

      expect(prisma.device.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isTrusted: true }),
        }),
      );
    });

    it('should respect page limit maximum of 100', async () => {
      prisma.device.findMany.mockResolvedValue([mockDevice] as never);
      prisma.device.count.mockResolvedValue(1);

      await service.findAll({ page: 1, limit: 200 });

      expect(prisma.device.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100, // Should be capped at 100
        }),
      );
    });

    it('should use default values when page and limit not provided', async () => {
      prisma.device.findMany.mockResolvedValue([mockDevice] as never);
      prisma.device.count.mockResolvedValue(1);

      await service.findAll({});

      expect(prisma.device.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0, // (1-1) * 20
          take: 20, // default limit
        }),
      );
    });
  });

  describe('update', () => {
    it('should update device successfully', async () => {
      prisma.device.findUnique.mockResolvedValue(mockDevice as never);
      prisma.device.update.mockResolvedValue({
        ...mockDevice,
        name: 'Updated Name',
      } as never);

      const result = await service.update(mockDevice.id, {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException when device not found', async () => {
      prisma.device.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent-id', { name: 'New Name' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update multiple fields', async () => {
      prisma.device.findUnique.mockResolvedValue(mockDevice as never);
      prisma.device.update.mockResolvedValue({
        ...mockDevice,
        name: 'New Name',
        osVersion: '15.0',
        appVersion: '2.0.0',
      } as never);

      const result = await service.update(mockDevice.id, {
        name: 'New Name',
        osVersion: '15.0',
        appVersion: '2.0.0',
      });

      expect(result.osVersion).toBe('15.0');
      expect(result.appVersion).toBe('2.0.0');
    });
  });

  describe('remove', () => {
    it('should remove device and revoke associated sessions', async () => {
      prisma.device.findUnique.mockResolvedValue(mockDevice as never);
      prisma.session.updateMany.mockResolvedValue({ count: 2 } as never);
      prisma.device.delete.mockResolvedValue(mockDevice as never);

      await service.remove(mockDevice.id);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when device not found', async () => {
      prisma.device.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('trust', () => {
    it('should trust a device successfully', async () => {
      prisma.device.findUnique.mockResolvedValue({
        ...mockDevice,
        isTrusted: false,
      } as never);
      prisma.device.update.mockResolvedValue({
        ...mockDevice,
        isTrusted: true,
        trustedAt: new Date(),
      } as never);

      const result = await service.trust(mockDevice.id);

      expect(result.isTrusted).toBe(true);
      expect(result.trustedAt).toBeDefined();
    });

    it('should throw NotFoundException when device not found', async () => {
      prisma.device.findUnique.mockResolvedValue(null);

      await expect(service.trust('nonexistent-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when device already trusted', async () => {
      prisma.device.findUnique.mockResolvedValue({
        ...mockDevice,
        isTrusted: true,
      } as never);

      await expect(service.trust(mockDevice.id)).rejects.toThrow(ConflictException);
    });
  });

  describe('untrust', () => {
    it('should untrust a device successfully', async () => {
      prisma.device.findUnique.mockResolvedValue({
        ...mockDevice,
        isTrusted: true,
        trustedAt: new Date(),
      } as never);
      prisma.device.update.mockResolvedValue({
        ...mockDevice,
        isTrusted: false,
        trustedAt: null,
      } as never);

      const result = await service.untrust(mockDevice.id);

      expect(result.isTrusted).toBe(false);
      expect(result.trustedAt).toBeNull();
    });

    it('should throw NotFoundException when device not found', async () => {
      prisma.device.findUnique.mockResolvedValue(null);

      await expect(service.untrust('nonexistent-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when device not trusted', async () => {
      prisma.device.findUnique.mockResolvedValue({
        ...mockDevice,
        isTrusted: false,
      } as never);

      await expect(service.untrust(mockDevice.id)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateActivity', () => {
    it('should update device activity timestamp', async () => {
      prisma.device.findUnique.mockResolvedValue(mockDevice as never);
      prisma.device.update.mockResolvedValue({
        ...mockDevice,
        lastActiveAt: new Date(),
      } as never);

      await service.updateActivity(mockDevice.id, '192.168.1.2');

      expect(prisma.device.update).toHaveBeenCalledWith({
        where: { id: mockDevice.id },
        data: expect.objectContaining({
          lastActiveAt: expect.any(Date),
          lastIpAddress: '192.168.1.2',
        }),
      });
    });

    it('should silently fail for non-existent device', async () => {
      prisma.device.findUnique.mockResolvedValue(null);

      await expect(service.updateActivity('nonexistent-id')).resolves.not.toThrow();
      expect(prisma.device.update).not.toHaveBeenCalled();
    });

    it('should keep existing IP if not provided', async () => {
      prisma.device.findUnique.mockResolvedValue(mockDevice as never);
      prisma.device.update.mockResolvedValue(mockDevice as never);

      await service.updateActivity(mockDevice.id);

      expect(prisma.device.update).toHaveBeenCalledWith({
        where: { id: mockDevice.id },
        data: expect.objectContaining({
          lastIpAddress: mockDevice.lastIpAddress,
        }),
      });
    });
  });

  describe('getDeviceCount', () => {
    it('should return device count for account', async () => {
      prisma.device.count.mockResolvedValue(5);

      const result = await service.getDeviceCount(mockAccount.id);

      expect(result).toBe(5);
      expect(prisma.device.count).toHaveBeenCalledWith({
        where: { accountId: mockAccount.id },
      });
    });
  });

  describe('getTrustedDeviceCount', () => {
    it('should return trusted device count for account', async () => {
      prisma.device.count.mockResolvedValue(3);

      const result = await service.getTrustedDeviceCount(mockAccount.id);

      expect(result).toBe(3);
      expect(prisma.device.count).toHaveBeenCalledWith({
        where: { accountId: mockAccount.id, isTrusted: true },
      });
    });
  });

  describe('removeAllForAccount', () => {
    it('should remove all devices and revoke all sessions for account', async () => {
      prisma.session.updateMany.mockResolvedValue({ count: 5 } as never);
      prisma.device.deleteMany.mockResolvedValue({ count: 3 } as never);

      const result = await service.removeAllForAccount(mockAccount.id);

      expect(result).toBe(3);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should return 0 when no devices exist', async () => {
      prisma.session.updateMany.mockResolvedValue({ count: 0 } as never);
      prisma.device.deleteMany.mockResolvedValue({ count: 0 } as never);

      const result = await service.removeAllForAccount(mockAccount.id);

      expect(result).toBe(0);
    });
  });
});
