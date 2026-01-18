/**
 * Leave Management API
 * Endpoints for managing employee leave requests and balances
 */

import apiClient from './client';
import { API_ENDPOINTS } from './endpoints';

/**
 * Leave Types
 */
export interface LeaveRequest {
  id: string;
  adminId: string;
  leaveType: 'ANNUAL' | 'SICK' | 'PERSONAL' | 'MATERNITY' | 'PATERNITY' | 'UNPAID' | 'OTHER';
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  approverId?: string;
  approverComment?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalance {
  id: string;
  adminId: string;
  year: number;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  carriedForwardDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequestFilter {
  adminId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  leaveType?: string;
  page?: number;
  limit?: number;
}

export interface LeaveRequestListResponse {
  data: LeaveRequest[];
  total: number;
}

export interface CreateLeaveRequestDto {
  leaveType: 'ANNUAL' | 'SICK' | 'PERSONAL' | 'MATERNITY' | 'PATERNITY' | 'UNPAID' | 'OTHER';
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
}

export interface ApproveLeaveRequestDto {
  approved: boolean;
  comment?: string;
}

export interface AdjustLeaveBalanceDto {
  adjustment: number;
  reason: string;
}

/**
 * Leave Request API Client
 */
export const leaveApi = {
  /**
   * Create a leave request (draft)
   */
  create: async (data: CreateLeaveRequestDto): Promise<LeaveRequest> => {
    const response = await apiClient.post(API_ENDPOINTS.LEAVE.CREATE, data);
    return response.data;
  },

  /**
   * Submit a leave request for approval
   */
  submit: async (id: string): Promise<LeaveRequest> => {
    const response = await apiClient.post(API_ENDPOINTS.LEAVE.SUBMIT(id));
    return response.data;
  },

  /**
   * Approve or reject a leave request (manager)
   */
  approve: async (id: string, data: ApproveLeaveRequestDto): Promise<LeaveRequest> => {
    const response = await apiClient.post(API_ENDPOINTS.LEAVE.APPROVE(id), data);
    return response.data;
  },

  /**
   * Cancel a leave request
   */
  cancel: async (id: string): Promise<LeaveRequest> => {
    const response = await apiClient.post(API_ENDPOINTS.LEAVE.CANCEL(id));
    return response.data;
  },

  /**
   * Get my leave requests
   */
  getMyRequests: async (filter: LeaveRequestFilter = {}): Promise<LeaveRequestListResponse> => {
    const response = await apiClient.get(API_ENDPOINTS.LEAVE.MY_REQUESTS, {
      params: filter,
    });
    return response.data;
  },

  /**
   * Get pending leave approvals for me (manager)
   */
  getPendingApprovals: async (): Promise<LeaveRequest[]> => {
    const response = await apiClient.get(API_ENDPOINTS.LEAVE.PENDING_APPROVALS);
    return response.data;
  },

  /**
   * Get a leave request by ID
   */
  getById: async (id: string): Promise<LeaveRequest> => {
    const response = await apiClient.get(API_ENDPOINTS.LEAVE.DETAIL(id));
    return response.data;
  },

  /**
   * List all leave requests (admin/HR)
   */
  list: async (filter: LeaveRequestFilter = {}): Promise<LeaveRequestListResponse> => {
    const response = await apiClient.get(API_ENDPOINTS.LEAVE.LIST, {
      params: filter,
    });
    return response.data;
  },
};

/**
 * Leave Balance API Client
 */
export const leaveBalanceApi = {
  /**
   * Create a leave balance (HR/Admin)
   */
  create: async (adminId: string, year: number, totalDays: number): Promise<LeaveBalance> => {
    const response = await apiClient.post(API_ENDPOINTS.LEAVE_BALANCE.CREATE, {
      adminId,
      year,
      totalDays,
    });
    return response.data;
  },

  /**
   * Get my current leave balance
   */
  getMyBalance: async (): Promise<LeaveBalance> => {
    const response = await apiClient.get(API_ENDPOINTS.LEAVE_BALANCE.MY_BALANCE);
    return response.data;
  },

  /**
   * Get my leave balance for specific year
   */
  getMyBalanceByYear: async (year: number): Promise<LeaveBalance> => {
    const response = await apiClient.get(API_ENDPOINTS.LEAVE_BALANCE.MY_BALANCE_YEAR(year));
    return response.data;
  },

  /**
   * Get admin leave balance (HR/Manager)
   */
  getAdminBalance: async (adminId: string, year: number): Promise<LeaveBalance> => {
    const response = await apiClient.get(API_ENDPOINTS.LEAVE_BALANCE.ADMIN_BALANCE(adminId, year));
    return response.data;
  },

  /**
   * Adjust leave balance (HR/Admin)
   */
  adjust: async (
    adminId: string,
    year: number,
    data: AdjustLeaveBalanceDto,
  ): Promise<LeaveBalance> => {
    const response = await apiClient.patch(API_ENDPOINTS.LEAVE_BALANCE.ADJUST(adminId, year), data);
    return response.data;
  },

  /**
   * Recalculate leave balance based on approved leaves
   */
  recalculate: async (adminId: string, year: number): Promise<LeaveBalance> => {
    const response = await apiClient.post(API_ENDPOINTS.LEAVE_BALANCE.RECALCULATE(adminId, year));
    return response.data;
  },

  /**
   * Initialize leave balance for new year (HR)
   */
  initialize: async (adminId: string, year: number, totalDays: number): Promise<LeaveBalance> => {
    const response = await apiClient.post(API_ENDPOINTS.LEAVE_BALANCE.INITIALIZE(adminId, year), {
      totalDays,
    });
    return response.data;
  },
};
