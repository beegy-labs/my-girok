import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { Prisma, office_type } from '../../../node_modules/.prisma/auth-client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateOfficeDto,
  UpdateOfficeDto,
  OfficeResponseDto,
  OfficeListQueryDto,
} from '../dto/office.dto';

@Injectable()
export class OfficeService {
  private readonly logger = new Logger(OfficeService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOfficeDto): Promise<OfficeResponseDto> {
    this.logger.log(`Creating office: ${dto.code}`);

    const existing = await this.prisma.offices.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Office with code ${dto.code} already exists`);
    }

    // Verify legal entity exists
    const legalEntity = await this.prisma.legal_entities.findUnique({
      where: { id: dto.legalEntityId },
    });

    if (!legalEntity) {
      throw new NotFoundException(`Legal entity with ID ${dto.legalEntityId} not found`);
    }

    const office = await this.prisma.offices.create({
      data: {
        code: dto.code,
        name: dto.name,
        office_type: dto.officeType as office_type,
        legal_entity_id: dto.legalEntityId,
        country_code: dto.countryCode,
        city: dto.city,
        address_line1: dto.address,
        timezone: 'UTC', // TODO: Add to DTO
        phone: dto.phoneNumber,
      },
    });

    return this.mapToResponse(office);
  }

  async findAll(query?: OfficeListQueryDto): Promise<OfficeResponseDto[]> {
    this.logger.log('Fetching all offices');

    const where: Prisma.officesWhereInput = {};

    if (query?.officeType) {
      where.office_type = query.officeType as office_type;
    }

    if (query?.legalEntityId) {
      where.legal_entity_id = query.legalEntityId;
    }

    if (query?.countryCode) {
      where.country_code = query.countryCode;
    }

    if (query?.isActive !== undefined) {
      where.is_active = query.isActive;
    }

    const offices = await this.prisma.offices.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    });

    return offices.map((o) => this.mapToResponse(o));
  }

  async findOne(id: string): Promise<OfficeResponseDto> {
    this.logger.log(`Fetching office: ${id}`);

    const office = await this.prisma.offices.findUnique({
      where: { id },
    });

    if (!office) {
      throw new NotFoundException(`Office with ID ${id} not found`);
    }

    return this.mapToResponse(office);
  }

  async findBuildings(id: string): Promise<any[]> {
    this.logger.log(`Fetching buildings for office: ${id}`);

    await this.findOne(id);

    const buildings = await this.prisma.buildings.findMany({
      where: { office_id: id, is_accessible: true },
      orderBy: [{ name: 'asc' }],
    });

    return buildings;
  }

  async update(id: string, dto: UpdateOfficeDto): Promise<OfficeResponseDto> {
    this.logger.log(`Updating office: ${id}`);

    await this.findOne(id);

    const office = await this.prisma.offices.update({
      where: { id },
      data: {
        name: dto.name,
        office_type: dto.officeType as office_type,
        city: dto.city,
        address_line1: dto.address,
        phone: dto.phoneNumber,
      },
    });

    return this.mapToResponse(office);
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting office: ${id}`);

    await this.findOne(id);

    await this.prisma.offices.delete({
      where: { id },
    });

    this.logger.log(`Office ${id} deleted successfully`);
  }

  private mapToResponse(office: any): OfficeResponseDto {
    return {
      id: office.id,
      code: office.code,
      name: office.name,
      officeType: office.office_type,
      legalEntityId: office.legal_entity_id,
      countryCode: office.country_code,
      city: office.city,
      address: office.address,
      phoneNumber: office.phone_number,
      description: office.description,
      isActive: office.is_active,
      createdAt: office.created_at,
      updatedAt: office.updated_at,
    };
  }
}
