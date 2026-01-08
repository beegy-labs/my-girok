/**
 * User role enumeration
 * Defines access levels across the platform
 */
export enum Role {
  /**
   * Non-authenticated users
   * Can only view public content
   */
  GUEST = 'GUEST',

  /**
   * Authenticated regular users
   * Can create and manage their own content
   */
  USER = 'USER',

  /**
   * Manager level administrators
   * Can manage users and moderate content
   */
  MANAGER = 'MANAGER',

  /**
   * Master level administrators
   * Full system access
   */
  MASTER = 'MASTER',
}

/**
 * Authentication provider enumeration
 * Supports multiple OAuth providers and local authentication
 */
export enum AuthProvider {
  /**
   * Email and password authentication
   */
  LOCAL = 'LOCAL',

  /**
   * Google OAuth 2.0
   */
  GOOGLE = 'GOOGLE',

  /**
   * Kakao OAuth
   */
  KAKAO = 'KAKAO',

  /**
   * Naver OAuth
   */
  NAVER = 'NAVER',

  /**
   * Apple Sign In (for iOS)
   */
  APPLE = 'APPLE',
}

/**
 * Token type enumeration
 */
export enum TokenType {
  ACCESS = 'ACCESS',
  REFRESH = 'REFRESH',
  DOMAIN_ACCESS = 'DOMAIN_ACCESS',
}

/**
 * Permission action enumeration
 * Defines the types of actions that can be performed on resources
 */
export enum PermissionAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LIST = 'LIST',
  MANAGE = 'MANAGE',
  EXECUTE = 'EXECUTE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

/**
 * Role scope enumeration
 * SSOT: Aligned with packages/proto/auth/v1/auth.proto
 * Defines the scope at which a role applies
 */
export enum RoleScope {
  /** Platform-wide scope (Proto: GLOBAL) */
  PLATFORM = 'PLATFORM',
  SERVICE = 'SERVICE',
  TENANT = 'TENANT',
}

/** Proto enum numeric values for RoleScope */
export const RoleScopeProto = {
  UNSPECIFIED: 0,
  GLOBAL: 1,
  SERVICE: 2,
  TENANT: 3,
} as const;

/** Map Proto numeric to TypeScript enum */
export const protoToRoleScope: Record<number, RoleScope> = {
  0: RoleScope.PLATFORM,
  1: RoleScope.PLATFORM, // GLOBAL -> PLATFORM
  2: RoleScope.SERVICE,
  3: RoleScope.TENANT,
};

/** Map TypeScript enum to Proto numeric */
export const roleScopeToProto: Record<RoleScope, number> = {
  [RoleScope.PLATFORM]: RoleScopeProto.GLOBAL,
  [RoleScope.SERVICE]: RoleScopeProto.SERVICE,
  [RoleScope.TENANT]: RoleScopeProto.TENANT,
};

/**
 * Role status enumeration
 * Defines the lifecycle status of a role
 */
export enum RoleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DEPRECATED = 'DEPRECATED',
}

/**
 * Operator status enumeration
 * SSOT: Aligned with packages/proto/auth/v1/auth.proto
 * Defines the lifecycle status of an operator
 */
export enum OperatorStatus {
  /** Awaiting activation */
  PENDING = 'PENDING',
  /** Fully active operator */
  ACTIVE = 'ACTIVE',
  /** Temporarily suspended */
  SUSPENDED = 'SUSPENDED',
  /** Permanently revoked */
  REVOKED = 'REVOKED',
}

/** Proto enum numeric values for OperatorStatus */
export const OperatorStatusProto = {
  UNSPECIFIED: 0,
  PENDING: 1,
  ACTIVE: 2,
  SUSPENDED: 3,
  REVOKED: 4,
} as const;

/** Map Proto numeric to TypeScript enum */
export const protoToOperatorStatus: Record<number, OperatorStatus> = {
  0: OperatorStatus.PENDING,
  1: OperatorStatus.PENDING,
  2: OperatorStatus.ACTIVE,
  3: OperatorStatus.SUSPENDED,
  4: OperatorStatus.REVOKED,
};

/** Map TypeScript enum to Proto numeric */
export const operatorStatusToProto: Record<OperatorStatus, number> = {
  [OperatorStatus.PENDING]: OperatorStatusProto.PENDING,
  [OperatorStatus.ACTIVE]: OperatorStatusProto.ACTIVE,
  [OperatorStatus.SUSPENDED]: OperatorStatusProto.SUSPENDED,
  [OperatorStatus.REVOKED]: OperatorStatusProto.REVOKED,
};

/**
 * Map boolean isActive to OperatorStatus
 * Used when database stores isActive boolean instead of status enum
 */
export function isActiveToOperatorStatus(isActive: boolean): OperatorStatus {
  return isActive ? OperatorStatus.ACTIVE : OperatorStatus.SUSPENDED;
}

/**
 * Map OperatorStatus to boolean isActive
 */
export function operatorStatusToIsActive(status: OperatorStatus): boolean {
  return status === OperatorStatus.ACTIVE;
}

/**
 * Auth provider enumeration for Proto mapping
 * SSOT: Aligned with packages/proto/identity/v1/identity.proto
 * Note: This extends the AuthProvider enum from this file with Proto numeric mappings
 */
export const AuthProviderProto = {
  UNSPECIFIED: 0,
  LOCAL: 1,
  GOOGLE: 2,
  APPLE: 3,
  KAKAO: 4,
  NAVER: 5,
} as const;

/** Map Proto numeric to AuthProvider string */
export const protoToAuthProvider: Record<number, AuthProvider> = {
  0: AuthProvider.LOCAL,
  1: AuthProvider.LOCAL,
  2: AuthProvider.GOOGLE,
  3: AuthProvider.APPLE,
  4: AuthProvider.KAKAO,
  5: AuthProvider.NAVER,
};

/** Map AuthProvider string to Proto numeric */
export const authProviderToProto: Record<AuthProvider, number> = {
  [AuthProvider.LOCAL]: AuthProviderProto.LOCAL,
  [AuthProvider.GOOGLE]: AuthProviderProto.GOOGLE,
  [AuthProvider.KAKAO]: AuthProviderProto.KAKAO,
  [AuthProvider.NAVER]: AuthProviderProto.NAVER,
  [AuthProvider.APPLE]: AuthProviderProto.APPLE,
};

/**
 * Account type enumeration
 * Defines the type of account for session management and access control
 * Used across BFF, backend services, and frontend applications
 */
export enum AccountType {
  /** Regular end-user account */
  USER = 'USER',
  /** Operator account (service-specific privileged user) */
  OPERATOR = 'OPERATOR',
  /** Administrator account (platform-wide admin) */
  ADMIN = 'ADMIN',
}

/** Array of all account types for validation */
export const ACCOUNT_TYPES = Object.values(AccountType) as AccountType[];

/** Proto enum numeric values for AccountType */
export const AccountTypeProto = {
  UNSPECIFIED: 0,
  USER: 1,
  OPERATOR: 2,
  ADMIN: 3,
} as const;

/** Map Proto numeric to TypeScript enum */
export const protoToAccountType: Record<number, AccountType> = {
  0: AccountType.USER,
  1: AccountType.USER,
  2: AccountType.OPERATOR,
  3: AccountType.ADMIN,
};

/** Map TypeScript enum to Proto numeric */
export const accountTypeToProto: Record<AccountType, number> = {
  [AccountType.USER]: AccountTypeProto.USER,
  [AccountType.OPERATOR]: AccountTypeProto.OPERATOR,
  [AccountType.ADMIN]: AccountTypeProto.ADMIN,
};

/**
 * OAuth provider type derived from AuthProvider enum
 * Used for OAuth flow identification across frontend and backend
 */
export type OAuthProvider = Exclude<AuthProvider, AuthProvider.LOCAL>;

/** Array of supported OAuth providers for validation and iteration */
export const OAUTH_PROVIDERS: readonly OAuthProvider[] = [
  AuthProvider.GOOGLE,
  AuthProvider.KAKAO,
  AuthProvider.NAVER,
  AuthProvider.APPLE,
] as const;

/** Helper to check if a provider is an OAuth provider (not LOCAL) */
export function isOAuthProvider(provider: AuthProvider): provider is OAuthProvider {
  return provider !== AuthProvider.LOCAL;
}

/**
 * Sanction severity enumeration for Proto mapping
 * SSOT: Aligned with packages/proto/auth/v1/auth.proto
 */
export const SanctionSeverityProto = {
  UNSPECIFIED: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
} as const;

/** Application-level SanctionSeverity enum */
export enum SanctionSeverityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/** Map Proto numeric to TypeScript enum */
export const protoToSanctionSeverity: Record<number, SanctionSeverityLevel> = {
  0: SanctionSeverityLevel.LOW,
  1: SanctionSeverityLevel.LOW,
  2: SanctionSeverityLevel.MEDIUM,
  3: SanctionSeverityLevel.HIGH,
  4: SanctionSeverityLevel.CRITICAL,
};

/** Map TypeScript enum to Proto numeric */
export const sanctionSeverityToProto: Record<SanctionSeverityLevel, number> = {
  [SanctionSeverityLevel.LOW]: SanctionSeverityProto.LOW,
  [SanctionSeverityLevel.MEDIUM]: SanctionSeverityProto.MEDIUM,
  [SanctionSeverityLevel.HIGH]: SanctionSeverityProto.HIGH,
  [SanctionSeverityLevel.CRITICAL]: SanctionSeverityProto.CRITICAL,
};
