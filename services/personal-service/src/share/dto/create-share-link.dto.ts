import { IsEnum, IsDateString, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ShareDuration {
  ONE_WEEK = '1_week',
  ONE_MONTH = '1_month',
  THREE_MONTHS = '3_months',
  PERMANENT = 'permanent',
  CUSTOM = 'custom',
}

export class CreateShareLinkDto {
  @ApiProperty({ enum: ShareDuration, default: ShareDuration.ONE_MONTH })
  @IsEnum(ShareDuration)
  duration!: ShareDuration;

  @ApiPropertyOptional({
    description: 'Custom expiration date (required when duration is CUSTOM)',
    example: '2025-12-31T23:59:59.999Z'
  })
  @ValidateIf(o => o.duration === ShareDuration.CUSTOM)
  @IsDateString()
  customExpiresAt?: string;
}
