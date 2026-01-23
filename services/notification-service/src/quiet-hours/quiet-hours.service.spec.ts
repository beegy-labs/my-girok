import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { QuietHoursService } from './quiet-hours.service';
import { PrismaService } from '../prisma/prisma.service';
import { Priority } from '../notification/notification.interface';

// Type for mocked Prisma models
type MockPrismaQuietHours = {
  findUnique: Mock;
  upsert: Mock;
};

describe('QuietHoursService', () => {
  let service: QuietHoursService;
  let prisma: { quietHours: MockPrismaQuietHours };

  const mockQuietHours = {
    tenantId: 'tenant-1',
    accountId: 'account-1',
    enabled: true,
    startTime: '22:00',
    endTime: '08:00',
    timezone: 'Asia/Seoul',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      quietHours: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [QuietHoursService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<QuietHoursService>(QuietHoursService);
    prisma = module.get(PrismaService);
  });

  describe('getQuietHours', () => {
    it('should return stored quiet hours settings', async () => {
      prisma.quietHours.findUnique.mockResolvedValue(mockQuietHours);

      const result = await service.getQuietHours({
        tenantId: 'tenant-1',
        accountId: 'account-1',
      });

      expect(result.enabled).toBe(true);
      expect(result.startTime).toBe('22:00');
      expect(result.endTime).toBe('08:00');
      expect(result.timezone).toBe('Asia/Seoul');
    });

    it('should return default quiet hours when none exist', async () => {
      prisma.quietHours.findUnique.mockResolvedValue(null);

      const result = await service.getQuietHours({
        tenantId: 'tenant-1',
        accountId: 'account-1',
      });

      expect(result.enabled).toBe(false);
      expect(result.startTime).toBe('22:00');
      expect(result.endTime).toBe('08:00');
      expect(result.timezone).toBe('UTC');
    });

    it('should return default quiet hours on database error', async () => {
      prisma.quietHours.findUnique.mockRejectedValue(new Error('DB error'));

      const result = await service.getQuietHours({
        tenantId: 'tenant-1',
        accountId: 'account-1',
      });

      expect(result.enabled).toBe(false);
      expect(result.timezone).toBe('UTC');
    });
  });

  describe('updateQuietHours', () => {
    it('should update quiet hours successfully', async () => {
      prisma.quietHours.upsert.mockResolvedValue(mockQuietHours);

      const result = await service.updateQuietHours({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        enabled: true,
        startTime: '23:00',
        endTime: '07:00',
        timezone: 'America/New_York',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Quiet hours updated successfully');
    });

    it('should reject invalid timezone', async () => {
      const result = await service.updateQuietHours({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        enabled: true,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'Invalid/Timezone',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid timezone');
    });

    it('should reject invalid start time format', async () => {
      const result = await service.updateQuietHours({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        enabled: true,
        startTime: '25:00',
        endTime: '08:00',
        timezone: 'UTC',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid start time format');
    });

    it('should reject invalid end time format', async () => {
      const result = await service.updateQuietHours({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        enabled: true,
        startTime: '22:00',
        endTime: '8:00:00',
        timezone: 'UTC',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid end time format');
    });

    it('should accept valid time formats', async () => {
      prisma.quietHours.upsert.mockResolvedValue(mockQuietHours);

      const result = await service.updateQuietHours({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        enabled: true,
        startTime: '9:30',
        endTime: '17:45',
        timezone: 'UTC',
      });

      expect(result.success).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      prisma.quietHours.upsert.mockRejectedValue(new Error('DB error'));

      const result = await service.updateQuietHours({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        enabled: true,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'UTC',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to update quiet hours');
    });

    it('should use default values for empty fields', async () => {
      prisma.quietHours.upsert.mockResolvedValue(mockQuietHours);

      await service.updateQuietHours({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        enabled: true,
        startTime: '',
        endTime: '',
        timezone: '',
      });

      expect(prisma.quietHours.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            startTime: '22:00',
            endTime: '08:00',
            timezone: 'UTC',
          }),
        }),
      );
    });
  });

  describe('shouldSuppressNotification', () => {
    it('should not suppress URGENT priority notifications', async () => {
      const result = await service.shouldSuppressNotification(
        'tenant-1',
        'account-1',
        Priority.PRIORITY_URGENT,
      );

      expect(result).toBe(false);
      expect(prisma.quietHours.findUnique).not.toHaveBeenCalled();
    });

    it('should not suppress when quiet hours are disabled', async () => {
      prisma.quietHours.findUnique.mockResolvedValue({
        ...mockQuietHours,
        enabled: false,
      });

      const result = await service.shouldSuppressNotification(
        'tenant-1',
        'account-1',
        Priority.PRIORITY_NORMAL,
      );

      expect(result).toBe(false);
    });

    it('should not suppress when no quiet hours exist', async () => {
      prisma.quietHours.findUnique.mockResolvedValue(null);

      const result = await service.shouldSuppressNotification(
        'tenant-1',
        'account-1',
        Priority.PRIORITY_NORMAL,
      );

      expect(result).toBe(false);
    });

    it('should check quiet hours for non-urgent notifications', async () => {
      prisma.quietHours.findUnique.mockResolvedValue(mockQuietHours);

      await service.shouldSuppressNotification('tenant-1', 'account-1', Priority.PRIORITY_NORMAL);

      expect(prisma.quietHours.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_accountId: {
            tenantId: 'tenant-1',
            accountId: 'account-1',
          },
        },
      });
    });

    it('should not suppress on database error', async () => {
      prisma.quietHours.findUnique.mockRejectedValue(new Error('DB error'));

      const result = await service.shouldSuppressNotification(
        'tenant-1',
        'account-1',
        Priority.PRIORITY_NORMAL,
      );

      expect(result).toBe(false);
    });

    it('should check HIGH priority notifications', async () => {
      prisma.quietHours.findUnique.mockResolvedValue(mockQuietHours);

      await service.shouldSuppressNotification('tenant-1', 'account-1', Priority.PRIORITY_HIGH);

      expect(prisma.quietHours.findUnique).toHaveBeenCalled();
    });

    it('should check LOW priority notifications', async () => {
      prisma.quietHours.findUnique.mockResolvedValue(mockQuietHours);

      await service.shouldSuppressNotification('tenant-1', 'account-1', Priority.PRIORITY_LOW);

      expect(prisma.quietHours.findUnique).toHaveBeenCalled();
    });
  });

  describe('getQuietHoursConfig', () => {
    it('should return config for enabled quiet hours', async () => {
      prisma.quietHours.findUnique.mockResolvedValue(mockQuietHours);

      const result = await service.getQuietHoursConfig('tenant-1', 'account-1');

      expect(result).not.toBeNull();
      expect(result?.enabled).toBe(true);
      expect(result?.startTime).toBe('22:00');
      expect(result?.endTime).toBe('08:00');
      expect(result?.timezone).toBe('Asia/Seoul');
    });

    it('should return null when quiet hours do not exist', async () => {
      prisma.quietHours.findUnique.mockResolvedValue(null);

      const result = await service.getQuietHoursConfig('tenant-1', 'account-1');

      expect(result).toBeNull();
    });

    it('should return null when quiet hours are disabled', async () => {
      prisma.quietHours.findUnique.mockResolvedValue({
        ...mockQuietHours,
        enabled: false,
      });

      const result = await service.getQuietHoursConfig('tenant-1', 'account-1');

      expect(result).toBeNull();
    });

    it('should return null on database error', async () => {
      prisma.quietHours.findUnique.mockRejectedValue(new Error('DB error'));

      const result = await service.getQuietHoursConfig('tenant-1', 'account-1');

      expect(result).toBeNull();
    });
  });
});
