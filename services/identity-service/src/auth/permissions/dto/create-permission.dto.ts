import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Permission scope enumeration
 */
export enum PermissionScope {
  PLATFORM = 'PLATFORM',
  SERVICE = 'SERVICE',
}

/**
 * Permission action enumeration
 */
export enum PermissionAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LIST = 'LIST',
  MANAGE = 'MANAGE',
  EXECUTE = 'EXECUTE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

/**
 * DTO for creating a new permission
 */
export class CreatePermissionDto {
  @ApiProperty({
    description: 'Resource name (e.g., users, orders, products)',
    example: 'users',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  resource!: string;

  @ApiProperty({
    description: 'Action type',
    example: 'read',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  action!: string;

  @ApiProperty({
    description: 'Display name for the permission',
    example: 'View Users',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  displayName!: string;

  @ApiPropertyOptional({
    description: 'Permission description',
    example: 'Allows viewing user information',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Permission category for grouping',
    example: 'User Management',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  category!: string;

  @ApiProperty({
    description: 'Permission scope',
    enum: PermissionScope,
    example: PermissionScope.SERVICE,
  })
  @IsEnum(PermissionScope)
  scope!: PermissionScope;

  @ApiPropertyOptional({
    description: 'Service ID for service-scoped permissions',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  @IsOptional()
  serviceId?: string;
}
