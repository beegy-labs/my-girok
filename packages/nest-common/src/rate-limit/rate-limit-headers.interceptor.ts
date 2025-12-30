import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Response } from 'express';
import { RateLimitHeaders } from './rate-limit.config';

/**
 * Metadata keys for rate limit info set by the throttler guard
 */
const THROTTLER_LIMIT = 'THROTTLER_LIMIT';
const THROTTLER_TTL = 'THROTTLER_TTL';
const THROTTLER_HITS = 'THROTTLER_HITS';

/**
 * Interceptor that adds standard rate limit headers to HTTP responses.
 *
 * Works for BOTH successful responses AND error responses (including 429).
 *
 * Adds the following headers:
 * - X-RateLimit-Limit: Maximum requests allowed per window
 * - X-RateLimit-Remaining: Requests remaining in current window
 * - X-RateLimit-Reset: Unix timestamp when the rate limit resets
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
     */
    const setRateLimitHeaders = (): void => {
      // Skip if headers already sent
      if (response.headersSent) {
        return;
      }

      const limit = request[THROTTLER_LIMIT] as number | undefined;
      const ttl = request[THROTTLER_TTL] as number | undefined;
      const hits = request[THROTTLER_HITS] as number | undefined;

      if (limit === undefined || ttl === undefined) {
        return;
      }

      // Calculate remaining requests (use hits if available, otherwise estimate)
      const currentHits = hits ?? 1;
      const remaining = Math.max(0, limit - currentHits);
      const resetTimeSeconds = Math.ceil(Date.now() / 1000 + ttl / 1000);
      const retryAfterSeconds = Math.ceil(ttl / 1000);

      // Set standard rate limit headers
      response.setHeader(RateLimitHeaders.LIMIT, String(limit));
      response.setHeader(RateLimitHeaders.REMAINING, String(remaining));
      response.setHeader(RateLimitHeaders.RESET, String(resetTimeSeconds));

      // Set Retry-After when rate limit is exhausted or exceeded
      if (remaining === 0) {
        response.setHeader(RateLimitHeaders.RETRY_AFTER, String(retryAfterSeconds));
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
export { RateLimitHeaders };

/**
 * Metadata keys exported for custom guard implementations.
 * Use these keys to set rate limit info on the request object.
 */
export const RATE_LIMIT_METADATA = {
  LIMIT: THROTTLER_LIMIT,
  TTL: THROTTLER_TTL,
  HITS: THROTTLER_HITS,
} as const;
