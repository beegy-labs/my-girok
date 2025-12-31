import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Auth provider enum for account creation
 */
export enum AuthProvider {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
  KAKAO = 'KAKAO',
  NAVER = 'NAVER',
  APPLE = 'APPLE',
  MICROSOFT = 'MICROSOFT',
  GITHUB = 'GITHUB',
}

/**
 * Account mode enum
 */
export enum AccountMode {
  SERVICE = 'SERVICE',
  UNIFIED = 'UNIFIED',
}

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
    description: 'Password (minimum 8 characters, required for LOCAL provider)',
    example: 'SecureP@ss123',
    minLength: 8,
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
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
  })
  @IsOptional()
  @IsString()
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
    description: 'User locale',
    example: 'en-US',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @ApiPropertyOptional({
    description: 'User timezone',
    example: 'America/New_York',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Country code (ISO 3166-1 alpha-2)',
    example: 'US',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  @MinLength(2)
  countryCode?: string;
}
