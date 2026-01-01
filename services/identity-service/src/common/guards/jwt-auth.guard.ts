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
import { CircuitBreakerService } from '../resilience';
import { maskToken } from '../utils/masking.util';

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
 * - FAIL-SECURE: If cache is unavailable, tokens are rejected (security > availability)
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private readonly failSecure: boolean;

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Optional() @Inject(CacheService) private readonly cacheService?: CacheService,
    @Optional()
    @Inject(CircuitBreakerService)
    private readonly circuitBreaker?: CircuitBreakerService,
  ) {
    // Fail-secure by default in production (security > availability)
    // Can be disabled via config for development/testing
    this.failSecure = this.configService.get<boolean>(
      'SECURITY_FAIL_SECURE',
      this.configService.get<string>('NODE_ENV') === 'production',
    );
  }

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
      // FAIL-SECURE: If cache check fails, reject the token
      if (payload.jti) {
        const revocationCheck = await this.checkTokenRevocation(payload.jti);
        const maskedJti = maskToken(payload.jti);

        if (revocationCheck.isRevoked && !revocationCheck.checkFailed) {
          // Token is explicitly revoked in cache
          this.logger.warn(`Revoked token used: ${maskedJti}`);
          throw new UnauthorizedException('Token has been revoked');
        }

        if (revocationCheck.checkFailed) {
          // Cache check failed - fail-secure behavior applies
          if (this.failSecure) {
            this.logger.warn(
              `Token revocation check failed for ${maskedJti} - rejecting due to fail-secure policy`,
            );
            throw new UnauthorizedException('Unable to verify token status');
          } else {
            // Non-production: Log warning but allow token (for development/testing)
            this.logger.warn(
              `Token revocation check failed for ${maskedJti} - allowing due to fail-open policy (non-production)`,
            );
          }
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

  /**
   * Check if a token has been revoked using cache with circuit breaker
   *
   * FAIL-SECURE Pattern (Issue #468):
   * - If cache is unavailable, returns { isRevoked: true, checkFailed: true }
   * - Cache errors result in token rejection for security
   * - Circuit breaker prevents repeated failures from overwhelming the system
   * - JTI is masked in logs to prevent sensitive data exposure
   *
   * Security consideration: We fail-secure (reject token) on cache errors
   * because accepting a potentially revoked token is a greater security
   * risk than temporarily rejecting valid tokens during cache outages.
   *
   * @param jti - JWT ID to check
   * @returns Object with isRevoked status and whether the check succeeded
   */
  private async checkTokenRevocation(
    jti: string,
  ): Promise<{ isRevoked: boolean; checkFailed: boolean }> {
    const maskedJti = maskToken(jti);

    // If no cache service, we can't check revocation - FAIL-SECURE
    if (!this.cacheService) {
      this.logger.warn(
        `No cache service available for revocation check, failing secure for JTI ${maskedJti}`,
      );
      return { isRevoked: true, checkFailed: true };
    }

    try {
      // Use circuit breaker if available
      if (this.circuitBreaker) {
        const isRevoked = await this.circuitBreaker.execute(
          {
            name: 'token-revocation-check',
            failureThreshold: 3,
            successThreshold: 2,
            resetTimeoutMs: 10000, // 10 seconds
          },
          async () => {
            return this.cacheService!.isTokenRevoked(jti);
          },
        );
        return { isRevoked, checkFailed: false };
      }

      // Direct cache check without circuit breaker
      const isRevoked = await this.cacheService.isTokenRevoked(jti);
      return { isRevoked, checkFailed: false };
    } catch (error) {
      // FAIL-SECURE: Cache error = token rejected (Issue #468)
      // Log with masked JTI to prevent sensitive data exposure
      this.logger.error(
        `Cache lookup failed for JTI ${maskedJti}, failing secure: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return { isRevoked: true, checkFailed: true };
    }
  }
}
