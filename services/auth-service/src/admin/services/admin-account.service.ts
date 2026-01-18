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
  AdminRoleListResponse,
  InvitationResponse,
  AdminListQueryDto,
  AdminRoleListQueryDto,
  InvitationType,
} from '../dto/admin-account.dto';

@Injectable()
export class AdminAccountService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new admin account
   */
  @Transactional({ isolationLevel: 'ReadCommitted', timeout: 30000, maxRetries: 3 })
  async create(currentAdminId: string, dto: CreateAdminDto): Promise<AdminResponse> {
    // 1. Check email uniqueness using Prisma Client
    const existing = await this.prisma.admins.findFirst({
      where: {
        email: dto.email,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // 2. Validate role exists and matches scope using Prisma Client
    const role = await this.prisma.roles.findFirst({
      where: {
        id: dto.roleId,
      },
      select: {
        id: true,
        name: true,
        display_name: true,
        scope: true,
        level: true,
      },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (role.scope !== (dto.scope ?? AdminScope.SYSTEM)) {
      throw new BadRequestException('Role scope mismatch');
    }

    // 3. Validate tenant if TENANT scope using Prisma Client
    if (dto.scope === AdminScope.TENANT) {
      if (!dto.tenantId) {
        throw new BadRequestException('tenantId is required for TENANT scope');
      }
      const tenant = await this.prisma.tenants.findFirst({
        where: {
          id: dto.tenantId,
        },
        select: { id: true },
      });
      if (!tenant) {
        throw new NotFoundException('Tenant not found');
      }
    }

    // 4. Hash password
    const passwordHash = await bcrypt.hash(dto.tempPassword, 10);

    // 5. Generate UUIDv7
    const adminId = ID.generate();

    // 6. Insert admin using Prisma Client
    await this.prisma.admins.create({
      data: {
        id: adminId,
        email: dto.email,
        name: dto.name,
        password: passwordHash,
        scope: dto.scope ?? AdminScope.SYSTEM,
        tenant_id: dto.tenantId ?? null,
        role_id: dto.roleId,
        is_active: true,
        identity_type: 'HUMAN',
      },
    });

    // 7. Log audit (Raw SQL: audit_logs table not in Prisma schema)
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
   * NOTE: admin_invitations table uses Raw SQL as it's not in Prisma schema
   */
  @Transactional({ isolationLevel: 'ReadCommitted', timeout: 30000, maxRetries: 3 })
  async invite(currentAdminId: string, dto: InviteAdminDto): Promise<InvitationResponse> {
    // Check email uniqueness using Prisma Client
    const existing = await this.prisma.admins.findFirst({
      where: {
        email: dto.email,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Check for existing pending invitation (Raw SQL: admin_invitations table not in Prisma schema)
    const existingInvite = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM admin_invitations
      WHERE email = ${dto.email} AND status = 'PENDING' AND expires_at > NOW()
      LIMIT 1
    `;
    if (existingInvite.length > 0) {
      throw new ConflictException('Pending invitation already exists');
    }

    // Validate role using Prisma Client
    const role = await this.prisma.roles.findFirst({
      where: { id: dto.roleId },
      select: { id: true, scope: true },
    });
    if (!role) {
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

    // Build Prisma where conditions
    const where: any = {
      deleted_at: null,
    };

    if (scope) where.scope = scope;
    if (roleId) where.role_id = roleId;
    if (isActive !== undefined) where.is_active = isActive;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Count total using Prisma Client
    const total = await this.prisma.admins.count({ where });

    // Fetch admins with role using Prisma Client
    const admins = await this.prisma.admins.findMany({
      where,
      include: {
        roles: {
          select: {
            id: true,
            name: true,
            display_name: true,
            level: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limit,
    });

    return {
      admins: admins.map((admin) => ({
        id: admin.id,
        email: admin.email,
        name: admin.name,
        scope: admin.scope as 'SYSTEM' | 'TENANT',
        tenantId: admin.tenant_id,
        role: {
          id: admin.roles.id,
          name: admin.roles.name,
          displayName: admin.roles.display_name,
          level: admin.roles.level,
        },
        isActive: admin.is_active,
        lastLoginAt: admin.last_login_at,
        createdAt: admin.created_at,
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Get available roles for admin account creation
   */
  async getRoles(query: AdminRoleListQueryDto): Promise<AdminRoleListResponse> {
    const { scope } = query;

    // Use Prisma Client for type-safe role queries
    const roles = await this.prisma.roles.findMany({
      where: scope ? { scope } : {},
      select: {
        id: true,
        name: true,
        display_name: true,
        scope: true,
        level: true,
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });

    return {
      roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        displayName: r.display_name,
        level: r.level,
        scope: r.scope as 'SYSTEM' | 'TENANT',
      })),
      total: roles.length,
    };
  }

  /**
   * Get admin by ID with full details
   */
  async findById(id: string): Promise<AdminDetailResponse> {
    // Use Prisma Client with relations
    const admin = await this.prisma.admins.findFirst({
      where: {
        id,
        deleted_at: null,
      },
      include: {
        roles: {
          include: {
            role_permissions: {
              include: {
                permissions: true,
              },
              orderBy: [
                { permissions: { category: 'asc' } },
                { permissions: { resource: 'asc' } },
                { permissions: { action: 'asc' } },
              ],
            },
          },
        },
        tenants: true,
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    // Transform Prisma result to response format
    const permissions = admin.roles.role_permissions.map((rp) => ({
      id: rp.permissions.id,
      resource: rp.permissions.resource,
      action: rp.permissions.action,
      displayName: rp.permissions.display_name,
      description: rp.permissions.description,
      category: rp.permissions.category,
    }));

    const response: AdminDetailResponse = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      scope: admin.scope as 'SYSTEM' | 'TENANT',
      tenantId: admin.tenant_id,
      role: {
        id: admin.roles.id,
        name: admin.roles.name,
        displayName: admin.roles.display_name,
        level: admin.roles.level,
      },
      isActive: admin.is_active,
      lastLoginAt: admin.last_login_at,
      createdAt: admin.created_at,
      permissions,
    };

    if (admin.tenants) {
      response.tenant = {
        id: admin.tenants.id,
        name: admin.tenants.name,
        slug: admin.tenants.slug,
        type: admin.tenants.type,
      };
    }

    return response;
  }

  /**
   * Update admin
   */
  @Transactional({ isolationLevel: 'ReadCommitted' })
  async update(currentAdminId: string, id: string, dto: UpdateAdminDto): Promise<AdminResponse> {
    // Check exists
    await this.findById(id);

    // Build update data object for Prisma
    const updateData: { name?: string; is_active?: boolean } = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.isActive !== undefined) updateData.is_active = dto.isActive;

    if (Object.keys(updateData).length > 0) {
      // Use Prisma Client for type-safe updates
      await this.prisma.admins.update({
        where: { id },
        data: updateData,
      });

      // Log audit (Raw SQL: audit_logs table not in Prisma schema)
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

    // Use Prisma Client for type-safe update
    await this.prisma.admins.update({
      where: { id },
      data: { is_active: false },
    });

    // Revoke all active sessions using Prisma Client
    await this.prisma.adminSession.updateMany({
      where: {
        adminId: id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    // Log audit (Raw SQL: audit_logs table not in Prisma schema)
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

    // Use Prisma Client for type-safe update
    await this.prisma.admins.update({
      where: { id },
      data: { is_active: true },
    });

    // Log audit (Raw SQL: audit_logs table not in Prisma schema)
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

    // Validate role exists and matches admin scope using Prisma Client
    const role = await this.prisma.roles.findFirst({
      where: { id: roleId },
      select: { id: true, scope: true },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (role.scope !== admin.scope) {
      throw new BadRequestException('Role scope must match admin scope');
    }

    // Use Prisma Client for type-safe update
    await this.prisma.admins.update({
      where: { id },
      data: { role_id: roleId },
    });

    // Log audit (Raw SQL: audit_logs table not in Prisma schema)
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
}
