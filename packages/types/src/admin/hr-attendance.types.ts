/**
 * HR Attendance Types
 * Attendance and work schedule types for HR features
 */

import { AttendanceStatus, ScheduleType } from './admin.enums.js';

/**
 * Attendance record
 */
export interface Attendance {
  id: string;
  adminId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  status: AttendanceStatus;
  workHours?: number;
  overtimeHours?: number;
  overtimeApproved: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Attendance statistics
 */
export interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalWorkHours: number;
  totalOvertimeHours: number;
  averageWorkHours: number;
}

/**
 * Attendance list filter
 */
export interface AttendanceFilter {
  adminId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  page?: number;
  limit?: number;
}

/**
 * Attendance list response (paginated)
 */
export interface AttendanceListResponse {
  data: Attendance[];
  total: number;
}

/**
 * Work schedule
 */
export interface WorkSchedule {
  id: string;
  adminId: string;
  scheduleType: ScheduleType;
  startTime?: string;
  endTime?: string;
  workDays?: number[];
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create work schedule DTO
 */
export interface CreateWorkScheduleDto {
  adminId: string;
  scheduleType: ScheduleType;
  startTime?: string;
  endTime?: string;
  workDays?: number[];
  effectiveFrom: string;
  effectiveTo?: string;
}

/**
 * Update work schedule DTO
 */
export interface UpdateWorkScheduleDto {
  scheduleType?: ScheduleType;
  startTime?: string;
  endTime?: string;
  workDays?: number[];
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive?: boolean;
}
