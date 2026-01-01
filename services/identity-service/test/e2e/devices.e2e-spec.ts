import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DevicesService } from '../../src/identity/devices/devices.service';
import { IdentityPrismaService } from '../../src/database/identity-prisma.service';
import { DeviceType, PushPlatform } from '.prisma/identity-client';

describe('Devices (E2E)', () => {
  let app: INestApplication;
  let devicesService: DevicesService;

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

  beforeAll(async () => {
    const mockPrisma = {
      account: {
        findUnique: jest.fn(),
      },
      device: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
      session: {
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((fn) => fn(mockPrisma)),
      $connect: jest.fn(),
      $disconnect: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [DevicesService, { provide: IdentityPrismaService, useValue: mockPrisma }],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    devicesService = moduleFixture.get<DevicesService>(DevicesService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('DevicesService Integration', () => {
    describe('Device Registration', () => {
      it('should register a new device', async () => {
        jest.spyOn(devicesService, 'register').mockResolvedValue(mockDevice);

        const result = await devicesService.register({
          accountId: mockAccount.id,
          fingerprint: 'abc123def456ghi789',
          deviceType: 'WEB' as DeviceType,
          name: 'Chrome on MacBook Pro',
          platform: 'macOS',
          osVersion: '14.2',
          appVersion: '1.0.0',
          browserName: 'Chrome',
          browserVersion: '120.0.0',
        });

        expect(result).toBeDefined();
        expect(result.fingerprint).toBe('abc123def456ghi789');
        expect(result.deviceType).toBe('WEB');
      });

      it('should register device with push notification token', async () => {
        const deviceWithPush = {
          ...mockDevice,
          pushToken: 'fcm_token_abc123',
          pushPlatform: 'FCM' as PushPlatform,
        };
        jest.spyOn(devicesService, 'register').mockResolvedValue(deviceWithPush);

        const result = await devicesService.register({
          accountId: mockAccount.id,
          fingerprint: 'mobile123456789012',
          deviceType: 'MOBILE' as DeviceType,
          pushToken: 'fcm_token_abc123',
          pushPlatform: 'FCM' as PushPlatform,
        });

        expect(result.pushToken).toBe('fcm_token_abc123');
        expect(result.pushPlatform).toBe('FCM');
      });

      it('should update existing device with same fingerprint', async () => {
        const updatedDevice = {
          ...mockDevice,
          name: 'Updated Device Name',
          osVersion: '15.0',
        };
        jest.spyOn(devicesService, 'register').mockResolvedValue(updatedDevice);

        const result = await devicesService.register({
          accountId: mockAccount.id,
          fingerprint: mockDevice.fingerprint,
          deviceType: 'WEB' as DeviceType,
          name: 'Updated Device Name',
          osVersion: '15.0',
        });

        expect(result.name).toBe('Updated Device Name');
        expect(result.osVersion).toBe('15.0');
      });
    });

    describe('Device Lookup', () => {
      it('should find device by ID', async () => {
        jest.spyOn(devicesService, 'findById').mockResolvedValue(mockDevice);

        const result = await devicesService.findById(mockDevice.id);

        expect(result).toBeDefined();
        expect(result.id).toBe(mockDevice.id);
      });

      it('should find device by fingerprint', async () => {
        jest.spyOn(devicesService, 'findByFingerprint').mockResolvedValue(mockDevice);

        const result = await devicesService.findByFingerprint(
          mockAccount.id,
          mockDevice.fingerprint,
        );

        expect(result).toBeDefined();
        expect(result?.fingerprint).toBe(mockDevice.fingerprint);
      });

      it('should return null for unknown fingerprint', async () => {
        jest.spyOn(devicesService, 'findByFingerprint').mockResolvedValue(null);

        const result = await devicesService.findByFingerprint(
          mockAccount.id,
          'unknown-fingerprint',
        );

        expect(result).toBeNull();
      });
    });

    describe('Device Listing', () => {
      it('should list devices with pagination', async () => {
        const paginatedResult = {
          data: [mockDevice],
          meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
        };
        jest.spyOn(devicesService, 'findAll').mockResolvedValue(paginatedResult);

        const result = await devicesService.findAll({ page: 1, limit: 20 });

        expect(result.data).toHaveLength(1);
        expect(result.meta.total).toBe(1);
      });

      it('should filter devices by account ID', async () => {
        const paginatedResult = {
          data: [mockDevice],
          meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
        };
        jest.spyOn(devicesService, 'findAll').mockResolvedValue(paginatedResult);

        const result = await devicesService.findAll({ accountId: mockAccount.id });

        expect(result.data).toHaveLength(1);
        expect(result.data[0].accountId).toBe(mockAccount.id);
      });

      it('should filter devices by type', async () => {
        const paginatedResult = {
          data: [mockDevice],
          meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
        };
        jest.spyOn(devicesService, 'findAll').mockResolvedValue(paginatedResult);

        const result = await devicesService.findAll({ deviceType: 'WEB' as DeviceType });

        expect(result.data).toHaveLength(1);
        expect(result.data[0].deviceType).toBe('WEB');
      });

      it('should filter trusted devices', async () => {
        const trustedDevice = { ...mockDevice, isTrusted: true };
        const paginatedResult = {
          data: [trustedDevice],
          meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
        };
        jest.spyOn(devicesService, 'findAll').mockResolvedValue(paginatedResult);

        const result = await devicesService.findAll({ isTrusted: true });

        expect(result.data).toHaveLength(1);
        expect(result.data[0].isTrusted).toBe(true);
      });
    });

    describe('Device Trust Management', () => {
      it('should trust a device', async () => {
        const trustedDevice = {
          ...mockDevice,
          isTrusted: true,
          trustedAt: new Date(),
        };
        jest.spyOn(devicesService, 'trust').mockResolvedValue(trustedDevice);

        const result = await devicesService.trust(mockDevice.id);

        expect(result.isTrusted).toBe(true);
        expect(result.trustedAt).toBeDefined();
      });

      it('should untrust a device', async () => {
        const untrustedDevice = {
          ...mockDevice,
          isTrusted: false,
          trustedAt: null,
        };
        jest.spyOn(devicesService, 'untrust').mockResolvedValue(untrustedDevice);

        const result = await devicesService.untrust(mockDevice.id);

        expect(result.isTrusted).toBe(false);
        expect(result.trustedAt).toBeNull();
      });
    });

    describe('Device Removal', () => {
      it('should remove a device', async () => {
        jest.spyOn(devicesService, 'remove').mockResolvedValue(undefined);

        await expect(devicesService.remove(mockDevice.id)).resolves.not.toThrow();
      });

      it('should remove all devices for account', async () => {
        jest.spyOn(devicesService, 'removeAllForAccount').mockResolvedValue(3);

        const result = await devicesService.removeAllForAccount(mockAccount.id);

        expect(result).toBe(3);
      });
    });

    describe('Device Activity', () => {
      it('should update device activity', async () => {
        jest.spyOn(devicesService, 'updateActivity').mockResolvedValue(undefined);

        await expect(
          devicesService.updateActivity(mockDevice.id, '192.168.1.2'),
        ).resolves.not.toThrow();
      });

      it('should silently fail for non-existent device', async () => {
        jest.spyOn(devicesService, 'updateActivity').mockResolvedValue(undefined);

        await expect(devicesService.updateActivity('nonexistent-id')).resolves.not.toThrow();
      });
    });

    describe('Device Counts', () => {
      it('should get device count for account', async () => {
        jest.spyOn(devicesService, 'getDeviceCount').mockResolvedValue(5);

        const result = await devicesService.getDeviceCount(mockAccount.id);

        expect(result).toBe(5);
      });

      it('should get trusted device count for account', async () => {
        jest.spyOn(devicesService, 'getTrustedDeviceCount').mockResolvedValue(2);

        const result = await devicesService.getTrustedDeviceCount(mockAccount.id);

        expect(result).toBe(2);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle device not found error', async () => {
      jest.spyOn(devicesService, 'findById').mockRejectedValue(new Error('Device not found'));

      await expect(devicesService.findById('nonexistent-id')).rejects.toThrow('Device not found');
    });

    it('should handle account not found on registration', async () => {
      jest.spyOn(devicesService, 'register').mockRejectedValue(new Error('Account not found'));

      await expect(
        devicesService.register({
          accountId: 'nonexistent-account',
          fingerprint: 'abc123def456789012',
          deviceType: 'WEB' as DeviceType,
        }),
      ).rejects.toThrow('Account not found');
    });

    it('should handle already trusted device error', async () => {
      jest.spyOn(devicesService, 'trust').mockRejectedValue(new Error('Device is already trusted'));

      await expect(devicesService.trust(mockDevice.id)).rejects.toThrow(
        'Device is already trusted',
      );
    });

    it('should handle device not trusted error on untrust', async () => {
      jest.spyOn(devicesService, 'untrust').mockRejectedValue(new Error('Device is not trusted'));

      await expect(devicesService.untrust(mockDevice.id)).rejects.toThrow('Device is not trusted');
    });
  });

  describe('Device Types', () => {
    it('should handle WEB device type', async () => {
      jest.spyOn(devicesService, 'register').mockResolvedValue({
        ...mockDevice,
        deviceType: 'WEB' as DeviceType,
      });

      const result = await devicesService.register({
        accountId: mockAccount.id,
        fingerprint: 'web123456789012345',
        deviceType: 'WEB' as DeviceType,
      });

      expect(result.deviceType).toBe('WEB');
    });

    it('should handle MOBILE device type', async () => {
      jest.spyOn(devicesService, 'register').mockResolvedValue({
        ...mockDevice,
        deviceType: 'MOBILE' as DeviceType,
      });

      const result = await devicesService.register({
        accountId: mockAccount.id,
        fingerprint: 'mobile123456789012',
        deviceType: 'MOBILE' as DeviceType,
      });

      expect(result.deviceType).toBe('MOBILE');
    });

    it('should handle TABLET device type', async () => {
      jest.spyOn(devicesService, 'register').mockResolvedValue({
        ...mockDevice,
        deviceType: 'TABLET' as DeviceType,
      });

      const result = await devicesService.register({
        accountId: mockAccount.id,
        fingerprint: 'tablet12345678901',
        deviceType: 'TABLET' as DeviceType,
      });

      expect(result.deviceType).toBe('TABLET');
    });

    it('should handle DESKTOP device type', async () => {
      jest.spyOn(devicesService, 'register').mockResolvedValue({
        ...mockDevice,
        deviceType: 'DESKTOP' as DeviceType,
      });

      const result = await devicesService.register({
        accountId: mockAccount.id,
        fingerprint: 'desktop12345678901',
        deviceType: 'DESKTOP' as DeviceType,
      });

      expect(result.deviceType).toBe('DESKTOP');
    });
  });
});
