/**
 * Leave Management API
 * Endpoints for managing employee leave requests and balances
 */

import { z } from 'zod';
import apiClient from './client';
import { API_ENDPOINTS } from './endpoints';
import type {
  LeaveRequest,
  LeaveBalance,
  LeaveRequestFilter,
  LeaveRequestListResponse,
  CreateLeaveRequestDto,
  ApproveLeaveRequestDto,
  AdjustLeaveBalanceDto,
} from '@my-girok/types';
import {
  LeaveRequestSchema,
  LeaveBalanceSchema,
  LeaveRequestListResponseSchema,
} from '@my-girok/types';

// Re-export types
export type {
  LeaveRequest,
  LeaveBalance,
  LeaveRequestFilter,
  LeaveRequestListResponse,
  CreateLeaveRequestDto,
  ApproveLeaveRequestDto,
  AdjustLeaveBalanceDto,
};

/**
 * Leave Request API Client
 */
export const leaveApi = {
  /**
   * Create a leave request (draft)
   */
  create: async (data: CreateLeaveRequestDto): Promise<LeaveRequest> => {
    const response = await apiClient.post(API_ENDPOINTS.LEAVE.CREATE, data);
    return LeaveRequestSchema.parse(response.data) as LeaveRequest;
  },

  /**
   * Submit a leave request for approval
   */
  submit: async (id: string): Promise<LeaveRequest> => {
    const response = await apiClient.post(API_ENDPOINTS.LEAVE.SUBMIT(id));
    return LeaveRequestSchema.parse(response.data) as LeaveRequest;
  },

  /**
   * Approve or reject a leave request (manager)
   */
  approve: async (id: string, data: ApproveLeaveRequestDto): Promise<LeaveRequest> => {
    const response = await apiClient.post(API_ENDPOINTS.LEAVE.APPROVE(id), data);
    return LeaveRequestSchema.parse(response.data) as LeaveRequest;
  },

  /**
   * Cancel a leave request
   */
  cancel: async (id: string): Promise<LeaveRequest> => {
    const response = await apiClient.post(API_ENDPOINTS.LEAVE.CANCEL(id));
    return LeaveRequestSchema.parse(response.data) as LeaveRequest;
  },

  /**
   * Get my leave requests
   */
  getMyRequests: async (filter: LeaveRequestFilter = {}): Promise<LeaveRequestListResponse> => {
    const response = await apiClient.get(API_ENDPOINTS.LEAVE.MY_REQUESTS, {
      params: filter,
    });
    return LeaveRequestListResponseSchema.parse(response.data) as LeaveRequestListResponse;
  },

  /**
   * Get pending leave approvals for me (manager)
   */
  getPendingApprovals: async (): Promise<LeaveRequest[]> => {
    const response = await apiClient.get(API_ENDPOINTS.LEAVE.PENDING_APPROVALS);
    return z.array(LeaveRequestSchema).parse(response.data) as LeaveRequest[];
  },

  /**
   * Get a leave request by ID
   */
  getById: async (id: string): Promise<LeaveRequest> => {
    const response = await apiClient.get(API_ENDPOINTS.LEAVE.DETAIL(id));
    return LeaveRequestSchema.parse(response.data) as LeaveRequest;
  },

  /**
   * List all leave requests (admin/HR)
   */
  list: async (filter: LeaveRequestFilter = {}): Promise<LeaveRequestListResponse> => {
    const response = await apiClient.get(API_ENDPOINTS.LEAVE.LIST, {
      params: filter,
    });
    return LeaveRequestListResponseSchema.parse(response.data) as LeaveRequestListResponse;
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
    return LeaveBalanceSchema.parse(response.data) as LeaveBalance;
  },

  /**
   * Get my current leave balance
   */
  getMyBalance: async (): Promise<LeaveBalance> => {
    const response = await apiClient.get(API_ENDPOINTS.LEAVE_BALANCE.MY_BALANCE);
    return LeaveBalanceSchema.parse(response.data) as LeaveBalance;
  },

  /**
   * Get my leave balance for specific year
   */
  getMyBalanceByYear: async (year: number): Promise<LeaveBalance> => {
    const response = await apiClient.get(API_ENDPOINTS.LEAVE_BALANCE.MY_BALANCE_YEAR(year));
    return LeaveBalanceSchema.parse(response.data) as LeaveBalance;
  },

  /**
   * Get admin leave balance (HR/Manager)
   */
  getAdminBalance: async (adminId: string, year: number): Promise<LeaveBalance> => {
    const response = await apiClient.get(API_ENDPOINTS.LEAVE_BALANCE.ADMIN_BALANCE(adminId, year));
    return LeaveBalanceSchema.parse(response.data) as LeaveBalance;
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
    return LeaveBalanceSchema.parse(response.data) as LeaveBalance;
  },

  /**
   * Recalculate leave balance based on approved leaves
   */
  recalculate: async (adminId: string, year: number): Promise<LeaveBalance> => {
    const response = await apiClient.post(API_ENDPOINTS.LEAVE_BALANCE.RECALCULATE(adminId, year));
    return LeaveBalanceSchema.parse(response.data) as LeaveBalance;
  },

  /**
   * Initialize leave balance for new year (HR)
   */
  initialize: async (adminId: string, year: number, totalDays: number): Promise<LeaveBalance> => {
    const response = await apiClient.post(API_ENDPOINTS.LEAVE_BALANCE.INITIALIZE(adminId, year), {
      totalDays,
    });
    return LeaveBalanceSchema.parse(response.data) as LeaveBalance;
  },
};
