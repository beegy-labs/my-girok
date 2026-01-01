import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  MaxLength,
  MinLength,
  Matches,
  IsISO31661Alpha2,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountStatus } from '.prisma/identity-client';
import { Transform } from 'class-transformer';

// Re-export Prisma enum for external use
export { AccountStatus };

/**
 * MFA Method enum for validation
 * RFC 6238 (TOTP), RFC 4226 (HOTP), or SMS/Email fallback
 */
export enum MfaMethod {
  /** Time-based One-Time Password (RFC 6238) */
  TOTP = 'TOTP',
  /** SMS-based verification */
  SMS = 'SMS',
  /** Email-based verification */
  EMAIL = 'EMAIL',
  /** Hardware security key (WebAuthn/FIDO2) */
  WEBAUTHN = 'WEBAUTHN',
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
    description: 'User locale (BCP 47 language tag)',
    example: 'de-DE',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(/^[a-z]{2}(-[A-Z]{2})?$/, {
    message: 'Locale must be a valid BCP 47 language tag (e.g., en, en-US, de-DE)',
  })
  locale?: string;

  @ApiPropertyOptional({
    description: 'User timezone (IANA timezone name)',
    example: 'Europe/Berlin',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?$|^UTC$|^GMT$/, {
    message:
      'Timezone must be a valid IANA timezone name (e.g., Europe/Berlin, America/New_York, UTC)',
  })
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Country code (ISO 3166-1 alpha-2)',
    example: 'DE',
  })
  @IsOptional()
  @IsISO31661Alpha2({
    message: 'Country code must be a valid ISO 3166-1 alpha-2 code (e.g., US, DE, KR)',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  countryCode?: string;
}

/**
 * DTO for changing account password
 */
export class ChangePasswordDto {
  @ApiPropertyOptional({
    description: 'Current password (required when user has a password)',
    maxLength: 72,
    type: String,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(72, { message: 'Current password must not exceed 72 characters' })
  currentPassword?: string;

  @ApiProperty({
    description:
      'New password (8-72 characters, must contain uppercase, lowercase, number, and special character)',
    minLength: 8,
    maxLength: 72,
    type: String,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(72, { message: 'Password must not exceed 72 characters (bcrypt limit)' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  newPassword!: string;
}

/**
 * DTO for enabling MFA
 */
export class EnableMfaDto {
  @ApiPropertyOptional({
    description: 'MFA method (TOTP recommended, SMS/EMAIL for fallback)',
    enum: MfaMethod,
    default: MfaMethod.TOTP,
    example: MfaMethod.TOTP,
  })
  @IsOptional()
  @IsEnum(MfaMethod, {
    message: `MFA method must be one of: ${Object.values(MfaMethod).join(', ')}`,
  })
  method?: MfaMethod;
}

/**
 * DTO for verifying MFA setup
 */
export class VerifyMfaDto {
  @ApiProperty({
    description: 'MFA verification code (6 digits)',
    example: '123456',
    type: String,
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  @Matches(/^\d{6}$/, { message: 'MFA code must be exactly 6 digits' })
  code!: string;
}
