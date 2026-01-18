/**
 * HR Leave Types
 * Leave request and balance types for HR features
 */

import { LeaveType, LeaveStatus } from './admin.enums.js';

/**
 * Leave request
 */
export interface LeaveRequest {
  id: string;
  adminId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  status: LeaveStatus;
  approverId?: string;
  approverComment?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Leave balance
 */
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

/**
 * Leave request filter
 */
export interface LeaveRequestFilter {
  adminId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  leaveType?: string;
  page?: number;
  limit?: number;
}

/**
 * Leave request list response (paginated)
 */
export interface LeaveRequestListResponse {
  data: LeaveRequest[];
  total: number;
}

/**
 * Create leave request DTO
 */
export interface CreateLeaveRequestDto {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
}

/**
 * Approve leave request DTO
 */
export interface ApproveLeaveRequestDto {
  approved: boolean;
  comment?: string;
}

/**
 * Adjust leave balance DTO
 */
export interface AdjustLeaveBalanceDto {
  adjustment: number;
  reason: string;
}
