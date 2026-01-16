/**
 * Admin Enterprise Management DTOs (Phase 2)
 * NHI + Location + Access Control + Identity Verification + JSONB Extensions
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  EmployeeType,
  IdentityType,
  ServiceAccountType,
  NhiCredentialType,
  RemoteWorkType,
  SecurityClearance,
  DataAccessLevel,
  VerificationMethod,
  VerificationLevel,
} from '@my-girok/types';

// ============================================================================
// NHI (Non-Human Identity) Management DTOs
// ============================================================================

export class UpdateNhiAttributesDto {
  @IsOptional()
  @IsEnum(IdentityType)
  identityType?: IdentityType;

  @IsOptional()
  @IsString()
  ownerAdminId?: string;

  @IsOptional()
  @IsString()
  secondaryOwnerId?: string;

  @IsOptional()
  @IsString()
  nhiPurpose?: string;

  @IsOptional()
  @IsEnum(ServiceAccountType)
  serviceAccountType?: ServiceAccountType;

  @IsOptional()
  @IsEnum(NhiCredentialType)
  credentialType?: NhiCredentialType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  secretRotationDays?: number;

  @IsOptional()
  @IsDateString()
  nhiExpiryDate?: string;

  @IsOptional()
  @IsDateString()
  lastCredentialRotation?: string;

  @IsOptional()
  nhiConfig?: Record<string, any>;
}

export class CreateNhiDto {
  @IsString()
  email!: string;

  @IsString()
  name!: string;

  @IsEnum(IdentityType)
  identityType!: IdentityType;

  @IsString()
  ownerAdminId!: string;

  @IsOptional()
  @IsString()
  secondaryOwnerId?: string;

  @IsString()
  nhiPurpose!: string;

  @IsOptional()
  @IsEnum(ServiceAccountType)
  serviceAccountType?: ServiceAccountType;

  @IsOptional()
  @IsEnum(NhiCredentialType)
  credentialType?: NhiCredentialType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  secretRotationDays?: number;

  @IsOptional()
  @IsDateString()
  nhiExpiryDate?: string;

  @IsOptional()
  nhiConfig?: Record<string, any>;
}

// ============================================================================
// Location Management DTOs
// ============================================================================

export class UpdatePhysicalLocationDto {
  @IsOptional()
  @IsString()
  legalEntityId?: string;

  @IsOptional()
  @IsString()
  primaryOfficeId?: string;

  @IsOptional()
  @IsString()
  buildingId?: string;

  @IsOptional()
  @IsString()
  floorId?: string;

  @IsOptional()
  @IsString()
  deskCode?: string;

  @IsOptional()
  @IsEnum(RemoteWorkType)
  remoteWorkType?: RemoteWorkType;
}

export class UpdateTaxLegalLocationDto {
  @IsOptional()
  @IsString()
  legalCountryCode?: string;

  @IsOptional()
  @IsString()
  workCountryCode?: string;

  @IsOptional()
  @IsString()
  taxResidenceCountry?: string;

  @IsOptional()
  @IsString()
  payrollCountryCode?: string;
}

// ============================================================================
// Access Control Management DTOs
// ============================================================================

export class UpdateAccessControlDto {
  @IsOptional()
  @IsEnum(SecurityClearance)
  securityClearance?: SecurityClearance;

  @IsOptional()
  @IsEnum(DataAccessLevel)
  dataAccessLevel?: DataAccessLevel;

  @IsOptional()
  @IsDateString()
  accessEndDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedIpRanges?: string[];
}

// ============================================================================
// Identity Verification Management DTOs
// ============================================================================

export class UpdateIdentityVerificationDto {
  @IsOptional()
  @IsBoolean()
  identityVerified?: boolean;

  @IsOptional()
  @IsDateString()
  identityVerifiedAt?: string;

  @IsOptional()
  @IsEnum(VerificationMethod)
  verificationMethod?: VerificationMethod;

  @IsOptional()
  @IsEnum(VerificationLevel)
  verificationLevel?: VerificationLevel;

  @IsOptional()
  @IsString()
  backgroundCheckStatus?: string;

  @IsOptional()
  @IsDateString()
  backgroundCheckDate?: string;
}

export class VerifyAdminIdentityDto {
  @IsEnum(VerificationMethod)
  method!: VerificationMethod;

  @IsEnum(VerificationLevel)
  level!: VerificationLevel;

  @IsOptional()
  @IsString()
  documentId?: string;

  @IsOptional()
  notes?: Record<string, any>;
}

// ============================================================================
// JSONB Extension Management DTOs
// ============================================================================

export class AddSkillDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

  @IsOptional()
  @IsInt()
  @Min(0)
  yearsOfExperience?: number;

  @IsOptional()
  @IsDateString()
  certifiedAt?: string;
}

export class AddCertificationDto {
  @IsString()
  name!: string;

  @IsString()
  issuer!: string;

  @IsOptional()
  @IsDateString()
  issuedAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  credentialId?: string;

  @IsOptional()
  @IsString()
  url?: string;
}

export class AddEducationDto {
  @IsString()
  institution!: string;

  @IsOptional()
  @IsString()
  degree?: string;

  @IsOptional()
  @IsString()
  fieldOfStudy?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4)
  gpa?: number;
}

export class AddWorkHistoryDto {
  @IsString()
  company!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;
}

export class UpdateExtensionAttributesDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddSkillDto)
  skills?: AddSkillDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddCertificationDto)
  certifications?: AddCertificationDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddEducationDto)
  education?: AddEducationDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddWorkHistoryDto)
  workHistory?: AddWorkHistoryDto[];

  @IsOptional()
  customAttributes?: Record<string, any>;

  @IsOptional()
  preferences?: Record<string, any>;

  @IsOptional()
  metadata?: Record<string, any>;
}

// ============================================================================
// Complete Enterprise Update DTO
// ============================================================================

export class UpdateAdminEnterpriseDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateNhiAttributesDto)
  nhi?: UpdateNhiAttributesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePhysicalLocationDto)
  physicalLocation?: UpdatePhysicalLocationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTaxLegalLocationDto)
  taxLegalLocation?: UpdateTaxLegalLocationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateAccessControlDto)
  accessControl?: UpdateAccessControlDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateIdentityVerificationDto)
  identityVerification?: UpdateIdentityVerificationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateExtensionAttributesDto)
  extensions?: UpdateExtensionAttributesDto;
}

// ============================================================================
// Query DTOs for Admin List/Search
// ============================================================================

export class AdminListQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(EmployeeType)
  employeeType?: EmployeeType;

  @IsOptional()
  @IsEnum(IdentityType)
  identityType?: IdentityType;

  @IsOptional()
  @IsString()
  organizationUnitId?: string;

  @IsOptional()
  @IsString()
  managerAdminId?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
