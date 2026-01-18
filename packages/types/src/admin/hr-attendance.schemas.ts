/**
 * HR Attendance Zod Schemas
 * Runtime validation schemas for attendance data
 */

import { z } from 'zod';
import { AttendanceStatus, ScheduleType } from './admin.enums.js';

/**
 * Attendance status enum schema
 */
const AttendanceStatusSchema = z.nativeEnum(AttendanceStatus);

/**
 * Schedule type enum schema
 */
const ScheduleTypeSchema = z.nativeEnum(ScheduleType);

/**
 * Attendance record schema
 */
export const AttendanceSchema = z.object({
  id: z.string().uuid(),
  adminId: z.string().uuid(),
  date: z.string(),
  clockIn: z.string().datetime().optional(),
  clockOut: z.string().datetime().optional(),
  status: AttendanceStatusSchema,
  workHours: z.number().nonnegative().optional(),
  overtimeHours: z.number().nonnegative().optional(),
  overtimeApproved: z.boolean(),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Attendance statistics schema
 */
export const AttendanceStatsSchema = z.object({
  totalDays: z.number().int().nonnegative(),
  presentDays: z.number().int().nonnegative(),
  absentDays: z.number().int().nonnegative(),
  lateDays: z.number().int().nonnegative(),
  totalWorkHours: z.number().nonnegative(),
  totalOvertimeHours: z.number().nonnegative(),
  averageWorkHours: z.number().nonnegative(),
});

/**
 * Attendance list response schema
 */
export const AttendanceListResponseSchema = z.object({
  data: z.array(AttendanceSchema),
  total: z.number().int().nonnegative(),
});

/**
 * Work schedule schema
 */
export const WorkScheduleSchema = z.object({
  id: z.string().uuid(),
  adminId: z.string().uuid(),
  scheduleType: ScheduleTypeSchema,
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  workDays: z.array(z.number().int().min(0).max(6)).optional(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Create work schedule DTO schema
 */
export const CreateWorkScheduleDtoSchema = z.object({
  adminId: z.string().uuid(),
  scheduleType: ScheduleTypeSchema,
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  workDays: z.array(z.number().int().min(0).max(6)).optional(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().optional(),
});

/**
 * Update work schedule DTO schema
 */
export const UpdateWorkScheduleDtoSchema = z.object({
  scheduleType: ScheduleTypeSchema.optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  workDays: z.array(z.number().int().min(0).max(6)).optional(),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().optional(),
  isActive: z.boolean().optional(),
});
