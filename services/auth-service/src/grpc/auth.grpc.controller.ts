import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { Prisma } from '../../node_modules/.prisma/auth-client';
import { PrismaService } from '../database/prisma.service';
import {
  // Shared Proto enum utilities from SSOT
  toProtoTimestamp,
  OperatorStatusProto,
  isActiveToOperatorStatus,
  RoleScopeProto,
  roleScopeToProto,
  SubjectTypeProto,
  subjectTypeToProto,
  protoToSubjectType,
  SanctionTypeProto,
  sanctionTypeToProto,
  protoToSanctionType,
  SanctionSeverityProto,
  sanctionSeverityToProto,
  SanctionStatusProto,
  sanctionStatusToProto,
  dbToProtoWithFallback,
} from '@my-girok/nest-common';
import { OperatorStatus, SanctionSubjectType } from '@my-girok/types';

// Proto enum values (re-exported for local use)
const ProtoOperatorStatus = OperatorStatusProto;
const ProtoRoleScope = RoleScopeProto;
const ProtoSubjectType = SubjectTypeProto;
const ProtoSanctionType = SanctionTypeProto;
const ProtoSanctionSeverity = SanctionSeverityProto;
const ProtoSanctionStatus = SanctionStatusProto;

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
  scope: number; // Proto RoleScope numeric value
  permissions: Permission[];
  createdAt?: { seconds: number; nanos: number };
  updatedAt?: { seconds: number; nanos: number };
}

interface Operator {
  id: string;
  accountId: string;
  email: string;
  displayName: string;
  status: number; // Proto OperatorStatus numeric value
  roleId: string;
  role?: Role;
  createdAt?: { seconds: number; nanos: number };
  updatedAt?: { seconds: number; nanos: number };
  lastLoginAt?: { seconds: number; nanos: number };
}

interface Sanction {
  id: string;
  subjectId: string;
  subjectType: number; // Proto SubjectType numeric value
  type: number; // Proto SanctionType numeric value
  severity: number; // Proto SanctionSeverity numeric value
  reason: string;
  evidence: string;
  issuedBy: string;
  issuedAt?: { seconds: number; nanos: number };
  expiresAt?: { seconds: number; nanos: number };
  status: number; // Proto SanctionStatus numeric value
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
  status: number; // Proto OperatorStatus numeric value
  message: string;
}

interface CheckSanctionRequest {
  subjectId: string;
  subjectType: number; // Proto SubjectType numeric value
  sanctionType?: number; // Proto SanctionType numeric value
}

interface CheckSanctionResponse {
  isSanctioned: boolean;
  activeSanctions: Sanction[];
  highestSeverity: number; // Proto SanctionSeverity numeric value
}

interface GetActiveSanctionsRequest {
  subjectId: string;
  subjectType: number; // Proto SubjectType numeric value
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
   * Map DB operator status to proto enum
   * Uses SSOT utility from @my-girok/nest-common
   */
  private mapOperatorStatus(isActive: boolean): number {
    const status = isActiveToOperatorStatus(isActive);
    return status === OperatorStatus.ACTIVE
      ? ProtoOperatorStatus.ACTIVE
      : ProtoOperatorStatus.SUSPENDED;
  }

  /**
   * Map DB role scope to proto enum
   * Uses SSOT mapping from @my-girok/types
   */
  private mapRoleScope(scope: string): number {
    return dbToProtoWithFallback(scope, roleScopeToProto, ProtoRoleScope.UNSPECIFIED);
  }

  /**
   * Map DB subject type to proto enum
   * Uses SSOT mapping from @my-girok/types
   */
  private mapSubjectType(type: string): number {
    // Handle ADMIN -> OPERATOR mapping
    const normalizedType = type === 'ADMIN' ? SanctionSubjectType.OPERATOR : type;
    return dbToProtoWithFallback(normalizedType, subjectTypeToProto, ProtoSubjectType.UNSPECIFIED);
  }

  /**
   * Map proto subject type to DB string
   * Uses SSOT mapping from @my-girok/types
   */
  private protoSubjectTypeToDb(type: number): string {
    const appType = protoToSubjectType[type as keyof typeof protoToSubjectType];
    // Map OPERATOR back to ADMIN for DB (auth-service specific)
    return appType === SanctionSubjectType.OPERATOR ? 'ADMIN' : appType || 'USER';
  }

  /**
   * Map DB sanction type to proto enum
   * Uses SSOT mapping from @my-girok/types
   */
  private mapSanctionType(type: string): number {
    return dbToProtoWithFallback(type, sanctionTypeToProto, ProtoSanctionType.UNSPECIFIED);
  }

  /**
   * Map proto sanction type to DB string
   * Uses SSOT mapping from @my-girok/types
   */
  private protoSanctionTypeToDb(type: number): string | undefined {
    if (type === ProtoSanctionType.UNSPECIFIED) return undefined;
    return protoToSanctionType[type as keyof typeof protoToSanctionType];
  }

  /**
   * Map DB sanction severity to proto enum
   * Uses SSOT mapping from @my-girok/types
   */
  private mapSanctionSeverity(severity: string): number {
    return dbToProtoWithFallback(
      severity,
      sanctionSeverityToProto,
      ProtoSanctionSeverity.UNSPECIFIED,
    );
  }

  /**
   * Map DB sanction status to proto enum
   * Uses SSOT mapping from @my-girok/types
   */
  private mapSanctionStatus(statusValue: string): number {
    return dbToProtoWithFallback(
      statusValue,
      sanctionStatusToProto,
      ProtoSanctionStatus.UNSPECIFIED,
    );
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
      createdAt: toProtoTimestamp(row.createdAt),
      updatedAt: toProtoTimestamp(row.updatedAt),
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
      createdAt: toProtoTimestamp(row.createdAt),
      updatedAt: toProtoTimestamp(row.updatedAt),
      lastLoginAt: toProtoTimestamp(row.lastLoginAt),
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
      issuedAt: toProtoTimestamp(row.startAt),
      expiresAt: toProtoTimestamp(row.endAt),
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
      const checks = request.checks ?? [];
      if (checks.length === 0) {
        return { allAllowed: true, results: [] };
      }

      // Check if operator exists and is active (single query)
      const operators = await this.prisma.$queryRaw<{ id: string; isActive: boolean }[]>`
        SELECT id, is_active as "isActive"
        FROM operators
        WHERE id = ${request.operatorId}::uuid
        LIMIT 1
      `;

      if (!operators.length) {
        return {
          allAllowed: false,
          results: checks.map((check) => ({
            resource: check.resource,
            action: check.action,
            allowed: false,
            reason: 'Operator not found',
          })),
        };
      }

      if (!operators[0].isActive) {
        return {
          allAllowed: false,
          results: checks.map((check) => ({
            resource: check.resource,
            action: check.action,
            allowed: false,
            reason: 'Operator is not active',
          })),
        };
      }

      // Build resource/action pairs for batch query using Prisma.sql tagged template
      const resourceActionPairs = checks.map((c) => Prisma.sql`(${c.resource}, ${c.action})`);
      const resourceActionCondition = Prisma.join(resourceActionPairs, ', ');

      // Get all matching permissions in a single query (direct + role + wildcard)
      const matchedPermissions = await this.prisma.$queryRaw<
        { resource: string; action: string; permissionId: string; source: string }[]
      >`
        WITH requested_checks AS (
          SELECT * FROM (VALUES ${resourceActionCondition}) AS t(resource, action)
        ),
        all_permissions AS (
          -- Direct permissions (exact match)
          SELECT p.resource, p.action, p.id as "permissionId", 'direct' as source
          FROM operator_permissions op
          JOIN permissions p ON op.permission_id = p.id
          WHERE op.operator_id = ${request.operatorId}::uuid
            AND (p.resource, p.action) IN (SELECT resource, action FROM requested_checks)

          UNION ALL

          -- Role permissions (exact match)
          SELECT p.resource, p.action, p.id as "permissionId", 'role' as source
          FROM operators o
          JOIN roles r ON o.role_id = r.id
          JOIN role_permissions rp ON r.id = rp.role_id
          JOIN permissions p ON rp.permission_id = p.id
          WHERE o.id = ${request.operatorId}::uuid
            AND (p.resource, p.action) IN (SELECT resource, action FROM requested_checks)

          UNION ALL

          -- Wildcard permissions (direct)
          SELECT rc.resource, rc.action, p.id as "permissionId", 'wildcard' as source
          FROM requested_checks rc
          CROSS JOIN operator_permissions op
          JOIN permissions p ON op.permission_id = p.id
          WHERE op.operator_id = ${request.operatorId}::uuid
            AND (
              (p.resource = rc.resource AND p.action = '*')
              OR (p.resource = '*' AND p.action = rc.action)
              OR (p.resource = '*' AND p.action = '*')
            )

          UNION ALL

          -- Wildcard permissions (role)
          SELECT rc.resource, rc.action, p.id as "permissionId", 'wildcard' as source
          FROM requested_checks rc
          CROSS JOIN operators o
          JOIN roles r ON o.role_id = r.id
          JOIN role_permissions rp ON r.id = rp.role_id
          JOIN permissions p ON rp.permission_id = p.id
          WHERE o.id = ${request.operatorId}::uuid
            AND (
              (p.resource = rc.resource AND p.action = '*')
              OR (p.resource = '*' AND p.action = rc.action)
              OR (p.resource = '*' AND p.action = '*')
            )
        )
        SELECT DISTINCT resource, action, "permissionId", source FROM all_permissions
      `;

      // Build a map of resource:action -> permission info
      const permissionMap = new Map<string, { source: string; permissionId: string }>();
      for (const perm of matchedPermissions) {
        const key = `${perm.resource}:${perm.action}`;
        if (!permissionMap.has(key)) {
          permissionMap.set(key, { source: perm.source, permissionId: perm.permissionId });
        }
      }

      // Map results
      const results: PermissionCheckResult[] = [];
      let allAllowed = true;

      for (const check of checks) {
        const key = `${check.resource}:${check.action}`;
        const matched = permissionMap.get(key);

        if (matched) {
          const reasonMap: Record<string, string> = {
            direct: 'Permission granted via direct assignment',
            role: 'Permission granted via role',
            wildcard: 'Permission granted via wildcard',
          };
          results.push({
            resource: check.resource,
            action: check.action,
            allowed: true,
            reason: reasonMap[matched.source] ?? 'Permission granted',
          });
        } else {
          allAllowed = false;
          results.push({
            resource: check.resource,
            action: check.action,
            allowed: false,
            reason: 'Permission not found',
          });
        }
      }

      return { allAllowed, results };
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
      // Get the operator's assigned role with permissions in a single query using LEFT JOIN
      const rows = await this.prisma.$queryRaw<
        (RoleRow & {
          permissionId: string | null;
          permissionResource: string | null;
          permissionAction: string | null;
          permissionCategory: string | null;
          permissionDescription: string | null;
          permissionIsSystem: boolean | null;
        })[]
      >`
        SELECT
          r.id,
          r.name,
          r.description,
          r.level,
          r.scope,
          r.created_at as "createdAt",
          r.updated_at as "updatedAt",
          p.id as "permissionId",
          p.resource as "permissionResource",
          p.action as "permissionAction",
          p.category as "permissionCategory",
          p.description as "permissionDescription",
          p.is_system as "permissionIsSystem"
        FROM operators o
        JOIN roles r ON o.role_id = r.id
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id
        WHERE o.id = ${request.operatorId}::uuid
      `;

      if (!rows.length) {
        return { roles: [] };
      }

      // Group permissions by role (using Map for O(1) lookup)
      const roleMap = new Map<string, { role: RoleRow; permissions: Permission[] }>();

      for (const row of rows) {
        if (!roleMap.has(row.id)) {
          roleMap.set(row.id, {
            role: {
              id: row.id,
              name: row.name,
              description: row.description,
              level: row.level,
              scope: row.scope,
              createdAt: row.createdAt,
              updatedAt: row.updatedAt,
            },
            permissions: [],
          });
        }

        // Add permission if exists (LEFT JOIN may return null)
        if (row.permissionId) {
          const roleEntry = roleMap.get(row.id)!;
          roleEntry.permissions.push({
            id: row.permissionId,
            resource: row.permissionResource!,
            action: row.permissionAction!,
            category: row.permissionCategory ?? '',
            description: row.permissionDescription ?? '',
            isSystem: row.permissionIsSystem ?? false,
          });
        }
      }

      // Convert map to array of Role objects
      const roles: Role[] = Array.from(roleMap.values()).map(({ role, permissions }) =>
        this.mapRole(role, permissions),
      );

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
          status: ProtoOperatorStatus.UNSPECIFIED,
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
      let highestSeverity: number = ProtoSanctionSeverity.UNSPECIFIED;
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
