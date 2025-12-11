import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuthProvider } from '@my-girok/types';

@Injectable()
export class OAuthConfigService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check if OAuth provider is enabled
   * LOCAL provider is always enabled
   * If config doesn't exist, default to enabled
   */
  async isProviderEnabled(provider: AuthProvider): Promise<boolean> {
    // LOCAL provider is always enabled
    if (provider === AuthProvider.LOCAL) {
      return true;
    }

    const config = await this.prisma.oAuthProviderConfig.findUnique({
      where: { provider },
    });

    // If no config exists, default to enabled
    if (!config) {
      return true;
    }

    return config.enabled;
  }

  /**
   * Get all OAuth provider configurations
   */
  async getAllProviders() {
    return this.prisma.oAuthProviderConfig.findMany({
      orderBy: { provider: 'asc' },
    });
  }

  /**
   * Toggle OAuth provider on/off
   * Only MASTER admins can toggle providers
   * LOCAL provider cannot be disabled
   */
  async toggleProvider(
    provider: AuthProvider,
    enabled: boolean,
    adminUserId: string,
  ) {
    // Prevent disabling LOCAL provider
    if (provider === AuthProvider.LOCAL && !enabled) {
      throw new ForbiddenException('LOCAL provider cannot be disabled');
    }

    // Check if config exists
    const existingConfig = await this.prisma.oAuthProviderConfig.findUnique({
      where: { provider },
    });

    if (existingConfig) {
      // Update existing config
      return this.prisma.oAuthProviderConfig.update({
        where: { provider },
        data: {
          enabled,
          updatedBy: adminUserId,
        },
      });
    } else {
      // Create new config
      return this.prisma.oAuthProviderConfig.upsert({
        where: { provider },
        create: {
          provider,
          enabled,
          displayName: this.getDisplayName(provider),
          description: `Login with ${this.getDisplayName(provider)}`,
          updatedBy: adminUserId,
        },
        update: {
          enabled,
          updatedBy: adminUserId,
        },
      });
    }
  }

  /**
   * Get specific provider configuration
   */
  async getProviderConfig(provider: AuthProvider) {
    const config = await this.prisma.oAuthProviderConfig.findUnique({
      where: { provider },
    });

    if (!config) {
      throw new NotFoundException(
        `OAuth provider ${provider} configuration not found`,
      );
    }

    return config;
  }

  /**
   * Helper: Get display name for provider
   */
  private getDisplayName(provider: AuthProvider): string {
    const displayNames: Record<AuthProvider, string> = {
      [AuthProvider.LOCAL]: 'Local',
      [AuthProvider.GOOGLE]: 'Google',
      [AuthProvider.KAKAO]: 'Kakao',
      [AuthProvider.NAVER]: 'Naver',
      [AuthProvider.APPLE]: 'Apple',
    };
    return displayNames[provider];
  }
}
