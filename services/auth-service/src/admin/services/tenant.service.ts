import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateTenantDto,
  UpdateTenantDto,
  UpdateTenantStatusDto,
  TenantListQuery,
  TenantResponse,
  TenantListResponse,
} from '../dto/tenant.dto';
import { Tenant, TenantStatus, AdminPayload } from '../types/admin.types';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  /**
   * List tenants with parameterized filters
   * Uses COALESCE pattern for optional filters (SQL-injection safe)
   */
  async list(query: TenantListQuery): Promise<TenantListResponse> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    // Use COALESCE pattern: (column = param OR param IS NULL)
    const typeFilter = query.type ?? null;
    const statusFilter = query.status ?? null;
    const searchPattern = query.search ? `%${query.search}%` : null;

    // Get total count with parameterized query
    const countResult = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM tenants
      WHERE (type::TEXT = ${typeFilter} OR ${typeFilter}::TEXT IS NULL)
        AND (status::TEXT = ${statusFilter} OR ${statusFilter}::TEXT IS NULL)
        AND (
          ${searchPattern}::TEXT IS NULL
          OR name ILIKE ${searchPattern}
          OR slug ILIKE ${searchPattern}
        )
    `;
    const total = Number(countResult[0].count);

    // Get items with parameterized query
    const items = await this.prisma.$queryRaw<Tenant[]>`
      SELECT
        id, name, type, slug, status, settings,
        approved_at as "approvedAt", approved_by as "approvedBy",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM tenants
      WHERE (type::TEXT = ${typeFilter} OR ${typeFilter}::TEXT IS NULL)
        AND (status::TEXT = ${statusFilter} OR ${statusFilter}::TEXT IS NULL)
        AND (
          ${searchPattern}::TEXT IS NULL
          OR name ILIKE ${searchPattern}
          OR slug ILIKE ${searchPattern}
        )
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Get admin counts for each tenant
    const tenantIds = items.map((t) => t.id);
    const adminCounts =
      tenantIds.length > 0
        ? await this.prisma.$queryRaw<{ tenant_id: string; count: bigint }[]>`
            SELECT tenant_id, COUNT(*) as count
            FROM admins
            WHERE tenant_id = ANY(${tenantIds})
            GROUP BY tenant_id
          `
        : [];

    const countMap = new Map(adminCounts.map((c) => [c.tenant_id, Number(c.count)]));

    const mappedItems: TenantResponse[] = items.map((t) => ({
      ...t,
      adminCount: countMap.get(t.id) || 0,
    }));

    return {
      items: mappedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<TenantResponse> {
    const tenants = await this.prisma.$queryRaw<Tenant[]>`
      SELECT
        id, name, type, slug, status, settings,
        approved_at as "approvedAt", approved_by as "approvedBy",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM tenants
      WHERE id = ${id}
      LIMIT 1
    `;

    const tenant = tenants[0];
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const countResult = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM admins WHERE tenant_id = ${id}
    `;

    return {
      ...tenant,
      adminCount: Number(countResult[0].count),
    };
  }

  async create(dto: CreateTenantDto): Promise<TenantResponse> {
    // Check slug uniqueness
    const existing = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM tenants WHERE slug = ${dto.slug} LIMIT 1
    `;

    if (existing.length > 0) {
      throw new ConflictException('Slug already in use');
    }

    const tenants = await this.prisma.$queryRaw<Tenant[]>`
      INSERT INTO tenants (id, name, type, slug, status, settings)
      VALUES (
        gen_random_uuid()::TEXT,
        ${dto.name},
        ${dto.type || 'INTERNAL'}::tenant_type,
        ${dto.slug},
        'PENDING'::tenant_status,
        ${dto.settings ? JSON.stringify(dto.settings) : null}::JSONB
      )
      RETURNING
        id, name, type, slug, status, settings,
        approved_at as "approvedAt", approved_by as "approvedBy",
        created_at as "createdAt", updated_at as "updatedAt"
    `;

    return {
      ...tenants[0],
      adminCount: 0,
    };
  }

  /**
   * Update tenant with parameterized queries
   * Uses conditional update pattern (SQL-injection safe)
   */
  async update(id: string, dto: UpdateTenantDto): Promise<TenantResponse> {
    // Check tenant exists
    await this.findById(id);

    if (dto.name === undefined && dto.settings === undefined) {
      return this.findById(id);
    }

    // Use COALESCE pattern for conditional updates
    const nameValue = dto.name ?? null;
    const settingsValue = dto.settings ? JSON.stringify(dto.settings) : null;

    const tenants = await this.prisma.$queryRaw<Tenant[]>`
      UPDATE tenants
      SET
        name = COALESCE(${nameValue}, name),
        settings = COALESCE(${settingsValue}::JSONB, settings),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING
        id, name, type, slug, status, settings,
        approved_at as "approvedAt", approved_by as "approvedBy",
        created_at as "createdAt", updated_at as "updatedAt"
    `;

    const countResult = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM admins WHERE tenant_id = ${id}
    `;

    return {
      ...tenants[0],
      adminCount: Number(countResult[0].count),
    };
  }

  /**
   * Update tenant status with parameterized queries
   * Uses separate queries for different status transitions (SQL-injection safe)
   */
  async updateStatus(
    id: string,
    dto: UpdateTenantStatusDto,
    admin: AdminPayload,
  ): Promise<TenantResponse> {
    const tenant = await this.findById(id);

    // Validate status transition
    this.validateStatusTransition(tenant.status, dto.status);

    let tenants: Tenant[];

    // Use separate parameterized queries for different cases
    if (dto.status === 'ACTIVE' && tenant.status === 'PENDING') {
      // Activation case: set approval info
      tenants = await this.prisma.$queryRaw<Tenant[]>`
        UPDATE tenants
        SET status = ${dto.status}::tenant_status,
            approved_at = NOW(),
            approved_by = ${admin.sub},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING
          id, name, type, slug, status, settings,
          approved_at as "approvedAt", approved_by as "approvedBy",
          created_at as "createdAt", updated_at as "updatedAt"
      `;
    } else {
      // Other status changes: just update status
      tenants = await this.prisma.$queryRaw<Tenant[]>`
        UPDATE tenants
        SET status = ${dto.status}::tenant_status,
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING
          id, name, type, slug, status, settings,
          approved_at as "approvedAt", approved_by as "approvedBy",
          created_at as "createdAt", updated_at as "updatedAt"
      `;
    }

    // Log audit
    await this.prisma.$executeRaw`
      INSERT INTO audit_logs (id, admin_id, action, resource, resource_id, before_state, after_state)
      VALUES (
        gen_random_uuid()::TEXT,
        ${admin.sub},
        'update_status',
        'tenant',
        ${id},
        ${JSON.stringify({ status: tenant.status })}::JSONB,
        ${JSON.stringify({ status: dto.status, reason: dto.reason })}::JSONB
      )
    `;

    const countResult = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM admins WHERE tenant_id = ${id}
    `;

    return {
      ...tenants[0],
      adminCount: Number(countResult[0].count),
    };
  }

  private validateStatusTransition(current: TenantStatus, target: TenantStatus): void {
    const validTransitions: Record<TenantStatus, TenantStatus[]> = {
      PENDING: ['ACTIVE', 'TERMINATED'],
      ACTIVE: ['SUSPENDED', 'TERMINATED'],
      SUSPENDED: ['ACTIVE', 'TERMINATED'],
      TERMINATED: [], // Terminal state
    };

    if (!validTransitions[current].includes(target)) {
      throw new ForbiddenException(`Invalid status transition: ${current} -> ${target}`);
    }
  }

  /**
   * Get current admin's tenant (for tenant-scoped admins)
   */
  async getMyTenant(tenantId: string): Promise<TenantResponse> {
    return this.findById(tenantId);
  }

  /**
   * Update current admin's tenant settings
   * Uses parameterized queries (SQL-injection safe)
   */
  async updateMyTenant(tenantId: string, dto: UpdateTenantDto): Promise<TenantResponse> {
    // Tenant admins can only update settings, not name
    if (dto.settings === undefined) {
      return this.findById(tenantId);
    }

    const settingsValue = JSON.stringify(dto.settings);

    const tenants = await this.prisma.$queryRaw<Tenant[]>`
      UPDATE tenants
      SET settings = ${settingsValue}::JSONB,
          updated_at = NOW()
      WHERE id = ${tenantId}
      RETURNING
        id, name, type, slug, status, settings,
        approved_at as "approvedAt", approved_by as "approvedBy",
        created_at as "createdAt", updated_at as "updatedAt"
    `;

    const countResult = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM admins WHERE tenant_id = ${tenantId}
    `;

    return {
      ...tenants[0],
      adminCount: Number(countResult[0].count),
    };
  }
}
