/**
 * Admin Profile Management DTOs (Phase 2)
 * SCIM 2.0 Core + Employee + Job & Organization attributes
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  IsDateString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  EmployeeType,
  EmploymentStatus,
  AccountLifecycleStatus,
  JobFamily,
  ProbationStatus,
} from '@my-girok/types';

// ============================================================================
// SCIM Core Update DTO
// ============================================================================

export class UpdateScimCoreDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  externalId?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  givenName?: string;

  @IsOptional()
  @IsString()
  familyName?: string;

  @IsOptional()
  @IsString()
  nativeGivenName?: string;

  @IsOptional()
  @IsString()
  nativeFamilyName?: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  preferredLanguage?: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  profileUrl?: string;

  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;
}

// ============================================================================
// Employee Info Update DTO
// ============================================================================

export class UpdateEmployeeInfoDto {
  @IsOptional()
  @IsString()
  employeeNumber?: string;

  @IsOptional()
  @IsEnum(EmployeeType)
  employeeType?: EmployeeType;

  @IsOptional()
  @IsEnum(EmploymentStatus)
  employmentStatus?: EmploymentStatus;

  @IsOptional()
  @IsEnum(AccountLifecycleStatus)
  lifecycleStatus?: AccountLifecycleStatus;
}

// ============================================================================
// Job & Organization Update DTO
// ============================================================================

export class UpdateJobOrganizationDto {
  @IsOptional()
  @IsString()
  jobGradeId?: string;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @IsString()
  jobTitleEn?: string;

  @IsOptional()
  @IsString()
  jobCode?: string;

  @IsOptional()
  @IsEnum(JobFamily)
  jobFamily?: JobFamily;

  @IsOptional()
  @IsString()
  organizationUnitId?: string;

  @IsOptional()
  @IsString()
  costCenter?: string;

  @IsOptional()
  @IsString()
  managerAdminId?: string;

  @IsOptional()
  @IsString()
  dottedLineManagerId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  directReportsCount?: number;
}

// ============================================================================
// Partner Info Update DTO
// ============================================================================

export class UpdatePartnerInfoDto {
  @IsOptional()
  @IsString()
  partnerCompanyId?: string;

  @IsOptional()
  @IsString()
  partnerEmployeeId?: string;

  @IsOptional()
  @IsDateString()
  partnerContractEndDate?: string;
}

// ============================================================================
// JML Lifecycle Update DTOs
// ============================================================================

export class UpdateJoinerInfoDto {
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @IsOptional()
  @IsDateString()
  originalHireDate?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  onboardingCompletedAt?: string;

  @IsOptional()
  @IsDateString()
  probationEndDate?: string;

  @IsOptional()
  @IsEnum(ProbationStatus)
  probationStatus?: ProbationStatus;
}

export class UpdateMoverInfoDto {
  @IsOptional()
  @IsDateString()
  lastRoleChangeAt?: string;

  @IsOptional()
  @IsDateString()
  lastPromotionDate?: string;

  @IsOptional()
  @IsDateString()
  lastTransferDate?: string;
}

export class UpdateLeaverInfoDto {
  @IsOptional()
  @IsDateString()
  terminationDate?: string;

  @IsOptional()
  @IsDateString()
  lastWorkingDay?: string;

  @IsOptional()
  @IsString()
  terminationReason?: string;

  @IsOptional()
  @IsString()
  terminationType?: string;

  @IsOptional()
  @IsBoolean()
  eligibleForRehire?: boolean;

  @IsOptional()
  @IsBoolean()
  exitInterviewCompleted?: boolean;
}

// ============================================================================
// Contact Info Update DTO
// ============================================================================

export class UpdateContactInfoDto {
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  phoneCountryCode?: string;

  @IsOptional()
  @IsString()
  mobileNumber?: string;

  @IsOptional()
  @IsString()
  mobileCountryCode?: string;

  @IsOptional()
  @IsString()
  workPhone?: string;

  @IsOptional()
  emergencyContact?: Record<string, any>;
}

// ============================================================================
// Complete Admin Profile Update DTO
// ============================================================================

export class UpdateAdminProfileDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateScimCoreDto)
  scim?: UpdateScimCoreDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateEmployeeInfoDto)
  employee?: UpdateEmployeeInfoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateJobOrganizationDto)
  job?: UpdateJobOrganizationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePartnerInfoDto)
  partner?: UpdatePartnerInfoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateJoinerInfoDto)
  joiner?: UpdateJoinerInfoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateMoverInfoDto)
  mover?: UpdateMoverInfoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateLeaverInfoDto)
  leaver?: UpdateLeaverInfoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateContactInfoDto)
  contact?: UpdateContactInfoDto;
}

// ============================================================================
// Admin Detail Response (with Phase 2 fields)
// ============================================================================

export interface AdminDetailResponse {
  // Core fields
  id: string;
  email: string;
  name: string;
  scope: string;
  tenantId: string | null;
  roleId: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  accountMode: string;
  countryCode: string | null;

  // SCIM Core
  username?: string;
  externalId?: string;
  displayName?: string;
  givenName?: string;
  familyName?: string;
  nativeGivenName?: string;
  nativeFamilyName?: string;
  nickname?: string;
  preferredLanguage?: string;
  locale?: string;
  timezone?: string;
  profileUrl?: string;
  profilePhotoUrl?: string;

  // Employee Info
  employeeNumber?: string;
  employeeType?: EmployeeType;
  employmentStatus?: EmploymentStatus;
  lifecycleStatus?: AccountLifecycleStatus;

  // Job & Organization
  jobGradeId?: string;
  jobTitle?: string;
  jobTitleEn?: string;
  jobCode?: string;
  jobFamily?: JobFamily;
  organizationUnitId?: string;
  costCenter?: string;
  managerAdminId?: string;
  dottedLineManagerId?: string;
  directReportsCount?: number;

  // Partner
  partnerCompanyId?: string;
  partnerEmployeeId?: string;
  partnerContractEndDate?: Date;

  // JML - Joiner
  hireDate?: Date;
  originalHireDate?: Date;
  startDate?: Date;
  onboardingCompletedAt?: Date;
  probationEndDate?: Date;
  probationStatus?: ProbationStatus;

  // JML - Mover
  lastRoleChangeAt?: Date;
  lastPromotionDate?: Date;
  lastTransferDate?: Date;

  // JML - Leaver
  terminationDate?: Date;
  lastWorkingDay?: Date;
  terminationReason?: string;
  terminationType?: string;
  eligibleForRehire?: boolean;
  exitInterviewCompleted?: boolean;

  // Contact
  phoneNumber?: string;
  phoneCountryCode?: string;
  mobileNumber?: string;
  mobileCountryCode?: string;
  workPhone?: string;
  emergencyContact?: Record<string, any>;

  // Relations
  role?: {
    id: string;
    name: string;
    displayName: string;
    level: number;
  };
  tenant?: {
    id: string;
    name: string;
    slug: string;
    type: string;
    status: string;
  };
  manager?: {
    id: string;
    name: string;
    email: string;
    jobTitle?: string;
  };
}
