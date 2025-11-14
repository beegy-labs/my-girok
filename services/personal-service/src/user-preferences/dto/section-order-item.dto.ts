import { IsEnum, IsBoolean, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum SectionType {
  SKILLS = 'SKILLS',
  EXPERIENCE = 'EXPERIENCE',
  PROJECT = 'PROJECT',
  EDUCATION = 'EDUCATION',
  CERTIFICATE = 'CERTIFICATE',
}

export class SectionOrderItemDto {
  @ApiProperty({
    description: 'Section type',
    enum: SectionType,
    example: SectionType.SKILLS,
  })
  @IsEnum(SectionType)
  type!: SectionType;

  @ApiProperty({
    description: 'Display order (0-based)',
    example: 0,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  order!: number;

  @ApiProperty({
    description: 'Visibility flag',
    example: true,
  })
  @IsBoolean()
  visible!: boolean;
}
