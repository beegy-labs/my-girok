/**
 * Identity Platform - Core Types
 * SSOT: Synced with Prisma schemas (identity_db, auth_db, legal_db)
 *
 * Architecture: Combined service with pre-separated DBs for Zero Migration
 */

// ============================================================================
// Enums (SSOT: Prisma Schema)
// ============================================================================

/**
 * Account status enumeration
 * SSOT: Aligned with packages/proto/identity/v1/identity.proto
 * @see services/identity-service/prisma/identity/schema.prisma
 */
export enum AccountStatus {
  /** Initial state, awaiting email verification */
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  /** Fully active account */
  ACTIVE = 'ACTIVE',
  /** Temporarily suspended by admin */
  SUSPENDED = 'SUSPENDED',
  /** Soft-deleted, can be restored */
  DELETED = 'DELETED',
  /** Locked due to security reasons (failed logins, etc.) */
  LOCKED = 'LOCKED',
}

/** Proto enum numeric values for AccountStatus */
export const AccountStatusProto = {
  UNSPECIFIED: 0,
  PENDING: 1,
  ACTIVE: 2,
  SUSPENDED: 3,
  DELETED: 4,
  LOCKED: 5,
} as const;

/** Map Proto numeric to TypeScript enum */
export const protoToAccountStatus: Record<number, AccountStatus> = {
  0: AccountStatus.PENDING_VERIFICATION,
  1: AccountStatus.PENDING_VERIFICATION,
  2: AccountStatus.ACTIVE,
  3: AccountStatus.SUSPENDED,
  4: AccountStatus.DELETED,
  5: AccountStatus.LOCKED,
};

/** Map TypeScript enum to Proto numeric */
export const accountStatusToProto: Record<AccountStatus, number> = {
  [AccountStatus.PENDING_VERIFICATION]: AccountStatusProto.PENDING,
  [AccountStatus.ACTIVE]: AccountStatusProto.ACTIVE,
  [AccountStatus.SUSPENDED]: AccountStatusProto.SUSPENDED,
  [AccountStatus.DELETED]: AccountStatusProto.DELETED,
  [AccountStatus.LOCKED]: AccountStatusProto.LOCKED,
};

/**
 * Account mode enumeration
 * SSOT: Aligned with packages/proto/identity/v1/identity.proto
 *
 * Note: Proto defines granular modes (USER, ADMIN, OPERATOR, SERVICE)
 * Application layer uses simplified modes (UNIFIED for all user types, SERVICE for machine accounts)
 */
export enum AccountMode {
  /** Machine-to-machine service account */
  SERVICE = 'SERVICE',
  /** Unified user account (includes USER, ADMIN, OPERATOR roles) */
  UNIFIED = 'UNIFIED',
}

/** Proto enum numeric values for AccountMode */
export const AccountModeProto = {
  UNSPECIFIED: 0,
  USER: 1,
  ADMIN: 2,
  OPERATOR: 3,
  SERVICE: 4,
} as const;

/** Map Proto numeric to TypeScript enum */
export const protoToAccountMode: Record<number, AccountMode> = {
  0: AccountMode.UNIFIED,
  1: AccountMode.UNIFIED,
  2: AccountMode.UNIFIED,
  3: AccountMode.UNIFIED,
  4: AccountMode.SERVICE,
};

/** Map TypeScript enum to Proto numeric (defaults to USER for UNIFIED) */
export const accountModeToProto: Record<AccountMode, number> = {
  [AccountMode.UNIFIED]: AccountModeProto.USER,
  [AccountMode.SERVICE]: AccountModeProto.SERVICE,
};

/**
 * Auth provider enumeration
 */
export type AuthProvider =
  | 'LOCAL'
  | 'GOOGLE'
  | 'KAKAO'
  | 'NAVER'
  | 'APPLE'
  | 'MICROSOFT'
  | 'GITHUB';

/**
 * Device type enumeration
 * @see services/identity-service/prisma/identity/schema.prisma
 */
export type DeviceType = 'WEB' | 'IOS' | 'ANDROID' | 'DESKTOP' | 'OTHER';

/**
 * Push notification platform
 */
export type PushPlatform = 'FCM' | 'APNS' | 'WEB_PUSH';

/**
 * Gender enumeration
 * @see services/identity-service/prisma/identity/schema.prisma
 */
export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';

/**
 * Outbox event status
 */
export type OutboxStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

// ============================================================================
// Account Types
// ============================================================================

/**
 * Account entity
 * Core identity entity representing a user account
 * @see services/identity-service/prisma/identity/schema.prisma
 */
export interface Account {
  id: string;
  externalId: string;
  email: string;
  username: string;
  password: string | null;
  provider: AuthProvider;
  providerId: string | null;
  status: AccountStatus;
  mode: AccountMode;

  // Verification
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  phoneVerified: boolean;
  phoneVerifiedAt: Date | null;

  // Security
  mfaEnabled: boolean;
  mfaSecret: string | null;
  mfaBackupCodes: string[];
  lastPasswordChange: Date | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;

  // Preferences (on Account, not Profile)
  region: string | null;
  locale: string | null;
  timezone: string | null;
  countryCode: string | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Account summary for public exposure
 */
export interface AccountSummary {
  id: string;
  externalId: string;
  email: string;
  username: string;
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
  username: string;
  password?: string;
  provider?: AuthProvider;
  providerId?: string;
  countryCode?: string;
  locale?: string;
}

/**
 * Update account DTO
 */
export interface UpdateAccountDto {
  email?: string;
  username?: string;
  status?: AccountStatus;
  region?: string;
  locale?: string;
  timezone?: string;
  countryCode?: string;
}

// ============================================================================
// Session Types
// ============================================================================

/**
 * Session entity
 * Represents an active user session
 * Note: Uses isActive boolean instead of status enum
 * @see services/identity-service/prisma/identity/schema.prisma
 */
export interface Session {
  id: string;
  accountId: string;
  tokenHash: string;
  refreshTokenHash: string | null;

  // Session metadata
  deviceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;

  // Session state (boolean, not enum)
  isActive: boolean;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedReason: string | null;

  // Activity tracking
  lastActivityAt: Date | null;

  // Timestamps
  createdAt: Date;
}

/**
 * Session summary for listing
 */
export interface SessionSummary {
  id: string;
  deviceId: string | null;
  isActive: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  lastActivityAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Create session DTO
 */
export interface CreateSessionDto {
  accountId: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
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
 * Note: Uses isTrusted boolean instead of trustLevel enum
 * @see services/identity-service/prisma/identity/schema.prisma
 */
export interface Device {
  id: string;
  accountId: string;

  // Device identification
  fingerprint: string;
  name: string | null;
  deviceType: DeviceType;

  // Device info
  platform: string | null;
  osVersion: string | null;
  appVersion: string | null;
  browserName: string | null;
  browserVersion: string | null;

  // Push notification
  pushToken: string | null;
  pushPlatform: PushPlatform | null;

  // Trust level (boolean, not enum)
  isTrusted: boolean;
  trustedAt: Date | null;

  // Activity
  lastActiveAt: Date | null;
  lastIpAddress: string | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Device summary for listing
 */
export interface DeviceSummary {
  id: string;
  deviceType: DeviceType;
  name: string | null;
  isTrusted: boolean;
  lastActiveAt: Date | null;
  createdAt: Date;
}

/**
 * Register device DTO
 */
export interface RegisterDeviceDto {
  accountId: string;
  deviceType: DeviceType;
  fingerprint: string;
  name?: string;
  pushToken?: string;
  pushPlatform?: PushPlatform;
  platform?: string;
  osVersion?: string;
  appVersion?: string;
}

/**
 * Update device DTO
 */
export interface UpdateDeviceDto {
  name?: string;
  pushToken?: string;
  pushPlatform?: PushPlatform;
}

// ============================================================================
// Profile Types
// ============================================================================

/**
 * Profile entity
 * User profile information
 * Note: locale/timezone are on Account, not Profile
 * @see services/identity-service/prisma/identity/schema.prisma
 */
export interface Profile {
  id: string;
  accountId: string;

  // Basic info
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  bio: string | null;

  // Personal info
  birthDate: Date | null;
  gender: Gender | null;

  // Contact
  phoneCountryCode: string | null;
  phoneNumber: string | null;

  // Address
  countryCode: string | null;
  region: string | null;
  city: string | null;
  address: string | null;
  postalCode: string | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Profile summary for public exposure
 */
export interface ProfileSummary {
  id: string;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
}

/**
 * Create profile DTO
 */
export interface CreateProfileDto {
  accountId: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  birthDate?: Date;
  gender?: Gender;
  countryCode?: string;
}

/**
 * Update profile DTO
 */
export interface UpdateProfileDto {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  birthDate?: Date;
  gender?: Gender;
  phoneCountryCode?: string;
  phoneNumber?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  address?: string;
  postalCode?: string;
}

// ============================================================================
// Query Types
// ============================================================================

/**
 * Account query parameters
 */
export interface AccountQueryDto {
  email?: string;
  username?: string;
  status?: AccountStatus;
  provider?: AuthProvider;
  emailVerified?: boolean;
  countryCode?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Session query parameters
 */
export interface SessionQueryDto {
  accountId?: string;
  deviceId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Device query parameters
 */
export interface DeviceQueryDto {
  accountId?: string;
  deviceType?: DeviceType;
  isTrusted?: boolean;
  page?: number;
  limit?: number;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Account list response
 */
export interface AccountListResponse {
  data: AccountSummary[];
  meta: PaginationMeta;
}

/**
 * Session list response
 */
export interface SessionListResponse {
  data: SessionSummary[];
  meta: PaginationMeta;
}

/**
 * Device list response
 */
export interface DeviceListResponse {
  data: DeviceSummary[];
  meta: PaginationMeta;
}

// ============================================================================
// Outbox Event Types (Transactional Outbox Pattern)
// ============================================================================

/**
 * Outbox event entity
 * Used for reliable event publishing across module boundaries
 */
export interface OutboxEvent {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  retryCount: number;
  lastError: string | null;
  processedAt: Date | null;
  createdAt: Date;
}
