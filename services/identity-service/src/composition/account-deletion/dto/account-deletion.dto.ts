import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Account deletion request DTO
 */
export class DeleteAccountDto {
  @ApiProperty({
    description: 'Account ID to delete',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  @IsUUID()
  accountId!: string;

  @ApiPropertyOptional({
    description: 'Reason for deletion',
    example: 'User requested account deletion',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Legal basis for deletion (e.g., GDPR Article 17)',
    example: 'GDPR_ARTICLE_17',
  })
  @IsOptional()
  @IsString()
  legalBasis?: string;
}

/**
 * Account deletion response DTO
 */
export class AccountDeletionResponseDto {
  @ApiProperty({
    description: 'Whether deletion was successful',
  })
  success!: boolean;

  @ApiProperty({
    description: 'Account ID that was deleted',
  })
  accountId!: string;

  @ApiProperty({
    description: 'Deletion status',
    enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'],
  })
  status!: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';

  @ApiPropertyOptional({
    description: 'Scheduled deletion date (for grace period)',
  })
  scheduledDeletionDate?: Date;

  @ApiProperty({
    description: 'Deletion timestamp',
  })
  deletedAt!: Date;
}
