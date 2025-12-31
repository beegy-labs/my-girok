import {
  IsString,
  IsOptional,
  IsUUID,
  IsIP,
  IsNumber,
  Min,
  Max,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new session
 */
export class CreateSessionDto {
  @ApiProperty({
    description: 'Account ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  accountId!: string;

  @ApiPropertyOptional({
    description: 'Device ID (UUID) if session is linked to a device',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiProperty({
    description: 'Client IP address',
    example: '192.168.1.1',
  })
  @IsIP()
  ipAddress!: string;

  @ApiProperty({
    description: 'User agent string',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  userAgent!: string;

  @ApiPropertyOptional({
    description: 'Session expiration time in milliseconds (default: 24 hours)',
    example: 86400000,
  })
  @IsOptional()
  @IsNumber()
  @Min(60000) // Minimum 1 minute
  @Max(2592000000) // Maximum 30 days
  expiresInMs?: number;
}

/**
 * DTO for refreshing a session
 */
export class RefreshSessionDto {
  @ApiProperty({
    description: 'Refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  refreshToken!: string;
}

/**
 * DTO for revoking a session
 */
export class RevokeSessionDto {
  @ApiPropertyOptional({
    description: 'Reason for revoking the session',
    example: 'User logged out',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

/**
 * DTO for session query parameters
 */
export class SessionQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by account ID',
  })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiPropertyOptional({
    description: 'Filter by device ID',
  })
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    type: Boolean,
    nullable: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Page number (default: 1)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page (default: 20, max: 100)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
