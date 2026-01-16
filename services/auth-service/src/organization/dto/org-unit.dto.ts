import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean, IsUUID } from 'class-validator';

export enum OrgUnitType {
  COMPANY = 'COMPANY',
  DIVISION = 'DIVISION',
  DEPARTMENT = 'DEPARTMENT',
  TEAM = 'TEAM',
  SQUAD = 'SQUAD',
  TRIBE = 'TRIBE',
  CHAPTER = 'CHAPTER',
  GUILD = 'GUILD',
}

export class CreateOrgUnitDto {
  @ApiProperty({ example: 'ENG', description: 'Organization unit code (unique)' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Engineering', description: 'Organization unit name' })
  @IsString()
  name: string;

  @ApiProperty({
    enum: OrgUnitType,
    example: OrgUnitType.DEPARTMENT,
    description: 'Type of organization unit',
  })
  @IsEnum(OrgUnitType)
  orgType: OrgUnitType;

  @ApiProperty({
    example: '01936c5e-7b8a-7890-abcd-ef1234567890',
    required: false,
    description: 'Parent organization unit ID (null for root units)',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiProperty({
    example: '01936c5e-7b8a-7890-abcd-ef1234567890',
    required: false,
    description: 'Manager admin ID',
  })
  @IsOptional()
  @IsUUID()
  managerAdminId?: string;

  @ApiProperty({
    example: 'Responsible for all engineering activities',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateOrgUnitDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false, enum: OrgUnitType })
  @IsOptional()
  @IsEnum(OrgUnitType)
  orgType?: OrgUnitType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  managerAdminId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class OrgUnitResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: OrgUnitType })
  orgType: OrgUnitType;

  @ApiProperty({ required: false })
  parentId?: string;

  @ApiProperty({ required: false })
  managerAdminId?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class OrgUnitTreeNodeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: OrgUnitType })
  orgType: OrgUnitType;

  @ApiProperty({ required: false })
  parentId?: string;

  @ApiProperty({ required: false })
  managerAdminId?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ type: [OrgUnitTreeNodeDto], description: 'Child organization units' })
  children: OrgUnitTreeNodeDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class OrgUnitListQueryDto {
  @ApiProperty({ required: false, enum: OrgUnitType })
  @IsOptional()
  @IsEnum(OrgUnitType)
  orgType?: OrgUnitType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
