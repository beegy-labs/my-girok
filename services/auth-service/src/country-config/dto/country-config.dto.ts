import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCountryConfigDto {
  @ApiProperty()
  @IsString()
  countryCode: string;

  @ApiProperty()
  @IsString()
  countryName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryNameNative?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subregion?: string;

  @ApiProperty()
  @IsString()
  currencyCode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currencySymbol?: string;

  @ApiProperty()
  @IsString()
  defaultTimezone: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  timezones?: string[];

  @ApiPropertyOptional({ default: 40 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  standardWorkHoursPerWeek?: number;

  @ApiPropertyOptional({ type: [String], default: ['MON', 'TUE', 'WED', 'THU', 'FRI'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  standardWorkDays?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  overtimeAllowed?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxOvertimeHoursPerWeek?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minAnnualLeaveDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  statutorySickDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  maternityLeaveWeeks?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  paternityLeaveWeeks?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  taxYearStartMonth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxIdFormat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dataPrivacyLaw?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employmentLawNotes?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metadata?: string;
}

export class UpdateCountryConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryNameNative?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currencySymbol?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultTimezone?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  timezones?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  standardWorkHoursPerWeek?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  standardWorkDays?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  overtimeAllowed?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxOvertimeHoursPerWeek?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  minAnnualLeaveDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  statutorySickDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  maternityLeaveWeeks?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  paternityLeaveWeeks?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxIdFormat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dataPrivacyLaw?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employmentLawNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CountryConfigQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

export class CountryConfigResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  countryCode: string;

  @ApiProperty()
  countryName: string;

  @ApiPropertyOptional()
  countryNameNative?: string;

  @ApiPropertyOptional()
  region?: string;

  @ApiPropertyOptional()
  subregion?: string;

  @ApiProperty()
  currencyCode: string;

  @ApiPropertyOptional()
  currencySymbol?: string;

  @ApiProperty()
  defaultTimezone: string;

  @ApiProperty({ type: [String] })
  timezones: string[];

  @ApiPropertyOptional()
  standardWorkHoursPerWeek?: number;

  @ApiProperty({ type: [String] })
  standardWorkDays: string[];

  @ApiPropertyOptional()
  overtimeAllowed?: boolean;

  @ApiPropertyOptional()
  maxOvertimeHoursPerWeek?: number;

  @ApiPropertyOptional()
  minAnnualLeaveDays?: number;

  @ApiPropertyOptional()
  statutorySickDays?: number;

  @ApiPropertyOptional()
  maternityLeaveWeeks?: number;

  @ApiPropertyOptional()
  paternityLeaveWeeks?: number;

  @ApiPropertyOptional()
  taxYearStartMonth?: number;

  @ApiPropertyOptional()
  taxIdFormat?: string;

  @ApiPropertyOptional()
  dataPrivacyLaw?: string;

  @ApiPropertyOptional()
  employmentLawNotes?: string;

  @ApiPropertyOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  metadata?: any;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
