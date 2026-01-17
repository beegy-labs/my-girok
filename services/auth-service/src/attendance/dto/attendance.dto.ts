import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsDate,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EARLY_LEAVE = 'EARLY_LEAVE',
  HALF_DAY_AM = 'HALF_DAY_AM',
  HALF_DAY_PM = 'HALF_DAY_PM',
  REMOTE = 'REMOTE',
  BUSINESS_TRIP = 'BUSINESS_TRIP',
}

export enum WorkType {
  OFFICE = 'OFFICE',
  REMOTE = 'REMOTE',
  HYBRID = 'HYBRID',
  FIELD = 'FIELD',
  BUSINESS_TRIP = 'BUSINESS_TRIP',
  CLIENT_SITE = 'CLIENT_SITE',
  TRAINING = 'TRAINING',
}

export class ClockInDto {
  @ApiProperty({ example: '2026-01-17' })
  @IsDate()
  @Type(() => Date)
  date: Date;

  @ApiPropertyOptional({ enum: WorkType })
  @IsOptional()
  @IsEnum(WorkType)
  workType?: WorkType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  officeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remoteLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  location?: { lat: number; lng: number; address?: string };

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ClockOutDto {
  @ApiProperty({ example: '2026-01-17' })
  @IsDate()
  @Type(() => Date)
  date: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  overtimeMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  overtimeReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  location?: { lat: number; lng: number; address?: string };

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveOvertimeDto {
  @ApiProperty()
  @IsBoolean()
  approved: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerNotes?: string;
}

export class AdminAttendanceQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminId?: string;

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

  @ApiPropertyOptional({ enum: AttendanceStatus })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @ApiPropertyOptional({ enum: WorkType })
  @IsOptional()
  @IsEnum(WorkType)
  workType?: WorkType;

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

export class AttendanceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  adminId: string;

  @ApiProperty()
  date: Date;

  @ApiPropertyOptional()
  scheduledStart?: string;

  @ApiPropertyOptional()
  scheduledEnd?: string;

  @ApiPropertyOptional()
  clockIn?: Date;

  @ApiPropertyOptional()
  clockOut?: Date;

  @ApiPropertyOptional()
  scheduledMinutes?: number;

  @ApiPropertyOptional()
  actualMinutes?: number;

  @ApiPropertyOptional()
  overtimeMinutes?: number;

  @ApiPropertyOptional()
  breakMinutes?: number;

  @ApiProperty({ enum: AttendanceStatus })
  status: AttendanceStatus;

  @ApiPropertyOptional()
  lateMinutes?: number;

  @ApiPropertyOptional()
  earlyLeaveMinutes?: number;

  @ApiProperty({ enum: WorkType })
  workType: WorkType;

  @ApiPropertyOptional()
  officeId?: string;

  @ApiPropertyOptional()
  remoteLocation?: string;

  @ApiPropertyOptional()
  overtimeRequested?: boolean;

  @ApiPropertyOptional()
  overtimeApproved?: boolean;

  @ApiPropertyOptional()
  overtimeApprovedBy?: string;

  @ApiPropertyOptional()
  overtimeApprovedAt?: Date;

  @ApiPropertyOptional()
  overtimeReason?: string;

  @ApiPropertyOptional()
  clockInMethod?: string;

  @ApiPropertyOptional()
  clockOutMethod?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  managerNotes?: string;

  @ApiPropertyOptional()
  isHoliday?: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class AttendanceStatsDto {
  @ApiProperty()
  totalDays: number;

  @ApiProperty()
  presentDays: number;

  @ApiProperty()
  absentDays: number;

  @ApiProperty()
  lateDays: number;

  @ApiProperty()
  remoteDays: number;

  @ApiProperty()
  totalOvertimeMinutes: number;

  @ApiProperty()
  averageWorkMinutes: number;
}
