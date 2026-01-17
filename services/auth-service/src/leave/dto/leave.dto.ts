import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsDate, IsOptional, IsNumber, IsEnum, IsArray, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { LeaveType, LeaveStatus } from '@my-girok/types';

export class CreateLeaveDto {
  @ApiProperty({ enum: LeaveType })
  @IsEnum(LeaveType)
  leaveType: LeaveType;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @ApiPropertyOptional({ enum: ['AM', 'PM'] })
  @IsOptional()
  @IsString()
  startHalf?: string;

  @ApiPropertyOptional({ enum: ['AM', 'PM'] })
  @IsOptional()
  @IsString()
  endHalf?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.5)
  @Max(365)
  daysCount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  handoverTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  handoverNotes?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentUrls?: string[];
}

export class SubmitLeaveDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstApproverId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secondApproverId?: string;
}

export class ApproveLeaveDto {
  @ApiProperty()
  @IsString()
  approvalStatus: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class CancelLeaveDto {
  @ApiProperty()
  @IsString()
  cancellationReason: string;
}

export class LeaveQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminId?: string;

  @ApiPropertyOptional({ enum: LeaveType })
  @IsOptional()
  @IsEnum(LeaveType)
  leaveType?: LeaveType;

  @ApiPropertyOptional({ enum: LeaveStatus })
  @IsOptional()
  @IsEnum(LeaveStatus)
  status?: LeaveStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

export class LeaveResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  adminId: string;

  @ApiProperty({ enum: LeaveType })
  leaveType: LeaveType;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiPropertyOptional()
  startHalf?: string;

  @ApiPropertyOptional()
  endHalf?: string;

  @ApiProperty()
  daysCount: number;

  @ApiProperty({ enum: LeaveStatus })
  status: LeaveStatus;

  @ApiProperty()
  requestedAt: Date;

  @ApiPropertyOptional()
  submittedAt?: Date;

  @ApiPropertyOptional()
  firstApproverId?: string;

  @ApiPropertyOptional()
  firstApprovedAt?: Date;

  @ApiPropertyOptional()
  firstApprovalStatus?: string;

  @ApiPropertyOptional()
  secondApproverId?: string;

  @ApiPropertyOptional()
  secondApprovedAt?: Date;

  @ApiPropertyOptional()
  secondApprovalStatus?: string;

  @ApiPropertyOptional()
  finalApprovedBy?: string;

  @ApiPropertyOptional()
  finalApprovedAt?: Date;

  @ApiPropertyOptional()
  rejectedBy?: string;

  @ApiPropertyOptional()
  rejectedAt?: Date;

  @ApiPropertyOptional()
  rejectionReason?: string;

  @ApiPropertyOptional()
  cancelledAt?: Date;

  @ApiPropertyOptional()
  cancellationReason?: string;

  @ApiPropertyOptional()
  reason?: string;

  @ApiPropertyOptional()
  emergencyContact?: string;

  @ApiPropertyOptional()
  handoverTo?: string;

  @ApiPropertyOptional()
  handoverNotes?: string;

  @ApiPropertyOptional({ type: [String] })
  attachmentUrls?: string[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
