import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { UserService } from './user.service';
import { Public, CurrentSession, RequireMfa, AllowedAccountTypes } from '../common/decorators';
import { BffSession } from '../common/types';
import {
  UserRegisterDto,
  UserLoginDto,
  UserLoginMfaDto,
  UserSetupMfaDto,
  UserDisableMfaDto,
  UserChangePasswordDto,
  UserLoginResponseDto,
  UserInfoDto,
  UserMfaSetupResponseDto,
} from './dto/user.dto';

@ApiTags('user')
@Controller('user')
@AllowedAccountTypes('USER')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'User registration' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: UserRegisterDto,
  ): Promise<{ success: boolean; user: UserInfoDto; message: string }> {
    return this.userService.register(req, res, dto);
  }

  @Post('login')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login (step 1)' })
  @ApiResponse({ status: 200, type: UserLoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: UserLoginDto,
  ): Promise<UserLoginResponseDto> {
    return this.userService.login(req, res, dto);
  }

  @Post('login-mfa')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User MFA verification (step 2)' })
  @ApiResponse({ status: 200, type: UserLoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid MFA code' })
  async loginMfa(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: UserLoginMfaDto,
  ): Promise<{ success: boolean; user: UserInfoDto; message: string }> {
    return this.userService.loginMfa(req, res, dto.challengeId, dto.code, dto.method);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean; message: string }> {
    return this.userService.logout(req, res);
  }

  @Get('me')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get current user info' })
  @ApiResponse({ status: 200, type: UserInfoDto })
  async getMe(@CurrentSession() session: BffSession): Promise<UserInfoDto> {
    return this.userService.getMe(session);
  }

  // MFA Management
  @Get('mfa/setup')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Start MFA setup' })
  @ApiResponse({ status: 200, type: UserMfaSetupResponseDto })
  async setupMfa(@CurrentSession() session: BffSession): Promise<UserMfaSetupResponseDto> {
    return this.userService.setupMfa(session);
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Verify MFA setup' })
  @ApiResponse({ status: 200, description: 'MFA verified' })
  async verifyMfaSetup(
    @CurrentSession() session: BffSession,
    @Body() dto: UserSetupMfaDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.userService.verifyMfaSetup(session, dto.code);
  }

  @Delete('mfa')
  @HttpCode(HttpStatus.OK)
  @RequireMfa()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Disable MFA' })
  @ApiResponse({ status: 200, description: 'MFA disabled' })
  async disableMfa(
    @CurrentSession() session: BffSession,
    @Body() dto: UserDisableMfaDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.userService.disableMfa(session, dto.password);
  }

  @Get('mfa/backup-codes')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get backup codes count' })
  @ApiResponse({ status: 200, description: 'Remaining backup codes count' })
  async getBackupCodesCount(
    @CurrentSession() session: BffSession,
  ): Promise<{ remainingCount: number }> {
    return this.userService.getBackupCodesCount(session);
  }

  @Post('mfa/backup-codes/regenerate')
  @HttpCode(HttpStatus.OK)
  @RequireMfa()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Regenerate backup codes' })
  @ApiResponse({ status: 200, description: 'New backup codes generated' })
  async regenerateBackupCodes(
    @CurrentSession() session: BffSession,
    @Body() dto: UserDisableMfaDto,
  ): Promise<{ backupCodes: string[] }> {
    return this.userService.regenerateBackupCodes(session, dto.password);
  }

  // Password Management
  @Post('password/change')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  async changePassword(
    @CurrentSession() session: BffSession,
    @Body() dto: UserChangePasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.userService.changePassword(session, dto.currentPassword, dto.newPassword);
  }

  // Session Management
  @Post('sessions/revoke-all')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Revoke all other sessions' })
  @ApiResponse({ status: 200, description: 'Sessions revoked' })
  async revokeAllSessions(
    @CurrentSession() session: BffSession,
  ): Promise<{ success: boolean; revokedCount: number; message: string }> {
    return this.userService.revokeAllOtherSessions(session);
  }
}
