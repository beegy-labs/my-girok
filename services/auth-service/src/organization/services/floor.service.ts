import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { Prisma } from '../../../node_modules/.prisma/auth-client';
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
    this.logger.log(`Creating floor: ${dto.floorNumber} in building ${dto.buildingId}`);

    const existing = await this.prisma.floors.findUnique({
      where: {
        building_id_floor_number: {
          building_id: dto.buildingId,
          floor_number: dto.floorNumber,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Floor ${dto.floorNumber} already exists in this building`);
    }

    const building = await this.prisma.buildings.findUnique({
      where: { id: dto.buildingId },
    });

    if (!building) {
      throw new NotFoundException(`Building with ID ${dto.buildingId} not found`);
    }

    const floor = await this.prisma.floors.create({
      data: {
        building_id: dto.buildingId,
        floor_number: dto.floorNumber,
        name: dto.name,
        is_active: dto.isActive ?? true,
      },
    });

    return this.mapToResponse(floor);
  }

  async findAll(query?: FloorListQueryDto): Promise<FloorResponseDto[]> {
    this.logger.log('Fetching all floors');

    const where: Prisma.floorsWhereInput = {};

    if (query?.buildingId) {
      where.building_id = query.buildingId;
    }

    if (query?.isActive !== undefined) {
      where.is_active = query.isActive;
    }

    const floors = await this.prisma.floors.findMany({
      where,
      orderBy: [{ floor_number: 'asc' }],
    });

    return floors.map((f) => this.mapToResponse(f));
  }

  async findOne(id: string): Promise<FloorResponseDto> {
    this.logger.log(`Fetching floor: ${id}`);

    const floor = await this.prisma.floors.findUnique({
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

    const floor = await this.prisma.floors.update({
      where: { id },
      data: {
        name: dto.name,
        floor_number: dto.floorNumber,
        is_active: dto.isActive,
      },
    });

    return this.mapToResponse(floor);
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting floor: ${id}`);

    await this.findOne(id);

    await this.prisma.floors.delete({
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
