/**
 * Identity Platform - Module Interfaces
 * IIdentityModule interface definition
 */

import type {
  Account,
  AccountListResponse,
  AccountQueryDto,
  CreateAccountDto,
  IdentityUpdateAccountDto,
  IdentitySession,
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
  ProfileSummary,
  CreateProfileDto,
  IdentityUpdateProfileDto,
} from './types.js';

// ============================================================================
// Account Management Interface
// ============================================================================

/**
 * Account management operations
 */
export interface IAccountService {
  /**
   * Create a new account
   * @param dto Account creation data
   * @returns Created account
   */
  createAccount(dto: CreateAccountDto): Promise<Account>;

  /**
   * Get account by ID
   * @param accountId Account ID
   * @returns Account or null if not found
   */
  getAccount(accountId: string): Promise<Account | null>;

  /**
   * Get account by email
   * @param email Email address
   * @returns Account or null if not found
   */
  getAccountByEmail(email: string): Promise<Account | null>;

  /**
   * Update account
   * @param accountId Account ID
   * @param dto Update data
   * @returns Updated account
   */
  updateAccount(accountId: string, dto: IdentityUpdateAccountDto): Promise<Account>;

  /**
   * Soft delete account
   * @param accountId Account ID
   */
  deleteAccount(accountId: string): Promise<void>;

  /**
   * Verify email address
   * @param accountId Account ID
   * @param token Verification token
   */
  verifyEmail(accountId: string, token: string): Promise<void>;

  /**
   * Verify phone number
   * @param accountId Account ID
   * @param code Verification code
   */
  verifyPhone(accountId: string, code: string): Promise<void>;

  /**
   * Enable MFA for account
   * @param accountId Account ID
   * @param method MFA method (TOTP, SMS, etc.)
   * @returns MFA setup data (secret, QR code, etc.)
   */
  enableMfa(accountId: string, method: string): Promise<{ secret: string; qrCode?: string }>;

  /**
   * Disable MFA for account
   * @param accountId Account ID
   */
  disableMfa(accountId: string): Promise<void>;

  /**
   * List accounts with pagination and filtering
   * @param query Query parameters
   * @returns Paginated account list
   */
  listAccounts(query: AccountQueryDto): Promise<AccountListResponse>;
}

// ============================================================================
// Session Management Interface
// ============================================================================

/**
 * Session management operations
 */
export interface ISessionService {
  /**
   * Create a new session
   * @param dto Session creation data
   * @returns Created session with tokens
   */
  createSession(dto: CreateSessionDto): Promise<IdentitySession>;

  /**
   * Get session by ID
   * @param sessionId Session ID
   * @returns Session or null if not found
   */
  getSession(sessionId: string): Promise<IdentitySession | null>;

  /**
   * Refresh session tokens
   * @param refreshToken Current refresh token
   * @returns New session with refreshed tokens
   */
  refreshSession(refreshToken: string): Promise<IdentitySession>;

  /**
   * Revoke a session
   * @param sessionId Session ID
   * @param dto Revoke reason
   */
  revokeSession(sessionId: string, dto?: RevokeSessionDto): Promise<void>;

  /**
   * Revoke all sessions for an account
   * @param accountId Account ID
   * @param excludeSessionId Optional session to exclude from revocation
   */
  revokeAllSessions(accountId: string, excludeSessionId?: string): Promise<void>;

  /**
   * List sessions for an account
   * @param query Query parameters
   * @returns Paginated session list
   */
  listSessions(query: SessionQueryDto): Promise<SessionListResponse>;

  /**
   * Update session activity timestamp
   * @param sessionId Session ID
   */
  touchSession(sessionId: string): Promise<void>;

  /**
   * Validate session
   * @param sessionId Session ID
   * @returns True if session is valid and active
   */
  validateSession(sessionId: string): Promise<boolean>;
}

// ============================================================================
// Device Management Interface
// ============================================================================

/**
 * Device management operations
 */
export interface IDeviceService {
  /**
   * Register a new device
   * @param dto Device registration data
   * @returns Registered device
   */
  registerDevice(dto: RegisterDeviceDto): Promise<Device>;

  /**
   * Get device by ID
   * @param deviceId Device ID
   * @returns Device or null if not found
   */
  getDevice(deviceId: string): Promise<Device | null>;

  /**
   * Get device by fingerprint
   * @param accountId Account ID
   * @param fingerprint Device fingerprint
   * @returns Device or null if not found
   */
  getDeviceByFingerprint(accountId: string, fingerprint: string): Promise<Device | null>;

  /**
   * Update device
   * @param deviceId Device ID
   * @param dto Update data
   * @returns Updated device
   */
  updateDevice(deviceId: string, dto: UpdateDeviceDto): Promise<Device>;

  /**
   * Remove device
   * @param deviceId Device ID
   */
  removeDevice(deviceId: string): Promise<void>;

  /**
   * List devices for an account
   * @param query Query parameters
   * @returns Paginated device list
   */
  listDevices(query: DeviceQueryDto): Promise<DeviceListResponse>;

  /**
   * Trust a device
   * @param deviceId Device ID
   */
  trustDevice(deviceId: string): Promise<void>;

  /**
   * Untrust a device
   * @param deviceId Device ID
   */
  untrustDevice(deviceId: string): Promise<void>;
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
   * @param dto Profile creation data
   * @returns Created profile
   */
  createProfile(dto: CreateProfileDto): Promise<Profile>;

  /**
   * Get profile by account ID
   * @param accountId Account ID
   * @returns Profile or null if not found
   */
  getProfile(accountId: string): Promise<Profile | null>;

  /**
   * Get public profile summary
   * @param accountId Account ID
   * @returns Public profile summary or null if not found/not public
   */
  getPublicProfile(accountId: string): Promise<ProfileSummary | null>;

  /**
   * Update profile
   * @param accountId Account ID
   * @param dto Update data
   * @returns Updated profile
   */
  updateProfile(accountId: string, dto: IdentityUpdateProfileDto): Promise<Profile>;

  /**
   * Update profile avatar
   * @param accountId Account ID
   * @param avatarUrl New avatar URL
   * @returns Updated profile
   */
  updateAvatar(accountId: string, avatarUrl: string): Promise<Profile>;

  /**
   * Delete profile
   * @param accountId Account ID
   */
  deleteProfile(accountId: string): Promise<void>;
}

// ============================================================================
// Identity Module Interface (Aggregate)
// ============================================================================

/**
 * Identity Platform Module Interface
 * Aggregates all identity-related services
 */
export interface IIdentityModule {
  /**
   * Account management service
   */
  readonly accounts: IAccountService;

  /**
   * Session management service
   */
  readonly sessions: ISessionService;

  /**
   * Device management service
   */
  readonly devices: IDeviceService;

  /**
   * Profile management service
   */
  readonly profiles: IProfileService;
}
