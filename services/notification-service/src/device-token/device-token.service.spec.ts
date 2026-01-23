import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { DeviceTokenService } from './device-token.service';
import { PrismaService } from '../prisma/prisma.service';
import { Platform } from '../notification/notification.interface';

// Type for mocked Prisma models
type MockPrismaDeviceToken = {
  findMany: Mock;
  findUnique: Mock;
  upsert: Mock;
  deleteMany: Mock;
  update: Mock;
};

describe('DeviceTokenService', () => {
  let service: DeviceTokenService;
  let prisma: { deviceToken: MockPrismaDeviceToken };

  const mockDeviceToken = {
    id: 'token-123',
    tenantId: 'tenant-1',
    accountId: 'account-1',
    token: 'fcm-token-abc123',
    platform: 'IOS',
    deviceId: 'device-uuid-123',
    deviceInfo: { model: 'iPhone 15', osVersion: '17.0' },
    lastUsedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      deviceToken: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        upsert: vi.fn(),
        deleteMany: vi.fn(),
        update: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DeviceTokenService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<DeviceTokenService>(DeviceTokenService);
    prisma = module.get(PrismaService);
  });

  describe('registerDeviceToken', () => {
    it('should register a new device token successfully', async () => {
      prisma.deviceToken.upsert.mockResolvedValue(mockDeviceToken);

      const result = await service.registerDeviceToken({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        token: 'fcm-token-abc123',
        platform: Platform.PLATFORM_IOS,
        deviceId: 'device-uuid-123',
        deviceInfo: { model: 'iPhone 15', osVersion: '17.0' },
      });

      expect(result.success).toBe(true);
      expect(result.deviceTokenId).toBe('token-123');
      expect(result.message).toBe('Device token registered successfully');
    });

    it('should update existing device token on re-registration', async () => {
      prisma.deviceToken.upsert.mockResolvedValue({
        ...mockDeviceToken,
        token: 'new-fcm-token',
      });

      const result = await service.registerDeviceToken({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        token: 'new-fcm-token',
        platform: Platform.PLATFORM_IOS,
        deviceId: 'device-uuid-123',
        deviceInfo: { model: 'iPhone 15', osVersion: '17.0' },
      });

      expect(result.success).toBe(true);
      expect(prisma.deviceToken.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId_accountId_deviceId: {
              tenantId: 'tenant-1',
              accountId: 'account-1',
              deviceId: 'device-uuid-123',
            },
          },
        }),
      );
    });

    it('should register token for Android platform', async () => {
      prisma.deviceToken.upsert.mockResolvedValue({
        ...mockDeviceToken,
        platform: 'ANDROID',
      });

      const result = await service.registerDeviceToken({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        token: 'fcm-android-token',
        platform: Platform.PLATFORM_ANDROID,
        deviceId: 'android-device-123',
        deviceInfo: { model: 'Pixel 8', osVersion: '14' },
      });

      expect(result.success).toBe(true);
    });

    it('should register token for Web platform', async () => {
      prisma.deviceToken.upsert.mockResolvedValue({
        ...mockDeviceToken,
        platform: 'WEB',
      });

      const result = await service.registerDeviceToken({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        token: 'web-push-token',
        platform: Platform.PLATFORM_WEB,
        deviceId: 'browser-fingerprint-123',
        deviceInfo: { browser: 'Chrome', os: 'Windows' },
      });

      expect(result.success).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      prisma.deviceToken.upsert.mockRejectedValue(new Error('DB connection failed'));

      const result = await service.registerDeviceToken({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        token: 'fcm-token',
        platform: Platform.PLATFORM_IOS,
        deviceId: 'device-123',
        deviceInfo: {},
      });

      expect(result.success).toBe(false);
      expect(result.deviceTokenId).toBe('');
      expect(result.message).toContain('Failed to register device token');
    });
  });

  describe('unregisterDeviceToken', () => {
    it('should unregister device token successfully', async () => {
      prisma.deviceToken.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.unregisterDeviceToken({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        token: 'fcm-token-abc123',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Device token unregistered successfully');
    });

    it('should return failure when token not found', async () => {
      prisma.deviceToken.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.unregisterDeviceToken({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        token: 'non-existent-token',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Device token not found');
    });

    it('should handle database errors gracefully', async () => {
      prisma.deviceToken.deleteMany.mockRejectedValue(new Error('DB error'));

      const result = await service.unregisterDeviceToken({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        token: 'fcm-token',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to unregister device token');
    });
  });

  describe('getDeviceTokens', () => {
    it('should return all device tokens for an account', async () => {
      const tokens = [
        { ...mockDeviceToken, id: 'token-1', platform: 'IOS' },
        { ...mockDeviceToken, id: 'token-2', platform: 'ANDROID', deviceId: 'android-123' },
      ];
      prisma.deviceToken.findMany.mockResolvedValue(tokens);

      const result = await service.getDeviceTokens({
        tenantId: 'tenant-1',
        accountId: 'account-1',
      });

      expect(result.tokens).toHaveLength(2);
      expect(result.tokens[0].platform).toBe(Platform.PLATFORM_IOS);
      expect(result.tokens[1].platform).toBe(Platform.PLATFORM_ANDROID);
    });

    it('should return empty array when no tokens exist', async () => {
      prisma.deviceToken.findMany.mockResolvedValue([]);

      const result = await service.getDeviceTokens({
        tenantId: 'tenant-1',
        accountId: 'new-account',
      });

      expect(result.tokens).toHaveLength(0);
    });

    it('should order tokens by last used date descending', async () => {
      const tokens = [mockDeviceToken];
      prisma.deviceToken.findMany.mockResolvedValue(tokens);

      await service.getDeviceTokens({
        tenantId: 'tenant-1',
        accountId: 'account-1',
      });

      expect(prisma.deviceToken.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { lastUsedAt: 'desc' },
        }),
      );
    });

    it('should handle database errors gracefully', async () => {
      prisma.deviceToken.findMany.mockRejectedValue(new Error('DB error'));

      const result = await service.getDeviceTokens({
        tenantId: 'tenant-1',
        accountId: 'account-1',
      });

      expect(result.tokens).toHaveLength(0);
    });

    it('should include timestamp data in response', async () => {
      const now = new Date();
      prisma.deviceToken.findMany.mockResolvedValue([
        { ...mockDeviceToken, lastUsedAt: now, createdAt: now },
      ]);

      const result = await service.getDeviceTokens({
        tenantId: 'tenant-1',
        accountId: 'account-1',
      });

      expect(result.tokens[0].lastUsedAt).toBeDefined();
      expect(result.tokens[0].lastUsedAt?.seconds).toBe(Math.floor(now.getTime() / 1000));
      expect(result.tokens[0].createdAt.seconds).toBe(Math.floor(now.getTime() / 1000));
    });

    it('should handle null lastUsedAt', async () => {
      prisma.deviceToken.findMany.mockResolvedValue([{ ...mockDeviceToken, lastUsedAt: null }]);

      const result = await service.getDeviceTokens({
        tenantId: 'tenant-1',
        accountId: 'account-1',
      });

      expect(result.tokens[0].lastUsedAt).toBeUndefined();
    });
  });

  describe('getActiveTokensForAccount', () => {
    it('should return token strings for push notifications', async () => {
      prisma.deviceToken.findMany.mockResolvedValue([
        { token: 'token-1' },
        { token: 'token-2' },
        { token: 'token-3' },
      ]);

      const result = await service.getActiveTokensForAccount('tenant-1', 'account-1');

      expect(result).toEqual(['token-1', 'token-2', 'token-3']);
    });

    it('should return empty array when no tokens exist', async () => {
      prisma.deviceToken.findMany.mockResolvedValue([]);

      const result = await service.getActiveTokensForAccount('tenant-1', 'account-1');

      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      prisma.deviceToken.findMany.mockRejectedValue(new Error('DB error'));

      const result = await service.getActiveTokensForAccount('tenant-1', 'account-1');

      expect(result).toEqual([]);
    });
  });

  describe('updateLastUsed', () => {
    it('should update last used timestamp', async () => {
      prisma.deviceToken.update.mockResolvedValue(mockDeviceToken);

      await service.updateLastUsed('token-123');

      expect(prisma.deviceToken.update).toHaveBeenCalledWith({
        where: { id: 'token-123' },
        data: { lastUsedAt: expect.any(Date) },
      });
    });

    it('should handle update errors silently', async () => {
      prisma.deviceToken.update.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect(service.updateLastUsed('token-123')).resolves.not.toThrow();
    });
  });

  describe('removeInvalidToken', () => {
    it('should remove invalid token', async () => {
      prisma.deviceToken.deleteMany.mockResolvedValue({ count: 1 });

      await service.removeInvalidToken('invalid-fcm-token');

      expect(prisma.deviceToken.deleteMany).toHaveBeenCalledWith({
        where: { token: 'invalid-fcm-token' },
      });
    });

    it('should handle deletion errors silently', async () => {
      prisma.deviceToken.deleteMany.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect(service.removeInvalidToken('invalid-token')).resolves.not.toThrow();
    });
  });

  describe('duplicate token handling', () => {
    it('should use upsert to handle duplicate device registrations', async () => {
      prisma.deviceToken.upsert.mockResolvedValue(mockDeviceToken);

      await service.registerDeviceToken({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        token: 'new-token',
        platform: Platform.PLATFORM_IOS,
        deviceId: 'device-123',
        deviceInfo: {},
      });

      expect(prisma.deviceToken.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            tenantId: 'tenant-1',
            accountId: 'account-1',
            token: 'new-token',
          }),
          update: expect.objectContaining({
            token: 'new-token',
            lastUsedAt: expect.any(Date),
          }),
        }),
      );
    });
  });
});
