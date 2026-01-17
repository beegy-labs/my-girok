import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-apple';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { AuthProvider } from '@my-girok/types';
import { OAuthConfigService } from '../../oauth-config/oauth-config.service';
import * as fs from 'fs';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  private readonly logger = new Logger(AppleStrategy.name);

  constructor(
    private authService: AuthService,
    private oauthConfigService: OAuthConfigService,
    configService: ConfigService,
  ) {
    // Initialize strategy with default config
    // Actual credentials will be loaded dynamically from database
    super({
      clientID: 'placeholder',
      teamID: configService.get('APPLE_TEAM_ID') || 'placeholder',
      keyID: configService.get('APPLE_KEY_ID') || 'placeholder',
      privateKeyString: AppleStrategy.loadPrivateKey(configService),
      callbackURL: 'placeholder',
      scope: ['name', 'email'],
      passReqToCallback: false,
    } as any);

    // Override the options dynamically
    this.initializeFromDatabase();
  }

  /**
   * Load Apple private key from file or environment variable
   */
  private static loadPrivateKey(configService: ConfigService): string {
    const keyPath = configService.get('APPLE_PRIVATE_KEY_PATH');
    const keyEnv = configService.get('APPLE_PRIVATE_KEY');

    if (keyPath) {
      try {
        return fs.readFileSync(keyPath, 'utf8');
      } catch (error) {
        console.error('Failed to load Apple private key from file:', error);
      }
    }

    if (keyEnv) {
      return keyEnv;
    }

    // Return placeholder for development
    console.warn('Apple private key not configured. Using placeholder.');
    return 'placeholder';
  }

  /**
   * Initialize strategy with database credentials
   *
   * Lifecycle: Called once during strategy instantiation at application startup.
   * Database credential changes require service restart to take effect.
   *
   * Future enhancement: Implement hot-reloading via cache TTL or Pub/Sub mechanism.
   */
  private async initializeFromDatabase(): Promise<void> {
    try {
      const credentials = await this.oauthConfigService.getDecryptedCredentials(AuthProvider.APPLE);

      if (credentials.clientId && credentials.callbackUrl) {
        // Update strategy options dynamically
        (this as any)._clientID = credentials.clientId;
        (this as any)._callbackURL = credentials.callbackUrl;

        this.logger.log('Apple OAuth strategy initialized with database credentials');
      } else {
        this.logger.warn(
          'Apple OAuth credentials not found in database. Using environment variables.',
        );
      }
    } catch (error) {
      this.logger.error('Failed to initialize Apple strategy from database:', error);
    }
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const { id, emails, name } = profile;

      // Apple only provides user info on first sign-in
      const email = emails?.[0]?.value;
      if (!email) {
        this.logger.error('Apple OAuth: No email provided in profile');
        return done(new Error('Email not provided by Apple'), undefined);
      }

      // Construct display name from Apple name object
      let displayName = email.split('@')[0]; // Fallback to email username
      if (name) {
        const firstName = (name as any).firstName || '';
        const lastName = (name as any).lastName || '';
        displayName = `${firstName} ${lastName}`.trim() || displayName;
      }

      const user = await this.authService.findOrCreateOAuthUser(
        email,
        AuthProvider.APPLE,
        id,
        displayName,
        undefined, // Apple doesn't provide profile photo
      );

      done(null, user);
    } catch (error) {
      this.logger.error('Apple OAuth validation error:', error);
      done(error as Error, undefined);
    }
  }
}
