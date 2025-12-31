import { IsString, IsOptional, IsEnum, IsBoolean, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PushPlatform } from './register-device.dto';

/**
 * DTO for updating a device
 */
export class UpdateDeviceDto {
  @ApiPropertyOptional({
    description: 'Device name',
    example: 'My iPhone 15',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Platform',
    example: 'iOS',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  platform?: string;

  @ApiPropertyOptional({
    description: 'Operating system version',
    example: '17.2',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  osVersion?: string;

  @ApiPropertyOptional({
    description: 'Application version',
    example: '2.0.0',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  appVersion?: string;

  @ApiPropertyOptional({
    description: 'Browser name',
    example: 'Safari',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  browserName?: string;

  @ApiPropertyOptional({
    description: 'Browser version',
    example: '17.2',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  browserVersion?: string;

  @ApiPropertyOptional({
    description: 'Push notification token',
  })
  @IsOptional()
  @IsString()
  pushToken?: string;

  @ApiPropertyOptional({
    description: 'Push notification platform',
    enum: PushPlatform,
  })
  @IsOptional()
  @IsEnum(PushPlatform)
  pushPlatform?: PushPlatform;
}

/**
 * DTO for updating device trust status
 */
export class TrustDeviceDto {
  @ApiPropertyOptional({
    description: 'Whether to trust the device',
    example: true,
  })
  @IsBoolean()
  trust!: boolean;
}
