/**
 * BFF Authentication DTOs
 * Frontend-compatible types for auth-bff API integration
 */

// ============================================================================
// Common Types
// ============================================================================

/** MFA method type */
export type MfaMethod = 'totp' | 'backup_code';

/** Base response with success and message */
export interface BffBaseResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// Admin Auth DTOs
// ============================================================================

/** Admin login request */
export interface AdminLoginRequest {
  email: string;
  password: string;
}

/** Admin MFA verification request */
export interface AdminLoginMfaRequest {
  challengeId: string;
  code: string;
  method: MfaMethod;
}

/** Admin login response */
export interface AdminLoginResponse extends BffBaseResponse {
  mfaRequired?: boolean;
  challengeId?: string;
  availableMethods?: MfaMethod[];
  admin?: AdminInfo;
}

/** Admin information */
export interface AdminInfo {
  id: string;
  email: string;
  name: string;
  scope: 'SYSTEM' | 'TENANT';
  mfaEnabled: boolean;
  roleName?: string;
  permissions?: string[];
}

/** Admin session information */
export interface AdminSession {
  id: string;
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
  mfaVerified: boolean;
  createdAt: string;
  lastActivityAt: string;
  isCurrent: boolean;
}

/** Admin MFA setup response */
export interface AdminMfaSetupResponse {
  secret: string;
  qrCodeUri: string;
  backupCodes: string[];
}

/** Admin change password request */
export interface AdminChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ============================================================================
// User Auth DTOs
// ============================================================================

/** User registration request */
export interface UserRegisterRequest {
  email: string;
  username: string;
  password: string;
  countryCode?: string;
  locale?: string;
  timezone?: string;
}

/** User login request */
export interface UserLoginRequest {
  email: string;
  password: string;
}

/** User MFA verification request */
export interface UserLoginMfaRequest {
  challengeId: string;
  code: string;
  method: MfaMethod;
}

/** User login response */
export interface UserLoginResponse extends BffBaseResponse {
  mfaRequired?: boolean;
  challengeId?: string;
  availableMethods?: MfaMethod[];
  user?: UserInfo;
}

/** User registration response */
export interface UserRegisterResponse extends BffBaseResponse {
  user?: UserInfo;
}

/** User information */
export interface UserInfo {
  id: string;
  email: string;
  username: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  tenantId?: string;
}

/** User MFA setup response */
export interface UserMfaSetupResponse {
  secret: string;
  qrCodeUri: string;
  backupCodes: string[];
}

/** User change password request */
export interface UserChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ============================================================================
// Operator Auth DTOs
// ============================================================================

/** Operator login request */
export interface OperatorLoginRequest {
  email: string;
  password: string;
  serviceId: string;
}

/** Operator login response */
export interface OperatorLoginResponse extends BffBaseResponse {
  operator?: OperatorInfo;
}

/** Operator information */
export interface OperatorInfo {
  id: string;
  accountId: string;
  email: string;
  serviceId: string;
  serviceName: string;
  permissions: string[];
}

// ============================================================================
// OAuth DTOs
// ============================================================================

/** OAuth initiation response */
export interface OAuthInitResponse {
  authUrl: string;
}

/** OAuth callback response */
export interface OAuthCallbackResponse extends BffBaseResponse {
  user?: UserInfo;
  isNewUser?: boolean;
}

// ============================================================================
// Session DTOs
// ============================================================================

/** Session revoke response */
export interface SessionRevokeResponse extends BffBaseResponse {
  revokedCount?: number;
}

/** Backup codes response */
export interface BackupCodesResponse {
  backupCodes: string[];
}

/** Backup codes count response */
export interface BackupCodesCountResponse {
  remainingCount: number;
}
