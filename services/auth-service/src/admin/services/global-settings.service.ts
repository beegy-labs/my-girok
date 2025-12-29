import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '../../../node_modules/.prisma/auth-client';
import { ID } from '@my-girok/nest-common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateSupportedCountryDto,
  UpdateSupportedCountryDto,
  SupportedCountryResponse,
  SupportedCountryListResponse,
  CreateSupportedLocaleDto,
  UpdateSupportedLocaleDto,
  SupportedLocaleResponse,
  SupportedLocaleListResponse,
} from '../dto/global-settings.dto';

interface CountryRow {
  id: string;
  code: string;
  name: string;
  nativeName: string | null;
  flagEmoji: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

interface LocaleRow {
  id: string;
  code: string;
  name: string;
  nativeName: string | null;
  flagEmoji: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class GlobalSettingsService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // SUPPORTED COUNTRIES
  // ============================================================

  async listCountries(activeOnly = false): Promise<SupportedCountryListResponse> {
    const activeFilter = activeOnly ? true : null;

    const data = await this.prisma.$queryRaw<CountryRow[]>(
      Prisma.sql`
      SELECT
        id, code, name, native_name as "nativeName", flag_emoji as "flagEmoji",
        is_active as "isActive", display_order as "displayOrder",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM supported_countries
      WHERE (is_active = ${activeFilter} OR ${activeFilter}::BOOLEAN IS NULL)
      ORDER BY display_order ASC, name ASC
    `,
    );

    return {
      data: data as SupportedCountryResponse[],
      meta: { total: data.length },
    };
  }

  async getCountry(code: string): Promise<SupportedCountryResponse> {
    const countries = await this.prisma.$queryRaw<CountryRow[]>(
      Prisma.sql`
      SELECT
        id, code, name, native_name as "nativeName", flag_emoji as "flagEmoji",
        is_active as "isActive", display_order as "displayOrder",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM supported_countries
      WHERE code = ${code}
      LIMIT 1
    `,
    );

    if (!countries.length) {
      throw new NotFoundException(`Country not found: ${code}`);
    }

    return countries[0] as SupportedCountryResponse;
  }

  async createCountry(dto: CreateSupportedCountryDto): Promise<SupportedCountryResponse> {
    // Check for duplicate
    const existing = await this.prisma.$queryRaw<{ id: string }[]>(
      Prisma.sql`SELECT id FROM supported_countries WHERE code = ${dto.code} LIMIT 1`,
    );

    if (existing.length) {
      throw new ConflictException(`Country already exists: ${dto.code}`);
    }

    const countryId = ID.generate();
    const isActive = dto.isActive ?? true;
    const displayOrder = dto.displayOrder ?? 0;

    const created = await this.prisma.$queryRaw<CountryRow[]>(
      Prisma.sql`
      INSERT INTO supported_countries (id, code, name, native_name, flag_emoji, is_active, display_order)
      VALUES (
        ${countryId}::uuid,
        ${dto.code},
        ${dto.name},
        ${dto.nativeName ?? null},
        ${dto.flagEmoji ?? null},
        ${isActive},
        ${displayOrder}
      )
      RETURNING
        id, code, name, native_name as "nativeName", flag_emoji as "flagEmoji",
        is_active as "isActive", display_order as "displayOrder",
        created_at as "createdAt", updated_at as "updatedAt"
    `,
    );

    return created[0] as SupportedCountryResponse;
  }

  async updateCountry(
    code: string,
    dto: UpdateSupportedCountryDto,
  ): Promise<SupportedCountryResponse> {
    // Verify exists
    await this.getCountry(code);

    const nameValue = dto.name ?? null;
    const nativeNameValue = dto.nativeName ?? null;
    const flagEmojiValue = dto.flagEmoji ?? null;
    const isActiveValue = dto.isActive ?? null;
    const displayOrderValue = dto.displayOrder ?? null;

    const updated = await this.prisma.$queryRaw<CountryRow[]>(
      Prisma.sql`
      UPDATE supported_countries
      SET
        name = COALESCE(${nameValue}, name),
        native_name = COALESCE(${nativeNameValue}, native_name),
        flag_emoji = COALESCE(${flagEmojiValue}, flag_emoji),
        is_active = COALESCE(${isActiveValue}, is_active),
        display_order = COALESCE(${displayOrderValue}, display_order),
        updated_at = NOW()
      WHERE code = ${code}
      RETURNING
        id, code, name, native_name as "nativeName", flag_emoji as "flagEmoji",
        is_active as "isActive", display_order as "displayOrder",
        created_at as "createdAt", updated_at as "updatedAt"
    `,
    );

    return updated[0] as SupportedCountryResponse;
  }

  async deleteCountry(code: string): Promise<void> {
    // Verify exists
    await this.getCountry(code);

    await this.prisma.$executeRaw(Prisma.sql`DELETE FROM supported_countries WHERE code = ${code}`);
  }

  // ============================================================
  // SUPPORTED LOCALES
  // ============================================================

  async listLocales(activeOnly = false): Promise<SupportedLocaleListResponse> {
    const activeFilter = activeOnly ? true : null;

    const data = await this.prisma.$queryRaw<LocaleRow[]>(
      Prisma.sql`
      SELECT
        id, code, name, native_name as "nativeName", flag_emoji as "flagEmoji",
        is_active as "isActive", display_order as "displayOrder",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM supported_locales
      WHERE (is_active = ${activeFilter} OR ${activeFilter}::BOOLEAN IS NULL)
      ORDER BY display_order ASC, name ASC
    `,
    );

    return {
      data: data as SupportedLocaleResponse[],
      meta: { total: data.length },
    };
  }

  async getLocale(code: string): Promise<SupportedLocaleResponse> {
    const locales = await this.prisma.$queryRaw<LocaleRow[]>(
      Prisma.sql`
      SELECT
        id, code, name, native_name as "nativeName", flag_emoji as "flagEmoji",
        is_active as "isActive", display_order as "displayOrder",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM supported_locales
      WHERE code = ${code}
      LIMIT 1
    `,
    );

    if (!locales.length) {
      throw new NotFoundException(`Locale not found: ${code}`);
    }

    return locales[0] as SupportedLocaleResponse;
  }

  async createLocale(dto: CreateSupportedLocaleDto): Promise<SupportedLocaleResponse> {
    // Check for duplicate
    const existing = await this.prisma.$queryRaw<{ id: string }[]>(
      Prisma.sql`SELECT id FROM supported_locales WHERE code = ${dto.code} LIMIT 1`,
    );

    if (existing.length) {
      throw new ConflictException(`Locale already exists: ${dto.code}`);
    }

    const localeId = ID.generate();
    const isActive = dto.isActive ?? true;
    const displayOrder = dto.displayOrder ?? 0;

    const created = await this.prisma.$queryRaw<LocaleRow[]>(
      Prisma.sql`
      INSERT INTO supported_locales (id, code, name, native_name, flag_emoji, is_active, display_order)
      VALUES (
        ${localeId}::uuid,
        ${dto.code},
        ${dto.name},
        ${dto.nativeName ?? null},
        ${dto.flagEmoji ?? null},
        ${isActive},
        ${displayOrder}
      )
      RETURNING
        id, code, name, native_name as "nativeName", flag_emoji as "flagEmoji",
        is_active as "isActive", display_order as "displayOrder",
        created_at as "createdAt", updated_at as "updatedAt"
    `,
    );

    return created[0] as SupportedLocaleResponse;
  }

  async updateLocale(
    code: string,
    dto: UpdateSupportedLocaleDto,
  ): Promise<SupportedLocaleResponse> {
    // Verify exists
    await this.getLocale(code);

    const nameValue = dto.name ?? null;
    const nativeNameValue = dto.nativeName ?? null;
    const flagEmojiValue = dto.flagEmoji ?? null;
    const isActiveValue = dto.isActive ?? null;
    const displayOrderValue = dto.displayOrder ?? null;

    const updated = await this.prisma.$queryRaw<LocaleRow[]>(
      Prisma.sql`
      UPDATE supported_locales
      SET
        name = COALESCE(${nameValue}, name),
        native_name = COALESCE(${nativeNameValue}, native_name),
        flag_emoji = COALESCE(${flagEmojiValue}, flag_emoji),
        is_active = COALESCE(${isActiveValue}, is_active),
        display_order = COALESCE(${displayOrderValue}, display_order),
        updated_at = NOW()
      WHERE code = ${code}
      RETURNING
        id, code, name, native_name as "nativeName", flag_emoji as "flagEmoji",
        is_active as "isActive", display_order as "displayOrder",
        created_at as "createdAt", updated_at as "updatedAt"
    `,
    );

    return updated[0] as SupportedLocaleResponse;
  }

  async deleteLocale(code: string): Promise<void> {
    // Verify exists
    await this.getLocale(code);

    await this.prisma.$executeRaw(Prisma.sql`DELETE FROM supported_locales WHERE code = ${code}`);
  }
}
