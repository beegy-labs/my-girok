import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SanctionSubjectType,
  SanctionType,
  SanctionSeverity,
  SanctionScope,
  NotificationChannel,
} from './create-sanction.dto';

/**
 * Sanction status enumeration
 */
export enum SanctionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

/**
 * Appeal status enumeration
 */
export enum AppealStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ESCALATED = 'ESCALATED',
}

/**
 * DTO for updating a sanction
 */
export class UpdateSanctionDto {
  @ApiPropertyOptional({
    description: 'Updated severity',
    enum: SanctionSeverity,
  })
  @IsEnum(SanctionSeverity)
  @IsOptional()
  severity?: SanctionSeverity;

  @ApiPropertyOptional({
    description: 'Updated restricted features',
    example: ['chat', 'posting'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  restrictedFeatures?: string[];

  @ApiPropertyOptional({
    description: 'Updated reason',
    example: 'Additional violation discovered',
  })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Updated internal note',
    example: 'Investigation completed',
  })
  @IsString()
  @IsOptional()
  internalNote?: string;

  @ApiPropertyOptional({
    description: 'Additional evidence URLs',
    example: ['https://storage.example.com/evidence/456.png'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  evidenceUrls?: string[];

  @ApiPropertyOptional({
    description: 'Updated end date',
    example: '2024-02-28T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  endAt?: string;

  @ApiProperty({
    description: 'Reason for the update',
    example: 'Extended due to repeat offense',
  })
  @IsString()
  updateReason!: string;
}

/**
 * DTO for revoking a sanction
 */
export class RevokeSanctionDto {
  @ApiProperty({
    description: 'Reason for revoking',
    example: 'Appeal approved - sanction was issued in error',
  })
  @IsString()
  reason!: string;
}

/**
 * DTO for extending a sanction
 */
export class ExtendSanctionDto {
  @ApiProperty({
    description: 'New end date',
    example: '2024-03-31T00:00:00Z',
  })
  @IsDateString()
  newEndAt!: string;

  @ApiProperty({
    description: 'Reason for extension',
    example: 'Continued violation during sanction period',
  })
  @IsString()
  reason!: string;
}

/**
 * DTO for reducing a sanction
 */
export class ReduceSanctionDto {
  @ApiProperty({
    description: 'New end date (earlier than current)',
    example: '2024-01-15T00:00:00Z',
  })
  @IsDateString()
  newEndAt!: string;

  @ApiProperty({
    description: 'Reason for reduction',
    example: 'Good behavior during sanction period',
  })
  @IsString()
  reason!: string;
}

/**
 * DTO for submitting an appeal
 */
export class SubmitAppealDto {
  @ApiProperty({
    description: 'Reason for the appeal',
    example: 'I believe this sanction was issued in error because...',
  })
  @IsString()
  reason!: string;

  @ApiPropertyOptional({
    description: 'Supporting evidence URLs',
    example: ['https://storage.example.com/evidence/appeal-123.png'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  evidenceUrls?: string[];
}

/**
 * DTO for reviewing an appeal
 */
export class ReviewAppealDto {
  @ApiProperty({
    description: 'Appeal decision',
    enum: ['APPROVED', 'REJECTED', 'ESCALATED'],
    example: 'APPROVED',
  })
  @IsEnum(AppealStatus)
  status!: 'APPROVED' | 'REJECTED' | 'ESCALATED';

  @ApiProperty({
    description: 'Response to the appeal',
    example: 'After review, we have determined the sanction was issued in error.',
  })
  @IsString()
  response!: string;
}

/**
 * DTO for querying sanctions
 */
export class QuerySanctionDto {
  @ApiPropertyOptional({
    description: 'Filter by subject ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsOptional()
  subjectId?: string;

  @ApiPropertyOptional({
    description: 'Filter by subject type',
    enum: SanctionSubjectType,
  })
  @IsEnum(SanctionSubjectType)
  @IsOptional()
  subjectType?: SanctionSubjectType;

  @ApiPropertyOptional({
    description: 'Filter by service ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsString()
  @IsOptional()
  serviceId?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: SanctionStatus,
  })
  @IsEnum(SanctionStatus)
  @IsOptional()
  status?: SanctionStatus;

  @ApiPropertyOptional({
    description: 'Filter by type',
    enum: SanctionType,
  })
  @IsEnum(SanctionType)
  @IsOptional()
  type?: SanctionType;

  @ApiPropertyOptional({
    description: 'Filter by severity',
    enum: SanctionSeverity,
  })
  @IsEnum(SanctionSeverity)
  @IsOptional()
  severity?: SanctionSeverity;

  @ApiPropertyOptional({
    description: 'Filter by scope',
    enum: SanctionScope,
  })
  @IsEnum(SanctionScope)
  @IsOptional()
  scope?: SanctionScope;

  @ApiPropertyOptional({
    description: 'Filter by appeal status',
    enum: AppealStatus,
  })
  @IsEnum(AppealStatus)
  @IsOptional()
  appealStatus?: AppealStatus;

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
  })
  @IsString()
  @IsOptional()
  sort?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
  })
  @IsString()
  @IsOptional()
  order?: 'asc' | 'desc';
}

/**
 * DTO for resending notifications
 */
export class ResendNotificationsDto {
  @ApiProperty({
    description: 'Notification channels to use',
    example: ['EMAIL', 'IN_APP'],
  })
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels!: NotificationChannel[];
}
