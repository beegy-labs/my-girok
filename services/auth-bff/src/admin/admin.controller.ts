import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Req,
  Res,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AdminService } from './admin.service';
import { Public, CurrentSession, RequireMfa, AllowedAccountTypes } from '../common/decorators';
import { BffSession } from '../common/types';
import { AccountType } from '../config/constants';
import {
  AdminLoginDto,
  AdminLoginMfaDto,
  AdminSetupMfaDto,
  AdminDisableMfaDto,
  AdminChangePasswordDto,
  AdminLoginResponseDto,
  AdminInfoDto,
  AdminSessionListDto,
  AdminMfaSetupResponseDto,
  AdminBackupCodesResponseDto,
} from './dto/admin.dto';

@ApiTags('admin')
@Controller('admin')
@AllowedAccountTypes(AccountType.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login (step 1)' })
  @ApiResponse({ status: 200, type: AdminLoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: AdminLoginDto,
  ): Promise<AdminLoginResponseDto> {
    return this.adminService.login(req, res, dto);
  }

  @Post('login-mfa')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin MFA verification (step 2)' })
  @ApiResponse({ status: 200, type: AdminLoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid MFA code' })
  async loginMfa(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: AdminLoginMfaDto,
  ): Promise<{ success: boolean; admin: AdminInfoDto; message: string }> {
    return this.adminService.loginMfa(req, res, dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin logout' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean; message: string }> {
    return this.adminService.logout(req, res);
  }

  @Get('me')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get current admin info' })
  @ApiResponse({ status: 200, type: AdminInfoDto })
  async getMe(@CurrentSession() session: BffSession): Promise<AdminInfoDto> {
    return this.adminService.getMe(session);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Refresh admin session' })
  @ApiResponse({ status: 200, description: 'Session refreshed' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentSession() session: BffSession,
  ): Promise<{ success: boolean; message: string }> {
    return this.adminService.refreshSession(req, res, session);
  }

  @Get('sessions')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get active admin sessions' })
  @ApiResponse({ status: 200, type: [AdminSessionListDto] })
  async getSessions(@CurrentSession() session: BffSession): Promise<AdminSessionListDto[]> {
    return this.adminService.getActiveSessions(session, session.id);
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiResponse({ status: 200, description: 'Session revoked' })
  async revokeSession(
    @CurrentSession() session: BffSession,
    @Param('sessionId') sessionId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.adminService.revokeSession(session, sessionId);
  }

  @Post('sessions/revoke-all')
  @HttpCode(HttpStatus.OK)
  @RequireMfa()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Revoke all other sessions' })
  @ApiResponse({ status: 200, description: 'Sessions revoked' })
  async revokeAllSessions(
    @CurrentSession() session: BffSession,
  ): Promise<{ success: boolean; revokedCount: number; message: string }> {
    return this.adminService.revokeAllOtherSessions(session);
  }

  // MFA Management
  @Get('mfa/setup')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Start MFA setup' })
  @ApiResponse({ status: 200, type: AdminMfaSetupResponseDto })
  async setupMfa(@CurrentSession() session: BffSession): Promise<AdminMfaSetupResponseDto> {
    return this.adminService.setupMfa(session);
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Verify MFA setup' })
  @ApiResponse({ status: 200, description: 'MFA verified' })
  async verifyMfaSetup(
    @CurrentSession() session: BffSession,
    @Body() dto: AdminSetupMfaDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.adminService.verifyMfaSetup(session, dto.code);
  }

  @Delete('mfa')
  @HttpCode(HttpStatus.OK)
  @RequireMfa()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Disable MFA' })
  @ApiResponse({ status: 200, description: 'MFA disabled' })
  async disableMfa(
    @CurrentSession() session: BffSession,
    @Body() dto: AdminDisableMfaDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.adminService.disableMfa(session, dto.password);
  }

  @Get('mfa/backup-codes')
  @RequireMfa()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get backup codes count' })
  @ApiResponse({ status: 200, type: AdminBackupCodesResponseDto })
  async getBackupCodesCount(): Promise<AdminBackupCodesResponseDto> {
    // This would need additional implementation to track backup codes
    return { remainingCount: 0 };
  }

  @Post('mfa/backup-codes/regenerate')
  @HttpCode(HttpStatus.OK)
  @RequireMfa()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Regenerate backup codes' })
  @ApiResponse({ status: 200, description: 'New backup codes generated' })
  async regenerateBackupCodes(
    @CurrentSession() session: BffSession,
    @Body() dto: AdminDisableMfaDto,
  ): Promise<{ backupCodes: string[] }> {
    return this.adminService.regenerateBackupCodes(session, dto.password);
  }

  // Password Management
  @Post('password/change')
  @HttpCode(HttpStatus.OK)
  @RequireMfa()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Change admin password' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  async changePassword(
    @Req() req: Request,
    @CurrentSession() session: BffSession,
    @Body() dto: AdminChangePasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.adminService.changePassword(req, session, dto.currentPassword, dto.newPassword);
  }
}
