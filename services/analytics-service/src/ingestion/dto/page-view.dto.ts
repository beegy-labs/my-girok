import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsUUID, MaxLength } from 'class-validator';

export class PageViewDto {
  @ApiProperty({ description: 'Session ID (UUIDv7)' })
  @IsUUID()
  sessionId!: string;

  @ApiProperty({ description: 'Anonymous ID (UUIDv7)' })
  @IsUUID()
  anonymousId!: string;

  @ApiPropertyOptional({ description: 'User ID if logged in (UUIDv7)' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ description: 'Page path' })
  @IsString()
  @MaxLength(2048)
  path!: string;

  @ApiPropertyOptional({ description: 'Page title' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  title?: string;

  @ApiPropertyOptional({ description: 'Referrer path' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  referrer?: string;

  @ApiPropertyOptional({ description: 'Time on previous page (seconds)' })
  @IsOptional()
  @IsNumber()
  timeOnPreviousPage?: number;

  @ApiPropertyOptional({ description: 'Scroll depth (0-100)' })
  @IsOptional()
  @IsNumber()
  scrollDepth?: number;

  @ApiPropertyOptional({ description: 'Page load time (ms)' })
  @IsOptional()
  @IsNumber()
  loadTime?: number;
}
