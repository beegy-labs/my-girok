import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUUID, IsNumber } from 'class-validator';

export class CreateBuildingDto {
  @ApiProperty({ example: 'SEL-A', description: 'Building code (unique)' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Building A', description: 'Building name' })
  @IsString()
  name: string;

  @ApiProperty({
    example: '01936c5e-7b8a-7890-abcd-ef1234567890',
    description: 'Office ID',
  })
  @IsUUID()
  officeId: string;

  @ApiProperty({ example: '123 Main St', required: false, description: 'Building address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 10, required: false, description: 'Number of floors' })
  @IsOptional()
  @IsNumber()
  totalFloors?: number;

  @ApiProperty({ example: 'Main building with conference rooms', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: true, required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBuildingDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  totalFloors?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BuildingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  officeId: string;

  @ApiProperty({ required: false })
  address?: string;

  @ApiProperty({ required: false })
  totalFloors?: number;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class BuildingListQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  officeId?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
