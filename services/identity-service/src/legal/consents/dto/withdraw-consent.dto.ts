import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for withdrawing a consent
 */
export class WithdrawConsentDto {
  @ApiPropertyOptional({
    description: 'Reason for withdrawing consent',
    example: 'No longer wish to receive marketing emails',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Client IP address for audit',
    example: '192.168.1.1',
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'Client user agent for audit',
  })
  @IsOptional()
  @IsString()
  userAgent?: string;
}

/**
 * DTO for withdrawing consent by type (without consent ID)
 */
export class WithdrawConsentByTypeDto extends WithdrawConsentDto {
  @ApiProperty({
    description: 'Account ID of the user',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  @IsUUID()
  accountId!: string;
}
