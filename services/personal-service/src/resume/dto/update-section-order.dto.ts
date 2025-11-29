import { IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum SectionType {
  SKILLS = 'SKILLS',
  EXPERIENCE = 'EXPERIENCE',
  PROJECT = 'PROJECT',
  EDUCATION = 'EDUCATION',
  CERTIFICATE = 'CERTIFICATE',
}

export class UpdateSectionOrderDto {
  @ApiProperty({ enum: SectionType })
  @IsEnum(SectionType)
  type!: SectionType;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  order!: number;
}
