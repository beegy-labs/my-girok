import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DsrRequestResponseDto {
  @ApiProperty({ description: 'DSR request UUID' })
  id!: string;

  @ApiProperty({ description: 'Account UUID' })
  accountId!: string;

  @ApiProperty({ description: 'Request type' })
  requestType!: string;

  @ApiProperty({ description: 'Request status' })
  status!: string;

  @ApiPropertyOptional({ description: 'Request description' })
  description?: string | null;

  @ApiProperty({ description: 'When request was submitted' })
  requestedAt!: Date;

  @ApiPropertyOptional({ description: 'When request was acknowledged' })
  acknowledgedAt?: Date | null;

  @ApiPropertyOptional({ description: 'When request was completed' })
  completedAt?: Date | null;

  @ApiProperty({ description: 'Due date for completion (GDPR: 30 days)' })
  dueDate!: Date;

  @ApiPropertyOptional({ description: 'Operator UUID assigned to handle this' })
  assignedTo?: string | null;

  @ApiPropertyOptional({ description: 'Resolution description' })
  resolution?: string | null;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;
}
