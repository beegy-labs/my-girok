import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsDateString, IsEnum, IsArray, IsOptional, IsUUID } from 'class-validator';

export enum ExportFormat {
  PDF = 'pdf',
  CSV = 'csv',
}

export enum ExportType {
  ACCESS_LOGS = 'access_logs',
  CONSENT_HISTORY = 'consent_history',
  ADMIN_ACTIONS = 'admin_actions',
}

export enum ExportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export class CreateExportDto {
  @ApiProperty({ description: 'User ID to export data for (UUIDv7)' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ enum: ExportFormat, description: 'Export format' })
  @IsEnum(ExportFormat)
  format!: ExportFormat;

  @ApiProperty({ description: 'Start date (ISO 8601)' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'End date (ISO 8601)' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({
    enum: ExportType,
    isArray: true,
    description: 'Types of data to include',
  })
  @IsArray()
  @IsEnum(ExportType, { each: true })
  includeTypes!: ExportType[];

  @ApiPropertyOptional({ description: 'Reason for export (for audit purposes)' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export interface ExportResponseDto {
  id: string;
  userId: string;
  format: ExportFormat;
  status: ExportStatus;
  createdAt: string;
  completedAt?: string;
  downloadUrl?: string;
  error?: string;
}

export class ExportListQueryDto {
  @ApiPropertyOptional({ description: 'Filter by user ID (UUIDv7)' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ enum: ExportStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(ExportStatus)
  status?: ExportStatus;
}
