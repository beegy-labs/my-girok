import { IsString, IsOptional, IsInt, Min, Max, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionScope } from './create-permission.dto';

/**
 * DTO for updating an existing permission
 */
export class UpdatePermissionDto {
  @ApiPropertyOptional({
    description: 'Display name for the permission',
    example: 'View Users',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Permission description',
    example: 'Allows viewing user information',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Permission category for grouping',
    example: 'User Management',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  category?: string;
}

/**
 * DTO for querying permissions
 */
export class QueryPermissionDto {
  @ApiPropertyOptional({
    description: 'Filter by resource',
    example: 'users',
  })
  @IsString()
  @IsOptional()
  resource?: string;

  @ApiPropertyOptional({
    description: 'Filter by action',
    example: 'read',
  })
  @IsString()
  @IsOptional()
  action?: string;

  @ApiPropertyOptional({
    description: 'Filter by category',
    example: 'User Management',
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    description: 'Filter by scope',
    example: 'SERVICE',
  })
  @IsString()
  @IsOptional()
  scope?: PermissionScope;

  @ApiPropertyOptional({
    description: 'Filter by service ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsString()
  @IsOptional()
  serviceId?: string;

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
    example: 'resource',
  })
  @IsString()
  @IsOptional()
  sort?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'asc',
  })
  @IsString()
  @IsOptional()
  order?: 'asc' | 'desc';
}

/**
 * DTO for checking permissions
 */
export class CheckPermissionDto {
  @ApiPropertyOptional({
    description: 'Account ID to check permissions for',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  accountId!: string;

  @ApiPropertyOptional({
    description: 'Resource to check',
    example: 'users',
  })
  @IsString()
  resource!: string;

  @ApiPropertyOptional({
    description: 'Action to check',
    example: 'read',
  })
  @IsString()
  action!: string;

  @ApiPropertyOptional({
    description: 'Service ID context',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsString()
  @IsOptional()
  serviceId?: string;
}

/**
 * Permission check result
 */
export class PermissionCheckResult {
  allowed!: boolean;
  matchedRoles!: string[];
  matchedPermissions!: string[];
  deniedReason?: string;
}
