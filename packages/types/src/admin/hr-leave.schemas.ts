/**
 * HR Leave Zod Schemas
 * Runtime validation schemas for leave data
 */

import { z } from 'zod';
import { LeaveType, LeaveStatus } from './admin.enums.js';

/**
 * Leave type enum schema
 */
const LeaveTypeSchema = z.nativeEnum(LeaveType);

/**
 * Leave status enum schema
 */
const LeaveStatusSchema = z.nativeEnum(LeaveStatus);

/**
 * Leave request schema
 */
export const LeaveRequestSchema = z.object({
  id: z.string().uuid(),
  adminId: z.string().uuid(),
  leaveType: LeaveTypeSchema,
  startDate: z.string(),
  endDate: z.string(),
  days: z.number().positive(),
  reason: z.string().optional(),
  status: LeaveStatusSchema,
  approverId: z.string().uuid().optional(),
  approverComment: z.string().optional(),
  approvedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Leave balance schema
 */
export const LeaveBalanceSchema = z.object({
  id: z.string().uuid(),
  adminId: z.string().uuid(),
  year: z.number().int().positive(),
  totalDays: z.number().nonnegative(),
  usedDays: z.number().nonnegative(),
  remainingDays: z.number().nonnegative(),
  carriedForwardDays: z.number().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Leave request list response schema
 */
export const LeaveRequestListResponseSchema = z.object({
  data: z.array(LeaveRequestSchema),
  total: z.number().int().nonnegative(),
});

/**
 * Create leave request DTO schema
 */
export const CreateLeaveRequestDtoSchema = z.object({
  leaveType: LeaveTypeSchema,
  startDate: z.string(),
  endDate: z.string(),
  days: z.number().positive(),
  reason: z.string().optional(),
});

/**
 * Approve leave request DTO schema
 */
export const ApproveLeaveRequestDtoSchema = z.object({
  approved: z.boolean(),
  comment: z.string().optional(),
});

/**
 * Adjust leave balance DTO schema
 */
export const AdjustLeaveBalanceDtoSchema = z.object({
  adjustment: z.number(),
  reason: z.string().min(1),
});
