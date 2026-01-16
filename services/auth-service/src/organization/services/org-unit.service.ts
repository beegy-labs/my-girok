import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
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
    const existing = await this.prisma.organizationUnit.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Organization unit with code ${dto.code} already exists`);
    }

    // Validate parent exists if parentId is provided
    if (dto.parentId) {
      const parent = await this.prisma.organizationUnit.findUnique({
        where: { id: dto.parentId },
      });

      if (!parent) {
        throw new NotFoundException(`Parent organization unit with ID ${dto.parentId} not found`);
      }
    }

    const orgUnit = await this.prisma.organizationUnit.create({
      data: {
        code: dto.code,
        name: dto.name,
        org_type: dto.orgType,
        parent_id: dto.parentId,
        manager_admin_id: dto.managerAdminId,
        description: dto.description,
        is_active: dto.isActive ?? true,
      },
    });

    return this.mapToResponse(orgUnit);
  }

  async findAll(query?: OrgUnitListQueryDto): Promise<OrgUnitResponseDto[]> {
    this.logger.log('Fetching all organization units');

    const where: any = {};

    if (query?.orgType) {
      where.org_type = query.orgType;
    }

    if (query?.parentId !== undefined) {
      where.parent_id = query.parentId;
    }

    if (query?.isActive !== undefined) {
      where.is_active = query.isActive;
    }

    const orgUnits = await this.prisma.organizationUnit.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    });

    return orgUnits.map((ou) => this.mapToResponse(ou));
  }

  async findTree(): Promise<OrgUnitTreeNodeDto[]> {
    this.logger.log('Building organization tree');

    // Get all org units
    const allOrgUnits = await this.prisma.organizationUnit.findMany({
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

    const orgUnit = await this.prisma.organizationUnit.findUnique({
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

    const children = await this.prisma.organizationUnit.findMany({
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

      const parent = await this.prisma.organizationUnit.findUnique({
        where: { id: dto.parentId },
      });

      if (!parent) {
        throw new NotFoundException(`Parent organization unit with ID ${dto.parentId} not found`);
      }

      // TODO: Check for circular reference (parent's parent chain)
    }

    const orgUnit = await this.prisma.organizationUnit.update({
      where: { id },
      data: {
        name: dto.name,
        org_type: dto.orgType,
        parent_id: dto.parentId,
        manager_admin_id: dto.managerAdminId,
        description: dto.description,
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
    const children = await this.prisma.organizationUnit.findMany({
      where: { parent_id: id },
    });

    if (children.length > 0) {
      throw new BadRequestException(
        `Cannot delete organization unit with ${children.length} children. Delete or reassign children first.`,
      );
    }

    await this.prisma.organizationUnit.delete({
      where: { id },
    });

    this.logger.log(`Organization unit ${id} deleted successfully`);
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
