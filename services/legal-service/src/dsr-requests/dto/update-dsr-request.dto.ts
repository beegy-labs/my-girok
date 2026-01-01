import { IsOptional, IsString, IsUUID, IsEnum, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum DsrRequestStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export class UpdateDsrRequestDto {
  @ApiPropertyOptional({ description: 'New status', enum: DsrRequestStatus })
  @IsOptional()
  @IsEnum(DsrRequestStatus)
  status?: DsrRequestStatus;

  @ApiPropertyOptional({ description: 'Operator UUID assigned to handle this request' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Resolution description' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolution?: string;

  @ApiPropertyOptional({ description: 'Reason for rejection' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rejectionReason?: string;
}
