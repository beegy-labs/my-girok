import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsDate,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
  IsArray,
  IsUUID,
  Min,
  Max,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  delegation_type,
  delegation_scope,
  delegation_status,
  delegation_reason,
} from '@prisma/auth-client';

export class CreateDelegationDto {
  @ApiProperty({ description: 'ID of the admin delegating authority' })
  @IsUUID()
  delegatorId: string;

  @ApiProperty({ description: 'ID of the admin receiving delegated authority' })
  @IsUUID()
  delegateId: string;

  @ApiProperty({ enum: delegation_type })
  @IsEnum(delegation_type)
  delegationType: delegation_type;

  @ApiProperty({ enum: delegation_scope })
  @IsEnum(delegation_scope)
  delegationScope: delegation_scope;

  @ApiProperty({ enum: delegation_reason })
  @IsEnum(delegation_reason)
  delegationReason: delegation_reason;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  specificPermissions: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  specificRoleIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  resourceIds?: string[];

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  maxActions?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedHours?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedIps?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  notifyOnUse?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  notifyOnExpiry?: boolean;

  @ApiPropertyOptional({ type: [Number], default: [7, 1] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @ArrayMaxSize(10)
  expiryReminderDays?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDelegationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specificPermissions?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  maxActions?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedHours?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedIps?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveDelegationDto {
  @ApiProperty()
  @IsBoolean()
  approved: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class RevokeDelegationDto {
  @ApiProperty()
  @IsString()
  revocationReason: string;
}

export class DelegationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  delegatorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  delegateId?: string;

  @ApiPropertyOptional({ enum: delegation_status })
  @IsOptional()
  @IsEnum(delegation_status)
  status?: delegation_status;

  @ApiPropertyOptional({ enum: delegation_type })
  @IsOptional()
  @IsEnum(delegation_type)
  delegationType?: delegation_type;

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

export class DelegationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  delegatorId: string;

  @ApiProperty()
  delegateId: string;

  @ApiProperty({ enum: delegation_type })
  delegationType: delegation_type;

  @ApiProperty({ enum: delegation_scope })
  delegationScope: delegation_scope;

  @ApiProperty({ enum: delegation_reason })
  delegationReason: delegation_reason;

  @ApiProperty({ type: [String] })
  specificPermissions: string[];

  @ApiProperty({ type: [String] })
  specificRoleIds: string[];

  @ApiProperty({ type: [String] })
  resourceIds: string[];

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty({ enum: delegation_status })
  status: delegation_status;

  @ApiProperty()
  requiresApproval: boolean;

  @ApiPropertyOptional()
  approvedBy?: string;

  @ApiPropertyOptional()
  approvedAt?: Date;

  @ApiPropertyOptional()
  rejectionReason?: string;

  @ApiPropertyOptional()
  maxActions?: number;

  @ApiProperty({ type: [String] })
  allowedHours: string[];

  @ApiProperty({ type: [String] })
  allowedIps: string[];

  @ApiProperty()
  notifyOnUse: boolean;

  @ApiProperty()
  notifyOnExpiry: boolean;

  @ApiProperty({ type: [Number] })
  expiryReminderDays: number[];

  @ApiPropertyOptional()
  revokedAt?: Date;

  @ApiPropertyOptional()
  revokedBy?: string;

  @ApiPropertyOptional()
  revocationReason?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class DelegationLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  delegationId: string;

  @ApiProperty()
  delegateId: string;

  @ApiProperty()
  action: string;

  @ApiPropertyOptional()
  resourceType?: string;

  @ApiPropertyOptional()
  resourceId?: string;

  @ApiPropertyOptional()
  ipAddress?: string;

  @ApiPropertyOptional()
  userAgent?: string;

  @ApiProperty()
  success: boolean;

  @ApiPropertyOptional()
  errorMessage?: string;

  @ApiProperty()
  createdAt: Date;
}
