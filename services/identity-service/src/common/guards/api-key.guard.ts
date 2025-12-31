import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  SetMetadata,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * API Key Guard for service-to-service authentication
 * Validates X-API-Key header against configured keys
 *
 * Features:
 * - Supports runtime key reload via ConfigService
 * - Caches keys with TTL for performance
 * - Allows manual cache invalidation
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);
  private validApiKeys: Set<string> = new Set();
  private lastRefresh: number = 0;
  private readonly cacheTtlMs: number = 60000; // 1 minute cache

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    this.refreshKeys();
  }

  /**
   * Refresh API keys from configuration
   * Called automatically when cache expires or manually via invalidateCache()
   */
  private refreshKeys(): void {
    const keysFromConfig = this.configService.get<string>('API_KEYS', '');
    const keysFromEnv = process.env.API_KEYS || '';

    // Prefer ConfigService, fallback to env
    const keysString = keysFromConfig || keysFromEnv;
    const keys = keysString
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    this.validApiKeys = new Set(keys);
    this.lastRefresh = Date.now();

    if (keys.length === 0) {
      this.logger.warn('No API keys configured - all API key authenticated routes will fail');
    } else {
      this.logger.debug(`Loaded ${keys.length} API keys`);
    }
  }

  /**
   * Check if cache needs refresh
   */
  private shouldRefresh(): boolean {
    return Date.now() - this.lastRefresh > this.cacheTtlMs;
  }

  /**
   * Invalidate the API key cache to force reload
   * Can be called externally when keys are updated
   */
  invalidateCache(): void {
    this.lastRefresh = 0;
    this.logger.log('API key cache invalidated');
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

    // Refresh keys if cache expired
    if (this.shouldRefresh()) {
      this.refreshKeys();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const apiKeyHeader = request.headers['x-api-key'];
    const apiKey = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    if (!this.validApiKeys.has(apiKey)) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
