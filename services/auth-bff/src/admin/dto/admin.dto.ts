import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, MinLength, IsIn } from 'class-validator';

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

  @ApiPropertyOptional({ description: 'Admin info if login complete' })
  admin?: AdminInfoDto;

  @ApiProperty({ description: 'Response message' })
  message!: string;
}

export class AdminInfoDto {
  @ApiProperty({ description: 'Admin ID' })
  id!: string;

  @ApiProperty({ description: 'Admin email' })
  email!: string;

  @ApiProperty({ description: 'Admin display name' })
  name!: string;

  @ApiProperty({ description: 'Admin scope', enum: ['SYSTEM', 'TENANT'] })
  scope!: string;

  @ApiProperty({ description: 'Whether MFA is enabled' })
  mfaEnabled!: boolean;

  @ApiPropertyOptional({ description: 'Role name' })
  roleName?: string;

  @ApiPropertyOptional({ description: 'Permissions' })
  permissions?: string[];
}

export class AdminMeResponseDto {
  @ApiProperty({ description: 'Admin information' })
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
