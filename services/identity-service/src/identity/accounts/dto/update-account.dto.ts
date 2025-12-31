import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Account status enum
 */
export enum AccountStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED',
  DELETED = 'DELETED',
}

/**
 * DTO for updating an existing account
 */
export class UpdateAccountDto {
  @ApiPropertyOptional({
    description: 'Email address',
    example: 'newemail@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Account status',
    enum: AccountStatus,
  })
  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;

  @ApiPropertyOptional({
    description: 'Whether MFA is enabled',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  mfaEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'User region',
    example: 'eu-west-1',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  region?: string;

  @ApiPropertyOptional({
    description: 'User locale',
    example: 'de-DE',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @ApiPropertyOptional({
    description: 'User timezone',
    example: 'Europe/Berlin',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Country code (ISO 3166-1 alpha-2)',
    example: 'DE',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  @MinLength(2)
  countryCode?: string;
}

/**
 * DTO for changing account password
 */
export class ChangePasswordDto {
  @ApiPropertyOptional({
    description: 'Current password (required when user has a password)',
  })
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiPropertyOptional({
    description: 'New password (minimum 8 characters)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  newPassword!: string;
}

/**
 * DTO for enabling MFA
 */
export class EnableMfaDto {
  @ApiPropertyOptional({
    description: 'MFA method (TOTP, SMS)',
    example: 'TOTP',
  })
  @IsOptional()
  @IsString()
  method?: string;
}

/**
 * DTO for verifying MFA setup
 */
export class VerifyMfaDto {
  @ApiPropertyOptional({
    description: 'MFA verification code',
    example: '123456',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code!: string;
}
