/**
 * useApiError Hook
 *
 * Provides consistent error handling for API calls with:
 * - Automatic retry for transient errors
 * - User-friendly error messages
 * - Error state management
 */

import { useState, useCallback } from 'react';
import {
  handleApiError,
  withRetry,
  getErrorMessage,
  AppError,
  RetryConfig,
} from '../lib/error-handler';

export interface UseApiErrorOptions {
  /**
   * Enable automatic retry for transient errors
   */
  retry?: boolean;

  /**
   * Retry configuration
   */
  retryConfig?: Partial<RetryConfig>;

  /**
   * Context for error logging
   */
  context?: string;

  /**
   * Callback when error occurs
   */
  onError?: (error: AppError) => void;
}

export interface UseApiErrorResult {
  /**
   * Current error state
   */
  error: AppError | null;

  /**
   * User-friendly error message for display
   */
  errorMessage: string | null;

  /**
   * Whether an error has occurred
   */
  hasError: boolean;

  /**
   * Clear the current error
   */
  clearError: () => void;

  /**
   * Execute an async function with error handling
   */
  executeWithErrorHandling: <T>(fn: () => Promise<T>) => Promise<T | null>;
}

/**
 * Hook for consistent API error handling
 */
export function useApiError(options: UseApiErrorOptions = {}): UseApiErrorResult {
  const [error, setError] = useState<AppError | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const executeWithErrorHandling = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | null> => {
      try {
        clearError();

        const executor = options.retry ? () => withRetry(fn, options.retryConfig) : fn;

        const result = await executor();
        return result;
      } catch (err) {
        const appError = handleApiError(err, options.context);
        setError(appError);
        options.onError?.(appError);
        return null;
      }
    },
    [options, clearError],
  );

  return {
    error,
    errorMessage: error ? error.userMessage : null,
    hasError: error !== null,
    clearError,
    executeWithErrorHandling,
  };
}

/**
 * Hook for simple error message extraction
 */
export function useErrorMessage(error: unknown): string | null {
  if (!error) return null;
  return getErrorMessage(error);
}
