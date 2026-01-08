import { Controller, Logger, Inject } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as bcrypt from 'bcrypt';
import { Prisma } from '../../node_modules/.prisma/auth-client';
import { PrismaService } from '../database/prisma.service';
import { ID } from '@my-girok/nest-common';
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
import { AdminSessionService } from '../admin/services/admin-session.service';
import { AdminMfaService } from '../admin/services/admin-mfa.service';
import { AdminPasswordService } from '../admin/services/admin-password.service';
import { OperatorAssignmentService } from '../admin/services/operator-assignment.service';
import { OutboxService } from '../common/outbox/outbox.service';

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

// MFA Challenge TTL (5 minutes)
const MFA_CHALLENGE_TTL_SECONDS = 300;
const MFA_CHALLENGE_MAX_ATTEMPTS = 3;

// Proto MfaMethod enum values
const ProtoMfaMethod = {
  UNSPECIFIED: 0,
  TOTP: 1,
  BACKUP_CODE: 2,
} as const;

// Proto OperatorAssignmentStatus enum values
const ProtoOperatorAssignmentStatus = {
  UNSPECIFIED: 0,
  ACTIVE: 1,
  SUSPENDED: 2,
  REVOKED: 3,
} as const;

// MFA Challenge stored in cache
interface MfaChallenge {
  adminId: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
  createdAt: string;
  attempts: number;
}

@Controller()
export class AuthGrpcController {
  private readonly logger = new Logger(AuthGrpcController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adminSessionService: AdminSessionService,
    private readonly adminMfaService: AdminMfaService,
    private readonly adminPasswordService: AdminPasswordService,
    private readonly operatorAssignmentService: OperatorAssignmentService,
    private readonly outboxService: OutboxService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

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

  // ============================================================
  // Admin Authentication Operations
  // ============================================================

  @GrpcMethod('AuthService', 'AdminLogin')
  async adminLogin(request: {
    email: string;
    password: string;
    ipAddress: string;
    userAgent: string;
    deviceFingerprint?: string;
  }): Promise<{
    success: boolean;
    mfaRequired: boolean;
    challengeId?: string;
    availableMethods: number[];
    message: string;
    admin?: unknown;
    session?: unknown;
    accessToken?: string;
    refreshToken?: string;
  }> {
    // TODO: Add rate limiting - limit to 5 attempts per IP per 15 minutes
    // Use Redis/Valkey to track: `rate:login:${request.ipAddress}`

    this.logger.debug(`AdminLogin: email=${request.email.replace(/(.{2}).*(@.*)/, '$1***$2')}`);

    // Input validation
    if (!request.email || !this.isValidEmail(request.email)) {
      return {
        success: false,
        mfaRequired: false,
        availableMethods: [],
        message: 'Invalid email format',
      };
    }
    if (!request.password || request.password.length < 1) {
      return {
        success: false,
        mfaRequired: false,
        availableMethods: [],
        message: 'Password is required',
      };
    }

    try {
      // Find admin by email
      const admins = await this.prisma.$queryRaw<
        {
          id: string;
          email: string;
          password: string;
          name: string;
          scope: string;
          roleId: string;
          isActive: boolean;
          mfaRequired: boolean;
          forcePasswordChange: boolean;
          failedLoginAttempts: number;
          lockedUntil: Date | null;
        }[]
      >`
        SELECT id, email, password, name, scope,
               role_id as "roleId", is_active as "isActive",
               mfa_required as "mfaRequired",
               force_password_change as "forcePasswordChange",
               failed_login_attempts as "failedLoginAttempts",
               locked_until as "lockedUntil"
        FROM admins
        WHERE email = ${request.email} AND deleted_at IS NULL
        LIMIT 1
      `;

      const admin = admins[0];

      // Record login attempt
      const recordAttempt = async (success: boolean, reason?: string, mfaAttempted = false) => {
        const attemptId = ID.generate();
        await this.prisma.$executeRaw`
          INSERT INTO admin_login_attempts (
            id, email, admin_id, ip_address, user_agent, device_fingerprint,
            success, failure_reason, mfa_attempted, attempted_at
          ) VALUES (
            ${attemptId}::uuid, ${request.email}, ${admin?.id ?? null}::uuid,
            ${request.ipAddress}, ${request.userAgent}, ${request.deviceFingerprint ?? null},
            ${success}, ${reason}::admin_login_failure_reason, ${mfaAttempted}, NOW()
          )
        `;
      };

      if (!admin) {
        await recordAttempt(false, 'INVALID_PASSWORD');
        return {
          success: false,
          mfaRequired: false,
          availableMethods: [],
          message: 'Invalid credentials',
        };
      }

      // Check if account is locked
      if (admin.lockedUntil && new Date(admin.lockedUntil) > new Date()) {
        await recordAttempt(false, 'ACCOUNT_LOCKED');
        return {
          success: false,
          mfaRequired: false,
          availableMethods: [],
          message: `Account locked until ${admin.lockedUntil.toISOString()}`,
        };
      }

      if (!admin.isActive) {
        await recordAttempt(false, 'ACCOUNT_DISABLED');
        return {
          success: false,
          mfaRequired: false,
          availableMethods: [],
          message: 'Account is disabled',
        };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(request.password, admin.password);
      if (!isPasswordValid) {
        // Increment failed attempts
        const newAttempts = admin.failedLoginAttempts + 1;
        const lockUntil = newAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null; // 15 min lock

        await this.prisma.$executeRaw`
          UPDATE admins
          SET failed_login_attempts = ${newAttempts},
              locked_until = ${lockUntil}
          WHERE id = ${admin.id}::uuid
        `;

        await recordAttempt(false, 'INVALID_PASSWORD');
        return {
          success: false,
          mfaRequired: false,
          availableMethods: [],
          message: 'Invalid credentials',
        };
      }

      // Reset failed attempts on successful password
      if (admin.failedLoginAttempts > 0) {
        await this.prisma.$executeRaw`
          UPDATE admins SET failed_login_attempts = 0, locked_until = NULL
          WHERE id = ${admin.id}::uuid
        `;
      }

      // Check if MFA is required
      const mfaEnabled = await this.adminMfaService.isMfaEnabled(admin.id);

      if (mfaEnabled) {
        // Generate MFA challenge
        const challengeId = ID.generate();
        const challenge: MfaChallenge = {
          adminId: admin.id,
          email: admin.email,
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
          deviceFingerprint: request.deviceFingerprint,
          createdAt: new Date().toISOString(),
          attempts: 0,
        };

        await this.cache.set(
          `admin:mfa:challenge:${challengeId}`,
          JSON.stringify(challenge),
          MFA_CHALLENGE_TTL_SECONDS * 1000,
        );

        const availableMethods = await this.adminMfaService.getAvailableMethods(admin.id);
        const protoMethods = availableMethods.map((m) =>
          m === 'TOTP' ? ProtoMfaMethod.TOTP : ProtoMfaMethod.BACKUP_CODE,
        );

        await recordAttempt(false, 'MFA_REQUIRED', false);

        return {
          success: true,
          mfaRequired: true,
          challengeId,
          availableMethods: protoMethods,
          message: 'MFA verification required',
        };
      }

      // No MFA - create session directly
      const sessionResult = await this.adminSessionService.createSession(
        admin.id,
        {
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
          deviceFingerprint: request.deviceFingerprint,
        },
        false, // mfaVerified
      );

      // Update last login
      await this.prisma.$executeRaw`
        UPDATE admins SET last_login_at = NOW() WHERE id = ${admin.id}::uuid
      `;

      await recordAttempt(true);

      await this.outboxService.addEventDirect('ADMIN_LOGIN_SUCCESS', admin.id, {
        adminId: admin.id,
        sessionId: sessionResult.sessionId,
        ipAddress: request.ipAddress,
        mfaUsed: false,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        mfaRequired: false,
        availableMethods: [],
        message: 'Login successful',
        accessToken: sessionResult.accessToken,
        refreshToken: sessionResult.refreshToken,
      };
    } catch (error) {
      this.logger.error(`AdminLogin failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal error during login',
      });
    }
  }

  @GrpcMethod('AuthService', 'AdminLoginMfa')
  async adminLoginMfa(request: {
    challengeId: string;
    code: string;
    method: number;
    ipAddress: string;
    userAgent: string;
    deviceFingerprint?: string;
  }): Promise<{
    success: boolean;
    message: string;
    admin?: unknown;
    session?: unknown;
    accessToken?: string;
    refreshToken?: string;
  }> {
    this.logger.debug(`AdminLoginMfa: challengeId=${request.challengeId}`);

    // Input validation
    if (!request.challengeId || !this.isValidUuid(request.challengeId)) {
      return { success: false, message: 'Invalid challenge ID' };
    }
    if (!request.code || request.code.length < 6) {
      return { success: false, message: 'Invalid MFA code' };
    }

    try {
      // Get challenge from cache
      const challengeData = await this.cache.get<string>(
        `admin:mfa:challenge:${request.challengeId}`,
      );
      if (!challengeData) {
        return { success: false, message: 'Challenge expired or invalid' };
      }

      const challenge: MfaChallenge = JSON.parse(challengeData);

      // Verify IP matches (security)
      if (challenge.ipAddress !== request.ipAddress) {
        this.logger.warn(
          `MFA challenge IP mismatch: expected=${challenge.ipAddress}, got=${request.ipAddress}`,
        );
        await this.cache.del(`admin:mfa:challenge:${request.challengeId}`);
        return { success: false, message: 'Security verification failed' };
      }

      // Check attempt limit
      if (challenge.attempts >= MFA_CHALLENGE_MAX_ATTEMPTS) {
        await this.cache.del(`admin:mfa:challenge:${request.challengeId}`);
        return { success: false, message: 'Too many attempts' };
      }

      // Update attempt count
      challenge.attempts++;
      await this.cache.set(
        `admin:mfa:challenge:${request.challengeId}`,
        JSON.stringify(challenge),
        MFA_CHALLENGE_TTL_SECONDS * 1000,
      );

      // Verify MFA code
      let isValid = false;
      const methodName = request.method === ProtoMfaMethod.TOTP ? 'TOTP' : 'BACKUP_CODE';

      if (request.method === ProtoMfaMethod.TOTP) {
        isValid = await this.adminMfaService.verifyTotpCode(challenge.adminId, request.code);
      } else if (request.method === ProtoMfaMethod.BACKUP_CODE) {
        isValid = await this.adminMfaService.verifyBackupCode(challenge.adminId, request.code);
      }

      if (!isValid) {
        // Record failed MFA attempt
        const attemptId = ID.generate();
        await this.prisma.$executeRaw`
          INSERT INTO admin_login_attempts (
            id, email, admin_id, ip_address, user_agent, device_fingerprint,
            success, failure_reason, mfa_attempted, mfa_method, attempted_at
          ) VALUES (
            ${attemptId}::uuid, ${challenge.email}, ${challenge.adminId}::uuid,
            ${request.ipAddress}, ${request.userAgent}, ${request.deviceFingerprint ?? null},
            false, 'INVALID_MFA_CODE'::admin_login_failure_reason, true, ${methodName}, NOW()
          )
        `;

        return { success: false, message: 'Invalid MFA code' };
      }

      // Delete challenge
      await this.cache.del(`admin:mfa:challenge:${request.challengeId}`);

      // Create session with MFA verified
      const sessionResult = await this.adminSessionService.createSession(
        challenge.adminId,
        {
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
          deviceFingerprint: request.deviceFingerprint,
        },
        true, // mfaVerified
        methodName,
      );

      // Update last login
      await this.prisma.$executeRaw`
        UPDATE admins SET last_login_at = NOW() WHERE id = ${challenge.adminId}::uuid
      `;

      // Record successful login
      const attemptId = ID.generate();
      await this.prisma.$executeRaw`
        INSERT INTO admin_login_attempts (
          id, email, admin_id, ip_address, user_agent, device_fingerprint,
          success, mfa_attempted, mfa_method, attempted_at
        ) VALUES (
          ${attemptId}::uuid, ${challenge.email}, ${challenge.adminId}::uuid,
          ${request.ipAddress}, ${request.userAgent}, ${request.deviceFingerprint ?? null},
          true, true, ${methodName}, NOW()
        )
      `;

      await this.outboxService.addEventDirect('ADMIN_LOGIN_SUCCESS', challenge.adminId, {
        adminId: challenge.adminId,
        sessionId: sessionResult.sessionId,
        ipAddress: request.ipAddress,
        mfaUsed: true,
        mfaMethod: methodName,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        message: 'Login successful',
        accessToken: sessionResult.accessToken,
        refreshToken: sessionResult.refreshToken,
      };
    } catch (error) {
      this.logger.error(`AdminLoginMfa failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal error during MFA verification',
      });
    }
  }

  // ============================================================
  // Admin Session Operations
  // ============================================================

  @GrpcMethod('AuthService', 'AdminValidateSession')
  async adminValidateSession(request: { tokenHash: string }): Promise<{
    valid: boolean;
    adminId?: string;
    sessionId?: string;
    mfaVerified?: boolean;
    expiresAt?: { seconds: number; nanos: number };
    message: string;
  }> {
    this.logger.debug('AdminValidateSession');

    try {
      const result = await this.adminSessionService.validateSession(request.tokenHash);

      return {
        valid: result.valid,
        adminId: result.adminId,
        sessionId: result.sessionId,
        mfaVerified: result.mfaVerified,
        expiresAt: result.expiresAt ? toProtoTimestamp(result.expiresAt) : undefined,
        message: result.message,
      };
    } catch (error) {
      this.logger.error(`AdminValidateSession failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal error validating session',
      });
    }
  }

  @GrpcMethod('AuthService', 'AdminRefreshSession')
  async adminRefreshSession(request: { refreshTokenHash: string }): Promise<{
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: { seconds: number; nanos: number };
    message: string;
  }> {
    this.logger.debug('AdminRefreshSession');

    try {
      const result = await this.adminSessionService.refreshSession(request.refreshTokenHash);

      return {
        success: result.success,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt: result.expiresAt ? toProtoTimestamp(result.expiresAt) : undefined,
        message: result.message,
      };
    } catch (error) {
      this.logger.error(`AdminRefreshSession failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal error refreshing session',
      });
    }
  }

  @GrpcMethod('AuthService', 'AdminLogout')
  async adminLogout(request: { sessionId: string }): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.debug(`AdminLogout: sessionId=${request.sessionId}`);

    try {
      const success = await this.adminSessionService.logout(request.sessionId);

      if (success) {
        await this.outboxService.addEventDirect('ADMIN_LOGOUT', request.sessionId, {
          sessionId: request.sessionId,
          timestamp: new Date().toISOString(),
        });
      }

      return {
        success,
        message: success ? 'Logged out successfully' : 'Session not found',
      };
    } catch (error) {
      this.logger.error(`AdminLogout failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal error during logout',
      });
    }
  }

  @GrpcMethod('AuthService', 'AdminRevokeAllSessions')
  async adminRevokeAllSessions(request: {
    adminId: string;
    excludeSessionId?: string;
    reason: string;
  }): Promise<{
    success: boolean;
    revokedCount: number;
    message: string;
  }> {
    this.logger.debug(`AdminRevokeAllSessions: adminId=${request.adminId}`);

    try {
      const revokedCount = await this.adminSessionService.revokeAllSessions(
        request.adminId,
        request.excludeSessionId,
        request.reason,
      );

      return {
        success: true,
        revokedCount,
        message: `Revoked ${revokedCount} sessions`,
      };
    } catch (error) {
      this.logger.error(`AdminRevokeAllSessions failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal error revoking sessions',
      });
    }
  }

  @GrpcMethod('AuthService', 'AdminGetActiveSessions')
  async adminGetActiveSessions(request: { adminId: string }): Promise<{
    sessions: unknown[];
    totalCount: number;
  }> {
    this.logger.debug(`AdminGetActiveSessions: adminId=${request.adminId}`);

    try {
      const sessions = await this.adminSessionService.getActiveSessions(request.adminId);

      const protoSessions = sessions.map((s) => ({
        id: s.id,
        adminId: s.adminId,
        mfaVerified: s.mfaVerified,
        mfaMethod: s.mfaMethod ?? '',
        ipAddress: s.ipAddress ?? '',
        userAgent: s.userAgent ?? '',
        deviceFingerprint: s.deviceFingerprint ?? '',
        isActive: s.isActive,
        mfaVerifiedAt: s.mfaVerifiedAt ? toProtoTimestamp(s.mfaVerifiedAt) : undefined,
        lastActivityAt: s.lastActivityAt ? toProtoTimestamp(s.lastActivityAt) : undefined,
        expiresAt: toProtoTimestamp(s.expiresAt),
        createdAt: toProtoTimestamp(s.createdAt),
      }));

      return {
        sessions: protoSessions,
        totalCount: sessions.length,
      };
    } catch (error) {
      this.logger.error(`AdminGetActiveSessions failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal error getting active sessions',
      });
    }
  }

  // ============================================================
  // Admin MFA Operations
  // ============================================================

  @GrpcMethod('AuthService', 'AdminSetupMfa')
  async adminSetupMfa(request: { adminId: string }): Promise<{
    success: boolean;
    secret?: string;
    qrCodeUri?: string;
    backupCodes: string[];
    message: string;
  }> {
    this.logger.debug(`AdminSetupMfa: adminId=${request.adminId}`);

    try {
      // Get admin email for QR code
      const admins = await this.prisma.$queryRaw<{ email: string }[]>`
        SELECT email FROM admins WHERE id = ${request.adminId}::uuid LIMIT 1
      `;

      if (!admins.length) {
        return { success: false, backupCodes: [], message: 'Admin not found' };
      }

      const result = await this.adminMfaService.setupMfa(request.adminId, admins[0].email);

      return {
        success: result.success,
        secret: result.secret,
        qrCodeUri: result.qrCodeUri,
        backupCodes: result.backupCodes ?? [],
        message: result.message,
      };
    } catch (error) {
      this.logger.error(`AdminSetupMfa failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal error setting up MFA',
      });
    }
  }

  @GrpcMethod('AuthService', 'AdminVerifyMfa')
  async adminVerifyMfa(request: { adminId: string; code: string }): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.debug(`AdminVerifyMfa: adminId=${request.adminId}`);

    try {
      const success = await this.adminMfaService.verifyMfaSetup(request.adminId, request.code);

      return {
        success,
        message: success ? 'MFA enabled successfully' : 'Invalid verification code',
      };
    } catch (error) {
      this.logger.error(`AdminVerifyMfa failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal error verifying MFA',
      });
    }
  }

  @GrpcMethod('AuthService', 'AdminDisableMfa')
  async adminDisableMfa(request: { adminId: string; password: string }): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.debug(`AdminDisableMfa: adminId=${request.adminId}`);

    try {
      // Verify password first
      const isPasswordValid = await this.adminPasswordService.verifyPassword(
        request.adminId,
        request.password,
      );

      if (!isPasswordValid) {
        return { success: false, message: 'Invalid password' };
      }

      const success = await this.adminMfaService.disableMfa(request.adminId);

      return {
        success,
        message: success ? 'MFA disabled' : 'MFA was not enabled',
      };
    } catch (error) {
      this.logger.error(`AdminDisableMfa failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal error disabling MFA',
      });
    }
  }

  @GrpcMethod('AuthService', 'AdminRegenerateBackupCodes')
  async adminRegenerateBackupCodes(request: { adminId: string; password: string }): Promise<{
    success: boolean;
    backupCodes: string[];
    message: string;
  }> {
    this.logger.debug(`AdminRegenerateBackupCodes: adminId=${request.adminId}`);

    try {
      // Verify password first
      const isPasswordValid = await this.adminPasswordService.verifyPassword(
        request.adminId,
        request.password,
      );

      if (!isPasswordValid) {
        return { success: false, backupCodes: [], message: 'Invalid password' };
      }

      const codes = await this.adminMfaService.regenerateBackupCodes(request.adminId);

      if (!codes) {
        return { success: false, backupCodes: [], message: 'MFA is not enabled' };
      }

      return {
        success: true,
        backupCodes: codes,
        message: 'Backup codes regenerated',
      };
    } catch (error) {
      this.logger.error(`AdminRegenerateBackupCodes failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal error regenerating backup codes',
      });
    }
  }

  // ============================================================
  // Admin Password Operations
  // ============================================================

  @GrpcMethod('AuthService', 'AdminChangePassword')
  async adminChangePassword(request: {
    adminId: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.debug(`AdminChangePassword: adminId=${request.adminId}`);

    try {
      const result = await this.adminPasswordService.changePassword(
        request.adminId,
        request.currentPassword,
        request.newPassword,
      );

      return result;
    } catch (error) {
      this.logger.error(`AdminChangePassword failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal error changing password',
      });
    }
  }

  @GrpcMethod('AuthService', 'AdminForcePasswordChange')
  async adminForcePasswordChange(request: { adminId: string; requesterAdminId: string }): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.debug(`AdminForcePasswordChange: adminId=${request.adminId}`);

    try {
      const result = await this.adminPasswordService.forcePasswordChange(
        request.adminId,
        request.requesterAdminId,
      );

      return result;
    } catch (error) {
      this.logger.error(`AdminForcePasswordChange failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal error forcing password change',
      });
    }
  }

  // ============================================================
  // Operator Assignment Operations
  // ============================================================

  @GrpcMethod('AuthService', 'AssignOperator')
  async assignOperator(request: {
    accountId: string;
    serviceId: string;
    countryCode: string;
    assignedBy: string;
    permissionIds: string[];
  }): Promise<{
    success: boolean;
    assignment?: unknown;
    message: string;
  }> {
    this.logger.debug(
      `AssignOperator: accountId=${request.accountId}, serviceId=${request.serviceId}`,
    );

    try {
      const result = await this.operatorAssignmentService.assignOperator(
        request.accountId,
        request.serviceId,
        request.countryCode,
        request.assignedBy,
        request.permissionIds ?? [],
      );

      return {
        success: result.success,
        assignment: result.assignment ? this.mapOperatorAssignment(result.assignment) : undefined,
        message: result.message,
      };
    } catch (error) {
      this.logger.error(`AssignOperator failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal error assigning operator',
      });
    }
  }

  @GrpcMethod('AuthService', 'RevokeOperatorAssignment')
  async revokeOperatorAssignment(request: {
    assignmentId: string;
    revokedBy: string;
    reason: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.debug(`RevokeOperatorAssignment: assignmentId=${request.assignmentId}`);

    try {
      const result = await this.operatorAssignmentService.revokeAssignment(
        request.assignmentId,
        request.revokedBy,
        request.reason,
      );

      return result;
    } catch (error) {
      this.logger.error(`RevokeOperatorAssignment failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal error revoking assignment',
      });
    }
  }

  @GrpcMethod('AuthService', 'GetOperatorAssignment')
  async getOperatorAssignment(request: {
    accountId: string;
    serviceId: string;
    countryCode: string;
  }): Promise<{
    assignment?: unknown;
    found: boolean;
  }> {
    this.logger.debug(`GetOperatorAssignment: accountId=${request.accountId}`);

    try {
      const assignment = await this.operatorAssignmentService.getAssignment(
        request.accountId,
        request.serviceId,
        request.countryCode,
      );

      return {
        assignment: assignment ? this.mapOperatorAssignment(assignment) : undefined,
        found: !!assignment,
      };
    } catch (error) {
      this.logger.error(`GetOperatorAssignment failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal error getting assignment',
      });
    }
  }

  @GrpcMethod('AuthService', 'GetServiceOperatorAssignments')
  async getServiceOperatorAssignments(request: {
    serviceId: string;
    countryCode?: string;
    status?: number;
    page?: number;
    pageSize?: number;
  }): Promise<{
    assignments: unknown[];
    totalCount: number;
    page: number;
    pageSize: number;
  }> {
    this.logger.debug(`GetServiceOperatorAssignments: serviceId=${request.serviceId}`);

    try {
      const statusMap: Record<number, 'ACTIVE' | 'SUSPENDED' | 'REVOKED'> = {
        [ProtoOperatorAssignmentStatus.ACTIVE]: 'ACTIVE',
        [ProtoOperatorAssignmentStatus.SUSPENDED]: 'SUSPENDED',
        [ProtoOperatorAssignmentStatus.REVOKED]: 'REVOKED',
      };

      const result = await this.operatorAssignmentService.getServiceAssignments(request.serviceId, {
        countryCode: request.countryCode,
        status: request.status ? statusMap[request.status] : undefined,
        page: request.page ?? 1,
        pageSize: request.pageSize ?? 20,
      });

      return {
        assignments: result.assignments.map((a) => this.mapOperatorAssignment(a)),
        totalCount: result.totalCount,
        page: result.page,
        pageSize: result.pageSize,
      };
    } catch (error) {
      this.logger.error(`GetServiceOperatorAssignments failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal error getting assignments',
      });
    }
  }

  @GrpcMethod('AuthService', 'UpdateOperatorAssignmentPermissions')
  async updateOperatorAssignmentPermissions(request: {
    assignmentId: string;
    permissionIds: string[];
    updatedBy: string;
  }): Promise<{
    success: boolean;
    assignment?: unknown;
    message: string;
  }> {
    this.logger.debug(`UpdateOperatorAssignmentPermissions: assignmentId=${request.assignmentId}`);

    try {
      const result = await this.operatorAssignmentService.updatePermissions(
        request.assignmentId,
        request.permissionIds ?? [],
        request.updatedBy,
      );

      return {
        success: result.success,
        assignment: result.assignment ? this.mapOperatorAssignment(result.assignment) : undefined,
        message: result.message,
      };
    } catch (error) {
      this.logger.error(`UpdateOperatorAssignmentPermissions failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal error updating permissions',
      });
    }
  }

  @GrpcMethod('AuthService', 'GetOperatorAssignmentPermissions')
  async getOperatorAssignmentPermissions(request: { assignmentId: string }): Promise<{
    permissions: Permission[];
  }> {
    this.logger.debug(`GetOperatorAssignmentPermissions: assignmentId=${request.assignmentId}`);

    try {
      const permissions = await this.operatorAssignmentService.getPermissions(request.assignmentId);

      return {
        permissions: permissions.map((p) => ({
          id: p.id,
          resource: p.resource,
          action: p.action,
          category: p.category ?? '',
          description: p.description ?? '',
          isSystem: p.isSystem,
        })),
      };
    } catch (error) {
      this.logger.error(`GetOperatorAssignmentPermissions failed: ${error}`);
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal error getting permissions',
      });
    }
  }

  // ============================================================
  // Helper Methods for Admin Operations
  // ============================================================

  private mapOperatorAssignment(assignment: {
    id: string;
    accountId: string;
    serviceId: string;
    countryCode: string;
    status: string;
    assignedBy: string;
    assignedAt: Date;
    deactivatedAt: Date | null;
    deactivatedBy?: string | null;
    deactivationReason: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): unknown {
    const statusMap: Record<string, number> = {
      ACTIVE: ProtoOperatorAssignmentStatus.ACTIVE,
      SUSPENDED: ProtoOperatorAssignmentStatus.SUSPENDED,
      REVOKED: ProtoOperatorAssignmentStatus.REVOKED,
    };

    return {
      id: assignment.id,
      accountId: assignment.accountId,
      serviceId: assignment.serviceId,
      countryCode: assignment.countryCode,
      status: statusMap[assignment.status] ?? ProtoOperatorAssignmentStatus.UNSPECIFIED,
      assignedBy: assignment.assignedBy,
      assignedAt: toProtoTimestamp(assignment.assignedAt),
      deactivatedAt: assignment.deactivatedAt
        ? toProtoTimestamp(assignment.deactivatedAt)
        : undefined,
      deactivationReason: assignment.deactivationReason ?? '',
      createdAt: toProtoTimestamp(assignment.createdAt),
      updatedAt: toProtoTimestamp(assignment.updatedAt),
      permissions: [], // Permissions are fetched separately
    };
  }

  /**
   * Validate UUID format
   */
  private isValidUuid(id: string): boolean {
    if (!id) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-7][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
