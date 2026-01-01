import {
  IsString,
  IsOptional,
  IsBoolean,
  IsISO31661Alpha2,
  IsDateString,
  MaxLength,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLawRegistryDto {
  @ApiProperty({ description: 'Law code (e.g., GDPR, CCPA, PIPA)', example: 'GDPR' })
  @IsString()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ description: 'Law name', example: 'General Data Protection Regulation' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ description: 'Description of the law' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'ISO 3166-1 alpha-2 country code', example: 'EU' })
  @IsISO31661Alpha2()
  countryCode!: string;

  @ApiProperty({ description: 'When the law became effective', example: '2018-05-25' })
  @IsDateString()
  effectiveDate!: Date;

  @ApiPropertyOptional({ description: 'Whether the law is currently active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
