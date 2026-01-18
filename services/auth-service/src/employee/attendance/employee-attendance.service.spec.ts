import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmployeeAttendanceService } from './employee-attendance.service';
import { AttendanceService } from '../../attendance/services/attendance.service';

describe('EmployeeAttendanceService', () => {
  let service: EmployeeAttendanceService;
  let attendanceService: AttendanceService;

  const mockAttendanceService = {
    clockIn: vi.fn(),
    clockOut: vi.fn(),
    getAttendanceByDate: vi.fn(),
    listAttendances: vi.fn(),
    getStats: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeAttendanceService,
        { provide: AttendanceService, useValue: mockAttendanceService },
      ],
    }).compile();

    service = module.get<EmployeeAttendanceService>(EmployeeAttendanceService);
    attendanceService = module.get<AttendanceService>(AttendanceService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('clockIn', () => {
    it('should call AttendanceService.clockIn with employeeId', async () => {
      const employeeId = 'employee-123';
      const dto = { date: new Date('2026-01-18') };
      const ipAddress = '192.168.1.1';
      const mockResult = { id: 'attendance-123', adminId: employeeId };

      mockAttendanceService.clockIn.mockResolvedValue(mockResult);

      const result = await service.clockIn(employeeId, dto, ipAddress);

      expect(result).toEqual(mockResult);
      expect(attendanceService.clockIn).toHaveBeenCalledWith(employeeId, dto, ipAddress);
    });
  });

  describe('clockOut', () => {
    it('should call AttendanceService.clockOut with employeeId', async () => {
      const employeeId = 'employee-123';
      const dto = { date: new Date('2026-01-18') };
      const ipAddress = '192.168.1.1';
      const mockResult = { id: 'attendance-123', adminId: employeeId };

      mockAttendanceService.clockOut.mockResolvedValue(mockResult);

      const result = await service.clockOut(employeeId, dto, ipAddress);

      expect(result).toEqual(mockResult);
      expect(attendanceService.clockOut).toHaveBeenCalledWith(employeeId, dto, ipAddress);
    });
  });

  describe('getMyAttendances', () => {
    it('should call AttendanceService.listAttendances with employeeId filter', async () => {
      const employeeId = 'employee-123';
      const mockResult = { data: [], total: 0 };

      mockAttendanceService.listAttendances.mockResolvedValue(mockResult);

      const result = await service.getMyAttendances(employeeId);

      expect(result).toEqual(mockResult);
      expect(attendanceService.listAttendances).toHaveBeenCalledWith({
        adminId: employeeId,
        startDate: undefined,
        endDate: undefined,
        page: 1,
        limit: 20,
      });
    });

    it('should support date range and pagination', async () => {
      const employeeId = 'employee-123';
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');
      const mockResult = { data: [], total: 0 };

      mockAttendanceService.listAttendances.mockResolvedValue(mockResult);

      await service.getMyAttendances(employeeId, startDate, endDate, 2, 10);

      expect(attendanceService.listAttendances).toHaveBeenCalledWith({
        adminId: employeeId,
        startDate,
        endDate,
        page: 2,
        limit: 10,
      });
    });
  });

  describe('getMyStats', () => {
    it('should call AttendanceService.getStats with employeeId', async () => {
      const employeeId = 'employee-123';
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');
      const mockResult = { totalDays: 20, presentDays: 18, absentDays: 2 };

      mockAttendanceService.getStats.mockResolvedValue(mockResult);

      const result = await service.getMyStats(employeeId, startDate, endDate);

      expect(result).toEqual(mockResult);
      expect(attendanceService.getStats).toHaveBeenCalledWith(employeeId, startDate, endDate);
    });
  });
});
