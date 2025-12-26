import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class PageViewDto {
  @ApiProperty({ description: 'Session ID (UUIDv7)' })
  @IsString()
  sessionId!: string;

  @ApiProperty({ description: 'Anonymous ID' })
  @IsString()
  anonymousId!: string;

  @ApiPropertyOptional({ description: 'User ID if logged in' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ description: 'Page path' })
  @IsString()
  path!: string;

  @ApiPropertyOptional({ description: 'Page title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Referrer path' })
  @IsOptional()
  @IsString()
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
