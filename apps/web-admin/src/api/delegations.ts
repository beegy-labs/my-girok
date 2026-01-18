/**
 * Delegation Management API
 * Endpoints for managing employee delegations and access delegation
 */

import apiClient from './client';
import { API_ENDPOINTS } from './endpoints';

/**
 * Delegation Types
 */
export interface Delegation {
  id: string;
  delegatorId: string;
  delegateeId: string;
  scope: 'ALL' | 'SPECIFIC_PERMISSIONS';
  permissions?: string[];
  startDate: string;
  endDate: string;
  reason?: string;
  status: 'PENDING' | 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  autoRevoke: boolean;
  constraints?: DelegationConstraints;
  approverId?: string;
  approvedAt?: string;
  revokedAt?: string;
  revokedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DelegationConstraints {
  allowedHours?: string[];
  allowedIps?: string[];
  maxActions?: number;
  requireMfa?: boolean;
}

export interface DelegationLog {
  id: string;
  delegationId: string;
  action: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface DelegationFilter {
  delegatorId?: string;
  delegateeId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface DelegationListResponse {
  data: Delegation[];
  total: number;
}

export interface CreateDelegationDto {
  delegateeId: string;
  scope: 'ALL' | 'SPECIFIC_PERMISSIONS';
  permissions?: string[];
  startDate: string;
  endDate: string;
  reason?: string;
  autoRevoke?: boolean;
  constraints?: DelegationConstraints;
}

export interface UpdateDelegationDto {
  endDate?: string;
  reason?: string;
  constraints?: DelegationConstraints;
}

export interface ApproveDelegationDto {
  approved: boolean;
  comment?: string;
}

/**
 * Delegation Management API Client
 */
export const delegationApi = {
  /**
   * Create a new delegation
   */
  create: async (data: CreateDelegationDto): Promise<Delegation> => {
    const response = await apiClient.post(API_ENDPOINTS.DELEGATIONS.CREATE, data);
    return response.data;
  },

  /**
   * List all delegations (with filters)
   */
  list: async (filter: DelegationFilter = {}): Promise<DelegationListResponse> => {
    const response = await apiClient.get(API_ENDPOINTS.DELEGATIONS.LIST, {
      params: filter,
    });
    return response.data;
  },

  /**
   * Get delegations I delegated to others
   */
  getMyDelegated: async (): Promise<Delegation[]> => {
    const response = await apiClient.get(API_ENDPOINTS.DELEGATIONS.MY_DELEGATED);
    return response.data;
  },

  /**
   * Get delegations I received from others
   */
  getMyReceived: async (): Promise<Delegation[]> => {
    const response = await apiClient.get(API_ENDPOINTS.DELEGATIONS.MY_RECEIVED);
    return response.data;
  },

  /**
   * Get delegation by ID
   */
  getById: async (id: string): Promise<Delegation> => {
    const response = await apiClient.get(API_ENDPOINTS.DELEGATIONS.DETAIL(id));
    return response.data;
  },

  /**
   * Update delegation
   */
  update: async (id: string, data: UpdateDelegationDto): Promise<Delegation> => {
    const response = await apiClient.patch(API_ENDPOINTS.DELEGATIONS.UPDATE(id), data);
    return response.data;
  },

  /**
   * Approve or reject delegation
   */
  approve: async (id: string, data: ApproveDelegationDto): Promise<Delegation> => {
    const response = await apiClient.post(API_ENDPOINTS.DELEGATIONS.APPROVE(id), data);
    return response.data;
  },

  /**
   * Revoke delegation
   */
  revoke: async (id: string, reason?: string): Promise<Delegation> => {
    const response = await apiClient.post(API_ENDPOINTS.DELEGATIONS.REVOKE(id), { reason });
    return response.data;
  },

  /**
   * Delete delegation (only if not active)
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.DELEGATIONS.DELETE(id));
  },

  /**
   * Get delegation usage logs
   */
  getLogs: async (id: string): Promise<DelegationLog[]> => {
    const response = await apiClient.get(API_ENDPOINTS.DELEGATIONS.LOGS(id));
    return response.data;
  },
};
