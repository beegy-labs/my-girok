import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import * as crypto from 'crypto';
import { TelemetryContext } from '../types/telemetry.types';

/**
 * Composite guard supporting both JWT and API key authentication
 * for telemetry gateway endpoints
 *
 * JWT mode (frontend clients):
 * - Authorization: Bearer <token>
 * - Extracts tenantId from JWT payload
 *
 * API Key mode (backend services):
 * - x-api-key: <key>
 * - x-tenant-id: <tenant-id>
 * - Uses timing-safe comparison to prevent timing attacks
 */
@Injectable()
export class TenantAuthGuard implements CanActivate {
  private readonly logger = new Logger(TenantAuthGuard.name);
  private apiKeyHashes: Set<string> = new Set();
  private lastRefresh: number = 0;
  private readonly cacheTtlMs: number = 60000; // 1 minute cache

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.refreshApiKeys();
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
      // Still do comparison to maintain constant time
      const dummy = Buffer.alloc(32);
      crypto.timingSafeEqual(dummy, dummy);
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  /**
   * Refresh API keys from configuration
   */
  private refreshApiKeys(): void {
    const keysString = this.configService.get<string>('telemetry.apiKeys', '');
    const keys = keysString
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    this.apiKeyHashes = new Set();
    for (const key of keys) {
      const hash = this.hashKey(key);
      this.apiKeyHashes.add(hash);
    }
    this.lastRefresh = Date.now();

    if (keys.length === 0) {
      this.logger.warn('No telemetry API keys configured');
    } else {
      this.logger.debug(`Loaded ${keys.length} telemetry API key(s)`);
    }
  }

  /**
   * Check if cache needs refresh
   */
  private shouldRefresh(): boolean {
    return Date.now() - this.lastRefresh > this.cacheTtlMs;
  }

  /**
   * Validate API key using timing-safe comparison
   */
  private validateApiKey(apiKey: string): boolean {
    const inputHash = this.hashKey(apiKey);

    for (const storedHash of this.apiKeyHashes) {
      if (this.timingSafeCompare(inputHash, storedHash)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Try JWT authentication
   */
  private async tryJwtAuth(request: Request): Promise<TelemetryContext | null> {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    try {
      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      if (!jwtSecret) {
        this.logger.error('JWT_SECRET not configured');
        return null;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: jwtSecret,
      });

      if (!payload || !payload.tenantId) {
        return null;
      }

      return {
        tenantId: payload.tenantId,
        userId: payload.sub,
        source: 'jwt',
        metadata: {
          email: payload.email,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.debug(`JWT validation failed: ${message}`);
      return null;
    }
  }

  /**
   * Try API key authentication
   */
  private async tryApiKeyAuth(request: Request): Promise<TelemetryContext | null> {
    const apiKeyHeader = request.headers['x-api-key'];
    const tenantIdHeader = request.headers['x-tenant-id'];

    if (!apiKeyHeader || !tenantIdHeader) {
      return null;
    }

    const apiKey = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;
    const tenantId = Array.isArray(tenantIdHeader) ? tenantIdHeader[0] : tenantIdHeader;

    if (!this.validateApiKey(apiKey)) {
      return null;
    }

    return {
      tenantId,
      source: 'api-key',
      metadata: {},
    };
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Refresh API keys if cache expired
    if (this.shouldRefresh()) {
      this.refreshApiKeys();
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { telemetryContext?: TelemetryContext }>();

    // Try JWT authentication first
    let telemetryContext = await this.tryJwtAuth(request);

    // If JWT failed, try API key authentication
    if (!telemetryContext) {
      telemetryContext = await this.tryApiKeyAuth(request);
    }

    // If both failed, reject
    if (!telemetryContext) {
      throw new UnauthorizedException('Valid JWT token or API key required');
    }

    // Attach telemetry context to request
    request.telemetryContext = telemetryContext;

    return true;
  }
}
