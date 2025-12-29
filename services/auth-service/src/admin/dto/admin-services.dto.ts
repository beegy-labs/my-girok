import {
  IsString,
  IsBoolean,
  IsOptional,
  IsInt,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ConsentType, LegalDocumentType } from '../../../node_modules/.prisma/auth-client';

// ============================================================
// Service DTOs
// ============================================================

export class ServiceQueryDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

export interface ServiceResponse {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
  settings: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceListResponse {
  data: ServiceResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

// ============================================================
// Service Consent Requirement DTOs
// ============================================================

export class ConsentRequirementQueryDto {
  @IsOptional()
  @IsString()
  countryCode?: string;
}

export class CreateConsentRequirementDto {
  @IsString()
  countryCode!: string;

  @IsEnum(ConsentType)
  consentType!: ConsentType;

  @IsBoolean()
  isRequired!: boolean;

  @IsEnum(LegalDocumentType)
  documentType!: LegalDocumentType;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  displayOrder!: number;

  @IsString()
  labelKey!: string;

  @IsString()
  descriptionKey!: string;
}

export class UpdateConsentRequirementDto {
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsEnum(LegalDocumentType)
  documentType?: LegalDocumentType;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  displayOrder?: number;

  @IsOptional()
  @IsString()
  labelKey?: string;

  @IsOptional()
  @IsString()
  descriptionKey?: string;
}

export interface ConsentRequirementResponse {
  id: string;
  serviceId: string;
  countryCode: string;
  consentType: ConsentType;
  isRequired: boolean;
  documentType: LegalDocumentType;
  displayOrder: number;
  labelKey: string;
  descriptionKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsentRequirementListResponse {
  data: ConsentRequirementResponse[];
  meta: {
    total: number;
    serviceId: string;
    countryCode?: string;
  };
}

// ============================================================
// Bulk Update DTOs
// ============================================================

export class BulkConsentRequirementItemDto {
  @IsEnum(ConsentType)
  consentType!: ConsentType;

  @IsBoolean()
  isRequired!: boolean;

  @IsEnum(LegalDocumentType)
  documentType!: LegalDocumentType;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  displayOrder!: number;

  @IsString()
  labelKey!: string;

  @IsString()
  descriptionKey!: string;
}

export class BulkUpdateConsentRequirementsDto {
  @IsString()
  countryCode!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkConsentRequirementItemDto)
  requirements!: BulkConsentRequirementItemDto[];
}
