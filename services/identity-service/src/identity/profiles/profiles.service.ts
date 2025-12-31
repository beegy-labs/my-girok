import { Injectable, NotFoundException } from '@nestjs/common';
import { IdentityPrismaService } from '../../database/identity-prisma.service';
import { Gender, Prisma } from '.prisma/identity-client';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: IdentityPrismaService) {}

  async findByAccountId(accountId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { accountId },
    });

    if (!profile) {
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
    const updateData: Prisma.ProfileUpdateInput = {
      ...data,
    };
    return this.prisma.profile.update({
      where: { accountId },
      data: updateData,
    });
  }

  async create(accountId: string, displayName: string) {
    return this.prisma.profile.create({
      data: {
        accountId,
        displayName,
      },
    });
  }

  async delete(accountId: string) {
    return this.prisma.profile.delete({
      where: { accountId },
    });
  }
}
