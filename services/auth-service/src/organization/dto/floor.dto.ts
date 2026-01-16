import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUUID, IsNumber } from 'class-validator';

export class CreateFloorDto {
  @ApiProperty({ example: 'SEL-A-5F', description: 'Floor code (unique)' })
  @IsString()
  code: string;

  @ApiProperty({ example: '5th Floor', description: 'Floor name' })
  @IsString()
  name: string;

  @ApiProperty({
    example: '01936c5e-7b8a-7890-abcd-ef1234567890',
    description: 'Building ID',
  })
  @IsUUID()
  buildingId: string;

  @ApiProperty({ example: 5, description: 'Floor number' })
  @IsNumber()
  floorNumber: number;

  @ApiProperty({ example: 1000, required: false, description: 'Floor area in square meters' })
  @IsOptional()
  @IsNumber()
  floorArea?: number;

  @ApiProperty({ example: 'Engineering team floor', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: true, required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFloorDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  floorNumber?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  floorArea?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class FloorResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  buildingId: string;

  @ApiProperty()
  floorNumber: number;

  @ApiProperty({ required: false })
  floorArea?: number;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class FloorListQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  buildingId?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
