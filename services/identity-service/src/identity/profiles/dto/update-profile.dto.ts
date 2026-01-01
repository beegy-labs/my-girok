import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  MaxLength,
  MinLength,
  IsUrl,
  Matches,
  IsISO31661Alpha2,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '.prisma/identity-client';
import { Transform } from 'class-transformer';

/**
 * Profile visibility enum
 */
export enum ProfileVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  FRIENDS_ONLY = 'FRIENDS_ONLY',
}

/**
 * DTO for updating a user profile
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'Display name shown to other users',
    example: 'John Doe',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({
    description: 'First name',
    example: 'John',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Last name',
    example: 'Doe',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Profile avatar URL (HTTPS only)',
    example: 'https://cdn.example.com/avatars/user123.jpg',
    maxLength: 500,
  })
  @IsOptional()
  @IsUrl(
    {
      protocols: ['https'],
      require_protocol: true,
      require_valid_protocol: true,
    },
    { message: 'Avatar must be a valid HTTPS URL' },
  )
  @MaxLength(500, { message: 'Avatar URL must not exceed 500 characters' })
  avatar?: string;

  @ApiPropertyOptional({
    description: 'Short biography',
    example: 'Software developer passionate about clean code',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({
    description: 'Date of birth (ISO 8601)',
    example: '1990-01-15',
  })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({
    description: 'Gender',
    enum: Gender,
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({
    description: 'Phone country code (E.164 format with +)',
    example: '+82',
    maxLength: 5,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{0,3}$/, {
    message: 'Phone country code must be in E.164 format (e.g., +1, +82, +852)',
  })
  phoneCountryCode?: string;

  @ApiPropertyOptional({
    description: 'Phone number (digits only, without country code)',
    example: '1012345678',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MinLength(4, { message: 'Phone number must be at least 4 digits' })
  @MaxLength(20, { message: 'Phone number must not exceed 20 digits' })
  @Matches(/^\d+$/, { message: 'Phone number must contain only digits' })
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Country code (ISO 3166-1 alpha-2)',
    example: 'KR',
  })
  @IsOptional()
  @IsISO31661Alpha2({
    message: 'Country code must be a valid ISO 3166-1 alpha-2 code (e.g., US, KR, JP)',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  countryCode?: string;

  @ApiPropertyOptional({
    description: 'Region/State',
    example: 'Seoul',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @ApiPropertyOptional({
    description: 'City',
    example: 'Gangnam-gu',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    description: 'Street address',
    example: '123 Main Street',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiPropertyOptional({
    description: 'Postal code',
    example: '06123',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({
    description: 'Profile visibility',
    enum: ProfileVisibility,
    example: ProfileVisibility.PUBLIC,
  })
  @IsOptional()
  @IsEnum(ProfileVisibility)
  visibility?: ProfileVisibility;
}
