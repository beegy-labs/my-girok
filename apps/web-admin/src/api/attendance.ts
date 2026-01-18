/**
 * Attendance Management API
 * Endpoints for managing employee attendance and work schedules
 */

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

/**
 * Attendance Management API Client
 */
export const attendanceApi = {
  /**
   * Clock in (for current admin)
   */
  clockIn: async (): Promise<Attendance> => {
    const response = await apiClient.post(API_ENDPOINTS.ATTENDANCE.CLOCK_IN);
    return response.data;
  },

  /**
   * Clock out (for current admin)
   */
  clockOut: async (): Promise<Attendance> => {
    const response = await apiClient.post(API_ENDPOINTS.ATTENDANCE.CLOCK_OUT);
    return response.data;
  },

  /**
   * Get my attendance records
   */
  getMyRecords: async (filter: AttendanceFilter = {}): Promise<AttendanceListResponse> => {
    const response = await apiClient.get(API_ENDPOINTS.ATTENDANCE.MY_RECORDS, {
      params: filter,
    });
    return response.data;
  },

  /**
   * Get my attendance statistics
   */
  getMyStats: async (startDate: string, endDate: string): Promise<AttendanceStats> => {
    const response = await apiClient.get(API_ENDPOINTS.ATTENDANCE.MY_STATS, {
      params: { startDate, endDate },
    });
    return response.data;
  },

  /**
   * List all attendance records (admin/HR only)
   */
  list: async (filter: AttendanceFilter = {}): Promise<AttendanceListResponse> => {
    const response = await apiClient.get(API_ENDPOINTS.ATTENDANCE.LIST, {
      params: filter,
    });
    return response.data;
  },

  /**
   * Get attendance by specific date
   */
  getByDate: async (date: string): Promise<Attendance[]> => {
    const response = await apiClient.get(API_ENDPOINTS.ATTENDANCE.BY_DATE(date));
    return response.data;
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
    return response.data;
  },

  /**
   * Approve overtime request
   */
  approveOvertime: async (id: string, approved: boolean): Promise<Attendance> => {
    const response = await apiClient.patch(API_ENDPOINTS.ATTENDANCE.APPROVE_OVERTIME(id), {
      approved,
    });
    return response.data;
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
    return response.data;
  },

  /**
   * Get my work schedules
   */
  getMySchedules: async (): Promise<WorkSchedule[]> => {
    const response = await apiClient.get(API_ENDPOINTS.WORK_SCHEDULES.MY_SCHEDULES);
    return response.data;
  },

  /**
   * Get my active work schedule
   */
  getMyActiveSchedule: async (): Promise<WorkSchedule | null> => {
    const response = await apiClient.get(API_ENDPOINTS.WORK_SCHEDULES.MY_ACTIVE);
    return response.data;
  },

  /**
   * Get admin work schedules
   */
  getAdminSchedules: async (adminId: string): Promise<WorkSchedule[]> => {
    const response = await apiClient.get(API_ENDPOINTS.WORK_SCHEDULES.ADMIN_SCHEDULES(adminId));
    return response.data;
  },

  /**
   * Get work schedule by ID
   */
  getById: async (id: string): Promise<WorkSchedule> => {
    const response = await apiClient.get(API_ENDPOINTS.WORK_SCHEDULES.DETAIL(id));
    return response.data;
  },

  /**
   * Update a work schedule
   */
  update: async (id: string, data: UpdateWorkScheduleDto): Promise<WorkSchedule> => {
    const response = await apiClient.patch(API_ENDPOINTS.WORK_SCHEDULES.UPDATE(id), data);
    return response.data;
  },

  /**
   * Delete a work schedule
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.WORK_SCHEDULES.DELETE(id));
  },
};
