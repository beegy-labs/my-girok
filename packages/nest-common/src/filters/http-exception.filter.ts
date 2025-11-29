import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '../types/error-response.interface';

/**
 * Global HTTP Exception Filter
 * Standardizes error responses across all services
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine status code and error details
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'Internal server error';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        errorCode = responseObj.error || this.getErrorCodeFromStatus(status);
        details = responseObj.details || responseObj.message;

        // Handle validation errors (class-validator)
        if (Array.isArray(responseObj.message)) {
          details = responseObj.message;
          message = 'Validation failed';
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`Uncaught exception: ${exception.message}`, exception.stack);
    } else {
      this.logger.error(`Unknown exception type: ${exception}`);
    }

    // Build standard error response
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: errorCode,
        message,
        ...(details && { details }),
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: request.url,
        statusCode: status,
      },
    };

    // Log error for monitoring
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${status} - ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} - ${status} - ${message}`,
      );
    }

    response.status(status).json(errorResponse);
  }

  /**
   * Map HTTP status code to error code string
   */
  private getErrorCodeFromStatus(status: number): string {
    const statusMap: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION_ERROR',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
    };

    return statusMap[status] || 'UNKNOWN_ERROR';
  }
}
