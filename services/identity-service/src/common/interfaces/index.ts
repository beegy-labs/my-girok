/**
 * Service Interface Tokens
 * Used for interface-based dependency injection
 * Enables future gRPC extraction without code changes
 */

// Identity Module Tokens
export const ACCOUNTS_SERVICE = Symbol('ACCOUNTS_SERVICE');
export const SESSIONS_SERVICE = Symbol('SESSIONS_SERVICE');
export const DEVICES_SERVICE = Symbol('DEVICES_SERVICE');
export const PROFILES_SERVICE = Symbol('PROFILES_SERVICE');

// Auth Module Tokens
export const ROLES_SERVICE = Symbol('ROLES_SERVICE');
export const PERMISSIONS_SERVICE = Symbol('PERMISSIONS_SERVICE');
export const OPERATORS_SERVICE = Symbol('OPERATORS_SERVICE');
export const SANCTIONS_SERVICE = Symbol('SANCTIONS_SERVICE');

// Legal Module Tokens
export const CONSENTS_SERVICE = Symbol('CONSENTS_SERVICE');
export const LEGAL_DOCUMENTS_SERVICE = Symbol('LEGAL_DOCUMENTS_SERVICE');
export const LAW_REGISTRY_SERVICE = Symbol('LAW_REGISTRY_SERVICE');
export const DSR_REQUESTS_SERVICE = Symbol('DSR_REQUESTS_SERVICE');

// Composition Module Tokens
export const REGISTRATION_SERVICE = Symbol('REGISTRATION_SERVICE');
export const ACCOUNT_DELETION_SERVICE = Symbol('ACCOUNT_DELETION_SERVICE');

/**
 * Account Service Interface
 * Defines the contract for account management operations
 */
export interface IAccountsService {
  create(dto: CreateAccountInput): Promise<AccountOutput>;
  findById(id: string): Promise<AccountOutput>;
  findByEmail(email: string): Promise<AccountOutput | null>;
  findByUsername(username: string): Promise<AccountOutput | null>;
  findByExternalId(externalId: string): Promise<AccountOutput>;
  findAll(params: AccountQueryInput): Promise<PaginatedOutput<AccountOutput>>;
  update(id: string, dto: UpdateAccountInput): Promise<AccountOutput>;
  delete(id: string): Promise<void>;
  validatePassword(id: string, password: string): Promise<boolean>;
  changePassword(id: string, dto: ChangePasswordInput): Promise<void>;
  verifyEmail(id: string): Promise<void>;
  enableMfa(id: string): Promise<MfaSetupOutput>;
  verifyAndCompleteMfaSetup(id: string, code: string): Promise<void>;
  verifyMfaCode(id: string, code: string): Promise<boolean>;
  disableMfa(id: string): Promise<void>;
  updateStatus(id: string, status: string): Promise<AccountOutput>;
  recordFailedLogin(id: string): Promise<void>;
  resetFailedLogins(id: string): Promise<void>;
}

/**
 * Session Service Interface
 */
export interface ISessionsService {
  create(accountId: string, metadata?: SessionMetadata): Promise<SessionOutput>;
  findById(id: string): Promise<SessionOutput>;
  findByAccountId(accountId: string): Promise<SessionOutput[]>;
  validateToken(tokenHash: string): Promise<SessionOutput | null>;
  refresh(id: string, newTokenHash: string): Promise<SessionOutput>;
  revoke(id: string): Promise<void>;
  revokeAllForAccount(accountId: string): Promise<number>;
  updateActivity(id: string): Promise<void>;
}

/**
 * Device Service Interface
 */
export interface IDevicesService {
  register(dto: RegisterDeviceInput): Promise<DeviceOutput>;
  findById(id: string): Promise<DeviceOutput>;
  findByAccountId(accountId: string): Promise<DeviceOutput[]>;
  findByFingerprint(fingerprint: string): Promise<DeviceOutput | null>;
  updateTrustLevel(id: string, isTrusted: boolean): Promise<DeviceOutput>;
  updatePushToken(id: string, pushToken: string, pushPlatform: string): Promise<DeviceOutput>;
  delete(id: string): Promise<void>;
}

/**
 * Role Service Interface
 */
export interface IRolesService {
  create(dto: CreateRoleInput): Promise<RoleOutput>;
  findById(id: string): Promise<RoleOutput>;
  findByName(name: string, scope: string): Promise<RoleOutput | null>;
  findAll(params: RoleQueryInput): Promise<PaginatedOutput<RoleOutput>>;
  update(id: string, dto: UpdateRoleInput): Promise<RoleOutput>;
  delete(id: string): Promise<void>;
  assignPermission(roleId: string, permissionId: string): Promise<void>;
  removePermission(roleId: string, permissionId: string): Promise<void>;
  getPermissions(roleId: string): Promise<PermissionOutput[]>;
}

/**
 * Permission Service Interface
 */
export interface IPermissionsService {
  create(dto: CreatePermissionInput): Promise<PermissionOutput>;
  findById(id: string): Promise<PermissionOutput>;
  findByResource(resource: string): Promise<PermissionOutput[]>;
  findAll(params: PermissionQueryInput): Promise<PaginatedOutput<PermissionOutput>>;
  update(id: string, dto: UpdatePermissionInput): Promise<PermissionOutput>;
  delete(id: string): Promise<void>;
  checkPermission(operatorId: string, resource: string, action: string): Promise<boolean>;
}

/**
 * Consent Service Interface
 */
export interface IConsentsService {
  grant(dto: GrantConsentInput): Promise<ConsentOutput>;
  withdraw(id: string, reason?: string): Promise<void>;
  findByAccountId(accountId: string): Promise<ConsentOutput[]>;
  checkConsent(accountId: string, consentType: string): Promise<boolean>;
  getRequiredConsents(countryCode: string, serviceId?: string): Promise<ConsentRequirementOutput[]>;
}

// Input/Output type definitions (simplified for interface contract)
export interface CreateAccountInput {
  email: string;
  username: string;
  password?: string;
  provider?: string;
  providerId?: string;
  mode?: string;
  region?: string;
  locale?: string;
  timezone?: string;
  countryCode?: string;
}

export interface AccountOutput {
  id: string;
  externalId: string;
  email: string;
  username: string;
  provider: string;
  mode: string;
  status: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  region?: string;
  locale?: string;
  timezone?: string;
  countryCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateAccountInput {
  email?: string;
  status?: string;
  mfaEnabled?: boolean;
  region?: string;
  locale?: string;
  timezone?: string;
  countryCode?: string;
}

export interface AccountQueryInput {
  email?: string;
  username?: string;
  status?: string;
  provider?: string;
  emailVerified?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface ChangePasswordInput {
  currentPassword?: string;
  newPassword: string;
}

export interface MfaSetupOutput {
  secret: string;
  qrCode?: string;
  backupCodes?: string[];
}

export interface SessionMetadata {
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
}

export interface SessionOutput {
  id: string;
  accountId: string;
  tokenHash: string;
  refreshTokenHash?: string;
  expiresAt: Date;
  isActive: boolean;
  lastActivityAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface RegisterDeviceInput {
  accountId: string;
  fingerprint: string;
  deviceType: string;
  name?: string;
  platform?: string;
  osVersion?: string;
  appVersion?: string;
  browserName?: string;
  browserVersion?: string;
  pushToken?: string;
  pushPlatform?: string;
  ipAddress?: string;
}

export interface DeviceOutput {
  id: string;
  accountId: string;
  fingerprint: string;
  deviceType: string;
  name?: string;
  platform?: string;
  isTrusted: boolean;
  pushToken?: string;
  createdAt: Date;
  lastSeenAt?: Date;
}

export interface CreateRoleInput {
  name: string;
  displayName: string;
  description?: string;
  scope: string;
  level: number;
  parentId?: string;
}

export interface RoleOutput {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  scope: string;
  level: number;
  isActive: boolean;
  parentId?: string;
  createdAt: Date;
}

export interface UpdateRoleInput {
  displayName?: string;
  description?: string;
  level?: number;
  isActive?: boolean;
}

export interface RoleQueryInput {
  name?: string;
  scope?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface CreatePermissionInput {
  resource: string;
  action: string;
  displayName: string;
  description?: string;
  scope: string;
  category?: string;
  conditions?: Record<string, unknown>;
}

export interface PermissionOutput {
  id: string;
  resource: string;
  action: string;
  displayName: string;
  description?: string;
  scope: string;
  category?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface UpdatePermissionInput {
  displayName?: string;
  description?: string;
  conditions?: Record<string, unknown>;
  isActive?: boolean;
}

export interface PermissionQueryInput {
  resource?: string;
  action?: string;
  scope?: string;
  category?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface GrantConsentInput {
  accountId: string;
  documentId: string;
  consentType: string;
  scope: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ConsentOutput {
  id: string;
  accountId: string;
  documentId: string;
  consentType: string;
  scope: string;
  agreedAt: Date;
  withdrawnAt?: Date;
  isActive: boolean;
}

export interface ConsentRequirementOutput {
  id: string;
  consentType: string;
  isRequired: boolean;
  displayOrder: number;
  labelKey: string;
  descriptionKey?: string;
}

export interface PaginatedOutput<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
