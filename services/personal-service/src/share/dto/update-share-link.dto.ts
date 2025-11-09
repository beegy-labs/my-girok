import { IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ShareDuration } from './create-share-link.dto';

export class UpdateShareLinkDto {
  @ApiPropertyOptional({ enum: ShareDuration })
  @IsOptional()
  @IsEnum(ShareDuration)
  duration?: ShareDuration;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
