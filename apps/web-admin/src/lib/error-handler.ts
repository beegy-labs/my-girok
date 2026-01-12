/**
 * Centralized Error Handler
 *
 * Provides consistent error handling across the application with:
 * - HTTP status code to user-friendly message mapping
 * - Error classification (client vs server, transient vs permanent)
 * - Retry logic for transient failures
 * - Error logging integration
 */

import { AxiosError } from 'axios';
import { logger } from '../utils/logger';
import { trackError } from './otel';

export interface AppError {
  code: string;
  message: string;
  statusCode?: number;
  isTransient: boolean;
  shouldRetry: boolean;
  userMessage: string;
  technicalDetails?: string;
}

/**
 * Error codes for application-specific errors
 */
export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  CANCELLED = 'CANCELLED',

  // Client errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',

  // Server errors (5xx)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',

  // Application errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
}

/**
 * User-friendly error messages mapped to error codes
 */
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.NETWORK_ERROR]:
    'Unable to connect to the server. Please check your internet connection.',
  [ErrorCode.TIMEOUT]: 'The request took too long to complete. Please try again.',
  [ErrorCode.CANCELLED]: 'The request was cancelled.',

  [ErrorCode.BAD_REQUEST]: 'Invalid request. Please check your input and try again.',
  [ErrorCode.UNAUTHORIZED]: 'You need to sign in to access this resource.',
  [ErrorCode.FORBIDDEN]: "You don't have permission to access this resource.",
  [ErrorCode.NOT_FOUND]: 'The requested resource was not found.',
  [ErrorCode.CONFLICT]: 'This action conflicts with existing data. Please refresh and try again.',
  [ErrorCode.VALIDATION_ERROR]: 'Please check your input and correct any validation errors.',
  [ErrorCode.RATE_LIMITED]: 'Too many requests. Please wait a moment and try again.',

  [ErrorCode.INTERNAL_SERVER_ERROR]: 'An unexpected error occurred. Our team has been notified.',
  [ErrorCode.SERVICE_UNAVAILABLE]:
    'The service is temporarily unavailable. Please try again in a few moments.',
  [ErrorCode.GATEWAY_TIMEOUT]: 'The server took too long to respond. Please try again.',

  [ErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
  [ErrorCode.SESSION_EXPIRED]: 'Your session has expired. Please sign in again.',
};

/**
 * HTTP status code to error code mapping
 */
const STATUS_TO_ERROR_CODE: Record<number, ErrorCode> = {
  400: ErrorCode.BAD_REQUEST,
  401: ErrorCode.UNAUTHORIZED,
  403: ErrorCode.FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
  409: ErrorCode.CONFLICT,
  422: ErrorCode.VALIDATION_ERROR,
  429: ErrorCode.RATE_LIMITED,
  500: ErrorCode.INTERNAL_SERVER_ERROR,
  502: ErrorCode.GATEWAY_TIMEOUT,
  503: ErrorCode.SERVICE_UNAVAILABLE,
  504: ErrorCode.GATEWAY_TIMEOUT,
};

/**
 * Determine if an error is transient and should be retried
 */
function isTransientError(statusCode?: number, code?: string): boolean {
  // Network errors are transient
  if (!statusCode || code === 'ECONNABORTED' || code === 'ERR_NETWORK') {
    return true;
  }

  // 5xx server errors (except 501 Not Implemented)
  if (statusCode >= 500 && statusCode !== 501) {
    return true;
  }

  // 408 Request Timeout
  if (statusCode === 408) {
    return true;
  }

  // 429 Rate Limited (transient, can retry with backoff)
  if (statusCode === 429) {
    return true;
  }

  return false;
}

/**
 * Determine if an error should trigger automatic retry
 */
function shouldRetry(statusCode?: number, code?: string): boolean {
  // Don't retry client errors (except rate limiting)
  if (statusCode && statusCode >= 400 && statusCode < 500) {
    return statusCode === 429; // Only retry rate limiting
  }

  // Retry transient errors
  return isTransientError(statusCode, code);
}

/**
 * Parse AxiosError into AppError
 */
export function parseAxiosError(error: AxiosError): AppError {
  const statusCode = error.response?.status;
  const errorCode = statusCode
    ? STATUS_TO_ERROR_CODE[statusCode] || ErrorCode.UNKNOWN_ERROR
    : error.code === 'ECONNABORTED'
      ? ErrorCode.TIMEOUT
      : error.code === 'ERR_NETWORK'
        ? ErrorCode.NETWORK_ERROR
        : ErrorCode.UNKNOWN_ERROR;

  const responseData = error.response?.data as any;
  const serverMessage = responseData?.message || responseData?.error;

  return {
    code: errorCode,
    message: serverMessage || error.message,
    statusCode,
    isTransient: isTransientError(statusCode, error.code),
    shouldRetry: shouldRetry(statusCode, error.code),
    userMessage: ERROR_MESSAGES[errorCode],
    technicalDetails: import.meta.env.DEV
      ? `${error.config?.method?.toUpperCase()} ${error.config?.url}: ${error.message}`
      : undefined,
  };
}

/**
 * Handle API error with consistent logging and user feedback
 */
export function handleApiError(error: unknown, context?: string): AppError {
  let appError: AppError;

  if (error instanceof Error && 'isAxiosError' in error) {
    appError = parseAxiosError(error as AxiosError);
  } else if (error instanceof Error) {
    appError = {
      code: ErrorCode.UNKNOWN_ERROR,
      message: error.message,
      isTransient: false,
      shouldRetry: false,
      userMessage: ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR],
      technicalDetails: import.meta.env.DEV ? error.stack : undefined,
    };
  } else {
    appError = {
      code: ErrorCode.UNKNOWN_ERROR,
      message: String(error),
      isTransient: false,
      shouldRetry: false,
      userMessage: ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR],
    };
  }

  // Log error
  logger.error(`API Error${context ? ` in ${context}` : ''}:`, {
    code: appError.code,
    message: appError.message,
    statusCode: appError.statusCode,
    isTransient: appError.isTransient,
  });

  // Track error for monitoring
  const errorInstance = error instanceof Error ? error : new Error(appError.message);
  trackError(errorInstance, context || 'API');

  return appError;
}

/**
 * Retry configuration for transient errors
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 10000, // 10 seconds
  backoffMultiplier: 2, // Exponential backoff
};

/**
 * Execute a function with exponential backoff retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: unknown;
  let attempt = 0;

  while (attempt < retryConfig.maxRetries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      attempt++;

      // Check if error should be retried
      const appError =
        error instanceof Error && 'isAxiosError' in error
          ? parseAxiosError(error as AxiosError)
          : null;

      if (!appError?.shouldRetry || attempt >= retryConfig.maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        retryConfig.initialDelayMs * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
        retryConfig.maxDelayMs,
      );

      logger.info(`Retrying after ${delay}ms (attempt ${attempt}/${retryConfig.maxRetries})`);

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Get user-friendly error message for display in UI
 */
export function getErrorMessage(error: unknown): string {
  const appError = handleApiError(error);
  return appError.userMessage;
}

/**
 * Check if error requires user to re-authenticate
 */
export function isAuthenticationError(error: unknown): boolean {
  if (error instanceof Error && 'isAxiosError' in error) {
    const axiosError = error as AxiosError;
    return axiosError.response?.status === 401;
  }
  return false;
}

/**
 * Check if error is a permissions/authorization error
 */
export function isAuthorizationError(error: unknown): boolean {
  if (error instanceof Error && 'isAxiosError' in error) {
    const axiosError = error as AxiosError;
    return axiosError.response?.status === 403;
  }
  return false;
}

/**
 * Check if error is a validation error with field-specific messages
 */
export function isValidationError(error: unknown): boolean {
  if (error instanceof Error && 'isAxiosError' in error) {
    const axiosError = error as AxiosError;
    return axiosError.response?.status === 400 || axiosError.response?.status === 422;
  }
  return false;
}

/**
 * Extract validation errors from API response
 */
export function getValidationErrors(error: unknown): Record<string, string> | null {
  if (!isValidationError(error)) {
    return null;
  }

  const axiosError = error as AxiosError;
  const responseData = axiosError.response?.data as any;

  // Support common validation error formats
  if (responseData?.errors && typeof responseData.errors === 'object') {
    return responseData.errors;
  }

  if (responseData?.fieldErrors && typeof responseData.fieldErrors === 'object') {
    return responseData.fieldErrors;
  }

  return null;
}
