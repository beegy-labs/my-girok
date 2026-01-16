import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean, IsEmail } from 'class-validator';

export enum PartnerType {
  VENDOR = 'VENDOR',
  CONTRACTOR = 'CONTRACTOR',
  CONSULTANT = 'CONSULTANT',
  AGENCY = 'AGENCY',
  SUPPLIER = 'SUPPLIER',
  PARTNER = 'PARTNER',
}

export class CreatePartnerCompanyDto {
  @ApiProperty({ example: 'ACME', description: 'Partner company code (unique)' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'ACME Corporation', description: 'Partner company name' })
  @IsString()
  name: string;

  @ApiProperty({
    enum: PartnerType,
    example: PartnerType.VENDOR,
    description: 'Type of partner',
  })
  @IsEnum(PartnerType)
  partnerType: PartnerType;

  @ApiProperty({ example: 'contact@acme.com', required: false, description: 'Contact email' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiProperty({ example: '+1-555-1234', required: false, description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiProperty({ example: 'John Doe', required: false, description: 'Primary contact person name' })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiProperty({ example: '123-45-67890', required: false, description: 'Tax ID number' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiProperty({
    example: '123 Partner St, City',
    required: false,
    description: 'Business address',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'Primary software vendor', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: true, required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePartnerCompanyDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false, enum: PartnerType })
  @IsOptional()
  @IsEnum(PartnerType)
  partnerType?: PartnerType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PartnerCompanyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: PartnerType })
  partnerType: PartnerType;

  @ApiProperty({ required: false })
  contactEmail?: string;

  @ApiProperty({ required: false })
  contactPhone?: string;

  @ApiProperty({ required: false })
  contactPerson?: string;

  @ApiProperty({ required: false })
  taxId?: string;

  @ApiProperty({ required: false })
  address?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PartnerCompanyListQueryDto {
  @ApiProperty({ required: false, enum: PartnerType })
  @IsOptional()
  @IsEnum(PartnerType)
  partnerType?: PartnerType;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
