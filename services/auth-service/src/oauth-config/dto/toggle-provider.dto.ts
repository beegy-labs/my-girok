import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ToggleProviderDto {
  @ApiProperty({
    description: 'Enable or disable the OAuth provider',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  enabled!: boolean;
}
