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
import { PaginationMeta } from '../../../common/entities/pagination.entity';

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
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Sanction ID',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  sanctionId!: string;

  @ApiProperty({
    description: 'Notification channel',
    enum: NotificationChannel,
    example: NotificationChannel.EMAIL,
  })
  channel!: NotificationChannel;

  @ApiProperty({
    description: 'Notification status',
    enum: NotificationStatus,
    example: NotificationStatus.PENDING,
  })
  status!: NotificationStatus;

  @ApiPropertyOptional({
    description: 'When the notification was sent',
    type: Date,
    nullable: true,
    example: '2024-01-01T00:00:00Z',
  })
  sentAt!: Date | null;

  @ApiPropertyOptional({
    description: 'When the notification was read',
    type: Date,
    nullable: true,
    example: '2024-01-01T00:01:00Z',
  })
  readAt!: Date | null;

  @ApiProperty({
    description: 'Created at timestamp',
    type: Date,
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
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Subject ID (account or operator ID)',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  subjectId!: string;

  @ApiProperty({
    description: 'Subject type',
    enum: SanctionSubjectType,
    example: SanctionSubjectType.ACCOUNT,
  })
  subjectType!: SanctionSubjectType;

  @ApiPropertyOptional({
    description: 'Service ID for service-scoped sanctions',
    type: String,
    nullable: true,
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  serviceId!: string | null;

  @ApiProperty({
    description: 'Sanction scope',
    enum: SanctionScope,
    example: SanctionScope.PLATFORM,
  })
  scope!: SanctionScope;

  @ApiProperty({
    description: 'Sanction type',
    enum: SanctionType,
    example: SanctionType.TEMPORARY_BAN,
  })
  type!: SanctionType;

  @ApiProperty({
    description: 'Sanction status',
    enum: SanctionStatus,
    example: SanctionStatus.ACTIVE,
  })
  status!: SanctionStatus;

  @ApiProperty({
    description: 'Sanction severity',
    enum: SanctionSeverity,
    example: SanctionSeverity.MEDIUM,
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
    type: String,
    example: 'Violation of community guidelines',
  })
  reason!: string;

  @ApiPropertyOptional({
    description: 'Internal note',
    type: String,
    nullable: true,
    example: 'Multiple reports from other users',
  })
  internalNote!: string | null;

  @ApiProperty({
    description: 'Evidence URLs',
    type: [String],
    example: ['https://storage.example.com/evidence/123.png'],
  })
  evidenceUrls!: string[];

  @ApiPropertyOptional({
    description: 'Related sanction ID',
    type: String,
    nullable: true,
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  relatedSanctionId!: string | null;

  @ApiProperty({
    description: 'ID of the issuer',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440004',
  })
  issuedBy!: string;

  @ApiProperty({
    description: 'Type of the issuer',
    enum: IssuerType,
    example: IssuerType.OPERATOR,
  })
  issuedByType!: IssuerType;

  @ApiProperty({
    description: 'When the sanction starts',
    type: Date,
    example: '2024-01-01T00:00:00Z',
  })
  startAt!: Date;

  @ApiPropertyOptional({
    description: 'When the sanction ends',
    type: Date,
    nullable: true,
    example: '2024-01-31T00:00:00Z',
  })
  endAt!: Date | null;

  @ApiPropertyOptional({
    description: 'When the sanction was revoked',
    type: Date,
    nullable: true,
    example: null,
  })
  revokedAt!: Date | null;

  @ApiPropertyOptional({
    description: 'Who revoked the sanction',
    type: String,
    nullable: true,
    example: null,
  })
  revokedBy!: string | null;

  @ApiPropertyOptional({
    description: 'Reason for revocation',
    type: String,
    nullable: true,
    example: null,
  })
  revokeReason!: string | null;

  @ApiPropertyOptional({
    description: 'Appeal status',
    enum: AppealStatus,
    nullable: true,
    example: null,
  })
  appealStatus!: AppealStatus | null;

  @ApiPropertyOptional({
    description: 'When the appeal was submitted',
    type: Date,
    nullable: true,
    example: null,
  })
  appealedAt!: Date | null;

  @ApiPropertyOptional({
    description: 'Appeal reason',
    type: String,
    nullable: true,
    example: null,
  })
  appealReason!: string | null;

  @ApiPropertyOptional({
    description: 'Who reviewed the appeal',
    type: String,
    nullable: true,
    example: null,
  })
  appealReviewedBy!: string | null;

  @ApiPropertyOptional({
    description: 'When the appeal was reviewed',
    type: Date,
    nullable: true,
    example: null,
  })
  appealReviewedAt!: Date | null;

  @ApiPropertyOptional({
    description: 'Appeal response',
    type: String,
    nullable: true,
    example: null,
  })
  appealResponse!: string | null;

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
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Subject ID',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  subjectId!: string;

  @ApiProperty({
    description: 'Subject type',
    enum: SanctionSubjectType,
    example: SanctionSubjectType.ACCOUNT,
  })
  subjectType!: SanctionSubjectType;

  @ApiProperty({
    description: 'Sanction type',
    enum: SanctionType,
    example: SanctionType.TEMPORARY_BAN,
  })
  type!: SanctionType;

  @ApiProperty({
    description: 'Sanction status',
    enum: SanctionStatus,
    example: SanctionStatus.ACTIVE,
  })
  status!: SanctionStatus;

  @ApiProperty({
    description: 'Sanction severity',
    enum: SanctionSeverity,
    example: SanctionSeverity.MEDIUM,
  })
  severity!: SanctionSeverity;

  @ApiProperty({
    description: 'Reason',
    type: String,
    example: 'Violation of community guidelines',
  })
  reason!: string;

  @ApiProperty({
    description: 'Start date',
    type: Date,
    example: '2024-01-01T00:00:00Z',
  })
  startAt!: Date;

  @ApiPropertyOptional({
    description: 'End date',
    type: Date,
    nullable: true,
    example: '2024-01-31T00:00:00Z',
  })
  endAt!: Date | null;

  @ApiPropertyOptional({
    description: 'Appeal status',
    enum: AppealStatus,
    nullable: true,
    example: null,
  })
  appealStatus!: AppealStatus | null;

  @ApiProperty({
    description: 'Created at',
    type: Date,
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
    type: Boolean,
    example: true,
  })
  canAppeal!: boolean;

  @ApiPropertyOptional({
    description: 'Days until appeal deadline',
    type: Number,
    nullable: true,
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
    type: () => PaginationMeta,
  })
  meta!: PaginationMeta;
}

/**
 * Active sanctions check result
 */
export class ActiveSanctionsResult {
  @ApiProperty({
    description: 'Whether the subject is currently sanctioned',
    type: Boolean,
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
    type: Boolean,
    example: false,
  })
  isPermanentlyBanned!: boolean;
}
