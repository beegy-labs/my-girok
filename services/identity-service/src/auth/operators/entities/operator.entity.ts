import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvitationType } from '../dto/create-operator.dto';
import { PaginationMeta } from '../../../common/entities/pagination.entity';

/**
 * Invitation status enumeration
 */
export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

/**
 * Operator entity
 */
export class OperatorEntity {
  @ApiProperty({
    description: 'Operator ID',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Account ID',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  accountId!: string;

  @ApiProperty({
    description: 'Email address',
    type: String,
    example: 'operator@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Operator name',
    type: String,
    example: 'John Doe',
  })
  name!: string;

  @ApiProperty({
    description: 'Service ID',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  serviceId!: string;

  @ApiProperty({
    description: 'Country code',
    type: String,
    example: 'KR',
  })
  countryCode!: string;

  @ApiProperty({
    description: 'Role ID',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  roleId!: string;

  @ApiProperty({
    description: 'Whether the operator is active',
    type: Boolean,
    example: true,
  })
  isActive!: boolean;

  @ApiPropertyOptional({
    description: 'Invitation ID',
    type: String,
    nullable: true,
    example: '550e8400-e29b-41d4-a716-446655440004',
  })
  invitationId!: string | null;

  @ApiPropertyOptional({
    description: 'ID of the user who invited this operator',
    type: String,
    nullable: true,
    example: '550e8400-e29b-41d4-a716-446655440005',
  })
  invitedBy!: string | null;

  @ApiPropertyOptional({
    description: 'When the invitation was sent',
    type: Date,
    nullable: true,
    example: '2024-01-01T00:00:00Z',
  })
  invitedAt!: Date | null;

  @ApiPropertyOptional({
    description: 'When the invitation was accepted',
    type: Date,
    nullable: true,
    example: '2024-01-02T00:00:00Z',
  })
  acceptedAt!: Date | null;

  @ApiPropertyOptional({
    description: 'Last login timestamp',
    type: Date,
    nullable: true,
    example: '2024-01-03T00:00:00Z',
  })
  lastLoginAt!: Date | null;

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
    description: 'Deleted at timestamp (soft delete)',
    type: Date,
    nullable: true,
    example: null,
  })
  deletedAt!: Date | null;
}

/**
 * Operator role info for nested display
 */
export class OperatorRoleInfo {
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
    description: 'Role display name',
    type: String,
    example: 'Service Administrator',
  })
  displayName!: string;
}

/**
 * Operator summary for listing
 */
export class OperatorSummary {
  @ApiProperty({
    description: 'Operator ID',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Email address',
    type: String,
    example: 'operator@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Operator name',
    type: String,
    example: 'John Doe',
  })
  name!: string;

  @ApiProperty({
    description: 'Service ID',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  serviceId!: string;

  @ApiProperty({
    description: 'Country code',
    type: String,
    example: 'KR',
  })
  countryCode!: string;

  @ApiProperty({
    description: 'Role name',
    type: String,
    example: 'service_admin',
  })
  roleName!: string;

  @ApiProperty({
    description: 'Role display name',
    type: String,
    example: 'Service Administrator',
  })
  roleDisplayName!: string;

  @ApiProperty({
    description: 'Whether the operator is active',
    type: Boolean,
    example: true,
  })
  isActive!: boolean;

  @ApiPropertyOptional({
    description: 'Last login timestamp',
    type: Date,
    nullable: true,
    example: '2024-01-03T00:00:00Z',
  })
  lastLoginAt!: Date | null;
}

/**
 * Operator with permissions
 */
export class OperatorWithPermissions extends OperatorEntity {
  @ApiProperty({
    description: 'Role information',
    type: () => OperatorRoleInfo,
  })
  role!: OperatorRoleInfo;

  @ApiProperty({
    description: 'All effective permissions (role + direct)',
    type: [String],
    example: ['users:read', 'users:write'],
  })
  permissions!: string[];

  @ApiProperty({
    description: 'Direct permissions (not from role)',
    type: [String],
    example: ['reports:export'],
  })
  directPermissions!: string[];
}

/**
 * Operator invitation entity
 */
export class OperatorInvitationEntity {
  @ApiProperty({
    description: 'Invitation ID',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Email address of invitee',
    type: String,
    example: 'operator@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Name of invitee',
    type: String,
    example: 'John Doe',
  })
  name!: string;

  @ApiProperty({
    description: 'Service ID',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  serviceId!: string;

  @ApiProperty({
    description: 'Country code',
    type: String,
    example: 'KR',
  })
  countryCode!: string;

  @ApiProperty({
    description: 'Role ID to assign',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  roleId!: string;

  @ApiPropertyOptional({
    description: 'Additional permissions to grant',
    type: [String],
    nullable: true,
    example: ['reports:export'],
  })
  permissions!: string[] | null;

  @ApiProperty({
    description: 'ID of the user who created the invitation',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  invitedBy!: string;

  @ApiProperty({
    description: 'Invitation type',
    enum: InvitationType,
    example: InvitationType.EMAIL,
  })
  type!: InvitationType;

  @ApiProperty({
    description: 'Invitation status',
    enum: InvitationStatus,
    example: InvitationStatus.PENDING,
  })
  status!: InvitationStatus;

  @ApiPropertyOptional({
    description: 'Invitation token (only for EMAIL type)',
    type: String,
    nullable: true,
    example: 'abc123...',
  })
  token!: string | null;

  @ApiProperty({
    description: 'Expiration timestamp',
    type: Date,
    example: '2024-01-08T00:00:00Z',
  })
  expiresAt!: Date;

  @ApiPropertyOptional({
    description: 'When the invitation was accepted',
    type: Date,
    nullable: true,
    example: '2024-01-02T00:00:00Z',
  })
  acceptedAt!: Date | null;

  @ApiProperty({
    description: 'Created at timestamp',
    type: Date,
    example: '2024-01-01T00:00:00Z',
  })
  createdAt!: Date;
}

/**
 * Paginated operator list response
 */
export class OperatorListResponse {
  @ApiProperty({
    description: 'List of operators',
    type: [OperatorSummary],
  })
  data!: OperatorSummary[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: () => PaginationMeta,
  })
  meta!: PaginationMeta;
}

/**
 * Paginated invitation list response
 */
export class InvitationListResponse {
  @ApiProperty({
    description: 'List of invitations',
    type: [OperatorInvitationEntity],
  })
  data!: OperatorInvitationEntity[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: () => PaginationMeta,
  })
  meta!: PaginationMeta;
}
