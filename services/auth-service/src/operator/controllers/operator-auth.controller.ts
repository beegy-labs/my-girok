import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Public } from '@my-girok/nest-common';
import { OperatorAuthService } from '../services/operator-auth.service';
import {
  OperatorLoginDto,
  OperatorRefreshDto,
  AcceptInvitationDto,
  OperatorLoginResponse,
  OperatorProfileResponse,
} from '../dto/operator-auth.dto';
import { CurrentOperator } from '../decorators/current-operator.decorator';
import { OperatorPayload } from '../types/operator.types';

@Controller('operator')
export class OperatorAuthController {
  constructor(private readonly operatorAuthService: OperatorAuthService) {}

  /**
   * Operator login
   * POST /v1/operator/auth/login
   */
  @Post('auth/login')
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: OperatorLoginDto): Promise<OperatorLoginResponse> {
    return this.operatorAuthService.login(dto);
  }

  /**
   * Accept invitation and create account
   * POST /v1/operator/auth/accept-invitation
   */
  @Post('auth/accept-invitation')
  @Public()
  @HttpCode(HttpStatus.OK)
  async acceptInvitation(@Body() dto: AcceptInvitationDto): Promise<OperatorLoginResponse> {
    return this.operatorAuthService.acceptInvitation(dto);
  }

  /**
   * Refresh tokens
   * POST /v1/operator/auth/refresh
   */
  @Post('auth/refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: OperatorRefreshDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.operatorAuthService.refresh(dto.refreshToken);
  }

  /**
   * Logout
   * POST /v1/operator/auth/logout
   */
  @Post('auth/logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentOperator() operator: OperatorPayload,
    @Body() dto: OperatorRefreshDto,
  ): Promise<void> {
    await this.operatorAuthService.logout(operator.sub, dto.refreshToken);
  }

  /**
   * Get current operator profile
   * GET /v1/operator/me
   */
  @Get('me')
  async getProfile(@CurrentOperator() operator: OperatorPayload): Promise<OperatorProfileResponse> {
    return this.operatorAuthService.getProfile(operator.sub);
  }
}
