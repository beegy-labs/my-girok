import { IsString, IsOptional, IsNumber, IsObject, IsArray, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Session recording event batch from tracking-sdk
 */
export class RecordingEventBatchDto {
  @ApiProperty({ description: 'Session ID from tracking-sdk' })
  @IsString()
  sessionId!: string;

  @ApiProperty({ description: 'Start sequence number of this batch' })
  @IsNumber()
  @Min(0)
  sequenceStart!: number;

  @ApiProperty({ description: 'End sequence number of this batch' })
  @IsNumber()
  @Min(0)
  sequenceEnd!: number;

  @ApiProperty({ description: 'Array of rrweb events', type: 'array' })
  @IsArray()
  events!: unknown[];

  @ApiPropertyOptional({ description: 'Session metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiProperty({ description: 'Batch timestamp' })
  @IsString()
  timestamp!: string;
}

/**
 * Session start/end event
 */
export class SessionEventDto {
  @ApiProperty({ enum: ['start', 'end'] })
  @IsIn(['start', 'end'])
  action!: 'start' | 'end';

  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId!: string;

  @ApiPropertyOptional({ description: 'Session start time (for start action)' })
  @IsOptional()
  @IsString()
  startedAt?: string;

  @ApiPropertyOptional({ description: 'Session end time (for end action)' })
  @IsOptional()
  @IsString()
  endedAt?: string;

  @ApiPropertyOptional({ description: 'Session duration in ms (for end action)' })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({ description: 'Actor ID' })
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiPropertyOptional({ description: 'Actor type' })
  @IsOptional()
  @IsIn(['USER', 'OPERATOR', 'ADMIN'])
  actorType?: string;

  @ApiPropertyOptional({ description: 'Actor email' })
  @IsOptional()
  @IsString()
  actorEmail?: string;

  @ApiPropertyOptional({ description: 'Service slug' })
  @IsOptional()
  @IsString()
  serviceSlug?: string;

  @ApiPropertyOptional({ description: 'Browser name' })
  @IsOptional()
  @IsString()
  browser?: string;

  @ApiPropertyOptional({ description: 'OS name' })
  @IsOptional()
  @IsString()
  os?: string;

  @ApiPropertyOptional({ description: 'Device type' })
  @IsOptional()
  @IsIn(['desktop', 'mobile', 'tablet'])
  deviceType?: string;

  @ApiPropertyOptional({ description: 'Screen resolution' })
  @IsOptional()
  @IsString()
  screenResolution?: string;

  @ApiPropertyOptional({ description: 'Timezone' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Language' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'User agent' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ description: 'Device fingerprint' })
  @IsOptional()
  @IsString()
  deviceFingerprint?: string;
}

/**
 * Page view event
 */
export class PageViewEventDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId!: string;

  @ApiProperty({ description: 'Page path' })
  @IsString()
  path!: string;

  @ApiProperty({ description: 'Page title' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ description: 'Referrer path' })
  @IsOptional()
  @IsString()
  referrer?: string;

  @ApiProperty({ description: 'Timestamp' })
  @IsString()
  timestamp!: string;

  @ApiPropertyOptional({ description: 'Actor ID' })
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiPropertyOptional({ description: 'Service slug' })
  @IsOptional()
  @IsString()
  serviceSlug?: string;
}

/**
 * Custom event
 */
export class CustomEventDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId!: string;

  @ApiProperty({ description: 'Event data' })
  @IsObject()
  event!: Record<string, unknown>;

  @ApiProperty({ description: 'Timestamp' })
  @IsString()
  timestamp!: string;
}

/**
 * Query parameters for listing sessions
 */
export class SessionRecordingQueryDto {
  @ApiPropertyOptional({ description: 'Service slug filter' })
  @IsOptional()
  @IsString()
  serviceSlug?: string;

  @ApiPropertyOptional({ description: 'Actor ID filter' })
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiPropertyOptional({ description: 'Device type filter' })
  @IsOptional()
  @IsIn(['desktop', 'mobile', 'tablet'])
  deviceType?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO string)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO string)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * Session recording metadata response
 */
export class SessionRecordingMetadataDto {
  @ApiProperty()
  sessionId!: string;

  @ApiPropertyOptional()
  actorId?: string;

  @ApiPropertyOptional()
  actorType?: string;

  @ApiPropertyOptional()
  actorEmail?: string;

  @ApiProperty()
  serviceSlug!: string;

  @ApiProperty()
  startedAt!: string;

  @ApiPropertyOptional()
  endedAt?: string;

  @ApiProperty()
  durationSeconds!: number;

  @ApiProperty()
  totalEvents!: number;

  @ApiProperty()
  pageViews!: number;

  @ApiProperty()
  clicks!: number;

  @ApiProperty()
  entryPage!: string;

  @ApiPropertyOptional()
  exitPage?: string;

  @ApiProperty()
  browser!: string;

  @ApiProperty()
  os!: string;

  @ApiProperty()
  deviceType!: string;

  @ApiProperty()
  countryCode!: string;

  @ApiProperty()
  status!: string;
}

/**
 * Session recording list response
 */
export class SessionRecordingListResponseDto {
  @ApiProperty({ type: [SessionRecordingMetadataDto] })
  data!: SessionRecordingMetadataDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}

/**
 * Session recording events response (for replay)
 */
export class SessionRecordingEventsDto {
  @ApiProperty()
  sessionId!: string;

  @ApiProperty()
  metadata!: SessionRecordingMetadataDto;

  @ApiProperty({ description: 'All rrweb events for this session' })
  events!: unknown[];
}
