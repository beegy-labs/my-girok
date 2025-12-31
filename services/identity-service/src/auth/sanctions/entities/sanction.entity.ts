import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SanctionSubjectType,
  SanctionType,
  SanctionSeverity,
  SanctionScope,
  IssuerType,
  NotificationChannel,
} from '../dto/create-sanction.dto';
import { SanctionStatus, AppealStatus } from '../dto/update-sanction.dto';

/**
 * Notification status enumeration
 */
export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}

/**
 * Sanction notification entity
 */
export class SanctionNotificationEntity {
  @ApiProperty({
    description: 'Notification ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Sanction ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  sanctionId!: string;

  @ApiProperty({
    description: 'Notification channel',
    enum: NotificationChannel,
  })
  channel!: NotificationChannel;

  @ApiProperty({
    description: 'Notification status',
    enum: NotificationStatus,
  })
  status!: NotificationStatus;

  @ApiPropertyOptional({
    description: 'When the notification was sent',
    example: '2024-01-01T00:00:00Z',
  })
  sentAt!: Date | null;

  @ApiPropertyOptional({
    description: 'When the notification was read',
    example: '2024-01-01T00:01:00Z',
  })
  readAt!: Date | null;

  @ApiProperty({
    description: 'Created at timestamp',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt!: Date;
}

/**
 * Sanction entity
 */
export class SanctionEntity {
  @ApiProperty({
    description: 'Sanction ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Subject ID (account or operator ID)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  subjectId!: string;

  @ApiProperty({
    description: 'Subject type',
    enum: SanctionSubjectType,
  })
  subjectType!: SanctionSubjectType;

  @ApiPropertyOptional({
    description: 'Service ID for service-scoped sanctions',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  serviceId!: string | null;

  @ApiProperty({
    description: 'Sanction scope',
    enum: SanctionScope,
  })
  scope!: SanctionScope;

  @ApiProperty({
    description: 'Sanction type',
    enum: SanctionType,
  })
  type!: SanctionType;

  @ApiProperty({
    description: 'Sanction status',
    enum: SanctionStatus,
  })
  status!: SanctionStatus;

  @ApiProperty({
    description: 'Sanction severity',
    enum: SanctionSeverity,
  })
  severity!: SanctionSeverity;

  @ApiProperty({
    description: 'Restricted features',
    type: [String],
    example: ['chat', 'posting'],
  })
  restrictedFeatures!: string[];

  @ApiProperty({
    description: 'Reason for the sanction',
    example: 'Violation of community guidelines',
  })
  reason!: string;

  @ApiPropertyOptional({
    description: 'Internal note',
    example: 'Multiple reports from other users',
  })
  internalNote!: string | null;

  @ApiProperty({
    description: 'Evidence URLs',
    type: [String],
  })
  evidenceUrls!: string[];

  @ApiPropertyOptional({
    description: 'Related sanction ID',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  relatedSanctionId!: string | null;

  @ApiProperty({
    description: 'ID of the issuer',
    example: '550e8400-e29b-41d4-a716-446655440004',
  })
  issuedBy!: string;

  @ApiProperty({
    description: 'Type of the issuer',
    enum: IssuerType,
  })
  issuedByType!: IssuerType;

  @ApiProperty({
    description: 'When the sanction starts',
    example: '2024-01-01T00:00:00Z',
  })
  startAt!: Date;

  @ApiPropertyOptional({
    description: 'When the sanction ends',
    example: '2024-01-31T00:00:00Z',
  })
  endAt!: Date | null;

  @ApiPropertyOptional({
    description: 'When the sanction was revoked',
    example: null,
  })
  revokedAt!: Date | null;

  @ApiPropertyOptional({
    description: 'Who revoked the sanction',
    example: null,
  })
  revokedBy!: string | null;

  @ApiPropertyOptional({
    description: 'Reason for revocation',
    example: null,
  })
  revokeReason!: string | null;

  @ApiPropertyOptional({
    description: 'Appeal status',
    enum: AppealStatus,
  })
  appealStatus!: AppealStatus | null;

  @ApiPropertyOptional({
    description: 'When the appeal was submitted',
    example: null,
  })
  appealedAt!: Date | null;

  @ApiPropertyOptional({
    description: 'Appeal reason',
    example: null,
  })
  appealReason!: string | null;

  @ApiPropertyOptional({
    description: 'Who reviewed the appeal',
    example: null,
  })
  appealReviewedBy!: string | null;

  @ApiPropertyOptional({
    description: 'When the appeal was reviewed',
    example: null,
  })
  appealReviewedAt!: Date | null;

  @ApiPropertyOptional({
    description: 'Appeal response',
    example: null,
  })
  appealResponse!: string | null;

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
    description: 'Notifications sent for this sanction',
    type: [SanctionNotificationEntity],
  })
  notifications?: SanctionNotificationEntity[];
}

/**
 * Sanction summary for listing
 */
export class SanctionSummary {
  @ApiProperty({
    description: 'Sanction ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Subject ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  subjectId!: string;

  @ApiProperty({
    description: 'Subject type',
    enum: SanctionSubjectType,
  })
  subjectType!: SanctionSubjectType;

  @ApiProperty({
    description: 'Sanction type',
    enum: SanctionType,
  })
  type!: SanctionType;

  @ApiProperty({
    description: 'Sanction status',
    enum: SanctionStatus,
  })
  status!: SanctionStatus;

  @ApiProperty({
    description: 'Sanction severity',
    enum: SanctionSeverity,
  })
  severity!: SanctionSeverity;

  @ApiProperty({
    description: 'Reason',
    example: 'Violation of community guidelines',
  })
  reason!: string;

  @ApiProperty({
    description: 'Start date',
    example: '2024-01-01T00:00:00Z',
  })
  startAt!: Date;

  @ApiPropertyOptional({
    description: 'End date',
    example: '2024-01-31T00:00:00Z',
  })
  endAt!: Date | null;

  @ApiPropertyOptional({
    description: 'Appeal status',
    enum: AppealStatus,
  })
  appealStatus!: AppealStatus | null;

  @ApiProperty({
    description: 'Created at',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt!: Date;
}

/**
 * Sanction with appeal details
 */
export class SanctionWithAppeal extends SanctionEntity {
  @ApiProperty({
    description: 'Whether appeal is possible',
    example: true,
  })
  canAppeal!: boolean;

  @ApiPropertyOptional({
    description: 'Days until appeal deadline',
    example: 7,
  })
  daysUntilAppealDeadline?: number;
}

/**
 * Paginated sanction list response
 */
export class SanctionListResponse {
  @ApiProperty({
    description: 'List of sanctions',
    type: [SanctionSummary],
  })
  data!: SanctionSummary[];

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
 * Active sanctions check result
 */
export class ActiveSanctionsResult {
  @ApiProperty({
    description: 'Whether the subject is currently sanctioned',
    example: true,
  })
  isSanctioned!: boolean;

  @ApiProperty({
    description: 'Active sanctions',
    type: [SanctionSummary],
  })
  activeSanctions!: SanctionSummary[];

  @ApiProperty({
    description: 'Restricted features',
    type: [String],
    example: ['chat', 'posting'],
  })
  restrictedFeatures!: string[];

  @ApiProperty({
    description: 'Whether permanently banned',
    example: false,
  })
  isPermanentlyBanned!: boolean;
}
