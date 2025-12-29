import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsArray,
  IsDateString,
  MaxLength,
  IsInt,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';

// Enums matching Prisma schema
export enum SanctionSubjectType {
  USER = 'USER',
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
}

export enum SanctionType {
  WARNING = 'WARNING',
  TEMPORARY_BAN = 'TEMPORARY_BAN',
  PERMANENT_BAN = 'PERMANENT_BAN',
  FEATURE_RESTRICTION = 'FEATURE_RESTRICTION',
}

export enum SanctionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

export enum SanctionScope {
  PLATFORM = 'PLATFORM',
  SERVICE = 'SERVICE',
}

export enum SanctionSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AppealStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ESCALATED = 'ESCALATED',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  SMS = 'SMS',
  IN_APP = 'IN_APP',
}

// Create DTO
export class CreateSanctionDto {
  @IsUUID()
  subjectId!: string;

  @IsEnum(SanctionSubjectType)
  subjectType!: SanctionSubjectType;

  @IsEnum(SanctionScope)
  @IsOptional()
  scope?: SanctionScope;

  @IsEnum(SanctionType)
  type!: SanctionType;

  @IsEnum(SanctionSeverity)
  @IsOptional()
  severity?: SanctionSeverity;

  @IsArray()
  @IsString({ each: true })
  @ValidateIf((o) => o.type === 'FEATURE_RESTRICTION')
  restrictedFeatures?: string[];

  @IsString()
  @MaxLength(2000)
  reason!: string;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  internalNote?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  evidenceUrls?: string[];

  @IsDateString()
  startAt!: string;

  @IsDateString()
  @IsOptional()
  endAt?: string;

  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  @IsOptional()
  notificationChannels?: NotificationChannel[];
}

// Update DTO
export class UpdateSanctionDto {
  @IsEnum(SanctionSeverity)
  @IsOptional()
  severity?: SanctionSeverity;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  restrictedFeatures?: string[];

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  reason?: string;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  internalNote?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  evidenceUrls?: string[];

  @IsDateString()
  @IsOptional()
  endAt?: string;

  @IsString()
  @MaxLength(500)
  updateReason!: string;
}

// Action DTOs
export class RevokeSanctionDto {
  @IsString()
  @MaxLength(2000)
  reason!: string;
}

export class ExtendSanctionDto {
  @IsDateString()
  newEndAt!: string;

  @IsString()
  @MaxLength(2000)
  reason!: string;
}

export class ReduceSanctionDto {
  @IsDateString()
  newEndAt!: string;

  @IsString()
  @MaxLength(2000)
  reason!: string;
}

// Appeal DTOs
export class ReviewAppealDto {
  @IsEnum(['APPROVED', 'REJECTED', 'ESCALATED'] as const)
  status!: 'APPROVED' | 'REJECTED' | 'ESCALATED';

  @IsString()
  @MaxLength(2000)
  response!: string;
}

// Notification DTOs
export class ResendNotificationsDto {
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels!: NotificationChannel[];
}

// Query DTOs
export class ListSanctionsQueryDto {
  @IsEnum(SanctionStatus)
  @IsOptional()
  status?: SanctionStatus;

  @IsEnum(SanctionType)
  @IsOptional()
  type?: SanctionType;

  @IsEnum(SanctionSeverity)
  @IsOptional()
  severity?: SanctionSeverity;

  @IsEnum(SanctionSubjectType)
  @IsOptional()
  subjectType?: SanctionSubjectType;

  @IsEnum(AppealStatus)
  @IsOptional()
  appealStatus?: AppealStatus;

  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  sort?: string;
}

// Response DTOs
export interface SanctionSubjectResponseDto {
  id: string;
  email: string;
  name: string | null;
}

export interface SanctionIssuerResponseDto {
  id: string;
  email: string;
  name: string;
}

export interface SanctionNotificationResponseDto {
  id: string;
  sanctionId: string;
  channel: NotificationChannel;
  status: string;
  sentAt: Date | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface SanctionResponseDto {
  id: string;
  subjectId: string;
  subjectType: SanctionSubjectType;
  subject?: SanctionSubjectResponseDto;
  serviceId: string | null;
  scope: SanctionScope;
  type: SanctionType;
  status: SanctionStatus;
  severity: SanctionSeverity;
  restrictedFeatures: string[];
  reason: string;
  internalNote: string | null;
  evidenceUrls: string[];
  issuedBy: string;
  issuer?: SanctionIssuerResponseDto;
  issuedByType: string;
  startAt: Date;
  endAt: Date | null;
  revokedAt: Date | null;
  revokedBy: string | null;
  revokeReason: string | null;
  appealStatus: AppealStatus | null;
  appealedAt: Date | null;
  appealReason: string | null;
  appealReviewedBy: string | null;
  appealReviewedAt: Date | null;
  appealResponse: string | null;
  createdAt: Date;
  updatedAt: Date;
  notifications?: SanctionNotificationResponseDto[];
}

export interface SanctionListResponseDto {
  data: SanctionResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    serviceId: string;
  };
}

export interface AppealResponseDto {
  id: string;
  sanctionId: string;
  appealStatus: AppealStatus | null;
  appealedAt: Date | null;
  appealReason: string | null;
  appealReviewedBy: string | null;
  appealReviewedAt: Date | null;
  appealResponse: string | null;
}
