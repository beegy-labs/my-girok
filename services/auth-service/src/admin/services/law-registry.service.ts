import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ConsentType } from '../../../node_modules/.prisma/auth-client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateLawDto,
  UpdateLawDto,
  LawQueryDto,
  LawResponse,
  LawListResponse,
  LawRequirements,
  ConsentRequirementResponse,
} from '../dto/law-registry.dto';

interface LawRow {
  id: string;
  code: string;
  countryCode: string;
  name: string;
  requirements: LawRequirements;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class LawRegistryService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: LawQueryDto): Promise<LawListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (query.countryCode) {
      whereClause += ` AND country_code = $${paramIndex}`;
      params.push(query.countryCode);
      paramIndex++;
    }

    if (query.isActive !== undefined) {
      whereClause += ` AND is_active = $${paramIndex}`;
      params.push(query.isActive);
      paramIndex++;
    }

    // Get total count
    const countResult = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*) as count FROM law_registry ${whereClause}`,
      ...params,
    );
    const total = Number(countResult[0]?.count ?? 0);

    // Get data with pagination
    const data = await this.prisma.$queryRawUnsafe<LawRow[]>(
      `SELECT
        id, code, country_code as "countryCode", name, requirements,
        is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
      FROM law_registry
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      ...params,
      limit,
      offset,
    );

    return {
      data: data.map((row) => ({
        ...row,
        requirements: row.requirements as LawRequirements,
      })),
      meta: { total, page, limit },
    };
  }

  async findByCode(code: string): Promise<LawResponse> {
    const laws = await this.prisma.$queryRaw<LawRow[]>`
      SELECT
        id, code, country_code as "countryCode", name, requirements,
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
      requirements: laws[0].requirements as LawRequirements,
    };
  }

  async create(dto: CreateLawDto): Promise<LawResponse> {
    // Check if code already exists
    const existing = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM law_registry WHERE code = ${dto.code} LIMIT 1
    `;

    if (existing.length) {
      throw new ConflictException(`Law already exists: ${dto.code}`);
    }

    const isActive = dto.isActive ?? true;

    const created = await this.prisma.$queryRaw<LawRow[]>`
      INSERT INTO law_registry (
        id, code, country_code, name, requirements, is_active, created_at, updated_at
      )
      VALUES (
        gen_random_uuid()::TEXT, ${dto.code}, ${dto.countryCode}, ${dto.name},
        ${JSON.stringify(dto.requirements)}::jsonb, ${isActive}, NOW(), NOW()
      )
      RETURNING
        id, code, country_code as "countryCode", name, requirements,
        is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
    `;

    return {
      ...created[0],
      requirements: created[0].requirements as LawRequirements,
    };
  }

  async update(code: string, dto: UpdateLawDto): Promise<LawResponse> {
    await this.findByCode(code); // Ensure exists

    const setClauses: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (dto.name !== undefined) {
      setClauses.push(`name = $${paramIndex}`);
      params.push(dto.name);
      paramIndex++;
    }

    if (dto.requirements !== undefined) {
      setClauses.push(`requirements = $${paramIndex}::jsonb`);
      params.push(JSON.stringify(dto.requirements));
      paramIndex++;
    }

    if (dto.isActive !== undefined) {
      setClauses.push(`is_active = $${paramIndex}`);
      params.push(dto.isActive);
      paramIndex++;
    }

    const updated = await this.prisma.$queryRawUnsafe<LawRow[]>(
      `UPDATE law_registry
       SET ${setClauses.join(', ')}
       WHERE code = $${paramIndex}
       RETURNING
         id, code, country_code as "countryCode", name, requirements,
         is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"`,
      ...params,
      code,
    );

    return {
      ...updated[0],
      requirements: updated[0].requirements as LawRequirements,
    };
  }

  async delete(code: string): Promise<void> {
    await this.findByCode(code); // Ensure exists

    // Check if any services are using this law (via service_consent_requirement)
    const usageCount = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM service_consent_requirements
      WHERE country_code = (
        SELECT country_code FROM law_registry WHERE code = ${code}
      )
    `;

    if (Number(usageCount[0]?.count ?? 0) > 0) {
      throw new ConflictException(
        `Cannot delete law ${code}: service consent requirements reference this country`,
      );
    }

    await this.prisma.$executeRaw`
      DELETE FROM law_registry WHERE code = ${code}
    `;
  }

  async getConsentRequirements(code: string): Promise<ConsentRequirementResponse[]> {
    const law = await this.findByCode(code);
    const requirements = law.requirements;

    const allConsents: ConsentRequirementResponse[] = [];

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

  async seedDefaultLaws(): Promise<void> {
    const defaultLaws: CreateLawDto[] = [
      {
        code: 'PIPA',
        countryCode: 'KR',
        name: '개인정보보호법',
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
        countryCode: 'EU',
        name: 'General Data Protection Regulation',
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
        countryCode: 'JP',
        name: '個人情報保護法',
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
        countryCode: 'US',
        name: 'California Consumer Privacy Act',
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
  }
}
