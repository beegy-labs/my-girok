import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WorkScheduleService } from './work-schedule.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScheduleType } from '../dto/work-schedule.dto';

describe('WorkScheduleService', () => {
  let service: WorkScheduleService;
  let prisma: PrismaService;

  const mockPrismaService = {
    adminWorkSchedule: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkScheduleService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WorkScheduleService>(WorkScheduleService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new work schedule and deactivate previous ones', async () => {
      const dto = {
        adminId: 'admin-123',
        scheduleType: ScheduleType.STANDARD,
        effectiveDate: new Date('2026-01-01'),
        mondayStart: '09:00',
        mondayEnd: '18:00',
        tuesdayStart: '09:00',
        tuesdayEnd: '18:00',
        wednesdayStart: '09:00',
        wednesdayEnd: '18:00',
        thursdayStart: '09:00',
        thursdayEnd: '18:00',
        fridayStart: '09:00',
        fridayEnd: '18:00',
        weeklyHours: 40,
        timezone: 'Asia/Seoul',
      };

      mockPrismaService.adminWorkSchedule.updateMany.mockResolvedValue({
        count: 1,
      });

      mockPrismaService.adminWorkSchedule.create.mockResolvedValue({
        id: 'schedule-1',
        admin_id: dto.adminId,
        schedule_type: dto.scheduleType,
        effective_date: dto.effectiveDate,
        weekly_hours: '40',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await service.create(dto);

      expect(result.id).toBe('schedule-1');
      expect(result.scheduleType).toBe(ScheduleType.STANDARD);
      expect(mockPrismaService.adminWorkSchedule.updateMany).toHaveBeenCalled();
      expect(mockPrismaService.adminWorkSchedule.create).toHaveBeenCalled();
    });
  });

  describe('findByAdmin', () => {
    it('should return all schedules for an admin', async () => {
      const adminId = 'admin-123';

      mockPrismaService.adminWorkSchedule.findMany.mockResolvedValue([
        {
          id: 'schedule-1',
          admin_id: adminId,
          schedule_type: ScheduleType.STANDARD,
          effective_date: new Date('2026-01-01'),
          weekly_hours: '40',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      const result = await service.findByAdmin(adminId);

      expect(result).toHaveLength(1);
      expect(result[0].adminId).toBe(adminId);
    });
  });

  describe('findActiveByAdmin', () => {
    it('should return active schedule for an admin', async () => {
      const adminId = 'admin-123';

      mockPrismaService.adminWorkSchedule.findFirst.mockResolvedValue({
        id: 'schedule-1',
        admin_id: adminId,
        schedule_type: ScheduleType.STANDARD,
        is_active: true,
        weekly_hours: '40',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await service.findActiveByAdmin(adminId);

      expect(result).toBeDefined();
      expect(result?.isActive).toBe(true);
    });

    it('should return null if no active schedule', async () => {
      mockPrismaService.adminWorkSchedule.findFirst.mockResolvedValue(null);

      const result = await service.findActiveByAdmin('admin-123');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a work schedule', async () => {
      const scheduleId = 'schedule-1';
      const dto = {
        weeklyHours: 35,
        fridayStart: '09:00',
        fridayEnd: '14:00',
      };

      mockPrismaService.adminWorkSchedule.update.mockResolvedValue({
        id: scheduleId,
        admin_id: 'admin-123',
        weekly_hours: '35',
        friday_start: '09:00',
        friday_end: '14:00',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await service.update(scheduleId, dto);

      expect(result.weeklyHours).toBe(35);
      expect(mockPrismaService.adminWorkSchedule.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a work schedule', async () => {
      const scheduleId = 'schedule-1';

      mockPrismaService.adminWorkSchedule.delete.mockResolvedValue({
        id: scheduleId,
      });

      await service.remove(scheduleId);

      expect(mockPrismaService.adminWorkSchedule.delete).toHaveBeenCalledWith({
        where: { id: scheduleId },
      });
    });
  });

  describe('findOne', () => {
    it('should find a work schedule by ID', async () => {
      const scheduleId = 'schedule-1';

      mockPrismaService.adminWorkSchedule.findUnique.mockResolvedValue({
        id: scheduleId,
        admin_id: 'admin-123',
        weekly_hours: '40',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await service.findOne(scheduleId);

      expect(result.id).toBe(scheduleId);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.adminWorkSchedule.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});
