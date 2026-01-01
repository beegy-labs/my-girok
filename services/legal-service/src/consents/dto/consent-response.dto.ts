import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConsentResponseDto {
  @ApiProperty({ description: 'Consent UUID' })
  id!: string;

  @ApiProperty({ description: 'Account UUID' })
  accountId!: string;

  @ApiProperty({ description: 'Legal document UUID' })
  documentId!: string;

  @ApiProperty({ description: 'Consent status', enum: ['GRANTED', 'WITHDRAWN', 'EXPIRED'] })
  status!: string;

  @ApiProperty({ description: 'When consent was granted' })
  consentedAt!: Date;

  @ApiPropertyOptional({ description: 'When consent was withdrawn' })
  withdrawnAt?: Date | null;

  @ApiProperty({ description: 'Method of consent' })
  consentMethod!: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;
}
