import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/database/prisma.service';
import { AttendanceService } from '../../src/attendance/services/attendance.service';
import { WorkScheduleService } from '../../src/attendance/services/work-schedule.service';
import { AttendanceController } from '../../src/attendance/controllers/attendance.controller';
import { WorkScheduleController } from '../../src/attendance/controllers/work-schedule.controller';
import { AttendanceStatus, WorkType } from '@my-girok/types';

/**
 * Integration Tests: Attendance Management
 *
 * Tests the full attendance flow:
 * - Clock-in/clock-out operations
 * - Overtime request and approval
 * - Work schedule management
 * - Attendance statistics calculation
 * - Conflict detection
 *
 * IMPORTANT: These tests require a running PostgreSQL database.
 * They are skipped in CI/CD pipelines and should be run manually
 * in a development environment with a test database.
 *
 * To run: Remove .skip and ensure DATABASE_URL is set to a test database.
 */
describe.skip('Attendance Management Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let attendanceService: AttendanceService;
  let workScheduleService: WorkScheduleService;
  let _attendanceController: AttendanceController;
  let _workScheduleController: WorkScheduleController;
  const testAdminId = 'test-admin-attendance-001';
  const testManagerId = 'test-manager-001';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AttendanceController, WorkScheduleController],
      providers: [AttendanceService, WorkScheduleService, PrismaService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    attendanceService = moduleFixture.get<AttendanceService>(AttendanceService);
    workScheduleService = moduleFixture.get<WorkScheduleService>(WorkScheduleService);
    _attendanceController = moduleFixture.get<AttendanceController>(AttendanceController);
    _workScheduleController = moduleFixture.get<WorkScheduleController>(WorkScheduleController);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.adminAttendance.deleteMany({
      where: {
        admin_id: {
          in: [testAdminId, testManagerId],
        },
      },
    });
    await prisma.adminWorkSchedule.deleteMany({
      where: {
        admin_id: {
          in: [testAdminId, testManagerId],
        },
      },
    });
  });

  describe('Clock-In/Clock-Out Flow', () => {
    it('should successfully clock in for the day', async () => {
      const clockInDto = {
        date: new Date(),
        workType: WorkType.OFFICE,
        notes: 'Regular work day',
      };

      const result = await attendanceService.clockIn(
        testAdminId,
        clockInDto,
        '192.168.1.100',
        'Mozilla/5.0',
      );

      expect(result.adminId).toBe(testAdminId);
      expect(result.status).toBe(AttendanceStatus.PRESENT);
      expect(result.clockIn).toBeDefined();
      expect(result.clockInIp).toBe('192.168.1.100');
      expect(result.workType).toBe(WorkType.OFFICE);
    });

    it('should prevent duplicate clock-in on same day', async () => {
      const clockInDto = {
        date: new Date(),
        workType: WorkType.OFFICE,
      };

      // First clock-in
      await attendanceService.clockIn(testAdminId, clockInDto);

      // Second clock-in should fail
      await expect(attendanceService.clockIn(testAdminId, clockInDto)).rejects.toThrow(
        /Already clocked in/,
      );
    });

    it('should successfully clock out after clock-in', async () => {
      const today = new Date();
      const clockInDto = {
        date: today,
        workType: WorkType.OFFICE,
      };

      // Clock in first
      await attendanceService.clockIn(testAdminId, clockInDto);

      // Wait a bit to simulate work time
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Clock out
      const clockOutDto = {
        date: today,
        notes: 'End of work day',
      };

      const result = await attendanceService.clockOut(
        testAdminId,
        clockOutDto,
        '192.168.1.100',
        'Mozilla/5.0',
      );

      expect(result.clockOut).toBeDefined();
      expect(result.actualMinutes).toBeGreaterThan(0);
      expect(result.clockOutIp).toBe('192.168.1.100');
    });

    it('should prevent clock-out without clock-in', async () => {
      const clockOutDto = {
        date: new Date(),
      };

      await expect(attendanceService.clockOut(testAdminId, clockOutDto)).rejects.toThrow(
        /Must clock in before clocking out/,
      );
    });

    it('should prevent duplicate clock-out', async () => {
      const today = new Date();
      const clockInDto = { date: today, workType: WorkType.OFFICE };
      const clockOutDto = { date: today };

      // Clock in and out
      await attendanceService.clockIn(testAdminId, clockInDto);
      await attendanceService.clockOut(testAdminId, clockOutDto);

      // Second clock-out should fail
      await expect(attendanceService.clockOut(testAdminId, clockOutDto)).rejects.toThrow(
        /Already clocked out/,
      );
    });

    it('should track location for clock-in', async () => {
      const clockInDto = {
        date: new Date(),
        workType: WorkType.REMOTE,
        location: {
          lat: 37.5665,
          lng: 126.978,
          address: 'Seoul, South Korea',
        },
      };

      const result = await attendanceService.clockIn(testAdminId, clockInDto);

      expect(result.clockInLocation).toBeDefined();
      expect(result.workType).toBe(WorkType.REMOTE);
    });
  });

  describe('Overtime Request and Approval', () => {
    it('should request overtime during clock-out', async () => {
      const today = new Date();
      const clockInDto = { date: today, workType: WorkType.OFFICE };
      await attendanceService.clockIn(testAdminId, clockInDto);

      const clockOutDto = {
        date: today,
        overtimeMinutes: 120,
        overtimeReason: 'Project deadline',
      };

      const result = await attendanceService.clockOut(testAdminId, clockOutDto);

      expect(result.overtimeMinutes).toBe(120);
      expect(result.overtimeRequested).toBe(true);
      expect(result.overtimeApproved).toBe(false);
      expect(result.overtimeReason).toBe('Project deadline');
    });

    it('should approve overtime request', async () => {
      const today = new Date();
      const clockInDto = { date: today, workType: WorkType.OFFICE };
      await attendanceService.clockIn(testAdminId, clockInDto);

      const clockOutDto = {
        date: today,
        overtimeMinutes: 90,
        overtimeReason: 'Urgent task',
      };
      const attendance = await attendanceService.clockOut(testAdminId, clockOutDto);

      // Manager approves overtime
      const approveDto = {
        approved: true,
      };
      const result = await attendanceService.approveOvertime(
        attendance.id,
        testManagerId,
        approveDto,
      );

      expect(result.overtimeApproved).toBe(true);
      expect(result.overtimeApprovedBy).toBe(testManagerId);
      expect(result.overtimeApprovedAt).toBeDefined();
    });

    it('should reject overtime request', async () => {
      const today = new Date();
      const clockInDto = { date: today, workType: WorkType.OFFICE };
      await attendanceService.clockIn(testAdminId, clockInDto);

      const clockOutDto = {
        date: today,
        overtimeMinutes: 60,
        overtimeReason: 'Extra work',
      };
      const attendance = await attendanceService.clockOut(testAdminId, clockOutDto);

      // Manager rejects overtime
      const rejectDto = {
        approved: false,
      };
      const result = await attendanceService.approveOvertime(
        attendance.id,
        testManagerId,
        rejectDto,
      );

      expect(result.overtimeApproved).toBe(false);
    });
  });

  describe('Work Schedule Management', () => {
    it('should create a work schedule', async () => {
      const createDto = {
        adminId: testAdminId,
        scheduleType: 'STANDARD',
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

      const result = await workScheduleService.create(createDto);

      expect(result.adminId).toBe(testAdminId);
      expect(result.scheduleType).toBe('STANDARD');
      expect(result.isActive).toBe(true);
      expect(result.weeklyHours).toBe(40);
    });

    it('should deactivate previous schedule when creating new one', async () => {
      const createDto = {
        adminId: testAdminId,
        scheduleType: 'STANDARD',
        effectiveDate: new Date('2026-01-01'),
        timezone: 'Asia/Seoul',
        weeklyHours: 40,
      };

      // Create first schedule
      const first = await workScheduleService.create(createDto);
      expect(first.isActive).toBe(true);

      // Create second schedule
      const secondDto = {
        ...createDto,
        effectiveDate: new Date('2026-02-01'),
        weeklyHours: 35,
      };
      const second = await workScheduleService.create(secondDto);

      expect(second.isActive).toBe(true);

      // Verify first schedule is deactivated
      const firstUpdated = await workScheduleService.findOne(first.id);
      expect(firstUpdated.isActive).toBe(false);
    });

    it('should get active work schedule for admin', async () => {
      const createDto = {
        adminId: testAdminId,
        scheduleType: 'FLEXIBLE',
        effectiveDate: new Date('2026-01-01'),
        coreHoursStart: '10:00',
        coreHoursEnd: '16:00',
        timezone: 'Asia/Seoul',
        weeklyHours: 40,
      };

      await workScheduleService.create(createDto);

      const active = await workScheduleService.findActiveByAdmin(testAdminId);

      expect(active).toBeDefined();
      expect(active?.scheduleType).toBe('FLEXIBLE');
      expect(active?.isActive).toBe(true);
    });

    it('should update work schedule', async () => {
      const createDto = {
        adminId: testAdminId,
        scheduleType: 'STANDARD',
        effectiveDate: new Date('2026-01-01'),
        timezone: 'Asia/Seoul',
        weeklyHours: 40,
      };

      const created = await workScheduleService.create(createDto);

      const updateDto = {
        weeklyHours: 35,
        fridayStart: '09:00',
        fridayEnd: '14:00',
      };

      const updated = await workScheduleService.update(created.id, updateDto);

      expect(updated.weeklyHours).toBe(35);
      expect(updated.fridayEnd).toBe('14:00');
    });
  });

  describe('Attendance Statistics', () => {
    it('should calculate attendance statistics for date range', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');

      // Create multiple attendance records
      for (let i = 1; i <= 5; i++) {
        const date = new Date(2026, 0, i);
        await attendanceService.clockIn(testAdminId, {
          date,
          workType: WorkType.OFFICE,
        });
        await attendanceService.clockOut(testAdminId, { date });
      }

      const stats = await attendanceService.getStats(testAdminId, startDate, endDate);

      expect(stats.totalDays).toBeGreaterThan(0);
      expect(stats.presentDays).toBe(5);
      expect(stats.absentDays).toBeGreaterThanOrEqual(0);
      expect(stats.lateDays).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Attendance Query and Pagination', () => {
    it('should list attendance records with pagination', async () => {
      // Create multiple records
      for (let i = 1; i <= 3; i++) {
        const date = new Date(2026, 0, i);
        await attendanceService.clockIn(testAdminId, {
          date,
          workType: WorkType.OFFICE,
        });
      }

      const query = {
        adminId: testAdminId,
        page: 1,
        limit: 10,
      };

      const result = await attendanceService.listAttendances(query);

      expect(result.data).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(3);
      expect(result.data.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter attendance by date range', async () => {
      // Create records
      await attendanceService.clockIn(testAdminId, {
        date: new Date('2026-01-05'),
        workType: WorkType.OFFICE,
      });
      await attendanceService.clockIn(testAdminId, {
        date: new Date('2026-01-15'),
        workType: WorkType.OFFICE,
      });

      const query = {
        adminId: testAdminId,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-10'),
      };

      const result = await attendanceService.listAttendances(query);

      expect(result.total).toBe(1);
      expect(result.data[0].date.getDate()).toBe(5);
    });

    it('should filter attendance by status', async () => {
      // Create records with different statuses
      await attendanceService.clockIn(testAdminId, {
        date: new Date('2026-01-10'),
        workType: WorkType.OFFICE,
      });

      const query = {
        adminId: testAdminId,
        status: AttendanceStatus.PRESENT,
      };

      const result = await attendanceService.listAttendances(query);

      expect(result.data.every((att) => att.status === AttendanceStatus.PRESENT)).toBe(true);
    });
  });
});
