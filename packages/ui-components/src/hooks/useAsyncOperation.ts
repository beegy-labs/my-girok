import { useState, useCallback } from 'react';

export interface AsyncOperationState<T = unknown> {
  /**
   * Loading state
   */
  loading: boolean;
  /**
   * Error message or object
   */
  error: string | null;
  /**
   * Result data (optional)
   */
  data: T | null;
}

export interface UseAsyncOperationOptions<T = unknown> {
  /**
   * Callback on success
   */
  onSuccess?: (data: T) => void;
  /**
   * Callback on error
   */
  onError?: (error: Error) => void;
  /**
   * Callback on finally (always called)
   */
  onFinally?: () => void;
  /**
   * Default error message
   */
  defaultErrorMessage?: string;
}

/**
 * Custom hook for handling async operations with loading/error states
 *
 * @example
 * ```tsx
 * function LoginPage() {
 *   const { execute, loading, error } = useAsyncOperation({
 *     onSuccess: (user) => {
 *       console.log('Login successful', user);
 *       navigate('/dashboard');
 *     },
 *     defaultErrorMessage: 'Login failed',
 *   });
 *
 *   const handleLogin = async () => {
 *     await execute(async () => {
 *       const response = await login(email, password);
 *       return response.user;
 *     });
 *   };
 *
 *   return (
 *     <>
 *       {error && <Alert variant="error">{error}</Alert>}
 *       <Button loading={loading} onClick={handleLogin}>
 *         Login
 *       </Button>
 *     </>
 *   );
 * }
 * ```
 */
export function useAsyncOperation<T = unknown>(options: UseAsyncOperationOptions<T> = {}) {
  const { onSuccess, onError, onFinally, defaultErrorMessage = 'An error occurred' } = options;

  const [state, setState] = useState<AsyncOperationState<T>>({
    loading: false,
    error: null,
    data: null,
  });

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const setData = useCallback((data: T | null) => {
    setState((prev) => ({ ...prev, data }));
  }, []);

  const execute = useCallback(
    async (operation: () => Promise<T>) => {
      setLoading(true);
      setError(null);

      try {
        const result = await operation();
        setData(result);
        onSuccess?.(result);
        return result;
      } catch (err: unknown) {
        // Type-safe error handling
        const error = err instanceof Error ? err : new Error(String(err));
        const axiosError = err as { response?: { data?: { message?: string } } };
        const errorMessage =
          axiosError?.response?.data?.message || error.message || defaultErrorMessage;
        setError(errorMessage);
        onError?.(error);
        throw err;
      } finally {
        setLoading(false);
        onFinally?.();
      }
    },
    [onSuccess, onError, onFinally, defaultErrorMessage, setLoading, setError, setData],
  );

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      data: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
    setLoading,
    setError,
    setData,
  };
}
