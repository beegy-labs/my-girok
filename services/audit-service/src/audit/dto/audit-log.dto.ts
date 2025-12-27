import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AuditLogQueryDto {
  @ApiPropertyOptional({ description: 'Filter by user ID (UUIDv7)' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by action',
    enum: ['login', 'logout', 'consent_change', 'password_change', 'profile_update'],
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Filter by resource' })
  @IsOptional()
  @IsString()
  resource?: string;

  @ApiProperty({ description: 'Start date (ISO 8601)' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'End date (ISO 8601)' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export interface AuditLogResponseDto {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  resource: string;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, unknown>;
}

export interface PaginatedAuditLogResponseDto {
  data: AuditLogResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
