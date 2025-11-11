import { IsEnum, IsBoolean, IsOptional, IsDateString, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ShareDuration } from './create-share-link.dto';

export class UpdateShareLinkDto {
  @ApiPropertyOptional({ enum: ShareDuration })
  @IsOptional()
  @IsEnum(ShareDuration)
  duration?: ShareDuration;

  @ApiPropertyOptional({
    description: 'Custom expiration date (required when duration is CUSTOM)',
    example: '2025-12-31T23:59:59.999Z'
  })
  @ValidateIf(o => o.duration === ShareDuration.CUSTOM)
  @IsDateString()
  customExpiresAt?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
