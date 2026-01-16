import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNumber, Min, Max, IsBoolean } from 'class-validator';

// JobFamily enum from packages/types
export enum JobFamily {
  ENGINEERING = 'ENGINEERING',
  PRODUCT = 'PRODUCT',
  DESIGN = 'DESIGN',
  MARKETING = 'MARKETING',
  SALES = 'SALES',
  SUPPORT = 'SUPPORT',
  OPERATIONS = 'OPERATIONS',
  FINANCE = 'FINANCE',
  HR = 'HR',
  LEGAL = 'LEGAL',
  EXECUTIVE = 'EXECUTIVE',
}

export class CreateJobGradeDto {
  @ApiProperty({ example: 'IC5', description: 'Job grade code (unique)' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Senior Engineer', description: 'Job grade name' })
  @IsString()
  name: string;

  @ApiProperty({
    enum: JobFamily,
    example: JobFamily.ENGINEERING,
    description: 'Job family',
  })
  @IsEnum(JobFamily)
  jobFamily: JobFamily;

  @ApiProperty({
    example: 5,
    description: 'Level (1-10)',
    minimum: 1,
    maximum: 10,
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  level: number;

  @ApiProperty({
    example: 'IC',
    description: 'Track (IC for Individual Contributor, M for Manager)',
  })
  @IsString()
  track: string;

  @ApiProperty({
    example: 'Senior level individual contributor',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: true,
    required: false,
    default: true,
    description: 'Whether this job grade is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateJobGradeDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class JobGradeResponseDto {
  @ApiProperty({ example: '01936c5e-7b8a-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'IC5' })
  code: string;

  @ApiProperty({ example: 'Senior Engineer' })
  name: string;

  @ApiProperty({ enum: JobFamily, example: JobFamily.ENGINEERING })
  jobFamily: JobFamily;

  @ApiProperty({ example: 5 })
  level: number;

  @ApiProperty({ example: 'IC' })
  track: string;

  @ApiProperty({ example: 'Senior level individual contributor' })
  description?: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class JobGradeListQueryDto {
  @ApiProperty({ required: false, enum: JobFamily })
  @IsOptional()
  @IsEnum(JobFamily)
  jobFamily?: JobFamily;

  @ApiProperty({ required: false, example: 'IC' })
  @IsOptional()
  @IsString()
  track?: string;

  @ApiProperty({ required: false, example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
