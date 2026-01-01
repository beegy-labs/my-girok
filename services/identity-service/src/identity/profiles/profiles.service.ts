import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { IdentityPrismaService } from '../../database/identity-prisma.service';
import { Gender, Prisma } from '.prisma/identity-client';
import { maskUuid } from '../../common/utils/masking.util';
import {
  sanitizeName,
  sanitizeBio,
  sanitizeUrl,
  sanitizeString,
} from '../../common/utils/sanitize.util';

/**
 * Profiles Service
 *
 * Handles user profile CRUD operations.
 *
 * 2026 Best Practices:
 * - XSS prevention via input sanitization
 * - PII masking in logs
 * - Proper error handling
 */
@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(private readonly prisma: IdentityPrismaService) {}

  async findByAccountId(accountId: string) {
    this.logger.debug(`Finding profile for account: ${maskUuid(accountId)}`);
    const profile = await this.prisma.profile.findUnique({
      where: { accountId },
    });

    if (!profile) {
      this.logger.warn(`Profile not found for account: ${maskUuid(accountId)}`);
      throw new NotFoundException(`Profile not found for account: ${accountId}`);
    }

    return profile;
  }

  async update(
    accountId: string,
    data: {
      displayName?: string;
      firstName?: string;
      lastName?: string;
      avatar?: string;
      bio?: string;
      birthDate?: Date;
      gender?: Gender | null;
      phoneCountryCode?: string;
      phoneNumber?: string;
      countryCode?: string;
      region?: string;
      city?: string;
      address?: string;
      postalCode?: string;
    },
  ) {
    this.logger.debug(`Updating profile for account: ${maskUuid(accountId)}`);

    // Sanitize all string inputs to prevent XSS
    const sanitizedData: Prisma.ProfileUpdateInput = {
      displayName: data.displayName ? sanitizeName(data.displayName) : undefined,
      firstName: data.firstName ? sanitizeName(data.firstName, 50) : undefined,
      lastName: data.lastName ? sanitizeName(data.lastName, 50) : undefined,
      avatar: data.avatar ? sanitizeUrl(data.avatar) : undefined,
      bio: data.bio ? sanitizeBio(data.bio) : undefined,
      birthDate: data.birthDate,
      gender: data.gender,
      phoneCountryCode: data.phoneCountryCode
        ? sanitizeString(data.phoneCountryCode, { maxLength: 5 })
        : undefined,
      phoneNumber: data.phoneNumber
        ? sanitizeString(data.phoneNumber, { maxLength: 20 })
        : undefined,
      countryCode: data.countryCode
        ? sanitizeString(data.countryCode, { maxLength: 2 })
        : undefined,
      region: data.region ? sanitizeString(data.region, { maxLength: 100 }) : undefined,
      city: data.city ? sanitizeString(data.city, { maxLength: 100 }) : undefined,
      address: data.address ? sanitizeString(data.address, { maxLength: 255 }) : undefined,
      postalCode: data.postalCode ? sanitizeString(data.postalCode, { maxLength: 20 }) : undefined,
    };

    // Remove undefined fields
    Object.keys(sanitizedData).forEach((key) => {
      if (sanitizedData[key as keyof typeof sanitizedData] === undefined) {
        delete sanitizedData[key as keyof typeof sanitizedData];
      }
    });

    try {
      const result = await this.prisma.profile.update({
        where: { accountId },
        data: sanitizedData,
      });
      this.logger.log(`Profile updated for account: ${maskUuid(accountId)}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to update profile for account: ${maskUuid(accountId)}`, error);
      throw error;
    }
  }

  async create(accountId: string, displayName: string) {
    this.logger.log(`Creating profile for account: ${maskUuid(accountId)}`);
    const sanitizedName = sanitizeName(displayName);

    const profile = await this.prisma.profile.create({
      data: {
        accountId,
        displayName: sanitizedName,
      },
    });
    this.logger.log(`Profile created for account: ${maskUuid(accountId)}`);
    return profile;
  }

  async delete(accountId: string) {
    this.logger.log(`Deleting profile for account: ${maskUuid(accountId)}`);

    const profile = await this.prisma.profile.findUnique({
      where: { accountId },
    });

    if (!profile) {
      this.logger.warn(`Profile not found for deletion, account: ${maskUuid(accountId)}`);
      throw new NotFoundException(`Profile not found for account: ${accountId}`);
    }

    try {
      const result = await this.prisma.profile.delete({
        where: { accountId },
      });
      this.logger.log(`Profile deleted for account: ${maskUuid(accountId)}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete profile for account: ${maskUuid(accountId)}`, error);
      throw error;
    }
  }
}
