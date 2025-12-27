import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Public } from '@my-girok/nest-common';
import { AdminAuthService } from '../services/admin-auth.service';
import {
  AdminLoginDto,
  AdminRefreshDto,
  AdminLoginResponse,
  AdminProfileResponse,
} from '../dto/admin-auth.dto';
import { CurrentAdmin } from '../decorators/current-admin.decorator';
import { AdminPayload } from '../types/admin.types';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  /**
   * Admin login
   * POST /v1/admin/auth/login
   */
  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: AdminLoginDto): Promise<AdminLoginResponse> {
    return this.adminAuthService.login(dto);
  }

  /**
   * Refresh access token
   * POST /v1/admin/auth/refresh
   */
  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: AdminRefreshDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.adminAuthService.refresh(dto.refreshToken);
  }

  /**
   * Get current admin profile
   * GET /v1/admin/auth/me
   * Now uses UnifiedAuthGuard - validates admin token automatically
   */
  @Get('me')
  async getProfile(@CurrentAdmin() admin: AdminPayload): Promise<AdminProfileResponse> {
    return this.adminAuthService.getProfile(admin.sub);
  }

  /**
   * Admin logout
   * POST /v1/admin/auth/logout
   * Now uses UnifiedAuthGuard - validates admin token automatically
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentAdmin() admin: AdminPayload, @Body() dto: AdminRefreshDto): Promise<void> {
    await this.adminAuthService.logout(admin.sub, dto.refreshToken);
  }
}
