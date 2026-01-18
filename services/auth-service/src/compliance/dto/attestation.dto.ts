import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsDate,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
  IsUUID,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { attestation_type, attestation_status } from '@prisma/auth-client';
import { BadRequestException } from '@nestjs/common';

export class CreateAttestationDto {
  @ApiProperty({ description: 'ID of the admin' })
  @IsUUID()
  adminId: string;

  @ApiProperty({ enum: attestation_type })
  @IsEnum(attestation_type)
  attestationType: attestation_type;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentVersion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentHash?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dueDate?: Date;

  @ApiPropertyOptional({ default: 12 })
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

export class UpdateAttestationDto {
  @ApiPropertyOptional({ enum: attestation_status })
  @IsOptional()
  @IsEnum(attestation_status)
  status?: attestation_status;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dueDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentHash?: string;
}

export class CompleteAttestationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  signatureData?: string;
}

export class WaiveAttestationDto {
  @ApiProperty()
  @IsUUID()
  waivedBy: string;

  @ApiProperty()
  @IsString()
  waiverReason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  waiverExpiry?: Date;
}

export class AttestationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  adminId?: string;

  @ApiPropertyOptional({ enum: attestation_type })
  @IsOptional()
  @IsEnum(attestation_type)
  attestationType?: attestation_type;

  @ApiPropertyOptional({ enum: attestation_status })
  @IsOptional()
  @IsEnum(attestation_status)
  status?: attestation_status;

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

export class AttestationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  adminId: string;

  @ApiProperty({ enum: attestation_type })
  attestationType: attestation_type;

  @ApiPropertyOptional()
  documentVersion?: string;

  @ApiPropertyOptional()
  documentUrl?: string;

  @ApiPropertyOptional()
  documentHash?: string;

  @ApiProperty({ enum: attestation_status })
  status: attestation_status;

  @ApiPropertyOptional()
  dueDate?: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiPropertyOptional()
  ipAddress?: string;

  @ApiPropertyOptional()
  userAgent?: string;

  @ApiPropertyOptional()
  signatureData?: string;

  @ApiProperty()
  isWaived: boolean;

  @ApiPropertyOptional()
  waivedBy?: string;

  @ApiPropertyOptional()
  waiverReason?: string;

  @ApiPropertyOptional()
  waiverExpiry?: Date;

  @ApiProperty()
  recurrenceMonths: number;

  @ApiPropertyOptional()
  nextDueDate?: Date;

  @ApiPropertyOptional()
  metadata?: any;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
