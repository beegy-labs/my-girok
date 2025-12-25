import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  IsEnum,
  IsNumber,
  Length,
  MaxLength,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ConsentType } from '../../../node_modules/.prisma/auth-client';

export class NightTimePushDto {
  @IsNumber()
  @Min(0)
  @Max(23)
  start!: number;

  @IsNumber()
  @Min(0)
  @Max(23)
  end!: number;
}

export class DataRetentionDto {
  @IsNumber()
  @Min(1)
  maxDays!: number;
}

export class ParentalConsentDto {
  @IsNumber()
  @Min(1)
  @Max(21)
  ageThreshold!: number;
}

export class CrossBorderTransferDto {
  @IsBoolean()
  requireExplicit!: boolean;
}

export class SpecialRequirementsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => NightTimePushDto)
  nightTimePush?: NightTimePushDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DataRetentionDto)
  dataRetention?: DataRetentionDto;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(21)
  minAge?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ParentalConsentDto)
  parentalConsent?: ParentalConsentDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CrossBorderTransferDto)
  crossBorderTransfer?: CrossBorderTransferDto;
}

export class LawRequirementsDto {
  @IsArray()
  @IsEnum(ConsentType, { each: true })
  requiredConsents!: ConsentType[];

  @IsArray()
  @IsEnum(ConsentType, { each: true })
  optionalConsents!: ConsentType[];

  @IsOptional()
  @ValidateNested()
  @Type(() => SpecialRequirementsDto)
  specialRequirements?: SpecialRequirementsDto;
}

export interface LawRequirements {
  requiredConsents: ConsentType[];
  optionalConsents: ConsentType[];
  specialRequirements?: {
    nightTimePush?: { start: number; end: number };
    dataRetention?: { maxDays: number };
    minAge?: number;
    parentalConsent?: { ageThreshold: number };
    crossBorderTransfer?: { requireExplicit: boolean };
  };
}

export class CreateLawDto {
  @IsString()
  @Length(2, 20)
  code!: string;

  @IsString()
  @Length(2, 2)
  countryCode!: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => LawRequirementsDto)
  requirements!: LawRequirements;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateLawDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LawRequirementsDto)
  requirements?: LawRequirements;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class LawQueryDto {
  @IsOptional()
  @IsString()
  @Length(2, 2)
  countryCode?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10) || 1)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10) || 20)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export interface LawResponse {
  id: string;
  code: string;
  countryCode: string;
  name: string;
  requirements: LawRequirements;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LawListResponse {
  data: LawResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface ConsentRequirementResponse {
  consentType: ConsentType;
  isRequired: boolean;
  source: 'LAW';
  lawCode: string;
}
