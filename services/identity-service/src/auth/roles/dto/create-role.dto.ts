import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsInt,
  IsBoolean,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleScope } from '.prisma/identity-auth-client';

// Re-export Prisma enum for external use
export { RoleScope };

/**
 * DTO for creating a new role
 */
export class CreateRoleDto {
  @ApiProperty({
    description: 'Unique role name (machine-readable)',
    example: 'service_admin',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: 'Display name for the role',
    example: 'Service Administrator',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  displayName!: string;

  @ApiPropertyOptional({
    description: 'Role description',
    example: 'Full administrative access to service management',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Role scope',
    enum: RoleScope,
    example: RoleScope.SERVICE,
  })
  @IsEnum(RoleScope)
  scope!: RoleScope;

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
    description: 'Service ID for service-scoped roles',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  @IsOptional()
  serviceId?: string;

  @ApiPropertyOptional({
    description: 'Country code for country-specific roles',
    example: 'KR',
    maxLength: 2,
  })
  @IsString()
  @IsOptional()
  @MaxLength(2)
  countryCode?: string;

  @ApiPropertyOptional({
    description: 'Whether this is a system role (cannot be deleted)',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isSystem?: boolean;
}
