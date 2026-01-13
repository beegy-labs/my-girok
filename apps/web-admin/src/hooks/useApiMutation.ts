/**
 * useApiMutation Hook
 *
 * Provides a mutation wrapper with automatic error handling and retry logic.
 * Similar to React Query's useMutation but with enhanced error handling.
 */

import { useState, useCallback } from 'react';
import { handleApiError, withRetry, AppError, RetryConfig } from '../lib/error-handler';
import { showErrorToast, showSuccessToast } from '../lib/toast';

export interface UseApiMutationOptions<TData, TVariables> {
  /**
   * The mutation function to execute
   */
  mutationFn: (variables: TVariables) => Promise<TData>;

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
  showErrorToast?: boolean;

  /**
   * Success toast message (string or function returning string)
   */
  successToast?: string | ((data: TData) => string);

  /**
   * Callback on success
   */
  onSuccess?: (data: TData, variables: TVariables) => void;

  /**
   * Callback on error
   */
  onError?: (error: AppError, variables: TVariables) => void;

  /**
   * Callback on settled (success or error)
   */
  onSettled?: (data: TData | null, error: AppError | null, variables: TVariables) => void;
}

export interface UseApiMutationResult<TData, TVariables> {
  /**
   * Execute the mutation
   */
  mutate: (variables: TVariables) => Promise<void>;

  /**
   * Execute the mutation and return the result
   */
  mutateAsync: (variables: TVariables) => Promise<TData>;

  /**
   * The mutation result data
   */
  data: TData | null;

  /**
   * Current error state
   */
  error: AppError | null;

  /**
   * User-friendly error message
   */
  errorMessage: string | null;

  /**
   * Whether the mutation is currently executing
   */
  isLoading: boolean;

  /**
   * Whether the mutation has completed successfully
   */
  isSuccess: boolean;

  /**
   * Whether an error has occurred
   */
  isError: boolean;

  /**
   * Reset the mutation state
   */
  reset: () => void;
}

/**
 * Hook for API mutations with automatic error handling
 */
export function useApiMutation<TData = unknown, TVariables = void>(
  options: UseApiMutationOptions<TData, TVariables>,
): UseApiMutationResult<TData, TVariables> {
  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  const mutateAsync = useCallback(
    async (variables: TVariables): Promise<TData> => {
      setIsLoading(true);
      setError(null);

      try {
        const executor = options.retry
          ? () => withRetry(() => options.mutationFn(variables), options.retryConfig)
          : () => options.mutationFn(variables);

        const result = await executor();
        setData(result);

        // Show success toast if configured
        if (options.successToast) {
          const message =
            typeof options.successToast === 'function'
              ? options.successToast(result)
              : options.successToast;
          showSuccessToast(message);
        }

        options.onSuccess?.(result, variables);
        options.onSettled?.(result, null, variables);
        return result;
      } catch (err) {
        const appError = handleApiError(err, options.context);
        setError(appError);

        // Show error toast by default (unless explicitly disabled)
        if (options.showErrorToast !== false) {
          showErrorToast(appError);
        }

        options.onError?.(appError, variables);
        options.onSettled?.(null, appError, variables);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [options],
  );

  const mutate = useCallback(
    async (variables: TVariables): Promise<void> => {
      try {
        await mutateAsync(variables);
      } catch {
        // Error already handled in mutateAsync
      }
    },
    [mutateAsync],
  );

  return {
    mutate,
    mutateAsync,
    data,
    error,
    errorMessage: error ? error.userMessage : null,
    isLoading,
    isSuccess: data !== null && error === null,
    isError: error !== null,
    reset,
  };
}
