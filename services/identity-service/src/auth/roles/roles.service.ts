import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { AuthPrismaService } from '../../database/auth-prisma.service';
import {
  CreateRoleDto,
  RoleScope,
  UpdateRoleDto,
  QueryRoleDto,
  AssignPermissionsDto,
  RevokePermissionsDto,
} from './dto';
import {
  RoleEntity,
  RoleSummary,
  RoleListResponse,
  RoleWithPermissions,
  RoleHierarchyNode,
} from './entities/role.entity';
import { Prisma, Role } from '.prisma/identity-auth-client';

// Type for Role with children for hierarchy building
type RoleWithChildren = Role & { children?: RoleWithChildren[]; parent?: Role | null };

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private readonly prisma: AuthPrismaService) {}

  /**
   * Create a new role
   */
  async create(dto: CreateRoleDto): Promise<RoleEntity> {
    // Check for duplicate role
    const existingRole = await this.prisma.role.findFirst({
      where: {
        name: dto.name,
        scope: dto.scope,
        serviceId: dto.serviceId ?? null,
        countryCode: dto.countryCode ?? null,
      },
    });

    if (existingRole) {
      throw new ConflictException(`Role with name "${dto.name}" already exists in this scope`);
    }

    // Validate parent role if provided
    if (dto.parentId) {
      const parentRole = await this.prisma.role.findUnique({
        where: { id: dto.parentId },
      });

      if (!parentRole) {
        throw new NotFoundException(`Parent role with ID "${dto.parentId}" not found`);
      }

      // Parent role must be in the same scope
      if (parentRole.scope !== dto.scope) {
        throw new BadRequestException('Parent role must be in the same scope');
      }

      // Prevent circular hierarchy
      const ancestors = await this.getAncestors(dto.parentId);
      if (ancestors.length > 10) {
        throw new BadRequestException('Role hierarchy depth exceeds maximum limit');
      }
    }

    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        displayName: dto.displayName,
        description: dto.description,
        scope: dto.scope,
        level: dto.level ?? 0,
        parentId: dto.parentId,
        serviceId: dto.serviceId,
        countryCode: dto.countryCode,
        isSystem: dto.isSystem ?? false,
        isActive: true,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    this.logger.log(`Created role: ${role.name} (${role.id})`);

    return this.mapToEntity(role);
  }

  /**
   * Get role by ID
   */
  async findById(id: string): Promise<RoleEntity> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

    return this.mapToEntity(role);
  }

  /**
   * Get role by name and scope
   */
  async findByName(
    name: string,
    scope: RoleScope,
    serviceId?: string,
    countryCode?: string,
  ): Promise<RoleEntity | null> {
    const role = await this.prisma.role.findFirst({
      where: {
        name,
        scope,
        serviceId: serviceId ?? null,
        countryCode: countryCode ?? null,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    return role ? this.mapToEntity(role) : null;
  }

  /**
   * Update role
   */
  async update(id: string, dto: UpdateRoleDto): Promise<RoleEntity> {
    const existingRole = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!existingRole) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

    if (existingRole.isSystem) {
      throw new BadRequestException('System roles cannot be modified');
    }

    // Validate parent role if being updated
    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new BadRequestException('Role cannot be its own parent');
      }

      if (dto.parentId) {
        const parentRole = await this.prisma.role.findUnique({
          where: { id: dto.parentId },
        });

        if (!parentRole) {
          throw new NotFoundException(`Parent role with ID "${dto.parentId}" not found`);
        }

        if (parentRole.scope !== existingRole.scope) {
          throw new BadRequestException('Parent role must be in the same scope');
        }

        // Check for circular reference
        const descendants = await this.getDescendants(id);
        if (descendants.some((d) => d.id === dto.parentId)) {
          throw new BadRequestException('Circular hierarchy detected');
        }
      }
    }

    const role = await this.prisma.role.update({
      where: { id },
      data: {
        displayName: dto.displayName,
        description: dto.description,
        level: dto.level,
        parentId: dto.parentId,
        isActive: dto.isActive,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    this.logger.log(`Updated role: ${role.name} (${role.id})`);

    return this.mapToEntity(role);
  }

  /**
   * Delete role
   */
  async delete(id: string): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        children: true,
        operators: { take: 1 },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    if (role.children.length > 0) {
      throw new BadRequestException('Cannot delete role with child roles');
    }

    if (role.operators.length > 0) {
      throw new BadRequestException('Cannot delete role assigned to operators');
    }

    await this.prisma.role.delete({
      where: { id },
    });

    this.logger.log(`Deleted role: ${role.name} (${id})`);
  }

  /**
   * List roles with pagination and filters
   */
  async findAll(query: QueryRoleDto): Promise<RoleListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.RoleWhereInput = {};

    if (query.scope) {
      where.scope = query.scope as RoleScope;
    }

    if (query.serviceId) {
      where.serviceId = query.serviceId;
    }

    if (query.countryCode) {
      where.countryCode = query.countryCode;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.isSystem !== undefined) {
      where.isSystem = query.isSystem;
    }

    const orderBy: Prisma.RoleOrderByWithRelationInput = {};
    if (query.sort) {
      orderBy[query.sort as keyof Prisma.RoleOrderByWithRelationInput] = query.order ?? 'asc';
    } else {
      orderBy.level = 'asc';
    }

    const [roles, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.role.count({ where }),
    ]);

    return {
      data: roles.map((role) => this.mapToSummary(role)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get role with permissions
   */
  async findWithPermissions(id: string): Promise<RoleWithPermissions> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

    const entity = this.mapToEntity(role) as RoleWithPermissions;
    entity.permissions = role.rolePermissions.map(
      (rp) => `${rp.permission.resource}:${rp.permission.action}`,
    );

    return entity;
  }

  /**
   * Assign permissions to role
   */
  async assignPermissions(id: string, dto: AssignPermissionsDto): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

    // Verify all permissions exist
    const permissions = await this.prisma.permission.findMany({
      where: {
        id: { in: dto.permissionIds },
      },
    });

    if (permissions.length !== dto.permissionIds.length) {
      throw new BadRequestException('One or more permissions not found');
    }

    // Create role-permission assignments
    await this.prisma.rolePermission.createMany({
      data: dto.permissionIds.map((permissionId) => ({
        roleId: id,
        permissionId,
      })),
      skipDuplicates: true,
    });

    this.logger.log(`Assigned ${dto.permissionIds.length} permissions to role ${id}`);
  }

  /**
   * Revoke permissions from role
   */
  async revokePermissions(id: string, dto: RevokePermissionsDto): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

    await this.prisma.rolePermission.deleteMany({
      where: {
        roleId: id,
        permissionId: { in: dto.permissionIds },
      },
    });

    this.logger.log(`Revoked ${dto.permissionIds.length} permissions from role ${id}`);
  }

  /**
   * Get role permissions
   */
  async getPermissions(id: string): Promise<string[]> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

    return role.rolePermissions.map((rp) => `${rp.permission.resource}:${rp.permission.action}`);
  }

  /**
   * Get role hierarchy as tree
   */
  async getHierarchy(
    scope: RoleScope,
    serviceId?: string,
    countryCode?: string,
  ): Promise<RoleHierarchyNode[]> {
    const roles = await this.prisma.role.findMany({
      where: {
        scope,
        serviceId: serviceId ?? null,
        countryCode: countryCode ?? null,
        parentId: null, // Only root roles
        isActive: true,
      },
      include: {
        children: {
          include: {
            children: {
              include: {
                children: true,
              },
            },
          },
        },
      },
      orderBy: { level: 'asc' },
    });

    return roles.map((role) => this.buildHierarchyNode(role));
  }

  /**
   * Get all ancestor roles
   */
  private async getAncestors(roleId: string): Promise<RoleSummary[]> {
    const ancestors: RoleSummary[] = [];
    let currentId: string | null = roleId;

    while (currentId) {
      const role: {
        id: string;
        name: string;
        displayName: string | null;
        scope: string;
        level: number;
        isSystem: boolean;
        isActive: boolean;
        parentId: string | null;
      } | null = await this.prisma.role.findUnique({
        where: { id: currentId },
        select: {
          id: true,
          name: true,
          displayName: true,
          scope: true,
          level: true,
          isSystem: true,
          isActive: true,
          parentId: true,
        },
      });

      if (!role || !role.parentId) break;

      ancestors.push(this.mapToSummary(role));
      currentId = role.parentId;
    }

    return ancestors;
  }

  /**
   * Get all descendant roles
   */
  private async getDescendants(roleId: string): Promise<RoleSummary[]> {
    const descendants: RoleSummary[] = [];

    const collectDescendants = async (parentId: string) => {
      const children = await this.prisma.role.findMany({
        where: { parentId },
        select: {
          id: true,
          name: true,
          displayName: true,
          scope: true,
          level: true,
          isSystem: true,
          isActive: true,
        },
      });

      for (const child of children) {
        descendants.push(this.mapToSummary(child));
        await collectDescendants(child.id);
      }
    };

    await collectDescendants(roleId);
    return descendants;
  }

  /**
   * Build hierarchy node recursively
   */
  private buildHierarchyNode(role: RoleWithChildren): RoleHierarchyNode {
    return {
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      scope: role.scope as RoleScope,
      level: role.level,
      isSystem: role.isSystem,
      isActive: role.isActive,
      children: (role.children || []).map((child) => this.buildHierarchyNode(child)),
    };
  }

  /**
   * Map database model to entity
   */
  private mapToEntity(role: RoleWithChildren): RoleEntity {
    return {
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      scope: role.scope as RoleScope,
      level: role.level,
      parentId: role.parentId,
      isSystem: role.isSystem,
      isActive: role.isActive,
      serviceId: role.serviceId,
      countryCode: role.countryCode,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      parent: role.parent ? this.mapToEntity(role.parent as RoleWithChildren) : undefined,
      children: role.children?.map((child) => this.mapToEntity(child)),
    };
  }

  /**
   * Map database model to summary
   */
  private mapToSummary(role: {
    id: string;
    name: string;
    displayName: string | null;
    scope: string;
    level: number;
    isSystem: boolean;
    isActive: boolean;
  }): RoleSummary {
    return {
      id: role.id,
      name: role.name,
      displayName: role.displayName ?? role.name,
      scope: role.scope as RoleScope,
      level: role.level,
      isSystem: role.isSystem,
      isActive: role.isActive,
    };
  }
}
