import {
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SectionOrderItemDto } from './section-order-item.dto';

export enum Theme {
  LIGHT = 'LIGHT',
  DARK = 'DARK',
}

export class CreateUserPreferencesDto {
  @ApiProperty({
    description: 'Theme preference',
    enum: Theme,
    default: Theme.LIGHT,
    example: Theme.LIGHT,
  })
  @IsEnum(Theme)
  theme!: Theme;

  @ApiPropertyOptional({
    description: 'Section order and visibility settings',
    type: [SectionOrderItemDto],
    maxItems: 5,
    example: [
      { type: 'SKILLS', order: 0, visible: true },
      { type: 'EXPERIENCE', order: 1, visible: true },
      { type: 'EDUCATION', order: 2, visible: false },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionOrderItemDto)
  @ArrayMaxSize(5)
  sectionOrder?: SectionOrderItemDto[];
}
