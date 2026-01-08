import { Injectable, Logger } from '@nestjs/common';
import { Transactional, ID } from '@my-girok/nest-common';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../common/outbox/outbox.service';

export interface OperatorAssignmentRow {
  id: string;
  accountId: string;
  serviceId: string;
  countryCode: string;
  status: string;
  assignedBy: string;
  assignedAt: Date;
  deactivatedAt: Date | null;
  deactivatedBy: string | null;
  deactivationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PermissionRow {
  id: string;
  resource: string;
  action: string;
  category: string | null;
  description: string | null;
  isSystem: boolean;
}

export interface AssignmentFilter {
  countryCode?: string;
  status?: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  page?: number;
  pageSize?: number;
}

export interface PaginatedAssignments {
  assignments: OperatorAssignmentRow[];
  totalCount: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class OperatorAssignmentService {
  private readonly logger = new Logger(OperatorAssignmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
  ) {}

  /**
   * Assign operator role to a user account
   */
  @Transactional()
  async assignOperator(
    accountId: string,
    serviceId: string,
    countryCode: string,
    assignedBy: string,
    permissionIds: string[] = [],
  ): Promise<{ success: boolean; assignment?: OperatorAssignmentRow; message: string }> {
    // TODO: Add authorization check - verify assignedBy has permission to assign operators
    // await this.verifyCallerPermission(assignedBy, 'operator:assign');

    // Check if assignment already exists
    const existing = await this.getAssignment(accountId, serviceId, countryCode);
    if (existing) {
      if (existing.status === 'ACTIVE') {
        return { success: false, message: 'Operator assignment already exists' };
      }
      // Reactivate suspended/revoked assignment
      return this.reactivateAssignment(existing.id, assignedBy, permissionIds);
    }

    const assignmentId = ID.generate();
    const now = new Date();

    // Create assignment
    await this.prisma.$executeRaw`
      INSERT INTO operator_assignments (
        id, account_id, service_id, country_code,
        status, assigned_by, assigned_at, created_at, updated_at
      ) VALUES (
        ${assignmentId}::uuid, ${accountId}::uuid, ${serviceId}::uuid, ${countryCode},
        'ACTIVE'::operator_assignment_status, ${assignedBy}::uuid, ${now}, ${now}, ${now}
      )
    `;

    // Add permissions if provided
    if (permissionIds.length > 0) {
      await this.addPermissions(assignmentId, permissionIds, assignedBy);
    }

    const assignment = await this.getAssignmentById(assignmentId);

    await this.outboxService.addEventDirect('OPERATOR_ASSIGNED', accountId, {
      assignmentId,
      accountId,
      serviceId,
      countryCode,
      assignedBy,
      permissionCount: permissionIds.length,
      timestamp: now.toISOString(),
    });

    this.logger.log(
      `Operator assigned: account=${accountId.slice(0, 8)}..., service=${serviceId.slice(0, 8)}...`,
    );

    return {
      success: true,
      assignment: assignment!,
      message: 'Operator assigned successfully',
    };
  }

  /**
   * Revoke operator assignment
   */
  async revokeAssignment(
    assignmentId: string,
    revokedBy: string,
    reason: string,
  ): Promise<{ success: boolean; message: string }> {
    // TODO: Add authorization check - verify revokedBy has permission to revoke operators
    // await this.verifyCallerPermission(revokedBy, 'operator:revoke');

    const assignment = await this.getAssignmentById(assignmentId);
    if (!assignment) {
      return { success: false, message: 'Assignment not found' };
    }

    if (assignment.status === 'REVOKED') {
      return { success: false, message: 'Assignment already revoked' };
    }

    const now = new Date();
    await this.prisma.$executeRaw`
      UPDATE operator_assignments
      SET status = 'REVOKED'::operator_assignment_status,
          deactivated_at = ${now},
          deactivated_by = ${revokedBy}::uuid,
          deactivation_reason = ${reason},
          updated_at = ${now}
      WHERE id = ${assignmentId}::uuid
    `;

    await this.outboxService.addEventDirect('OPERATOR_REVOKED', assignment.accountId, {
      assignmentId,
      accountId: assignment.accountId,
      serviceId: assignment.serviceId,
      revokedBy,
      reason,
      timestamp: now.toISOString(),
    });

    this.logger.log(`Operator assignment revoked: ${assignmentId.slice(0, 8)}...`);
    return { success: true, message: 'Assignment revoked successfully' };
  }

  /**
   * Get operator assignment by user, service, and country
   */
  async getAssignment(
    accountId: string,
    serviceId: string,
    countryCode: string,
  ): Promise<OperatorAssignmentRow | null> {
    const assignments = await this.prisma.$queryRaw<OperatorAssignmentRow[]>`
      SELECT
        id, account_id as "accountId", service_id as "serviceId",
        country_code as "countryCode", status,
        assigned_by as "assignedBy", assigned_at as "assignedAt",
        deactivated_at as "deactivatedAt", deactivated_by as "deactivatedBy",
        deactivation_reason as "deactivationReason",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM operator_assignments
      WHERE account_id = ${accountId}::uuid
        AND service_id = ${serviceId}::uuid
        AND country_code = ${countryCode}
      LIMIT 1
    `;
    return assignments[0] ?? null;
  }

  /**
   * Get all operator assignments for a service
   */
  async getServiceAssignments(
    serviceId: string,
    filter: AssignmentFilter = {},
  ): Promise<PaginatedAssignments> {
    const { countryCode, status, page = 1, pageSize = 20 } = filter;
    const offset = (page - 1) * pageSize;

    // Build dynamic query based on filters
    let assignments: OperatorAssignmentRow[];
    let countResult: { count: bigint }[];

    if (countryCode && status) {
      assignments = await this.prisma.$queryRaw<OperatorAssignmentRow[]>`
        SELECT
          id, account_id as "accountId", service_id as "serviceId",
          country_code as "countryCode", status,
          assigned_by as "assignedBy", assigned_at as "assignedAt",
          deactivated_at as "deactivatedAt", deactivated_by as "deactivatedBy",
          deactivation_reason as "deactivationReason",
          created_at as "createdAt", updated_at as "updatedAt"
        FROM operator_assignments
        WHERE service_id = ${serviceId}::uuid
          AND country_code = ${countryCode}
          AND status = ${status}::operator_assignment_status
        ORDER BY assigned_at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `;
      countResult = await this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM operator_assignments
        WHERE service_id = ${serviceId}::uuid
          AND country_code = ${countryCode}
          AND status = ${status}::operator_assignment_status
      `;
    } else if (countryCode) {
      assignments = await this.prisma.$queryRaw<OperatorAssignmentRow[]>`
        SELECT
          id, account_id as "accountId", service_id as "serviceId",
          country_code as "countryCode", status,
          assigned_by as "assignedBy", assigned_at as "assignedAt",
          deactivated_at as "deactivatedAt", deactivated_by as "deactivatedBy",
          deactivation_reason as "deactivationReason",
          created_at as "createdAt", updated_at as "updatedAt"
        FROM operator_assignments
        WHERE service_id = ${serviceId}::uuid AND country_code = ${countryCode}
        ORDER BY assigned_at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `;
      countResult = await this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM operator_assignments
        WHERE service_id = ${serviceId}::uuid AND country_code = ${countryCode}
      `;
    } else if (status) {
      assignments = await this.prisma.$queryRaw<OperatorAssignmentRow[]>`
        SELECT
          id, account_id as "accountId", service_id as "serviceId",
          country_code as "countryCode", status,
          assigned_by as "assignedBy", assigned_at as "assignedAt",
          deactivated_at as "deactivatedAt", deactivated_by as "deactivatedBy",
          deactivation_reason as "deactivationReason",
          created_at as "createdAt", updated_at as "updatedAt"
        FROM operator_assignments
        WHERE service_id = ${serviceId}::uuid
          AND status = ${status}::operator_assignment_status
        ORDER BY assigned_at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `;
      countResult = await this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM operator_assignments
        WHERE service_id = ${serviceId}::uuid
          AND status = ${status}::operator_assignment_status
      `;
    } else {
      assignments = await this.prisma.$queryRaw<OperatorAssignmentRow[]>`
        SELECT
          id, account_id as "accountId", service_id as "serviceId",
          country_code as "countryCode", status,
          assigned_by as "assignedBy", assigned_at as "assignedAt",
          deactivated_at as "deactivatedAt", deactivated_by as "deactivatedBy",
          deactivation_reason as "deactivationReason",
          created_at as "createdAt", updated_at as "updatedAt"
        FROM operator_assignments
        WHERE service_id = ${serviceId}::uuid
        ORDER BY assigned_at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `;
      countResult = await this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM operator_assignments
        WHERE service_id = ${serviceId}::uuid
      `;
    }

    return {
      assignments,
      totalCount: Number(countResult[0].count),
      page,
      pageSize,
    };
  }

  /**
   * Update operator assignment permissions
   */
  @Transactional()
  async updatePermissions(
    assignmentId: string,
    permissionIds: string[],
    updatedBy: string,
  ): Promise<{ success: boolean; assignment?: OperatorAssignmentRow; message: string }> {
    // TODO: Add authorization check - verify updatedBy has permission to update operator permissions
    // await this.verifyCallerPermission(updatedBy, 'operator:update_permissions');

    const assignment = await this.getAssignmentById(assignmentId);
    if (!assignment) {
      return { success: false, message: 'Assignment not found' };
    }

    if (assignment.status !== 'ACTIVE') {
      return { success: false, message: 'Cannot update permissions for inactive assignment' };
    }

    // Remove existing permissions
    await this.prisma.$executeRaw`
      DELETE FROM operator_assignment_permissions
      WHERE assignment_id = ${assignmentId}::uuid
    `;

    // Add new permissions
    if (permissionIds.length > 0) {
      await this.addPermissions(assignmentId, permissionIds, updatedBy);
    }

    const now = new Date();
    await this.prisma.$executeRaw`
      UPDATE operator_assignments SET updated_at = ${now}
      WHERE id = ${assignmentId}::uuid
    `;

    await this.outboxService.addEventDirect('OPERATOR_PERMISSIONS_UPDATED', assignment.accountId, {
      assignmentId,
      accountId: assignment.accountId,
      serviceId: assignment.serviceId,
      updatedBy,
      permissionCount: permissionIds.length,
      timestamp: now.toISOString(),
    });

    this.logger.log(`Operator permissions updated: ${assignmentId.slice(0, 8)}...`);
    return {
      success: true,
      assignment: (await this.getAssignmentById(assignmentId)) ?? undefined,
      message: 'Permissions updated successfully',
    };
  }

  /**
   * Get permissions for an operator assignment
   */
  async getPermissions(assignmentId: string): Promise<PermissionRow[]> {
    return this.prisma.$queryRaw<PermissionRow[]>`
      SELECT
        p.id, p.resource, p.action, p.category, p.description,
        p.is_system as "isSystem"
      FROM operator_assignment_permissions oap
      JOIN permissions p ON oap.permission_id = p.id
      WHERE oap.assignment_id = ${assignmentId}::uuid
        AND (oap.expires_at IS NULL OR oap.expires_at > NOW())
      ORDER BY p.category, p.resource, p.action
    `;
  }

  private async getAssignmentById(assignmentId: string): Promise<OperatorAssignmentRow | null> {
    const assignments = await this.prisma.$queryRaw<OperatorAssignmentRow[]>`
      SELECT
        id, account_id as "accountId", service_id as "serviceId",
        country_code as "countryCode", status,
        assigned_by as "assignedBy", assigned_at as "assignedAt",
        deactivated_at as "deactivatedAt", deactivated_by as "deactivatedBy",
        deactivation_reason as "deactivationReason",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM operator_assignments
      WHERE id = ${assignmentId}::uuid
      LIMIT 1
    `;
    return assignments[0] ?? null;
  }

  private async addPermissions(
    assignmentId: string,
    permissionIds: string[],
    grantedBy: string,
  ): Promise<void> {
    const now = new Date();
    for (const permissionId of permissionIds) {
      const id = ID.generate();
      await this.prisma.$executeRaw`
        INSERT INTO operator_assignment_permissions (
          id, assignment_id, permission_id, granted_by, granted_at, created_at
        ) VALUES (
          ${id}::uuid, ${assignmentId}::uuid, ${permissionId}::uuid,
          ${grantedBy}::uuid, ${now}, ${now}
        )
        ON CONFLICT (assignment_id, permission_id) DO NOTHING
      `;
    }
  }

  private async reactivateAssignment(
    assignmentId: string,
    assignedBy: string,
    permissionIds: string[],
  ): Promise<{ success: boolean; assignment?: OperatorAssignmentRow; message: string }> {
    const now = new Date();
    await this.prisma.$executeRaw`
      UPDATE operator_assignments
      SET status = 'ACTIVE'::operator_assignment_status,
          assigned_by = ${assignedBy}::uuid,
          assigned_at = ${now},
          deactivated_at = NULL,
          deactivated_by = NULL,
          deactivation_reason = NULL,
          updated_at = ${now}
      WHERE id = ${assignmentId}::uuid
    `;

    // Clear and re-add permissions
    await this.prisma.$executeRaw`
      DELETE FROM operator_assignment_permissions
      WHERE assignment_id = ${assignmentId}::uuid
    `;

    if (permissionIds.length > 0) {
      await this.addPermissions(assignmentId, permissionIds, assignedBy);
    }

    const assignment = await this.getAssignmentById(assignmentId);
    return {
      success: true,
      assignment: assignment!,
      message: 'Operator assignment reactivated',
    };
  }
}
