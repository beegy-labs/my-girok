import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Response } from 'express';
import { RateLimitHeaders, RATE_LIMIT_METADATA } from './rate-limit.config';

/**
 * Interceptor that adds standard rate limit headers to HTTP responses.
 *
 * Works for BOTH successful responses AND error responses (including 429).
 *
 * Headers follow IETF RateLimit Fields draft standard:
 * @see https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/
 *
 * Adds the following headers:
 * - RateLimit-Limit: Maximum requests allowed per window
 * - RateLimit-Remaining: Requests remaining in current window
 * - RateLimit-Reset: Delta seconds until the rate limit window resets
 * - RateLimit-Policy: Rate limit policy (limit;w=windowSeconds)
 * - Retry-After: Seconds until the rate limit resets (when limit exceeded or remaining is 0)
 *
 * @example
 * ```typescript
 * // Global registration in app.module.ts
 * @Module({
 *   providers: [
 *     {
 *       provide: APP_INTERCEPTOR,
 *       useClass: RateLimitHeadersInterceptor,
 *     },
 *   ],
 * })
 * export class AppModule {}
 *
 * // Or use with specific controller
 * @UseInterceptors(RateLimitHeadersInterceptor)
 * @Controller('api')
 * export class ApiController {}
 * ```
 */
@Injectable()
export class RateLimitHeadersInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const response = httpContext.getResponse<Response>();
    const request = httpContext.getRequest();

    /**
     * Sets rate limit headers on the response.
     * Called for both success and error scenarios.
     * Uses try-catch to handle race condition with headersSent.
     */
    const setRateLimitHeaders = (): void => {
      try {
        // Skip if headers already sent
        if (response.headersSent) {
          return;
        }

        const limit = (request as Record<string, unknown>)[RATE_LIMIT_METADATA.LIMIT] as
          | number
          | undefined;
        const ttl = (request as Record<string, unknown>)[RATE_LIMIT_METADATA.TTL] as
          | number
          | undefined;
        const hits = (request as Record<string, unknown>)[RATE_LIMIT_METADATA.HITS] as
          | number
          | undefined;
        // Use actual TTL from Redis if available, otherwise fall back to configured TTL
        const timeToExpire = (request as Record<string, unknown>)[
          RATE_LIMIT_METADATA.TIME_TO_EXPIRE
        ] as number | undefined;

        // Validate required values exist and TTL is positive
        if (limit === undefined || ttl === undefined || ttl <= 0) {
          return;
        }

        // Calculate remaining requests (use hits if available, otherwise estimate)
        const currentHits = hits ?? 1;
        const remaining = Math.max(0, limit - currentHits);

        // Use actual time to expire from Redis for accurate reset time
        // Falls back to configured TTL if Redis TTL is not available
        const actualTtl = timeToExpire !== undefined && timeToExpire > 0 ? timeToExpire : ttl;
        // IETF spec: RateLimit-Reset uses delta seconds (not Unix timestamp)
        const resetTimeSeconds = Math.ceil(actualTtl / 1000);
        const retryAfterSeconds = Math.ceil(actualTtl / 1000);

        // Set standard rate limit headers per IETF spec
        response.setHeader(RateLimitHeaders.LIMIT, String(limit));
        response.setHeader(RateLimitHeaders.REMAINING, String(remaining));
        response.setHeader(RateLimitHeaders.RESET, String(resetTimeSeconds));
        // RateLimit-Policy header format: limit;w=windowSeconds
        response.setHeader(RateLimitHeaders.POLICY, `${limit};w=${Math.ceil(ttl / 1000)}`);

        // Set Retry-After when rate limit is exhausted, exceeded, or on 429 response
        if (remaining === 0 || response.statusCode === 429) {
          response.setHeader(RateLimitHeaders.RETRY_AFTER, String(retryAfterSeconds));
        }
      } catch {
        // Headers already sent or other error - ignore silently
      }
    };

    return next.handle().pipe(
      // Set headers on successful response
      tap(() => {
        setRateLimitHeaders();
      }),
      // Also set headers on error response (including 429 Too Many Requests)
      catchError((error: Error) => {
        setRateLimitHeaders();
        return throwError(() => error);
      }),
    );
  }
}

/**
 * Custom ThrottlerGuard that sets rate limit metadata for the interceptor
 * and adds Retry-After header when limit is exceeded.
 *
 * This extends the default @nestjs/throttler guard to provide rate limit
 * headers even on successful requests.
 *
 * @example
 * ```typescript
 * // Replace the default guard in app.module.ts
 * @Module({
 *   providers: [
 *     {
 *       provide: APP_GUARD,
 *       useClass: RateLimitGuard,
 *     },
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
// Re-export from config for backward compatibility
export { RateLimitHeaders, RATE_LIMIT_METADATA } from './rate-limit.config';
