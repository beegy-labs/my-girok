import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsDate,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsNumber,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { training_type, training_status } from '@prisma/auth-client';
import { BadRequestException } from '@nestjs/common';

export class CreateTrainingDto {
  @ApiProperty({ description: 'ID of the admin' })
  @IsUUID()
  adminId: string;

  @ApiProperty({ enum: training_type })
  @IsEnum(training_type)
  trainingType: training_type;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dueDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  passingScore?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  recurrenceMonths?: number;

  @ApiPropertyOptional({ description: 'JSON string for metadata' })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        throw new BadRequestException(
          `Invalid JSON in metadata field: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
    return value;
  })
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateTrainingDto {
  @ApiPropertyOptional({ enum: training_status })
  @IsOptional()
  @IsEnum(training_status)
  status?: training_status;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dueDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  passingScore?: number;
}

export class CompleteTrainingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certificateUrl?: string;
}

export class WaiveTrainingDto {
  @ApiProperty()
  @IsUUID()
  waivedBy: string;

  @ApiProperty()
  @IsString()
  waiverReason: string;
}

export class TrainingQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  adminId?: string;

  @ApiPropertyOptional({ enum: training_type })
  @IsOptional()
  @IsEnum(training_type)
  trainingType?: training_type;

  @ApiPropertyOptional({ enum: training_status })
  @IsOptional()
  @IsEnum(training_status)
  status?: training_status;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isMandatory?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isWaived?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

export class TrainingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  adminId: string;

  @ApiProperty({ enum: training_type })
  trainingType: training_type;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  provider?: string;

  @ApiProperty({ enum: training_status })
  status: training_status;

  @ApiPropertyOptional()
  assignedAt?: Date;

  @ApiPropertyOptional()
  startedAt?: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiPropertyOptional()
  dueDate?: Date;

  @ApiPropertyOptional()
  score?: number;

  @ApiPropertyOptional()
  passingScore?: number;

  @ApiProperty()
  isMandatory: boolean;

  @ApiPropertyOptional()
  recurrenceMonths?: number;

  @ApiPropertyOptional()
  nextDueDate?: Date;

  @ApiProperty()
  isWaived: boolean;

  @ApiPropertyOptional()
  waivedBy?: string;

  @ApiPropertyOptional()
  waiverReason?: string;

  @ApiPropertyOptional()
  certificateUrl?: string;

  @ApiPropertyOptional()
  metadata?: any;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
