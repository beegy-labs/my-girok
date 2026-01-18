/**
 * HR Employee Zod Schemas
 * Runtime validation schemas for employee data
 */

import { z } from 'zod';

/**
 * Employee schema
 */
export const EmployeeSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  userName: z.string().optional(),
  displayName: z.string().optional(),
  givenName: z.string().optional(),
  familyName: z.string().optional(),
  middleName: z.string().optional(),
  honorificPrefix: z.string().optional(),
  honorificSuffix: z.string().optional(),
  nickName: z.string().optional(),
  preferredLanguage: z.string().optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
  active: z.boolean(),
  employeeNumber: z.string().optional(),
  costCenter: z.string().optional(),
  division: z.string().optional(),
  title: z.string().optional(),
  department: z.string().optional(),
  managerId: z.string().uuid().optional(),
  organization: z.string().optional(),
  phoneNumber: z.string().optional(),
  mobileNumber: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Employee list response schema
 */
export const EmployeeListResponseSchema = z.object({
  data: z.array(EmployeeSchema),
  total: z.number().int().nonnegative(),
});

/**
 * Update employee DTO schema
 */
export const UpdateEmployeeDtoSchema = z.object({
  userName: z.string().optional(),
  displayName: z.string().optional(),
  givenName: z.string().optional(),
  familyName: z.string().optional(),
  middleName: z.string().optional(),
  honorificPrefix: z.string().optional(),
  honorificSuffix: z.string().optional(),
  nickName: z.string().optional(),
  preferredLanguage: z.string().optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
  active: z.boolean().optional(),
  employeeNumber: z.string().optional(),
  costCenter: z.string().optional(),
  division: z.string().optional(),
  title: z.string().optional(),
  department: z.string().optional(),
  managerId: z.string().uuid().optional(),
  organization: z.string().optional(),
  phoneNumber: z.string().optional(),
  mobileNumber: z.string().optional(),
});
