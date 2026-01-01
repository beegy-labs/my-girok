import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  IsEnum,
  IsISO31661Alpha2,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthProvider, AccountMode } from '.prisma/identity-client';
import { Transform } from 'class-transformer';

// Re-export Prisma enums for external use
export { AuthProvider, AccountMode };

/**
 * DTO for creating a new account
 */
export class CreateAccountDto {
  @ApiProperty({
    description: 'Email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email!: string;

  @ApiProperty({
    description: 'Username (alphanumeric with underscores, 3-30 characters)',
    example: 'john_doe',
    minLength: 3,
    maxLength: 30,
  })
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(30, { message: 'Username must not exceed 30 characters' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers, and underscores',
  })
  username!: string;

  @ApiPropertyOptional({
    description:
      'Password (8-72 characters, must contain uppercase, lowercase, number, and special character)',
    example: 'SecureP@ss123!',
    minLength: 8,
    maxLength: 72,
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(72, { message: 'Password must not exceed 72 characters (bcrypt limit)' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password?: string;

  @ApiPropertyOptional({
    description: 'Authentication provider',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  @IsOptional()
  @IsEnum(AuthProvider)
  provider?: AuthProvider;

  @ApiPropertyOptional({
    description: 'Provider-specific user ID (required for OAuth providers)',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Provider ID must not exceed 255 characters' })
  @Matches(/^[a-zA-Z0-9_\-.:]+$/, {
    message:
      'Provider ID can only contain alphanumeric characters, underscores, hyphens, periods, and colons',
  })
  providerId?: string;

  @ApiPropertyOptional({
    description: 'Account mode',
    enum: AccountMode,
    default: AccountMode.SERVICE,
  })
  @IsOptional()
  @IsEnum(AccountMode)
  mode?: AccountMode;

  @ApiPropertyOptional({
    description: 'User region',
    example: 'us-east-1',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  region?: string;

  @ApiPropertyOptional({
    description: 'User locale (BCP 47 language tag)',
    example: 'en-US',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(/^[a-z]{2}(-[A-Z]{2})?$/, {
    message: 'Locale must be a valid BCP 47 language tag (e.g., en, en-US, ko-KR)',
  })
  locale?: string;

  @ApiPropertyOptional({
    description: 'User timezone (IANA timezone name)',
    example: 'America/New_York',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?$|^UTC$|^GMT$/, {
    message: 'Timezone must be a valid IANA timezone name (e.g., America/New_York, UTC)',
  })
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Country code (ISO 3166-1 alpha-2)',
    example: 'US',
  })
  @IsOptional()
  @IsISO31661Alpha2({
    message: 'Country code must be a valid ISO 3166-1 alpha-2 code (e.g., US, KR, JP)',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  countryCode?: string;
}
