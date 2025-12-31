import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsUUID,
  IsArray,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating an existing role
 */
export class UpdateRoleDto {
  @ApiPropertyOptional({
    description: 'Display name for the role',
    example: 'Service Administrator',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Role description',
    example: 'Full administrative access to service management',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Hierarchy level (lower = higher priority)',
    example: 10,
    minimum: 0,
    maximum: 1000,
  })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(1000)
  level?: number;

  @ApiPropertyOptional({
    description: 'Parent role ID for hierarchy',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Whether the role is active',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

/**
 * DTO for querying roles
 */
export class QueryRoleDto {
  @ApiPropertyOptional({
    description: 'Filter by scope',
    example: 'SERVICE',
  })
  @IsString()
  @IsOptional()
  scope?: string;

  @ApiPropertyOptional({
    description: 'Filter by service ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  @IsOptional()
  serviceId?: string;

  @ApiPropertyOptional({
    description: 'Filter by country code',
    example: 'KR',
  })
  @IsString()
  @IsOptional()
  @MaxLength(2)
  countryCode?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by system roles',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  isSystem?: boolean;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt',
  })
  @IsString()
  @IsOptional()
  sort?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
  })
  @IsString()
  @IsOptional()
  order?: 'asc' | 'desc';
}

/**
 * DTO for assigning permissions to a role
 */
export class AssignPermissionsDto {
  @ApiPropertyOptional({
    description: 'List of permission IDs to assign',
    example: ['550e8400-e29b-41d4-a716-446655440002'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds!: string[];
}

/**
 * DTO for revoking permissions from a role
 */
export class RevokePermissionsDto {
  @ApiPropertyOptional({
    description: 'List of permission IDs to revoke',
    example: ['550e8400-e29b-41d4-a716-446655440002'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds!: string[];
}
