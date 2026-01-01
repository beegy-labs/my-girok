import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { ID } from '@my-girok/nest-common';
import { PrismaService } from '../database/prisma.service';
import { CreateLawRegistryDto, UpdateLawRegistryDto, LawRegistryResponseDto } from './dto';

@Injectable()
export class LawRegistryService {
  private readonly logger = new Logger(LawRegistryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLawRegistryDto): Promise<LawRegistryResponseDto> {
    // Check if code already exists
    const existing = await this.prisma.lawRegistry.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Law registry with code '${dto.code}' already exists`);
    }

    const id = ID.generate();

    const lawRegistry = await this.prisma.lawRegistry.create({
      data: {
        id,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        countryCode: dto.countryCode,
        effectiveDate: dto.effectiveDate,
        isActive: dto.isActive ?? true,
        metadata: dto.metadata as object | undefined,
      },
    });

    this.logger.log(`Law registry created: ${dto.code} (${id})`);

    return this.toResponseDto(lawRegistry);
  }

  async findAll(params: {
    countryCode?: string;
    isActive?: boolean;
  }): Promise<LawRegistryResponseDto[]> {
    const { countryCode, isActive } = params;

    const laws = await this.prisma.lawRegistry.findMany({
      where: {
        ...(countryCode && { countryCode }),
        ...(isActive !== undefined && { isActive }),
      },
      orderBy: { code: 'asc' },
    });

    return laws.map((l) => this.toResponseDto(l));
  }

  async findOne(id: string): Promise<LawRegistryResponseDto> {
    const lawRegistry = await this.prisma.lawRegistry.findUnique({ where: { id } });

    if (!lawRegistry) {
      throw new NotFoundException(`Law registry not found: ${id}`);
    }

    return this.toResponseDto(lawRegistry);
  }

  async findByCode(code: string): Promise<LawRegistryResponseDto> {
    const lawRegistry = await this.prisma.lawRegistry.findUnique({ where: { code } });

    if (!lawRegistry) {
      throw new NotFoundException(`Law registry not found: ${code}`);
    }

    return this.toResponseDto(lawRegistry);
  }

  async update(id: string, dto: UpdateLawRegistryDto): Promise<LawRegistryResponseDto> {
    const existing = await this.prisma.lawRegistry.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Law registry not found: ${id}`);
    }

    const updated = await this.prisma.lawRegistry.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        effectiveDate: dto.effectiveDate,
        isActive: dto.isActive,
        metadata: dto.metadata as object | undefined,
      },
    });

    this.logger.log(`Law registry updated: ${id}`);

    return this.toResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.lawRegistry.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Law registry not found: ${id}`);
    }

    // Soft delete by setting isActive to false
    await this.prisma.lawRegistry.update({
      where: { id },
      data: { isActive: false },
    });

    this.logger.log(`Law registry deactivated: ${id}`);
  }

  private toResponseDto(law: unknown): LawRegistryResponseDto {
    const l = law as Record<string, unknown>;
    return {
      id: l.id as string,
      code: l.code as string,
      name: l.name as string,
      description: l.description as string | null,
      countryCode: l.countryCode as string,
      effectiveDate: l.effectiveDate as Date,
      isActive: l.isActive as boolean,
      createdAt: l.createdAt as Date,
      updatedAt: l.updatedAt as Date,
    };
  }
}
