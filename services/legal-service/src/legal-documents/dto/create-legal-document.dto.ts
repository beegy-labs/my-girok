import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsISO31661Alpha2,
  IsLocale,
  IsDateString,
  MaxLength,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum LegalDocumentType {
  TERMS_OF_SERVICE = 'TERMS_OF_SERVICE',
  PRIVACY_POLICY = 'PRIVACY_POLICY',
  COOKIE_POLICY = 'COOKIE_POLICY',
  DATA_PROCESSING_AGREEMENT = 'DATA_PROCESSING_AGREEMENT',
  CONSENT_FORM = 'CONSENT_FORM',
}

export class CreateLegalDocumentDto {
  @ApiProperty({ description: 'Document type', enum: LegalDocumentType })
  @IsEnum(LegalDocumentType)
  type!: LegalDocumentType;

  @ApiProperty({ description: 'Semantic version', example: '1.0.0' })
  @IsString()
  @MaxLength(20)
  version!: string;

  @ApiProperty({ description: 'Document title' })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ description: 'Document content (markdown or HTML)' })
  @IsString()
  content!: string;

  @ApiProperty({ description: 'ISO 3166-1 alpha-2 country code', example: 'KR' })
  @IsISO31661Alpha2()
  countryCode!: string;

  @ApiProperty({ description: 'BCP 47 locale', example: 'ko-KR' })
  @IsLocale()
  locale!: string;

  @ApiPropertyOptional({ description: 'Associated law registry UUID' })
  @IsOptional()
  @IsUUID()
  lawRegistryId?: string;

  @ApiPropertyOptional({ description: 'When document becomes effective' })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: Date;

  @ApiPropertyOptional({ description: 'When document expires' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: Date;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
