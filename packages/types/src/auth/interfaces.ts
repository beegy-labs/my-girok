/**
 * Identity Platform - Auth Module Interfaces
 * IAuthModule interface definition
 */

import type {
  RoleEntity,
  RoleListResponse,
  RoleQueryDto,
  CreateRoleDto,
  UpdateRoleDto,
  Permission,
  PermissionSummary,
  PermissionListResponse,
  PermissionQueryDto,
  CreatePermissionDto,
  UpdatePermissionDto,
  AssignPermissionsDto,
  RevokePermissionsDto,
  AssignRoleDto,
  RevokeRoleDto,
  CheckPermissionDto,
  PermissionCheckResult,
  BulkCheckPermissionDto,
  BulkPermissionCheckResult,
  AccountRolesResponse,
  AccountPermissionsResponse,
} from './types.js';
import type {
  Sanction,
  SanctionListResponse,
  ListSanctionsQuery,
  CreateSanctionDto,
  UpdateSanctionDto,
  RevokeSanctionDto,
  ExtendSanctionDto,
  ReduceSanctionDto,
  ReviewAppealDto,
} from '../admin/sanction.types.js';
import type {
  Operator,
  OperatorInvitation,
  CreateOperatorInvitationDto,
  AcceptInvitationDto,
  CreateOperatorDirectDto,
  UpdateOperatorDto,
  GrantPermissionDto,
  RevokePermissionDto,
} from '../admin/operator.types.js';

// ============================================================================
// Role Management Interface
// ============================================================================

/**
 * Role management operations
 */
export interface IRoleService {
  /**
   * Create a new role
   * @param dto Role creation data
   * @returns Created role
   */
  createRole(dto: CreateRoleDto): Promise<RoleEntity>;

  /**
   * Get role by ID
   * @param roleId Role ID
   * @returns Role or null if not found
   */
  getRole(roleId: string): Promise<RoleEntity | null>;

  /**
   * Get role by name
   * @param name Role name
   * @param scope Role scope
   * @returns Role or null if not found
   */
  getRoleByName(name: string, scope: string): Promise<RoleEntity | null>;

  /**
   * Update role
   * @param roleId Role ID
   * @param dto Update data
   * @returns Updated role
   */
  updateRole(roleId: string, dto: UpdateRoleDto): Promise<RoleEntity>;

  /**
   * Delete role
   * @param roleId Role ID
   */
  deleteRole(roleId: string): Promise<void>;

  /**
   * List roles
   * @param query Query parameters
   * @returns Paginated role list
   */
  listRoles(query: RoleQueryDto): Promise<RoleListResponse>;

  /**
   * Assign permissions to role
   * @param roleId Role ID
   * @param dto Permission IDs to assign
   */
  assignPermissions(roleId: string, dto: AssignPermissionsDto): Promise<void>;

  /**
   * Revoke permissions from role
   * @param roleId Role ID
   * @param dto Permission IDs to revoke
   */
  revokePermissions(roleId: string, dto: RevokePermissionsDto): Promise<void>;

  /**
   * Get permissions for role
   * @param roleId Role ID
   * @returns List of permissions
   */
  getRolePermissions(roleId: string): Promise<PermissionSummary[]>;
}

// ============================================================================
// Permission Management Interface
// ============================================================================

/**
 * Permission management operations
 */
export interface IPermissionService {
  /**
   * Create a new permission
   * @param dto Permission creation data
   * @returns Created permission
   */
  createPermission(dto: CreatePermissionDto): Promise<Permission>;

  /**
   * Get permission by ID
   * @param permissionId Permission ID
   * @returns Permission or null if not found
   */
  getPermission(permissionId: string): Promise<Permission | null>;

  /**
   * Update permission
   * @param permissionId Permission ID
   * @param dto Update data
   * @returns Updated permission
   */
  updatePermission(permissionId: string, dto: UpdatePermissionDto): Promise<Permission>;

  /**
   * Delete permission
   * @param permissionId Permission ID
   */
  deletePermission(permissionId: string): Promise<void>;

  /**
   * List permissions
   * @param query Query parameters
   * @returns Paginated permission list
   */
  listPermissions(query: PermissionQueryDto): Promise<PermissionListResponse>;

  /**
   * Check if account has permission
   * @param dto Permission check request
   * @returns Permission check result
   */
  checkPermission(dto: CheckPermissionDto): Promise<PermissionCheckResult>;

  /**
   * Bulk check permissions
   * @param dto Bulk permission check request
   * @returns Bulk permission check result
   */
  bulkCheckPermission(dto: BulkCheckPermissionDto): Promise<BulkPermissionCheckResult>;
}

// ============================================================================
// Account Authorization Interface
// ============================================================================

/**
 * Account authorization operations
 */
export interface IAccountAuthorizationService {
  /**
   * Assign role to account
   * @param accountId Account ID
   * @param dto Role assignment data
   */
  assignRole(accountId: string, dto: AssignRoleDto): Promise<void>;

  /**
   * Revoke role from account
   * @param accountId Account ID
   * @param dto Role revocation data
   */
  revokeRole(accountId: string, dto: RevokeRoleDto): Promise<void>;

  /**
   * Get account roles
   * @param accountId Account ID
   * @returns Account roles response
   */
  getAccountRoles(accountId: string): Promise<AccountRolesResponse>;

  /**
   * Get account effective permissions
   * @param accountId Account ID
   * @param serviceId Optional service ID filter
   * @returns Account permissions response
   */
  getAccountPermissions(accountId: string, serviceId?: string): Promise<AccountPermissionsResponse>;

  /**
   * Check if account has specific role
   * @param accountId Account ID
   * @param roleName Role name
   * @returns True if account has role
   */
  hasRole(accountId: string, roleName: string): Promise<boolean>;

  /**
   * Check if account has specific permission
   * @param accountId Account ID
   * @param resource Resource name
   * @param action Permission action
   * @returns True if account has permission
   */
  hasPermission(accountId: string, resource: string, action: string): Promise<boolean>;
}

// ============================================================================
// Sanction Management Interface
// ============================================================================

/**
 * Sanction management operations
 */
export interface ISanctionService {
  /**
   * Create a sanction
   * @param dto Sanction creation data
   * @returns Created sanction
   */
  createSanction(dto: CreateSanctionDto): Promise<Sanction>;

  /**
   * Get sanction by ID
   * @param sanctionId Sanction ID
   * @returns Sanction or null if not found
   */
  getSanction(sanctionId: string): Promise<Sanction | null>;

  /**
   * Update sanction
   * @param sanctionId Sanction ID
   * @param dto Update data
   * @returns Updated sanction
   */
  updateSanction(sanctionId: string, dto: UpdateSanctionDto): Promise<Sanction>;

  /**
   * Revoke sanction
   * @param sanctionId Sanction ID
   * @param dto Revoke data
   */
  revokeSanction(sanctionId: string, dto: RevokeSanctionDto): Promise<void>;

  /**
   * Extend sanction
   * @param sanctionId Sanction ID
   * @param dto Extension data
   * @returns Updated sanction
   */
  extendSanction(sanctionId: string, dto: ExtendSanctionDto): Promise<Sanction>;

  /**
   * Reduce sanction
   * @param sanctionId Sanction ID
   * @param dto Reduction data
   * @returns Updated sanction
   */
  reduceSanction(sanctionId: string, dto: ReduceSanctionDto): Promise<Sanction>;

  /**
   * List sanctions
   * @param query Query parameters
   * @returns Paginated sanction list
   */
  listSanctions(query: ListSanctionsQuery): Promise<SanctionListResponse>;

  /**
   * Get active sanctions for subject
   * @param subjectId Subject ID
   * @returns List of active sanctions
   */
  getActiveSanctions(subjectId: string): Promise<Sanction[]>;

  /**
   * Check if subject is sanctioned
   * @param subjectId Subject ID
   * @returns True if subject has active sanctions
   */
  isSanctioned(subjectId: string): Promise<boolean>;

  /**
   * Review sanction appeal
   * @param sanctionId Sanction ID
   * @param dto Review data
   */
  reviewAppeal(sanctionId: string, dto: ReviewAppealDto): Promise<void>;
}

// ============================================================================
// Operator Management Interface
// ============================================================================

/**
 * Operator management operations
 */
export interface IOperatorService {
  /**
   * Create operator invitation
   * @param dto Invitation data
   * @returns Created invitation
   */
  createInvitation(dto: CreateOperatorInvitationDto): Promise<OperatorInvitation>;

  /**
   * Accept operator invitation
   * @param dto Acceptance data
   * @returns Created operator
   */
  acceptInvitation(dto: AcceptInvitationDto): Promise<Operator>;

  /**
   * Create operator directly (without invitation)
   * @param dto Operator creation data
   * @returns Created operator
   */
  createOperatorDirect(dto: CreateOperatorDirectDto): Promise<Operator>;

  /**
   * Get operator by ID
   * @param operatorId Operator ID
   * @returns Operator or null if not found
   */
  getOperator(operatorId: string): Promise<Operator | null>;

  /**
   * Update operator
   * @param operatorId Operator ID
   * @param dto Update data
   * @returns Updated operator
   */
  updateOperator(operatorId: string, dto: UpdateOperatorDto): Promise<Operator>;

  /**
   * Deactivate operator
   * @param operatorId Operator ID
   */
  deactivateOperator(operatorId: string): Promise<void>;

  /**
   * Reactivate operator
   * @param operatorId Operator ID
   */
  reactivateOperator(operatorId: string): Promise<void>;

  /**
   * Grant permissions to operator
   * @param dto Grant data
   */
  grantPermissions(dto: GrantPermissionDto): Promise<void>;

  /**
   * Revoke permissions from operator
   * @param dto Revoke data
   */
  revokePermissions(dto: RevokePermissionDto): Promise<void>;

  /**
   * List operators for service
   * @param serviceId Service ID
   * @returns List of operators
   */
  listOperators(serviceId: string): Promise<Operator[]>;
}

// ============================================================================
// Auth Module Interface (Aggregate)
// ============================================================================

/**
 * Auth Module Interface
 * Aggregates all authorization-related services
 */
export interface IAuthModule {
  /**
   * Role management service
   */
  readonly roles: IRoleService;

  /**
   * Permission management service
   */
  readonly permissions: IPermissionService;

  /**
   * Account authorization service
   */
  readonly authorization: IAccountAuthorizationService;

  /**
   * Sanction management service
   */
  readonly sanctions: ISanctionService;

  /**
   * Operator management service
   */
  readonly operators: IOperatorService;
}
