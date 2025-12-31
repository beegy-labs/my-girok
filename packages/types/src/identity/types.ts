/**
 * Identity Platform - Core Types
 * Account, Session, Device, Profile entities
 */

import type { AuthProvider } from '../auth/enums.js';

// ============================================================================
// Enums
// ============================================================================

/**
 * Account status enumeration
 */
export type AccountStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'PENDING_VERIFICATION'
  | 'DELETED';

/**
 * Session status enumeration
 */
export type SessionStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'LOGGED_OUT';

/**
 * Device type enumeration
 */
export type DeviceType = 'WEB' | 'MOBILE_IOS' | 'MOBILE_ANDROID' | 'TABLET' | 'DESKTOP' | 'OTHER';

/**
 * Device trust level enumeration
 */
export type DeviceTrustLevel = 'UNKNOWN' | 'LOW' | 'MEDIUM' | 'HIGH' | 'TRUSTED';

/**
 * Profile visibility enumeration
 */
export type ProfileVisibility = 'PUBLIC' | 'PRIVATE' | 'CONNECTIONS_ONLY';

// ============================================================================
// Account Types
// ============================================================================

/**
 * Account entity
 * Core identity entity representing a user account
 */
export interface Account {
  id: string;
  email: string;
  emailVerified: boolean;
  phoneNumber: string | null;
  phoneVerified: boolean;
  status: AccountStatus;
  provider: AuthProvider;
  providerId: string | null;
  passwordHash: string | null;
  mfaEnabled: boolean;
  mfaMethod: string | null;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Account summary for public exposure
 */
export interface AccountSummary {
  id: string;
  email: string;
  emailVerified: boolean;
  status: AccountStatus;
  provider: AuthProvider;
  mfaEnabled: boolean;
  createdAt: Date;
}

/**
 * Create account DTO
 */
export interface CreateAccountDto {
  email: string;
  password?: string;
  provider?: AuthProvider;
  providerId?: string;
  phoneNumber?: string;
}

/**
 * Update account DTO (Identity Platform)
 */
export interface IdentityUpdateAccountDto {
  email?: string;
  phoneNumber?: string;
  status?: AccountStatus;
}

// ============================================================================
// Session Types
// ============================================================================

/**
 * Session entity (Identity Platform)
 * Represents an active user session
 */
export interface IdentitySession {
  id: string;
  accountId: string;
  deviceId: string | null;
  status: SessionStatus;
  refreshToken: string;
  accessTokenHash: string | null;
  ipAddress: string;
  userAgent: string;
  location: string | null;
  expiresAt: Date;
  lastActivityAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
  revokedReason: string | null;
}

/**
 * Session summary for listing
 */
export interface SessionSummary {
  id: string;
  deviceId: string | null;
  status: SessionStatus;
  ipAddress: string;
  userAgent: string;
  location: string | null;
  lastActivityAt: Date;
  createdAt: Date;
}

/**
 * Create session DTO
 */
export interface CreateSessionDto {
  accountId: string;
  deviceId?: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  expiresInMs?: number;
}

/**
 * Revoke session DTO
 */
export interface RevokeSessionDto {
  reason?: string;
}

// ============================================================================
// Device Types
// ============================================================================

/**
 * Device entity
 * Represents a registered device for an account
 */
export interface Device {
  id: string;
  accountId: string;
  deviceType: DeviceType;
  deviceName: string;
  deviceFingerprint: string;
  trustLevel: DeviceTrustLevel;
  pushToken: string | null;
  platform: string | null;
  osVersion: string | null;
  appVersion: string | null;
  isActive: boolean;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Device summary for listing
 */
export interface DeviceSummary {
  id: string;
  deviceType: DeviceType;
  deviceName: string;
  trustLevel: DeviceTrustLevel;
  isActive: boolean;
  lastUsedAt: Date;
  createdAt: Date;
}

/**
 * Register device DTO
 */
export interface RegisterDeviceDto {
  accountId: string;
  deviceType: DeviceType;
  deviceName: string;
  deviceFingerprint: string;
  pushToken?: string;
  platform?: string;
  osVersion?: string;
  appVersion?: string;
}

/**
 * Update device DTO
 */
export interface UpdateDeviceDto {
  deviceName?: string;
  trustLevel?: DeviceTrustLevel;
  pushToken?: string;
  isActive?: boolean;
}

// ============================================================================
// Profile Types
// ============================================================================

/**
 * Profile entity
 * User profile information
 */
export interface Profile {
  id: string;
  accountId: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  bio: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  locale: string;
  timezone: string;
  countryCode: string | null;
  visibility: ProfileVisibility;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Profile summary for public exposure
 */
export interface ProfileSummary {
  id: string;
  displayName: string;
  avatar: string | null;
  bio: string | null;
  visibility: ProfileVisibility;
}

/**
 * Create profile DTO
 */
export interface CreateProfileDto {
  accountId: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  dateOfBirth?: Date;
  gender?: string;
  locale?: string;
  timezone?: string;
  countryCode?: string;
  visibility?: ProfileVisibility;
}

/**
 * Update profile DTO (Identity Platform)
 */
export interface IdentityUpdateProfileDto {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  dateOfBirth?: Date;
  gender?: string;
  locale?: string;
  timezone?: string;
  countryCode?: string;
  visibility?: ProfileVisibility;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Query Types
// ============================================================================

/**
 * Account query parameters
 */
export interface AccountQueryDto {
  email?: string;
  status?: AccountStatus;
  provider?: AuthProvider;
  emailVerified?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
}

/**
 * Session query parameters
 */
export interface SessionQueryDto {
  accountId?: string;
  deviceId?: string;
  status?: SessionStatus;
  page?: number;
  limit?: number;
}

/**
 * Device query parameters
 */
export interface DeviceQueryDto {
  accountId?: string;
  deviceType?: DeviceType;
  trustLevel?: DeviceTrustLevel;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Account list response
 */
export interface AccountListResponse {
  data: AccountSummary[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

/**
 * Session list response
 */
export interface SessionListResponse {
  data: SessionSummary[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

/**
 * Device list response
 */
export interface DeviceListResponse {
  data: DeviceSummary[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}
