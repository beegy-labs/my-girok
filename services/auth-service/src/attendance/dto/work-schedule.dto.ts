import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsDate,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ScheduleType } from '@my-girok/types';

export class CreateWorkScheduleDto {
  @ApiProperty()
  @IsString()
  adminId: string;

  @ApiProperty({ enum: ScheduleType, default: ScheduleType.STANDARD })
  @IsEnum(ScheduleType)
  scheduleType: ScheduleType = ScheduleType.STANDARD;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  effectiveDate: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mondayStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mondayEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tuesdayStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tuesdayEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wednesdayStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wednesdayEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thursdayStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thursdayEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fridayStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fridayEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  saturdayStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  saturdayEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sundayStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sundayEnd?: string;

  @ApiPropertyOptional({ default: 40 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(168)
  weeklyHours?: number = 40;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coreHoursStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coreHoursEnd?: string;

  @ApiProperty()
  @IsString()
  timezone: string;
}

export class UpdateWorkScheduleDto {
  @ApiPropertyOptional({ enum: ScheduleType })
  @IsOptional()
  @IsEnum(ScheduleType)
  scheduleType?: ScheduleType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mondayStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mondayEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tuesdayStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tuesdayEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wednesdayStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wednesdayEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thursdayStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thursdayEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fridayStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fridayEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  saturdayStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  saturdayEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sundayStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sundayEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(168)
  weeklyHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coreHoursStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coreHoursEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class WorkScheduleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  adminId: string;

  @ApiProperty({ enum: ScheduleType })
  scheduleType: ScheduleType;

  @ApiProperty()
  effectiveDate: Date;

  @ApiPropertyOptional()
  endDate?: Date;

  @ApiPropertyOptional()
  mondayStart?: string;

  @ApiPropertyOptional()
  mondayEnd?: string;

  @ApiPropertyOptional()
  tuesdayStart?: string;

  @ApiPropertyOptional()
  tuesdayEnd?: string;

  @ApiPropertyOptional()
  wednesdayStart?: string;

  @ApiPropertyOptional()
  wednesdayEnd?: string;

  @ApiPropertyOptional()
  thursdayStart?: string;

  @ApiPropertyOptional()
  thursdayEnd?: string;

  @ApiPropertyOptional()
  fridayStart?: string;

  @ApiPropertyOptional()
  fridayEnd?: string;

  @ApiPropertyOptional()
  saturdayStart?: string;

  @ApiPropertyOptional()
  saturdayEnd?: string;

  @ApiPropertyOptional()
  sundayStart?: string;

  @ApiPropertyOptional()
  sundayEnd?: string;

  @ApiProperty()
  weeklyHours: number;

  @ApiPropertyOptional()
  coreHoursStart?: string;

  @ApiPropertyOptional()
  coreHoursEnd?: string;

  @ApiProperty()
  timezone: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
