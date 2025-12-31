import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () =>
  import('@nestjs/common').then((m) => m.SetMetadata(IS_PUBLIC_KEY, true));

/**
 * API Key Guard for service-to-service authentication
 * Validates X-API-Key header against configured keys
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly validApiKeys: Set<string>;

  constructor(private readonly reflector: Reflector) {
    // Load API keys from environment
    const keys = process.env.API_KEYS?.split(',').map((k) => k.trim()) || [];
    this.validApiKeys = new Set(keys);
  }

  canActivate(context: ExecutionContext): boolean {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    if (!this.validApiKeys.has(apiKey)) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
