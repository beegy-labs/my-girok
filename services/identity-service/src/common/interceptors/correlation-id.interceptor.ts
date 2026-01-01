import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ID } from '@my-girok/nest-common';

/**
 * Correlation ID Interceptor
 * Adds correlation ID to all requests for distributed tracing
 * Follows OpenTelemetry trace context propagation patterns
 */
@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CorrelationIdInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Get or generate correlation ID
    const correlationId =
      request.headers['x-correlation-id'] || request.headers['x-request-id'] || ID.generate();

    // Set correlation ID on request for downstream use
    request.correlationId = correlationId;

    // Set correlation ID in response headers
    response.setHeader('X-Correlation-ID', correlationId);

    // Log request start
    const startTime = Date.now();
    const method = request.method;
    const url = request.url;
    const userAgent = request.headers['user-agent'] || 'unknown';

    this.logger.debug({
      event: 'request_start',
      correlationId,
      method,
      url,
      userAgent,
    });

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          this.logger.debug({
            event: 'request_end',
            correlationId,
            method,
            url,
            statusCode,
            duration,
          });
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;

          this.logger.warn({
            event: 'request_error',
            correlationId,
            method,
            url,
            duration,
            error: error.message,
          });
        },
      }),
    );
  }
}
