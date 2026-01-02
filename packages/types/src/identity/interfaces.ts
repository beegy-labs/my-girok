/**
 * Identity Platform - Module Interfaces
 * SSOT for cross-module communication
 *
 * Architecture: Combined service with pre-separated DBs for Zero Migration
 * - Current: In-process calls via interfaces
 * - Future: gRPC calls (same interface, different implementation)
 */

import type {
  Account,
  AccountListResponse,
  AccountQueryDto,
  CreateAccountDto,
  UpdateAccountDto,
  Session,
  SessionListResponse,
  SessionQueryDto,
  CreateSessionDto,
  RevokeSessionDto,
  Device,
  DeviceListResponse,
  DeviceQueryDto,
  RegisterDeviceDto,
  UpdateDeviceDto,
  Profile,
  UpdateProfileDto,
} from './types.js';

// Import Permission and Role from auth/types.ts (SSOT)
import type {
  Permission as AuthPermission,
  PermissionSummary,
  RoleEntity,
  RoleSummary,
} from '../auth/types.js';

// Import sanction enums from admin/sanction.enums.ts
import type { SanctionType, SanctionSeverity, SanctionStatus } from '../admin/sanction.enums.js';

// Local type aliases for internal use in this file
type Permission = AuthPermission;
type Role = RoleEntity;

// Re-export for backwards compatibility
// The full types from auth/types.ts are the SSOT for Permission and Role
export type { AuthPermission as Permission, RoleEntity as Role };

// Also export summary types for module interface use
export type { PermissionSummary, RoleSummary };

// ============================================================================
// Account Management Interface
// ============================================================================

/**
 * MFA setup response
 */
export interface MfaSetupResponse {
  secret: string;
  qrCode?: string;
  backupCodes?: string[];
}

/**
 * Account management operations
 */
export interface IAccountService {
  /**
   * Create a new account
   */
  createAccount(dto: CreateAccountDto): Promise<Account>;

  /**
   * Get account by ID
   * @throws NotFoundException if not found
   */
  getAccount(accountId: string): Promise<Account>;

  /**
   * Get account by email
   */
  getAccountByEmail(email: string): Promise<Account | null>;

  /**
   * Get account by username
   */
  getAccountByUsername(username: string): Promise<Account | null>;

  /**
   * Update account
   */
  updateAccount(accountId: string, dto: UpdateAccountDto): Promise<Account>;

  /**
   * Soft delete account
   */
  deleteAccount(accountId: string): Promise<void>;

  /**
   * Verify email address (marks email as verified)
   */
  verifyEmail(accountId: string): Promise<void>;

  /**
   * Enable MFA for account
   * Returns secret, QR code URI, and backup codes
   */
  enableMfa(accountId: string, method?: string): Promise<MfaSetupResponse>;

  /**
   * Verify and complete MFA setup
   */
  verifyAndCompleteMfaSetup(accountId: string, code: string): Promise<void>;

  /**
   * Verify MFA code for authentication
   */
  verifyMfaCode(accountId: string, code: string): Promise<boolean>;

  /**
   * Disable MFA for account
   */
  disableMfa(accountId: string): Promise<void>;

  /**
   * List accounts with pagination and filtering
   */
  listAccounts(query: AccountQueryDto): Promise<AccountListResponse>;

  /**
   * Validate password for authentication
   */
  validatePassword(accountId: string, password: string): Promise<boolean>;

  /**
   * Record failed login attempt
   */
  recordFailedLogin(accountId: string): Promise<void>;

  /**
   * Reset failed login attempts
   */
  resetFailedLogins(accountId: string): Promise<void>;
}

// ============================================================================
// Session Management Interface
// ============================================================================

/**
 * Created session response with tokens
 */
export interface CreatedSessionResponse extends Session {
  accessToken: string;
  refreshToken: string;
}

/**
 * Session management operations
 */
export interface ISessionService {
  /**
   * Create a new session
   * Returns session with access and refresh tokens
   */
  createSession(dto: CreateSessionDto): Promise<CreatedSessionResponse>;

  /**
   * Get session by ID
   * @throws NotFoundException if not found
   */
  getSession(sessionId: string): Promise<Session>;

  /**
   * Find session by token hash
   */
  findByTokenHash(tokenHash: string): Promise<Session | null>;

  /**
   * Validate and find session by access token
   * Returns null if token invalid or session expired
   */
  validateAccessToken(accessToken: string): Promise<Session | null>;

  /**
   * Refresh session tokens
   */
  refreshSession(refreshToken: string): Promise<CreatedSessionResponse>;

  /**
   * Revoke a session
   */
  revokeSession(sessionId: string, dto?: RevokeSessionDto): Promise<void>;

  /**
   * Revoke all sessions for an account
   * @returns Number of sessions revoked
   */
  revokeAllSessions(accountId: string, excludeSessionId?: string): Promise<number>;

  /**
   * List sessions for an account
   */
  listSessions(query: SessionQueryDto): Promise<SessionListResponse>;

  /**
   * Update session activity timestamp
   */
  touchSession(sessionId: string): Promise<void>;

  /**
   * Get active session count for account
   */
  getActiveSessionCount(accountId: string): Promise<number>;

  /**
   * Cleanup expired sessions
   * @returns Number of sessions cleaned up
   */
  cleanupExpired(): Promise<number>;
}

// ============================================================================
// Device Management Interface
// ============================================================================

/**
 * Device management operations
 */
export interface IDeviceService {
  /**
   * Register a new device (upserts by fingerprint)
   */
  registerDevice(dto: RegisterDeviceDto): Promise<Device>;

  /**
   * Get device by ID
   * @throws NotFoundException if not found
   */
  getDevice(deviceId: string): Promise<Device>;

  /**
   * Get device by fingerprint
   */
  getDeviceByFingerprint(accountId: string, fingerprint: string): Promise<Device | null>;

  /**
   * Update device
   */
  updateDevice(deviceId: string, dto: UpdateDeviceDto): Promise<Device>;

  /**
   * Remove device (also revokes associated sessions)
   */
  removeDevice(deviceId: string): Promise<void>;

  /**
   * List devices for an account
   */
  listDevices(query: DeviceQueryDto): Promise<DeviceListResponse>;

  /**
   * Trust a device
   * @returns Updated device
   */
  trustDevice(deviceId: string): Promise<Device>;

  /**
   * Untrust a device
   * @returns Updated device
   */
  untrustDevice(deviceId: string): Promise<Device>;

  /**
   * Update device activity timestamp
   */
  updateActivity(deviceId: string, ipAddress?: string): Promise<void>;

  /**
   * Get device count for account
   */
  getDeviceCount(accountId: string): Promise<number>;

  /**
   * Get trusted device count for account
   */
  getTrustedDeviceCount(accountId: string): Promise<number>;

  /**
   * Remove all devices for account
   * @returns Number of devices removed
   */
  removeAllForAccount(accountId: string): Promise<number>;
}

// ============================================================================
// Profile Management Interface
// ============================================================================

/**
 * Profile management operations
 */
export interface IProfileService {
  /**
   * Create profile for account
   */
  createProfile(accountId: string, displayName: string): Promise<Profile>;

  /**
   * Get profile by account ID
   * @throws NotFoundException if not found
   */
  getProfile(accountId: string): Promise<Profile>;

  /**
   * Update profile
   */
  updateProfile(accountId: string, dto: UpdateProfileDto): Promise<Profile>;

  /**
   * Delete profile
   */
  deleteProfile(accountId: string): Promise<void>;
}

// ============================================================================
// Identity Module Interface (Aggregate)
// ============================================================================

/**
 * Identity Module Interface
 * Aggregates all identity-related services (identity_db)
 *
 * @example
 * // Combined mode (in-process)
 * class IdentityModuleLocal implements IIdentityModule { ... }
 *
 * // Separated mode (gRPC)
 * class IdentityModuleRemote implements IIdentityModule { ... }
 */
export interface IIdentityModule {
  readonly accounts: IAccountService;
  readonly sessions: ISessionService;
  readonly devices: IDeviceService;
  readonly profiles: IProfileService;
}

// ============================================================================
// Auth Module Types (auth_db)
// ============================================================================

// Note: Role and Permission types are imported from auth/types.ts (SSOT)
// and re-exported at the top of this file for backwards compatibility.

/**
 * Sanction entity (simplified for module interface)
 * Full sanction types are in admin/sanction.types.ts
 */
export interface Sanction {
  id: string;
  subjectId: string;
  subjectType: 'ACCOUNT' | 'OPERATOR' | 'ADMIN';
  sanctionType: SanctionType;
  severity: SanctionSeverity;
  status: SanctionStatus;
  reason: string;
  restrictedFeatures: string[];
  startAt: Date;
  endAt: Date | null;
  createdAt: Date;
}

/**
 * Auth Module Interface
 * Handles authorization, roles, permissions, sanctions (auth_db)
 */
export interface IAuthModule {
  /**
   * Get active sanctions for a subject
   */
  getActiveSanctions(subjectId: string): Promise<Sanction[]>;

  /**
   * Check if subject has active sanction of specific type
   */
  hasSanction(subjectId: string, sanctionType: string): Promise<boolean>;

  /**
   * Get roles for an account (optionally filtered by service)
   */
  getAccountRoles(accountId: string, serviceId?: string): Promise<Role[]>;

  /**
   * Get permissions for a role
   */
  getRolePermissions(roleId: string): Promise<Permission[]>;

  /**
   * Check if account has specific permission
   */
  hasPermission(accountId: string, permissionCode: string, serviceId?: string): Promise<boolean>;
}

// ============================================================================
// Legal Module Types (legal_db)
// ============================================================================

/**
 * Consent type enumeration
 */
export type ConsentType =
  | 'TERMS_OF_SERVICE'
  | 'PRIVACY_POLICY'
  | 'MARKETING_EMAIL'
  | 'MARKETING_PUSH'
  | 'MARKETING_PUSH_NIGHT'
  | 'MARKETING_SMS'
  | 'PERSONALIZED_ADS'
  | 'THIRD_PARTY_SHARING'
  | 'CROSS_BORDER_TRANSFER'
  | 'CROSS_SERVICE_SHARING';

/**
 * Consent requirement entity
 */
export interface ConsentRequirement {
  id: string;
  consentType: ConsentType;
  countryCode: string;
  isRequired: boolean;
  labelKey: string;
  descriptionKey: string | null;
  displayOrder: number;
}

/**
 * Account consent entity
 */
export interface AccountConsent {
  id: string;
  accountId: string;
  consentType: ConsentType;
  scope: 'PLATFORM' | 'SERVICE';
  serviceId: string | null;
  countryCode: string;
  documentId: string | null;
  documentVersion: string | null;
  agreed: boolean;
  agreedAt: Date;
  withdrawnAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

/**
 * Record consent DTO
 */
export interface RecordConsentDto {
  accountId: string;
  consentType: ConsentType;
  countryCode: string;
  agreed: boolean;
  documentId?: string;
  documentVersion?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * DSR Request type
 */
export type DsrRequestType =
  | 'ACCESS'
  | 'RECTIFICATION'
  | 'ERASURE'
  | 'PORTABILITY'
  | 'RESTRICTION'
  | 'OBJECTION';

/**
 * DSR Request entity
 */
export interface DsrRequest {
  id: string;
  accountId: string;
  requestType: DsrRequestType;
  status: 'PENDING' | 'VERIFIED' | 'IN_PROGRESS' | 'AWAITING_INFO' | 'COMPLETED' | 'REJECTED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  deadline: Date;
  createdAt: Date;
}

/**
 * Legal Module Interface
 * Handles consents, legal documents, law registry, DSR (legal_db)
 */
export interface ILegalModule {
  /**
   * Get required consents for a country
   */
  getRequiredConsents(countryCode: string): Promise<ConsentRequirement[]>;

  /**
   * Get consents for an account
   */
  getAccountConsents(accountId: string): Promise<AccountConsent[]>;

  /**
   * Record a consent decision
   */
  recordConsent(dto: RecordConsentDto): Promise<AccountConsent>;

  /**
   * Record multiple consents (bulk)
   */
  recordConsents(dtos: RecordConsentDto[]): Promise<AccountConsent[]>;

  /**
   * Withdraw a consent
   */
  withdrawConsent(consentId: string, reason?: string): Promise<void>;

  /**
   * Check if account has required consents for country
   */
  hasRequiredConsents(accountId: string, countryCode: string): Promise<boolean>;

  /**
   * Create DSR request
   */
  createDsrRequest(accountId: string, requestType: DsrRequestType): Promise<DsrRequest>;

  /**
   * Get DSR requests for account
   */
  getDsrRequests(accountId: string): Promise<DsrRequest[]>;
}

// ============================================================================
// Composition Layer Types
// ============================================================================

/**
 * Registration consent item
 */
export interface RegistrationConsentItem {
  consentType: ConsentType;
  agreed: boolean;
}

/**
 * Registration DTO (used by Saga)
 */
export interface RegistrationDto {
  email: string;
  username: string;
  password: string;
  countryCode: string;
  locale?: string;
  consents: RegistrationConsentItem[];
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
}

/**
 * Registration result
 */
export interface RegistrationResult {
  account: Account;
  session: Session;
  profile: Profile;
}

/**
 * Account deletion options
 */
export interface AccountDeletionOptions {
  accountId: string;
  reason?: string;
  immediate?: boolean;
  scheduledAt?: Date;
}

// ============================================================================
// Full Identity Platform Interface
// ============================================================================

/**
 * Identity Platform Interface
 * Top-level interface for the entire identity platform
 *
 * Architecture:
 * - Combined: All modules in single service, in-process calls
 * - Separated: Each module as service, gRPC calls
 *
 * @example
 * // Provider factory
 * provide: 'IIdentityPlatform',
 * useFactory: (config) => config.IDENTITY_MODE === 'remote'
 *   ? new IdentityPlatformRemote()
 *   : new IdentityPlatformLocal()
 */
export interface IIdentityPlatform {
  readonly identity: IIdentityModule;
  readonly auth: IAuthModule;
  readonly legal: ILegalModule;
}
