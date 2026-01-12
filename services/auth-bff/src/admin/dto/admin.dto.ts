import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  IsIn,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AdminInfoDto } from './admin-info.dto';

export { AdminInfoDto };

export class AdminLoginDto {
  @ApiProperty({ description: 'Admin email address' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ description: 'Admin password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;
}

export class AdminLoginMfaDto {
  @ApiProperty({ description: 'MFA challenge ID from login response' })
  @IsString()
  @IsNotEmpty()
  challengeId!: string;

  @ApiProperty({ description: 'MFA code (TOTP or backup code)' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ description: 'MFA method used', enum: ['totp', 'backup_code'] })
  @IsString()
  @IsIn(['totp', 'backup_code'])
  method!: 'totp' | 'backup_code';
}

export class AdminSetupMfaDto {
  @ApiProperty({ description: 'TOTP code to verify setup' })
  @IsString()
  @IsNotEmpty()
  code!: string;
}

export class AdminDisableMfaDto {
  @ApiProperty({ description: 'Current password for verification' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class AdminChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({ description: 'New password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(12)
  newPassword!: string;
}

export class AdminRevokeSessionDto {
  @ApiProperty({ description: 'Session ID to revoke' })
  @IsString()
  @IsNotEmpty()
  sessionId!: string;
}

// Response DTOs
export class AdminLoginResponseDto {
  @ApiProperty({ description: 'Whether login was successful' })
  success!: boolean;

  @ApiPropertyOptional({ description: 'Whether MFA is required' })
  mfaRequired?: boolean;

  @ApiPropertyOptional({ description: 'Challenge ID for MFA step' })
  challengeId?: string;

  @ApiPropertyOptional({ description: 'Available MFA methods' })
  availableMethods?: string[];

  @ApiPropertyOptional({ description: 'Admin info if login complete', type: () => AdminInfoDto })
  admin?: AdminInfoDto;

  @ApiProperty({ description: 'Response message' })
  message!: string;
}

export class AdminMeResponseDto {
  @ApiProperty({ description: 'Admin information', type: () => AdminInfoDto })
  admin!: AdminInfoDto;
}

export class AdminSessionListDto {
  @ApiProperty({ description: 'Session ID' })
  id!: string;

  @ApiProperty({ description: 'Device fingerprint' })
  deviceFingerprint!: string;

  @ApiProperty({ description: 'IP address' })
  ipAddress!: string;

  @ApiProperty({ description: 'User agent' })
  userAgent!: string;

  @ApiProperty({ description: 'Whether MFA is verified' })
  mfaVerified!: boolean;

  @ApiProperty({ description: 'Session creation time' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last activity time' })
  lastActivityAt!: Date;

  @ApiProperty({ description: 'Whether this is the current session' })
  isCurrent!: boolean;
}

export class AdminMfaSetupResponseDto {
  @ApiProperty({ description: 'Base32 encoded secret' })
  secret!: string;

  @ApiProperty({ description: 'QR code URI for authenticator apps' })
  qrCodeUri!: string;

  @ApiProperty({ description: 'Backup codes (one-time view)' })
  backupCodes!: string[];
}

export class AdminBackupCodesResponseDto {
  @ApiProperty({ description: 'Remaining backup codes count' })
  remainingCount!: number;
}

// Login History DTOs
export class LoginHistoryQueryDto {
  @ApiPropertyOptional({ description: 'Filter by account ID (UUID)' })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional({
    description: 'Filter by account type',
    enum: ['USER', 'OPERATOR', 'ADMIN'],
  })
  @IsOptional()
  @IsIn(['USER', 'OPERATOR', 'ADMIN'])
  accountType?: 'USER' | 'OPERATOR' | 'ADMIN';

  @ApiPropertyOptional({
    description: 'Filter by event type',
    enum: [
      'LOGIN_SUCCESS',
      'LOGIN_FAILED',
      'LOGIN_BLOCKED',
      'LOGOUT',
      'MFA_VERIFIED',
      'MFA_FAILED',
    ],
  })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional({
    description: 'Filter by result',
    enum: ['SUCCESS', 'FAILURE', 'BLOCKED'],
  })
  @IsOptional()
  @IsIn(['SUCCESS', 'FAILURE', 'BLOCKED'])
  result?: 'SUCCESS' | 'FAILURE' | 'BLOCKED';

  @ApiPropertyOptional({ description: 'Filter by IP address' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class LoginHistoryEventDto {
  @ApiProperty({ description: 'Event ID' })
  id!: string;

  @ApiProperty({ description: 'Event type' })
  eventType!: string;

  @ApiProperty({ description: 'Account type' })
  accountType!: string;

  @ApiProperty({ description: 'Account ID' })
  accountId!: string;

  @ApiPropertyOptional({ description: 'Session ID' })
  sessionId?: string;

  @ApiProperty({ description: 'IP address' })
  ipAddress!: string;

  @ApiProperty({ description: 'User agent' })
  userAgent!: string;

  @ApiPropertyOptional({ description: 'Device fingerprint' })
  deviceFingerprint?: string;

  @ApiPropertyOptional({ description: 'Country code (ISO 3166-1 alpha-2)' })
  countryCode?: string;

  @ApiProperty({ description: 'Result' })
  result!: string;

  @ApiPropertyOptional({ description: 'Failure reason' })
  failureReason?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, string>;

  @ApiProperty({ description: 'Event timestamp' })
  timestamp!: string;
}

export class LoginHistoryResponseDto {
  @ApiProperty({ description: 'Login history events', type: [LoginHistoryEventDto] })
  data!: LoginHistoryEventDto[];

  @ApiProperty({ description: 'Total count' })
  total!: number;

  @ApiProperty({ description: 'Current page' })
  page!: number;

  @ApiProperty({ description: 'Items per page' })
  limit!: number;

  @ApiProperty({ description: 'Total pages' })
  totalPages!: number;
}
