import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class WithdrawConsentDto {
  @ApiPropertyOptional({ description: 'Reason for withdrawal' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({ description: 'IP address of the user' })
  @IsOptional()
  @IsString()
  @MaxLength(45)
  ipAddress?: string;
}
