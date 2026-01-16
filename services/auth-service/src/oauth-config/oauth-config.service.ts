import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuthProvider } from '@my-girok/types';
import { CryptoService } from '../common/crypto/crypto.service';
import { OAuthProviderResponseDto, EnabledProviderDto, EnabledProvidersResponseDto } from './dto';

@Injectable()
export class OAuthConfigService {
  private readonly logger = new Logger(OAuthConfigService.name);

  // Allowed callback URL domains
  private readonly allowedCallbackDomains = [
    'localhost',
    'girok.dev',
    'auth.girok.dev',
    'auth-bff.girok.dev',
  ];

  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
  ) {}

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
  async toggleProvider(provider: AuthProvider, enabled: boolean, adminUserId: string) {
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
      throw new NotFoundException(`OAuth provider ${provider} configuration not found`);
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

  /**
   * Update OAuth provider credentials
   * Encrypts client secret before storing
   */
  async updateProviderCredentials(
    provider: AuthProvider,
    data: {
      clientId?: string;
      clientSecret?: string;
      callbackUrl?: string;
    },
    adminUserId: string,
  ) {
    // Validate callback URL if provided
    if (data.callbackUrl) {
      this.validateCallbackUrl(data.callbackUrl);
    }

    // Encrypt client secret if provided
    const encryptedData: any = {};
    if (data.clientId !== undefined) {
      encryptedData.clientId = data.clientId;
    }
    if (data.clientSecret !== undefined) {
      encryptedData.clientSecret = this.crypto.encrypt(data.clientSecret);
    }
    if (data.callbackUrl !== undefined) {
      encryptedData.callbackUrl = data.callbackUrl;
    }

    // Check if config exists
    const existingConfig = await this.prisma.oAuthProviderConfig.findUnique({
      where: { provider },
    });

    if (existingConfig) {
      // Update existing config
      const updated = await this.prisma.oAuthProviderConfig.update({
        where: { provider },
        data: {
          ...encryptedData,
          updatedBy: adminUserId,
        },
      });

      this.logger.log(`OAuth credentials updated for provider ${provider} by admin ${adminUserId}`);

      return this.maskProviderConfig(updated);
    } else {
      // Create new config
      const created = await this.prisma.oAuthProviderConfig.create({
        data: {
          provider,
          ...encryptedData,
          displayName: this.getDisplayName(provider),
          description: `Login with ${this.getDisplayName(provider)}`,
          updatedBy: adminUserId,
        },
      });

      this.logger.log(`OAuth credentials created for provider ${provider} by admin ${adminUserId}`);

      return this.maskProviderConfig(created);
    }
  }

  /**
   * Get decrypted credentials for OAuth strategies
   * Used internally by strategies to initialize OAuth flow
   */
  async getDecryptedCredentials(provider: AuthProvider): Promise<{
    clientId: string | null;
    clientSecret: string | null;
    callbackUrl: string | null;
  }> {
    const config = await this.prisma.oAuthProviderConfig.findUnique({
      where: { provider },
    });

    if (!config) {
      return {
        clientId: null,
        clientSecret: null,
        callbackUrl: null,
      };
    }

    // Decrypt client secret if it exists
    let decryptedSecret: string | null = null;
    if (config.clientSecret) {
      try {
        decryptedSecret = this.crypto.decrypt(config.clientSecret);
      } catch (error) {
        this.logger.error(`Failed to decrypt secret for provider ${provider}: ${error}`);
        // Return null if decryption fails
        decryptedSecret = null;
      }
    }

    return {
      clientId: config.clientId,
      clientSecret: decryptedSecret,
      callbackUrl: config.callbackUrl,
    };
  }

  /**
   * Get enabled OAuth providers (public endpoint)
   * Returns only enabled providers without credentials
   */
  async getEnabledProviders(): Promise<EnabledProvidersResponseDto> {
    const allConfigs = await this.prisma.oAuthProviderConfig.findMany({
      where: {
        enabled: true,
        // Exclude LOCAL provider from OAuth list
        provider: {
          not: AuthProvider.LOCAL,
        },
      },
      orderBy: { provider: 'asc' },
    });

    const providers: EnabledProviderDto[] = allConfigs.map((config) => ({
      provider: config.provider as AuthProvider,
      displayName: config.displayName,
      description: config.description || undefined,
    }));

    return { providers };
  }

  /**
   * Get all providers with masked secrets (for admin UI)
   */
  async getAllProvidersWithMasking(): Promise<OAuthProviderResponseDto[]> {
    const allConfigs = await this.prisma.oAuthProviderConfig.findMany({
      orderBy: { provider: 'asc' },
    });

    return allConfigs.map((config) => this.maskProviderConfig(config));
  }

  /**
   * Mask provider config for safe display
   */
  private maskProviderConfig(config: any): OAuthProviderResponseDto {
    return {
      provider: config.provider as AuthProvider,
      enabled: config.enabled,
      clientId: config.clientId || undefined,
      clientSecretMasked: config.clientSecret ? this.maskSecret(config.clientSecret) : undefined,
      callbackUrl: config.callbackUrl || undefined,
      displayName: config.displayName,
      description: config.description || undefined,
      updatedAt: config.updatedAt,
      updatedBy: config.updatedBy || undefined,
    };
  }

  /**
   * Mask secret for display (show last 4 characters)
   */
  private maskSecret(secret: string): string {
    if (!secret || secret.length <= 4) {
      return '********';
    }
    const last4 = secret.slice(-4);
    return `********${last4}`;
  }

  /**
   * Validate callback URL against allowed domains
   */
  private validateCallbackUrl(url: string): void {
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname;

      // Check if hostname is in allowed domains or is subdomain of allowed domain
      const isAllowed = this.allowedCallbackDomains.some(
        (domain) =>
          hostname === domain ||
          hostname.endsWith(`.${domain}`) ||
          (domain === 'localhost' && hostname.startsWith('localhost')),
      );

      if (!isAllowed) {
        throw new BadRequestException(
          `Callback URL domain '${hostname}' is not in allowed domains: ${this.allowedCallbackDomains.join(', ')}`,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Invalid callback URL format: ${url}`);
    }
  }
}
