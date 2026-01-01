import { IsUUID, IsOptional, IsString, MaxLength, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GrantConsentDto {
  @ApiProperty({ description: 'Account UUID' })
  @IsUUID()
  accountId!: string;

  @ApiProperty({ description: 'Legal document UUID' })
  @IsUUID()
  documentId!: string;

  @ApiPropertyOptional({ description: 'Law registry UUID' })
  @IsOptional()
  @IsUUID()
  lawRegistryId?: string;

  @ApiPropertyOptional({ description: 'IP address of the user' })
  @IsOptional()
  @IsString()
  @MaxLength(45)
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  userAgent?: string;

  @ApiPropertyOptional({
    description: 'Method of consent',
    example: 'explicit_button',
    default: 'explicit_button',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  consentMethod?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
