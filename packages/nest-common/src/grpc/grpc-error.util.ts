/**
 * gRPC Error Utilities
 *
 * Shared error handling utilities for gRPC services (server-side) and clients.
 *
 * Server-side utilities:
 * - handleGrpcError() - Convert HTTP/NestJS exceptions to gRPC RpcException
 * - httpStatusToGrpcStatus() - Map HTTP status codes to gRPC status codes
 *
 * Client-side utilities:
 * - normalizeGrpcError() - Normalize errors to consistent GrpcError format
 *
 * @example Server-side usage (gRPC controller):
 * ```typescript
 * import { handleGrpcError } from '@my-girok/nest-common';
 *
 * @GrpcMethod('MyService', 'GetResource')
 * async getResource(request: GetRequest): Promise<GetResponse> {
 *   try {
 *     return await this.service.findOne(request.id);
 *   } catch (error) {
 *     handleGrpcError('GetResource', error, this.logger);
 *   }
 * }
 * ```
 *
 * @example Client-side usage:
 * ```typescript
 * import { normalizeGrpcError } from '@my-girok/nest-common';
 *
 * try {
 *   await grpcClient.getResource({ id: '123' });
 * } catch (error) {
 *   const grpcError = normalizeGrpcError(error);
 *   if (grpcError.code === GrpcStatus.NOT_FOUND) {
 *     // Handle not found
 *   }
 * }
 * ```
 */

import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import {
  HttpException,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { GrpcError, isGrpcError } from './grpc.types';

export { GrpcError, isGrpcError };

// ============================================================================
// HTTP to gRPC Status Mapping
// ============================================================================

/**
 * Mapping of HTTP status codes to gRPC status codes
 * Based on: https://grpc.github.io/grpc/core/md_doc_statuscodes.html
 */
const HTTP_TO_GRPC_STATUS_MAP: Record<number, GrpcStatus> = {
  // Success
  [HttpStatus.OK]: GrpcStatus.OK,
  [HttpStatus.CREATED]: GrpcStatus.OK,
  [HttpStatus.ACCEPTED]: GrpcStatus.OK,
  [HttpStatus.NO_CONTENT]: GrpcStatus.OK,

  // Client Errors
  [HttpStatus.BAD_REQUEST]: GrpcStatus.INVALID_ARGUMENT,
  [HttpStatus.UNAUTHORIZED]: GrpcStatus.UNAUTHENTICATED,
  [HttpStatus.FORBIDDEN]: GrpcStatus.PERMISSION_DENIED,
  [HttpStatus.NOT_FOUND]: GrpcStatus.NOT_FOUND,
  [HttpStatus.METHOD_NOT_ALLOWED]: GrpcStatus.UNIMPLEMENTED,
  [HttpStatus.CONFLICT]: GrpcStatus.ALREADY_EXISTS,
  [HttpStatus.GONE]: GrpcStatus.NOT_FOUND,
  [HttpStatus.PRECONDITION_FAILED]: GrpcStatus.FAILED_PRECONDITION,
  [HttpStatus.PAYLOAD_TOO_LARGE]: GrpcStatus.OUT_OF_RANGE,
  [HttpStatus.UNPROCESSABLE_ENTITY]: GrpcStatus.INVALID_ARGUMENT,
  [HttpStatus.TOO_MANY_REQUESTS]: GrpcStatus.RESOURCE_EXHAUSTED,

  // Server Errors
  [HttpStatus.INTERNAL_SERVER_ERROR]: GrpcStatus.INTERNAL,
  [HttpStatus.NOT_IMPLEMENTED]: GrpcStatus.UNIMPLEMENTED,
  [HttpStatus.BAD_GATEWAY]: GrpcStatus.UNAVAILABLE,
  [HttpStatus.SERVICE_UNAVAILABLE]: GrpcStatus.UNAVAILABLE,
  [HttpStatus.GATEWAY_TIMEOUT]: GrpcStatus.DEADLINE_EXCEEDED,
};

/**
 * Convert HTTP status code to gRPC status code
 *
 * @param httpStatus - HTTP status code
 * @returns Corresponding gRPC status code
 *
 * @example
 * ```typescript
 * httpStatusToGrpcStatus(404); // GrpcStatus.NOT_FOUND
 * httpStatusToGrpcStatus(401); // GrpcStatus.UNAUTHENTICATED
 * httpStatusToGrpcStatus(500); // GrpcStatus.INTERNAL
 * ```
 */
export function httpStatusToGrpcStatus(httpStatus: number): GrpcStatus {
  return HTTP_TO_GRPC_STATUS_MAP[httpStatus] ?? GrpcStatus.UNKNOWN;
}

/**
 * Convert gRPC status code to HTTP status code
 *
 * @param grpcStatus - gRPC status code
 * @returns Corresponding HTTP status code
 *
 * @example
 * ```typescript
 * grpcStatusToHttpStatus(GrpcStatus.NOT_FOUND); // 404
 * grpcStatusToHttpStatus(GrpcStatus.UNAUTHENTICATED); // 401
 * grpcStatusToHttpStatus(GrpcStatus.INTERNAL); // 500
 * ```
 */
export function grpcStatusToHttpStatus(grpcStatus: GrpcStatus): number {
  const grpcToHttpMap: Record<GrpcStatus, number> = {
    [GrpcStatus.OK]: HttpStatus.OK,
    [GrpcStatus.CANCELLED]: 499, // Client Closed Request
    [GrpcStatus.UNKNOWN]: HttpStatus.INTERNAL_SERVER_ERROR,
    [GrpcStatus.INVALID_ARGUMENT]: HttpStatus.BAD_REQUEST,
    [GrpcStatus.DEADLINE_EXCEEDED]: HttpStatus.GATEWAY_TIMEOUT,
    [GrpcStatus.NOT_FOUND]: HttpStatus.NOT_FOUND,
    [GrpcStatus.ALREADY_EXISTS]: HttpStatus.CONFLICT,
    [GrpcStatus.PERMISSION_DENIED]: HttpStatus.FORBIDDEN,
    [GrpcStatus.RESOURCE_EXHAUSTED]: HttpStatus.TOO_MANY_REQUESTS,
    [GrpcStatus.FAILED_PRECONDITION]: HttpStatus.PRECONDITION_FAILED,
    [GrpcStatus.ABORTED]: HttpStatus.CONFLICT,
    [GrpcStatus.OUT_OF_RANGE]: HttpStatus.BAD_REQUEST,
    [GrpcStatus.UNIMPLEMENTED]: HttpStatus.NOT_IMPLEMENTED,
    [GrpcStatus.INTERNAL]: HttpStatus.INTERNAL_SERVER_ERROR,
    [GrpcStatus.UNAVAILABLE]: HttpStatus.SERVICE_UNAVAILABLE,
    [GrpcStatus.DATA_LOSS]: HttpStatus.INTERNAL_SERVER_ERROR,
    [GrpcStatus.UNAUTHENTICATED]: HttpStatus.UNAUTHORIZED,
  };

  return grpcToHttpMap[grpcStatus] ?? HttpStatus.INTERNAL_SERVER_ERROR;
}

// ============================================================================
// Server-Side Error Handling (gRPC Controllers)
// ============================================================================

/**
 * Handle errors in gRPC controller methods
 *
 * Converts various error types (HttpException, RpcException, Error) to proper gRPC errors.
 * This function ALWAYS throws an RpcException - use it as the last statement in catch blocks.
 *
 * @param methodName - Name of the gRPC method (for logging)
 * @param error - The caught error
 * @param logger - Optional Logger instance for error logging
 * @throws RpcException - Always throws an RpcException with appropriate gRPC status
 *
 * @example
 * ```typescript
 * @GrpcMethod('LegalService', 'GetConsent')
 * async getConsent(request: GetConsentRequest): Promise<GetConsentResponse> {
 *   try {
 *     const consent = await this.consentsService.findOne(request.id);
 *     return { consent: this.toProtoConsent(consent) };
 *   } catch (error) {
 *     handleGrpcError('GetConsent', error, this.logger);
 *   }
 * }
 * ```
 */
export function handleGrpcError(methodName: string, error: unknown, logger?: Logger): never {
  // Log the error
  if (logger) {
    logger.error(`${methodName} error: ${error}`);
  }

  // If already an RpcException, re-throw it
  if (error instanceof RpcException) {
    throw error;
  }

  // Handle NestJS HTTP exceptions
  if (error instanceof HttpException) {
    const status = error.getStatus();
    const grpcStatus = httpStatusToGrpcStatus(status);
    const response = error.getResponse();
    const message =
      typeof response === 'string'
        ? response
        : (response as { message?: string })?.message || error.message;

    throw new RpcException({
      code: grpcStatus,
      message,
    });
  }

  // Handle specific NestJS exceptions (for type safety)
  if (error instanceof NotFoundException) {
    throw new RpcException({
      code: GrpcStatus.NOT_FOUND,
      message: error.message,
    });
  }

  if (error instanceof BadRequestException) {
    throw new RpcException({
      code: GrpcStatus.INVALID_ARGUMENT,
      message: error.message,
    });
  }

  if (error instanceof UnauthorizedException) {
    throw new RpcException({
      code: GrpcStatus.UNAUTHENTICATED,
      message: error.message,
    });
  }

  if (error instanceof ForbiddenException) {
    throw new RpcException({
      code: GrpcStatus.PERMISSION_DENIED,
      message: error.message,
    });
  }

  if (error instanceof ConflictException) {
    throw new RpcException({
      code: GrpcStatus.ALREADY_EXISTS,
      message: error.message,
    });
  }

  if (error instanceof InternalServerErrorException) {
    throw new RpcException({
      code: GrpcStatus.INTERNAL,
      message: error.message,
    });
  }

  // Handle generic errors
  if (error instanceof Error) {
    throw new RpcException({
      code: GrpcStatus.INTERNAL,
      message: error.message,
    });
  }

  // Handle unknown errors
  throw new RpcException({
    code: GrpcStatus.UNKNOWN,
    message: 'An unknown error occurred',
  });
}

/**
 * Create a typed gRPC error with specific status code
 *
 * @param code - gRPC status code
 * @param message - Error message
 * @param details - Optional error details
 * @returns RpcException with the specified code and message
 *
 * @example
 * ```typescript
 * throw createGrpcError(GrpcStatus.NOT_FOUND, 'Resource not found', { id: '123' });
 * ```
 */
export function createGrpcError(
  code: GrpcStatus,
  message: string,
  details?: Record<string, unknown>,
): RpcException {
  return new RpcException({
    code,
    message,
    details: details ? JSON.stringify(details) : undefined,
  });
}

/**
 * Common gRPC error creators for frequently used error types
 */
export const GrpcErrors = {
  notFound: (resource: string, id?: string) =>
    createGrpcError(
      GrpcStatus.NOT_FOUND,
      id ? `${resource} not found: ${id}` : `${resource} not found`,
    ),

  invalidArgument: (message: string, field?: string) =>
    createGrpcError(GrpcStatus.INVALID_ARGUMENT, field ? `Invalid ${field}: ${message}` : message),

  unauthenticated: (message = 'Authentication required') =>
    createGrpcError(GrpcStatus.UNAUTHENTICATED, message),

  permissionDenied: (message = 'Permission denied') =>
    createGrpcError(GrpcStatus.PERMISSION_DENIED, message),

  alreadyExists: (resource: string, identifier?: string) =>
    createGrpcError(
      GrpcStatus.ALREADY_EXISTS,
      identifier ? `${resource} already exists: ${identifier}` : `${resource} already exists`,
    ),

  internal: (message = 'Internal server error') => createGrpcError(GrpcStatus.INTERNAL, message),

  unavailable: (service?: string) =>
    createGrpcError(
      GrpcStatus.UNAVAILABLE,
      service ? `${service} is temporarily unavailable` : 'Service temporarily unavailable',
    ),

  deadlineExceeded: (operation?: string) =>
    createGrpcError(
      GrpcStatus.DEADLINE_EXCEEDED,
      operation ? `${operation} timed out` : 'Request timed out',
    ),

  failedPrecondition: (message: string) => createGrpcError(GrpcStatus.FAILED_PRECONDITION, message),

  resourceExhausted: (message = 'Rate limit exceeded') =>
    createGrpcError(GrpcStatus.RESOURCE_EXHAUSTED, message),
};

// ============================================================================
// Client-Side Error Handling
// ============================================================================

/**
 * Normalize any error to a consistent GrpcError format
 * Used by gRPC clients to handle errors from service calls.
 *
 * @param error - Any error object
 * @returns Normalized GrpcError object
 *
 * @example
 * ```typescript
 * try {
 *   await identityClient.getAccount({ id: '123' });
 * } catch (error) {
 *   const grpcError = normalizeGrpcError(error);
 *   switch (grpcError.code) {
 *     case GrpcStatus.NOT_FOUND:
 *       // Handle not found
 *       break;
 *     case GrpcStatus.UNAVAILABLE:
 *       // Handle service unavailable
 *       break;
 *   }
 * }
 * ```
 */
export function normalizeGrpcError(error: unknown): GrpcError {
  if (isGrpcError(error)) {
    return error;
  }

  if (error instanceof Error) {
    // Check for timeout
    if (error.name === 'TimeoutError') {
      return {
        code: GrpcStatus.DEADLINE_EXCEEDED,
        message: 'Request timeout',
        details: error.message,
      };
    }

    // Check for connection errors
    if (error.message.includes('UNAVAILABLE') || error.message.includes('ECONNREFUSED')) {
      return {
        code: GrpcStatus.UNAVAILABLE,
        message: 'Service unavailable',
        details: error.message,
      };
    }

    // Check for cancelled errors
    if (error.message.includes('CANCELLED')) {
      return {
        code: GrpcStatus.CANCELLED,
        message: 'Request cancelled',
        details: error.message,
      };
    }

    return {
      code: GrpcStatus.UNKNOWN,
      message: error.message,
    };
  }

  return {
    code: GrpcStatus.UNKNOWN,
    message: 'Unknown error occurred',
  };
}

/**
 * Check if error is a specific gRPC status code
 *
 * @param error - Error to check
 * @param code - Expected gRPC status code
 * @returns true if error matches the specified code
 *
 * @example
 * ```typescript
 * if (isGrpcStatusCode(error, GrpcStatus.NOT_FOUND)) {
 *   // Handle not found specifically
 * }
 * ```
 */
export function isGrpcStatusCode(error: unknown, code: GrpcStatus): boolean {
  const grpcError = normalizeGrpcError(error);
  return grpcError.code === code;
}

/**
 * Check if error indicates a retryable condition
 *
 * @param error - Error to check
 * @returns true if the error indicates a retryable condition
 */
export function isRetryableGrpcError(error: unknown): boolean {
  const grpcError = normalizeGrpcError(error);
  const retryableCodes = [
    GrpcStatus.UNAVAILABLE,
    GrpcStatus.DEADLINE_EXCEEDED,
    GrpcStatus.ABORTED,
    GrpcStatus.RESOURCE_EXHAUSTED,
  ];
  return retryableCodes.includes(grpcError.code);
}
