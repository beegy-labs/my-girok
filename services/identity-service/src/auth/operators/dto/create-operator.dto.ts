import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsEmail,
  IsArray,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Invitation type enumeration
 */
export enum InvitationType {
  EMAIL = 'EMAIL',
  DIRECT = 'DIRECT',
}

/**
 * DTO for creating an operator invitation
 */
export class CreateOperatorInvitationDto {
  @ApiProperty({
    description: 'Email address of the invitee',
    example: 'operator@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'Name of the invitee',
    example: 'John Doe',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: 'Service ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  @IsNotEmpty()
  serviceId!: string;

  @ApiProperty({
    description: 'Country code',
    example: 'KR',
    maxLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2)
  countryCode!: string;

  @ApiProperty({
    description: 'Role ID to assign',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID()
  @IsNotEmpty()
  roleId!: string;

  @ApiProperty({
    description: 'Invitation type',
    enum: InvitationType,
    example: InvitationType.EMAIL,
  })
  @IsEnum(InvitationType)
  type!: InvitationType;

  @ApiPropertyOptional({
    description: 'Additional permission IDs to grant directly',
    example: ['550e8400-e29b-41d4-a716-446655440003'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  permissionIds?: string[];

  @ApiPropertyOptional({
    description: 'Invitation expiration in days',
    example: 7,
  })
  @IsOptional()
  expiresInDays?: number;
}

/**
 * DTO for accepting an invitation
 */
export class AcceptInvitationDto {
  @ApiProperty({
    description: 'Invitation token',
    example: 'abc123...',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({
    description: 'Account ID of the user accepting',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  accountId!: string;
}

/**
 * DTO for creating an operator directly (without invitation)
 */
export class CreateOperatorDirectDto {
  @ApiProperty({
    description: 'Account ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  accountId!: string;

  @ApiProperty({
    description: 'Email address',
    example: 'operator@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'Name',
    example: 'John Doe',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: 'Service ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  @IsNotEmpty()
  serviceId!: string;

  @ApiProperty({
    description: 'Country code',
    example: 'KR',
    maxLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2)
  countryCode!: string;

  @ApiProperty({
    description: 'Role ID to assign',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID()
  @IsNotEmpty()
  roleId!: string;

  @ApiPropertyOptional({
    description: 'Additional permission IDs to grant directly',
    example: ['550e8400-e29b-41d4-a716-446655440003'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  permissionIds?: string[];
}
