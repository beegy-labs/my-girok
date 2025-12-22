import { IsBoolean, IsEnum, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ConsentType, LegalDocumentType } from '.prisma/auth-client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Consent requirement configuration
 */
export class ConsentRequirementDto {
  @ApiProperty({ enum: ConsentType })
  @IsEnum(ConsentType)
  type!: ConsentType;

  @ApiProperty({ description: 'Whether this consent is required for registration' })
  @IsBoolean()
  required!: boolean;

  @ApiProperty({ enum: LegalDocumentType })
  @IsEnum(LegalDocumentType)
  documentType!: LegalDocumentType;

  @ApiProperty({ description: 'i18n key for label' })
  @IsString()
  labelKey!: string;

  @ApiProperty({ description: 'i18n key for description' })
  @IsString()
  descriptionKey!: string;
}

/**
 * Single consent input during registration
 */
export class CreateConsentDto {
  @ApiProperty({ enum: ConsentType })
  @IsEnum(ConsentType)
  type!: ConsentType;

  @ApiProperty({ description: 'Whether user agreed to this consent' })
  @IsBoolean()
  agreed!: boolean;

  @ApiPropertyOptional({ description: 'Legal document ID for audit trail' })
  @IsOptional()
  @IsString()
  documentId?: string;
}

/**
 * Multiple consents input during registration
 */
export class CreateConsentsDto {
  @ApiProperty({ type: [CreateConsentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateConsentDto)
  consents!: CreateConsentDto[];
}

/**
 * Update consent input
 */
export class UpdateConsentDto {
  @ApiProperty({ enum: ConsentType })
  @IsEnum(ConsentType)
  type!: ConsentType;

  @ApiProperty({ description: 'New consent status' })
  @IsBoolean()
  agreed!: boolean;
}

/**
 * Get document query params
 */
export class GetDocumentQueryDto {
  @ApiPropertyOptional({ enum: ['ko', 'en', 'ja'], default: 'ko' })
  @IsOptional()
  @IsString()
  locale?: string = 'ko';
}

/**
 * Document response
 */
export class LegalDocumentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: LegalDocumentType })
  type!: LegalDocumentType;

  @ApiProperty()
  version!: string;

  @ApiProperty()
  locale!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  content!: string;

  @ApiPropertyOptional()
  summary?: string;

  @ApiProperty()
  effectiveDate!: Date;
}

/**
 * User consent response
 */
export class UserConsentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ConsentType })
  consentType!: ConsentType;

  @ApiProperty()
  agreed!: boolean;

  @ApiProperty()
  agreedAt!: Date;

  @ApiPropertyOptional()
  withdrawnAt?: Date;

  @ApiPropertyOptional()
  documentVersion?: string;
}
