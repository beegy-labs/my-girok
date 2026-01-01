import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

export interface RequestContext {
  requestId: string;
  correlationId: string;
  timestamp: Date;
  path: string;
  method: string;
  userAgent?: string;
  ip?: string;
  accountId?: string;
}

declare global {
  namespace Express {
    interface Request {
      context?: RequestContext;
    }
  }
}

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestContextInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const startTime = Date.now();

    // Generate or use existing request/correlation IDs
    const requestId = (request.headers['x-request-id'] as string) ?? randomUUID();
    const correlationId = (request.headers['x-correlation-id'] as string) ?? requestId;

    // Build request context
    const requestContext: RequestContext = {
      requestId,
      correlationId,
      timestamp: new Date(),
      path: request.path,
      method: request.method,
      userAgent: request.headers['user-agent'],
      ip: this.getClientIp(request),
      accountId: (request as unknown as { user?: { id?: string } }).user?.id,
    };

    // Attach context to request for use in handlers
    request.context = requestContext;

    // Set response headers
    response.setHeader('X-Request-Id', requestId);
    response.setHeader('X-Correlation-Id', correlationId);

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logRequest(requestContext, response.statusCode, duration);
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logRequest(requestContext, error.status ?? 500, duration, error.message);
        },
      }),
    );
  }

  private getClientIp(request: Request): string | undefined {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
      return ips?.trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    return request.ip ?? request.socket?.remoteAddress;
  }

  private logRequest(
    context: RequestContext,
    statusCode: number,
    durationMs: number,
    error?: string,
  ): void {
    const logData = {
      requestId: context.requestId,
      correlationId: context.correlationId,
      method: context.method,
      path: context.path,
      statusCode,
      durationMs,
      ip: context.ip,
      accountId: context.accountId,
      ...(error && { error }),
    };

    if (statusCode >= 500) {
      this.logger.error(JSON.stringify(logData));
    } else if (statusCode >= 400) {
      this.logger.warn(JSON.stringify(logData));
    } else {
      this.logger.log(JSON.stringify(logData));
    }
  }
}
