import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
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
 * Validates JWT tokens from Authorization header
 *
 * Note: In production, this should verify tokens against the auth-service
 * or use a shared JWT secret/public key for verification
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

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
   * Verify JWT token
   * In production, this should:
   * 1. Verify signature using public key or shared secret
   * 2. Check token expiration
   * 3. Validate issuer and audience
   * 4. Optionally check against token blacklist
   */
  private async verifyToken(token: string): Promise<JwtPayload> {
    // Split JWT into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token structure');
    }

    // Decode payload (middle part)
    const payloadBase64 = parts[1];
    const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson) as JwtPayload;

    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      throw new Error('Token expired');
    }

    // In production, verify signature here
    // For internal service communication, you might also:
    // - Validate against auth-service
    // - Check session validity
    // - Verify token hasn't been revoked

    return payload;
  }
}
