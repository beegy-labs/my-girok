import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './api-key.guard';
import { CacheService } from '../cache';

/**
 * JWT payload interface (extended for 2026 standards)
 */
export interface JwtPayload {
  sub: string; // account ID
  jti?: string; // JWT ID for revocation tracking
  email: string;
  username?: string;
  permissions?: string[]; // Permissions from auth-service
  roles?: string[]; // Roles from auth-service
  accountMode?: string;
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
 *
 * Validates JWT tokens from Authorization header with proper signature verification.
 *
 * 2026 Best Practices:
 * - Verifies JWT signature using RS256 or HS256 based on configuration
 * - Validates token expiration
 * - Validates issuer and audience claims
 * - Checks token revocation via JTI (JWT ID)
 * - Prevents algorithm confusion attacks
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Optional() @Inject(CacheService) private readonly cacheService?: CacheService,
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
      // Verify the token
      const payload = await this.verifyToken(token);

      // Check if token has been revoked (if JTI exists)
      if (payload.jti && this.cacheService) {
        const isRevoked = await this.cacheService.isTokenRevoked(payload.jti);
        if (isRevoked) {
          this.logger.warn(`Revoked token used: ${payload.jti.substring(0, 8)}...`);
          throw new UnauthorizedException('Token has been revoked');
        }
      }

      // Attach user to request
      (request as AuthenticatedRequest).user = payload;
      (request as AuthenticatedRequest).accountId = payload.sub;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
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
   *
   * Security:
   * - Explicitly specifies allowed algorithms to prevent algorithm confusion attacks
   * - Validates issuer and audience claims
   */
  private async verifyToken(token: string): Promise<JwtPayload> {
    const secret = this.configService.get<string>('JWT_SECRET');
    const publicKey = this.configService.get<string>('JWT_PUBLIC_KEY');

    if (!secret && !publicKey) {
      this.logger.error('JWT_SECRET or JWT_PUBLIC_KEY must be configured');
      throw new Error('JWT verification not configured');
    }

    // Determine algorithm based on key type
    const algorithms: ('HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512')[] = publicKey
      ? ['RS256', 'RS384', 'RS512']
      : ['HS256', 'HS384', 'HS512'];

    // Get issuer and audience - require them in production
    const issuer = this.configService.get<string>('JWT_ISSUER');
    const audience = this.configService.get<string>('JWT_AUDIENCE');
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    if (nodeEnv === 'production' && (!issuer || !audience)) {
      this.logger.error('JWT_ISSUER and JWT_AUDIENCE must be configured in production');
      throw new Error('JWT issuer/audience not configured');
    }

    // Verify token with signature validation and algorithm restriction
    const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: publicKey || secret,
      algorithms, // Prevent algorithm confusion attacks
      issuer,
      audience,
    });

    return payload;
  }
}
