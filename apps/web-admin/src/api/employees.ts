/**
 * Employee Management API
 * Endpoints for managing employees (admins) in the system
 */

import apiClient from './client';
import { API_ENDPOINTS } from './endpoints';

/**
 * Employee (Admin) Types
 */
export interface Employee {
  id: string;
  email: string;
  userName?: string;
  displayName?: string;
  givenName?: string;
  familyName?: string;
  middleName?: string;
  honorificPrefix?: string;
  honorificSuffix?: string;
  nickName?: string;
  preferredLanguage?: string;
  locale?: string;
  timezone?: string;
  active: boolean;

  // Employee Info
  employeeNumber?: string;
  costCenter?: string;
  division?: string;

  // Job & Organization
  title?: string;
  department?: string;
  managerId?: string;
  organization?: string;

  // Contact Info
  phoneNumber?: string;
  mobileNumber?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeListFilter {
  search?: string;
  department?: string;
  active?: boolean;
  page?: number;
  limit?: number;
}

export interface EmployeeListResponse {
  data: Employee[];
  total: number;
}

export interface UpdateEmployeeDto {
  userName?: string;
  displayName?: string;
  givenName?: string;
  familyName?: string;
  middleName?: string;
  honorificPrefix?: string;
  honorificSuffix?: string;
  nickName?: string;
  preferredLanguage?: string;
  locale?: string;
  timezone?: string;
  active?: boolean;
  employeeNumber?: string;
  costCenter?: string;
  division?: string;
  title?: string;
  department?: string;
  managerId?: string;
  organization?: string;
  phoneNumber?: string;
  mobileNumber?: string;
}

/**
 * Employee Management API Client
 */
export const employeeApi = {
  /**
   * Get my profile (current admin)
   */
  getMyProfile: async (): Promise<Employee> => {
    const response = await apiClient.get(API_ENDPOINTS.EMPLOYEES.MY_PROFILE);
    return response.data;
  },

  /**
   * List/Search employees with filters
   */
  list: async (filter: EmployeeListFilter = {}): Promise<EmployeeListResponse> => {
    const response = await apiClient.get(API_ENDPOINTS.EMPLOYEES.LIST, {
      params: filter,
    });
    return response.data;
  },

  /**
   * Get employee by ID
   */
  getById: async (id: string): Promise<Employee> => {
    const response = await apiClient.get(API_ENDPOINTS.EMPLOYEES.DETAIL(id));
    return response.data;
  },

  /**
   * Update employee profile
   */
  update: async (id: string, data: UpdateEmployeeDto): Promise<Employee> => {
    const response = await apiClient.patch(API_ENDPOINTS.EMPLOYEES.UPDATE(id), data);
    return response.data;
  },

  /**
   * Update SCIM Core attributes
   */
  updateScimCore: async (id: string, data: Partial<UpdateEmployeeDto>): Promise<Employee> => {
    const response = await apiClient.patch(API_ENDPOINTS.EMPLOYEES.UPDATE_SCIM(id), data);
    return response.data;
  },

  /**
   * Update Employee Info
   */
  updateEmployeeInfo: async (id: string, data: Partial<UpdateEmployeeDto>): Promise<Employee> => {
    const response = await apiClient.patch(API_ENDPOINTS.EMPLOYEES.UPDATE_EMPLOYEE(id), data);
    return response.data;
  },

  /**
   * Update Job & Organization
   */
  updateJobOrganization: async (
    id: string,
    data: Partial<UpdateEmployeeDto>,
  ): Promise<Employee> => {
    const response = await apiClient.patch(API_ENDPOINTS.EMPLOYEES.UPDATE_JOB(id), data);
    return response.data;
  },

  /**
   * Update Contact Info
   */
  updateContactInfo: async (id: string, data: Partial<UpdateEmployeeDto>): Promise<Employee> => {
    const response = await apiClient.patch(API_ENDPOINTS.EMPLOYEES.UPDATE_CONTACT(id), data);
    return response.data;
  },
};
