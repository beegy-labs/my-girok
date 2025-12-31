import { IsString, IsEnum, IsOptional, IsUUID, IsObject, IsDate } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  DsrRequestType,
  DsrStatus,
  DsrPriority,
  DsrResponseType,
} from '.prisma/identity-legal-client';
import { PaginationDto } from '../../../common/pagination/pagination.dto.js';

/**
 * Allowed sort fields for DSR requests
 */
export const DSR_ALLOWED_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'deadline',
  'priority',
  'status',
] as const;

export type DsrSortField = (typeof DSR_ALLOWED_SORT_FIELDS)[number];

/**
 * DTO for creating a DSR request
 */
export class CreateDsrRequestDto {
  @ApiProperty({
    description: 'Account ID of the data subject',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  @IsUUID()
  accountId!: string;

  @ApiProperty({
    description: 'Type of DSR request',
    enum: DsrRequestType,
    example: 'ACCESS',
  })
  @IsEnum(DsrRequestType)
  requestType!: DsrRequestType;

  @ApiPropertyOptional({
    description: 'Request priority',
    enum: DsrPriority,
    default: 'NORMAL',
  })
  @IsOptional()
  @IsEnum(DsrPriority)
  priority?: DsrPriority = DsrPriority.NORMAL;

  @ApiPropertyOptional({
    description: 'Description of the request',
    example: 'I would like to access all my personal data',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Scope of data/services affected',
    example: { services: ['auth', 'profile'], dataTypes: ['personal', 'activity'] },
  })
  @IsOptional()
  @IsObject()
  scope?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Legal basis for the request (e.g., GDPR, CCPA)',
    example: 'GDPR',
  })
  @IsOptional()
  @IsString()
  legalBasis?: string;

  @ApiPropertyOptional({
    description: 'Client IP address',
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'Client user agent',
  })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * DTO for verifying a DSR request
 */
export class VerifyDsrRequestDto {
  @ApiProperty({
    description: 'Verification method used',
    example: 'EMAIL_OTP',
  })
  @IsString()
  verificationMethod!: string;

  @ApiPropertyOptional({
    description: 'Additional verification details',
  })
  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;
}

/**
 * DTO for processing a DSR request
 */
export class ProcessDsrRequestDto {
  @ApiProperty({
    description: 'New status',
    enum: ['IN_PROGRESS', 'AWAITING_INFO', 'COMPLETED', 'REJECTED'],
    example: 'IN_PROGRESS',
  })
  @IsEnum(DsrStatus)
  status!: DsrStatus;

  @ApiPropertyOptional({
    description: 'Operator ID processing the request',
  })
  @IsOptional()
  @IsUUID()
  processedBy?: string;

  @ApiPropertyOptional({
    description: 'Response type for completion',
    enum: DsrResponseType,
  })
  @IsOptional()
  @IsEnum(DsrResponseType)
  responseType?: DsrResponseType;

  @ApiPropertyOptional({
    description: 'Response data (for ACCESS/PORTABILITY requests)',
  })
  @IsOptional()
  @IsObject()
  responseData?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Response note/comment',
  })
  @IsOptional()
  @IsString()
  responseNote?: string;
}

/**
 * DTO for extending DSR request deadline
 */
export class ExtendDsrDeadlineDto {
  @ApiProperty({
    description: 'New deadline date',
    example: '2025-03-01T00:00:00Z',
  })
  @Type(() => Date)
  @IsDate()
  extendedTo!: Date;

  @ApiProperty({
    description: 'Reason for extension',
    example: 'Complex request requiring additional processing time',
  })
  @IsString()
  extensionReason!: string;
}

/**
 * Query parameters for listing DSR requests
 * Extends PaginationDto for standardized pagination (SSOT)
 */
export class DsrRequestQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by account ID',
  })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiPropertyOptional({
    description: 'Filter by request type',
    enum: DsrRequestType,
  })
  @IsOptional()
  @IsEnum(DsrRequestType)
  requestType?: DsrRequestType;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: DsrStatus,
  })
  @IsOptional()
  @IsEnum(DsrStatus)
  status?: DsrStatus;

  @ApiPropertyOptional({
    description: 'Filter by priority',
    enum: DsrPriority,
  })
  @IsOptional()
  @IsEnum(DsrPriority)
  priority?: DsrPriority;

  @ApiPropertyOptional({
    description: 'Filter by assigned operator',
  })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({
    description: 'Filter overdue requests only',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  overdueOnly?: boolean;

  /**
   * Get Prisma orderBy for DSR requests
   * Uses DSR-specific allowed sort fields
   */
  getDsrOrderBy(): Record<string, 'asc' | 'desc'> {
    return this.getOrderBy('createdAt', DSR_ALLOWED_SORT_FIELDS);
  }
}

/**
 * DSR request response entity
 */
export class DsrRequestResponseDto {
  @ApiProperty({ description: 'Request ID' })
  id!: string;

  @ApiProperty({ description: 'Account ID' })
  accountId!: string;

  @ApiProperty({ description: 'Request type', enum: DsrRequestType })
  requestType!: DsrRequestType;

  @ApiProperty({ description: 'Status', enum: DsrStatus })
  status!: DsrStatus;

  @ApiProperty({ description: 'Priority', enum: DsrPriority })
  priority!: DsrPriority;

  @ApiPropertyOptional({ description: 'Description' })
  description?: string | null;

  @ApiPropertyOptional({ description: 'Scope' })
  scope?: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'Legal basis' })
  legalBasis?: string | null;

  @ApiPropertyOptional({ description: 'Verified at' })
  verifiedAt?: Date | null;

  @ApiPropertyOptional({ description: 'Verification method' })
  verificationMethod?: string | null;

  @ApiPropertyOptional({ description: 'Assigned to operator ID' })
  assignedTo?: string | null;

  @ApiPropertyOptional({ description: 'Processed by operator ID' })
  processedBy?: string | null;

  @ApiPropertyOptional({ description: 'Processed at' })
  processedAt?: Date | null;

  @ApiPropertyOptional({ description: 'Completed at' })
  completedAt?: Date | null;

  @ApiPropertyOptional({ description: 'Response type', enum: DsrResponseType })
  responseType?: DsrResponseType | null;

  @ApiPropertyOptional({ description: 'Response data' })
  responseData?: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'Response note' })
  responseNote?: string | null;

  @ApiProperty({ description: 'Deadline' })
  deadline!: Date;

  @ApiPropertyOptional({ description: 'Extended deadline' })
  extendedTo?: Date | null;

  @ApiPropertyOptional({ description: 'Extension reason' })
  extensionReason?: string | null;

  @ApiProperty({ description: 'Created at' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt!: Date;
}

/**
 * DSR request summary for listing
 */
export class DsrRequestSummaryDto {
  @ApiProperty({ description: 'Request ID' })
  id!: string;

  @ApiProperty({ description: 'Account ID' })
  accountId!: string;

  @ApiProperty({ description: 'Request type', enum: DsrRequestType })
  requestType!: DsrRequestType;

  @ApiProperty({ description: 'Status', enum: DsrStatus })
  status!: DsrStatus;

  @ApiProperty({ description: 'Priority', enum: DsrPriority })
  priority!: DsrPriority;

  @ApiProperty({ description: 'Deadline' })
  deadline!: Date;

  @ApiPropertyOptional({ description: 'Extended deadline' })
  extendedTo?: Date | null;

  @ApiProperty({ description: 'Is overdue' })
  isOverdue!: boolean;

  @ApiProperty({ description: 'Created at' })
  createdAt!: Date;
}

/**
 * Paginated DSR request list response
 */
export class DsrRequestListResponseDto {
  @ApiProperty({
    description: 'List of DSR requests',
    type: [DsrRequestSummaryDto],
  })
  data!: DsrRequestSummaryDto[];

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
 * DSR request log entry
 */
export class DsrRequestLogDto {
  @ApiProperty({ description: 'Log ID' })
  id!: string;

  @ApiProperty({ description: 'DSR Request ID' })
  dsrRequestId!: string;

  @ApiProperty({ description: 'Action performed' })
  action!: string;

  @ApiProperty({ description: 'Performed by operator ID' })
  performedBy!: string;

  @ApiPropertyOptional({ description: 'Action details' })
  details?: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'IP address' })
  ipAddress?: string | null;

  @ApiProperty({ description: 'Created at' })
  createdAt!: Date;
}

/**
 * DSR statistics response
 */
export class DsrStatisticsDto {
  @ApiProperty({ description: 'Total requests' })
  total!: number;

  @ApiProperty({ description: 'Pending requests' })
  pending!: number;

  @ApiProperty({ description: 'In progress requests' })
  inProgress!: number;

  @ApiProperty({ description: 'Completed requests' })
  completed!: number;

  @ApiProperty({ description: 'Overdue requests' })
  overdue!: number;

  @ApiProperty({ description: 'Average processing time in days' })
  avgProcessingDays!: number;
}
