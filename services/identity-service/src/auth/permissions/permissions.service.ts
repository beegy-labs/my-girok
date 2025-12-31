import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { AuthPrismaService } from '../../database/auth-prisma.service';
import {
  CreatePermissionDto,
  PermissionScope,
  UpdatePermissionDto,
  QueryPermissionDto,
  CheckPermissionDto,
  PermissionCheckResult,
} from './dto';
import {
  PermissionEntity,
  PermissionSummary,
  PermissionListResponse,
  PermissionsByCategory,
} from './entities/permission.entity';
import { Prisma, Permission } from '.prisma/identity-auth-client';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(private readonly prisma: AuthPrismaService) {}

  /**
   * Create a new permission
   */
  async create(dto: CreatePermissionDto): Promise<PermissionEntity> {
    // Check for duplicate permission
    const existing = await this.prisma.permission.findFirst({
      where: {
        resource: dto.resource,
        action: dto.action,
        serviceId: dto.serviceId ?? null,
      },
    });

    if (existing) {
      throw new ConflictException(`Permission "${dto.resource}:${dto.action}" already exists`);
    }

    const permission = await this.prisma.permission.create({
      data: {
        resource: dto.resource,
        action: dto.action,
        displayName: dto.displayName,
        description: dto.description,
        category: dto.category,
        scope: dto.scope,
        serviceId: dto.serviceId,
      },
    });

    this.logger.log(
      `Created permission: ${permission.resource}:${permission.action} (${permission.id})`,
    );

    return this.mapToEntity(permission);
  }

  /**
   * Get permission by ID
   */
  async findById(id: string): Promise<PermissionEntity> {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID "${id}" not found`);
    }

    return this.mapToEntity(permission);
  }

  /**
   * Get permission by resource and action
   */
  async findByResourceAction(
    resource: string,
    action: string,
    serviceId?: string,
  ): Promise<PermissionEntity | null> {
    const permission = await this.prisma.permission.findFirst({
      where: {
        resource,
        action,
        serviceId: serviceId ?? null,
      },
    });

    return permission ? this.mapToEntity(permission) : null;
  }

  /**
   * Update permission
   */
  async update(id: string, dto: UpdatePermissionDto): Promise<PermissionEntity> {
    const existing = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Permission with ID "${id}" not found`);
    }

    const permission = await this.prisma.permission.update({
      where: { id },
      data: {
        displayName: dto.displayName,
        description: dto.description,
        category: dto.category,
      },
    });

    this.logger.log(
      `Updated permission: ${permission.resource}:${permission.action} (${permission.id})`,
    );

    return this.mapToEntity(permission);
  }

  /**
   * Delete permission
   */
  async delete(id: string): Promise<void> {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
      include: {
        rolePermissions: { take: 1 },
        operatorPermissions: { take: 1 },
      },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID "${id}" not found`);
    }

    if (permission.rolePermissions.length > 0 || permission.operatorPermissions.length > 0) {
      throw new ConflictException(
        'Cannot delete permission that is assigned to roles or operators',
      );
    }

    await this.prisma.permission.delete({
      where: { id },
    });

    this.logger.log(`Deleted permission: ${permission.resource}:${permission.action} (${id})`);
  }

  /**
   * List permissions with pagination and filters
   */
  async findAll(query: QueryPermissionDto): Promise<PermissionListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PermissionWhereInput = {};

    if (query.resource) {
      where.resource = { contains: query.resource, mode: 'insensitive' };
    }

    if (query.action) {
      where.action = query.action;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.scope) {
      where.scope = query.scope;
    }

    if (query.serviceId) {
      where.serviceId = query.serviceId;
    }

    const orderBy: Prisma.PermissionOrderByWithRelationInput = {};
    if (query.sort) {
      orderBy[query.sort as keyof Prisma.PermissionOrderByWithRelationInput] = query.order ?? 'asc';
    } else {
      orderBy.resource = 'asc';
    }

    const [permissions, total] = await Promise.all([
      this.prisma.permission.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.permission.count({ where }),
    ]);

    return {
      data: permissions.map((p) => this.mapToSummary(p)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all permissions grouped by category
   */
  async findByCategory(
    scope?: PermissionScope,
    serviceId?: string,
  ): Promise<PermissionsByCategory[]> {
    const where: Prisma.PermissionWhereInput = {};

    if (scope) {
      where.scope = scope;
    }

    if (serviceId) {
      where.serviceId = serviceId;
    }

    const permissions = await this.prisma.permission.findMany({
      where,
      orderBy: [{ category: 'asc' }, { resource: 'asc' }, { action: 'asc' }],
    });

    // Group by category
    const grouped = new Map<string, PermissionSummary[]>();

    for (const permission of permissions) {
      const category = permission.category;
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(this.mapToSummary(permission));
    }

    return Array.from(grouped.entries()).map(([category, perms]) => ({
      category,
      permissions: perms,
    }));
  }

  /**
   * Check if an account has a specific permission
   */
  async checkPermission(dto: CheckPermissionDto): Promise<PermissionCheckResult> {
    // Find the permission
    const permission = await this.prisma.permission.findFirst({
      where: {
        resource: dto.resource,
        action: dto.action,
        OR: [{ serviceId: dto.serviceId ?? null }, { serviceId: null }],
      },
    });

    if (!permission) {
      return {
        allowed: false,
        matchedRoles: [],
        matchedPermissions: [],
        deniedReason: `Permission "${dto.resource}:${dto.action}" does not exist`,
      };
    }

    // Find operator for this account
    const operator = await this.prisma.operator.findFirst({
      where: {
        accountId: dto.accountId,
        serviceId: dto.serviceId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!operator) {
      return {
        allowed: false,
        matchedRoles: [],
        matchedPermissions: [],
        deniedReason: 'No active operator found for this account and service',
      };
    }

    const matchedRoles: string[] = [];
    const matchedPermissions: string[] = [];

    // Check role permissions
    for (const rp of operator.role.rolePermissions) {
      if (rp.permission.resource === dto.resource && rp.permission.action === dto.action) {
        matchedRoles.push(operator.role.name);
        matchedPermissions.push(`${rp.permission.resource}:${rp.permission.action}`);
      }
    }

    // Check direct operator permissions
    for (const op of operator.permissions) {
      if (op.permission.resource === dto.resource && op.permission.action === dto.action) {
        matchedPermissions.push(`${op.permission.resource}:${op.permission.action}`);
      }
    }

    const allowed = matchedPermissions.length > 0;

    return {
      allowed,
      matchedRoles: [...new Set(matchedRoles)],
      matchedPermissions: [...new Set(matchedPermissions)],
      deniedReason: allowed
        ? undefined
        : `Account does not have permission "${dto.resource}:${dto.action}"`,
    };
  }

  /**
   * Get all permissions for an operator (role + direct)
   */
  async getOperatorPermissions(operatorId: string): Promise<string[]> {
    const operator = await this.prisma.operator.findUnique({
      where: { id: operatorId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!operator) {
      throw new NotFoundException(`Operator with ID "${operatorId}" not found`);
    }

    const permissions = new Set<string>();

    // Add role permissions
    for (const rp of operator.role.rolePermissions) {
      permissions.add(`${rp.permission.resource}:${rp.permission.action}`);
    }

    // Add direct permissions
    for (const op of operator.permissions) {
      permissions.add(`${op.permission.resource}:${op.permission.action}`);
    }

    return Array.from(permissions).sort();
  }

  /**
   * Map database model to entity
   */
  private mapToEntity(permission: Permission): PermissionEntity {
    return {
      id: permission.id,
      resource: permission.resource,
      action: permission.action,
      displayName: permission.displayName,
      description: permission.description,
      category: permission.category,
      scope: permission.scope as PermissionScope,
      serviceId: permission.serviceId,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
    };
  }

  /**
   * Map database model to summary
   */
  private mapToSummary(permission: Permission): PermissionSummary {
    return {
      id: permission.id,
      resource: permission.resource,
      action: permission.action,
      displayName: permission.displayName,
      category: permission.category,
      scope: permission.scope as PermissionScope,
    };
  }
}
