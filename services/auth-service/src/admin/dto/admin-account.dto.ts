import {
  IsEmail,
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  MinLength,
  IsUUID,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

// Import types from shared package (SSOT)
import type {
  AdminAccount,
  AdminAccountDetail,
  AdminListResponse,
  AdminRoleListResponse,
  InvitationResponse,
} from '@my-girok/types';

// Re-export types for convenience
export type {
  AdminAccount,
  AdminAccountDetail,
  AdminListResponse,
  AdminRoleListResponse,
  InvitationResponse,
};

// Type aliases for backward compatibility
export type AdminResponse = AdminAccount;
export type AdminDetailResponse = AdminAccountDetail;

// Local enums for validation (matching types package)
export enum AdminScope {
  SYSTEM = 'SYSTEM',
  TENANT = 'TENANT',
}

export enum InvitationType {
  EMAIL = 'EMAIL',
  DIRECT = 'DIRECT',
}

export class CreateAdminDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(8)
  tempPassword!: string;

  @IsUUID()
  roleId!: string;

  @IsOptional()
  @IsEnum(AdminScope)
  scope?: AdminScope = AdminScope.SYSTEM;

  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

export class InviteAdminDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsUUID()
  roleId!: string;

  @IsEnum(InvitationType)
  type!: InvitationType;

  @IsOptional()
  @IsString()
  @MinLength(8)
  tempPassword?: string;
}

export class AdminListQueryDto {
  @IsOptional()
  @IsEnum(AdminScope)
  scope?: AdminScope;

  @IsOptional()
  @IsUUID()
  roleId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class UpdateAdminDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AssignRoleDto {
  @IsUUID()
  roleId!: string;
}

// Role List Query DTO
export class AdminRoleListQueryDto {
  @IsOptional()
  @IsEnum(AdminScope)
  scope?: AdminScope;
}
