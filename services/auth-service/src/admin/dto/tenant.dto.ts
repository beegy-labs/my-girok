import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TenantStatus, TenantType } from '../types/admin.types';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens only',
  })
  slug!: string;

  @IsEnum(['INTERNAL', 'COMMERCE', 'ADBID', 'POSTBACK', 'AGENCY'])
  @IsOptional()
  type?: TenantType;

  @IsObject()
  @IsOptional()
  settings?: Record<string, unknown>;
}

export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsObject()
  @IsOptional()
  settings?: Record<string, unknown>;
}

export class UpdateTenantStatusDto {
  @IsEnum(['PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED'])
  status!: TenantStatus;

  @IsString()
  @IsOptional()
  reason?: string;
}

export interface TenantListQuery {
  type?: TenantType;
  status?: TenantStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TenantResponse {
  id: string;
  name: string;
  type: TenantType;
  slug: string;
  status: TenantStatus;
  settings: Record<string, unknown> | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  adminCount?: number;
}

export interface TenantListResponse {
  items: TenantResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
