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
import { certification_status } from '@prisma/auth-client';
import { BadRequestException } from '@nestjs/common';

export class CreateCertificationDto {
  @ApiProperty({ description: 'ID of the admin' })
  @IsUUID()
  adminId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  issuingOrganization: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  credentialId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  credentialUrl?: string;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  issueDate: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiryDate?: Date;

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

export class UpdateCertificationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issuingOrganization?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  credentialUrl?: string;

  @ApiPropertyOptional({ enum: certification_status })
  @IsOptional()
  @IsEnum(certification_status)
  status?: certification_status;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiryDate?: Date;
}

export class VerifyCertificationDto {
  @ApiProperty()
  @IsUUID()
  verifiedBy: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  verificationUrl?: string;
}

export class CertificationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  adminId?: string;

  @ApiPropertyOptional({ enum: certification_status })
  @IsOptional()
  @IsEnum(certification_status)
  status?: certification_status;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issuingOrganization?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isVerified?: boolean;

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

export class CertificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  adminId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  issuingOrganization: string;

  @ApiPropertyOptional()
  credentialId?: string;

  @ApiPropertyOptional()
  credentialUrl?: string;

  @ApiProperty()
  issueDate: Date;

  @ApiPropertyOptional()
  expiryDate?: Date;

  @ApiProperty({ enum: certification_status })
  status: certification_status;

  @ApiProperty()
  isVerified: boolean;

  @ApiPropertyOptional()
  verifiedAt?: Date;

  @ApiPropertyOptional()
  verifiedBy?: string;

  @ApiPropertyOptional()
  verificationUrl?: string;

  @ApiPropertyOptional()
  metadata?: any;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
