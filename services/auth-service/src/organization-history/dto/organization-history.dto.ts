import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsDate, IsOptional, IsInt, IsUUID, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrganizationHistoryDto {
  @ApiProperty({ description: 'ID of the admin' })
  @IsUUID()
  adminId: string;

  @ApiProperty()
  @IsString()
  changeType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  previousJobGradeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  previousJobTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  previousOrgUnitId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  previousManagerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  previousLegalEntityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  previousOfficeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  previousCostCenter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  newJobGradeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  newJobTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  newOrgUnitId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  newManagerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  newLegalEntityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  newOfficeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  newCostCenter?: string;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  effectiveDate: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  requestedBy?: string;
}

export class ApproveOrganizationHistoryDto {
  @ApiProperty()
  @IsUUID()
  approvedBy: string;
}

export class OrganizationHistoryQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  adminId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  changeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  effectiveDateFrom?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  effectiveDateTo?: Date;

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

export class OrganizationHistoryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  adminId: string;

  @ApiProperty()
  changeType: string;

  @ApiPropertyOptional()
  previousJobGradeId?: string;

  @ApiPropertyOptional()
  previousJobTitle?: string;

  @ApiPropertyOptional()
  previousOrgUnitId?: string;

  @ApiPropertyOptional()
  previousManagerId?: string;

  @ApiPropertyOptional()
  previousLegalEntityId?: string;

  @ApiPropertyOptional()
  previousOfficeId?: string;

  @ApiPropertyOptional()
  previousCostCenter?: string;

  @ApiPropertyOptional()
  newJobGradeId?: string;

  @ApiPropertyOptional()
  newJobTitle?: string;

  @ApiPropertyOptional()
  newOrgUnitId?: string;

  @ApiPropertyOptional()
  newManagerId?: string;

  @ApiPropertyOptional()
  newLegalEntityId?: string;

  @ApiPropertyOptional()
  newOfficeId?: string;

  @ApiPropertyOptional()
  newCostCenter?: string;

  @ApiProperty()
  effectiveDate: Date;

  @ApiPropertyOptional()
  reason?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  requestedBy?: string;

  @ApiPropertyOptional()
  approvedBy?: string;

  @ApiPropertyOptional()
  approvedAt?: Date;

  @ApiProperty()
  createdAt: Date;
}
