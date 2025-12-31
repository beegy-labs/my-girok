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
import * as crypto from 'crypto';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * API Key Guard for service-to-service authentication
 * Validates X-API-Key header against configured keys
 *
 * Security:
 * - Uses timing-safe comparison to prevent timing attacks
 * - Stores hashed keys in memory for comparison
 * - Supports runtime key reload via ConfigService
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);
  private apiKeyHashes: Set<string> = new Set(); // Store only hashes, never original keys
  private lastRefresh: number = 0;
  private readonly cacheTtlMs: number = 60000; // 1 minute cache

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    this.refreshKeys();
  }

  /**
   * Hash an API key using SHA-256
   */
  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Timing-safe comparison of two strings
   */
  private timingSafeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      // Still do the comparison to maintain constant time
      const dummy = Buffer.alloc(32);
      crypto.timingSafeEqual(dummy, dummy);
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  /**
   * Refresh API keys from configuration
   * Called automatically when cache expires or manually via invalidateCache()
   */
  private refreshKeys(): void {
    const keysFromConfig = this.configService.get<string>('API_KEYS');
    const keysFromEnv = process.env.API_KEYS;
    const isProduction = process.env.NODE_ENV === 'production';

    // Prefer ConfigService, fallback to env
    const keysString = keysFromConfig || keysFromEnv || '';
    const keys = keysString
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    // Store only hashed keys (never store original keys in memory)
    this.apiKeyHashes = new Set();
    for (const key of keys) {
      const hash = this.hashKey(key);
      this.apiKeyHashes.add(hash);
    }
    this.lastRefresh = Date.now();

    if (keys.length === 0) {
      if (isProduction) {
        throw new Error('API_KEYS is required in production. Set comma-separated API keys.');
      }
      this.logger.warn('No API keys configured - all API key authenticated routes will fail');
    } else {
      this.logger.debug(`Loaded ${keys.length} API key(s)`);
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

  /**
   * Validate API key using timing-safe comparison
   */
  private validateApiKey(apiKey: string): boolean {
    const inputHash = this.hashKey(apiKey);

    // Iterate through all stored hashes with timing-safe comparison
    for (const storedHash of this.apiKeyHashes) {
      if (this.timingSafeCompare(inputHash, storedHash)) {
        return true;
      }
    }
    return false;
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

    if (!this.validateApiKey(apiKey)) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
