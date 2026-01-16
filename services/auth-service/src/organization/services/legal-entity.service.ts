import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateLegalEntityDto,
  UpdateLegalEntityDto,
  LegalEntityResponseDto,
  LegalEntityListQueryDto,
} from '../dto/legal-entity.dto';

@Injectable()
export class LegalEntityService {
  private readonly logger = new Logger(LegalEntityService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLegalEntityDto): Promise<LegalEntityResponseDto> {
    this.logger.log(`Creating legal entity: ${dto.code}`);

    const existing = await this.prisma.legalEntity.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Legal entity with code ${dto.code} already exists`);
    }

    const legalEntity = await this.prisma.legalEntity.create({
      data: {
        code: dto.code,
        name: dto.name,
        legal_name: dto.legalName,
        country_code: dto.countryCode,
        tax_id: dto.taxId,
        registered_address: dto.registeredAddress,
        description: dto.description,
        is_active: dto.isActive ?? true,
      },
    });

    return this.mapToResponse(legalEntity);
  }

  async findAll(query?: LegalEntityListQueryDto): Promise<LegalEntityResponseDto[]> {
    this.logger.log('Fetching all legal entities');

    const where: any = {};

    if (query?.countryCode) {
      where.country_code = query.countryCode;
    }

    if (query?.isActive !== undefined) {
      where.is_active = query.isActive;
    }

    const legalEntities = await this.prisma.legalEntity.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    });

    return legalEntities.map((le) => this.mapToResponse(le));
  }

  async findOne(id: string): Promise<LegalEntityResponseDto> {
    this.logger.log(`Fetching legal entity: ${id}`);

    const legalEntity = await this.prisma.legalEntity.findUnique({
      where: { id },
    });

    if (!legalEntity) {
      throw new NotFoundException(`Legal entity with ID ${id} not found`);
    }

    return this.mapToResponse(legalEntity);
  }

  async update(id: string, dto: UpdateLegalEntityDto): Promise<LegalEntityResponseDto> {
    this.logger.log(`Updating legal entity: ${id}`);

    await this.findOne(id);

    const legalEntity = await this.prisma.legalEntity.update({
      where: { id },
      data: {
        name: dto.name,
        legal_name: dto.legalName,
        tax_id: dto.taxId,
        registered_address: dto.registeredAddress,
        description: dto.description,
        is_active: dto.isActive,
      },
    });

    return this.mapToResponse(legalEntity);
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting legal entity: ${id}`);

    await this.findOne(id);

    await this.prisma.legalEntity.delete({
      where: { id },
    });

    this.logger.log(`Legal entity ${id} deleted successfully`);
  }

  private mapToResponse(legalEntity: any): LegalEntityResponseDto {
    return {
      id: legalEntity.id,
      code: legalEntity.code,
      name: legalEntity.name,
      legalName: legalEntity.legal_name,
      countryCode: legalEntity.country_code,
      taxId: legalEntity.tax_id,
      registeredAddress: legalEntity.registered_address,
      description: legalEntity.description,
      isActive: legalEntity.is_active,
      createdAt: legalEntity.created_at,
      updatedAt: legalEntity.updated_at,
    };
  }
}
