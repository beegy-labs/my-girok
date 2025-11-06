import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { OAuthConfigService } from './oauth-config.service';
import { ToggleProviderDto } from './dto/toggle-provider.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthProvider, Role } from '@my-girok/types';

@ApiTags('oauth-config')
@Controller('api/v1/oauth-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class OAuthConfigController {
  constructor(private readonly oauthConfigService: OAuthConfigService) {}

  /**
   * GET /api/v1/oauth-config
   * Get all OAuth provider configurations
   * Access: MASTER only
   */
  @Get()
  @Roles(Role.MASTER)
  @ApiOperation({ summary: 'Get all OAuth provider configurations' })
  @ApiResponse({
    status: 200,
    description: 'List of all OAuth provider configurations',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - MASTER role required' })
  async getAllProviders() {
    return this.oauthConfigService.getAllProviders();
  }

  /**
   * GET /api/v1/oauth-config/:provider
   * Get specific provider configuration
   * Access: MASTER only
   */
  @Get(':provider')
  @Roles(Role.MASTER)
  @ApiOperation({ summary: 'Get specific provider configuration' })
  @ApiParam({
    name: 'provider',
    enum: AuthProvider,
    description: 'OAuth provider type',
    example: 'GOOGLE',
  })
  @ApiResponse({
    status: 200,
    description: 'OAuth provider configuration',
  })
  @ApiResponse({ status: 404, description: 'Provider configuration not found' })
  async getProviderConfig(@Param('provider') provider: AuthProvider) {
    return this.oauthConfigService.getProviderConfig(provider);
  }

  /**
   * PATCH /api/v1/oauth-config/:provider/toggle
   * Enable or disable OAuth provider
   * Access: MASTER only
   */
  @Patch(':provider/toggle')
  @Roles(Role.MASTER)
  @ApiOperation({ summary: 'Enable or disable OAuth provider' })
  @ApiParam({
    name: 'provider',
    enum: AuthProvider,
    description: 'OAuth provider type',
    example: 'KAKAO',
  })
  @ApiResponse({
    status: 200,
    description: 'Provider toggle successful',
  })
  @ApiResponse({
    status: 403,
    description: 'Cannot disable LOCAL provider',
  })
  async toggleProvider(
    @Param('provider') provider: AuthProvider,
    @Body() dto: ToggleProviderDto,
    @CurrentUser() user: any,
  ) {
    return this.oauthConfigService.toggleProvider(
      provider,
      dto.enabled,
      user.id,
    );
  }

  /**
   * GET /api/v1/oauth-config/:provider/status
   * Check if provider is enabled (public endpoint)
   * Access: Public
   */
  @Get(':provider/status')
  @ApiOperation({
    summary: 'Check if OAuth provider is enabled (Public)',
  })
  @ApiParam({
    name: 'provider',
    enum: AuthProvider,
    description: 'OAuth provider type',
    example: 'NAVER',
  })
  @ApiResponse({
    status: 200,
    description: 'Provider status',
    schema: {
      example: {
        provider: 'NAVER',
        enabled: true,
      },
    },
  })
  async getProviderStatus(@Param('provider') provider: AuthProvider) {
    const enabled = await this.oauthConfigService.isProviderEnabled(provider);
    return {
      provider,
      enabled,
    };
  }
}
