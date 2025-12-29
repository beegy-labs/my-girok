import {
  IsString,
  IsBoolean,
  IsOptional,
  IsInt,
  IsUUID,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  MaxLength,
  IsObject,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

// Enums matching Prisma schema
export enum PermissionTargetType {
  ALL_USERS = 'ALL_USERS',
  USER = 'USER',
  TIER = 'TIER',
  COUNTRY = 'COUNTRY',
  ROLE = 'ROLE',
}

export enum FeatureAction {
  USE = 'USE',
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  ADMIN = 'ADMIN',
}

// Feature DTOs
export class CreateServiceFeatureDto {
  @IsString()
  @MaxLength(50)
  code!: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @MaxLength(50)
  category!: string;

  @IsUUID()
  @IsOptional()
  parentId?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  icon?: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  color?: string;
}

export class UpdateServiceFeatureDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  category?: string;

  @IsUUID()
  @IsOptional()
  parentId?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  icon?: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  color?: string;
}

// Bulk operations
export class BulkFeatureItemDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsInt()
  @IsOptional()
  displayOrder?: number;
}

export class BulkFeatureOperationDto {
  @IsEnum(['create', 'update', 'delete', 'reorder'])
  operation!: 'create' | 'update' | 'delete' | 'reorder';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkFeatureItemDto)
  items!: BulkFeatureItemDto[];
}

// Permission DTOs
export class CreateFeaturePermissionDto {
  @IsEnum(PermissionTargetType)
  targetType!: PermissionTargetType;

  @IsUUID()
  @IsOptional()
  targetId?: string;

  @IsEnum(FeatureAction)
  action!: FeatureAction;

  @IsBoolean()
  @IsOptional()
  isAllowed?: boolean;

  @IsObject()
  @IsOptional()
  conditions?: Record<string, unknown>;

  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @IsDateString()
  @IsOptional()
  validUntil?: string;
}

// Query DTOs
export class ListFeaturesQueryDto {
  @IsString()
  @IsOptional()
  category?: string;

  @IsBoolean()
  @IsOptional()
  includeInactive?: boolean;

  @IsBoolean()
  @IsOptional()
  includeChildren?: boolean;
}

// Response DTOs
export interface ServiceFeatureResponseDto {
  id: string;
  serviceId: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  parentId: string | null;
  path: string;
  depth: number;
  displayOrder: number;
  isActive: boolean;
  isDefault: boolean;
  icon: string | null;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
  children?: ServiceFeatureResponseDto[];
}

export interface FeaturePermissionResponseDto {
  id: string;
  featureId: string;
  serviceId: string;
  targetType: PermissionTargetType;
  targetId: string | null;
  action: FeatureAction;
  isAllowed: boolean;
  conditions: Record<string, unknown> | null;
  validFrom: Date | null;
  validUntil: Date | null;
  createdAt: Date;
  createdBy: string;
}

export interface ServiceFeatureListResponseDto {
  data: ServiceFeatureResponseDto[];
  meta: {
    total: number;
    serviceId: string;
    category?: string;
  };
}
