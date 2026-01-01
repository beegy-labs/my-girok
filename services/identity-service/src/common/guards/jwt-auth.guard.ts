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
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './api-key.guard';
import { IdentityPrismaService } from '../../database/identity-prisma.service';

/**
 * JWT payload interface (RFC 9068 compliant)
 */
export interface JwtPayload {
  sub: string; // account ID
  jti?: string; // JWT ID for revocation
  email: string;
  username: string;
  type?: 'ACCESS' | 'REFRESH';
  scope?: string[];
  iat: number;
  exp: number;
  nbf?: number;
}

/**
 * Extended request with user context
 */
export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
  accountId: string;
}

/**
 * Token revocation cache key prefix
 */
const REVOKED_TOKEN_CACHE_PREFIX = 'revoked:jti:';
const REVOKED_TOKEN_CACHE_TTL = 3600 * 1000; // 1 hour

/**
 * JWT Authentication Guard
 * Validates JWT tokens from Authorization header with proper signature verification
 *
 * Security:
 * - Verifies JWT signature using RS256 or HS256 based on configuration
 * - Validates token expiration
 * - Validates issuer and audience claims
 * - Checks token revocation (jti blacklist)
 * - Validates nbf (not before) claim
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Optional() private readonly prisma?: IdentityPrismaService,
    @Optional() @Inject(CACHE_MANAGER) private readonly cacheManager?: Cache,
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
      // Verify token signature, expiration, issuer, audience
      const payload = await this.verifyToken(token);

      // Check if token is revoked (jti blacklist)
      if (payload.jti) {
        const isRevoked = await this.isTokenRevoked(payload.jti);
        if (isRevoked) {
          this.logger.warn(`Revoked token used: jti=${payload.jti}, sub=${payload.sub}`);
          throw new UnauthorizedException('Token has been revoked');
        }
      }

      // Validate nbf (not before) claim
      if (payload.nbf && Date.now() / 1000 < payload.nbf) {
        throw new UnauthorizedException('Token not yet valid');
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

  /**
   * Check if a token has been revoked
   * Uses cache-aside pattern with database fallback
   */
  private async isTokenRevoked(jti: string): Promise<boolean> {
    const cacheKey = `${REVOKED_TOKEN_CACHE_PREFIX}${jti}`;

    // Check cache first
    if (this.cacheManager) {
      const cached = await this.cacheManager.get<boolean>(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    // Check database if prisma is available
    if (this.prisma) {
      try {
        const revokedToken = await this.prisma.revokedToken.findUnique({
          where: { jti },
          select: { id: true, expiresAt: true },
        });

        const isRevoked = revokedToken !== null && revokedToken.expiresAt > new Date();

        // Cache the result
        if (this.cacheManager) {
          await this.cacheManager.set(cacheKey, isRevoked, REVOKED_TOKEN_CACHE_TTL);
        }

        return isRevoked;
      } catch (error) {
        this.logger.error(`Failed to check token revocation: ${error}`);
        // Fail open for availability, but log for monitoring
        return false;
      }
    }

    return false;
  }

  /**
   * Revoke a token by jti
   * Call this when user logs out or password changes
   */
  async revokeToken(
    jti: string,
    accountId: string,
    reason: string,
    expiresAt: Date,
  ): Promise<void> {
    if (!this.prisma) {
      this.logger.warn('Cannot revoke token: Prisma not available');
      return;
    }

    try {
      await this.prisma.revokedToken.create({
        data: {
          jti,
          accountId,
          reason,
          expiresAt,
        },
      });

      // Invalidate cache
      if (this.cacheManager) {
        const cacheKey = `${REVOKED_TOKEN_CACHE_PREFIX}${jti}`;
        await this.cacheManager.set(cacheKey, true, REVOKED_TOKEN_CACHE_TTL);
      }

      this.logger.log(`Token revoked: jti=${jti}, reason=${reason}`);
    } catch (error) {
      this.logger.error(`Failed to revoke token: ${error}`);
      throw error;
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
