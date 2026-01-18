import { describe, it, expect, vi, beforeEach } from 'vitest';
import { attendanceApi, workScheduleApi } from './attendance';
import type { Attendance, AttendanceListResponse } from '@my-girok/types';
import { AttendanceStatus, ScheduleType } from '@my-girok/types';

// Mock apiClient
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock('./client', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

describe('attendanceApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('clockIn', () => {
    it('should clock in successfully', async () => {
      const mockAttendance: Attendance = {
        id: '1',
        adminId: 'admin-1',
        date: '2024-01-01',
        clockIn: '2024-01-01T09:00:00Z',
        status: AttendanceStatus.PRESENT,
        overtimeApproved: false,
        createdAt: '2024-01-01T09:00:00Z',
        updatedAt: '2024-01-01T09:00:00Z',
      };

      mockPost.mockResolvedValueOnce({ data: mockAttendance });

      const result = await attendanceApi.clockIn();

      expect(mockPost).toHaveBeenCalledWith('/attendance/clock-in');
      expect(result).toEqual(mockAttendance);
    });
  });

  describe('list', () => {
    it('should fetch attendance list with filters', async () => {
      const mockResponse: AttendanceListResponse = {
        data: [
          {
            id: '1',
            adminId: 'admin-1',
            date: '2024-01-01',
            status: AttendanceStatus.PRESENT,
            overtimeApproved: false,
            createdAt: '2024-01-01T09:00:00Z',
            updatedAt: '2024-01-01T09:00:00Z',
          },
        ],
        total: 1,
      };

      mockGet.mockResolvedValueOnce({ data: mockResponse });

      const filter = { startDate: '2024-01-01', endDate: '2024-01-31' };
      const result = await attendanceApi.list(filter);

      expect(mockGet).toHaveBeenCalledWith('/attendance', { params: filter });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('approveOvertime', () => {
    it('should approve overtime', async () => {
      const mockAttendance: Attendance = {
        id: '1',
        adminId: 'admin-1',
        date: '2024-01-01',
        status: AttendanceStatus.PRESENT,
        overtimeHours: 2,
        overtimeApproved: true,
        createdAt: '2024-01-01T09:00:00Z',
        updatedAt: '2024-01-01T09:00:00Z',
      };

      mockPatch.mockResolvedValueOnce({ data: mockAttendance });

      const result = await attendanceApi.approveOvertime('1', true);

      expect(mockPatch).toHaveBeenCalledWith('/attendance/1/approve-overtime', { approved: true });
      expect(result).toEqual(mockAttendance);
    });
  });
});

describe('workScheduleApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create work schedule', async () => {
      const createDto = {
        adminId: 'admin-1',
        scheduleType: ScheduleType.STANDARD,
        startTime: '09:00',
        endTime: '18:00',
        workDays: [1, 2, 3, 4, 5],
        effectiveFrom: '2024-01-01',
      };

      const mockSchedule = {
        id: '1',
        ...createDto,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockPost.mockResolvedValueOnce({ data: mockSchedule });

      const result = await workScheduleApi.create(createDto);

      expect(mockPost).toHaveBeenCalledWith('/work-schedules', createDto);
      expect(result).toEqual(mockSchedule);
    });
  });

  describe('delete', () => {
    it('should delete work schedule', async () => {
      mockDelete.mockResolvedValueOnce({ data: {} });

      await workScheduleApi.delete('1');

      expect(mockDelete).toHaveBeenCalledWith('/work-schedules/1');
    });
  });
});
