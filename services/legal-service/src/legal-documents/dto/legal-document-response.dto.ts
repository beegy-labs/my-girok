import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LegalDocumentResponseDto {
  @ApiProperty({ description: 'Document UUID' })
  id!: string;

  @ApiProperty({ description: 'Document type' })
  type!: string;

  @ApiProperty({ description: 'Semantic version' })
  version!: string;

  @ApiProperty({ description: 'Document title' })
  title!: string;

  @ApiProperty({ description: 'Content hash (SHA-256)' })
  contentHash!: string;

  @ApiProperty({ description: 'Country code' })
  countryCode!: string;

  @ApiProperty({ description: 'Locale' })
  locale!: string;

  @ApiProperty({ description: 'Document status' })
  status!: string;

  @ApiPropertyOptional({ description: 'Effective from' })
  effectiveFrom?: Date | null;

  @ApiPropertyOptional({ description: 'Effective to' })
  effectiveTo?: Date | null;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt!: Date;
}
