import { IsString, IsOptional, IsDateString, MaxLength, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLegalDocumentDto {
  @ApiPropertyOptional({ description: 'Document title' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Document content' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'When document becomes effective' })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: Date;

  @ApiPropertyOptional({ description: 'When document expires' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: Date;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
