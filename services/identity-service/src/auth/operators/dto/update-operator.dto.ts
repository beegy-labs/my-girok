import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsArray,
  IsInt,
  IsIn,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Allowed sort fields for operators
 */
export const OPERATOR_ALLOWED_SORT_FIELDS = [
  'name',
  'email',
  'createdAt',
  'updatedAt',
  'lastLoginAt',
] as const;

export type OperatorSortField = (typeof OPERATOR_ALLOWED_SORT_FIELDS)[number];

/**
 * DTO for updating an operator
 */
export class UpdateOperatorDto {
  @ApiPropertyOptional({
    description: 'Operator name',
    example: 'John Doe',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Role ID to assign',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID()
  @IsOptional()
  roleId?: string;

  @ApiPropertyOptional({
    description: 'Whether the operator is active',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

/**
 * DTO for querying operators
 */
export class QueryOperatorDto {
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
    description: 'Filter by role ID',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID()
  @IsOptional()
  roleId?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Search by email or name',
    example: 'john',
  })
  @IsString()
  @IsOptional()
  search?: string;

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
    enum: OPERATOR_ALLOWED_SORT_FIELDS,
  })
  @IsOptional()
  @IsIn([...OPERATOR_ALLOWED_SORT_FIELDS])
  sort?: OperatorSortField;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
  })
  @IsString()
  @IsOptional()
  order?: 'asc' | 'desc';
}

/**
 * DTO for granting permissions to an operator
 */
export class GrantPermissionsDto {
  @ApiProperty({
    description: 'List of permission IDs to grant',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440003'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds!: string[];
}

/**
 * DTO for revoking permissions from an operator
 */
export class RevokeOperatorPermissionsDto {
  @ApiProperty({
    description: 'List of permission IDs to revoke',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440003'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds!: string[];
}

/**
 * DTO for querying invitations
 */
export class QueryInvitationDto {
  @ApiPropertyOptional({
    description: 'Filter by service ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  @IsOptional()
  serviceId?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    example: 'PENDING',
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
  })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;
}
