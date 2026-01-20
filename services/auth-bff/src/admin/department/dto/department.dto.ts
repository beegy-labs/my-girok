import { z } from 'zod';

// ==========================================
// Create Department
// ==========================================

export const createDepartmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(128, 'Name must be at most 128 characters'),
  description: z.string().max(1000, 'Description must be at most 1000 characters').optional(),
});

export type CreateDepartmentDto = z.infer<typeof createDepartmentSchema>;

// ==========================================
// Update Department
// ==========================================

export const updateDepartmentSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(128, 'Name must be at most 128 characters')
    .optional(),
  description: z.string().max(1000, 'Description must be at most 1000 characters').optional(),
});

export type UpdateDepartmentDto = z.infer<typeof updateDepartmentSchema>;

// ==========================================
// Add/Remove Member
// ==========================================

export const addMemberSchema = z.object({
  adminId: z.string().uuid('Admin ID must be a valid UUID'),
  role: z.enum(['head', 'manager', 'member']).optional().default('member'),
});

export type AddMemberDto = z.infer<typeof addMemberSchema>;

export const removeMemberSchema = z.object({
  adminId: z.string().uuid('Admin ID must be a valid UUID'),
});

export type RemoveMemberDto = z.infer<typeof removeMemberSchema>;

// ==========================================
// Set Head
// ==========================================

export const setHeadSchema = z.object({
  adminId: z.string().uuid('Admin ID must be a valid UUID'),
});

export type SetHeadDto = z.infer<typeof setHeadSchema>;

// ==========================================
// List Departments Query
// ==========================================

export const listDepartmentsQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type ListDepartmentsQueryDto = z.infer<typeof listDepartmentsQuerySchema>;

// ==========================================
// Response Types
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

export interface DepartmentResponse {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentDetailResponse extends DepartmentResponse {
  members: DepartmentMember[];
  head?: DepartmentMember;
  managers: DepartmentMember[];
}

export interface DepartmentListResponse {
  departments: Department[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AddMemberResponse {
  success: boolean;
  message?: string;
}

export interface RemoveMemberResponse {
  success: boolean;
  message?: string;
}

export interface SetHeadResponse {
  success: boolean;
  previousHead?: {
    adminId: string;
    name: string;
  };
  newHead: {
    adminId: string;
    name: string;
  };
}
