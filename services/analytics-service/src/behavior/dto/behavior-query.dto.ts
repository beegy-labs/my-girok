import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum AggregationInterval {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class BehaviorQueryDto {
  @ApiProperty({ description: 'Start date for analysis' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'End date for analysis' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ description: 'User ID filter' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Session ID filter' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Event names to filter', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eventNames?: string[];

  @ApiPropertyOptional({ description: 'Event category filter' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Aggregation interval',
    enum: AggregationInterval,
  })
  @IsOptional()
  @IsEnum(AggregationInterval)
  interval?: AggregationInterval;

  @ApiPropertyOptional({ description: 'Limit results', default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  limit?: number;
}

export class TopEventsQueryDto {
  @ApiProperty({ description: 'Start date for analysis' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'End date for analysis' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ description: 'Event category filter' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Number of top events', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class UserBehaviorQueryDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId!: string;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Limit events', default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;
}

export interface EventCountResult {
  eventName: string;
  count: number;
  category: string;
}

export interface TimeSeriesResult {
  timestamp: string;
  count: number;
}

export interface UserActivityResult {
  userId: string;
  totalEvents: number;
  uniqueSessions: number;
  firstSeen: string;
  lastSeen: string;
  topEvents: EventCountResult[];
}

export interface BehaviorSummary {
  totalEvents: number;
  uniqueUsers: number;
  uniqueSessions: number;
  topEvents: EventCountResult[];
  eventsByCategory: Record<string, number>;
  timeSeries: TimeSeriesResult[];
}
