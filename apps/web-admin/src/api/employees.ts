/**
 * Employee Management API
 * Endpoints for managing employees (admins) in the system
 */

import apiClient from './client';
import { API_ENDPOINTS } from './endpoints';
import type {
  Employee,
  EmployeeListFilter,
  EmployeeListResponse,
  UpdateEmployeeDto,
} from '@my-girok/types';
import { EmployeeSchema, EmployeeListResponseSchema } from '@my-girok/types';

// Re-export types
export type { Employee, EmployeeListFilter, EmployeeListResponse, UpdateEmployeeDto };

/**
 * Employee Management API Client
 */
export const employeeApi = {
  /**
   * Get my profile (current admin)
   */
  getMyProfile: async (): Promise<Employee> => {
    const response = await apiClient.get(API_ENDPOINTS.EMPLOYEES.MY_PROFILE);
    return EmployeeSchema.parse(response.data) as Employee;
  },

  /**
   * List/Search employees with filters
   */
  list: async (filter: EmployeeListFilter = {}): Promise<EmployeeListResponse> => {
    const response = await apiClient.get(API_ENDPOINTS.EMPLOYEES.LIST, {
      params: filter,
    });
    return EmployeeListResponseSchema.parse(response.data) as EmployeeListResponse;
  },

  /**
   * Get employee by ID
   */
  getById: async (id: string): Promise<Employee> => {
    const response = await apiClient.get(API_ENDPOINTS.EMPLOYEES.DETAIL(id));
    return EmployeeSchema.parse(response.data) as Employee;
  },

  /**
   * Update employee profile
   */
  update: async (id: string, data: UpdateEmployeeDto): Promise<Employee> => {
    const response = await apiClient.patch(API_ENDPOINTS.EMPLOYEES.UPDATE(id), data);
    return EmployeeSchema.parse(response.data) as Employee;
  },

  /**
   * Update SCIM Core attributes
   */
  updateScimCore: async (id: string, data: Partial<UpdateEmployeeDto>): Promise<Employee> => {
    const response = await apiClient.patch(API_ENDPOINTS.EMPLOYEES.UPDATE_SCIM(id), data);
    return EmployeeSchema.parse(response.data) as Employee;
  },

  /**
   * Update Employee Info
   */
  updateEmployeeInfo: async (id: string, data: Partial<UpdateEmployeeDto>): Promise<Employee> => {
    const response = await apiClient.patch(API_ENDPOINTS.EMPLOYEES.UPDATE_EMPLOYEE(id), data);
    return EmployeeSchema.parse(response.data) as Employee;
  },

  /**
   * Update Job & Organization
   */
  updateJobOrganization: async (
    id: string,
    data: Partial<UpdateEmployeeDto>,
  ): Promise<Employee> => {
    const response = await apiClient.patch(API_ENDPOINTS.EMPLOYEES.UPDATE_JOB(id), data);
    return EmployeeSchema.parse(response.data) as Employee;
  },

  /**
   * Update Contact Info
   */
  updateContactInfo: async (id: string, data: Partial<UpdateEmployeeDto>): Promise<Employee> => {
    const response = await apiClient.patch(API_ENDPOINTS.EMPLOYEES.UPDATE_CONTACT(id), data);
    return EmployeeSchema.parse(response.data) as Employee;
  },
};
