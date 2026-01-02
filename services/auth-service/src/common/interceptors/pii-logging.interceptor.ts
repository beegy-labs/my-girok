import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  maskEmail,
  maskPhone,
  maskIpAddress,
  maskObject as maskPiiFields,
} from '@my-girok/nest-common';

/**
 * PiiLoggingInterceptor masks PII in request/response logs.
 *
 * This interceptor:
 * 1. Intercepts incoming requests
 * 2. Masks PII in request body, query params, and headers
 * 3. Logs sanitized request information
 * 4. Masks PII in response data before logging
 *
 * Usage: Apply globally or to specific controllers.
 *
 * @example
 * // Global application
 * app.useGlobalInterceptors(new PiiLoggingInterceptor());
 *
 * // Controller-level
 * @UseInterceptors(PiiLoggingInterceptor)
 * @Controller('users')
 * export class UsersController {}
 */
@Injectable()
export class PiiLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('PiiLoggingInterceptor');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, query, ip } = request;

    // Mask PII in request data for logging
    const maskedBody = body ? this.maskRequestBody(body) : undefined;
    const maskedQuery = query ? this.maskQueryParams(query) : undefined;
    const maskedIp = maskIpAddress(ip);

    // Log sanitized request (debug level)
    this.logger.debug({
      message: 'Incoming request',
      method,
      url,
      ip: maskedIp,
      body: maskedBody,
      query: maskedQuery,
    });

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (response) => {
          const duration = Date.now() - startTime;
          this.logger.debug({
            message: 'Request completed',
            method,
            url,
            duration: `${duration}ms`,
            responseType: Array.isArray(response) ? 'array' : typeof response,
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.debug({
            message: 'Request failed',
            method,
            url,
            duration: `${duration}ms`,
            error: error.message,
          });
        },
      }),
    );
  }

  private maskRequestBody(body: Record<string, unknown>): Record<string, unknown> {
    if (typeof body !== 'object' || body === null) {
      return body;
    }
    return maskPiiFields(body);
  }

  private maskQueryParams(query: Record<string, unknown>): Record<string, unknown> {
    if (typeof query !== 'object' || query === null) {
      return query;
    }

    const masked: Record<string, unknown> = { ...query };

    if ('email' in masked && typeof masked.email === 'string') {
      masked.email = maskEmail(masked.email);
    }
    if ('phone' in masked && typeof masked.phone === 'string') {
      masked.phone = maskPhone(masked.phone);
    }

    return masked;
  }
}
