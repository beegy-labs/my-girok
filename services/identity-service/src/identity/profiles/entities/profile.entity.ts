import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Profile, Gender } from '.prisma/identity-client';
import { Exclude, Expose } from 'class-transformer';

/**
 * Profile Entity
 * Serialized response for profile data with sensitive fields masked
 */
@Exclude()
export class ProfileEntity {
  @Expose()
  @ApiProperty({ description: 'Profile ID' })
  id!: string;

  @Expose()
  @ApiProperty({ description: 'Account ID' })
  accountId!: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Display name' })
  displayName?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'First name' })
  firstName?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Last name' })
  lastName?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Avatar URL' })
  avatar?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Bio/description' })
  bio?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Birth date' })
  birthDate?: Date | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Gender', enum: Gender })
  gender?: Gender | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Phone country code (masked)' })
  phoneCountryCode?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Phone number (masked)' })
  phoneNumber?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Country code (ISO 3166-1 alpha-2)' })
  countryCode?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Region/state' })
  region?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'City' })
  city?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Postal code' })
  postalCode?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Locale (BCP-47)' })
  locale?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Timezone (IANA)' })
  timezone?: string | null;

  @Expose()
  @ApiProperty({ description: 'Profile creation time' })
  createdAt!: Date;

  @Expose()
  @ApiProperty({ description: 'Profile last update time' })
  updatedAt!: Date;

  // Address is not exposed in list views, only detail views
  @Exclude()
  address?: string | null;

  // Metadata is internal
  @Exclude()
  metadata?: unknown;

  /**
   * Create ProfileEntity from Prisma model
   * Masks sensitive data like phone numbers
   */
  static fromPrisma(profile: Profile, includeAddress = false): ProfileEntity {
    const entity = new ProfileEntity();
    entity.id = profile.id;
    entity.accountId = profile.accountId;
    entity.displayName = profile.displayName;
    entity.firstName = profile.firstName;
    entity.lastName = profile.lastName;
    entity.avatar = sanitizeAvatarUrl(profile.avatar);
    entity.bio = profile.bio;
    entity.birthDate = profile.birthDate;
    entity.gender = profile.gender;
    entity.phoneCountryCode = profile.phoneCountryCode;
    entity.phoneNumber = profile.phoneNumber ? maskPhoneNumber(profile.phoneNumber) : null;
    entity.countryCode = profile.countryCode;
    entity.region = profile.region;
    entity.city = profile.city;
    entity.postalCode = profile.postalCode;
    entity.locale = profile.locale;
    entity.timezone = profile.timezone;
    entity.createdAt = profile.createdAt;
    entity.updatedAt = profile.updatedAt;

    if (includeAddress) {
      entity.address = profile.address;
    }

    return entity;
  }

  /**
   * Create array of ProfileEntity from Prisma models
   */
  static fromPrismaArray(profiles: Profile[]): ProfileEntity[] {
    return profiles.map((profile) => ProfileEntity.fromPrisma(profile));
  }

  /**
   * Get full name
   */
  getFullName(): string | null {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    return this.firstName || this.lastName || this.displayName || null;
  }

  /**
   * Check if profile has complete contact info
   */
  hasContactInfo(): boolean {
    return !!(this.phoneNumber || (this.countryCode && this.city));
  }

  /**
   * Check if profile is from a specific region
   */
  isFromRegion(region: string): boolean {
    return this.countryCode?.toUpperCase() === region.toUpperCase();
  }

  /**
   * Calculate age from birth date
   */
  getAge(): number | null {
    if (!this.birthDate) return null;
    const today = new Date();
    const birth = new Date(this.birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Check if user meets minimum age requirement
   */
  meetsMinimumAge(minAge: number): boolean {
    const age = this.getAge();
    return age !== null && age >= minAge;
  }
}

/**
 * Mask phone number for privacy
 * Shows last 4 digits only: ***-***-1234
 */
function maskPhoneNumber(phone: string): string {
  if (phone.length <= 4) return phone;
  const visible = phone.slice(-4);
  const masked = phone.slice(0, -4).replace(/\d/g, '*');
  return masked + visible;
}

/**
 * Sanitize avatar URL to prevent XSS
 * Only allows http/https URLs
 */
function sanitizeAvatarUrl(url: string | null): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return url;
    }
    return null; // Reject non-http(s) URLs
  } catch {
    return null; // Invalid URL
  }
}
