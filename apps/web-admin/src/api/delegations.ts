/**
 * Delegation Management API
 * Endpoints for managing employee delegations and access delegation
 */

import { z } from 'zod';
import apiClient from './client';
import { API_ENDPOINTS } from './endpoints';
import type {
  Delegation,
  DelegationLog,
  DelegationFilter,
  DelegationListResponse,
  CreateDelegationDto,
  UpdateDelegationDto,
  ApproveDelegationDto,
} from '@my-girok/types';
import {
  DelegationSchema,
  DelegationLogSchema,
  DelegationListResponseSchema,
} from '@my-girok/types';

// Re-export types
export type {
  Delegation,
  DelegationLog,
  DelegationFilter,
  DelegationListResponse,
  CreateDelegationDto,
  UpdateDelegationDto,
  ApproveDelegationDto,
};

/**
 * Delegation Management API Client
 */
export const delegationApi = {
  /**
   * Create a new delegation
   */
  create: async (data: CreateDelegationDto): Promise<Delegation> => {
    const response = await apiClient.post(API_ENDPOINTS.DELEGATIONS.CREATE, data);
    return DelegationSchema.parse(response.data) as Delegation;
  },

  /**
   * List all delegations (with filters)
   */
  list: async (filter: DelegationFilter = {}): Promise<DelegationListResponse> => {
    const response = await apiClient.get(API_ENDPOINTS.DELEGATIONS.LIST, {
      params: filter,
    });
    return DelegationListResponseSchema.parse(response.data) as DelegationListResponse;
  },

  /**
   * Get delegations I delegated to others
   */
  getMyDelegated: async (): Promise<Delegation[]> => {
    const response = await apiClient.get(API_ENDPOINTS.DELEGATIONS.MY_DELEGATED);
    return z.array(DelegationSchema).parse(response.data) as Delegation[];
  },

  /**
   * Get delegations I received from others
   */
  getMyReceived: async (): Promise<Delegation[]> => {
    const response = await apiClient.get(API_ENDPOINTS.DELEGATIONS.MY_RECEIVED);
    return z.array(DelegationSchema).parse(response.data) as Delegation[];
  },

  /**
   * Get delegation by ID
   */
  getById: async (id: string): Promise<Delegation> => {
    const response = await apiClient.get(API_ENDPOINTS.DELEGATIONS.DETAIL(id));
    return DelegationSchema.parse(response.data) as Delegation;
  },

  /**
   * Update delegation
   */
  update: async (id: string, data: UpdateDelegationDto): Promise<Delegation> => {
    const response = await apiClient.patch(API_ENDPOINTS.DELEGATIONS.UPDATE(id), data);
    return DelegationSchema.parse(response.data) as Delegation;
  },

  /**
   * Approve or reject delegation
   */
  approve: async (id: string, data: ApproveDelegationDto): Promise<Delegation> => {
    const response = await apiClient.post(API_ENDPOINTS.DELEGATIONS.APPROVE(id), data);
    return DelegationSchema.parse(response.data) as Delegation;
  },

  /**
   * Revoke delegation
   */
  revoke: async (id: string, reason?: string): Promise<Delegation> => {
    const response = await apiClient.post(API_ENDPOINTS.DELEGATIONS.REVOKE(id), { reason });
    return DelegationSchema.parse(response.data) as Delegation;
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
    return z.array(DelegationLogSchema).parse(response.data) as DelegationLog[];
  },
};
