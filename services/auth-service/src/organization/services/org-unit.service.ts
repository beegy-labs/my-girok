import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '../../../node_modules/.prisma/auth-client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateOrgUnitDto,
  UpdateOrgUnitDto,
  OrgUnitResponseDto,
  OrgUnitTreeNodeDto,
  OrgUnitListQueryDto,
} from '../dto/org-unit.dto';

@Injectable()
export class OrgUnitService {
  private readonly logger = new Logger(OrgUnitService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrgUnitDto): Promise<OrgUnitResponseDto> {
    this.logger.log(`Creating organization unit: ${dto.code}`);

    // Check if code already exists
    const existing = await this.prisma.organization_units.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Organization unit with code ${dto.code} already exists`);
    }

    // Validate parent exists if parentId is provided
    if (dto.parentId) {
      const parent = await this.prisma.organization_units.findUnique({
        where: { id: dto.parentId },
      });

      if (!parent) {
        throw new NotFoundException(`Parent organization unit with ID ${dto.parentId} not found`);
      }
    }

    const orgUnit = await this.prisma.organization_units.create({
      data: {
        code: dto.code,
        name: dto.name,
        unit_type: dto.orgType as any,
        level: 0, // TODO: Calculate based on parent
        path: '/', // TODO: Calculate based on parent
        parent_id: dto.parentId,
        head_admin_id: dto.managerAdminId,
        is_active: dto.isActive ?? true,
      },
    });

    return this.mapToResponse(orgUnit);
  }

  async findAll(query?: OrgUnitListQueryDto): Promise<OrgUnitResponseDto[]> {
    this.logger.log('Fetching all organization units');

    const where: Prisma.organization_unitsWhereInput = {};

    if (query?.orgType) {
      where.unit_type = query.orgType as any;
    }

    if (query?.parentId !== undefined) {
      where.parent_id = query.parentId;
    }

    if (query?.isActive !== undefined) {
      where.is_active = query.isActive;
    }

    const orgUnits = await this.prisma.organization_units.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    });

    return orgUnits.map((ou) => this.mapToResponse(ou));
  }

  async findTree(): Promise<OrgUnitTreeNodeDto[]> {
    this.logger.log('Building organization tree');

    // Get all org units
    const allOrgUnits = await this.prisma.organization_units.findMany({
      where: { is_active: true },
      orderBy: [{ name: 'asc' }],
    });

    // Find root nodes (no parent)
    const rootNodes = allOrgUnits.filter((ou) => !ou.parent_id);

    // Build tree recursively
    return rootNodes.map((root) => this.buildTree(root, allOrgUnits));
  }

  async findOne(id: string): Promise<OrgUnitResponseDto> {
    this.logger.log(`Fetching organization unit: ${id}`);

    const orgUnit = await this.prisma.organization_units.findUnique({
      where: { id },
    });

    if (!orgUnit) {
      throw new NotFoundException(`Organization unit with ID ${id} not found`);
    }

    return this.mapToResponse(orgUnit);
  }

  async findChildren(id: string): Promise<OrgUnitResponseDto[]> {
    this.logger.log(`Fetching children of organization unit: ${id}`);

    // Verify parent exists
    await this.findOne(id);

    const children = await this.prisma.organization_units.findMany({
      where: { parent_id: id, is_active: true },
      orderBy: [{ name: 'asc' }],
    });

    return children.map((ou) => this.mapToResponse(ou));
  }

  async update(id: string, dto: UpdateOrgUnitDto): Promise<OrgUnitResponseDto> {
    this.logger.log(`Updating organization unit: ${id}`);

    // Check if exists
    await this.findOne(id);

    // Validate parent exists if parentId is provided
    if (dto.parentId) {
      // Cannot set self as parent
      if (dto.parentId === id) {
        throw new BadRequestException('Organization unit cannot be its own parent');
      }

      const parent = await this.prisma.organization_units.findUnique({
        where: { id: dto.parentId },
      });

      if (!parent) {
        throw new NotFoundException(`Parent organization unit with ID ${dto.parentId} not found`);
      }

      // Check for circular reference (parent's parent chain)
      await this.checkCircularReference(id, dto.parentId);
    }

    const orgUnit = await this.prisma.organization_units.update({
      where: { id },
      data: {
        name: dto.name,
        unit_type: dto.orgType as any,
        parent_id: dto.parentId,
        head_admin_id: dto.managerAdminId,
        is_active: dto.isActive,
      },
    });

    return this.mapToResponse(orgUnit);
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting organization unit: ${id}`);

    // Check if exists
    await this.findOne(id);

    // Check if has children
    const children = await this.prisma.organization_units.findMany({
      where: { parent_id: id },
    });

    if (children.length > 0) {
      throw new BadRequestException(
        `Cannot delete organization unit with ${children.length} children. Delete or reassign children first.`,
      );
    }

    await this.prisma.organization_units.delete({
      where: { id },
    });

    this.logger.log(`Organization unit ${id} deleted successfully`);
  }

  /**
   * Check for circular reference in parent-child relationships
   * Throws BadRequestException if setting newParentId as parent would create a cycle
   */
  private async checkCircularReference(nodeId: string, newParentId: string): Promise<void> {
    let currentId = newParentId;
    const visited = new Set<string>();

    // Traverse up the parent chain from the new parent
    while (currentId) {
      // If we encounter the node being updated, it's a circular reference
      if (currentId === nodeId) {
        throw new BadRequestException(
          'Circular reference detected: Cannot set this parent as it would create a cycle in the organization hierarchy',
        );
      }

      // Prevent infinite loops by tracking visited nodes
      if (visited.has(currentId)) {
        // If we revisit a node, there's already a cycle in existing data
        this.logger.warn(`Existing circular reference detected at node ${currentId}`);
        break;
      }
      visited.add(currentId);

      // Move up to the next parent
      const parent = await this.prisma.organization_units.findUnique({
        where: { id: currentId },
        select: { parent_id: true },
      });

      if (!parent || !parent.parent_id) {
        break;
      }

      currentId = parent.parent_id;
    }
  }

  private buildTree(node: any, allNodes: any[]): OrgUnitTreeNodeDto {
    const children = allNodes
      .filter((n) => n.parent_id === node.id)
      .map((child) => this.buildTree(child, allNodes));

    return {
      id: node.id,
      code: node.code,
      name: node.name,
      orgType: node.org_type,
      parentId: node.parent_id,
      managerAdminId: node.manager_admin_id,
      description: node.description,
      isActive: node.is_active,
      children,
      createdAt: node.created_at,
      updatedAt: node.updated_at,
    };
  }

  private mapToResponse(orgUnit: any): OrgUnitResponseDto {
    return {
      id: orgUnit.id,
      code: orgUnit.code,
      name: orgUnit.name,
      orgType: orgUnit.org_type,
      parentId: orgUnit.parent_id,
      managerAdminId: orgUnit.manager_admin_id,
      description: orgUnit.description,
      isActive: orgUnit.is_active,
      createdAt: orgUnit.created_at,
      updatedAt: orgUnit.updated_at,
    };
  }
}
