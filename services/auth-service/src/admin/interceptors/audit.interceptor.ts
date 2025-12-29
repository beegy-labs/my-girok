import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ID } from '@my-girok/nest-common';

// Sensitive keys to redact from logs
const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'authorization',
  'refreshToken',
  'accessToken',
  'creditCard',
  'ssn',
  'socialSecurityNumber',
];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();
    const requestId = ID.generate();

    // Set request ID for correlation
    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);

    // Log request body (sanitized) for mutations
    const shouldLogBody = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
    const sanitizedBody =
      shouldLogBody && request.body && Object.keys(request.body).length > 0
        ? this.sanitizeBody(request.body)
        : undefined;

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        // Log for API audit
        this.logger.log({
          message: `API: ${request.method} ${request.path}`,
          'log.type': 'api_log',
          'http.request_id': requestId,
          'http.method': request.method,
          'http.path': request.path,
          'http.path_template': this.getPathTemplate(context),
          'http.path_params': this.sanitizeParams(request.params),
          'http.query_params': this.sanitizeParams(request.query),
          'http.status_code': statusCode,
          'http.response_time_ms': duration,
          'http.response_body_size': JSON.stringify(data || {}).length,
          'http.request_body': sanitizedBody,
          'actor.id': request.user?.sub || request.admin?.sub,
          'actor.type': request.user?.type || 'admin',
          'actor.email': request.user?.email || request.admin?.email,
          'service.id': request.params?.serviceId,
          'session.id': request.headers['x-session-id'],
          'ui.event_id': request.headers['x-ui-event-id'],
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;

        this.logger.error({
          message: `API Error: ${request.method} ${request.path}`,
          'log.type': 'api_log',
          'http.request_id': requestId,
          'http.method': request.method,
          'http.path': request.path,
          'http.path_template': this.getPathTemplate(context),
          'http.status_code': error.status || 500,
          'http.response_time_ms': duration,
          'http.request_body': sanitizedBody,
          'error.type': error.name,
          'error.message': error.message,
          'actor.id': request.user?.sub || request.admin?.sub,
          'actor.type': request.user?.type || 'admin',
        });

        throw error;
      }),
    );
  }

  private getPathTemplate(context: ExecutionContext): string {
    const handler = context.getHandler();
    const controller = context.getClass();
    const controllerPath = Reflect.getMetadata('path', controller) || '';
    const handlerPath = Reflect.getMetadata('path', handler) || '';
    return `/${controllerPath}/${handlerPath}`.replace(/\/+/g, '/');
  }

  private sanitizeParams(params: Record<string, unknown>): string {
    if (!params || Object.keys(params).length === 0) {
      return '';
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
      if (this.isSensitiveKey(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return JSON.stringify(sanitized);
  }

  private sanitizeBody(body: Record<string, unknown>): string {
    const sanitized = this.sanitizeRecursive(body);
    const result = JSON.stringify(sanitized);
    // Limit body size in logs
    return result.length > 4000 ? result.substring(0, 4000) + '...' : result;
  }

  private sanitizeRecursive(obj: unknown): unknown {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeRecursive(item));
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (this.isSensitiveKey(key)) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.sanitizeRecursive(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  private isSensitiveKey(key: string): boolean {
    const lowerKey = key.toLowerCase();
    return SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive.toLowerCase()));
  }
}
