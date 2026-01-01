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
 * Defines the scope at which a role applies
 */
export enum RoleScope {
  PLATFORM = 'PLATFORM',
  SERVICE = 'SERVICE',
  TENANT = 'TENANT',
}

/**
 * Role status enumeration
 * Defines the lifecycle status of a role
 */
export enum RoleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DEPRECATED = 'DEPRECATED',
}
