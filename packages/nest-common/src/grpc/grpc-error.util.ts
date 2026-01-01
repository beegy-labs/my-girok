/**
 * gRPC Error Utilities
 *
 * Shared error handling utilities for gRPC clients.
 */

import { status as GrpcStatus } from '@grpc/grpc-js';
import { GrpcError, isGrpcError } from './grpc.types';

export { GrpcError, isGrpcError };

/**
 * Normalize any error to a consistent GrpcError format
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
