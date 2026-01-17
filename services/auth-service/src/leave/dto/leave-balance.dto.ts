import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsInt, IsOptional, Min, Max } from 'class-validator';

export class AdjustBalanceDto {
  @ApiProperty()
  @IsNumber()
  adjustment: number;

  @ApiProperty()
  @IsString()
  adjustmentReason: string;
}

export class LeaveBalanceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  adminId: string;

  @ApiProperty()
  year: number;

  @ApiProperty()
  annualEntitled: number;

  @ApiProperty()
  annualUsed: number;

  @ApiProperty()
  annualPending: number;

  @ApiProperty()
  annualRemaining: number;

  @ApiProperty()
  sickEntitled: number;

  @ApiProperty()
  sickUsed: number;

  @ApiProperty()
  sickRemaining: number;

  @ApiProperty()
  compensatoryEntitled: number;

  @ApiProperty()
  compensatoryUsed: number;

  @ApiProperty()
  compensatoryRemaining: number;

  @ApiPropertyOptional()
  compensatoryExpiryDate?: Date;

  @ApiProperty()
  specialEntitled: number;

  @ApiProperty()
  specialUsed: number;

  @ApiProperty()
  specialRemaining: number;

  @ApiProperty()
  carryoverFromPrevious: number;

  @ApiPropertyOptional()
  carryoverExpiryDate?: Date;

  @ApiProperty()
  adjustment: number;

  @ApiPropertyOptional()
  adjustmentReason?: string;

  @ApiPropertyOptional()
  adjustedBy?: string;

  @ApiPropertyOptional()
  lastCalculatedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CreateLeaveBalanceDto {
  @ApiProperty()
  @IsString()
  adminId: string;

  @ApiProperty()
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiPropertyOptional({ default: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  annualEntitled?: number = 15;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sickEntitled?: number = 10;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  compensatoryEntitled?: number = 0;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  specialEntitled?: number = 0;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  carryoverFromPrevious?: number = 0;
}
