import { Controller, Get, Param, Req, Res, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Public } from '../common/decorators';
import { OAUTH_PROVIDERS, OAuthProvider, AuthProvider } from '../config/constants';

@ApiTags('oauth')
@Controller('oauth')
export class OAuthController {
  constructor(private readonly configService: ConfigService) {}

  @Get(':provider')
  @Public()
  @ApiOperation({ summary: 'Start OAuth flow' })
  @ApiParam({ name: 'provider', enum: OAUTH_PROVIDERS })
  @ApiResponse({ status: 302, description: 'Redirect to OAuth provider' })
  async startOAuth(
    @Param('provider') provider: string,
    @Res() res: Response,
    @Query('redirect_uri') redirectUri?: string,
  ): Promise<void> {
    if (!this.isValidProvider(provider)) {
      throw new BadRequestException(`Invalid OAuth provider: ${provider}`);
    }

    const normalizedProvider = this.normalizeProvider(provider);
    const config = this.getProviderConfig(normalizedProvider);
    if (!config.clientId) {
      throw new BadRequestException(`OAuth provider ${provider} is not configured`);
    }

    // Build OAuth URL based on provider
    const authUrl = this.buildAuthUrl(normalizedProvider, config, redirectUri);
    res.redirect(authUrl);
  }

  @Get(':provider/callback')
  @Public()
  @ApiOperation({ summary: 'OAuth callback' })
  @ApiParam({ name: 'provider', enum: OAUTH_PROVIDERS })
  @ApiResponse({ status: 302, description: 'Redirect to frontend with session' })
  async handleCallback(
    @Param('provider') provider: string,
    @Req() _req: Request,
    @Res() res: Response,
    @Query('code') _code?: string,
    @Query('state') _state?: string,
    @Query('error') error?: string,
  ): Promise<void> {
    if (!this.isValidProvider(provider)) {
      throw new BadRequestException(`Invalid OAuth provider: ${provider}`);
    }

    if (error) {
      const frontendUrl = this.configService.get<string>('frontend.url', 'http://localhost:3000');
      res.redirect(`${frontendUrl}/auth/error?error=${encodeURIComponent(error)}`);
      return;
    }

    // TODO: Implement OAuth token exchange and session creation
    // For now, redirect with a placeholder message
    const frontendUrl = this.configService.get<string>('frontend.url', 'http://localhost:3000');
    res.redirect(`${frontendUrl}/auth/callback?provider=${provider}&status=not_implemented`);
  }

  private isValidProvider(provider: string): provider is OAuthProvider {
    const upperProvider = provider.toUpperCase() as OAuthProvider;
    return OAUTH_PROVIDERS.includes(upperProvider);
  }

  private normalizeProvider(provider: string): OAuthProvider {
    return provider.toUpperCase() as OAuthProvider;
  }

  private getProviderConfig(provider: OAuthProvider): {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  } {
    const configKey = this.getConfigKey(provider);
    return {
      clientId: this.configService.get<string>(`oauth.${configKey}.clientId`, ''),
      clientSecret: this.configService.get<string>(`oauth.${configKey}.clientSecret`, ''),
      callbackUrl: this.configService.get<string>(`oauth.${configKey}.callbackUrl`, ''),
    };
  }

  private getConfigKey(provider: OAuthProvider): string {
    return provider.toLowerCase();
  }

  private buildAuthUrl(
    provider: OAuthProvider,
    config: { clientId: string; callbackUrl: string },
    redirectUri?: string,
  ): string {
    const state = this.generateState(redirectUri);

    switch (provider) {
      case AuthProvider.GOOGLE:
        return (
          `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${config.clientId}` +
          `&redirect_uri=${encodeURIComponent(config.callbackUrl)}` +
          `&response_type=code` +
          `&scope=${encodeURIComponent('openid email profile')}` +
          `&state=${state}`
        );

      case AuthProvider.KAKAO:
        return (
          `https://kauth.kakao.com/oauth/authorize?` +
          `client_id=${config.clientId}` +
          `&redirect_uri=${encodeURIComponent(config.callbackUrl)}` +
          `&response_type=code` +
          `&state=${state}`
        );

      case AuthProvider.NAVER:
        return (
          `https://nid.naver.com/oauth2.0/authorize?` +
          `client_id=${config.clientId}` +
          `&redirect_uri=${encodeURIComponent(config.callbackUrl)}` +
          `&response_type=code` +
          `&state=${state}`
        );

      case AuthProvider.APPLE:
        return (
          `https://appleid.apple.com/auth/authorize?` +
          `client_id=${config.clientId}` +
          `&redirect_uri=${encodeURIComponent(config.callbackUrl)}` +
          `&response_type=code` +
          `&scope=${encodeURIComponent('name email')}` +
          `&response_mode=form_post` +
          `&state=${state}`
        );

      default:
        throw new BadRequestException(`Unsupported OAuth provider: ${provider}`);
    }
  }

  private generateState(redirectUri?: string): string {
    const crypto = require('crypto');
    const stateData = {
      nonce: crypto.randomBytes(16).toString('hex'),
      redirectUri,
    };
    return Buffer.from(JSON.stringify(stateData)).toString('base64url');
  }
}
