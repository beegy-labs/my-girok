/**
 * HR Delegation Types
 * Delegation management types for HR features
 */

/**
 * Delegation scope enum
 */
export type DelegationScope = 'ALL' | 'SPECIFIC_PERMISSIONS';

/**
 * Delegation status enum
 */
export type DelegationStatus = 'PENDING' | 'ACTIVE' | 'REVOKED' | 'EXPIRED';

/**
 * Delegation constraints
 */
export interface DelegationConstraints {
  allowedHours?: string[];
  allowedIps?: string[];
  maxActions?: number;
  requireMfa?: boolean;
}

/**
 * Delegation
 */
export interface Delegation {
  id: string;
  delegatorId: string;
  delegateeId: string;
  scope: DelegationScope;
  permissions?: string[];
  startDate: string;
  endDate: string;
  reason?: string;
  status: DelegationStatus;
  autoRevoke: boolean;
  constraints?: DelegationConstraints;
  approverId?: string;
  approvedAt?: string;
  revokedAt?: string;
  revokedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Delegation log
 */
export interface DelegationLog {
  id: string;
  delegationId: string;
  action: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Delegation filter
 */
export interface DelegationFilter {
  delegatorId?: string;
  delegateeId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

/**
 * Delegation list response (paginated)
 */
export interface DelegationListResponse {
  data: Delegation[];
  total: number;
}

/**
 * Create delegation DTO
 */
export interface CreateDelegationDto {
  delegateeId: string;
  scope: DelegationScope;
  permissions?: string[];
  startDate: string;
  endDate: string;
  reason?: string;
  autoRevoke?: boolean;
  constraints?: DelegationConstraints;
}

/**
 * Update delegation DTO
 */
export interface UpdateDelegationDto {
  endDate?: string;
  reason?: string;
  constraints?: DelegationConstraints;
}

/**
 * Approve delegation DTO
 */
export interface ApproveDelegationDto {
  approved: boolean;
  comment?: string;
}
