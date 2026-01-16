import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/auth-client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateFloorDto,
  UpdateFloorDto,
  FloorResponseDto,
  FloorListQueryDto,
} from '../dto/floor.dto';

@Injectable()
export class FloorService {
  private readonly logger = new Logger(FloorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFloorDto): Promise<FloorResponseDto> {
    this.logger.log(`Creating floor: ${dto.code}`);

    const existing = await this.prisma.floor.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Floor with code ${dto.code} already exists`);
    }

    const building = await this.prisma.building.findUnique({
      where: { id: dto.buildingId },
    });

    if (!building) {
      throw new NotFoundException(`Building with ID ${dto.buildingId} not found`);
    }

    const floor = await this.prisma.floor.create({
      data: {
        code: dto.code,
        name: dto.name,
        building_id: dto.buildingId,
        floor_number: dto.floorNumber,
        floor_area: dto.floorArea,
        description: dto.description,
        is_active: dto.isActive ?? true,
      },
    });

    return this.mapToResponse(floor);
  }

  async findAll(query?: FloorListQueryDto): Promise<FloorResponseDto[]> {
    this.logger.log('Fetching all floors');

    const where: Prisma.FloorWhereInput = {};

    if (query?.buildingId) {
      where.building_id = query.buildingId;
    }

    if (query?.isActive !== undefined) {
      where.is_active = query.isActive;
    }

    const floors = await this.prisma.floor.findMany({
      where,
      orderBy: [{ floor_number: 'asc' }],
    });

    return floors.map((f) => this.mapToResponse(f));
  }

  async findOne(id: string): Promise<FloorResponseDto> {
    this.logger.log(`Fetching floor: ${id}`);

    const floor = await this.prisma.floor.findUnique({
      where: { id },
    });

    if (!floor) {
      throw new NotFoundException(`Floor with ID ${id} not found`);
    }

    return this.mapToResponse(floor);
  }

  async update(id: string, dto: UpdateFloorDto): Promise<FloorResponseDto> {
    this.logger.log(`Updating floor: ${id}`);

    await this.findOne(id);

    const floor = await this.prisma.floor.update({
      where: { id },
      data: {
        name: dto.name,
        floor_number: dto.floorNumber,
        floor_area: dto.floorArea,
        description: dto.description,
        is_active: dto.isActive,
      },
    });

    return this.mapToResponse(floor);
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting floor: ${id}`);

    await this.findOne(id);

    await this.prisma.floor.delete({
      where: { id },
    });

    this.logger.log(`Floor ${id} deleted successfully`);
  }

  private mapToResponse(floor: any): FloorResponseDto {
    return {
      id: floor.id,
      code: floor.code,
      name: floor.name,
      buildingId: floor.building_id,
      floorNumber: floor.floor_number,
      floorArea: floor.floor_area,
      description: floor.description,
      isActive: floor.is_active,
      createdAt: floor.created_at,
      updatedAt: floor.updated_at,
    };
  }
}
