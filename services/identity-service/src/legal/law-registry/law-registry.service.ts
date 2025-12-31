import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { LegalPrismaService } from '../../database/legal-prisma.service';
import { ConsentType, Prisma } from '.prisma/identity-legal-client';
import {
  CreateLawDto,
  UpdateLawDto,
  LawQueryDto,
  LawResponseDto,
  LawListResponseDto,
  LawRequirementsDto,
  ConsentRequirementResponseDto,
} from './dto/law-registry.dto';

/**
 * Law Registry row interface
 */
interface LawRow {
  id: string;
  code: string;
  jurisdiction: string;
  countryCode: string | null;
  effectiveFrom: Date;
  name: string;
  description: string | null;
  requirements: LawRequirementsDto;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Law Registry Service
 *
 * Manages country-specific legal requirements including:
 * - Law registration and updates
 * - Consent requirements lookup
 * - Special requirements (night-time push, data retention, etc.)
 */
@Injectable()
export class LawRegistryService {
  private readonly logger = new Logger(LawRegistryService.name);

  constructor(private readonly prisma: LegalPrismaService) {}

  /**
   * Find all laws with pagination and filters
   */
  async findAll(query: LawQueryDto): Promise<LawListResponseDto> {
    // Use PaginationDto properties for standardized pagination
    const page = query.page ?? 1;
    const limit = query.take;
    const offset = query.skip;

    const countryCodeFilter = query.countryCode ?? null;
    const isActiveFilter = query.isActive ?? null;

    // Get total count
    const countResult = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM law_registry
      WHERE (country_code = ${countryCodeFilter} OR ${countryCodeFilter}::TEXT IS NULL)
        AND (is_active = ${isActiveFilter} OR ${isActiveFilter}::BOOLEAN IS NULL)
    `;
    const total = Number(countResult[0]?.count ?? 0);

    // Get data with pagination
    const data = await this.prisma.$queryRaw<LawRow[]>`
      SELECT
        id, code, jurisdiction, country_code as "countryCode", effective_from as "effectiveFrom",
        name, description, requirements,
        is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
      FROM law_registry
      WHERE (country_code = ${countryCodeFilter} OR ${countryCodeFilter}::TEXT IS NULL)
        AND (is_active = ${isActiveFilter} OR ${isActiveFilter}::BOOLEAN IS NULL)
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      data: data.map((row) => ({
        ...row,
        requirements: row.requirements as LawRequirementsDto,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 0 },
    };
  }

  /**
   * Find law by ID
   */
  async findById(id: string): Promise<LawResponseDto> {
    const law = await this.prisma.lawRegistry.findUnique({
      where: { id },
    });

    if (!law) {
      throw new NotFoundException(`Law not found: ${id}`);
    }

    return {
      id: law.id,
      code: law.code,
      jurisdiction: law.jurisdiction,
      countryCode: law.countryCode,
      effectiveFrom: law.effectiveFrom,
      name: law.name,
      description: law.description,
      requirements: law.requirements as unknown as LawRequirementsDto,
      isActive: law.isActive,
      createdAt: law.createdAt,
      updatedAt: law.updatedAt,
    };
  }

  /**
   * Find law by code
   */
  async findByCode(code: string): Promise<LawResponseDto> {
    const laws = await this.prisma.$queryRaw<LawRow[]>`
      SELECT
        id, code, jurisdiction, country_code as "countryCode", effective_from as "effectiveFrom",
        name, description, requirements,
        is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
      FROM law_registry
      WHERE code = ${code}
      LIMIT 1
    `;

    if (!laws.length) {
      throw new NotFoundException(`Law not found: ${code}`);
    }

    return {
      ...laws[0],
      requirements: laws[0].requirements as LawRequirementsDto,
    };
  }

  /**
   * Find laws by country code
   */
  async findByCountry(countryCode: string): Promise<LawResponseDto[]> {
    const laws = await this.prisma.$queryRaw<LawRow[]>`
      SELECT
        id, code, jurisdiction, country_code as "countryCode", effective_from as "effectiveFrom",
        name, description, requirements,
        is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
      FROM law_registry
      WHERE country_code = ${countryCode} AND is_active = true
      ORDER BY created_at DESC
    `;

    return laws.map((row) => ({
      ...row,
      requirements: row.requirements as LawRequirementsDto,
    }));
  }

  /**
   * Create a new law registry entry
   */
  async create(dto: CreateLawDto): Promise<LawResponseDto> {
    // Check if code already exists
    const existing = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM law_registry WHERE code = ${dto.code} LIMIT 1
    `;

    if (existing.length) {
      throw new ConflictException(`Law already exists: ${dto.code}`);
    }

    const law = await this.prisma.lawRegistry.create({
      data: {
        code: dto.code,
        jurisdiction: dto.jurisdiction,
        countryCode: dto.countryCode,
        name: dto.name,
        description: dto.description,
        effectiveFrom: new Date(dto.effectiveFrom),
        requirements: dto.requirements as unknown as Prisma.InputJsonValue,
        isActive: dto.isActive ?? true,
      },
    });

    this.logger.log(`Law created: code=${dto.code}, jurisdiction=${dto.jurisdiction}`);

    return {
      id: law.id,
      code: law.code,
      jurisdiction: law.jurisdiction,
      countryCode: law.countryCode,
      name: law.name,
      effectiveFrom: law.effectiveFrom,
      description: law.description,
      requirements: law.requirements as unknown as LawRequirementsDto,
      isActive: law.isActive,
      createdAt: law.createdAt,
      updatedAt: law.updatedAt,
    };
  }

  /**
   * Update a law registry entry
   */
  async update(code: string, dto: UpdateLawDto): Promise<LawResponseDto> {
    await this.findByCode(code); // Ensure exists

    const nameValue = dto.name ?? null;
    const descriptionValue = dto.description ?? null;
    const requirementsValue = dto.requirements ? JSON.stringify(dto.requirements) : null;
    const isActiveValue = dto.isActive ?? null;

    const updated = await this.prisma.$queryRaw<LawRow[]>`
      UPDATE law_registry
      SET
        name = COALESCE(${nameValue}, name),
        description = COALESCE(${descriptionValue}, description),
        requirements = COALESCE(${requirementsValue}::jsonb, requirements),
        is_active = COALESCE(${isActiveValue}, is_active),
        updated_at = NOW()
      WHERE code = ${code}
      RETURNING
        id, code, country_code as "countryCode", name, description, requirements,
        is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
    `;

    this.logger.log(`Law updated: code=${code}`);

    return {
      ...updated[0],
      requirements: updated[0].requirements as LawRequirementsDto,
    };
  }

  /**
   * Deactivate a law
   */
  async deactivate(code: string): Promise<void> {
    await this.findByCode(code); // Ensure exists

    await this.prisma.$executeRaw`
      UPDATE law_registry SET is_active = false, updated_at = NOW() WHERE code = ${code}
    `;

    this.logger.log(`Law deactivated: code=${code}`);
  }

  /**
   * Delete a law
   */
  async delete(code: string): Promise<void> {
    await this.findByCode(code); // Ensure exists

    await this.prisma.$executeRaw`
      DELETE FROM law_registry WHERE code = ${code}
    `;

    this.logger.log(`Law deleted: code=${code}`);
  }

  /**
   * Get consent requirements for a law
   */
  async getConsentRequirements(code: string): Promise<ConsentRequirementResponseDto[]> {
    const law = await this.findByCode(code);
    const requirements = law.requirements;

    const allConsents: ConsentRequirementResponseDto[] = [];

    // Required consents
    for (const type of requirements.requiredConsents || []) {
      allConsents.push({
        consentType: type as ConsentType,
        isRequired: true,
        source: 'LAW',
        lawCode: code,
      });
    }

    // Optional consents
    for (const type of requirements.optionalConsents || []) {
      allConsents.push({
        consentType: type as ConsentType,
        isRequired: false,
        source: 'LAW',
        lawCode: code,
      });
    }

    return allConsents;
  }

  /**
   * Get consent requirements for a country
   */
  async getCountryConsentRequirements(
    countryCode: string,
  ): Promise<ConsentRequirementResponseDto[]> {
    const laws = await this.findByCountry(countryCode);

    const allConsents: ConsentRequirementResponseDto[] = [];

    for (const law of laws) {
      const requirements = law.requirements;

      for (const type of requirements.requiredConsents || []) {
        // Avoid duplicates
        if (!allConsents.some((c) => c.consentType === type)) {
          allConsents.push({
            consentType: type as ConsentType,
            isRequired: true,
            source: 'LAW',
            lawCode: law.code,
          });
        }
      }

      for (const type of requirements.optionalConsents || []) {
        if (!allConsents.some((c) => c.consentType === type)) {
          allConsents.push({
            consentType: type as ConsentType,
            isRequired: false,
            source: 'LAW',
            lawCode: law.code,
          });
        }
      }
    }

    return allConsents;
  }

  /**
   * Seed default laws (PIPA, GDPR, APPI, CCPA)
   */
  async seedDefaultLaws(): Promise<void> {
    const defaultLaws: CreateLawDto[] = [
      {
        code: 'PIPA',
        jurisdiction: 'KR',
        countryCode: 'KR',
        effectiveFrom: '2011-09-30T00:00:00Z',
        name: 'Personal Information Protection Act',
        description: 'South Korean personal information protection law',
        requirements: {
          requiredConsents: [ConsentType.TERMS_OF_SERVICE, ConsentType.PRIVACY_POLICY],
          optionalConsents: [
            ConsentType.MARKETING_EMAIL,
            ConsentType.MARKETING_SMS,
            ConsentType.MARKETING_PUSH,
            ConsentType.MARKETING_PUSH_NIGHT,
          ],
          specialRequirements: {
            nightTimePush: { start: 21, end: 8 },
            minAge: 14,
          },
        },
      },
      {
        code: 'GDPR',
        jurisdiction: 'EU',
        countryCode: 'EU',
        effectiveFrom: '2018-05-25T00:00:00Z',
        name: 'General Data Protection Regulation',
        description: 'European Union data protection regulation',
        requirements: {
          requiredConsents: [ConsentType.TERMS_OF_SERVICE, ConsentType.PRIVACY_POLICY],
          optionalConsents: [ConsentType.MARKETING_EMAIL, ConsentType.MARKETING_PUSH],
          specialRequirements: {
            dataRetention: { maxDays: 365 },
            minAge: 16,
            parentalConsent: { ageThreshold: 16 },
          },
        },
      },
      {
        code: 'APPI',
        jurisdiction: 'JP',
        countryCode: 'JP',
        effectiveFrom: '2017-05-30T00:00:00Z',
        name: 'Act on the Protection of Personal Information',
        description: 'Japanese personal information protection law',
        requirements: {
          requiredConsents: [
            ConsentType.TERMS_OF_SERVICE,
            ConsentType.PRIVACY_POLICY,
            ConsentType.CROSS_BORDER_TRANSFER,
          ],
          optionalConsents: [ConsentType.MARKETING_EMAIL, ConsentType.MARKETING_PUSH],
          specialRequirements: {
            crossBorderTransfer: { requireExplicit: true },
          },
        },
      },
      {
        code: 'CCPA',
        jurisdiction: 'US-CA',
        countryCode: 'US',
        effectiveFrom: '2020-01-01T00:00:00Z',
        name: 'California Consumer Privacy Act',
        description: 'California privacy law',
        requirements: {
          requiredConsents: [ConsentType.TERMS_OF_SERVICE, ConsentType.PRIVACY_POLICY],
          optionalConsents: [
            ConsentType.MARKETING_EMAIL,
            ConsentType.MARKETING_SMS,
            ConsentType.MARKETING_PUSH,
            ConsentType.THIRD_PARTY_SHARING,
          ],
          specialRequirements: {
            minAge: 13,
          },
        },
      },
    ];

    for (const law of defaultLaws) {
      try {
        await this.create(law);
      } catch (error) {
        if (error instanceof ConflictException) {
          // Law already exists, skip
          continue;
        }
        throw error;
      }
    }

    this.logger.log('Default laws seeded');
  }
}
