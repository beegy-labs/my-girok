/**
 * Attendance Management API
 * Endpoints for managing employee attendance and work schedules
 */

import { z } from 'zod';
import apiClient from './client';
import { API_ENDPOINTS } from './endpoints';
import type {
  Attendance,
  AttendanceStats,
  AttendanceFilter,
  AttendanceListResponse,
  WorkSchedule,
  CreateWorkScheduleDto,
  UpdateWorkScheduleDto,
} from '@my-girok/types';
import {
  AttendanceSchema,
  AttendanceStatsSchema,
  AttendanceListResponseSchema,
  WorkScheduleSchema,
} from '@my-girok/types';

// Re-export types
export type {
  Attendance,
  AttendanceStats,
  AttendanceFilter,
  AttendanceListResponse,
  WorkSchedule,
  CreateWorkScheduleDto,
  UpdateWorkScheduleDto,
};

/**
 * Attendance Management API Client
 */
export const attendanceApi = {
  /**
   * Clock in (for current admin)
   */
  clockIn: async (): Promise<Attendance> => {
    const response = await apiClient.post(API_ENDPOINTS.ATTENDANCE.CLOCK_IN);
    return AttendanceSchema.parse(response.data) as Attendance;
  },

  /**
   * Clock out (for current admin)
   */
  clockOut: async (): Promise<Attendance> => {
    const response = await apiClient.post(API_ENDPOINTS.ATTENDANCE.CLOCK_OUT);
    return AttendanceSchema.parse(response.data) as Attendance;
  },

  /**
   * Get my attendance records
   */
  getMyRecords: async (filter: AttendanceFilter = {}): Promise<AttendanceListResponse> => {
    const response = await apiClient.get(API_ENDPOINTS.ATTENDANCE.MY_RECORDS, {
      params: filter,
    });
    return AttendanceListResponseSchema.parse(response.data) as AttendanceListResponse;
  },

  /**
   * Get my attendance statistics
   */
  getMyStats: async (startDate: string, endDate: string): Promise<AttendanceStats> => {
    const response = await apiClient.get(API_ENDPOINTS.ATTENDANCE.MY_STATS, {
      params: { startDate, endDate },
    });
    return AttendanceStatsSchema.parse(response.data) as AttendanceStats;
  },

  /**
   * List all attendance records (admin/HR only)
   */
  list: async (filter: AttendanceFilter = {}): Promise<AttendanceListResponse> => {
    const response = await apiClient.get(API_ENDPOINTS.ATTENDANCE.LIST, {
      params: filter,
    });
    return AttendanceListResponseSchema.parse(response.data) as AttendanceListResponse;
  },

  /**
   * Get attendance by specific date
   */
  getByDate: async (date: string): Promise<Attendance[]> => {
    const response = await apiClient.get(API_ENDPOINTS.ATTENDANCE.BY_DATE(date));
    const parsed = z.array(AttendanceSchema).parse(response.data);
    return parsed as Attendance[];
  },

  /**
   * Get admin attendance statistics
   */
  getAdminStats: async (
    adminId: string,
    startDate: string,
    endDate: string,
  ): Promise<AttendanceStats> => {
    const response = await apiClient.get(API_ENDPOINTS.ATTENDANCE.ADMIN_STATS(adminId), {
      params: { startDate, endDate },
    });
    return AttendanceStatsSchema.parse(response.data) as AttendanceStats;
  },

  /**
   * Approve overtime request
   */
  approveOvertime: async (id: string, approved: boolean): Promise<Attendance> => {
    const response = await apiClient.patch(API_ENDPOINTS.ATTENDANCE.APPROVE_OVERTIME(id), {
      approved,
    });
    return AttendanceSchema.parse(response.data) as Attendance;
  },
};

/**
 * Work Schedule API Client
 */
export const workScheduleApi = {
  /**
   * Create a work schedule
   */
  create: async (data: CreateWorkScheduleDto): Promise<WorkSchedule> => {
    const response = await apiClient.post(API_ENDPOINTS.WORK_SCHEDULES.CREATE, data);
    return WorkScheduleSchema.parse(response.data) as WorkSchedule;
  },

  /**
   * Get my work schedules
   */
  getMySchedules: async (): Promise<WorkSchedule[]> => {
    const response = await apiClient.get(API_ENDPOINTS.WORK_SCHEDULES.MY_SCHEDULES);
    return z.array(WorkScheduleSchema).parse(response.data) as WorkSchedule[];
  },

  /**
   * Get my active work schedule
   */
  getMyActiveSchedule: async (): Promise<WorkSchedule | null> => {
    const response = await apiClient.get(API_ENDPOINTS.WORK_SCHEDULES.MY_ACTIVE);
    return response.data ? (WorkScheduleSchema.parse(response.data) as WorkSchedule) : null;
  },

  /**
   * Get admin work schedules
   */
  getAdminSchedules: async (adminId: string): Promise<WorkSchedule[]> => {
    const response = await apiClient.get(API_ENDPOINTS.WORK_SCHEDULES.ADMIN_SCHEDULES(adminId));
    return z.array(WorkScheduleSchema).parse(response.data) as WorkSchedule[];
  },

  /**
   * Get work schedule by ID
   */
  getById: async (id: string): Promise<WorkSchedule> => {
    const response = await apiClient.get(API_ENDPOINTS.WORK_SCHEDULES.DETAIL(id));
    return WorkScheduleSchema.parse(response.data) as WorkSchedule;
  },

  /**
   * Update a work schedule
   */
  update: async (id: string, data: UpdateWorkScheduleDto): Promise<WorkSchedule> => {
    const response = await apiClient.patch(API_ENDPOINTS.WORK_SCHEDULES.UPDATE(id), data);
    return WorkScheduleSchema.parse(response.data) as WorkSchedule;
  },

  /**
   * Delete a work schedule
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.WORK_SCHEDULES.DELETE(id));
  },
};
