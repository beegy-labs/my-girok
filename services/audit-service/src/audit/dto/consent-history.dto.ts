import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class ConsentHistoryQueryDto {
  @ApiPropertyOptional({ description: 'Filter by user ID (UUIDv7)' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by consent type',
    enum: ['terms', 'privacy', 'marketing', 'data_processing', 'third_party'],
  })
  @IsOptional()
  @IsString()
  consentType?: string;

  @ApiPropertyOptional({ description: 'Filter by country code (ISO 3166-1 alpha-2)' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ description: 'Filter by agreement status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  agreed?: boolean;

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

export interface ConsentHistoryResponseDto {
  id: string;
  timestamp: string;
  userId: string;
  consentType: string;
  countryCode: string;
  agreed: boolean;
  documentId?: string;
  documentVersion?: string;
  ipAddress: string;
}

export class ConsentStatsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by consent type' })
  @IsOptional()
  @IsString()
  consentType?: string;

  @ApiPropertyOptional({ description: 'Filter by country code' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiProperty({ description: 'Start date (ISO 8601)' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'End date (ISO 8601)' })
  @IsDateString()
  endDate!: string;
}

export interface ConsentStatsResponseDto {
  total: number;
  agreed: number;
  disagreed: number;
  agreementRate: number;
  byType: Record<string, { agreed: number; disagreed: number }>;
  byCountry: Record<string, { agreed: number; disagreed: number }>;
}

export interface PaginatedConsentHistoryResponseDto {
  data: ConsentHistoryResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
