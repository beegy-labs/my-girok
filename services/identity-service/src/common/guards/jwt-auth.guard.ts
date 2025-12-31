import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './api-key.guard';

/**
 * JWT payload interface
 */
export interface JwtPayload {
  sub: string; // account ID
  email: string;
  username: string;
  iat: number;
  exp: number;
}

/**
 * Extended request with user context
 */
export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
  accountId: string;
}

/**
 * JWT Authentication Guard
 * Validates JWT tokens from Authorization header with proper signature verification
 *
 * Security:
 * - Verifies JWT signature using RS256 or HS256 based on configuration
 * - Validates token expiration
 * - Validates issuer and audience claims
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Authorization token is required');
    }

    try {
      // In production, verify the token properly
      // For now, we'll do a basic structure check and decode
      const payload = await this.verifyToken(token);

      // Attach user to request
      (request as AuthenticatedRequest).user = payload;
      (request as AuthenticatedRequest).accountId = payload.sub;

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  /**
   * Verify JWT token with proper signature verification
   * Uses JwtService to verify signature, expiration, issuer, and audience
   */
  private async verifyToken(token: string): Promise<JwtPayload> {
    const secret = this.configService.get<string>('JWT_SECRET');
    const publicKey = this.configService.get<string>('JWT_PUBLIC_KEY');

    if (!secret && !publicKey) {
      this.logger.error('JWT_SECRET or JWT_PUBLIC_KEY must be configured');
      throw new Error('JWT verification not configured');
    }

    // Verify token with signature validation
    const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: publicKey || secret,
      // Validate issuer and audience if configured
      issuer: this.configService.get<string>('JWT_ISSUER'),
      audience: this.configService.get<string>('JWT_AUDIENCE'),
    });

    return payload;
  }
}
