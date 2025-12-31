import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsArray,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Sanction subject type enumeration
 */
export enum SanctionSubjectType {
  ACCOUNT = 'ACCOUNT',
  OPERATOR = 'OPERATOR',
}

/**
 * Sanction type enumeration
 */
export enum SanctionType {
  WARNING = 'WARNING',
  TEMPORARY_BAN = 'TEMPORARY_BAN',
  PERMANENT_BAN = 'PERMANENT_BAN',
  FEATURE_RESTRICTION = 'FEATURE_RESTRICTION',
}

/**
 * Sanction severity enumeration
 */
export enum SanctionSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Sanction scope enumeration
 */
export enum SanctionScope {
  PLATFORM = 'PLATFORM',
  SERVICE = 'SERVICE',
}

/**
 * Issuer type enumeration
 */
export enum IssuerType {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  SYSTEM = 'SYSTEM',
}

/**
 * Notification channel enumeration
 */
export enum NotificationChannel {
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  SMS = 'SMS',
  IN_APP = 'IN_APP',
}

/**
 * DTO for creating a sanction
 */
export class CreateSanctionDto {
  @ApiProperty({
    description: 'Subject ID (account or operator ID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  subjectId!: string;

  @ApiProperty({
    description: 'Subject type',
    enum: SanctionSubjectType,
    example: SanctionSubjectType.ACCOUNT,
  })
  @IsEnum(SanctionSubjectType)
  subjectType!: SanctionSubjectType;

  @ApiPropertyOptional({
    description: 'Service ID for service-scoped sanctions',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  @IsOptional()
  serviceId?: string;

  @ApiPropertyOptional({
    description: 'Sanction scope',
    enum: SanctionScope,
    example: SanctionScope.SERVICE,
    default: SanctionScope.SERVICE,
  })
  @IsEnum(SanctionScope)
  @IsOptional()
  scope?: SanctionScope;

  @ApiProperty({
    description: 'Sanction type',
    enum: SanctionType,
    example: SanctionType.TEMPORARY_BAN,
  })
  @IsEnum(SanctionType)
  type!: SanctionType;

  @ApiPropertyOptional({
    description: 'Sanction severity',
    enum: SanctionSeverity,
    example: SanctionSeverity.MEDIUM,
    default: SanctionSeverity.MEDIUM,
  })
  @IsEnum(SanctionSeverity)
  @IsOptional()
  severity?: SanctionSeverity;

  @ApiPropertyOptional({
    description: 'Restricted features (for FEATURE_RESTRICTION type)',
    example: ['chat', 'posting'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  restrictedFeatures?: string[];

  @ApiProperty({
    description: 'Reason for the sanction',
    example: 'Violation of community guidelines',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiPropertyOptional({
    description: 'Internal note (not shown to user)',
    example: 'Multiple reports from other users',
  })
  @IsString()
  @IsOptional()
  internalNote?: string;

  @ApiPropertyOptional({
    description: 'URLs to evidence files',
    example: ['https://storage.example.com/evidence/123.png'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  evidenceUrls?: string[];

  @ApiPropertyOptional({
    description: 'Related sanction ID (for escalation chains)',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID()
  @IsOptional()
  relatedSanctionId?: string;

  @ApiPropertyOptional({
    description: 'Issuer type',
    enum: IssuerType,
    example: IssuerType.ADMIN,
    default: IssuerType.ADMIN,
  })
  @IsEnum(IssuerType)
  @IsOptional()
  issuedByType?: IssuerType;

  @ApiProperty({
    description: 'When the sanction starts',
    example: '2024-01-01T00:00:00Z',
  })
  @IsDateString()
  startAt!: string;

  @ApiPropertyOptional({
    description: 'When the sanction ends (null for permanent)',
    example: '2024-01-31T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  endAt?: string;

  @ApiPropertyOptional({
    description: 'Notification channels to use',
    example: ['EMAIL', 'IN_APP'],
  })
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  @IsOptional()
  notificationChannels?: NotificationChannel[];
}
