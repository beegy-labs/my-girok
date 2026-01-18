import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateCountryConfigDto,
  UpdateCountryConfigDto,
  CountryConfigQueryDto,
  CountryConfigResponseDto,
} from '../dto/country-config.dto';
import { Transactional } from '@my-girok/nest-common';

@Injectable()
export class CountryConfigService {
  constructor(private prisma: PrismaService) {}

  @Transactional()
  async create(dto: CreateCountryConfigDto): Promise<CountryConfigResponseDto> {
    const existing = await this.prisma.countryConfig.findUnique({
      where: { countryCode: dto.countryCode },
    });

    if (existing) {
      throw new ConflictException(`Country config for ${dto.countryCode} already exists`);
    }

    const config = await this.prisma.countryConfig.create({
      data: {
        countryCode: dto.countryCode,
        countryName: dto.countryName,
        countryNameNative: dto.countryNameNative,
        region: dto.region,
        subregion: dto.subregion,
        currencyCode: dto.currencyCode,
        currencySymbol: dto.currencySymbol,
        defaultTimezone: dto.defaultTimezone,
        timezones: dto.timezones || [dto.defaultTimezone],
        standardWorkHoursPerWeek: dto.standardWorkHoursPerWeek || 40,
        standardWorkDays: dto.standardWorkDays || ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        overtimeAllowed: dto.overtimeAllowed ?? true,
        maxOvertimeHoursPerWeek: dto.maxOvertimeHoursPerWeek,
        minAnnualLeaveDays: dto.minAnnualLeaveDays || 10,
        statutorySickDays: dto.statutorySickDays,
        maternityLeaveWeeks: dto.maternityLeaveWeeks,
        paternityLeaveWeeks: dto.paternityLeaveWeeks,
        taxYearStartMonth: dto.taxYearStartMonth || 1,
        taxIdFormat: dto.taxIdFormat,
        dataPrivacyLaw: dto.dataPrivacyLaw,
        employmentLawNotes: dto.employmentLawNotes,
        isActive: dto.isActive ?? true,
        metadata: dto.metadata ? JSON.parse(dto.metadata) : {},
      },
    });

    return this.mapToResponse(config);
  }

  async findByCountryCode(countryCode: string): Promise<CountryConfigResponseDto> {
    const config = await this.prisma.countryConfig.findUnique({
      where: { countryCode },
    });

    if (!config) {
      throw new NotFoundException(`Country config for ${countryCode} not found`);
    }

    return this.mapToResponse(config);
  }

  async findById(id: string): Promise<CountryConfigResponseDto> {
    const config = await this.prisma.countryConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException(`Country config ${id} not found`);
    }

    return this.mapToResponse(config);
  }

  async findAll(
    query: CountryConfigQueryDto,
  ): Promise<{ data: CountryConfigResponseDto[]; total: number }> {
    const where: any = {};

    if (query.region) {
      where.region = query.region;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const skip = (query.page - 1) * query.limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.countryConfig.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { countryName: 'asc' },
      }),
      this.prisma.countryConfig.count({ where }),
    ]);

    return {
      data: data.map((c) => this.mapToResponse(c)),
      total,
    };
  }

  @Transactional()
  async update(
    countryCode: string,
    dto: UpdateCountryConfigDto,
  ): Promise<CountryConfigResponseDto> {
    const config = await this.prisma.countryConfig.findUnique({
      where: { countryCode },
    });

    if (!config) {
      throw new NotFoundException(`Country config for ${countryCode} not found`);
    }

    const updated = await this.prisma.countryConfig.update({
      where: { countryCode },
      data: {
        countryName: dto.countryName,
        countryNameNative: dto.countryNameNative,
        currencySymbol: dto.currencySymbol,
        defaultTimezone: dto.defaultTimezone,
        timezones: dto.timezones,
        standardWorkHoursPerWeek: dto.standardWorkHoursPerWeek,
        standardWorkDays: dto.standardWorkDays,
        overtimeAllowed: dto.overtimeAllowed,
        maxOvertimeHoursPerWeek: dto.maxOvertimeHoursPerWeek,
        minAnnualLeaveDays: dto.minAnnualLeaveDays,
        statutorySickDays: dto.statutorySickDays,
        maternityLeaveWeeks: dto.maternityLeaveWeeks,
        paternityLeaveWeeks: dto.paternityLeaveWeeks,
        taxIdFormat: dto.taxIdFormat,
        dataPrivacyLaw: dto.dataPrivacyLaw,
        employmentLawNotes: dto.employmentLawNotes,
        isActive: dto.isActive,
      },
    });

    return this.mapToResponse(updated);
  }

  @Transactional()
  async delete(countryCode: string): Promise<void> {
    const config = await this.prisma.countryConfig.findUnique({
      where: { countryCode },
    });

    if (!config) {
      throw new NotFoundException(`Country config for ${countryCode} not found`);
    }

    await this.prisma.countryConfig.delete({ where: { countryCode } });
  }

  private mapToResponse(config: any): CountryConfigResponseDto {
    return {
      id: config.id,
      countryCode: config.countryCode,
      countryName: config.countryName,
      countryNameNative: config.countryNameNative,
      region: config.region,
      subregion: config.subregion,
      currencyCode: config.currencyCode,
      currencySymbol: config.currencySymbol,
      defaultTimezone: config.defaultTimezone,
      timezones: config.timezones,
      standardWorkHoursPerWeek: config.standardWorkHoursPerWeek
        ? Number(config.standardWorkHoursPerWeek)
        : undefined,
      standardWorkDays: config.standardWorkDays,
      overtimeAllowed: config.overtimeAllowed,
      maxOvertimeHoursPerWeek: config.maxOvertimeHoursPerWeek
        ? Number(config.maxOvertimeHoursPerWeek)
        : undefined,
      minAnnualLeaveDays: config.minAnnualLeaveDays,
      statutorySickDays: config.statutorySickDays,
      maternityLeaveWeeks: config.maternityLeaveWeeks,
      paternityLeaveWeeks: config.paternityLeaveWeeks,
      taxYearStartMonth: config.taxYearStartMonth,
      taxIdFormat: config.taxIdFormat,
      dataPrivacyLaw: config.dataPrivacyLaw,
      employmentLawNotes: config.employmentLawNotes,
      isActive: config.isActive,
      metadata: config.metadata,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }
}
