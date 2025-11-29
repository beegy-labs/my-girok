import { IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SectionType } from './update-section-order.dto';

export class ToggleSectionVisibilityDto {
  @ApiProperty({ enum: SectionType })
  @IsEnum(SectionType)
  type!: SectionType;

  @ApiProperty({ example: true })
  @IsBoolean()
  visible!: boolean;
}
