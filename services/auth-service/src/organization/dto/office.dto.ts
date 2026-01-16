import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean, IsUUID } from 'class-validator';

export enum OfficeType {
  HEADQUARTERS = 'HEADQUARTERS',
  BRANCH = 'BRANCH',
  SATELLITE = 'SATELLITE',
  REMOTE = 'REMOTE',
  COWORKING = 'COWORKING',
}

export class CreateOfficeDto {
  @ApiProperty({ example: 'SEL-HQ', description: 'Office code (unique)' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Seoul Headquarters', description: 'Office name' })
  @IsString()
  name: string;

  @ApiProperty({
    enum: OfficeType,
    example: OfficeType.HEADQUARTERS,
    description: 'Type of office',
  })
  @IsEnum(OfficeType)
  officeType: OfficeType;

  @ApiProperty({
    example: '01936c5e-7b8a-7890-abcd-ef1234567890',
    description: 'Legal entity ID',
  })
  @IsUUID()
  legalEntityId: string;

  @ApiProperty({ example: 'KR', description: 'Country code (ISO 3166-1 alpha-2)' })
  @IsString()
  countryCode: string;

  @ApiProperty({ example: 'Seoul', required: false, description: 'City name' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    example: '123 Main St, Gangnam-gu, Seoul',
    required: false,
    description: 'Street address',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: '+82-2-1234-5678', required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ example: 'Main headquarters office', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: true, required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateOfficeDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false, enum: OfficeType })
  @IsOptional()
  @IsEnum(OfficeType)
  officeType?: OfficeType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class OfficeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: OfficeType })
  officeType: OfficeType;

  @ApiProperty()
  legalEntityId: string;

  @ApiProperty()
  countryCode: string;

  @ApiProperty({ required: false })
  city?: string;

  @ApiProperty({ required: false })
  address?: string;

  @ApiProperty({ required: false })
  phoneNumber?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class OfficeListQueryDto {
  @ApiProperty({ required: false, enum: OfficeType })
  @IsOptional()
  @IsEnum(OfficeType)
  officeType?: OfficeType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  legalEntityId?: string;

  @ApiProperty({ required: false, example: 'KR' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
