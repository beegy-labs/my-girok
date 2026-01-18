/**
 * HR Employee Types
 * Employee management types for HR features
 */

/**
 * Employee (Admin) - Frontend view
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

/**
 * Employee list filter
 */
export interface EmployeeListFilter {
  search?: string;
  department?: string;
  active?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Employee list response (paginated)
 */
export interface EmployeeListResponse {
  data: Employee[];
  total: number;
}

/**
 * Update employee DTO
 */
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
