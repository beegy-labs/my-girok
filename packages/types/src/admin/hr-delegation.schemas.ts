/**
 * HR Delegation Zod Schemas
 * Runtime validation schemas for delegation data
 */

import { z } from 'zod';

/**
 * Delegation scope enum schema
 */
const DelegationScopeSchema = z.enum(['ALL', 'SPECIFIC_PERMISSIONS']);

/**
 * Delegation status enum schema
 */
const DelegationStatusSchema = z.enum(['PENDING', 'ACTIVE', 'REVOKED', 'EXPIRED']);

/**
 * Delegation constraints schema
 */
const DelegationConstraintsSchema = z.object({
  allowedHours: z.array(z.string()).optional(),
  allowedIps: z.array(z.string()).optional(),
  maxActions: z.number().int().positive().optional(),
  requireMfa: z.boolean().optional(),
});

/**
 * Delegation schema
 */
export const DelegationSchema = z.object({
  id: z.string().uuid(),
  delegatorId: z.string().uuid(),
  delegateeId: z.string().uuid(),
  scope: DelegationScopeSchema,
  permissions: z.array(z.string()).optional(),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().optional(),
  status: DelegationStatusSchema,
  autoRevoke: z.boolean(),
  constraints: DelegationConstraintsSchema.optional(),
  approverId: z.string().uuid().optional(),
  approvedAt: z.string().datetime().optional(),
  revokedAt: z.string().datetime().optional(),
  revokedBy: z.string().uuid().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Delegation log schema
 */
export const DelegationLogSchema = z.object({
  id: z.string().uuid(),
  delegationId: z.string().uuid(),
  action: z.string(),
  timestamp: z.string().datetime(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Delegation list response schema
 */
export const DelegationListResponseSchema = z.object({
  data: z.array(DelegationSchema),
  total: z.number().int().nonnegative(),
});

/**
 * Create delegation DTO schema
 */
export const CreateDelegationDtoSchema = z.object({
  delegateeId: z.string().uuid(),
  scope: DelegationScopeSchema,
  permissions: z.array(z.string()).optional(),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().optional(),
  autoRevoke: z.boolean().optional(),
  constraints: DelegationConstraintsSchema.optional(),
});

/**
 * Update delegation DTO schema
 */
export const UpdateDelegationDtoSchema = z.object({
  endDate: z.string().optional(),
  reason: z.string().optional(),
  constraints: DelegationConstraintsSchema.optional(),
});

/**
 * Approve delegation DTO schema
 */
export const ApproveDelegationDtoSchema = z.object({
  approved: z.boolean(),
  comment: z.string().optional(),
});
