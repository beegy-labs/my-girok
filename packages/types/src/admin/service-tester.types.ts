// packages/types/src/admin/service-tester.types.ts

/**
 * User info for tester display
 */
export interface TesterUserInfo {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
}

/**
 * Admin info for tester display
 */
export interface TesterAdminInfo {
  id: string;
  email: string;
  name: string;
}

/**
 * Service tester (user)
 */
export interface TesterUser {
  id: string;
  serviceId: string;
  userId: string;
  user: TesterUserInfo;
  bypassAll: boolean;
  bypassDomain: boolean;
  bypassIP: boolean;
  bypassRate: boolean;
  note: string | null;
  expiresAt: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

/**
 * Service tester (admin)
 */
export interface TesterAdmin {
  id: string;
  serviceId: string;
  adminId: string;
  admin: TesterAdminInfo;
  bypassAll: boolean;
  bypassDomain: boolean;
  note: string | null;
  expiresAt: string | null;
  createdAt: string;
  createdBy: string;
}

/**
 * List response for user testers
 */
export interface TesterUserListResponse {
  data: TesterUser[];
  meta: {
    total: number;
    serviceId: string;
  };
}

/**
 * List response for admin testers
 */
export interface TesterAdminListResponse {
  data: TesterAdmin[];
  meta: {
    total: number;
    serviceId: string;
  };
}

/**
 * DTO for creating a user tester
 */
export interface CreateTesterUserDto {
  userId: string;
  bypassAll?: boolean;
  bypassDomain?: boolean;
  bypassIP?: boolean;
  bypassRate?: boolean;
  note?: string;
  expiresAt?: string;
  reason: string;
}

/**
 * DTO for updating a user tester
 */
export interface UpdateTesterUserDto {
  bypassAll?: boolean;
  bypassDomain?: boolean;
  bypassIP?: boolean;
  bypassRate?: boolean;
  note?: string;
  expiresAt?: string;
  reason: string;
}

/**
 * DTO for creating an admin tester
 */
export interface CreateTesterAdminDto {
  adminId: string;
  bypassAll?: boolean;
  bypassDomain?: boolean;
  note?: string;
  expiresAt?: string;
  reason: string;
}

/**
 * Query params for listing user testers
 */
export interface ListTesterUsersQuery {
  search?: string;
  expiresWithin?: string;
}

/**
 * Bypass status for tester check
 */
export interface TesterBypassStatus {
  isTester: boolean;
  bypassAll: boolean;
  bypassDomain: boolean;
  bypassIP: boolean;
  bypassRate: boolean;
  expiresAt: string | null;
}
