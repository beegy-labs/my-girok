import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto, GrantDomainAccessDto } from './dto';
import { Public, CurrentUser } from '../common/decorators';
import { JwtAuthGuard } from './guards';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser() user: any, @Body() dto: RefreshTokenDto) {
    await this.authService.logout(user.id, dto.refreshToken);
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Initiates Google OAuth flow
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;
    const tokens = await this.authService.generateTokens(user.id, user.email, user.role);
    await this.authService.saveRefreshToken(user.id, tokens.refreshToken);

    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3000');
    res.redirect(`${frontendUrl}/auth/callback?token=${tokens.accessToken}`);
  }

  @Public()
  @Get('kakao')
  @UseGuards(AuthGuard('kakao'))
  async kakaoAuth() {
    // Initiates Kakao OAuth flow
  }

  @Public()
  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  async kakaoAuthCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;
    const tokens = await this.authService.generateTokens(user.id, user.email, user.role);
    await this.authService.saveRefreshToken(user.id, tokens.refreshToken);

    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3000');
    res.redirect(`${frontendUrl}/auth/callback?token=${tokens.accessToken}`);
  }

  @Public()
  @Get('naver')
  @UseGuards(AuthGuard('naver'))
  async naverAuth() {
    // Initiates Naver OAuth flow
  }

  @Public()
  @Get('naver/callback')
  @UseGuards(AuthGuard('naver'))
  async naverAuthCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;
    const tokens = await this.authService.generateTokens(user.id, user.email, user.role);
    await this.authService.saveRefreshToken(user.id, tokens.refreshToken);

    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3000');
    res.redirect(`${frontendUrl}/auth/callback?token=${tokens.accessToken}`);
  }

  @UseGuards(JwtAuthGuard)
  @Post('domain-access')
  async grantDomainAccess(@CurrentUser() user: any, @Body() dto: GrantDomainAccessDto) {
    return this.authService.grantDomainAccess(user.id, dto);
  }
}

// Fix for private method visibility
declare module './auth.service' {
  interface AuthService {
    generateTokens(userId: string, email: string, role: string): Promise<any>;
    saveRefreshToken(userId: string, refreshToken: string): Promise<void>;
  }
}
