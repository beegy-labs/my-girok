import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionScope } from '../dto/create-permission.dto';

/**
 * Permission entity
 */
export class PermissionEntity {
  @ApiProperty({
    description: 'Permission ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Resource name',
    example: 'users',
  })
  resource!: string;

  @ApiProperty({
    description: 'Action type',
    example: 'read',
  })
  action!: string;

  @ApiProperty({
    description: 'Display name',
    example: 'View Users',
  })
  displayName!: string;

  @ApiPropertyOptional({
    description: 'Permission description',
    example: 'Allows viewing user information',
  })
  description!: string | null;

  @ApiProperty({
    description: 'Permission category',
    example: 'User Management',
  })
  category!: string;

  @ApiProperty({
    description: 'Permission scope',
    enum: PermissionScope,
  })
  scope!: PermissionScope;

  @ApiPropertyOptional({
    description: 'Service ID for service-scoped permissions',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  serviceId!: string | null;

  @ApiProperty({
    description: 'Created at timestamp',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Updated at timestamp',
    example: '2024-01-01T00:00:00Z',
  })
  updatedAt!: Date;
}

/**
 * Permission summary for listing
 */
export class PermissionSummary {
  @ApiProperty({
    description: 'Permission ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Resource name',
    example: 'users',
  })
  resource!: string;

  @ApiProperty({
    description: 'Action type',
    example: 'read',
  })
  action!: string;

  @ApiProperty({
    description: 'Display name',
    example: 'View Users',
  })
  displayName!: string;

  @ApiProperty({
    description: 'Permission category',
    example: 'User Management',
  })
  category!: string;

  @ApiProperty({
    description: 'Permission scope',
    enum: PermissionScope,
  })
  scope!: PermissionScope;
}

/**
 * Paginated permission list response
 */
export class PermissionListResponse {
  @ApiProperty({
    description: 'List of permissions',
    type: [PermissionSummary],
  })
  data!: PermissionSummary[];

  @ApiProperty({
    description: 'Pagination metadata',
  })
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Permission grouped by category
 */
export class PermissionsByCategory {
  @ApiProperty({
    description: 'Category name',
    example: 'User Management',
  })
  category!: string;

  @ApiProperty({
    description: 'Permissions in this category',
    type: [PermissionSummary],
  })
  permissions!: PermissionSummary[];
}
