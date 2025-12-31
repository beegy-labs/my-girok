import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsDate,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { LegalDocumentType } from '.prisma/identity-legal-client';
import { PaginationDto } from '../../../common/pagination/pagination.dto.js';

/**
 * Allowed sort fields for legal documents
 */
export const LEGAL_DOCUMENT_ALLOWED_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'effectiveDate',
  'type',
  'version',
  'title',
] as const;

export type LegalDocumentSortField = (typeof LEGAL_DOCUMENT_ALLOWED_SORT_FIELDS)[number];

/**
 * DTO for creating a legal document
 */
export class CreateLegalDocumentDto {
  @ApiProperty({
    description: 'Type of legal document',
    enum: LegalDocumentType,
    example: 'TERMS_OF_SERVICE',
  })
  @IsEnum(LegalDocumentType)
  type!: LegalDocumentType;

  @ApiProperty({
    description: 'Document version (semantic versioning recommended)',
    example: '1.0.0',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  version!: string;

  @ApiPropertyOptional({
    description: 'Document locale (ISO 639-1)',
    example: 'en',
    default: 'en',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string = 'en';

  @ApiProperty({
    description: 'Document title',
    example: 'Terms of Service',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiProperty({
    description: 'Full document content (HTML or Markdown)',
    example: '<h1>Terms of Service</h1><p>...</p>',
  })
  @IsString()
  content!: string;

  @ApiPropertyOptional({
    description: 'Brief summary of the document',
  })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({
    description: 'Date when document becomes effective',
    example: '2025-01-01T00:00:00Z',
  })
  @Type(() => Date)
  @IsDate()
  effectiveDate!: Date;

  @ApiPropertyOptional({
    description: 'Date when document expires (null for no expiry)',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;

  @ApiPropertyOptional({
    description: 'Service ID if document is service-specific',
  })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({
    description: 'Country code if document is country-specific (ISO 3166-1 alpha-2)',
    example: 'KR',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(2)
  countryCode?: string;
}

/**
 * DTO for updating a legal document
 */
export class UpdateLegalDocumentDto {
  @ApiPropertyOptional({
    description: 'Document title',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Full document content',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'Brief summary',
  })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({
    description: 'Effective date',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveDate?: Date;

  @ApiPropertyOptional({
    description: 'Expiry date',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;

  @ApiPropertyOptional({
    description: 'Whether document is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Query parameters for listing legal documents
 * Extends PaginationDto for standardized pagination (SSOT)
 */
export class LegalDocumentQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by document type',
    enum: LegalDocumentType,
  })
  @IsOptional()
  @IsEnum(LegalDocumentType)
  type?: LegalDocumentType;

  @ApiPropertyOptional({
    description: 'Filter by locale',
    example: 'en',
  })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional({
    description: 'Filter by country code',
    example: 'KR',
  })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({
    description: 'Filter by service ID',
  })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  /**
   * Get Prisma orderBy for legal documents
   * Uses document-specific allowed sort fields
   */
  getDocumentOrderBy(): Record<string, 'asc' | 'desc'> {
    return this.getOrderBy('createdAt', LEGAL_DOCUMENT_ALLOWED_SORT_FIELDS);
  }
}

/**
 * Legal document response entity
 */
export class LegalDocumentResponseDto {
  @ApiProperty({ description: 'Document ID' })
  id!: string;

  @ApiProperty({ description: 'Document type', enum: LegalDocumentType })
  type!: LegalDocumentType;

  @ApiProperty({ description: 'Document version' })
  version!: string;

  @ApiProperty({ description: 'Document locale' })
  locale!: string;

  @ApiProperty({ description: 'Document title' })
  title!: string;

  @ApiProperty({ description: 'Document content' })
  content!: string;

  @ApiPropertyOptional({ description: 'Document summary' })
  summary?: string | null;

  @ApiProperty({ description: 'Effective date' })
  effectiveDate!: Date;

  @ApiPropertyOptional({ description: 'Expiry date' })
  expiresAt?: Date | null;

  @ApiProperty({ description: 'Is document active' })
  isActive!: boolean;

  @ApiPropertyOptional({ description: 'Service ID' })
  serviceId?: string | null;

  @ApiPropertyOptional({ description: 'Country code' })
  countryCode?: string | null;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt!: Date;
}

/**
 * Legal document summary (without content)
 */
export class LegalDocumentSummaryDto {
  @ApiProperty({ description: 'Document ID' })
  id!: string;

  @ApiProperty({ description: 'Document type', enum: LegalDocumentType })
  type!: LegalDocumentType;

  @ApiProperty({ description: 'Document version' })
  version!: string;

  @ApiProperty({ description: 'Document locale' })
  locale!: string;

  @ApiProperty({ description: 'Document title' })
  title!: string;

  @ApiPropertyOptional({ description: 'Document summary' })
  summary?: string | null;

  @ApiProperty({ description: 'Effective date' })
  effectiveDate!: Date;

  @ApiProperty({ description: 'Is document active' })
  isActive!: boolean;
}

/**
 * Paginated legal document list response
 */
export class LegalDocumentListResponseDto {
  @ApiProperty({
    description: 'List of documents',
    type: [LegalDocumentSummaryDto],
  })
  data!: LegalDocumentSummaryDto[];

  @ApiProperty({
    description: 'Pagination metadata',
  })
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
