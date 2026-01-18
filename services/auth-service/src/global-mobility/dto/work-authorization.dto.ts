import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsDate,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { work_permit_type, visa_status } from '@prisma/auth-client';

export class CreateWorkAuthorizationDto {
  @ApiProperty({ description: 'ID of the admin' })
  @IsUUID()
  adminId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  globalAssignmentId?: string;

  @ApiProperty()
  @IsString()
  countryCode: string;

  @ApiProperty({ enum: work_permit_type })
  @IsEnum(work_permit_type)
  authorizationType: work_permit_type;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  visaType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  applicationDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  approvalDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiryDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sponsorType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sponsoringEntityId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  employerRestricted?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  locationRestricted?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedActivities?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  renewable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  maxRenewals?: number;

  @ApiPropertyOptional({ default: 90 })
  @IsOptional()
  @IsInt()
  @Min(1)
  renewalLeadDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateWorkAuthorizationDto {
  @ApiPropertyOptional({ enum: visa_status })
  @IsOptional()
  @IsEnum(visa_status)
  status?: visa_status;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  approvalDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiryDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class WorkAuthorizationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  adminId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ enum: work_permit_type })
  @IsOptional()
  @IsEnum(work_permit_type)
  authorizationType?: work_permit_type;

  @ApiPropertyOptional({ enum: visa_status })
  @IsOptional()
  @IsEnum(visa_status)
  status?: visa_status;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  expiringSoon?: boolean;

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

export class WorkAuthorizationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  adminId: string;

  @ApiPropertyOptional()
  globalAssignmentId?: string;

  @ApiProperty()
  countryCode: string;

  @ApiProperty({ enum: work_permit_type })
  authorizationType: work_permit_type;

  @ApiPropertyOptional()
  visaType?: string;

  @ApiProperty({ enum: visa_status })
  status: visa_status;

  @ApiPropertyOptional()
  applicationDate?: Date;

  @ApiPropertyOptional()
  approvalDate?: Date;

  @ApiPropertyOptional()
  startDate?: Date;

  @ApiPropertyOptional()
  expiryDate?: Date;

  @ApiPropertyOptional()
  documentNumber?: string;

  @ApiPropertyOptional()
  documentUrl?: string;

  @ApiPropertyOptional()
  sponsorType?: string;

  @ApiPropertyOptional()
  sponsoringEntityId?: string;

  @ApiPropertyOptional()
  employerRestricted?: boolean;

  @ApiPropertyOptional()
  locationRestricted?: boolean;

  @ApiProperty({ type: [String] })
  allowedActivities: string[];

  @ApiPropertyOptional()
  renewable?: boolean;

  @ApiPropertyOptional()
  maxRenewals?: number;

  @ApiPropertyOptional()
  renewalLeadDays?: number;

  @ApiPropertyOptional()
  expiryReminderSent?: boolean;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
