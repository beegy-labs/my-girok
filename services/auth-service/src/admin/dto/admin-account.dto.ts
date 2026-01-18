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

export interface RoleResponse {
  id: string;
  name: string;
  displayName: string;
  level: number;
}

export interface PermissionResponse {
  id: string;
  resource: string;
  action: string;
  displayName: string;
  description: string | null;
  category: string;
}

export interface TenantResponse {
  id: string;
  name: string;
  slug: string;
  type: string;
}

export interface AdminResponse {
  id: string;
  email: string;
  name: string;
  scope: AdminScope;
  tenantId: string | null;
  role: RoleResponse;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface AdminDetailResponse extends AdminResponse {
  permissions: PermissionResponse[];
  tenant?: TenantResponse;
}

export interface AdminListResponse {
  admins: AdminResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface InvitationResponse {
  id: string;
  email: string;
  name: string;
  type: InvitationType;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  expiresAt: Date;
  createdAt: Date;
}
