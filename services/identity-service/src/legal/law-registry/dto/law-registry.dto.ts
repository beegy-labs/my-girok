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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConsentType } from '.prisma/identity-legal-client';

/**
 * Night time push notification restrictions
 */
export class NightTimePushDto {
  @ApiProperty({
    description: 'Start hour (0-23)',
    example: 21,
    minimum: 0,
    maximum: 23,
  })
  @IsNumber()
  @Min(0)
  @Max(23)
  start!: number;

  @ApiProperty({
    description: 'End hour (0-23)',
    example: 8,
    minimum: 0,
    maximum: 23,
  })
  @IsNumber()
  @Min(0)
  @Max(23)
  end!: number;
}

/**
 * Data retention requirements
 */
export class DataRetentionDto {
  @ApiProperty({
    description: 'Maximum retention days',
    example: 365,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  maxDays!: number;
}

/**
 * Parental consent requirements
 */
export class ParentalConsentDto {
  @ApiProperty({
    description: 'Age threshold for parental consent',
    example: 16,
    minimum: 1,
    maximum: 21,
  })
  @IsNumber()
  @Min(1)
  @Max(21)
  ageThreshold!: number;
}

/**
 * Cross-border data transfer requirements
 */
export class CrossBorderTransferDto {
  @ApiProperty({
    description: 'Whether explicit consent is required for cross-border transfers',
    example: true,
  })
  @IsBoolean()
  requireExplicit!: boolean;
}

/**
 * Special requirements for a law
 */
export class SpecialRequirementsDto {
  @ApiPropertyOptional({
    description: 'Night-time push notification restrictions',
    type: NightTimePushDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NightTimePushDto)
  nightTimePush?: NightTimePushDto;

  @ApiPropertyOptional({
    description: 'Data retention requirements',
    type: DataRetentionDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DataRetentionDto)
  dataRetention?: DataRetentionDto;

  @ApiPropertyOptional({
    description: 'Minimum age requirement',
    example: 14,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(21)
  minAge?: number;

  @ApiPropertyOptional({
    description: 'Parental consent requirements',
    type: ParentalConsentDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ParentalConsentDto)
  parentalConsent?: ParentalConsentDto;

  @ApiPropertyOptional({
    description: 'Cross-border transfer requirements',
    type: CrossBorderTransferDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CrossBorderTransferDto)
  crossBorderTransfer?: CrossBorderTransferDto;
}

/**
 * Law requirements including consents and special rules
 */
export class LawRequirementsDto {
  @ApiProperty({
    description: 'Required consent types',
    enum: ConsentType,
    isArray: true,
    example: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'],
  })
  @IsArray()
  @IsEnum(ConsentType, { each: true })
  requiredConsents!: ConsentType[];

  @ApiProperty({
    description: 'Optional consent types',
    enum: ConsentType,
    isArray: true,
    example: ['MARKETING_EMAIL', 'MARKETING_PUSH'],
  })
  @IsArray()
  @IsEnum(ConsentType, { each: true })
  optionalConsents!: ConsentType[];

  @ApiPropertyOptional({
    description: 'Special requirements',
    type: SpecialRequirementsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SpecialRequirementsDto)
  specialRequirements?: SpecialRequirementsDto;
}

/**
 * DTO for creating a law registry entry
 */
export class CreateLawDto {
  @ApiProperty({
    description: 'Law code (e.g., PIPA, GDPR, CCPA)',
    example: 'PIPA',
    minLength: 2,
    maxLength: 20,
  })
  @IsString()
  @Length(2, 20)
  code!: string;

  @ApiProperty({
    description: 'Jurisdiction (e.g., EU, US-CA, KR, JP)',
    example: 'KR',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  jurisdiction!: string;

  @ApiPropertyOptional({
    description: 'Primary ISO 3166-1 alpha-2 country code',
    example: 'KR',
    minLength: 2,
    maxLength: 2,
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  countryCode?: string;

  @ApiProperty({
    description: 'Human-readable law name',
    example: 'Personal Information Protection Act',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    description: 'Law description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Effective date when the law comes into force',
    example: '2021-01-01T00:00:00Z',
  })
  @IsString()
  effectiveFrom!: string;

  @ApiProperty({
    description: 'Law requirements',
    type: LawRequirementsDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => LawRequirementsDto)
  requirements!: LawRequirementsDto;

  @ApiPropertyOptional({
    description: 'Whether the law is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO for updating a law registry entry
 */
export class UpdateLawDto {
  @ApiPropertyOptional({
    description: 'Human-readable law name',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Law description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Law requirements',
    type: LawRequirementsDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LawRequirementsDto)
  requirements?: LawRequirementsDto;

  @ApiPropertyOptional({
    description: 'Whether the law is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Query parameters for listing laws
 */
export class LawQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by country code',
    example: 'KR',
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  countryCode?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10) || 1)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10) || 20)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * Law response entity
 */
export class LawResponseDto {
  @ApiProperty({ description: 'Law ID' })
  id!: string;

  @ApiProperty({ description: 'Law code' })
  code!: string;

  @ApiProperty({ description: 'Jurisdiction' })
  jurisdiction!: string;

  @ApiPropertyOptional({ description: 'Country code' })
  countryCode?: string | null;

  @ApiProperty({ description: 'Law name' })
  name!: string;

  @ApiProperty({ description: 'Effective from date' })
  effectiveFrom!: Date;

  @ApiPropertyOptional({ description: 'Law description' })
  description?: string | null;

  @ApiProperty({ description: 'Law requirements', type: LawRequirementsDto })
  requirements!: LawRequirementsDto;

  @ApiProperty({ description: 'Is law active' })
  isActive!: boolean;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt!: Date;
}

/**
 * Paginated law list response
 */
export class LawListResponseDto {
  @ApiProperty({
    description: 'List of laws',
    type: [LawResponseDto],
  })
  data!: LawResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
  })
  meta!: {
    total: number;
    page: number;
    limit: number;
  };
}

/**
 * Consent requirement response from law
 */
export class ConsentRequirementResponseDto {
  @ApiProperty({ description: 'Consent type', enum: ConsentType })
  consentType!: ConsentType;

  @ApiProperty({ description: 'Whether consent is required' })
  isRequired!: boolean;

  @ApiProperty({ description: 'Source of requirement' })
  source!: 'LAW';

  @ApiProperty({ description: 'Law code' })
  lawCode!: string;
}
