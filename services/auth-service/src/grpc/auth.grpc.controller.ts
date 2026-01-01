import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { Prisma } from '../../node_modules/.prisma/auth-client';
import { PrismaService } from '../database/prisma.service';

// Proto enum mappings
enum ProtoOperatorStatus {
  OPERATOR_STATUS_UNSPECIFIED = 0,
  OPERATOR_STATUS_PENDING = 1,
  OPERATOR_STATUS_ACTIVE = 2,
  OPERATOR_STATUS_SUSPENDED = 3,
  OPERATOR_STATUS_REVOKED = 4,
}

enum ProtoRoleScope {
  ROLE_SCOPE_UNSPECIFIED = 0,
  ROLE_SCOPE_GLOBAL = 1,
  ROLE_SCOPE_SERVICE = 2,
  ROLE_SCOPE_TENANT = 3,
}

enum ProtoSubjectType {
  SUBJECT_TYPE_UNSPECIFIED = 0,
  SUBJECT_TYPE_USER = 1,
  SUBJECT_TYPE_OPERATOR = 2,
  SUBJECT_TYPE_SERVICE = 3,
}

enum ProtoSanctionType {
  SANCTION_TYPE_UNSPECIFIED = 0,
  SANCTION_TYPE_WARNING = 1,
  SANCTION_TYPE_MUTE = 2,
  SANCTION_TYPE_TEMPORARY_BAN = 3,
  SANCTION_TYPE_PERMANENT_BAN = 4,
  SANCTION_TYPE_FEATURE_RESTRICTION = 5,
}

enum ProtoSanctionSeverity {
  SANCTION_SEVERITY_UNSPECIFIED = 0,
  SANCTION_SEVERITY_LOW = 1,
  SANCTION_SEVERITY_MEDIUM = 2,
  SANCTION_SEVERITY_HIGH = 3,
  SANCTION_SEVERITY_CRITICAL = 4,
}

enum ProtoSanctionStatus {
  SANCTION_STATUS_UNSPECIFIED = 0,
  SANCTION_STATUS_ACTIVE = 1,
  SANCTION_STATUS_EXPIRED = 2,
  SANCTION_STATUS_REVOKED = 3,
  SANCTION_STATUS_APPEALED = 4,
}

// Interfaces for proto messages
interface Permission {
  id: string;
  resource: string;
  action: string;
  category: string;
  description: string;
  isSystem: boolean;
}

interface Role {
  id: string;
  name: string;
  description: string;
  level: number;
  scope: ProtoRoleScope;
  permissions: Permission[];
  createdAt?: { seconds: number; nanos: number };
  updatedAt?: { seconds: number; nanos: number };
}

interface Operator {
  id: string;
  accountId: string;
  email: string;
  displayName: string;
  status: ProtoOperatorStatus;
  roleId: string;
  role?: Role;
  createdAt?: { seconds: number; nanos: number };
  updatedAt?: { seconds: number; nanos: number };
  lastLoginAt?: { seconds: number; nanos: number };
}

interface Sanction {
  id: string;
  subjectId: string;
  subjectType: ProtoSubjectType;
  type: ProtoSanctionType;
  severity: ProtoSanctionSeverity;
  reason: string;
  evidence: string;
  issuedBy: string;
  issuedAt?: { seconds: number; nanos: number };
  expiresAt?: { seconds: number; nanos: number };
  status: ProtoSanctionStatus;
}

// Request/Response interfaces
interface CheckPermissionRequest {
  operatorId: string;
  resource: string;
  action: string;
  context?: Record<string, string>;
}

interface CheckPermissionResponse {
  allowed: boolean;
  reason: string;
  matchedPermissions: string[];
}

interface PermissionCheck {
  resource: string;
  action: string;
}

interface CheckPermissionsRequest {
  operatorId: string;
  checks: PermissionCheck[];
}

interface PermissionCheckResult {
  resource: string;
  action: string;
  allowed: boolean;
  reason: string;
}

interface CheckPermissionsResponse {
  allAllowed: boolean;
  results: PermissionCheckResult[];
}

interface GetOperatorPermissionsRequest {
  operatorId: string;
  includeRolePermissions: boolean;
}

interface GetOperatorPermissionsResponse {
  permissions: Permission[];
  directPermissions: Permission[];
  rolePermissions: Permission[];
}

interface GetRoleRequest {
  id: string;
}

interface GetRoleResponse {
  role: Role;
}

interface GetRolesByOperatorRequest {
  operatorId: string;
}

interface GetRolesByOperatorResponse {
  roles: Role[];
}

interface GetOperatorRequest {
  id: string;
}

interface GetOperatorResponse {
  operator: Operator;
}

interface ValidateOperatorRequest {
  id: string;
}

interface ValidateOperatorResponse {
  valid: boolean;
  status: ProtoOperatorStatus;
  message: string;
}

interface CheckSanctionRequest {
  subjectId: string;
  subjectType: ProtoSubjectType;
  sanctionType?: ProtoSanctionType;
}

interface CheckSanctionResponse {
  isSanctioned: boolean;
  activeSanctions: Sanction[];
  highestSeverity: ProtoSanctionSeverity;
}

interface GetActiveSanctionsRequest {
  subjectId: string;
  subjectType: ProtoSubjectType;
}

interface GetActiveSanctionsResponse {
  sanctions: Sanction[];
  totalCount: number;
}

// Database row interfaces
interface PermissionRow {
  id: string;
  resource: string;
  action: string;
  category: string | null;
  description: string | null;
  isSystem: boolean;
}

interface OperatorRow {
  id: string;
  accountId: string | null;
  email: string;
  name: string | null;
  isActive: boolean;
  roleId: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  level: number;
  scope: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SanctionRow {
  id: string;
  subjectId: string;
  subjectType: string;
  type: string;
  severity: string;
  reason: string;
  evidenceUrls: string[];
  issuedBy: string;
  startAt: Date;
  endAt: Date | null;
  status: string;
}

@Controller()
export class AuthGrpcController {
  private readonly logger = new Logger(AuthGrpcController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Convert Date to protobuf Timestamp
   */
  private toTimestamp(
    date: Date | null | undefined,
  ): { seconds: number; nanos: number } | undefined {
    if (!date) return undefined;
    const ms = date.getTime();
    return {
      seconds: Math.floor(ms / 1000),
      nanos: (ms % 1000) * 1_000_000,
    };
  }

  /**
   * Map DB operator status to proto enum
   */
  private mapOperatorStatus(isActive: boolean): ProtoOperatorStatus {
    return isActive
      ? ProtoOperatorStatus.OPERATOR_STATUS_ACTIVE
      : ProtoOperatorStatus.OPERATOR_STATUS_SUSPENDED;
  }

  /**
   * Map DB role scope to proto enum
   */
  private mapRoleScope(scope: string): ProtoRoleScope {
    const scopeMap: Record<string, ProtoRoleScope> = {
      GLOBAL: ProtoRoleScope.ROLE_SCOPE_GLOBAL,
      SERVICE: ProtoRoleScope.ROLE_SCOPE_SERVICE,
      TENANT: ProtoRoleScope.ROLE_SCOPE_TENANT,
    };
    return scopeMap[scope] ?? ProtoRoleScope.ROLE_SCOPE_UNSPECIFIED;
  }

  /**
   * Map DB subject type to proto enum
   */
  private mapSubjectType(type: string): ProtoSubjectType {
    const typeMap: Record<string, ProtoSubjectType> = {
      USER: ProtoSubjectType.SUBJECT_TYPE_USER,
      OPERATOR: ProtoSubjectType.SUBJECT_TYPE_OPERATOR,
      ADMIN: ProtoSubjectType.SUBJECT_TYPE_OPERATOR, // Map ADMIN to OPERATOR
      SERVICE: ProtoSubjectType.SUBJECT_TYPE_SERVICE,
    };
    return typeMap[type] ?? ProtoSubjectType.SUBJECT_TYPE_UNSPECIFIED;
  }

  /**
   * Map proto subject type to DB string
   */
  private protoSubjectTypeToDb(type: ProtoSubjectType): string {
    const typeMap: Record<ProtoSubjectType, string> = {
      [ProtoSubjectType.SUBJECT_TYPE_UNSPECIFIED]: 'USER',
      [ProtoSubjectType.SUBJECT_TYPE_USER]: 'USER',
      [ProtoSubjectType.SUBJECT_TYPE_OPERATOR]: 'ADMIN',
      [ProtoSubjectType.SUBJECT_TYPE_SERVICE]: 'SERVICE',
    };
    return typeMap[type];
  }

  /**
   * Map DB sanction type to proto enum
   */
  private mapSanctionType(type: string): ProtoSanctionType {
    const typeMap: Record<string, ProtoSanctionType> = {
      WARNING: ProtoSanctionType.SANCTION_TYPE_WARNING,
      MUTE: ProtoSanctionType.SANCTION_TYPE_MUTE,
      TEMPORARY_BAN: ProtoSanctionType.SANCTION_TYPE_TEMPORARY_BAN,
      PERMANENT_BAN: ProtoSanctionType.SANCTION_TYPE_PERMANENT_BAN,
      FEATURE_RESTRICTION: ProtoSanctionType.SANCTION_TYPE_FEATURE_RESTRICTION,
    };
    return typeMap[type] ?? ProtoSanctionType.SANCTION_TYPE_UNSPECIFIED;
  }

  /**
   * Map proto sanction type to DB string
   */
  private protoSanctionTypeToDb(type: ProtoSanctionType): string | undefined {
    const typeMap: Record<ProtoSanctionType, string | undefined> = {
      [ProtoSanctionType.SANCTION_TYPE_UNSPECIFIED]: undefined,
      [ProtoSanctionType.SANCTION_TYPE_WARNING]: 'WARNING',
      [ProtoSanctionType.SANCTION_TYPE_MUTE]: 'MUTE',
      [ProtoSanctionType.SANCTION_TYPE_TEMPORARY_BAN]: 'TEMPORARY_BAN',
      [ProtoSanctionType.SANCTION_TYPE_PERMANENT_BAN]: 'PERMANENT_BAN',
      [ProtoSanctionType.SANCTION_TYPE_FEATURE_RESTRICTION]: 'FEATURE_RESTRICTION',
    };
    return typeMap[type];
  }

  /**
   * Map DB sanction severity to proto enum
   */
  private mapSanctionSeverity(severity: string): ProtoSanctionSeverity {
    const severityMap: Record<string, ProtoSanctionSeverity> = {
      LOW: ProtoSanctionSeverity.SANCTION_SEVERITY_LOW,
      MEDIUM: ProtoSanctionSeverity.SANCTION_SEVERITY_MEDIUM,
      HIGH: ProtoSanctionSeverity.SANCTION_SEVERITY_HIGH,
      CRITICAL: ProtoSanctionSeverity.SANCTION_SEVERITY_CRITICAL,
    };
    return severityMap[severity] ?? ProtoSanctionSeverity.SANCTION_SEVERITY_UNSPECIFIED;
  }

  /**
   * Map DB sanction status to proto enum
   */
  private mapSanctionStatus(statusValue: string): ProtoSanctionStatus {
    const statusMap: Record<string, ProtoSanctionStatus> = {
      ACTIVE: ProtoSanctionStatus.SANCTION_STATUS_ACTIVE,
      EXPIRED: ProtoSanctionStatus.SANCTION_STATUS_EXPIRED,
      REVOKED: ProtoSanctionStatus.SANCTION_STATUS_REVOKED,
      APPEALED: ProtoSanctionStatus.SANCTION_STATUS_APPEALED,
    };
    return statusMap[statusValue] ?? ProtoSanctionStatus.SANCTION_STATUS_UNSPECIFIED;
  }

  /**
   * Map permission row to proto Permission
   */
  private mapPermission(row: PermissionRow): Permission {
    return {
      id: row.id,
      resource: row.resource,
      action: row.action,
      category: row.category ?? '',
      description: row.description ?? '',
      isSystem: row.isSystem,
    };
  }

  /**
   * Map role row to proto Role
   */
  private mapRole(row: RoleRow, permissions: Permission[] = []): Role {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      level: row.level,
      scope: this.mapRoleScope(row.scope),
      permissions,
      createdAt: this.toTimestamp(row.createdAt),
      updatedAt: this.toTimestamp(row.updatedAt),
    };
  }

  /**
   * Map operator row to proto Operator
   */
  private mapOperator(row: OperatorRow, role?: Role): Operator {
    return {
      id: row.id,
      accountId: row.accountId ?? '',
      email: row.email,
      displayName: row.name ?? '',
      status: this.mapOperatorStatus(row.isActive),
      roleId: row.roleId ?? '',
      role,
      createdAt: this.toTimestamp(row.createdAt),
      updatedAt: this.toTimestamp(row.updatedAt),
      lastLoginAt: this.toTimestamp(row.lastLoginAt),
    };
  }

  /**
   * Map sanction row to proto Sanction
   */
  private mapSanction(row: SanctionRow): Sanction {
    return {
      id: row.id,
      subjectId: row.subjectId,
      subjectType: this.mapSubjectType(row.subjectType),
      type: this.mapSanctionType(row.type),
      severity: this.mapSanctionSeverity(row.severity),
      reason: row.reason,
      evidence: row.evidenceUrls?.join(',') ?? '',
      issuedBy: row.issuedBy,
      issuedAt: this.toTimestamp(row.startAt),
      expiresAt: this.toTimestamp(row.endAt),
      status: this.mapSanctionStatus(row.status),
    };
  }

  // ============================================================
  // Permission Operations
  // ============================================================

  @GrpcMethod('AuthService', 'CheckPermission')
  async checkPermission(request: CheckPermissionRequest): Promise<CheckPermissionResponse> {
    this.logger.debug(
      `CheckPermission: operator=${request.operatorId}, resource=${request.resource}, action=${request.action}`,
    );

    try {
      // Check if operator exists and is active
      const operators = await this.prisma.$queryRaw<OperatorRow[]>`
        SELECT id, is_active as "isActive"
        FROM operators
        WHERE id = ${request.operatorId}::uuid
        LIMIT 1
      `;

      if (!operators.length) {
        return {
          allowed: false,
          reason: 'Operator not found',
          matchedPermissions: [],
        };
      }

      if (!operators[0].isActive) {
        return {
          allowed: false,
          reason: 'Operator is not active',
          matchedPermissions: [],
        };
      }

      // Check direct permissions
      const directPermissions = await this.prisma.$queryRaw<
        { id: string; resource: string; action: string }[]
      >`
        SELECT p.id, p.resource, p.action
        FROM operator_permissions op
        JOIN permissions p ON op.permission_id = p.id
        WHERE op.operator_id = ${request.operatorId}::uuid
          AND p.resource = ${request.resource}
          AND p.action = ${request.action}
      `;

      if (directPermissions.length > 0) {
        return {
          allowed: true,
          reason: 'Permission granted via direct assignment',
          matchedPermissions: directPermissions.map((p) => p.id),
        };
      }

      // Check role permissions (through operator's role)
      const rolePermissions = await this.prisma.$queryRaw<
        { id: string; resource: string; action: string }[]
      >`
        SELECT p.id, p.resource, p.action
        FROM operators o
        JOIN roles r ON o.role_id = r.id
        JOIN role_permissions rp ON r.id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE o.id = ${request.operatorId}::uuid
          AND p.resource = ${request.resource}
          AND p.action = ${request.action}
      `;

      if (rolePermissions.length > 0) {
        return {
          allowed: true,
          reason: 'Permission granted via role',
          matchedPermissions: rolePermissions.map((p) => p.id),
        };
      }

      // Check wildcard permissions (resource:* or *:action or *:*)
      const wildcardPermissions = await this.prisma.$queryRaw<
        { id: string; resource: string; action: string }[]
      >`
        SELECT p.id, p.resource, p.action
        FROM operator_permissions op
        JOIN permissions p ON op.permission_id = p.id
        WHERE op.operator_id = ${request.operatorId}::uuid
          AND (
            (p.resource = ${request.resource} AND p.action = '*')
            OR (p.resource = '*' AND p.action = ${request.action})
            OR (p.resource = '*' AND p.action = '*')
          )
        UNION
        SELECT p.id, p.resource, p.action
        FROM operators o
        JOIN roles r ON o.role_id = r.id
        JOIN role_permissions rp ON r.id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE o.id = ${request.operatorId}::uuid
          AND (
            (p.resource = ${request.resource} AND p.action = '*')
            OR (p.resource = '*' AND p.action = ${request.action})
            OR (p.resource = '*' AND p.action = '*')
          )
      `;

      if (wildcardPermissions.length > 0) {
        return {
          allowed: true,
          reason: 'Permission granted via wildcard',
          matchedPermissions: wildcardPermissions.map((p) => p.id),
        };
      }

      return {
        allowed: false,
        reason: 'Permission not found',
        matchedPermissions: [],
      };
    } catch (error) {
      this.logger.error(`CheckPermission failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal error checking permission',
      });
    }
  }

  @GrpcMethod('AuthService', 'CheckPermissions')
  async checkPermissions(request: CheckPermissionsRequest): Promise<CheckPermissionsResponse> {
    this.logger.debug(
      `CheckPermissions: operator=${request.operatorId}, checks=${request.checks?.length ?? 0}`,
    );

    try {
      const results: PermissionCheckResult[] = [];
      let allAllowed = true;

      for (const check of request.checks ?? []) {
        const result = await this.checkPermission({
          operatorId: request.operatorId,
          resource: check.resource,
          action: check.action,
        });

        results.push({
          resource: check.resource,
          action: check.action,
          allowed: result.allowed,
          reason: result.reason,
        });

        if (!result.allowed) {
          allAllowed = false;
        }
      }

      return {
        allAllowed,
        results,
      };
    } catch (error) {
      this.logger.error(`CheckPermissions failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal error checking permissions',
      });
    }
  }

  @GrpcMethod('AuthService', 'GetOperatorPermissions')
  async getOperatorPermissions(
    request: GetOperatorPermissionsRequest,
  ): Promise<GetOperatorPermissionsResponse> {
    this.logger.debug(
      `GetOperatorPermissions: operator=${request.operatorId}, includeRole=${request.includeRolePermissions}`,
    );

    try {
      // Get direct permissions
      const directRows = await this.prisma.$queryRaw<PermissionRow[]>`
        SELECT p.id, p.resource, p.action, p.category, p.description, p.is_system as "isSystem"
        FROM operator_permissions op
        JOIN permissions p ON op.permission_id = p.id
        WHERE op.operator_id = ${request.operatorId}::uuid
      `;

      const directPermissions = directRows.map((row) => this.mapPermission(row));

      let rolePermissions: Permission[] = [];
      if (request.includeRolePermissions) {
        // Get role permissions
        const roleRows = await this.prisma.$queryRaw<PermissionRow[]>`
          SELECT DISTINCT p.id, p.resource, p.action, p.category, p.description, p.is_system as "isSystem"
          FROM operators o
          JOIN roles r ON o.role_id = r.id
          JOIN role_permissions rp ON r.id = rp.role_id
          JOIN permissions p ON rp.permission_id = p.id
          WHERE o.id = ${request.operatorId}::uuid
        `;
        rolePermissions = roleRows.map((row) => this.mapPermission(row));
      }

      // Combine all permissions (unique by id)
      const allPermissionsMap = new Map<string, Permission>();
      for (const p of directPermissions) {
        allPermissionsMap.set(p.id, p);
      }
      for (const p of rolePermissions) {
        if (!allPermissionsMap.has(p.id)) {
          allPermissionsMap.set(p.id, p);
        }
      }

      return {
        permissions: Array.from(allPermissionsMap.values()),
        directPermissions,
        rolePermissions,
      };
    } catch (error) {
      this.logger.error(`GetOperatorPermissions failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal error getting operator permissions',
      });
    }
  }

  // ============================================================
  // Role Operations
  // ============================================================

  @GrpcMethod('AuthService', 'GetRole')
  async getRole(request: GetRoleRequest): Promise<GetRoleResponse> {
    this.logger.debug(`GetRole: id=${request.id}`);

    try {
      const roles = await this.prisma.$queryRaw<RoleRow[]>`
        SELECT id, name, description, level, scope, created_at as "createdAt", updated_at as "updatedAt"
        FROM roles
        WHERE id = ${request.id}::uuid
        LIMIT 1
      `;

      if (!roles.length) {
        throw new RpcException({
          code: status.NOT_FOUND,
          message: `Role not found: ${request.id}`,
        });
      }

      // Get role permissions
      const permissionRows = await this.prisma.$queryRaw<PermissionRow[]>`
        SELECT p.id, p.resource, p.action, p.category, p.description, p.is_system as "isSystem"
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = ${request.id}::uuid
      `;

      const permissions = permissionRows.map((row) => this.mapPermission(row));

      return {
        role: this.mapRole(roles[0], permissions),
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.error(`GetRole failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal error getting role',
      });
    }
  }

  @GrpcMethod('AuthService', 'GetRolesByOperator')
  async getRolesByOperator(
    request: GetRolesByOperatorRequest,
  ): Promise<GetRolesByOperatorResponse> {
    this.logger.debug(`GetRolesByOperator: operator=${request.operatorId}`);

    try {
      // Get the operator's assigned role (operators have a single role_id)
      const roleRows = await this.prisma.$queryRaw<RoleRow[]>`
        SELECT r.id, r.name, r.description, r.level, r.scope, r.created_at as "createdAt", r.updated_at as "updatedAt"
        FROM operators o
        JOIN roles r ON o.role_id = r.id
        WHERE o.id = ${request.operatorId}::uuid
      `;

      if (!roleRows.length) {
        return { roles: [] };
      }

      // Get permissions for each role
      const roles: Role[] = [];
      for (const roleRow of roleRows) {
        const permissionRows = await this.prisma.$queryRaw<PermissionRow[]>`
          SELECT p.id, p.resource, p.action, p.category, p.description, p.is_system as "isSystem"
          FROM role_permissions rp
          JOIN permissions p ON rp.permission_id = p.id
          WHERE rp.role_id = ${roleRow.id}::uuid
        `;
        const permissions = permissionRows.map((row) => this.mapPermission(row));
        roles.push(this.mapRole(roleRow, permissions));
      }

      return { roles };
    } catch (error) {
      this.logger.error(`GetRolesByOperator failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal error getting roles by operator',
      });
    }
  }

  // ============================================================
  // Operator Operations
  // ============================================================

  @GrpcMethod('AuthService', 'GetOperator')
  async getOperator(request: GetOperatorRequest): Promise<GetOperatorResponse> {
    this.logger.debug(`GetOperator: id=${request.id}`);

    try {
      const operators = await this.prisma.$queryRaw<OperatorRow[]>`
        SELECT
          o.id,
          o.account_id as "accountId",
          o.email,
          o.name,
          o.is_active as "isActive",
          o.role_id as "roleId",
          o.created_at as "createdAt",
          o.updated_at as "updatedAt",
          o.last_login_at as "lastLoginAt"
        FROM operators o
        WHERE o.id = ${request.id}::uuid
        LIMIT 1
      `;

      if (!operators.length) {
        throw new RpcException({
          code: status.NOT_FOUND,
          message: `Operator not found: ${request.id}`,
        });
      }

      const operatorRow = operators[0];
      let role: Role | undefined;

      // Get the operator's role if assigned
      if (operatorRow.roleId) {
        const roleResponse = await this.getRole({ id: operatorRow.roleId });
        role = roleResponse.role;
      }

      return {
        operator: this.mapOperator(operatorRow, role),
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.error(`GetOperator failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal error getting operator',
      });
    }
  }

  @GrpcMethod('AuthService', 'ValidateOperator')
  async validateOperator(request: ValidateOperatorRequest): Promise<ValidateOperatorResponse> {
    this.logger.debug(`ValidateOperator: id=${request.id}`);

    try {
      const operators = await this.prisma.$queryRaw<{ id: string; isActive: boolean }[]>`
        SELECT id, is_active as "isActive"
        FROM operators
        WHERE id = ${request.id}::uuid
        LIMIT 1
      `;

      if (!operators.length) {
        return {
          valid: false,
          status: ProtoOperatorStatus.OPERATOR_STATUS_UNSPECIFIED,
          message: 'Operator not found',
        };
      }

      const operator = operators[0];
      const protoStatus = this.mapOperatorStatus(operator.isActive);

      if (!operator.isActive) {
        return {
          valid: false,
          status: protoStatus,
          message: 'Operator is not active',
        };
      }

      return {
        valid: true,
        status: protoStatus,
        message: 'Operator is valid and active',
      };
    } catch (error) {
      this.logger.error(`ValidateOperator failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal error validating operator',
      });
    }
  }

  // ============================================================
  // Sanction Operations
  // ============================================================

  @GrpcMethod('AuthService', 'CheckSanction')
  async checkSanction(request: CheckSanctionRequest): Promise<CheckSanctionResponse> {
    this.logger.debug(`CheckSanction: subject=${request.subjectId}, type=${request.subjectType}`);

    try {
      const subjectType = this.protoSubjectTypeToDb(request.subjectType);
      const sanctionType =
        request.sanctionType !== undefined
          ? this.protoSanctionTypeToDb(request.sanctionType)
          : undefined;

      // Query active sanctions for the subject
      let sanctions: SanctionRow[];

      if (sanctionType) {
        sanctions = await this.prisma.$queryRaw<SanctionRow[]>(
          Prisma.sql`
            SELECT
              id, subject_id as "subjectId", subject_type as "subjectType",
              type, severity, reason, evidence_urls as "evidenceUrls",
              issued_by as "issuedBy", start_at as "startAt", end_at as "endAt", status
            FROM sanctions
            WHERE subject_id = ${request.subjectId}::uuid
              AND subject_type = ${subjectType}::sanction_subject_type
              AND status = 'ACTIVE'::sanction_status
              AND type = ${sanctionType}::sanction_type
              AND (end_at IS NULL OR end_at > NOW())
            ORDER BY severity DESC, start_at DESC
          `,
        );
      } else {
        sanctions = await this.prisma.$queryRaw<SanctionRow[]>(
          Prisma.sql`
            SELECT
              id, subject_id as "subjectId", subject_type as "subjectType",
              type, severity, reason, evidence_urls as "evidenceUrls",
              issued_by as "issuedBy", start_at as "startAt", end_at as "endAt", status
            FROM sanctions
            WHERE subject_id = ${request.subjectId}::uuid
              AND subject_type = ${subjectType}::sanction_subject_type
              AND status = 'ACTIVE'::sanction_status
              AND (end_at IS NULL OR end_at > NOW())
            ORDER BY severity DESC, start_at DESC
          `,
        );
      }

      const isSanctioned = sanctions.length > 0;
      const activeSanctions = sanctions.map((row) => this.mapSanction(row));

      // Find highest severity
      let highestSeverity = ProtoSanctionSeverity.SANCTION_SEVERITY_UNSPECIFIED;
      for (const sanction of activeSanctions) {
        if (sanction.severity > highestSeverity) {
          highestSeverity = sanction.severity;
        }
      }

      return {
        isSanctioned,
        activeSanctions,
        highestSeverity,
      };
    } catch (error) {
      this.logger.error(`CheckSanction failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal error checking sanction',
      });
    }
  }

  @GrpcMethod('AuthService', 'GetActiveSanctions')
  async getActiveSanctions(
    request: GetActiveSanctionsRequest,
  ): Promise<GetActiveSanctionsResponse> {
    this.logger.debug(
      `GetActiveSanctions: subject=${request.subjectId}, type=${request.subjectType}`,
    );

    try {
      const subjectType = this.protoSubjectTypeToDb(request.subjectType);

      const sanctions = await this.prisma.$queryRaw<SanctionRow[]>(
        Prisma.sql`
          SELECT
            id, subject_id as "subjectId", subject_type as "subjectType",
            type, severity, reason, evidence_urls as "evidenceUrls",
            issued_by as "issuedBy", start_at as "startAt", end_at as "endAt", status
          FROM sanctions
          WHERE subject_id = ${request.subjectId}::uuid
            AND subject_type = ${subjectType}::sanction_subject_type
            AND status = 'ACTIVE'::sanction_status
            AND (end_at IS NULL OR end_at > NOW())
          ORDER BY severity DESC, start_at DESC
        `,
      );

      return {
        sanctions: sanctions.map((row) => this.mapSanction(row)),
        totalCount: sanctions.length,
      };
    } catch (error) {
      this.logger.error(`GetActiveSanctions failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal error getting active sanctions',
      });
    }
  }
}
