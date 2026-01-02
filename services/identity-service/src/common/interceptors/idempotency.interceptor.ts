import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
  ConflictException,
  SetMetadata,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { CacheService } from '../cache';
import { CACHE_KEYS } from '../cache/cache-ttl.constants';
import { IdentityPrismaService } from '../../database/identity-prisma.service';

/**
 * Idempotency key header (IETF draft-ietf-httpapi-idempotency-key-header)
 */
export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';

/**
 * Decorator to mark endpoints as idempotent
 * Use on POST/PATCH endpoints that should support idempotency
 */
export const IDEMPOTENT_KEY = 'isIdempotent';
export const Idempotent = () => SetMetadata(IDEMPOTENT_KEY, true);

/**
 * Decorator to set custom TTL for idempotency (in seconds)
 */
export const IDEMPOTENT_TTL_KEY = 'idempotentTtl';
export const IdempotentTtl = (ttlSeconds: number) => SetMetadata(IDEMPOTENT_TTL_KEY, ttlSeconds);

/**
 * Cached response structure
 */
interface CachedResponse {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
  createdAt: number;
}

/**
 * Idempotency Interceptor
 *
 * Implements idempotency for POST/PATCH endpoints per IETF draft-ietf-httpapi-idempotency-key-header.
 *
 * Features:
 * - Validates Idempotency-Key format (UUID v4/v7 or custom format)
 * - Returns cached response for duplicate requests
 * - Prevents concurrent execution of same idempotency key
 * - Configurable TTL (default: 24 hours)
 *
 * Usage:
 * ```typescript
 * @Post('register')
 * @Idempotent()
 * async register(@Body() dto: RegisterDto) { ... }
 * ```
 *
 * Client must send:
 * ```
 * Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
 * ```
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);
  private readonly defaultTtlMs = 24 * 60 * 60 * 1000; // 24 hours
  private readonly lockTtlMs = 30 * 1000; // 30 seconds for in-flight requests

  constructor(
    private readonly reflector: Reflector,
    private readonly cacheService: CacheService,
    @Optional() private readonly prisma?: IdentityPrismaService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    // Check if endpoint is marked as idempotent
    const isIdempotent = this.reflector.getAllAndOverride<boolean>(IDEMPOTENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isIdempotent) {
      return next.handle();
    }

    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Get idempotency key from header
    const idempotencyKey = request.headers[IDEMPOTENCY_KEY_HEADER.toLowerCase()] as string;

    if (!idempotencyKey) {
      // Idempotency key is optional but recommended for mutating operations
      return next.handle();
    }

    // Validate idempotency key format (UUID or alphanumeric up to 64 chars)
    if (!this.isValidIdempotencyKey(idempotencyKey)) {
      throw new ConflictException(
        'Invalid Idempotency-Key format. Must be UUID or alphanumeric string (max 64 chars)',
      );
    }

    // Generate cache key with request context for additional safety
    const cacheKey = this.generateCacheKey(request, idempotencyKey);
    const lockKey = `lock:${cacheKey}`;
    const fingerprint = this.generateFingerprint(request);

    // Get custom TTL if set (moved up to be available earlier)
    const customTtlSeconds = this.reflector.getAllAndOverride<number>(IDEMPOTENT_TTL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const ttlMs = customTtlSeconds ? customTtlSeconds * 1000 : this.defaultTtlMs;

    // Check for existing cached response (cache first, then database fallback)
    let cached = await this.cacheService.get<CachedResponse>(cacheKey);

    // If not in cache, check database
    if (!cached && this.prisma) {
      const dbRecord = await this.findInDatabase(idempotencyKey, fingerprint);
      if (dbRecord) {
        cached = dbRecord;
        // Re-populate cache if found in database
        await this.cacheService.set(cacheKey, cached, ttlMs);
      }
    }

    if (cached) {
      this.logger.debug(`Returning cached response for idempotency key: ${idempotencyKey}`);

      // Set headers to indicate cached response
      response.setHeader('Idempotency-Replayed', 'true');
      for (const [key, value] of Object.entries(cached.headers)) {
        if (!['content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
          response.setHeader(key, value);
        }
      }
      response.status(cached.statusCode);

      return of(cached.body);
    }

    // Check for in-flight request (concurrent duplicate)
    const isLocked = await this.cacheService.get<boolean>(lockKey);
    if (isLocked) {
      throw new ConflictException(
        'Request with this Idempotency-Key is currently being processed. Please retry later.',
      );
    }

    // Acquire lock for this idempotency key
    await this.cacheService.set(lockKey, true, this.lockTtlMs);

    return next.handle().pipe(
      tap({
        next: async (data) => {
          // Cache successful response
          try {
            const cachedResponse: CachedResponse = {
              statusCode: response.statusCode,
              body: data,
              headers: this.extractResponseHeaders(response),
              createdAt: Date.now(),
            };

            // Save to cache
            await this.cacheService.set(cacheKey, cachedResponse, ttlMs);

            // Persist to database for reliability
            await this.saveToDatabase(idempotencyKey, fingerprint, cachedResponse, ttlMs);

            this.logger.debug(`Cached response for idempotency key: ${idempotencyKey}`);
          } catch (error) {
            this.logger.warn(`Failed to cache idempotent response: ${error}`);
          } finally {
            // Release lock
            await this.cacheService.del(lockKey);
          }
        },
        error: async (_error) => {
          // Release lock on error (don't cache errors)
          await this.cacheService.del(lockKey);
          this.logger.debug(`Released lock for failed idempotency key: ${idempotencyKey}`);
        },
      }),
    );
  }

  /**
   * Validate idempotency key format
   * Accepts UUID v4/v7 or alphanumeric string up to 64 chars
   */
  private isValidIdempotencyKey(key: string): boolean {
    if (!key || key.length > 64) {
      return false;
    }

    // UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(key)) {
      return true;
    }

    // Alphanumeric with dashes/underscores
    const alphanumericRegex = /^[a-zA-Z0-9_-]+$/;
    return alphanumericRegex.test(key);
  }

  /**
   * Generate cache key from request and idempotency key
   * Includes method and path for additional safety
   */
  private generateCacheKey(request: Request, idempotencyKey: string): string {
    // Create fingerprint from method + path + body hash
    const bodyHash = this.hashBody(request.body);
    const fingerprint = `${request.method}:${request.path}:${bodyHash}`;

    return CACHE_KEYS.IDEMPOTENCY(`${idempotencyKey}:${fingerprint}`);
  }

  /**
   * Create deterministic hash of request body
   */
  private hashBody(body: unknown): string {
    if (!body || Object.keys(body as object).length === 0) {
      return 'empty';
    }

    // Sort keys for deterministic hashing
    const sorted = JSON.stringify(body, Object.keys(body as object).sort());
    return crypto.createHash('sha256').update(sorted).digest('hex').substring(0, 16);
  }

  /**
   * Extract cacheable headers from response
   */
  private extractResponseHeaders(response: Response): Record<string, string> {
    const headers: Record<string, string> = {};
    const allowedHeaders = ['content-type', 'x-request-id', 'x-correlation-id'];

    for (const header of allowedHeaders) {
      const value = response.getHeader(header);
      if (value) {
        headers[header] = String(value);
      }
    }

    return headers;
  }

  /**
   * Generate request fingerprint for database lookup
   */
  private generateFingerprint(request: Request): string {
    const bodyHash = this.hashBody(request.body);
    return crypto
      .createHash('sha256')
      .update(`${request.method}:${request.path}:${bodyHash}`)
      .digest('hex')
      .substring(0, 128);
  }

  /**
   * Find idempotency record in database
   * Note: Requires IdempotencyRecord model in Prisma schema
   */
  private async findInDatabase(
    idempotencyKey: string,
    fingerprint: string,
  ): Promise<CachedResponse | null> {
    if (!this.prisma) {
      return null;
    }

    try {
      // Check if idempotencyRecord model exists in Prisma client
      const prismaAny = this.prisma as unknown as Record<string, unknown>;
      if (!prismaAny.idempotencyRecord) {
        return null;
      }

      const record = await (
        prismaAny.idempotencyRecord as {
          findUnique: (args: unknown) => Promise<{
            responseStatus: number;
            responseBody: unknown;
            responseHeaders: Record<string, string>;
            createdAt: Date;
            expiresAt: Date;
          } | null>;
        }
      ).findUnique({
        where: {
          idempotencyKey_requestFingerprint: {
            idempotencyKey,
            requestFingerprint: fingerprint,
          },
        },
      });

      if (!record || record.expiresAt < new Date()) {
        return null;
      }

      return {
        statusCode: record.responseStatus,
        body: record.responseBody,
        headers: record.responseHeaders as Record<string, string>,
        createdAt: record.createdAt.getTime(),
      };
    } catch (error) {
      this.logger.warn(`Failed to find idempotency record in database: ${error}`);
      return null;
    }
  }

  /**
   * Save idempotency record to database
   * Note: Requires IdempotencyRecord model in Prisma schema
   */
  private async saveToDatabase(
    idempotencyKey: string,
    fingerprint: string,
    response: CachedResponse,
    ttlMs: number,
  ): Promise<void> {
    if (!this.prisma) {
      return;
    }

    try {
      // Check if idempotencyRecord model exists in Prisma client
      const prismaAny = this.prisma as unknown as Record<string, unknown>;
      if (!prismaAny.idempotencyRecord) {
        return;
      }

      const expiresAt = new Date(Date.now() + ttlMs);

      await (
        prismaAny.idempotencyRecord as {
          upsert: (args: unknown) => Promise<unknown>;
        }
      ).upsert({
        where: {
          idempotencyKey_requestFingerprint: {
            idempotencyKey,
            requestFingerprint: fingerprint,
          },
        },
        update: {
          responseStatus: response.statusCode,
          responseBody: response.body as object,
          responseHeaders: response.headers,
          expiresAt,
        },
        create: {
          idempotencyKey,
          requestFingerprint: fingerprint,
          responseStatus: response.statusCode,
          responseBody: response.body as object,
          responseHeaders: response.headers,
          expiresAt,
        },
      });
    } catch (error) {
      // Database persistence is best-effort, don't fail the request
      this.logger.warn(`Failed to persist idempotency record to database: ${error}`);
    }
  }
}
