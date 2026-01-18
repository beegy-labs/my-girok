import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsObject, MaxLength, IsPhoneNumber } from 'class-validator';

/**
 * Employee Profile Update DTO
 *
 * Employees can only update LIMITED fields:
 * - Display name, nickname, preferred language, locale, timezone
 * - Phone numbers and emergency contact
 *
 * Employees CANNOT update:
 * - Email, username (identity fields)
 * - Employee number, job title, organization (HR fields)
 * - Employment status, hire date (JML fields)
 */
export class UpdateEmployeeProfileDto {
  // SCIM Core - Limited fields
  @ApiPropertyOptional({ description: 'Display name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({ description: 'Nickname' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;

  @ApiPropertyOptional({ description: 'Preferred language (ISO 639-1)', example: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  preferredLanguage?: string;

  @ApiPropertyOptional({ description: 'Locale (BCP 47)', example: 'en-US' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  locale?: string;

  @ApiPropertyOptional({ description: 'Timezone (IANA)', example: 'Asia/Seoul' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({ description: 'Profile URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  profileUrl?: string;

  @ApiPropertyOptional({ description: 'Profile photo URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  profilePhotoUrl?: string;

  // Contact Info
  @ApiPropertyOptional({ description: 'Personal phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Phone country code', example: '+82' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  phoneCountryCode?: string;

  @ApiPropertyOptional({ description: 'Mobile number' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  mobileNumber?: string;

  @ApiPropertyOptional({ description: 'Mobile country code', example: '+82' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  mobileCountryCode?: string;

  @ApiPropertyOptional({
    description: 'Emergency contact (JSON)',
    example: { name: 'John Doe', phone: '+82-10-1234-5678', relation: 'spouse' },
  })
  @IsOptional()
  @IsObject()
  emergencyContact?: Record<string, any>;
}
