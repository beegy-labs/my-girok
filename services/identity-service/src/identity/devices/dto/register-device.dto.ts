import { IsString, IsOptional, IsUUID, IsEnum, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Device type enum
 */
export enum DeviceType {
  WEB = 'WEB',
  IOS = 'IOS',
  ANDROID = 'ANDROID',
  DESKTOP = 'DESKTOP',
  OTHER = 'OTHER',
}

/**
 * Push platform enum
 */
export enum PushPlatform {
  FCM = 'FCM',
  APNS = 'APNS',
  WEB_PUSH = 'WEB_PUSH',
}

/**
 * DTO for registering a new device
 */
export class RegisterDeviceDto {
  @ApiProperty({
    description: 'Account ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  accountId!: string;

  @ApiProperty({
    description: 'Device fingerprint (unique identifier for the device)',
    example: 'abc123def456',
    minLength: 8,
    maxLength: 64,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  fingerprint!: string;

  @ApiProperty({
    description: 'Device type',
    enum: DeviceType,
    example: DeviceType.WEB,
  })
  @IsEnum(DeviceType)
  deviceType!: DeviceType;

  @ApiPropertyOptional({
    description: 'Device name',
    example: 'Chrome on MacBook Pro',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Platform (e.g., macOS, Windows, iOS)',
    example: 'macOS',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  platform?: string;

  @ApiPropertyOptional({
    description: 'Operating system version',
    example: '14.2',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  osVersion?: string;

  @ApiPropertyOptional({
    description: 'Application version',
    example: '1.0.0',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  appVersion?: string;

  @ApiPropertyOptional({
    description: 'Browser name',
    example: 'Chrome',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  browserName?: string;

  @ApiPropertyOptional({
    description: 'Browser version',
    example: '120.0.0',
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

  @ApiPropertyOptional({
    description: 'Client IP address',
    example: '192.168.1.1',
    maxLength: 45,
  })
  @IsOptional()
  @IsString()
  @MaxLength(45)
  ipAddress?: string;
}

/**
 * DTO for device query parameters
 */
export class DeviceQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by account ID',
  })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiPropertyOptional({
    description: 'Filter by device type',
    enum: DeviceType,
  })
  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType;

  @ApiPropertyOptional({
    description: 'Filter by trusted status',
  })
  @IsOptional()
  isTrusted?: boolean;

  @ApiPropertyOptional({
    description: 'Page number (default: 1)',
  })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page (default: 20, max: 100)',
  })
  @IsOptional()
  limit?: number;
}
