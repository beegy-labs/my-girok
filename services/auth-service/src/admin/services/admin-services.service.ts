import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '../../../node_modules/.prisma/auth-client';
import { ID } from '@my-girok/nest-common';
import { PrismaService } from '../../database/prisma.service';
import {
  ServiceQueryDto,
  ServiceResponse,
  ServiceListResponse,
  ConsentRequirementQueryDto,
  CreateConsentRequirementDto,
  UpdateConsentRequirementDto,
  ConsentRequirementResponse,
  ConsentRequirementListResponse,
  BulkUpdateConsentRequirementsDto,
  AddServiceCountryDto,
  ServiceCountryResponse,
  ServiceCountryListResponse,
} from '../dto/admin-services.dto';

interface ServiceRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
  settings: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ConsentRequirementRow {
  id: string;
  serviceId: string;
  countryCode: string;
  consentType: string;
  isRequired: boolean;
  documentType: string;
  displayOrder: number;
  labelKey: string;
  descriptionKey: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ServiceCountryRow {
  id: string;
  serviceId: string;
  countryCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AdminServicesService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // SERVICES
  // ============================================================

  async listServices(query: ServiceQueryDto): Promise<ServiceListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const isActiveFilter = query.isActive ?? null;

    const countResult = await this.prisma.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`
      SELECT COUNT(*) as count FROM services
      WHERE (is_active = ${isActiveFilter} OR ${isActiveFilter}::BOOLEAN IS NULL)
    `,
    );
    const total = Number(countResult[0]?.count ?? 0);

    const data = await this.prisma.$queryRaw<ServiceRow[]>(
      Prisma.sql`
      SELECT
        id, slug, name, description, is_active as "isActive",
        settings, created_at as "createdAt", updated_at as "updatedAt"
      FROM services
      WHERE (is_active = ${isActiveFilter} OR ${isActiveFilter}::BOOLEAN IS NULL)
      ORDER BY name ASC
      LIMIT ${limit} OFFSET ${offset}
    `,
    );

    return {
      data: data as ServiceResponse[],
      meta: { total, page, limit },
    };
  }

  async getServiceById(id: string): Promise<ServiceResponse> {
    const services = await this.prisma.$queryRaw<ServiceRow[]>(
      Prisma.sql`
      SELECT
        id, slug, name, description, is_active as "isActive",
        settings, created_at as "createdAt", updated_at as "updatedAt"
      FROM services
      WHERE id = ${id}::uuid
      LIMIT 1
    `,
    );

    if (!services.length) {
      throw new NotFoundException(`Service not found: ${id}`);
    }

    return services[0] as ServiceResponse;
  }

  async getServiceBySlug(slug: string): Promise<ServiceResponse> {
    const services = await this.prisma.$queryRaw<ServiceRow[]>(
      Prisma.sql`
      SELECT
        id, slug, name, description, is_active as "isActive",
        settings, created_at as "createdAt", updated_at as "updatedAt"
      FROM services
      WHERE slug = ${slug}
      LIMIT 1
    `,
    );

    if (!services.length) {
      throw new NotFoundException(`Service not found: ${slug}`);
    }

    return services[0] as ServiceResponse;
  }

  // ============================================================
  // CONSENT REQUIREMENTS
  // ============================================================

  async listConsentRequirements(
    serviceId: string,
    query: ConsentRequirementQueryDto,
  ): Promise<ConsentRequirementListResponse> {
    // Verify service exists
    await this.getServiceById(serviceId);

    const countryCodeFilter = query.countryCode ?? null;

    const data = await this.prisma.$queryRaw<ConsentRequirementRow[]>(
      Prisma.sql`
      SELECT
        id, service_id as "serviceId", country_code as "countryCode",
        consent_type as "consentType", is_required as "isRequired",
        document_type as "documentType", display_order as "displayOrder",
        label_key as "labelKey", description_key as "descriptionKey",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM service_consent_requirements
      WHERE service_id = ${serviceId}::uuid
        AND (country_code = ${countryCodeFilter} OR ${countryCodeFilter}::TEXT IS NULL)
      ORDER BY country_code, display_order ASC
    `,
    );

    return {
      data: data as ConsentRequirementResponse[],
      meta: {
        total: data.length,
        serviceId,
        countryCode: query.countryCode,
      },
    };
  }

  async getConsentRequirement(serviceId: string, id: string): Promise<ConsentRequirementResponse> {
    const requirements = await this.prisma.$queryRaw<ConsentRequirementRow[]>(
      Prisma.sql`
      SELECT
        id, service_id as "serviceId", country_code as "countryCode",
        consent_type as "consentType", is_required as "isRequired",
        document_type as "documentType", display_order as "displayOrder",
        label_key as "labelKey", description_key as "descriptionKey",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM service_consent_requirements
      WHERE id = ${id}::uuid AND service_id = ${serviceId}::uuid
      LIMIT 1
    `,
    );

    if (!requirements.length) {
      throw new NotFoundException(`Consent requirement not found: ${id}`);
    }

    return requirements[0] as ConsentRequirementResponse;
  }

  async createConsentRequirement(
    serviceId: string,
    dto: CreateConsentRequirementDto,
  ): Promise<ConsentRequirementResponse> {
    // Verify service exists
    await this.getServiceById(serviceId);

    // Check for duplicate
    const existing = await this.prisma.$queryRaw<{ id: string }[]>(
      Prisma.sql`
      SELECT id FROM service_consent_requirements
      WHERE service_id = ${serviceId}::uuid
        AND country_code = ${dto.countryCode}
        AND consent_type = ${dto.consentType}::consent_type
      LIMIT 1
    `,
    );

    if (existing.length) {
      throw new ConflictException(
        `Consent requirement already exists for ${dto.consentType} in ${dto.countryCode}`,
      );
    }

    const reqId = ID.generate();
    const created = await this.prisma.$queryRaw<ConsentRequirementRow[]>(
      Prisma.sql`
      INSERT INTO service_consent_requirements (
        id, service_id, country_code, consent_type, is_required,
        document_type, display_order, label_key, description_key
      )
      VALUES (
        ${reqId}::uuid,
        ${serviceId}::uuid,
        ${dto.countryCode},
        ${dto.consentType}::consent_type,
        ${dto.isRequired},
        ${dto.documentType}::legal_document_type,
        ${dto.displayOrder},
        ${dto.labelKey},
        ${dto.descriptionKey}
      )
      RETURNING
        id, service_id as "serviceId", country_code as "countryCode",
        consent_type as "consentType", is_required as "isRequired",
        document_type as "documentType", display_order as "displayOrder",
        label_key as "labelKey", description_key as "descriptionKey",
        created_at as "createdAt", updated_at as "updatedAt"
    `,
    );

    return created[0] as ConsentRequirementResponse;
  }

  async updateConsentRequirement(
    serviceId: string,
    id: string,
    dto: UpdateConsentRequirementDto,
  ): Promise<ConsentRequirementResponse> {
    // Verify exists
    await this.getConsentRequirement(serviceId, id);

    const isRequiredValue = dto.isRequired ?? null;
    const documentTypeValue = dto.documentType ?? null;
    const displayOrderValue = dto.displayOrder ?? null;
    const labelKeyValue = dto.labelKey ?? null;
    const descriptionKeyValue = dto.descriptionKey ?? null;

    const updated = await this.prisma.$queryRaw<ConsentRequirementRow[]>(
      Prisma.sql`
      UPDATE service_consent_requirements
      SET
        is_required = COALESCE(${isRequiredValue}, is_required),
        document_type = COALESCE(${documentTypeValue}::legal_document_type, document_type),
        display_order = COALESCE(${displayOrderValue}, display_order),
        label_key = COALESCE(${labelKeyValue}, label_key),
        description_key = COALESCE(${descriptionKeyValue}, description_key),
        updated_at = NOW()
      WHERE id = ${id}::uuid AND service_id = ${serviceId}::uuid
      RETURNING
        id, service_id as "serviceId", country_code as "countryCode",
        consent_type as "consentType", is_required as "isRequired",
        document_type as "documentType", display_order as "displayOrder",
        label_key as "labelKey", description_key as "descriptionKey",
        created_at as "createdAt", updated_at as "updatedAt"
    `,
    );

    return updated[0] as ConsentRequirementResponse;
  }

  async deleteConsentRequirement(serviceId: string, id: string): Promise<void> {
    // Verify exists
    await this.getConsentRequirement(serviceId, id);

    await this.prisma.$executeRaw(
      Prisma.sql`
      DELETE FROM service_consent_requirements
      WHERE id = ${id}::uuid AND service_id = ${serviceId}::uuid
    `,
    );
  }

  async bulkUpdateConsentRequirements(
    serviceId: string,
    dto: BulkUpdateConsentRequirementsDto,
  ): Promise<ConsentRequirementListResponse> {
    // Verify service exists
    await this.getServiceById(serviceId);

    // Process each requirement with upsert
    for (const req of dto.requirements) {
      const reqId = ID.generate();
      await this.prisma.$executeRaw(
        Prisma.sql`
        INSERT INTO service_consent_requirements (
          id, service_id, country_code, consent_type, is_required,
          document_type, display_order, label_key, description_key
        )
        VALUES (
          ${reqId}::uuid,
          ${serviceId}::uuid,
          ${dto.countryCode},
          ${req.consentType}::consent_type,
          ${req.isRequired},
          ${req.documentType}::legal_document_type,
          ${req.displayOrder},
          ${req.labelKey},
          ${req.descriptionKey}
        )
        ON CONFLICT (service_id, country_code, consent_type) DO UPDATE SET
          is_required = EXCLUDED.is_required,
          document_type = EXCLUDED.document_type,
          display_order = EXCLUDED.display_order,
          label_key = EXCLUDED.label_key,
          description_key = EXCLUDED.description_key,
          updated_at = NOW()
      `,
      );
    }

    // Return updated list
    return this.listConsentRequirements(serviceId, { countryCode: dto.countryCode });
  }

  // ============================================================
  // SERVICE SUPPORTED COUNTRIES
  // ============================================================

  async listServiceCountries(serviceId: string): Promise<ServiceCountryListResponse> {
    // Verify service exists
    await this.getServiceById(serviceId);

    const data = await this.prisma.$queryRaw<ServiceCountryRow[]>(
      Prisma.sql`
      SELECT
        id, service_id as "serviceId", country_code as "countryCode",
        is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
      FROM service_supported_countries
      WHERE service_id = ${serviceId}::uuid AND is_active = TRUE
      ORDER BY country_code ASC
    `,
    );

    return {
      data: data as ServiceCountryResponse[],
      meta: { total: data.length, serviceId },
    };
  }

  async addServiceCountry(
    serviceId: string,
    dto: AddServiceCountryDto,
  ): Promise<ServiceCountryResponse> {
    // Verify service exists
    await this.getServiceById(serviceId);

    const countryId = ID.generate();

    // Upsert: insert new or reactivate existing
    const result = await this.prisma.$queryRaw<ServiceCountryRow[]>(
      Prisma.sql`
      INSERT INTO service_supported_countries (id, service_id, country_code)
      VALUES (${countryId}::uuid, ${serviceId}::uuid, ${dto.countryCode})
      ON CONFLICT (service_id, country_code) DO UPDATE SET
        is_active = TRUE,
        updated_at = NOW()
      RETURNING
        id, service_id as "serviceId", country_code as "countryCode",
        is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
    `,
    );

    return result[0] as ServiceCountryResponse;
  }

  async removeServiceCountry(serviceId: string, countryCode: string): Promise<void> {
    // Verify service exists
    await this.getServiceById(serviceId);

    // Soft delete (set is_active = FALSE)
    await this.prisma.$executeRaw(
      Prisma.sql`
      UPDATE service_supported_countries
      SET is_active = FALSE, updated_at = NOW()
      WHERE service_id = ${serviceId}::uuid AND country_code = ${countryCode}
    `,
    );
  }
}
