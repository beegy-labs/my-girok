import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { Prisma, partner_type } from '../../../node_modules/.prisma/auth-client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreatePartnerCompanyDto,
  UpdatePartnerCompanyDto,
  PartnerCompanyResponseDto,
  PartnerCompanyListQueryDto,
} from '../dto/partner-company.dto';

@Injectable()
export class PartnerCompanyService {
  private readonly logger = new Logger(PartnerCompanyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePartnerCompanyDto): Promise<PartnerCompanyResponseDto> {
    this.logger.log(`Creating partner company: ${dto.code}`);

    const existing = await this.prisma.partner_companies.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Partner company with code ${dto.code} already exists`);
    }

    const partnerCompany = await this.prisma.partner_companies.create({
      data: {
        code: dto.code,
        name: dto.name,
        partner_type: dto.partnerType as partner_type,
        country_code: 'US', // TODO: Add to DTO
        primary_contact_email: dto.contactEmail,
        primary_contact_phone: dto.contactPhone,
        primary_contact_name: dto.contactPerson,
        tax_id: dto.taxId,
        address: dto.address,
        is_active: dto.isActive ?? true,
      },
    });

    return this.mapToResponse(partnerCompany);
  }

  async findAll(query?: PartnerCompanyListQueryDto): Promise<PartnerCompanyResponseDto[]> {
    this.logger.log('Fetching all partner companies');

    const where: Prisma.partner_companiesWhereInput = {};

    if (query?.partnerType) {
      where.partner_type = query.partnerType as partner_type;
    }

    if (query?.isActive !== undefined) {
      where.is_active = query.isActive;
    }

    const partnerCompanies = await this.prisma.partner_companies.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    });

    return partnerCompanies.map((pc) => this.mapToResponse(pc));
  }

  async findOne(id: string): Promise<PartnerCompanyResponseDto> {
    this.logger.log(`Fetching partner company: ${id}`);

    const partnerCompany = await this.prisma.partner_companies.findUnique({
      where: { id },
    });

    if (!partnerCompany) {
      throw new NotFoundException(`Partner company with ID ${id} not found`);
    }

    return this.mapToResponse(partnerCompany);
  }

  async findAgreements(id: string): Promise<any[]> {
    this.logger.log(`Fetching agreements for partner company: ${id}`);

    await this.findOne(id);

    const agreements = await this.prisma.partner_service_agreements.findMany({
      where: { partner_company_id: id },
      orderBy: [{ start_date: 'desc' }],
    });

    return agreements;
  }

  async update(id: string, dto: UpdatePartnerCompanyDto): Promise<PartnerCompanyResponseDto> {
    this.logger.log(`Updating partner company: ${id}`);

    await this.findOne(id);

    const partnerCompany = await this.prisma.partner_companies.update({
      where: { id },
      data: {
        name: dto.name,
        partner_type: dto.partnerType as partner_type,
        primary_contact_email: dto.contactEmail,
        primary_contact_phone: dto.contactPhone,
        primary_contact_name: dto.contactPerson,
        tax_id: dto.taxId,
        address: dto.address,
        is_active: dto.isActive,
      },
    });

    return this.mapToResponse(partnerCompany);
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting partner company: ${id}`);

    await this.findOne(id);

    await this.prisma.partner_companies.delete({
      where: { id },
    });

    this.logger.log(`Partner company ${id} deleted successfully`);
  }

  private mapToResponse(partnerCompany: any): PartnerCompanyResponseDto {
    return {
      id: partnerCompany.id,
      code: partnerCompany.code,
      name: partnerCompany.name,
      partnerType: partnerCompany.partner_type,
      contactEmail: partnerCompany.contact_email,
      contactPhone: partnerCompany.contact_phone,
      contactPerson: partnerCompany.contact_person,
      taxId: partnerCompany.tax_id,
      address: partnerCompany.address,
      description: partnerCompany.description,
      isActive: partnerCompany.is_active,
      createdAt: partnerCompany.created_at,
      updatedAt: partnerCompany.updated_at,
    };
  }
}
