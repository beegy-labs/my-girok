import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { IdentityPrismaService } from '../../database/identity-prisma.service';
import { Gender, Prisma } from '.prisma/identity-client';

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(private readonly prisma: IdentityPrismaService) {}

  async findByAccountId(accountId: string) {
    this.logger.debug(`Finding profile for account: ${accountId}`);
    const profile = await this.prisma.profile.findUnique({
      where: { accountId },
    });

    if (!profile) {
      this.logger.warn(`Profile not found for account: ${accountId}`);
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
    this.logger.debug(`Updating profile for account: ${accountId}`);

    const updateData: Prisma.ProfileUpdateInput = {
      ...data,
    };

    try {
      const result = await this.prisma.profile.update({
        where: { accountId },
        data: updateData,
      });
      this.logger.log(`Profile updated for account: ${accountId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to update profile for account: ${accountId}`, error);
      throw error;
    }
  }

  async create(accountId: string, displayName: string) {
    this.logger.log(`Creating profile for account: ${accountId}`);
    const profile = await this.prisma.profile.create({
      data: {
        accountId,
        displayName,
      },
    });
    this.logger.log(`Profile created for account: ${accountId}`);
    return profile;
  }

  async delete(accountId: string) {
    this.logger.log(`Deleting profile for account: ${accountId}`);

    const profile = await this.prisma.profile.findUnique({
      where: { accountId },
    });

    if (!profile) {
      this.logger.warn(`Profile not found for deletion, account: ${accountId}`);
      throw new NotFoundException(`Profile not found for account: ${accountId}`);
    }

    try {
      const result = await this.prisma.profile.delete({
        where: { accountId },
      });
      this.logger.log(`Profile deleted for account: ${accountId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete profile for account: ${accountId}`, error);
      throw error;
    }
  }
}
