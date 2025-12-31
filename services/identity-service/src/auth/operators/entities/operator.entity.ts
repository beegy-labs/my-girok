import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvitationType } from '../dto/create-operator.dto';

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
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Account ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  accountId!: string;

  @ApiProperty({
    description: 'Email address',
    example: 'operator@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Operator name',
    example: 'John Doe',
  })
  name!: string;

  @ApiProperty({
    description: 'Service ID',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  serviceId!: string;

  @ApiProperty({
    description: 'Country code',
    example: 'KR',
  })
  countryCode!: string;

  @ApiProperty({
    description: 'Role ID',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  roleId!: string;

  @ApiProperty({
    description: 'Whether the operator is active',
    example: true,
  })
  isActive!: boolean;

  @ApiPropertyOptional({
    description: 'Invitation ID',
    example: '550e8400-e29b-41d4-a716-446655440004',
  })
  invitationId!: string | null;

  @ApiPropertyOptional({
    description: 'ID of the user who invited this operator',
    example: '550e8400-e29b-41d4-a716-446655440005',
  })
  invitedBy!: string | null;

  @ApiPropertyOptional({
    description: 'When the invitation was sent',
    example: '2024-01-01T00:00:00Z',
  })
  invitedAt!: Date | null;

  @ApiPropertyOptional({
    description: 'When the invitation was accepted',
    example: '2024-01-02T00:00:00Z',
  })
  acceptedAt!: Date | null;

  @ApiPropertyOptional({
    description: 'Last login timestamp',
    example: '2024-01-03T00:00:00Z',
  })
  lastLoginAt!: Date | null;

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

  @ApiPropertyOptional({
    description: 'Deleted at timestamp (soft delete)',
    example: null,
  })
  deletedAt!: Date | null;
}

/**
 * Operator summary for listing
 */
export class OperatorSummary {
  @ApiProperty({
    description: 'Operator ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Email address',
    example: 'operator@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Operator name',
    example: 'John Doe',
  })
  name!: string;

  @ApiProperty({
    description: 'Service ID',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  serviceId!: string;

  @ApiProperty({
    description: 'Country code',
    example: 'KR',
  })
  countryCode!: string;

  @ApiProperty({
    description: 'Role name',
    example: 'service_admin',
  })
  roleName!: string;

  @ApiProperty({
    description: 'Role display name',
    example: 'Service Administrator',
  })
  roleDisplayName!: string;

  @ApiProperty({
    description: 'Whether the operator is active',
    example: true,
  })
  isActive!: boolean;

  @ApiPropertyOptional({
    description: 'Last login timestamp',
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
  })
  role!: {
    id: string;
    name: string;
    displayName: string;
  };

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
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Email address of invitee',
    example: 'operator@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Name of invitee',
    example: 'John Doe',
  })
  name!: string;

  @ApiProperty({
    description: 'Service ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  serviceId!: string;

  @ApiProperty({
    description: 'Country code',
    example: 'KR',
  })
  countryCode!: string;

  @ApiProperty({
    description: 'Role ID to assign',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  roleId!: string;

  @ApiPropertyOptional({
    description: 'Additional permissions to grant',
  })
  permissions!: string[] | null;

  @ApiProperty({
    description: 'ID of the user who created the invitation',
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
    example: 'abc123...',
  })
  token!: string | null;

  @ApiProperty({
    description: 'Expiration timestamp',
    example: '2024-01-08T00:00:00Z',
  })
  expiresAt!: Date;

  @ApiPropertyOptional({
    description: 'When the invitation was accepted',
    example: '2024-01-02T00:00:00Z',
  })
  acceptedAt!: Date | null;

  @ApiProperty({
    description: 'Created at timestamp',
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
  })
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
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
  })
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
