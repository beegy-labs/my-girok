import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountStatus } from '.prisma/identity-client';

// Re-export Prisma enum for external use
export { AccountStatus };

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

/**
 * DTO for disabling MFA
 * Requires current password for security verification
 */
export class DisableMfaDto {
  @ApiProperty({
    description: 'Current password for verification',
    type: String,
    minLength: 1,
    maxLength: 72,
  })
  @IsString()
  @MinLength(1, { message: 'Current password is required' })
  @MaxLength(72)
  currentPassword!: string;
}
