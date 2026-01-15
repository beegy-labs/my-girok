/**
 * useApiError Hook
 *
 * Provides consistent error handling for API calls with:
 * - Automatic retry for transient errors
 * - User-friendly error messages
 * - Error state management
 */

import { useState, useCallback, useRef } from 'react';
import {
  handleApiError,
  withRetry,
  getErrorMessage,
  AppError,
  RetryConfig,
} from '../lib/error-handler';
import { showErrorToast } from '../lib/toast';

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
   * Show error toast automatically (default: true)
   */
  showToast?: boolean;

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
   * Whether an async operation is in progress
   */
  isLoading: boolean;

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
  const [isLoading, setIsLoading] = useState(false);

  // Use ref to store options to prevent callback recreation on every render
  // This fixes infinite re-render loops when executeWithErrorHandling is used in useEffect dependencies
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const executeWithErrorHandling = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | null> => {
      setIsLoading(true);
      try {
        clearError();

        const opts = optionsRef.current;
        const executor = opts.retry ? () => withRetry(fn, opts.retryConfig) : fn;

        const result = await executor();
        return result;
      } catch (err) {
        const opts = optionsRef.current;
        const appError = handleApiError(err, opts.context);
        setError(appError);

        // Show error toast by default (unless explicitly disabled)
        if (opts.showToast !== false) {
          showErrorToast(appError);
        }

        opts.onError?.(appError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError],
  );

  return {
    error,
    errorMessage: error ? error.userMessage : null,
    hasError: error !== null,
    isLoading,
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
