import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsObject,
  MinLength,
  MaxLength,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ConsentType, ConsentScope } from '.prisma/identity-legal-client';

/**
 * DTO for granting a consent
 * Records user's consent with full audit trail
 */
export class GrantConsentDto {
  @ApiProperty({
    description: 'Account ID of the user granting consent',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  @IsUUID()
  accountId!: string;

  @ApiProperty({
    description: 'Type of consent being granted',
    enum: ConsentType,
    example: 'TERMS_OF_SERVICE',
  })
  @IsEnum(ConsentType)
  consentType!: ConsentType;

  @ApiPropertyOptional({
    description: 'Scope of consent (SERVICE or PLATFORM)',
    enum: ConsentScope,
    default: 'SERVICE',
  })
  @IsOptional()
  @IsEnum(ConsentScope)
  scope?: ConsentScope = ConsentScope.SERVICE;

  @ApiPropertyOptional({
    description: 'Service ID if scope is SERVICE',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiProperty({
    description: 'ISO 3166-1 alpha-2 country code',
    example: 'KR',
    minLength: 2,
    maxLength: 2,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(2)
  countryCode!: string;

  @ApiPropertyOptional({
    description: 'Legal document ID for audit trail',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  @IsOptional()
  @IsUUID()
  documentId?: string;

  @ApiPropertyOptional({
    description: 'Document version at time of consent',
    example: '1.0.0',
  })
  @IsOptional()
  @IsString()
  documentVersion?: string;

  @ApiPropertyOptional({
    description: 'Client IP address for audit',
    example: '192.168.1.1',
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'Client user agent for audit',
    example: 'Mozilla/5.0...',
  })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Individual consent item for bulk operations
 */
export class GrantConsentItemDto {
  @ApiProperty({
    description: 'Type of consent',
    enum: ConsentType,
  })
  @IsEnum(ConsentType)
  consentType!: ConsentType;

  @ApiPropertyOptional({
    description: 'Legal document ID',
  })
  @IsOptional()
  @IsUUID()
  documentId?: string;

  @ApiPropertyOptional({
    description: 'Document version',
  })
  @IsOptional()
  @IsString()
  documentVersion?: string;
}

/**
 * DTO for bulk consent granting
 */
export class GrantBulkConsentsDto {
  @ApiProperty({
    description: 'Account ID of the user granting consents',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  @IsUUID()
  accountId!: string;

  @ApiProperty({
    description: 'ISO 3166-1 alpha-2 country code',
    example: 'KR',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(2)
  countryCode!: string;

  @ApiProperty({
    description: 'List of consents to grant',
    type: [GrantConsentItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GrantConsentItemDto)
  consents!: GrantConsentItemDto[];

  @ApiPropertyOptional({
    description: 'Client IP address for audit',
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'Client user agent for audit',
  })
  @IsOptional()
  @IsString()
  userAgent?: string;
}
