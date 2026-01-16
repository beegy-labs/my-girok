/**
 * useApiMutation Hook
 *
 * Provides a mutation wrapper with automatic error handling and retry logic.
 * Similar to React Query's useMutation but with enhanced error handling.
 */

import { useState, useCallback, useRef } from 'react';
import { handleApiError, withRetry, type AppError, type RetryConfig } from '../utils/error-handler';

export interface UseApiMutationOptions<TData, TVariables = void> {
  /**
   * The mutation function to execute
   */
  mutationFn: TVariables extends void
    ? (variables?: TVariables) => Promise<TData>
    : (variables: TVariables) => Promise<TData>;

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
   * Execute the mutation (errors are caught internally)
   */
  mutate: TVariables extends void
    ? (variables?: TVariables) => Promise<void>
    : (variables: TVariables) => Promise<void>;

  /**
   * Execute the mutation and return the result (throws on error)
   */
  mutateAsync: TVariables extends void
    ? (variables?: TVariables) => Promise<TData>
    : (variables: TVariables) => Promise<TData>;

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
 * Hook for API mutations with automatic error handling and retry logic
 *
 * @example
 * const { mutate, isLoading, error } = useApiMutation({
 *   mutationFn: (data) => api.createResume(data),
 *   retry: true,
 *   context: 'CreateResume',
 *   onSuccess: (data) => navigate(`/resume/${data.id}`),
 * });
 *
 * // Call mutation
 * mutate({ title: 'My Resume' });
 */
export function useApiMutation<TData = unknown, TVariables = void>(
  options: UseApiMutationOptions<TData, TVariables>,
): UseApiMutationResult<TData, TVariables> {
  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Use ref to store options to prevent callback recreation on every render
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  const mutateAsync = useCallback(async (variables: TVariables): Promise<TData> => {
    setIsLoading(true);
    setError(null);

    const opts = optionsRef.current;

    try {
      const executor = opts.retry
        ? () => withRetry(() => opts.mutationFn(variables), opts.retryConfig)
        : () => opts.mutationFn(variables);

      const result = await executor();
      setData(result);

      opts.onSuccess?.(result, variables);
      opts.onSettled?.(result, null, variables);
      return result;
    } catch (err) {
      const appError = handleApiError(err, opts.context);
      setError(appError);

      opts.onError?.(appError, variables);
      opts.onSettled?.(null, appError, variables);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

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
  } as UseApiMutationResult<TData, TVariables>;
}
