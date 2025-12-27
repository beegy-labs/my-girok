import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class IdentifyDto {
  @ApiProperty({ description: 'Anonymous ID to link' })
  @IsString()
  anonymousId!: string;

  @ApiProperty({ description: 'User ID to identify' })
  @IsString()
  userId!: string;

  @ApiPropertyOptional({ description: 'User traits' })
  @IsOptional()
  @IsObject()
  traits?: Record<string, unknown>;
}
