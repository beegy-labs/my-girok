import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

/**
 * RFC 7807 Problem Details response format
 * @see https://www.rfc-editor.org/rfc/rfc7807
 */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  correlationId?: string;
  timestamp?: string;
  errors?: Array<{
    field?: string;
    message: string;
    code?: string;
  }>;
}

/**
 * Global HTTP Exception Filter
 * Converts all exceptions to RFC 7807 Problem Details format
 */
@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  private readonly errorTypeMap: Record<number, string> = {
    400: 'https://api.girok.dev/errors/bad-request',
    401: 'https://api.girok.dev/errors/unauthorized',
    403: 'https://api.girok.dev/errors/forbidden',
    404: 'https://api.girok.dev/errors/not-found',
    405: 'https://api.girok.dev/errors/method-not-allowed',
    409: 'https://api.girok.dev/errors/conflict',
    422: 'https://api.girok.dev/errors/unprocessable-entity',
    429: 'https://api.girok.dev/errors/too-many-requests',
    500: 'https://api.girok.dev/errors/internal-server-error',
    502: 'https://api.girok.dev/errors/bad-gateway',
    503: 'https://api.girok.dev/errors/service-unavailable',
    504: 'https://api.girok.dev/errors/gateway-timeout',
  };

  private readonly titleMap: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  };

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, problemDetails } = this.buildProblemDetails(exception, request);

    // Log error with appropriate level
    if (status >= 500) {
      this.logger.error(
        {
          event: 'http_error',
          status,
          path: request.url,
          method: request.method,
          correlationId: problemDetails.correlationId,
          error: exception instanceof Error ? exception.message : String(exception),
        },
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (status >= 400) {
      this.logger.warn({
        event: 'http_client_error',
        status,
        path: request.url,
        method: request.method,
        correlationId: problemDetails.correlationId,
        error: problemDetails.detail,
      });
    }

    response
      .status(status)
      .setHeader('Content-Type', 'application/problem+json')
      .json(problemDetails);
  }

  private buildProblemDetails(
    exception: unknown,
    request: Request,
  ): { status: number; problemDetails: ProblemDetails } {
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let detail = 'An unexpected error occurred';
    let errors: ProblemDetails['errors'];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        detail = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as Record<string, unknown>;
        detail = (resp.message as string) || (resp.error as string) || detail;

        // Handle validation errors
        if (Array.isArray(resp.message)) {
          errors = this.formatValidationErrors(resp.message);
          detail = 'Validation failed for one or more fields';
        }
      }
    } else if (exception instanceof Error) {
      // Don't expose internal error details in production
      const isProduction = process.env.NODE_ENV === 'production';
      detail = isProduction ? 'An unexpected error occurred' : exception.message;
    }

    const correlationId =
      (request as Request & { correlationId?: string }).correlationId ||
      (request.headers['x-correlation-id'] as string) ||
      (request.headers['x-request-id'] as string);

    const problemDetails: ProblemDetails = {
      type: this.errorTypeMap[status] || 'https://api.girok.dev/errors/unknown',
      title: this.titleMap[status] || 'Error',
      status,
      detail,
      instance: request.url,
      correlationId,
      timestamp: new Date().toISOString(),
    };

    if (errors && errors.length > 0) {
      problemDetails.errors = errors;
    }

    return { status, problemDetails };
  }

  private formatValidationErrors(
    messages: unknown[],
  ): Array<{ field?: string; message: string; code?: string }> {
    return messages.map((msg) => {
      if (typeof msg === 'string') {
        return { message: msg };
      }
      if (typeof msg === 'object' && msg !== null) {
        const obj = msg as Record<string, unknown>;
        return {
          field: obj.field as string | undefined,
          message: this.extractConstraintMessage(obj.constraints),
          code: 'VALIDATION_ERROR',
        };
      }
      return { message: String(msg) };
    });
  }

  private extractConstraintMessage(constraints: unknown): string {
    if (!constraints || typeof constraints !== 'object') {
      return 'Invalid value';
    }
    const messages = Object.values(constraints as Record<string, string>);
    return messages.join(', ');
  }
}
