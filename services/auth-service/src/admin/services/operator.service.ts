import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
// Note: Using tagged template literals ($queryRaw) which are SQL-injection safe
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ID, Transactional } from '@my-girok/nest-common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateOperatorDto,
  InviteOperatorDto,
  UpdateOperatorDto,
  OperatorResponse,
  OperatorListResponse,
  InvitationResponse,
  OperatorListQueryDto,
} from '../dto/operator.dto';

interface OperatorRow {
  id: string;
  email: string;
  name: string;
  serviceId: string;
  serviceSlug: string;
  serviceName: string;
  countryCode: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

interface PermissionRow {
  operatorId: string;
  id: string;
  resource: string;
  action: string;
  displayName: string;
}

interface ServiceRow {
  id: string;
  slug: string;
  name: string;
}

@Injectable()
export class OperatorService {
  constructor(private prisma: PrismaService) {}

  /**
   * Validate admin has access to a specific service
   */
  private async validateAdminServiceAccess(adminId: string, serviceSlug: string): Promise<void> {
    // Check if admin is system-level (has access to all services)
    const admins = await this.prisma.$queryRaw<{ scope: string }[]>`
      SELECT scope FROM admins WHERE id = ${adminId} LIMIT 1
    `;

    if (admins[0]?.scope === 'SYSTEM') {
      return; // System admins have full access
    }

    // Check if admin has specific service access
    const access = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT asv.id
      FROM admin_services asv
      JOIN services s ON asv.service_id = s.id
      WHERE asv.adminId = ${adminId} AND s.slug = ${serviceSlug}
      LIMIT 1
    `;

    if (!access.length) {
      throw new ForbiddenException('No access to this service');
    }
  }

  /**
   * Get service by slug
   */
  private async getServiceBySlug(slug: string): Promise<ServiceRow> {
    const services = await this.prisma.$queryRaw<ServiceRow[]>`
      SELECT id, slug, name FROM services WHERE slug = ${slug} LIMIT 1
    `;

    if (!services.length) {
      throw new NotFoundException('Service not found');
    }

    return services[0];
  }

  /**
   * Create a new operator
   * Uses @Transactional decorator for automatic transaction management with proper isolation
   */
  @Transactional({ isolationLevel: 'ReadCommitted', timeout: 30000, maxRetries: 3 })
  async create(adminId: string, dto: CreateOperatorDto): Promise<OperatorResponse> {
    await this.validateAdminServiceAccess(adminId, dto.serviceSlug);

    const service = await this.getServiceBySlug(dto.serviceSlug);

    // Check if operator already exists for this service
    const existing = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM operators
      WHERE email = ${dto.email} AND service_id = ${service.id}
      LIMIT 1
    `;

    if (existing.length) {
      throw new ConflictException('Operator already exists for this service');
    }

    const hashedPassword = await bcrypt.hash(dto.tempPassword, 10);

    // Create operator
    const operatorId = ID.generate();
    await this.prisma.$executeRaw`
      INSERT INTO operators (
        id, email, password, name, admin_id, service_id, country_code,
        is_active, created_at, updated_at
      )
      VALUES (
        ${operatorId}, ${dto.email}, ${hashedPassword}, ${dto.name},
        ${adminId}, ${service.id}, ${dto.countryCode}, true, NOW(), NOW()
      )
    `;

    // Grant permissions if provided
    if (dto.permissionIds?.length) {
      for (const permissionId of dto.permissionIds) {
        const opPermId = ID.generate();
        await this.prisma.$executeRaw`
          INSERT INTO operator_permissions (id, operator_id, permission_id, granted_by, granted_at)
          VALUES (${opPermId}, ${operatorId}, ${permissionId}, ${adminId}, NOW())
        `;
      }
    }

    // Log audit within transaction
    const auditId = ID.generate();
    await this.prisma.$executeRaw`
      INSERT INTO audit_logs (id, admin_id, action, resource, resource_id, created_at)
      VALUES (${auditId}, ${adminId}, 'create', 'operator', ${operatorId}, NOW())
    `;

    return this.findById(operatorId);
  }

  /**
   * Invite an operator via email or direct creation
   */
  async invite(adminId: string, dto: InviteOperatorDto): Promise<InvitationResponse> {
    await this.validateAdminServiceAccess(adminId, dto.serviceSlug);

    const service = await this.getServiceBySlug(dto.serviceSlug);

    // Check for existing pending invitation
    const existingInvitation = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM operator_invitations
      WHERE email = ${dto.email} AND service_id = ${service.id} AND status = 'PENDING'
      LIMIT 1
    `;

    if (existingInvitation.length) {
      throw new ConflictException('Pending invitation already exists');
    }

    const token = dto.type === 'EMAIL' ? crypto.randomBytes(32).toString('hex') : null;
    const tempPassword = dto.type === 'DIRECT' ? dto.tempPassword : null;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitationId = ID.generate();
    const invitations = await this.prisma.$queryRaw<InvitationResponse[]>`
      INSERT INTO operator_invitations (
        id, admin_id, service_id, country_code, email, name, type,
        status, token, temp_password, permissions, expires_at, created_at
      )
      VALUES (
        ${invitationId}, ${adminId}, ${service.id}, ${dto.countryCode},
        ${dto.email}, ${dto.name}, ${dto.type}::invitation_type, 'PENDING',
        ${token}, ${tempPassword}, ${JSON.stringify(dto.permissionIds)}::jsonb,
        ${expiresAt}, NOW()
      )
      RETURNING id, email, name, type, status, expires_at as "expiresAt", created_at as "createdAt"
    `;

    // Log audit
    await this.logAudit(adminId, 'invite', 'operator_invitation', invitations[0].id);

    // TODO: Send email if type is EMAIL
    // if (dto.type === 'EMAIL') {
    //   await this.emailService.sendOperatorInvitation(dto.email, token);
    // }

    return invitations[0];
  }

  /**
   * List operators with optional filters
   * Uses parameterized queries to prevent SQL injection
   */
  async findAll(adminId: string, query: OperatorListQueryDto): Promise<OperatorListResponse> {
    // Check admin scope for filtering
    const admins = await this.prisma.$queryRaw<{ scope: string }[]>`
      SELECT scope FROM admins WHERE id = ${adminId} LIMIT 1
    `;

    const isSystemAdmin = admins[0]?.scope === 'SYSTEM';

    // Build query using separate parameterized queries based on filter combinations
    const operators = await this.findOperatorsWithFilters(
      isSystemAdmin ? null : adminId,
      query.serviceSlug,
      query.countryCode,
      query.isActive,
      query.search,
    );

    // Get permissions for each operator
    const operatorIds = operators.map((o) => o.id);
    let permissions: PermissionRow[] = [];

    if (operatorIds.length) {
      permissions = await this.prisma.$queryRaw<PermissionRow[]>`
        SELECT
          op.operator_id as "operatorId",
          p.id, p.resource, p.action, p.display_name as "displayName"
        FROM operator_permissions op
        JOIN permissions p ON op.permission_id = p.id
        WHERE op.operator_id = ANY(${operatorIds})
      `;
    }

    const result: OperatorResponse[] = operators.map((o) => ({
      ...o,
      permissions: permissions
        .filter((p) => p.operatorId === o.id)
        .map((p) => ({
          id: p.id,
          resource: p.resource,
          action: p.action,
          displayName: p.displayName,
        })),
    }));

    return {
      operators: result,
      total: operators.length,
    };
  }

  /**
   * Find operators with parameterized filters
   * All parameters are passed via tagged template literals (SQL-injection safe)
   * Uses COALESCE pattern: filter matches if value equals param OR param is null
   */
  private async findOperatorsWithFilters(
    adminId: string | null,
    serviceSlug?: string,
    countryCode?: string,
    isActive?: boolean,
    search?: string,
  ): Promise<OperatorRow[]> {
    // Use COALESCE pattern for optional filters
    // Each condition is: (column = param OR param IS NULL)
    const searchPattern = search ? `%${search}%` : null;

    // Add LIMIT to prevent unbounded queries
    return this.prisma.$queryRaw<OperatorRow[]>`
      SELECT
        o.id, o.email, o.name, o.service_id as "serviceId",
        s.slug as "serviceSlug", s.name as "serviceName",
        o.country_code as "countryCode", o.is_active as "isActive",
        o.last_login_at as "lastLoginAt", o.created_at as "createdAt"
      FROM operators o
      JOIN services s ON o.service_id = s.id
      WHERE (o.adminId = ${adminId} OR ${adminId}::TEXT IS NULL)
        AND (s.slug = ${serviceSlug ?? null} OR ${serviceSlug ?? null}::TEXT IS NULL)
        AND (o.country_code = ${countryCode ?? null} OR ${countryCode ?? null}::TEXT IS NULL)
        AND (o.is_active = ${isActive ?? null} OR ${isActive ?? null}::BOOLEAN IS NULL)
        AND (
          ${searchPattern}::TEXT IS NULL
          OR o.email ILIKE ${searchPattern}
          OR o.name ILIKE ${searchPattern}
        )
      ORDER BY o.created_at DESC
      LIMIT 1000
    `;
  }

  /**
   * Get operator by ID
   */
  async findById(id: string): Promise<OperatorResponse> {
    const operators = await this.prisma.$queryRaw<OperatorRow[]>`
      SELECT
        o.id, o.email, o.name, o.service_id as "serviceId",
        s.slug as "serviceSlug", s.name as "serviceName",
        o.country_code as "countryCode", o.is_active as "isActive",
        o.last_login_at as "lastLoginAt", o.created_at as "createdAt"
      FROM operators o
      JOIN services s ON o.service_id = s.id
      WHERE o.id = ${id}
      LIMIT 1
    `;

    if (!operators.length) {
      throw new NotFoundException('Operator not found');
    }

    const permissions = await this.prisma.$queryRaw<PermissionRow[]>`
      SELECT
        op.operator_id as "operatorId",
        p.id, p.resource, p.action, p.display_name as "displayName"
      FROM operator_permissions op
      JOIN permissions p ON op.permission_id = p.id
      WHERE op.operator_id = ${id}
    `;

    return {
      ...operators[0],
      permissions: permissions.map((p) => ({
        id: p.id,
        resource: p.resource,
        action: p.action,
        displayName: p.displayName,
      })),
    };
  }

  /**
   * Update operator
   */
  async update(adminId: string, id: string, dto: UpdateOperatorDto): Promise<OperatorResponse> {
    const operator = await this.findById(id);

    // Validate admin access to operator's service
    await this.validateAdminServiceAccess(adminId, operator.serviceSlug);

    // Use parameterized queries to prevent SQL injection
    if (dto.name !== undefined && dto.isActive !== undefined) {
      await this.prisma.$executeRaw`
        UPDATE operators
        SET name = ${dto.name}, is_active = ${dto.isActive}, updated_at = NOW()
        WHERE id = ${id}
      `;
    } else if (dto.name !== undefined) {
      await this.prisma.$executeRaw`
        UPDATE operators SET name = ${dto.name}, updated_at = NOW() WHERE id = ${id}
      `;
    } else if (dto.isActive !== undefined) {
      await this.prisma.$executeRaw`
        UPDATE operators SET is_active = ${dto.isActive}, updated_at = NOW() WHERE id = ${id}
      `;
    }

    // Log audit
    await this.logAudit(adminId, 'update', 'operator', id);

    return this.findById(id);
  }

  /**
   * Delete operator
   */
  async delete(adminId: string, id: string): Promise<void> {
    const operator = await this.findById(id);

    // Validate admin access
    await this.validateAdminServiceAccess(adminId, operator.serviceSlug);

    await this.prisma.$executeRaw`DELETE FROM operators WHERE id = ${id}`;

    // Log audit
    await this.logAudit(adminId, 'delete', 'operator', id);
  }

  /**
   * Grant permission to operator
   */
  async grantPermission(adminId: string, operatorId: string, permissionId: string): Promise<void> {
    const operator = await this.findById(operatorId);

    // Validate admin access
    await this.validateAdminServiceAccess(adminId, operator.serviceSlug);

    // Check if permission exists
    const permissions = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM permissions WHERE id = ${permissionId} LIMIT 1
    `;

    if (!permissions.length) {
      throw new NotFoundException('Permission not found');
    }

    // Check if already granted
    const existing = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM operator_permissions
      WHERE operator_id = ${operatorId} AND permission_id = ${permissionId}
      LIMIT 1
    `;

    if (existing.length) {
      throw new ConflictException('Permission already granted');
    }

    const opPermId = ID.generate();
    await this.prisma.$executeRaw`
      INSERT INTO operator_permissions (id, operator_id, permission_id, granted_by, granted_at)
      VALUES (${opPermId}, ${operatorId}, ${permissionId}, ${adminId}, NOW())
    `;

    // Log audit
    await this.logAudit(
      adminId,
      'grant_permission',
      'operator_permission',
      `${operatorId}:${permissionId}`,
    );
  }

  /**
   * Revoke permission from operator
   */
  async revokePermission(adminId: string, operatorId: string, permissionId: string): Promise<void> {
    const operator = await this.findById(operatorId);

    // Validate admin access
    await this.validateAdminServiceAccess(adminId, operator.serviceSlug);

    const result = await this.prisma.$executeRaw`
      DELETE FROM operator_permissions
      WHERE operator_id = ${operatorId} AND permission_id = ${permissionId}
    `;

    if (result === 0) {
      throw new NotFoundException('Permission not found for this operator');
    }

    // Log audit
    await this.logAudit(
      adminId,
      'revoke_permission',
      'operator_permission',
      `${operatorId}:${permissionId}`,
    );
  }

  private async logAudit(
    adminId: string,
    action: string,
    resource: string,
    resourceId?: string,
  ): Promise<void> {
    const auditId = ID.generate();
    await this.prisma.$executeRaw`
      INSERT INTO audit_logs (id, admin_id, action, resource, resource_id, created_at)
      VALUES (${auditId}, ${adminId}, ${action}, ${resource}, ${resourceId || null}, NOW())
    `;
  }
}
