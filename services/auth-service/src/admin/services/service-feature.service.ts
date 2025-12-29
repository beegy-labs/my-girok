import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '../../../node_modules/.prisma/auth-client';
import { ID, CacheKey, CacheTTL, Transactional } from '@my-girok/nest-common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from './audit-log.service';
import { AdminPayload } from '../types/admin.types';
import {
  CreateServiceFeatureDto,
  UpdateServiceFeatureDto,
  BulkFeatureOperationDto,
  CreateFeaturePermissionDto,
  ServiceFeatureResponseDto,
  FeaturePermissionResponseDto,
  ServiceFeatureListResponseDto,
} from '../dto/service-feature.dto';

// Cache key helper
const FEATURES_CACHE_KEY = (serviceId: string) =>
  CacheKey.make('auth', 'service_features', serviceId);

interface FeatureRow {
  id: string;
  serviceId: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  parentId: string | null;
  path: string;
  depth: number;
  displayOrder: number;
  isActive: boolean;
  isDefault: boolean;
  icon: string | null;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PermissionRow {
  id: string;
  featureId: string;
  serviceId: string;
  targetType: string;
  targetId: string | null;
  action: string;
  isAllowed: boolean;
  conditions: Record<string, unknown> | null;
  validFrom: Date | null;
  validUntil: Date | null;
  createdAt: Date;
  createdBy: string;
}

interface ListOptions {
  category?: string;
  includeInactive?: boolean;
  includeChildren?: boolean;
}

@Injectable()
export class ServiceFeatureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Invalidate feature cache for a service
   */
  private async invalidateCache(serviceId: string): Promise<void> {
    await this.cache.del(FEATURES_CACHE_KEY(serviceId));
    this.eventEmitter.emit('service.features.updated', { serviceId });
  }

  // ============================================================
  // FEATURE CRUD
  // ============================================================

  async list(serviceId: string, options: ListOptions): Promise<ServiceFeatureListResponseDto> {
    // Only cache when fetching all active features with children (default case)
    const isDefaultQuery =
      !options.category && !options.includeInactive && options.includeChildren !== false;
    const cacheKey = FEATURES_CACHE_KEY(serviceId);

    if (isDefaultQuery) {
      const cached = await this.cache.get<ServiceFeatureListResponseDto>(cacheKey);
      if (cached) return cached;
    }

    const categoryFilter = options.category ?? null;
    const includeInactive = options.includeInactive ?? false;

    const features = await this.prisma.$queryRaw<FeatureRow[]>(
      Prisma.sql`
      SELECT
        id, service_id as "serviceId", code, name, description,
        category, parent_id as "parentId", path, depth,
        display_order as "displayOrder", is_active as "isActive",
        is_default as "isDefault", icon, color,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM service_features
      WHERE service_id = ${serviceId}::uuid
        AND (${categoryFilter}::TEXT IS NULL OR category = ${categoryFilter})
        AND (${includeInactive}::BOOLEAN = TRUE OR is_active = TRUE)
      ORDER BY path ASC, display_order ASC
    `,
    );

    let result: ServiceFeatureResponseDto[];
    if (options.includeChildren !== false) {
      result = this.buildTree(features);
    } else {
      result = features as ServiceFeatureResponseDto[];
    }

    const response: ServiceFeatureListResponseDto = {
      data: result,
      meta: {
        total: features.length,
        serviceId,
        category: options.category,
      },
    };

    // Cache default queries for 1 hour
    if (isDefaultQuery) {
      await this.cache.set(cacheKey, response, CacheTTL.STATIC_CONFIG);
    }

    return response;
  }

  async findOne(serviceId: string, id: string): Promise<ServiceFeatureResponseDto> {
    const features = await this.prisma.$queryRaw<FeatureRow[]>(
      Prisma.sql`
      SELECT
        id, service_id as "serviceId", code, name, description,
        category, parent_id as "parentId", path, depth,
        display_order as "displayOrder", is_active as "isActive",
        is_default as "isDefault", icon, color,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM service_features
      WHERE id = ${id}::uuid AND service_id = ${serviceId}::uuid
      LIMIT 1
    `,
    );

    if (!features.length) {
      throw new NotFoundException(`Feature not found: ${id}`);
    }

    return features[0] as ServiceFeatureResponseDto;
  }

  @Transactional()
  async create(
    serviceId: string,
    dto: CreateServiceFeatureDto,
    admin: AdminPayload,
  ): Promise<ServiceFeatureResponseDto> {
    // Calculate path and depth
    let path = `/${dto.code.toLowerCase()}`;
    let depth = 1;

    if (dto.parentId) {
      const parent = await this.findOne(serviceId, dto.parentId);
      path = `${parent.path}/${dto.code.toLowerCase()}`;
      depth = parent.depth + 1;
    }

    // Check max depth
    if (depth > 4) {
      throw new BadRequestException('Maximum feature depth is 4');
    }

    // Check for duplicate code
    const existing = await this.prisma.$queryRaw<{ id: string }[]>(
      Prisma.sql`
      SELECT id FROM service_features
      WHERE service_id = ${serviceId}::uuid AND code = ${dto.code}
      LIMIT 1
    `,
    );

    if (existing.length) {
      throw new BadRequestException(`Feature code ${dto.code} already exists`);
    }

    const featureId = ID.generate();
    const created = await this.prisma.$queryRaw<FeatureRow[]>(
      Prisma.sql`
      INSERT INTO service_features (
        id, service_id, code, name, description, category,
        parent_id, path, depth, display_order, is_active, is_default, icon, color
      )
      VALUES (
        ${featureId}::uuid,
        ${serviceId}::uuid,
        ${dto.code},
        ${dto.name},
        ${dto.description ?? null},
        ${dto.category},
        ${dto.parentId ?? null}::uuid,
        ${path},
        ${depth},
        ${dto.displayOrder ?? 0},
        ${dto.isActive ?? true},
        ${dto.isDefault ?? true},
        ${dto.icon ?? null},
        ${dto.color ?? null}
      )
      RETURNING
        id, service_id as "serviceId", code, name, description,
        category, parent_id as "parentId", path, depth,
        display_order as "displayOrder", is_active as "isActive",
        is_default as "isDefault", icon, color,
        created_at as "createdAt", updated_at as "updatedAt"
    `,
    );

    const feature = created[0] as ServiceFeatureResponseDto;

    await this.auditLogService.log({
      resource: 'service_feature',
      action: 'create',
      targetId: feature.id,
      targetType: 'ServiceFeature',
      targetIdentifier: feature.code,
      afterState: feature,
      admin,
    });

    await this.invalidateCache(serviceId);

    return feature;
  }

  @Transactional()
  async update(
    serviceId: string,
    id: string,
    dto: UpdateServiceFeatureDto,
    admin: AdminPayload,
  ): Promise<ServiceFeatureResponseDto> {
    const beforeFeature = await this.findOne(serviceId, id);

    // Handle parent change
    let path = beforeFeature.path;
    let depth = beforeFeature.depth;
    const oldPath = beforeFeature.path;
    let pathChanged = false;

    if (dto.parentId !== undefined && dto.parentId !== beforeFeature.parentId) {
      pathChanged = true;
      if (dto.parentId) {
        const parent = await this.findOne(serviceId, dto.parentId);
        path = `${parent.path}/${beforeFeature.code.toLowerCase()}`;
        depth = parent.depth + 1;

        if (depth > 4) {
          throw new BadRequestException('Maximum feature depth is 4');
        }

        // Check if new depth would exceed max for any children
        const maxChildDepth = await this.getMaxChildDepth(id);
        if (maxChildDepth > 0 && depth + maxChildDepth > 4) {
          throw new BadRequestException(
            `Moving to this parent would exceed maximum depth for child features (current max child depth: ${maxChildDepth})`,
          );
        }
      } else {
        path = `/${beforeFeature.code.toLowerCase()}`;
        depth = 1;
      }
    }

    const updated = await this.prisma.$queryRaw<FeatureRow[]>(
      Prisma.sql`
      UPDATE service_features
      SET
        name = COALESCE(${dto.name ?? null}, name),
        description = COALESCE(${dto.description ?? null}, description),
        category = COALESCE(${dto.category ?? null}, category),
        parent_id = COALESCE(${dto.parentId ?? null}::uuid, parent_id),
        path = ${path},
        depth = ${depth},
        display_order = COALESCE(${dto.displayOrder ?? null}, display_order),
        is_active = COALESCE(${dto.isActive ?? null}::BOOLEAN, is_active),
        is_default = COALESCE(${dto.isDefault ?? null}::BOOLEAN, is_default),
        icon = COALESCE(${dto.icon ?? null}, icon),
        color = COALESCE(${dto.color ?? null}, color),
        updated_at = NOW()
      WHERE id = ${id}::uuid AND service_id = ${serviceId}::uuid
      RETURNING
        id, service_id as "serviceId", code, name, description,
        category, parent_id as "parentId", path, depth,
        display_order as "displayOrder", is_active as "isActive",
        is_default as "isDefault", icon, color,
        created_at as "createdAt", updated_at as "updatedAt"
    `,
    );

    const afterFeature = updated[0] as ServiceFeatureResponseDto;

    // Update all children paths if parent changed
    if (pathChanged) {
      const depthDiff = depth - beforeFeature.depth;
      await this.prisma.$executeRaw(
        Prisma.sql`
        UPDATE service_features
        SET
          path = ${path} || SUBSTRING(path FROM LENGTH(${oldPath}) + 1),
          depth = depth + ${depthDiff},
          updated_at = NOW()
        WHERE service_id = ${serviceId}::uuid
          AND path LIKE ${oldPath + '/%'}
      `,
      );
    }

    await this.auditLogService.log({
      resource: 'service_feature',
      action: 'update',
      targetId: id,
      targetType: 'ServiceFeature',
      targetIdentifier: afterFeature.code,
      beforeState: beforeFeature,
      afterState: afterFeature,
      admin,
    });

    await this.invalidateCache(serviceId);

    return afterFeature;
  }

  /**
   * Get the maximum relative depth of all descendants
   */
  private async getMaxChildDepth(featureId: string): Promise<number> {
    const result = await this.prisma.$queryRaw<{ maxDepth: number | null }[]>(
      Prisma.sql`
      SELECT MAX(c.depth - p.depth) as "maxDepth"
      FROM service_features c
      JOIN service_features p ON p.id = ${featureId}::uuid
      WHERE c.path LIKE p.path || '/%'
    `,
    );
    return result[0]?.maxDepth ?? 0;
  }

  @Transactional()
  async delete(serviceId: string, id: string, admin: AdminPayload): Promise<{ success: boolean }> {
    const feature = await this.findOne(serviceId, id);

    // Check for children
    const children = await this.prisma.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`
      SELECT COUNT(*) as count FROM service_features
      WHERE parent_id = ${id}::uuid
    `,
    );

    if (Number(children[0].count) > 0) {
      throw new BadRequestException('Cannot delete feature with children. Delete children first.');
    }

    await this.prisma.$executeRaw(
      Prisma.sql`
      DELETE FROM service_features
      WHERE id = ${id}::uuid AND service_id = ${serviceId}::uuid
    `,
    );

    await this.auditLogService.log({
      resource: 'service_feature',
      action: 'delete',
      targetId: id,
      targetType: 'ServiceFeature',
      targetIdentifier: feature.code,
      beforeState: feature,
      admin,
    });

    await this.invalidateCache(serviceId);

    return { success: true };
  }

  @Transactional()
  async bulk(
    serviceId: string,
    dto: BulkFeatureOperationDto,
    admin: AdminPayload,
  ): Promise<ServiceFeatureListResponseDto> {
    switch (dto.operation) {
      case 'reorder': {
        // Optimized: Single UPDATE with CASE WHEN instead of N individual queries
        const validItems = dto.items.filter((item) => item.id && item.displayOrder !== undefined);

        if (validItems.length > 0) {
          // Build CASE WHEN clause for batch update
          const caseClauseParts = validItems.map(
            (item) => Prisma.sql`WHEN id = ${item.id}::uuid THEN ${item.displayOrder}`,
          );

          const idList = validItems.map((item) => Prisma.sql`${item.id}::uuid`);

          await this.prisma.$executeRaw(
            Prisma.sql`
            UPDATE service_features
            SET
              display_order = CASE ${Prisma.join(caseClauseParts, ' ')} ELSE display_order END,
              updated_at = NOW()
            WHERE service_id = ${serviceId}::uuid
              AND id IN (${Prisma.join(idList, ', ')})
          `,
          );
        }
        break;
      }
      // Other operations can be added as needed
    }

    await this.auditLogService.log({
      resource: 'service_feature',
      action: `bulk_${dto.operation}`,
      targetId: serviceId,
      targetType: 'Service',
      targetIdentifier: `bulk:${dto.items.length}`,
      afterState: dto,
      admin,
    });

    await this.invalidateCache(serviceId);

    return this.list(serviceId, { includeChildren: true });
  }

  // ============================================================
  // PERMISSION MANAGEMENT
  // ============================================================

  async listPermissions(featureId: string): Promise<FeaturePermissionResponseDto[]> {
    const permissions = await this.prisma.$queryRaw<PermissionRow[]>(
      Prisma.sql`
      SELECT
        id, feature_id as "featureId", service_id as "serviceId",
        target_type as "targetType", target_id as "targetId",
        action, is_allowed as "isAllowed", conditions,
        valid_from as "validFrom", valid_until as "validUntil",
        created_at as "createdAt", created_by as "createdBy"
      FROM service_feature_permissions
      WHERE feature_id = ${featureId}::uuid
      ORDER BY created_at DESC
    `,
    );

    return permissions as FeaturePermissionResponseDto[];
  }

  async createPermission(
    serviceId: string,
    featureId: string,
    dto: CreateFeaturePermissionDto,
    admin: AdminPayload,
  ): Promise<FeaturePermissionResponseDto> {
    // Verify feature exists
    await this.findOne(serviceId, featureId);

    const permId = ID.generate();
    const created = await this.prisma.$queryRaw<PermissionRow[]>(
      Prisma.sql`
      INSERT INTO service_feature_permissions (
        id, feature_id, service_id, target_type, target_id,
        action, is_allowed, conditions, valid_from, valid_until, created_by
      )
      VALUES (
        ${permId}::uuid,
        ${featureId}::uuid,
        ${serviceId}::uuid,
        ${dto.targetType}::permission_target_type,
        ${dto.targetId ?? null}::uuid,
        ${dto.action}::feature_action,
        ${dto.isAllowed ?? true},
        ${dto.conditions ? JSON.stringify(dto.conditions) : null}::jsonb,
        ${dto.validFrom ? new Date(dto.validFrom) : null}::timestamptz,
        ${dto.validUntil ? new Date(dto.validUntil) : null}::timestamptz,
        ${admin.sub}::uuid
      )
      RETURNING
        id, feature_id as "featureId", service_id as "serviceId",
        target_type as "targetType", target_id as "targetId",
        action, is_allowed as "isAllowed", conditions,
        valid_from as "validFrom", valid_until as "validUntil",
        created_at as "createdAt", created_by as "createdBy"
    `,
    );

    const permission = created[0] as FeaturePermissionResponseDto;

    await this.auditLogService.log({
      resource: 'feature_permission',
      action: 'create',
      targetId: permission.id,
      targetType: 'ServiceFeaturePermission',
      targetIdentifier: `${dto.targetType}:${dto.action}`,
      afterState: permission,
      admin,
    });

    return permission;
  }

  async deletePermission(
    serviceId: string,
    permId: string,
    admin: AdminPayload,
  ): Promise<{ success: boolean }> {
    // Get permission for audit
    const permissions = await this.prisma.$queryRaw<PermissionRow[]>(
      Prisma.sql`
      SELECT
        id, feature_id as "featureId", service_id as "serviceId",
        target_type as "targetType", action
      FROM service_feature_permissions
      WHERE id = ${permId}::uuid AND service_id = ${serviceId}::uuid
      LIMIT 1
    `,
    );

    if (!permissions.length) {
      throw new NotFoundException(`Permission not found: ${permId}`);
    }

    await this.prisma.$executeRaw(
      Prisma.sql`
      DELETE FROM service_feature_permissions
      WHERE id = ${permId}::uuid AND service_id = ${serviceId}::uuid
    `,
    );

    await this.auditLogService.log({
      resource: 'feature_permission',
      action: 'delete',
      targetId: permId,
      targetType: 'ServiceFeaturePermission',
      targetIdentifier: `${permissions[0].targetType}:${permissions[0].action}`,
      beforeState: permissions[0],
      admin,
    });

    return { success: true };
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private buildTree(features: FeatureRow[]): ServiceFeatureResponseDto[] {
    const map = new Map<string, ServiceFeatureResponseDto>();
    const roots: ServiceFeatureResponseDto[] = [];

    features.forEach((f) => {
      map.set(f.id, { ...f, children: [] } as ServiceFeatureResponseDto);
    });

    features.forEach((f) => {
      const node = map.get(f.id)!;
      if (f.parentId && map.has(f.parentId)) {
        map.get(f.parentId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }
}
