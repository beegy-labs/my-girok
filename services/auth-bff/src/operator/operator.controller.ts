import { Controller, Post, Get, Body, Req, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { OperatorService } from './operator.service';
import { Public, CurrentSession, AllowedAccountTypes } from '../common/decorators';
import { BffSession } from '../common/types';
import { OperatorLoginDto, OperatorLoginResponseDto, OperatorInfoDto } from './dto/operator.dto';

@ApiTags('operator')
@Controller('operator')
@AllowedAccountTypes('OPERATOR')
export class OperatorController {
  constructor(private readonly operatorService: OperatorService) {}

  @Post('login')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Operator login' })
  @ApiResponse({ status: 200, type: OperatorLoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'No operator assignment' })
  async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: OperatorLoginDto,
  ): Promise<OperatorLoginResponseDto> {
    return this.operatorService.login(req, res, dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Operator logout' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean; message: string }> {
    return this.operatorService.logout(req, res);
  }

  @Get('me')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get current operator info' })
  @ApiResponse({ status: 200, type: OperatorInfoDto })
  async getMe(@CurrentSession() session: BffSession): Promise<OperatorInfoDto> {
    return this.operatorService.getMe(session);
  }
}
