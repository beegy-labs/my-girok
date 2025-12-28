import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsObject,
  ValidateNested,
  IsArray,
  IsUUID,
  MaxLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Maximum allowed size for event properties JSON (100KB)
 * Prevents DoS attacks via large payloads
 */
const MAX_PROPERTIES_SIZE = 100 * 1024;

/**
 * Custom validator to limit JSON object size
 */
@ValidatorConstraint({ name: 'jsonSizeLimit', async: false })
class JsonSizeLimitValidator implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (value === undefined || value === null) return true;
    const jsonString = JSON.stringify(value);
    const maxSize = args.constraints[0] || MAX_PROPERTIES_SIZE;
    return jsonString.length <= maxSize;
  }

  defaultMessage(args: ValidationArguments): string {
    const maxSize = args.constraints[0] || MAX_PROPERTIES_SIZE;
    return `Properties JSON exceeds maximum size of ${maxSize} bytes`;
  }
}

class PageContext {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referrer?: string;
}

class DeviceContext {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  browser?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  os?: string;
}

class UtmContext {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  medium?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  campaign?: string;
}

class EventContext {
  @ApiPropertyOptional({ type: PageContext })
  @IsOptional()
  @ValidateNested()
  @Type(() => PageContext)
  page?: PageContext;

  @ApiPropertyOptional({ type: DeviceContext })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceContext)
  device?: DeviceContext;

  @ApiPropertyOptional({ type: UtmContext })
  @IsOptional()
  @ValidateNested()
  @Type(() => UtmContext)
  utm?: UtmContext;
}

export class TrackEventDto {
  @ApiProperty({ description: 'Session ID (UUIDv7)' })
  @IsUUID()
  sessionId!: string;

  @ApiProperty({ description: 'Anonymous ID (device fingerprint)' })
  @IsString()
  @MaxLength(64)
  anonymousId!: string;

  @ApiPropertyOptional({ description: 'User ID if logged in (UUIDv7)' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ description: 'Event name (max 255 characters)' })
  @IsString()
  @MaxLength(255)
  eventName!: string;

  @ApiPropertyOptional({ description: 'Event properties (max 100KB JSON)' })
  @IsOptional()
  @IsObject()
  @Validate(JsonSizeLimitValidator, [MAX_PROPERTIES_SIZE])
  properties?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Client timestamp (ISO 8601)' })
  @IsOptional()
  @IsString()
  timestamp?: string;

  @ApiPropertyOptional({ type: EventContext })
  @IsOptional()
  @ValidateNested()
  @Type(() => EventContext)
  context?: EventContext;
}

export class TrackEventsDto {
  @ApiProperty({ type: [TrackEventDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrackEventDto)
  events!: TrackEventDto[];
}
