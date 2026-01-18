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
} from 'class-validator';
import { Type } from 'class-transformer';
import { assignment_type } from '@prisma/auth-client';

export class CreateGlobalAssignmentDto {
  @ApiProperty({ description: 'ID of the admin' })
  @IsUUID()
  adminId: string;

  @ApiProperty({ enum: assignment_type })
  @IsEnum(assignment_type)
  assignmentType: assignment_type;

  @ApiProperty()
  @IsString()
  homeCountryCode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  homeLegalEntityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  homeOfficeId?: string;

  @ApiProperty()
  @IsString()
  hostCountryCode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  hostLegalEntityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  hostOfficeId?: string;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  expectedEndDate: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  homeSalary?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  homeCurrency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  hostAllowance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hostCurrency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  costOfLivingAdjustment?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  hardshipAllowance?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  taxEqualization?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxProvider?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  relocationSupport?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  housingProvided?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  schoolingSupport?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  spouseWorkSupport?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateGlobalAssignmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expectedEndDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  actualEndDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  hostAllowance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveGlobalAssignmentDto {
  @ApiProperty()
  @IsUUID()
  approvedBy: string;
}

export class GlobalAssignmentQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  adminId?: string;

  @ApiPropertyOptional({ enum: assignment_type })
  @IsOptional()
  @IsEnum(assignment_type)
  assignmentType?: assignment_type;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  homeCountryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hostCountryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

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

export class GlobalAssignmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  adminId: string;

  @ApiProperty({ enum: assignment_type })
  assignmentType: assignment_type;

  @ApiProperty()
  homeCountryCode: string;

  @ApiPropertyOptional()
  homeLegalEntityId?: string;

  @ApiPropertyOptional()
  homeOfficeId?: string;

  @ApiProperty()
  hostCountryCode: string;

  @ApiPropertyOptional()
  hostLegalEntityId?: string;

  @ApiPropertyOptional()
  hostOfficeId?: string;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  expectedEndDate: Date;

  @ApiPropertyOptional()
  actualEndDate?: Date;

  @ApiPropertyOptional()
  status?: string;

  @ApiPropertyOptional()
  businessReason?: string;

  @ApiPropertyOptional()
  projectName?: string;

  @ApiPropertyOptional()
  homeSalary?: number;

  @ApiPropertyOptional()
  homeCurrency?: string;

  @ApiPropertyOptional()
  hostAllowance?: number;

  @ApiPropertyOptional()
  hostCurrency?: string;

  @ApiPropertyOptional()
  costOfLivingAdjustment?: number;

  @ApiPropertyOptional()
  hardshipAllowance?: number;

  @ApiPropertyOptional()
  taxEqualization?: boolean;

  @ApiPropertyOptional()
  taxProvider?: string;

  @ApiPropertyOptional()
  relocationSupport?: boolean;

  @ApiPropertyOptional()
  housingProvided?: boolean;

  @ApiPropertyOptional()
  schoolingSupport?: boolean;

  @ApiPropertyOptional()
  spouseWorkSupport?: boolean;

  @ApiPropertyOptional()
  approvedBy?: string;

  @ApiPropertyOptional()
  approvedAt?: Date;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
