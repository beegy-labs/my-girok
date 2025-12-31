import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ConsentType,
  ConsentScope,
  ConsentLogAction,
  Consent,
  ConsentLog,
} from '.prisma/identity-legal-client';

/**
 * Consent entity representing a user's consent record
 */
export class ConsentEntity {
  @ApiProperty({
    description: 'Consent ID',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  id!: string;

  @ApiProperty({
    description: 'Account ID',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  accountId!: string;

  @ApiProperty({
    description: 'Consent type',
    enum: ConsentType,
  })
  consentType!: ConsentType;

  @ApiProperty({
    description: 'Consent scope',
    enum: ConsentScope,
  })
  scope!: ConsentScope;

  @ApiPropertyOptional({
    description: 'Service ID (if scope is SERVICE)',
  })
  serviceId?: string | null;

  @ApiProperty({
    description: 'Country code',
    example: 'KR',
  })
  countryCode!: string;

  @ApiPropertyOptional({
    description: 'Associated document ID',
  })
  documentId?: string | null;

  @ApiPropertyOptional({
    description: 'Document version at time of consent',
  })
  documentVersion?: string | null;

  @ApiProperty({
    description: 'Whether the user agreed',
    default: true,
  })
  agreed!: boolean;

  @ApiProperty({
    description: 'Timestamp when consent was granted',
  })
  agreedAt!: Date;

  @ApiPropertyOptional({
    description: 'Timestamp when consent was withdrawn (null if active)',
  })
  withdrawnAt?: Date | null;

  @ApiPropertyOptional({
    description: 'IP address at time of consent',
  })
  ipAddress?: string | null;

  @ApiPropertyOptional({
    description: 'User agent at time of consent',
  })
  userAgent?: string | null;

  @ApiProperty({
    description: 'Timestamp when record was created',
  })
  createdAt!: Date;

  /**
   * Map Prisma Consent to ConsentEntity
   */
  static fromPrisma(consent: Consent): ConsentEntity {
    const entity = new ConsentEntity();
    entity.id = consent.id;
    entity.accountId = consent.accountId;
    entity.consentType = consent.consentType;
    entity.scope = consent.scope;
    entity.serviceId = consent.serviceId;
    entity.countryCode = consent.countryCode ?? '';
    entity.documentId = consent.documentId;
    entity.documentVersion = consent.documentVersion;
    entity.agreed = consent.agreed;
    entity.agreedAt = consent.agreedAt ?? new Date();
    entity.withdrawnAt = consent.withdrawnAt;
    entity.ipAddress = consent.ipAddress;
    entity.userAgent = consent.userAgent;
    entity.createdAt = consent.createdAt;
    return entity;
  }
}

/**
 * Consent summary for listing
 */
export class ConsentSummaryEntity {
  @ApiProperty({
    description: 'Consent ID',
  })
  id!: string;

  @ApiProperty({
    description: 'Account ID',
  })
  accountId!: string;

  @ApiProperty({
    description: 'Consent type',
    enum: ConsentType,
  })
  consentType!: ConsentType;

  @ApiProperty({
    description: 'Whether the user agreed',
  })
  agreed!: boolean;

  @ApiProperty({
    description: 'Timestamp when consent was granted',
  })
  agreedAt!: Date;

  @ApiPropertyOptional({
    description: 'Timestamp when consent was withdrawn',
  })
  withdrawnAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Document version',
  })
  documentVersion?: string | null;
}

/**
 * Consent log entry for audit trail
 */
export class ConsentLogEntity {
  @ApiProperty({
    description: 'Log entry ID',
  })
  id!: string;

  @ApiProperty({
    description: 'Consent ID',
  })
  consentId!: string;

  @ApiProperty({
    description: 'Account ID',
  })
  accountId!: string;

  @ApiProperty({
    description: 'Action performed',
    enum: ConsentLogAction,
  })
  action!: ConsentLogAction;

  @ApiPropertyOptional({
    description: 'Previous state before action',
  })
  previousState?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    description: 'New state after action',
  })
  newState?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    description: 'IP address',
  })
  ipAddress?: string | null;

  @ApiPropertyOptional({
    description: 'User agent',
  })
  userAgent?: string | null;

  @ApiPropertyOptional({
    description: 'Additional metadata',
  })
  metadata?: Record<string, unknown> | null;

  @ApiProperty({
    description: 'Timestamp of action',
  })
  createdAt!: Date;

  /**
   * Map Prisma ConsentLog to ConsentLogEntity
   */
  static fromPrisma(log: ConsentLog): ConsentLogEntity {
    const entity = new ConsentLogEntity();
    entity.id = log.id;
    entity.consentId = log.consentId;
    entity.accountId = log.accountId;
    entity.action = log.action;
    entity.previousState = log.previousState as Record<string, unknown> | null;
    entity.newState = log.newState as Record<string, unknown> | null;
    entity.ipAddress = log.ipAddress;
    entity.userAgent = log.userAgent;
    entity.metadata = log.metadata as Record<string, unknown> | null;
    entity.createdAt = log.createdAt;
    return entity;
  }
}

/**
 * Paginated consent list response
 */
export class ConsentListResponse {
  @ApiProperty({
    description: 'List of consents',
    type: [ConsentSummaryEntity],
  })
  data!: ConsentSummaryEntity[];

  @ApiProperty({
    description: 'Pagination metadata',
  })
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Consent audit log list response
 */
export class ConsentLogListResponse {
  @ApiProperty({
    description: 'List of consent logs',
    type: [ConsentLogEntity],
  })
  data!: ConsentLogEntity[];

  @ApiProperty({
    description: 'Pagination metadata',
  })
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
