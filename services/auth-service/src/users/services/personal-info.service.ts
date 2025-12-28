import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ID } from '@my-girok/nest-common';
import { PrismaService } from '../../database/prisma.service';
import { UpdatePersonalInfoDto, PersonalInfoResponse } from '../dto/personal-info.dto';

type AccessorType = 'USER' | 'ADMIN' | 'OPERATOR' | 'SYSTEM';
type AccessAction = 'READ' | 'UPDATE' | 'DELETE';

interface AccessLogData {
  personalInfoId: string;
  serviceId?: string | null;
  accessorType: AccessorType;
  accessorId: string;
  action: AccessAction;
  fields: string[];
  ip: string;
  userAgent: string;
}

interface PersonalInfoRow {
  id: string;
  userId: string;
  name: string | null;
  birthDate: Date | null;
  gender: string | null;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  address: string | null;
  postalCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PersonalInfoService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get current user's personal info
   */
  async getMyPersonalInfo(
    userId: string,
    request: { ip: string; userAgent: string },
  ): Promise<PersonalInfoResponse | null> {
    const personalInfos = await this.prisma.$queryRaw<PersonalInfoRow[]>`
      SELECT
        id, user_id as "userId", name, birth_date as "birthDate",
        gender, phone_country_code as "phoneCountryCode",
        phone_number as "phoneNumber", country_code as "countryCode",
        region, city, address, postal_code as "postalCode",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM personal_info
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    const personalInfo = personalInfos[0];

    if (!personalInfo) {
      return null;
    }

    // Log access
    await this.logAccess({
      personalInfoId: personalInfo.id,
      accessorType: 'USER',
      accessorId: userId,
      action: 'READ',
      fields: ['*'],
      ip: request.ip,
      userAgent: request.userAgent,
    });

    return this.mapToResponse(personalInfo);
  }

  /**
   * Update current user's personal info
   * Uses parameterized queries with COALESCE pattern (SQL-injection safe)
   */
  async updatePersonalInfo(
    userId: string,
    dto: UpdatePersonalInfoDto,
    request: { ip: string; userAgent: string },
  ): Promise<PersonalInfoResponse> {
    const updatedFields = Object.keys(dto).filter(
      (key) => dto[key as keyof UpdatePersonalInfoDto] !== undefined,
    );

    // Check if exists
    const existing = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM personal_info WHERE user_id = ${userId} LIMIT 1
    `;

    let personalInfoId: string;

    if (existing.length) {
      // Update existing using COALESCE pattern (SQL-injection safe)
      personalInfoId = existing[0].id;

      const nameValue = dto.name ?? null;
      const birthDateValue = dto.birthDate ? new Date(dto.birthDate) : null;
      const genderValue = dto.gender ?? null;
      const phoneCountryCodeValue = dto.phoneCountryCode ?? null;
      const phoneNumberValue = dto.phoneNumber ?? null;
      const countryCodeValue = dto.countryCode ?? null;
      const regionValue = dto.region ?? null;
      const cityValue = dto.city ?? null;
      const addressValue = dto.address ?? null;
      const postalCodeValue = dto.postalCode ?? null;

      await this.prisma.$executeRaw`
        UPDATE personal_info
        SET
          name = COALESCE(${nameValue}, name),
          birth_date = COALESCE(${birthDateValue}, birth_date),
          gender = COALESCE(${genderValue}::gender, gender),
          phone_country_code = COALESCE(${phoneCountryCodeValue}, phone_country_code),
          phone_number = COALESCE(${phoneNumberValue}, phone_number),
          country_code = COALESCE(${countryCodeValue}, country_code),
          region = COALESCE(${regionValue}, region),
          city = COALESCE(${cityValue}, city),
          address = COALESCE(${addressValue}, address),
          postal_code = COALESCE(${postalCodeValue}, postal_code),
          updated_at = NOW()
        WHERE id = ${personalInfoId}
      `;
    } else {
      // Create new
      personalInfoId = ID.generate();
      await this.prisma.$executeRaw`
        INSERT INTO personal_info (
          id, user_id, name, birth_date, gender,
          phone_country_code, phone_number, country_code,
          region, city, address, postal_code,
          created_at, updated_at
        )
        VALUES (
          ${personalInfoId}, ${userId},
          ${dto.name || null}, ${dto.birthDate ? new Date(dto.birthDate) : null},
          ${dto.gender || null}::gender, ${dto.phoneCountryCode || null},
          ${dto.phoneNumber || null}, ${dto.countryCode || null},
          ${dto.region || null}, ${dto.city || null},
          ${dto.address || null}, ${dto.postalCode || null},
          NOW(), NOW()
        )
      `;
    }

    // Log access
    await this.logAccess({
      personalInfoId,
      accessorType: 'USER',
      accessorId: userId,
      action: 'UPDATE',
      fields: updatedFields,
      ip: request.ip,
      userAgent: request.userAgent,
    });

    // Return updated info
    const updated = await this.prisma.$queryRaw<PersonalInfoRow[]>`
      SELECT
        id, user_id as "userId", name, birth_date as "birthDate",
        gender, phone_country_code as "phoneCountryCode",
        phone_number as "phoneNumber", country_code as "countryCode",
        region, city, address, postal_code as "postalCode",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM personal_info
      WHERE id = ${personalInfoId}
      LIMIT 1
    `;

    return this.mapToResponse(updated[0]);
  }

  /**
   * Delete current user's personal info
   */
  async deletePersonalInfo(
    userId: string,
    request: { ip: string; userAgent: string },
  ): Promise<void> {
    const existing = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM personal_info WHERE user_id = ${userId} LIMIT 1
    `;

    if (!existing.length) {
      return; // Nothing to delete
    }

    const personalInfoId = existing[0].id;

    // Log access before delete
    await this.logAccess({
      personalInfoId,
      accessorType: 'USER',
      accessorId: userId,
      action: 'DELETE',
      fields: ['*'],
      ip: request.ip,
      userAgent: request.userAgent,
    });

    await this.prisma.$executeRaw`
      DELETE FROM personal_info WHERE id = ${personalInfoId}
    `;
  }

  /**
   * Get user's personal info by admin
   */
  async getPersonalInfoByAdmin(
    adminId: string,
    userId: string,
    serviceId: string | null,
    request: { ip: string; userAgent: string },
  ): Promise<PersonalInfoResponse | null> {
    // Validate admin has access
    await this.validateAdminAccess(adminId, userId);

    const personalInfos = await this.prisma.$queryRaw<PersonalInfoRow[]>`
      SELECT
        id, user_id as "userId", name, birth_date as "birthDate",
        gender, phone_country_code as "phoneCountryCode",
        phone_number as "phoneNumber", country_code as "countryCode",
        region, city, address, postal_code as "postalCode",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM personal_info
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    const personalInfo = personalInfos[0];

    if (!personalInfo) {
      return null;
    }

    // Log access
    await this.logAccess({
      personalInfoId: personalInfo.id,
      serviceId,
      accessorType: 'ADMIN',
      accessorId: adminId,
      action: 'READ',
      fields: ['*'],
      ip: request.ip,
      userAgent: request.userAgent,
    });

    return this.mapToResponse(personalInfo);
  }

  /**
   * Get user's personal info by operator
   */
  async getPersonalInfoByOperator(
    operatorId: string,
    userId: string,
    serviceId: string,
    request: { ip: string; userAgent: string },
  ): Promise<PersonalInfoResponse | null> {
    // Validate operator has access to this user
    await this.validateOperatorAccess(operatorId, userId, serviceId);

    const personalInfos = await this.prisma.$queryRaw<PersonalInfoRow[]>`
      SELECT
        id, user_id as "userId", name, birth_date as "birthDate",
        gender, phone_country_code as "phoneCountryCode",
        phone_number as "phoneNumber", country_code as "countryCode",
        region, city, address, postal_code as "postalCode",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM personal_info
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    const personalInfo = personalInfos[0];

    if (!personalInfo) {
      return null;
    }

    // Log access
    await this.logAccess({
      personalInfoId: personalInfo.id,
      serviceId,
      accessorType: 'OPERATOR',
      accessorId: operatorId,
      action: 'READ',
      fields: ['*'],
      ip: request.ip,
      userAgent: request.userAgent,
    });

    return this.mapToResponse(personalInfo);
  }

  private async validateAdminAccess(adminId: string, userId: string): Promise<void> {
    // Check if admin exists and is active
    const admins = await this.prisma.$queryRaw<{ id: string; scope: string }[]>`
      SELECT id, scope FROM admins WHERE id = ${adminId} AND is_active = true LIMIT 1
    `;

    if (!admins.length) {
      throw new ForbiddenException('Admin not found or inactive');
    }

    // System admins have full access
    if (admins[0].scope === 'SYSTEM') {
      return;
    }

    // Check if user exists
    const users = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM users WHERE id = ${userId} LIMIT 1
    `;

    if (!users.length) {
      throw new NotFoundException('User not found');
    }

    // For tenant admins, could add additional checks here
    // e.g., check if user is in the same tenant
  }

  private async validateOperatorAccess(
    operatorId: string,
    userId: string,
    serviceId: string,
  ): Promise<void> {
    // Check if operator has link to this user or has permission
    const links = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM operator_user_links
      WHERE operator_id = ${operatorId} AND user_id = ${userId} AND is_active = true
      LIMIT 1
    `;

    if (!links.length) {
      // Check if operator has broad permission
      const permissions = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT op.id
        FROM operator_permissions op
        JOIN permissions p ON op.permission_id = p.id
        WHERE op.operator_id = ${operatorId}
          AND p.resource = 'personal_info'
          AND p.action = 'read'
          AND (p.service_id IS NULL OR p.service_id = ${serviceId})
        LIMIT 1
      `;

      if (!permissions.length) {
        throw new ForbiddenException('No access to this user');
      }
    }

    // Check if user exists
    const users = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM users WHERE id = ${userId} LIMIT 1
    `;

    if (!users.length) {
      throw new NotFoundException('User not found');
    }
  }

  private async logAccess(data: AccessLogData): Promise<void> {
    const logId = ID.generate();
    await this.prisma.$executeRaw`
      INSERT INTO personal_info_access_logs (
        id, personal_info_id, service_id, accessor_type, accessor_id,
        action, fields, ip_address, user_agent, accessed_at
      )
      VALUES (
        ${logId}, ${data.personalInfoId}, ${data.serviceId || null},
        ${data.accessorType}::accessor_type, ${data.accessorId},
        ${data.action}::access_action, ${data.fields},
        ${data.ip}, ${data.userAgent}, NOW()
      )
    `;
  }

  private mapToResponse(row: PersonalInfoRow): PersonalInfoResponse {
    return {
      id: row.id,
      name: row.name,
      birthDate: row.birthDate ? row.birthDate.toISOString().split('T')[0] : null,
      gender: row.gender,
      phoneCountryCode: row.phoneCountryCode,
      phoneNumber: row.phoneNumber,
      countryCode: row.countryCode,
      region: row.region,
      city: row.city,
      address: row.address,
      postalCode: row.postalCode,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
