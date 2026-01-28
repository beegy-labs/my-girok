import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '.prisma/mail-client';

interface PrismaErrorResponse {
  statusCode: number;
  message: string;
  error: string;
}

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaClientExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const { code, meta } = exception;

    this.logger.error(`Prisma error: ${code} - ${exception.message}`, exception.stack);

    const errorResponse = this.getErrorResponse(code, meta);
    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private getErrorResponse(code: string, meta?: Record<string, unknown>): PrismaErrorResponse {
    switch (code) {
      case 'P2000':
        // Value too long for column
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: `Value too long for field: ${meta?.column_name ?? 'unknown'}`,
          error: 'Bad Request',
        };

      case 'P2001':
        // Record not found
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'The requested record was not found',
          error: 'Not Found',
        };

      case 'P2002':
        // Unique constraint violation
        const target = meta?.target as string[] | undefined;
        return {
          statusCode: HttpStatus.CONFLICT,
          message: `A record with this ${target?.join(', ') ?? 'value'} already exists`,
          error: 'Conflict',
        };

      case 'P2003':
        // Foreign key constraint violation
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Referenced record does not exist',
          error: 'Bad Request',
        };

      case 'P2025':
        // Record not found for operation
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: meta?.cause?.toString() ?? 'Record to update/delete not found',
          error: 'Not Found',
        };

      default:
        this.logger.warn(`Unhandled Prisma error code: ${code}`);
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'An unexpected database error occurred',
          error: 'Internal Server Error',
        };
    }
  }
}

@Catch(Prisma.PrismaClientValidationError)
export class PrismaValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaValidationExceptionFilter.name);

  catch(exception: Prisma.PrismaClientValidationError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.error(`Prisma validation error: ${exception.message}`, exception.stack);

    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Invalid data provided',
      error: 'Bad Request',
    });
  }
}

@Catch(Prisma.PrismaClientInitializationError)
export class PrismaInitializationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaInitializationExceptionFilter.name);

  catch(exception: Prisma.PrismaClientInitializationError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.error(`Prisma initialization error: ${exception.message}`, exception.stack);

    response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: 'Database service is currently unavailable',
      error: 'Service Unavailable',
    });
  }
}
