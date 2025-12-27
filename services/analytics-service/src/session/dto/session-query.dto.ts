import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsDateString, IsOptional, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum SessionMetric {
  DURATION = 'duration',
  PAGE_VIEWS = 'page_views',
  EVENTS = 'events',
  BOUNCE_RATE = 'bounce_rate',
}

export class SessionQueryDto {
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

  @ApiPropertyOptional({ description: 'Device type filter' })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiPropertyOptional({ description: 'Country code filter' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ description: 'UTM source filter' })
  @IsOptional()
  @IsString()
  utmSource?: string;

  @ApiPropertyOptional({ description: 'Include bounced sessions only' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  bouncedOnly?: boolean;

  @ApiPropertyOptional({ description: 'Include converted sessions only' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  convertedOnly?: boolean;

  @ApiPropertyOptional({ description: 'Limit results', default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  limit?: number;
}

export class SessionDetailQueryDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId!: string;
}

export interface SessionSummary {
  totalSessions: number;
  uniqueUsers: number;
  avgDuration: number;
  avgPageViews: number;
  avgEvents: number;
  bounceRate: number;
  conversionRate: number;
  byDevice: Record<string, number>;
  byCountry: Record<string, number>;
  bySource: Record<string, number>;
}

export interface SessionDetail {
  sessionId: string;
  userId: string | null;
  anonymousId: string;
  startedAt: string;
  endedAt: string | null;
  duration: number;
  isBounce: boolean;
  isConverted: boolean;
  entryPage: string;
  exitPage: string;
  pageViewCount: number;
  eventCount: number;
  device: {
    type: string;
    browser: string;
    os: string;
  };
  location: {
    country: string | null;
    region: string | null;
    city: string | null;
  };
  utm: {
    source: string | null;
    medium: string | null;
    campaign: string | null;
  };
}

export interface SessionTimeline {
  sessionId: string;
  events: {
    timestamp: string;
    type: 'page_view' | 'event';
    name: string;
    path?: string;
    properties?: Record<string, unknown>;
  }[];
}

export interface SessionDistribution {
  durationBuckets: { range: string; count: number }[];
  pageViewBuckets: { range: string; count: number }[];
  hourlyDistribution: { hour: number; count: number }[];
  dayOfWeekDistribution: { day: string; count: number }[];
}
