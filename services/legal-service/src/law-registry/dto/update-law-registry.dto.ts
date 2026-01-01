import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  MaxLength,
  IsObject,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLawRegistryDto {
  @ApiPropertyOptional({ description: 'Law name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: 'Description of the law' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'When the law became effective' })
  @IsOptional()
  @IsDateString()
  effectiveDate?: Date;

  @ApiPropertyOptional({ description: 'Whether the law is currently active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
