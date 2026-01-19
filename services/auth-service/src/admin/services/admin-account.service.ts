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
import { AuditEventEmitterService } from '../../common/services/audit-event-emitter.service';
import type { EventActor } from '@my-girok/types/events/auth/events.js';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEventEmitter: AuditEventEmitterService,
  ) {}

  /**
   * Private helper: Create admin account without transaction wrapper
   * Used by both create() and invite() to avoid nested transactions
   */
  private async _createAdminUnsafe(currentAdminId: string, dto: CreateAdminDto): Promise<string> {
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
    const admin = await this.prisma.admins.create({
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

    // 7. Emit admin created event for audit logging
    const actor: EventActor = {
      id: currentAdminId,
      type: 'ADMIN',
    };

    await this.auditEventEmitter.emitAdminCreated({
      adminId,
      email: admin.email,
      name: admin.name,
      roleId: admin.role_id,
      scope: admin.scope as 'SYSTEM' | 'TENANT',
      tenantId: admin.tenant_id ?? undefined,
      actor,
    });

    return adminId;
  }

  /**
   * Create a new admin account
   */
  @Transactional({ isolationLevel: 'ReadCommitted', timeout: 30000, maxRetries: 3 })
  async create(currentAdminId: string, dto: CreateAdminDto): Promise<AdminResponse> {
    const adminId = await this._createAdminUnsafe(currentAdminId, dto);
    return this.findById(adminId);
  }

  /**
   * Invite an admin via email or direct creation
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

    // Check for existing pending invitation
    const existingInvite = await this.prisma.admin_invitations.findFirst({
      where: {
        email: dto.email,
        status: 'PENDING',
        expires_at: { gt: new Date() },
      },
      select: { id: true },
    });
    if (existingInvite) {
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
    await this.prisma.admin_invitations.create({
      data: {
        id: invitationId,
        email: dto.email,
        name: dto.name,
        role_id: dto.roleId,
        type: dto.type,
        token,
        status: 'PENDING',
        invited_by: currentAdminId,
        expires_at: expiresAt,
      },
    });

    // If DIRECT type, create admin with temp password immediately
    if (dto.type === InvitationType.DIRECT && dto.tempPassword) {
      // Use helper method to avoid nested transactions
      await this._createAdminUnsafe(currentAdminId, {
        email: dto.email,
        name: dto.name,
        tempPassword: dto.tempPassword,
        roleId: dto.roleId,
        scope: AdminScope.SYSTEM,
      });

      // Mark invitation as accepted
      await this.prisma.admin_invitations.update({
        where: { id: invitationId },
        data: {
          status: 'ACCEPTED',
          updated_at: new Date(),
        },
      });
    }

    // Emit admin invited event for audit logging
    const actor: EventActor = {
      id: currentAdminId,
      type: 'ADMIN',
    };

    await this.auditEventEmitter.emitAdminInvited({
      invitationId,
      email: dto.email,
      name: dto.name,
      roleId: dto.roleId,
      type: dto.type as 'EMAIL' | 'DIRECT',
      expiresAt,
      actor,
    });

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

      // Emit admin updated event for audit logging
      const actor: EventActor = {
        id: currentAdminId,
        type: 'ADMIN',
      };

      await this.auditEventEmitter.emitAdminUpdated({
        adminId: id,
        changedFields: Object.keys(updateData),
        actor,
      });
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

    // Emit admin deactivated event for audit logging
    const actor: EventActor = {
      id: currentAdminId,
      type: 'ADMIN',
    };

    await this.auditEventEmitter.emitAdminDeactivated({
      adminId: id,
      email: admin.email,
      actor,
    });
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

    // Emit admin reactivated event for audit logging
    const actor: EventActor = {
      id: currentAdminId,
      type: 'ADMIN',
    };

    await this.auditEventEmitter.emitAdminReactivated({
      adminId: id,
      email: admin.email,
      actor,
    });

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

    // Emit admin role changed event for audit logging
    const actor: EventActor = {
      id: currentAdminId,
      type: 'ADMIN',
    };

    await this.auditEventEmitter.emitAdminRoleChanged({
      adminId: id,
      previousRoleId: admin.roleId,
      newRoleId: roleId,
      actor,
    });

    return this.findById(id);
  }
}
