import {
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  IsEnum,
  IsUUID,
  MinLength,
  MaxLength,
  Length,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ConsentType } from '.prisma/identity-legal-client';

/**
 * Consent item for registration
 */
export class RegistrationConsentDto {
  @ApiProperty({
    description: 'Type of consent',
    enum: ConsentType,
    example: 'TERMS_OF_SERVICE',
  })
  @IsEnum(ConsentType)
  consentType!: ConsentType;

  @ApiPropertyOptional({
    description: 'Legal document ID',
  })
  @IsOptional()
  @IsUUID()
  documentId?: string;

  @ApiPropertyOptional({
    description: 'Document version',
    example: '1.0.0',
  })
  @IsOptional()
  @IsString()
  documentVersion?: string;
}

/**
 * Registration request DTO
 */
export class RegisterUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'User password',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({
    description: 'Display name',
    example: 'John Doe',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName!: string;

  @ApiProperty({
    description: 'ISO 3166-1 alpha-2 country code',
    example: 'KR',
    minLength: 2,
    maxLength: 2,
  })
  @IsString()
  @Length(2, 2)
  countryCode!: string;

  @ApiProperty({
    description: 'Consents being granted',
    type: [RegistrationConsentDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegistrationConsentDto)
  consents!: RegistrationConsentDto[];

  @ApiPropertyOptional({
    description: 'User locale',
    example: 'ko-KR',
  })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional({
    description: 'User timezone',
    example: 'Asia/Seoul',
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}

/**
 * Registration response DTO
 */
export class RegistrationResponseDto {
  @ApiProperty({
    description: 'Whether registration was successful',
  })
  success!: boolean;

  @ApiProperty({
    description: 'Account ID',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  accountId!: string;

  @ApiProperty({
    description: 'User email',
  })
  email!: string;

  @ApiProperty({
    description: 'Display name',
  })
  displayName!: string;

  @ApiProperty({
    description: 'Whether email verification is required',
  })
  emailVerificationRequired!: boolean;

  @ApiProperty({
    description: 'Created timestamp',
  })
  createdAt!: Date;
}
