import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { PreferencesService } from './preferences.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationChannel, NotificationType } from '../notification/notification.interface';

// Type for mocked Prisma models
type MockPrismaChannelPreference = {
  findMany: Mock;
  findUnique: Mock;
  upsert: Mock;
};

type MockPrismaTypePreference = {
  findMany: Mock;
  findUnique: Mock;
  upsert: Mock;
};

describe('PreferencesService', () => {
  let service: PreferencesService;
  let prisma: {
    channelPreference: MockPrismaChannelPreference;
    typePreference: MockPrismaTypePreference;
    $transaction: Mock;
  };

  const mockChannelPreferences = [
    { tenantId: 'tenant-1', accountId: 'account-1', channel: 'IN_APP', enabled: true },
    { tenantId: 'tenant-1', accountId: 'account-1', channel: 'PUSH', enabled: true },
    { tenantId: 'tenant-1', accountId: 'account-1', channel: 'EMAIL', enabled: true },
    { tenantId: 'tenant-1', accountId: 'account-1', channel: 'SMS', enabled: false },
  ];

  const mockTypePreferences = [
    {
      tenantId: 'tenant-1',
      accountId: 'account-1',
      type: 'SYSTEM',
      enabledChannels: ['IN_APP', 'PUSH', 'EMAIL'],
    },
    {
      tenantId: 'tenant-1',
      accountId: 'account-1',
      type: 'MARKETING',
      enabledChannels: ['EMAIL'],
    },
  ];

  beforeEach(async () => {
    const mockPrisma = {
      channelPreference: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      typePreference: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      $transaction: vi.fn((callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          channelPreference: {
            upsert: vi.fn(),
          },
          typePreference: {
            upsert: vi.fn(),
          },
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PreferencesService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<PreferencesService>(PreferencesService);
    prisma = module.get(PrismaService);
  });

  describe('getPreferences', () => {
    it('should return stored preferences', async () => {
      prisma.channelPreference.findMany.mockResolvedValue(mockChannelPreferences);
      prisma.typePreference.findMany.mockResolvedValue(mockTypePreferences);

      const result = await service.getPreferences({
        tenantId: 'tenant-1',
        accountId: 'account-1',
      });

      expect(result.channelPreferences).toHaveLength(4);
      expect(result.typePreferences).toHaveLength(2);
      expect(result.channelPreferences[0].channel).toBe(
        NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
      );
    });

    it('should return default preferences when none exist', async () => {
      prisma.channelPreference.findMany.mockResolvedValue([]);
      prisma.typePreference.findMany.mockResolvedValue([]);

      const result = await service.getPreferences({
        tenantId: 'tenant-1',
        accountId: 'account-1',
      });

      expect(result.channelPreferences.length).toBeGreaterThan(0);
      expect(result.channelPreferences.every((p) => p.enabled === true)).toBe(true);
    });

    it('should return default preferences on database error', async () => {
      prisma.channelPreference.findMany.mockRejectedValue(new Error('DB error'));

      const result = await service.getPreferences({
        tenantId: 'tenant-1',
        accountId: 'account-1',
      });

      expect(result.channelPreferences.length).toBeGreaterThan(0);
    });
  });

  describe('updatePreferences', () => {
    it('should update channel preferences successfully', async () => {
      const result = await service.updatePreferences({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        channelPreferences: [
          { channel: NotificationChannel.NOTIFICATION_CHANNEL_SMS, enabled: true },
        ],
        typePreferences: [],
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Preferences updated successfully');
    });

    it('should update type preferences successfully', async () => {
      const result = await service.updatePreferences({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        channelPreferences: [],
        typePreferences: [
          {
            type: NotificationType.NOTIFICATION_TYPE_MARKETING,
            enabledChannels: [NotificationChannel.NOTIFICATION_CHANNEL_EMAIL],
          },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('should handle update with both channel and type preferences', async () => {
      const result = await service.updatePreferences({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        channelPreferences: [
          { channel: NotificationChannel.NOTIFICATION_CHANNEL_PUSH, enabled: false },
        ],
        typePreferences: [
          {
            type: NotificationType.NOTIFICATION_TYPE_SYSTEM,
            enabledChannels: [NotificationChannel.NOTIFICATION_CHANNEL_IN_APP],
          },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('should handle transaction errors gracefully', async () => {
      prisma.$transaction.mockRejectedValue(new Error('Transaction failed'));

      const result = await service.updatePreferences({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        channelPreferences: [
          { channel: NotificationChannel.NOTIFICATION_CHANNEL_SMS, enabled: true },
        ],
        typePreferences: [],
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to update preferences');
    });
  });

  describe('isChannelEnabled', () => {
    it('should return true when channel is enabled', async () => {
      prisma.channelPreference.findUnique.mockResolvedValue({
        enabled: true,
      });

      const result = await service.isChannelEnabled(
        'tenant-1',
        'account-1',
        NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
      );

      expect(result).toBe(true);
    });

    it('should return false when channel is disabled', async () => {
      prisma.channelPreference.findUnique.mockResolvedValue({
        enabled: false,
      });

      const result = await service.isChannelEnabled(
        'tenant-1',
        'account-1',
        NotificationChannel.NOTIFICATION_CHANNEL_SMS,
      );

      expect(result).toBe(false);
    });

    it('should return true by default when no preference exists', async () => {
      prisma.channelPreference.findUnique.mockResolvedValue(null);

      const result = await service.isChannelEnabled(
        'tenant-1',
        'account-1',
        NotificationChannel.NOTIFICATION_CHANNEL_EMAIL,
      );

      expect(result).toBe(true);
    });

    it('should return true on database error', async () => {
      prisma.channelPreference.findUnique.mockRejectedValue(new Error('DB error'));

      const result = await service.isChannelEnabled(
        'tenant-1',
        'account-1',
        NotificationChannel.NOTIFICATION_CHANNEL_PUSH,
      );

      expect(result).toBe(true);
    });
  });

  describe('isTypeEnabledForChannel', () => {
    it('should return true when type is enabled for channel', async () => {
      prisma.typePreference.findUnique.mockResolvedValue({
        enabledChannels: ['IN_APP', 'PUSH', 'EMAIL'],
      });

      const result = await service.isTypeEnabledForChannel(
        'tenant-1',
        'account-1',
        NotificationType.NOTIFICATION_TYPE_SYSTEM,
        NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
      );

      expect(result).toBe(true);
    });

    it('should return false when type is not enabled for channel', async () => {
      prisma.typePreference.findUnique.mockResolvedValue({
        enabledChannels: ['EMAIL'],
      });

      const result = await service.isTypeEnabledForChannel(
        'tenant-1',
        'account-1',
        NotificationType.NOTIFICATION_TYPE_MARKETING,
        NotificationChannel.NOTIFICATION_CHANNEL_PUSH,
      );

      expect(result).toBe(false);
    });

    it('should return false for marketing type by default when no preference exists', async () => {
      prisma.typePreference.findUnique.mockResolvedValue(null);

      const result = await service.isTypeEnabledForChannel(
        'tenant-1',
        'account-1',
        NotificationType.NOTIFICATION_TYPE_MARKETING,
        NotificationChannel.NOTIFICATION_CHANNEL_EMAIL,
      );

      expect(result).toBe(false);
    });

    it('should return true for non-marketing types when no preference exists', async () => {
      prisma.typePreference.findUnique.mockResolvedValue(null);

      const result = await service.isTypeEnabledForChannel(
        'tenant-1',
        'account-1',
        NotificationType.NOTIFICATION_TYPE_SYSTEM,
        NotificationChannel.NOTIFICATION_CHANNEL_EMAIL,
      );

      expect(result).toBe(true);
    });

    it('should return true on database error', async () => {
      prisma.typePreference.findUnique.mockRejectedValue(new Error('DB error'));

      const result = await service.isTypeEnabledForChannel(
        'tenant-1',
        'account-1',
        NotificationType.NOTIFICATION_TYPE_SECURITY_ALERT,
        NotificationChannel.NOTIFICATION_CHANNEL_PUSH,
      );

      expect(result).toBe(true);
    });
  });

  describe('getEnabledChannelsForType', () => {
    it('should return only enabled channels for a type', async () => {
      prisma.channelPreference.findUnique
        .mockResolvedValueOnce({ enabled: true }) // IN_APP
        .mockResolvedValueOnce({ enabled: false }) // PUSH
        .mockResolvedValueOnce({ enabled: true }); // EMAIL

      prisma.typePreference.findUnique
        .mockResolvedValueOnce({ enabledChannels: ['IN_APP', 'PUSH', 'EMAIL'] })
        .mockResolvedValueOnce({ enabledChannels: ['IN_APP', 'PUSH', 'EMAIL'] })
        .mockResolvedValueOnce({ enabledChannels: ['IN_APP', 'PUSH', 'EMAIL'] });

      const result = await service.getEnabledChannelsForType(
        'tenant-1',
        'account-1',
        NotificationType.NOTIFICATION_TYPE_SYSTEM,
        [
          NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
          NotificationChannel.NOTIFICATION_CHANNEL_PUSH,
          NotificationChannel.NOTIFICATION_CHANNEL_EMAIL,
        ],
      );

      expect(result).toContain(NotificationChannel.NOTIFICATION_CHANNEL_IN_APP);
      expect(result).not.toContain(NotificationChannel.NOTIFICATION_CHANNEL_PUSH);
      expect(result).toContain(NotificationChannel.NOTIFICATION_CHANNEL_EMAIL);
    });

    it('should return empty array when no channels are enabled', async () => {
      prisma.channelPreference.findUnique.mockResolvedValue({ enabled: false });
      prisma.typePreference.findUnique.mockResolvedValue({ enabledChannels: [] });

      const result = await service.getEnabledChannelsForType(
        'tenant-1',
        'account-1',
        NotificationType.NOTIFICATION_TYPE_MARKETING,
        [NotificationChannel.NOTIFICATION_CHANNEL_EMAIL],
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('default preferences creation', () => {
    it('should include all standard channels in default preferences', async () => {
      prisma.channelPreference.findMany.mockResolvedValue([]);
      prisma.typePreference.findMany.mockResolvedValue([]);

      const result = await service.getPreferences({
        tenantId: 'tenant-1',
        accountId: 'account-1',
      });

      const channels = result.channelPreferences.map((p) => p.channel);
      expect(channels).toContain(NotificationChannel.NOTIFICATION_CHANNEL_IN_APP);
      expect(channels).toContain(NotificationChannel.NOTIFICATION_CHANNEL_PUSH);
      expect(channels).toContain(NotificationChannel.NOTIFICATION_CHANNEL_EMAIL);
      expect(channels).toContain(NotificationChannel.NOTIFICATION_CHANNEL_SMS);
    });

    it('should include security-related types in default preferences', async () => {
      prisma.channelPreference.findMany.mockResolvedValue([]);
      prisma.typePreference.findMany.mockResolvedValue([]);

      const result = await service.getPreferences({
        tenantId: 'tenant-1',
        accountId: 'account-1',
      });

      const types = result.typePreferences.map((p) => p.type);
      expect(types).toContain(NotificationType.NOTIFICATION_TYPE_SYSTEM);
      expect(types).toContain(NotificationType.NOTIFICATION_TYPE_SECURITY_ALERT);
      expect(types).toContain(NotificationType.NOTIFICATION_TYPE_LOGIN_ALERT);
      expect(types).toContain(NotificationType.NOTIFICATION_TYPE_MARKETING);
    });

    it('should restrict marketing type to email only by default', async () => {
      prisma.channelPreference.findMany.mockResolvedValue([]);
      prisma.typePreference.findMany.mockResolvedValue([]);

      const result = await service.getPreferences({
        tenantId: 'tenant-1',
        accountId: 'account-1',
      });

      const marketingPref = result.typePreferences.find(
        (p) => p.type === NotificationType.NOTIFICATION_TYPE_MARKETING,
      );
      expect(marketingPref).toBeDefined();
      expect(marketingPref?.enabledChannels).toEqual([
        NotificationChannel.NOTIFICATION_CHANNEL_EMAIL,
      ]);
    });
  });
});
