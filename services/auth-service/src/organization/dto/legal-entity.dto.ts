import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateLegalEntityDto {
  @ApiProperty({ example: 'BEEGY-KR', description: 'Legal entity code (unique)' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Beegy Korea Inc.', description: 'Legal entity name' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Beegy Korea Inc.', description: 'Legal name' })
  @IsString()
  legalName: string;

  @ApiProperty({ example: 'KR', description: 'Country code (ISO 3166-1 alpha-2)' })
  @IsString()
  countryCode: string;

  @ApiProperty({ example: '123-45-67890', required: false, description: 'Tax ID number' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiProperty({
    example: '123 Main St, Seoul, South Korea',
    required: false,
    description: 'Registered address',
  })
  @IsOptional()
  @IsString()
  registeredAddress?: string;

  @ApiProperty({ example: 'Primary operating entity in Korea', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: true, required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateLegalEntityDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  registeredAddress?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class LegalEntityResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  legalName: string;

  @ApiProperty()
  countryCode: string;

  @ApiProperty({ required: false })
  taxId?: string;

  @ApiProperty({ required: false })
  registeredAddress?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class LegalEntityListQueryDto {
  @ApiProperty({ required: false, example: 'KR' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
