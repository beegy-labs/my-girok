import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/auth-client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateBuildingDto,
  UpdateBuildingDto,
  BuildingResponseDto,
  BuildingListQueryDto,
} from '../dto/building.dto';

@Injectable()
export class BuildingService {
  private readonly logger = new Logger(BuildingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBuildingDto): Promise<BuildingResponseDto> {
    this.logger.log(`Creating building: ${dto.code}`);

    const existing = await this.prisma.building.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Building with code ${dto.code} already exists`);
    }

    const office = await this.prisma.office.findUnique({
      where: { id: dto.officeId },
    });

    if (!office) {
      throw new NotFoundException(`Office with ID ${dto.officeId} not found`);
    }

    const building = await this.prisma.building.create({
      data: {
        code: dto.code,
        name: dto.name,
        office_id: dto.officeId,
        address: dto.address,
        total_floors: dto.totalFloors,
        description: dto.description,
        is_active: dto.isActive ?? true,
      },
    });

    return this.mapToResponse(building);
  }

  async findAll(query?: BuildingListQueryDto): Promise<BuildingResponseDto[]> {
    this.logger.log('Fetching all buildings');

    const where: Prisma.BuildingWhereInput = {};

    if (query?.officeId) {
      where.office_id = query.officeId;
    }

    if (query?.isActive !== undefined) {
      where.is_active = query.isActive;
    }

    const buildings = await this.prisma.building.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    });

    return buildings.map((b) => this.mapToResponse(b));
  }

  async findOne(id: string): Promise<BuildingResponseDto> {
    this.logger.log(`Fetching building: ${id}`);

    const building = await this.prisma.building.findUnique({
      where: { id },
    });

    if (!building) {
      throw new NotFoundException(`Building with ID ${id} not found`);
    }

    return this.mapToResponse(building);
  }

  async findFloors(id: string): Promise<any[]> {
    this.logger.log(`Fetching floors for building: ${id}`);

    await this.findOne(id);

    const floors = await this.prisma.floor.findMany({
      where: { building_id: id, is_active: true },
      orderBy: [{ floor_number: 'asc' }],
    });

    return floors;
  }

  async update(id: string, dto: UpdateBuildingDto): Promise<BuildingResponseDto> {
    this.logger.log(`Updating building: ${id}`);

    await this.findOne(id);

    const building = await this.prisma.building.update({
      where: { id },
      data: {
        name: dto.name,
        address: dto.address,
        total_floors: dto.totalFloors,
        description: dto.description,
        is_active: dto.isActive,
      },
    });

    return this.mapToResponse(building);
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting building: ${id}`);

    await this.findOne(id);

    await this.prisma.building.delete({
      where: { id },
    });

    this.logger.log(`Building ${id} deleted successfully`);
  }

  private mapToResponse(building: any): BuildingResponseDto {
    return {
      id: building.id,
      code: building.code,
      name: building.name,
      officeId: building.office_id,
      address: building.address,
      totalFloors: building.total_floors,
      description: building.description,
      isActive: building.is_active,
      createdAt: building.created_at,
      updatedAt: building.updated_at,
    };
  }
}
