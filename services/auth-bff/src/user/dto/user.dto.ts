import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  IsOptional,
  Matches,
  IsIn,
} from 'class-validator';

export class UserRegisterDto {
  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ description: 'Username' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, underscores, and hyphens',
  })
  username!: string;

  @ApiProperty({ description: 'User password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message: 'Password must include uppercase, lowercase, number, and special character',
  })
  password!: string;

  @ApiPropertyOptional({ description: 'Country code (ISO 3166-1 alpha-2)' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ description: 'Locale (e.g., en-US, ko-KR)' })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional({ description: 'Timezone (e.g., America/New_York)' })
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class UserLoginDto {
  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ description: 'User password' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class UserLoginMfaDto {
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

export class UserSetupMfaDto {
  @ApiProperty({ description: 'TOTP code to verify setup' })
  @IsString()
  @IsNotEmpty()
  code!: string;
}

export class UserDisableMfaDto {
  @ApiProperty({ description: 'Current password for verification' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class UserChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({ description: 'New password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message: 'Password must include uppercase, lowercase, number, and special character',
  })
  newPassword!: string;
}

// Response DTOs
export class UserLoginResponseDto {
  @ApiProperty({ description: 'Whether login was successful' })
  success!: boolean;

  @ApiPropertyOptional({ description: 'Whether MFA is required' })
  mfaRequired?: boolean;

  @ApiPropertyOptional({ description: 'Challenge ID for MFA step' })
  challengeId?: string;

  @ApiPropertyOptional({ description: 'Available MFA methods' })
  availableMethods?: string[];

  @ApiPropertyOptional({ description: 'User info if login complete' })
  user?: UserInfoDto;

  @ApiProperty({ description: 'Response message' })
  message!: string;
}

export class UserInfoDto {
  @ApiProperty({ description: 'User ID' })
  id!: string;

  @ApiProperty({ description: 'User email' })
  email!: string;

  @ApiProperty({ description: 'Username' })
  username!: string;

  @ApiProperty({ description: 'Whether email is verified' })
  emailVerified!: boolean;

  @ApiProperty({ description: 'Whether MFA is enabled' })
  mfaEnabled!: boolean;
}

export class UserMeResponseDto {
  @ApiProperty({ description: 'User information' })
  user!: UserInfoDto;
}

export class UserMfaSetupResponseDto {
  @ApiProperty({ description: 'Base32 encoded secret' })
  secret!: string;

  @ApiProperty({ description: 'QR code URI for authenticator apps' })
  qrCodeUri!: string;

  @ApiProperty({ description: 'Backup codes (one-time view)' })
  backupCodes!: string[];
}
