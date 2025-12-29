import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { metrics, Counter, Histogram, Meter } from '@opentelemetry/api';

/**
 * Shared meter instance for HTTP metrics
 */
const meter: Meter = metrics.getMeter('nest-common');

/**
 * HTTP request counter
 */
const httpRequestCounter: Counter = meter.createCounter('http_requests_total', {
  description: 'Total number of HTTP requests',
  unit: '1',
});

/**
 * HTTP request duration histogram
 */
const httpRequestDuration: Histogram = meter.createHistogram('http_request_duration_ms', {
  description: 'HTTP request duration in milliseconds',
  unit: 'ms',
});

/**
 * HTTP request size histogram
 */
const httpRequestSize: Histogram = meter.createHistogram('http_request_size_bytes', {
  description: 'HTTP request body size in bytes',
  unit: 'By',
});

/**
 * HTTP response size histogram
 */
const httpResponseSize: Histogram = meter.createHistogram('http_response_size_bytes', {
  description: 'HTTP response body size in bytes',
  unit: 'By',
});

/**
 * Active HTTP requests gauge (approximation using UpDownCounter)
 */
const activeRequests = meter.createUpDownCounter('http_requests_active', {
  description: 'Number of active HTTP requests',
  unit: '1',
});

/**
 * Interceptor that records HTTP metrics for each request.
 *
 * Metrics recorded:
 * - http_requests_total: Counter with method, route, status labels
 * - http_request_duration_ms: Histogram of request duration
 * - http_request_size_bytes: Histogram of request body size
 * - http_response_size_bytes: Histogram of response body size
 * - http_requests_active: Gauge of currently active requests
 *
 * @example
 * ```typescript
 * // Use globally
 * app.useGlobalInterceptors(new MetricsInterceptor());
 *
 * // Or per controller
 * @UseInterceptors(MetricsInterceptor)
 * @Controller('users')
 * export class UsersController {}
 * ```
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Get route template
    const controllerPath = Reflect.getMetadata('path', controller) || '';
    const handlerPath = Reflect.getMetadata('path', handler) || '';
    const route = `/${controllerPath}/${handlerPath}`.replace(/\/+/g, '/');

    const method = request.method;

    // Track active requests
    activeRequests.add(1, { method, route });

    // Record request size
    const contentLength = parseInt(request.headers['content-length'] || '0', 10);
    if (contentLength > 0) {
      httpRequestSize.record(contentLength, { method, route });
    }

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;
        const statusClass = `${Math.floor(statusCode / 100)}xx`;

        // Decrement active requests
        activeRequests.add(-1, { method, route });

        // Record request count
        httpRequestCounter.add(1, {
          method,
          route,
          status_code: statusCode.toString(),
          status_class: statusClass,
        });

        // Record duration
        httpRequestDuration.record(duration, {
          method,
          route,
          status_code: statusCode.toString(),
        });

        // Record response size
        const responseSize = JSON.stringify(data || {}).length;
        httpResponseSize.record(responseSize, {
          method,
          route,
          status_code: statusCode.toString(),
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = error.status || 500;
        const statusClass = `${Math.floor(statusCode / 100)}xx`;

        // Decrement active requests
        activeRequests.add(-1, { method, route });

        // Record request count with error status
        httpRequestCounter.add(1, {
          method,
          route,
          status_code: statusCode.toString(),
          status_class: statusClass,
        });

        // Record duration
        httpRequestDuration.record(duration, {
          method,
          route,
          status_code: statusCode.toString(),
        });

        throw error;
      }),
    );
  }
}

/**
 * Create a custom counter metric.
 *
 * @param name - Metric name
 * @param options - Metric options
 *
 * @example
 * ```typescript
 * const loginCounter = createCounter('auth_logins_total', {
 *   description: 'Total login attempts',
 * });
 *
 * loginCounter.add(1, { provider: 'google', success: 'true' });
 * ```
 */
export function createCounter(
  name: string,
  options?: { description?: string; unit?: string },
): Counter {
  return meter.createCounter(name, options);
}

/**
 * Create a custom histogram metric.
 *
 * @param name - Metric name
 * @param options - Metric options
 *
 * @example
 * ```typescript
 * const queryDuration = createHistogram('db_query_duration_ms', {
 *   description: 'Database query duration',
 *   unit: 'ms',
 * });
 *
 * const start = Date.now();
 * await db.query(...);
 * queryDuration.record(Date.now() - start, { table: 'users' });
 * ```
 */
export function createHistogram(
  name: string,
  options?: { description?: string; unit?: string },
): Histogram {
  return meter.createHistogram(name, options);
}

/**
 * Get the shared meter instance for creating custom metrics.
 */
export function getMeter(): Meter {
  return meter;
}
