import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Account } from '.prisma/identity-client';

/**
 * Account entity representing a user account in the identity system
 */
export class AccountEntity {
  @ApiProperty({
    description: 'Unique identifier (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'External ID for public reference',
    example: 'ACC_abc123',
  })
  externalId!: string;

  @ApiProperty({
    description: 'Email address',
    example: 'user@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Username',
    example: 'johndoe',
  })
  username!: string;

  @ApiProperty({
    enum: ['LOCAL', 'GOOGLE', 'KAKAO', 'NAVER', 'APPLE', 'MICROSOFT', 'GITHUB'],
    description: 'Authentication provider',
    example: 'LOCAL',
  })
  provider!: string;

  @ApiPropertyOptional({
    description: 'Provider-specific user ID',
  })
  providerId?: string | null;

  @ApiProperty({
    enum: ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED', 'DELETED'],
    description: 'Account status',
    example: 'ACTIVE',
  })
  status!: string;

  @ApiProperty({
    enum: ['SERVICE', 'UNIFIED'],
    description: 'Account mode',
    example: 'SERVICE',
  })
  mode!: string;

  @ApiProperty({
    description: 'Whether email is verified',
    example: true,
  })
  emailVerified!: boolean;

  @ApiPropertyOptional({
    description: 'Email verification timestamp',
  })
  emailVerifiedAt?: Date | null;

  @ApiProperty({
    description: 'Whether phone is verified',
    example: false,
  })
  phoneVerified!: boolean;

  @ApiPropertyOptional({
    description: 'Phone verification timestamp',
  })
  phoneVerifiedAt?: Date | null;

  @ApiProperty({
    description: 'Whether MFA is enabled',
    example: false,
  })
  mfaEnabled!: boolean;

  @ApiPropertyOptional({
    description: 'Last password change timestamp',
  })
  lastPasswordChange?: Date | null;

  @ApiProperty({
    description: 'Number of failed login attempts',
    example: 0,
  })
  failedLoginAttempts!: number;

  @ApiPropertyOptional({
    description: 'Account locked until timestamp',
  })
  lockedUntil?: Date | null;

  @ApiPropertyOptional({
    description: 'User region',
    example: 'us-east-1',
  })
  region?: string | null;

  @ApiPropertyOptional({
    description: 'User locale',
    example: 'en-US',
  })
  locale?: string | null;

  @ApiPropertyOptional({
    description: 'User timezone',
    example: 'America/New_York',
  })
  timezone?: string | null;

  @ApiPropertyOptional({
    description: 'Country code (ISO 3166-1 alpha-2)',
    example: 'US',
  })
  countryCode?: string | null;

  @ApiProperty({
    description: 'Account creation timestamp',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp',
  })
  updatedAt!: Date;

  @ApiPropertyOptional({
    description: 'Soft delete timestamp',
  })
  deletedAt?: Date | null;

  /**
   * Create AccountEntity from Prisma Account model
   */
  static fromPrisma(account: Account): AccountEntity {
    const entity = new AccountEntity();
    entity.id = account.id;
    entity.externalId = account.externalId;
    entity.email = account.email;
    entity.username = account.username;
    entity.provider = account.provider;
    entity.providerId = account.providerId;
    entity.status = account.status;
    entity.mode = account.mode;
    entity.emailVerified = account.emailVerified;
    entity.emailVerifiedAt = account.emailVerifiedAt;
    entity.phoneVerified = account.phoneVerified;
    entity.phoneVerifiedAt = account.phoneVerifiedAt;
    entity.mfaEnabled = account.mfaEnabled;
    entity.lastPasswordChange = account.lastPasswordChange;
    entity.failedLoginAttempts = account.failedLoginAttempts;
    entity.lockedUntil = account.lockedUntil;
    entity.region = account.region;
    entity.locale = account.locale;
    entity.timezone = account.timezone;
    entity.countryCode = account.countryCode;
    entity.createdAt = account.createdAt;
    entity.updatedAt = account.updatedAt;
    entity.deletedAt = account.deletedAt;
    return entity;
  }

  /**
   * Check if account is active and not locked
   */
  isAccessible(): boolean {
    if (this.status !== 'ACTIVE') return false;
    if (this.lockedUntil && new Date() < this.lockedUntil) return false;
    return true;
  }

  /**
   * Check if account requires email verification
   */
  requiresEmailVerification(): boolean {
    return this.status === 'PENDING_VERIFICATION' && !this.emailVerified;
  }

  /**
   * Convert to safe response (exclude sensitive fields)
   */
  toSafeResponse(): Omit<
    AccountEntity,
    'toSafeResponse' | 'isAccessible' | 'requiresEmailVerification' | 'fromPrisma'
  > {
    return {
      id: this.id,
      externalId: this.externalId,
      email: this.email,
      username: this.username,
      provider: this.provider,
      providerId: this.providerId,
      status: this.status,
      mode: this.mode,
      emailVerified: this.emailVerified,
      emailVerifiedAt: this.emailVerifiedAt,
      phoneVerified: this.phoneVerified,
      phoneVerifiedAt: this.phoneVerifiedAt,
      mfaEnabled: this.mfaEnabled,
      lastPasswordChange: this.lastPasswordChange,
      failedLoginAttempts: this.failedLoginAttempts,
      lockedUntil: this.lockedUntil,
      region: this.region,
      locale: this.locale,
      timezone: this.timezone,
      countryCode: this.countryCode,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
    };
  }
}
