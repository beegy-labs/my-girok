import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ShareDuration {
  ONE_WEEK = '1_week',
  ONE_MONTH = '1_month',
  THREE_MONTHS = '3_months',
  PERMANENT = 'permanent',
}

export class CreateShareLinkDto {
  @ApiProperty({ enum: ShareDuration, default: ShareDuration.ONE_MONTH })
  @IsEnum(ShareDuration)
  duration!: ShareDuration;
}
