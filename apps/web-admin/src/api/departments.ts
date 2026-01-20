import apiClient from './client';

// ==========================================
// Types
// ==========================================

export interface Department {
  id: string;
  name: string;
  description?: string;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentMember {
  adminId: string;
  name: string;
  email: string;
  role: 'head' | 'manager' | 'member';
  joinedAt: string;
}

export interface DepartmentDetail extends Department {
  members: DepartmentMember[];
  head?: DepartmentMember;
  managers: DepartmentMember[];
}

export interface CreateDepartmentRequest {
  name: string;
  description?: string;
}

export interface UpdateDepartmentRequest {
  name?: string;
  description?: string;
}

export interface AddMemberRequest {
  adminId: string;
  role?: 'head' | 'manager' | 'member';
}

export interface SetHeadRequest {
  adminId: string;
}

export interface DepartmentListResponse {
  departments: Department[];
  total: number;
  page: number;
  totalPages: number;
}

// ==========================================
// API Client
// ==========================================

export const departmentsApi = {
  /**
   * List departments
   */
  list: async (query?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<DepartmentListResponse> => {
    const params = new URLSearchParams();
    if (query?.search) params.append('search', query.search);
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());

    const response = await apiClient.get<DepartmentListResponse>(`/admin/departments?${params}`);
    return response.data;
  },

  /**
   * Get department by ID
   */
  getById: async (id: string): Promise<DepartmentDetail> => {
    const response = await apiClient.get<DepartmentDetail>(`/admin/departments/${id}`);
    return response.data;
  },

  /**
   * Create department
   */
  create: async (data: CreateDepartmentRequest): Promise<Department> => {
    const response = await apiClient.post<Department>('/admin/departments', data);
    return response.data;
  },

  /**
   * Update department
   */
  update: async (id: string, data: UpdateDepartmentRequest): Promise<Department> => {
    const response = await apiClient.patch<Department>(`/admin/departments/${id}`, data);
    return response.data;
  },

  /**
   * Delete department
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/departments/${id}`);
  },

  /**
   * Add member to department
   */
  addMember: async (deptId: string, data: AddMemberRequest): Promise<void> => {
    await apiClient.post(`/admin/departments/${deptId}/members`, data);
  },

  /**
   * Remove member from department
   */
  removeMember: async (deptId: string, adminId: string): Promise<void> => {
    await apiClient.delete(`/admin/departments/${deptId}/members/${adminId}`);
  },

  /**
   * Set department head
   */
  setHead: async (deptId: string, data: SetHeadRequest): Promise<void> => {
    await apiClient.patch(`/admin/departments/${deptId}/head`, data);
  },
};
