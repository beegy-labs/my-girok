import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsObject, IsUUID } from 'class-validator';

export class IdentifyDto {
  @ApiProperty({ description: 'Anonymous ID to link (UUIDv7)' })
  @IsUUID()
  anonymousId!: string;

  @ApiProperty({ description: 'User ID to identify (UUIDv7)' })
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional({ description: 'User traits' })
  @IsOptional()
  @IsObject()
  traits?: Record<string, unknown>;
}
