import { describe, it, expect, vi, beforeEach } from 'vitest';
import { employeeApi } from './employees';
import type { Employee, EmployeeListResponse } from '@my-girok/types';

// Mock apiClient
const mockGet = vi.fn();
const mockPatch = vi.fn();

vi.mock('./client', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

describe('employeeApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMyProfile', () => {
    it('should fetch current admin profile', async () => {
      const mockEmployee: Employee = {
        id: '1',
        email: 'admin@example.com',
        displayName: 'Admin User',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockGet.mockResolvedValueOnce({ data: mockEmployee });

      const result = await employeeApi.getMyProfile();

      expect(mockGet).toHaveBeenCalledWith('/admin/profile/me');
      expect(result).toEqual(mockEmployee);
    });
  });

  describe('list', () => {
    it('should fetch employee list with filters', async () => {
      const mockResponse: EmployeeListResponse = {
        data: [
          {
            id: '1',
            email: 'emp1@example.com',
            active: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        total: 1,
      };

      mockGet.mockResolvedValueOnce({ data: mockResponse });

      const filter = { page: 1, limit: 20, department: 'Engineering' };
      const result = await employeeApi.list(filter);

      expect(mockGet).toHaveBeenCalledWith('/admin/enterprise/list', { params: filter });
      expect(result).toEqual(mockResponse);
    });

    it('should fetch employee list without filters', async () => {
      const mockResponse: EmployeeListResponse = {
        data: [],
        total: 0,
      };

      mockGet.mockResolvedValueOnce({ data: mockResponse });

      const result = await employeeApi.list();

      expect(mockGet).toHaveBeenCalledWith('/admin/enterprise/list', { params: {} });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getById', () => {
    it('should fetch employee by id', async () => {
      const mockEmployee: Employee = {
        id: '123',
        email: 'emp@example.com',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockGet.mockResolvedValueOnce({ data: mockEmployee });

      const result = await employeeApi.getById('123');

      expect(mockGet).toHaveBeenCalledWith('/admin/profile/123');
      expect(result).toEqual(mockEmployee);
    });
  });

  describe('update', () => {
    it('should update employee profile', async () => {
      const mockEmployee: Employee = {
        id: '123',
        email: 'emp@example.com',
        displayName: 'Updated Name',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      };

      mockPatch.mockResolvedValueOnce({ data: mockEmployee });

      const updateData = { displayName: 'Updated Name' };
      const result = await employeeApi.update('123', updateData);

      expect(mockPatch).toHaveBeenCalledWith('/admin/profile/123', updateData);
      expect(result).toEqual(mockEmployee);
    });
  });

  describe('updateScimCore', () => {
    it('should update SCIM core attributes', async () => {
      const mockEmployee: Employee = {
        id: '123',
        email: 'emp@example.com',
        locale: 'ko-KR',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      };

      mockPatch.mockResolvedValueOnce({ data: mockEmployee });

      const updateData = { locale: 'ko-KR' };
      const result = await employeeApi.updateScimCore('123', updateData);

      expect(mockPatch).toHaveBeenCalledWith('/admin/profile/123/scim', updateData);
      expect(result).toEqual(mockEmployee);
    });
  });

  describe('updateEmployeeInfo', () => {
    it('should update employee info', async () => {
      const mockEmployee: Employee = {
        id: '123',
        email: 'emp@example.com',
        employeeNumber: 'EMP-001',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      };

      mockPatch.mockResolvedValueOnce({ data: mockEmployee });

      const updateData = { employeeNumber: 'EMP-001' };
      const result = await employeeApi.updateEmployeeInfo('123', updateData);

      expect(mockPatch).toHaveBeenCalledWith('/admin/profile/123/employee', updateData);
      expect(result).toEqual(mockEmployee);
    });
  });

  describe('updateJobOrganization', () => {
    it('should update job and organization info', async () => {
      const mockEmployee: Employee = {
        id: '123',
        email: 'emp@example.com',
        title: 'Senior Engineer',
        department: 'Engineering',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      };

      mockPatch.mockResolvedValueOnce({ data: mockEmployee });

      const updateData = { title: 'Senior Engineer', department: 'Engineering' };
      const result = await employeeApi.updateJobOrganization('123', updateData);

      expect(mockPatch).toHaveBeenCalledWith('/admin/profile/123/job', updateData);
      expect(result).toEqual(mockEmployee);
    });
  });

  describe('updateContactInfo', () => {
    it('should update contact info', async () => {
      const mockEmployee: Employee = {
        id: '123',
        email: 'emp@example.com',
        phoneNumber: '+82-10-1234-5678',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      };

      mockPatch.mockResolvedValueOnce({ data: mockEmployee });

      const updateData = { phoneNumber: '+82-10-1234-5678' };
      const result = await employeeApi.updateContactInfo('123', updateData);

      expect(mockPatch).toHaveBeenCalledWith('/admin/profile/123/contact', updateData);
      expect(result).toEqual(mockEmployee);
    });
  });
});
