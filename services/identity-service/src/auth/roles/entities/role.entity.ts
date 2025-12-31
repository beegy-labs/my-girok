import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleScope } from '../dto/create-role.dto';
import { PaginationMeta } from '../../../common/entities/pagination.entity';

/**
 * Role entity representing a role in the authorization system
 */
export class RoleEntity {
  @ApiProperty({
    description: 'Role ID',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Unique role name (machine-readable)',
    type: String,
    example: 'service_admin',
  })
  name!: string;

  @ApiProperty({
    description: 'Display name for the role',
    type: String,
    example: 'Service Administrator',
  })
  displayName!: string;

  @ApiPropertyOptional({
    description: 'Role description',
    type: String,
    nullable: true,
    example: 'Full administrative access to service management',
  })
  description!: string | null;

  @ApiProperty({
    description: 'Role scope',
    enum: RoleScope,
    example: RoleScope.SERVICE,
  })
  scope!: RoleScope;

  @ApiProperty({
    description: 'Hierarchy level (lower = higher priority)',
    type: Number,
    example: 10,
  })
  level!: number;

  @ApiPropertyOptional({
    description: 'Parent role ID for hierarchy',
    type: String,
    nullable: true,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  parentId!: string | null;

  @ApiProperty({
    description: 'Whether this is a system role',
    type: Boolean,
    example: false,
  })
  isSystem!: boolean;

  @ApiProperty({
    description: 'Whether the role is active',
    type: Boolean,
    example: true,
  })
  isActive!: boolean;

  @ApiPropertyOptional({
    description: 'Service ID for service-scoped roles',
    type: String,
    nullable: true,
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  serviceId!: string | null;

  @ApiPropertyOptional({
    description: 'Country code for country-specific roles',
    type: String,
    nullable: true,
    example: 'KR',
  })
  countryCode!: string | null;

  @ApiProperty({
    description: 'Created at timestamp',
    type: Date,
    example: '2024-01-01T00:00:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Updated at timestamp',
    type: Date,
    example: '2024-01-01T00:00:00Z',
  })
  updatedAt!: Date;

  @ApiPropertyOptional({
    description: 'Parent role',
    type: () => RoleEntity,
    nullable: true,
  })
  parent?: RoleEntity | null;

  @ApiPropertyOptional({
    description: 'Child roles',
    type: () => [RoleEntity],
  })
  children?: RoleEntity[];
}

/**
 * Role summary for listing
 */
export class RoleSummary {
  @ApiProperty({
    description: 'Role ID',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Role name',
    type: String,
    example: 'service_admin',
  })
  name!: string;

  @ApiProperty({
    description: 'Display name',
    type: String,
    example: 'Service Administrator',
  })
  displayName!: string;

  @ApiProperty({
    description: 'Role scope',
    enum: RoleScope,
    example: RoleScope.SERVICE,
  })
  scope!: RoleScope;

  @ApiProperty({
    description: 'Hierarchy level',
    type: Number,
    example: 10,
  })
  level!: number;

  @ApiProperty({
    description: 'Whether this is a system role',
    type: Boolean,
    example: false,
  })
  isSystem!: boolean;

  @ApiProperty({
    description: 'Whether the role is active',
    type: Boolean,
    example: true,
  })
  isActive!: boolean;
}

/**
 * Role with permissions for detailed view
 */
export class RoleWithPermissions extends RoleEntity {
  @ApiProperty({
    description: 'Assigned permissions',
    type: [String],
    example: ['users:read', 'users:write'],
  })
  permissions!: string[];
}

/**
 * Role hierarchy tree node
 */
export class RoleHierarchyNode extends RoleSummary {
  @ApiProperty({
    description: 'Child roles in hierarchy',
    type: () => [RoleHierarchyNode],
  })
  children!: RoleHierarchyNode[];
}

/**
 * Paginated role list response
 */
export class RoleListResponse {
  @ApiProperty({
    description: 'List of roles',
    type: [RoleSummary],
  })
  data!: RoleSummary[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: () => PaginationMeta,
  })
  meta!: PaginationMeta;
}
