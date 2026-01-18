import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../../database/prisma.service';
import { AttendanceStatus, WorkType } from '@my-girok/types';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let _prisma: PrismaService;

  const mockPrismaService = {
    adminAttendance: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    _prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('clockIn', () => {
    it('should create a new clock-in record', async () => {
      const adminId = 'admin-123';
      const dto = {
        date: new Date('2026-01-17'),
        workType: WorkType.OFFICE,
      };

      mockPrismaService.adminAttendance.findUnique.mockResolvedValue(null);
      mockPrismaService.adminAttendance.upsert.mockResolvedValue({
        id: 'attendance-1',
        adminId: adminId,
        date: new Date('2026-01-17'),
        clockIn: new Date(),
        workType: WorkType.OFFICE,
        status: AttendanceStatus.PRESENT,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.clockIn(adminId, dto);

      expect(result.id).toBe('attendance-1');
      expect(result.adminId).toBe(adminId);
      expect(result.status).toBe(AttendanceStatus.PRESENT);
      expect(mockPrismaService.adminAttendance.upsert).toHaveBeenCalled();
    });

    it('should throw ConflictException if already clocked in', async () => {
      const adminId = 'admin-123';
      const dto = {
        date: new Date('2026-01-17'),
        workType: WorkType.OFFICE,
      };

      mockPrismaService.adminAttendance.findUnique.mockResolvedValue({
        id: 'attendance-1',
        adminId: adminId,
        date: new Date('2026-01-17'),
        clockIn: new Date(),
      });

      await expect(service.clockIn(adminId, dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('clockOut', () => {
    it('should update clock-out record', async () => {
      const adminId = 'admin-123';
      const dto = {
        date: new Date('2026-01-17'),
        overtimeMinutes: 60,
        overtimeReason: 'Project deadline',
      };

      const clockInTime = new Date('2026-01-17T09:00:00Z');

      mockPrismaService.adminAttendance.findUnique.mockResolvedValue({
        id: 'attendance-1',
        adminId: adminId,
        date: new Date('2026-01-17'),
        clockIn: clockInTime,
        clockOut: null,
        breakMinutes: 60,
      });

      mockPrismaService.adminAttendance.update.mockResolvedValue({
        id: 'attendance-1',
        adminId: adminId,
        date: new Date('2026-01-17'),
        clockIn: clockInTime,
        clockOut: new Date(),
        overtimeMinutes: 60,
        overtimeRequested: true,
        overtimeReason: 'Project deadline',
        status: AttendanceStatus.PRESENT,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.clockOut(adminId, dto);

      expect(result.overtimeMinutes).toBe(60);
      expect(result.overtimeRequested).toBe(true);
      expect(mockPrismaService.adminAttendance.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if no clock-in record', async () => {
      const adminId = 'admin-123';
      const dto = {
        date: new Date('2026-01-17'),
      };

      mockPrismaService.adminAttendance.findUnique.mockResolvedValue(null);

      await expect(service.clockOut(adminId, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if not clocked in yet', async () => {
      const adminId = 'admin-123';
      const dto = {
        date: new Date('2026-01-17'),
      };

      mockPrismaService.adminAttendance.findUnique.mockResolvedValue({
        id: 'attendance-1',
        adminId: adminId,
        date: new Date('2026-01-17'),
        clockIn: null,
      });

      await expect(service.clockOut(adminId, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if already clocked out', async () => {
      const adminId = 'admin-123';
      const dto = {
        date: new Date('2026-01-17'),
      };

      mockPrismaService.adminAttendance.findUnique.mockResolvedValue({
        id: 'attendance-1',
        adminId: adminId,
        date: new Date('2026-01-17'),
        clockIn: new Date(),
        clockOut: new Date(),
      });

      await expect(service.clockOut(adminId, dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('approveOvertime', () => {
    it('should approve overtime request', async () => {
      const attendanceId = 'attendance-1';
      const approverId = 'manager-123';
      const dto = {
        approved: true,
        managerNotes: 'Approved for project work',
      };

      mockPrismaService.adminAttendance.findUnique.mockResolvedValue({
        id: attendanceId,
        adminId: 'admin-123',
        overtimeRequested: true,
        overtimeMinutes: 60,
      });

      mockPrismaService.adminAttendance.update.mockResolvedValue({
        id: attendanceId,
        adminId: 'admin-123',
        overtimeRequested: true,
        overtimeApproved: true,
        overtimeApprovedBy: approverId,
        overtimeApprovedAt: new Date(),
        managerNotes: 'Approved for project work',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.approveOvertime(attendanceId, approverId, dto);

      expect(result.overtimeApproved).toBe(true);
      expect(result.overtimeApprovedBy).toBe(approverId);
      expect(result.managerNotes).toBe('Approved for project work');
    });

    it('should throw NotFoundException if attendance not found', async () => {
      mockPrismaService.adminAttendance.findUnique.mockResolvedValue(null);

      await expect(
        service.approveOvertime('invalid-id', 'manager-123', { approved: true }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if no overtime request', async () => {
      mockPrismaService.adminAttendance.findUnique.mockResolvedValue({
        id: 'attendance-1',
        overtimeRequested: false,
      });

      await expect(
        service.approveOvertime('attendance-1', 'manager-123', { approved: true }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStats', () => {
    it('should calculate attendance statistics', async () => {
      const adminId = 'admin-123';
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');

      const attendances = [
        {
          status: AttendanceStatus.PRESENT,
          workType: WorkType.OFFICE,
          actualMinutes: 480,
          overtimeMinutes: 0,
          lateMinutes: 0,
        },
        {
          status: AttendanceStatus.PRESENT,
          workType: WorkType.REMOTE,
          actualMinutes: 500,
          overtimeMinutes: 20,
          lateMinutes: 0,
        },
        {
          status: AttendanceStatus.LATE,
          workType: WorkType.OFFICE,
          actualMinutes: 460,
          overtimeMinutes: 0,
          lateMinutes: 20,
        },
        {
          status: AttendanceStatus.ABSENT,
          workType: WorkType.OFFICE,
          actualMinutes: 0,
          overtimeMinutes: 0,
          lateMinutes: 0,
        },
      ];

      mockPrismaService.adminAttendance.findMany.mockResolvedValue(attendances);

      const result = await service.getStats(adminId, startDate, endDate);

      expect(result.totalDays).toBe(4);
      expect(result.presentDays).toBe(2);
      expect(result.absentDays).toBe(1);
      expect(result.lateDays).toBe(1);
      expect(result.remoteDays).toBe(1);
      expect(result.totalOvertimeMinutes).toBe(20);
      expect(result.averageWorkMinutes).toBeGreaterThan(0);
    });
  });

  describe('listAttendances', () => {
    it('should list attendances with pagination', async () => {
      const query = {
        adminId: 'admin-123',
        page: 1,
        limit: 20,
      };

      const attendances = [
        {
          id: 'attendance-1',
          adminId: 'admin-123',
          date: new Date('2026-01-17'),
          status: AttendanceStatus.PRESENT,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.$transaction.mockResolvedValue([attendances, 1]);

      const result = await service.listAttendances(query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      const query = {
        status: AttendanceStatus.LATE,
        page: 1,
        limit: 20,
      };

      mockPrismaService.$transaction.mockResolvedValue([[], 0]);

      await service.listAttendances(query);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should filter by date range', async () => {
      const query = {
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-31'),
        page: 1,
        limit: 20,
      };

      mockPrismaService.$transaction.mockResolvedValue([[], 0]);

      await service.listAttendances(query);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });
});
