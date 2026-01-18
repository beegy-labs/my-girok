import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ID, Transactional } from '@my-girok/nest-common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateAdminDto,
  InviteAdminDto,
  UpdateAdminDto,
  AdminScope,
  AdminResponse,
  AdminDetailResponse,
  AdminListResponse,
  InvitationResponse,
  AdminListQueryDto,
  InvitationType,
} from '../dto/admin-account.dto';

interface AdminRow {
  id: string;
  email: string;
  name: string;
  scope: string;
  tenant_id: string | null;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  role_id: string;
  role_name: string;
  role_display_name: string;
  role_level: number;
}

interface AdminWithTenantRow extends AdminRow {
  tenant_name?: string;
  tenant_slug?: string;
  tenant_type?: string;
}

interface RoleRow {
  id: string;
  name: string;
  display_name: string;
  scope: string;
  level: number;
}

interface PermissionRow {
  id: string;
  resource: string;
  action: string;
  display_name: string;
  description: string | null;
  category: string;
}

@Injectable()
export class AdminAccountService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new admin account
   */
  @Transactional({ isolationLevel: 'ReadCommitted', timeout: 30000, maxRetries: 3 })
  async create(currentAdminId: string, dto: CreateAdminDto): Promise<AdminResponse> {
    // 1. Check email uniqueness
    const existing = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM admins WHERE email = ${dto.email} AND deleted_at IS NULL LIMIT 1
    `;
    if (existing.length > 0) {
      throw new ConflictException('Email already registered');
    }

    // 2. Validate role exists and matches scope
    const roles = await this.prisma.$queryRaw<RoleRow[]>`
      SELECT id, name, display_name, scope, level
      FROM roles
      WHERE id = ${dto.roleId}::uuid AND deleted_at IS NULL
      LIMIT 1
    `;
    if (roles.length === 0) {
      throw new NotFoundException('Role not found');
    }
    const role = roles[0];
    if (role.scope !== (dto.scope ?? AdminScope.SYSTEM)) {
      throw new BadRequestException('Role scope mismatch');
    }

    // 3. Validate tenant if TENANT scope
    if (dto.scope === AdminScope.TENANT) {
      if (!dto.tenantId) {
        throw new BadRequestException('tenantId is required for TENANT scope');
      }
      const tenants = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM tenants WHERE id = ${dto.tenantId}::uuid AND deleted_at IS NULL LIMIT 1
      `;
      if (tenants.length === 0) {
        throw new NotFoundException('Tenant not found');
      }
    }

    // 4. Hash password
    const passwordHash = await bcrypt.hash(dto.tempPassword, 10);

    // 5. Generate UUIDv7
    const adminId = ID.generate();

    // 6. Insert admin
    await this.prisma.$executeRaw`
      INSERT INTO admins (
        id, email, name, password, scope, tenant_id, role_id,
        is_active, identity_type, created_at, updated_at
      ) VALUES (
        ${adminId}::uuid,
        ${dto.email},
        ${dto.name},
        ${passwordHash},
        ${dto.scope ?? AdminScope.SYSTEM}::admin_scope,
        ${dto.tenantId ?? null}::uuid,
        ${dto.roleId}::uuid,
        true,
        'HUMAN'::identity_type,
        NOW(),
        NOW()
      )
    `;

    // 7. Log audit
    const auditId = ID.generate();
    await this.prisma.$executeRaw`
      INSERT INTO audit_logs (id, admin_id, action, resource, resource_id, details, created_at)
      VALUES (
        ${auditId}::uuid,
        ${currentAdminId}::uuid,
        'admin.create',
        'admin',
        ${adminId}::uuid,
        ${JSON.stringify({ email: dto.email, roleId: dto.roleId })}::jsonb,
        NOW()
      )
    `;

    return this.findById(adminId);
  }

  /**
   * Invite an admin via email or direct creation
   */
  @Transactional({ isolationLevel: 'ReadCommitted', timeout: 30000, maxRetries: 3 })
  async invite(currentAdminId: string, dto: InviteAdminDto): Promise<InvitationResponse> {
    // Check email uniqueness
    const existing = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM admins WHERE email = ${dto.email} AND deleted_at IS NULL LIMIT 1
    `;
    if (existing.length > 0) {
      throw new ConflictException('Email already registered');
    }

    // Check for existing pending invitation
    const existingInvite = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM admin_invitations
      WHERE email = ${dto.email} AND status = 'PENDING' AND expires_at > NOW()
      LIMIT 1
    `;
    if (existingInvite.length > 0) {
      throw new ConflictException('Pending invitation already exists');
    }

    // Validate role
    const roles = await this.prisma.$queryRaw<RoleRow[]>`
      SELECT id, scope FROM roles WHERE id = ${dto.roleId}::uuid AND deleted_at IS NULL LIMIT 1
    `;
    if (roles.length === 0) {
      throw new NotFoundException('Role not found');
    }

    const invitationId = ID.generate();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation
    await this.prisma.$executeRaw`
      INSERT INTO admin_invitations (
        id, email, name, role_id, type, token, status, invited_by, expires_at, created_at
      ) VALUES (
        ${invitationId}::uuid,
        ${dto.email},
        ${dto.name},
        ${dto.roleId}::uuid,
        ${dto.type}::invitation_type,
        ${token},
        'PENDING',
        ${currentAdminId}::uuid,
        ${expiresAt},
        NOW()
      )
    `;

    // If DIRECT type, create admin with temp password immediately
    if (dto.type === InvitationType.DIRECT && dto.tempPassword) {
      await this.create(currentAdminId, {
        email: dto.email,
        name: dto.name,
        tempPassword: dto.tempPassword,
        roleId: dto.roleId,
        scope: AdminScope.SYSTEM,
      });

      // Mark invitation as accepted
      await this.prisma.$executeRaw`
        UPDATE admin_invitations SET status = 'ACCEPTED', updated_at = NOW()
        WHERE id = ${invitationId}::uuid
      `;
    }

    // Log audit
    const auditId = ID.generate();
    await this.prisma.$executeRaw`
      INSERT INTO audit_logs (id, admin_id, action, resource, resource_id, details, created_at)
      VALUES (
        ${auditId}::uuid,
        ${currentAdminId}::uuid,
        'admin.invite',
        'admin_invitation',
        ${invitationId}::uuid,
        ${JSON.stringify({ email: dto.email, type: dto.type })}::jsonb,
        NOW()
      )
    `;

    return {
      id: invitationId,
      email: dto.email,
      name: dto.name,
      type: dto.type,
      status: dto.type === InvitationType.DIRECT ? 'ACCEPTED' : 'PENDING',
      expiresAt,
      createdAt: new Date(),
    };
  }

  /**
   * List admins with filters and pagination
   */
  async findAll(query: AdminListQueryDto): Promise<AdminListResponse> {
    const { scope, roleId, isActive, search, page = 1, limit = 20 } = query;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: string[] = ['a.deleted_at IS NULL'];
    const params: (string | boolean | number)[] = [];
    let paramIndex = 1;

    if (scope) {
      conditions.push(`a.scope = $${paramIndex}::admin_scope`);
      params.push(scope);
      paramIndex++;
    }
    if (roleId) {
      conditions.push(`a.role_id = $${paramIndex}::uuid`);
      params.push(roleId);
      paramIndex++;
    }
    if (isActive !== undefined) {
      conditions.push(`a.is_active = $${paramIndex}`);
      params.push(isActive);
      paramIndex++;
    }
    if (search) {
      conditions.push(`(a.email ILIKE $${paramIndex} OR a.name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Count total
    const countQuery = `SELECT COUNT(*)::int as count FROM admins a WHERE ${whereClause}`;
    const countResult = await this.prisma.$queryRawUnsafe<[{ count: number }]>(
      countQuery,
      ...params,
    );
    const total = countResult[0].count;

    // Fetch admins with role
    const dataQuery = `
      SELECT
        a.id, a.email, a.name, a.scope, a.tenant_id, a.is_active,
        a.last_login_at, a.created_at,
        r.id as role_id, r.name as role_name, r.display_name as role_display_name, r.level as role_level
      FROM admins a
      JOIN roles r ON a.role_id = r.id
      WHERE ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const admins = await this.prisma.$queryRawUnsafe<AdminRow[]>(
      dataQuery,
      ...params,
      limit,
      offset,
    );

    return {
      admins: admins.map((admin) => this.mapToResponse(admin)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get admin by ID with full details
   */
  async findById(id: string): Promise<AdminDetailResponse> {
    const admins = await this.prisma.$queryRaw<AdminWithTenantRow[]>`
      SELECT
        a.id, a.email, a.name, a.scope, a.tenant_id, a.is_active,
        a.last_login_at, a.created_at,
        r.id as role_id, r.name as role_name, r.display_name as role_display_name, r.level as role_level,
        t.name as tenant_name, t.slug as tenant_slug, t.type as tenant_type
      FROM admins a
      JOIN roles r ON a.role_id = r.id
      LEFT JOIN tenants t ON a.tenant_id = t.id
      WHERE a.id = ${id}::uuid AND a.deleted_at IS NULL
      LIMIT 1
    `;

    if (admins.length === 0) {
      throw new NotFoundException('Admin not found');
    }

    const admin = admins[0];

    // Fetch permissions via role
    const permissions = await this.prisma.$queryRaw<PermissionRow[]>`
      SELECT p.id, p.resource, p.action, p.display_name, p.description, p.category
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ${admin.role_id}::uuid
      ORDER BY p.category, p.resource, p.action
    `;

    return this.mapToDetailResponse(admin, permissions);
  }

  /**
   * Update admin
   */
  @Transactional({ isolationLevel: 'ReadCommitted' })
  async update(currentAdminId: string, id: string, dto: UpdateAdminDto): Promise<AdminResponse> {
    // Check exists
    await this.findById(id);

    // Build update
    const updates: string[] = ['updated_at = NOW()'];
    const params: (string | boolean)[] = [];
    let paramIndex = 1;

    if (dto.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(dto.name);
      paramIndex++;
    }
    if (dto.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(dto.isActive);
      paramIndex++;
    }

    if (params.length > 0) {
      const updateQuery = `UPDATE admins SET ${updates.join(', ')} WHERE id = $${paramIndex}::uuid`;
      await this.prisma.$executeRawUnsafe(updateQuery, ...params, id);

      // Log audit
      const auditId = ID.generate();
      await this.prisma.$executeRaw`
        INSERT INTO audit_logs (id, admin_id, action, resource, resource_id, details, created_at)
        VALUES (
          ${auditId}::uuid,
          ${currentAdminId}::uuid,
          'admin.update',
          'admin',
          ${id}::uuid,
          ${JSON.stringify(dto)}::jsonb,
          NOW()
        )
      `;
    }

    return this.findById(id);
  }

  /**
   * Deactivate admin (soft delete behavior)
   */
  @Transactional({ isolationLevel: 'ReadCommitted' })
  async deactivate(currentAdminId: string, id: string): Promise<void> {
    const admin = await this.findById(id);

    if (!admin.isActive) {
      throw new BadRequestException('Admin already deactivated');
    }

    // Prevent self-deactivation
    if (id === currentAdminId) {
      throw new BadRequestException('Cannot deactivate yourself');
    }

    await this.prisma.$executeRaw`
      UPDATE admins SET is_active = false, updated_at = NOW()
      WHERE id = ${id}::uuid
    `;

    // Revoke all active sessions
    await this.prisma.$executeRaw`
      UPDATE sessions SET revoked_at = NOW()
      WHERE admin_id = ${id}::uuid AND revoked_at IS NULL
    `;

    // Log audit
    const auditId = ID.generate();
    await this.prisma.$executeRaw`
      INSERT INTO audit_logs (id, admin_id, action, resource, resource_id, created_at)
      VALUES (
        ${auditId}::uuid,
        ${currentAdminId}::uuid,
        'admin.deactivate',
        'admin',
        ${id}::uuid,
        NOW()
      )
    `;
  }

  /**
   * Reactivate admin
   */
  @Transactional({ isolationLevel: 'ReadCommitted' })
  async reactivate(currentAdminId: string, id: string): Promise<AdminResponse> {
    const admin = await this.findById(id);

    if (admin.isActive) {
      throw new BadRequestException('Admin is already active');
    }

    await this.prisma.$executeRaw`
      UPDATE admins SET is_active = true, updated_at = NOW()
      WHERE id = ${id}::uuid
    `;

    // Log audit
    const auditId = ID.generate();
    await this.prisma.$executeRaw`
      INSERT INTO audit_logs (id, admin_id, action, resource, resource_id, created_at)
      VALUES (
        ${auditId}::uuid,
        ${currentAdminId}::uuid,
        'admin.reactivate',
        'admin',
        ${id}::uuid,
        NOW()
      )
    `;

    return this.findById(id);
  }

  /**
   * Assign role to admin
   */
  @Transactional({ isolationLevel: 'ReadCommitted' })
  async assignRole(currentAdminId: string, id: string, roleId: string): Promise<AdminResponse> {
    const admin = await this.findById(id);

    // Validate role exists and matches admin scope
    const roles = await this.prisma.$queryRaw<RoleRow[]>`
      SELECT id, scope FROM roles WHERE id = ${roleId}::uuid AND deleted_at IS NULL LIMIT 1
    `;
    if (roles.length === 0) {
      throw new NotFoundException('Role not found');
    }
    if (roles[0].scope !== admin.scope) {
      throw new BadRequestException('Role scope must match admin scope');
    }

    await this.prisma.$executeRaw`
      UPDATE admins SET role_id = ${roleId}::uuid, updated_at = NOW()
      WHERE id = ${id}::uuid
    `;

    // Log audit
    const auditId = ID.generate();
    await this.prisma.$executeRaw`
      INSERT INTO audit_logs (id, admin_id, action, resource, resource_id, details, created_at)
      VALUES (
        ${auditId}::uuid,
        ${currentAdminId}::uuid,
        'admin.role.assign',
        'admin',
        ${id}::uuid,
        ${JSON.stringify({ roleId })}::jsonb,
        NOW()
      )
    `;

    return this.findById(id);
  }

  /**
   * Map database row to AdminResponse
   */
  private mapToResponse(row: AdminRow): AdminResponse {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      scope: row.scope as AdminScope,
      tenantId: row.tenant_id,
      role: {
        id: row.role_id,
        name: row.role_name,
        displayName: row.role_display_name,
        level: row.role_level,
      },
      isActive: row.is_active,
      lastLoginAt: row.last_login_at,
      createdAt: row.created_at,
    };
  }

  /**
   * Map database row to AdminDetailResponse
   */
  private mapToDetailResponse(
    row: AdminWithTenantRow,
    permissions: PermissionRow[],
  ): AdminDetailResponse {
    const response: AdminDetailResponse = {
      ...this.mapToResponse(row),
      permissions: permissions.map((p) => ({
        id: p.id,
        resource: p.resource,
        action: p.action,
        displayName: p.display_name,
        description: p.description,
        category: p.category,
      })),
    };

    if (row.tenant_id && row.tenant_name) {
      response.tenant = {
        id: row.tenant_id,
        name: row.tenant_name,
        slug: row.tenant_slug ?? '',
        type: row.tenant_type ?? '',
      };
    }

    return response;
  }
}
