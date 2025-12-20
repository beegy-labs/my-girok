import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Type-safe error enum for Resume viewer pages
 * Each error type maps to specific HTTP status codes or error conditions
 */
export enum ResumeViewerError {
  /** 404 - Resume or user not found */
  NOT_FOUND = 'NOT_FOUND',
  /** 410 - Share link expired */
  EXPIRED = 'EXPIRED',
  /** 403 - Share link inactive/disabled */
  INACTIVE = 'INACTIVE',
  /** Network error (no response) */
  NETWORK = 'NETWORK',
  /** Unknown/general error */
  UNKNOWN = 'UNKNOWN',
  /** No ID provided (client-side validation) */
  NO_ID = 'NO_ID',
}

/**
 * Axios-like error structure for type-safe error handling
 */
export interface ApiError {
  response?: {
    status?: number;
    data?: unknown;
  };
  message?: string;
}

/**
 * Error mapper function type
 * Maps API errors to ResumeViewerError enum values
 */
export type ErrorMapper = (error: ApiError) => ResumeViewerError;

/**
 * Options for useResumeViewer hook
 */
export interface UseResumeViewerOptions<T> {
  /**
   * Async function that fetches the resume data
   */
  fetchFn: () => Promise<T>;

  /**
   * Dependencies array for re-fetching (like useEffect deps)
   */
  deps: unknown[];

  /**
   * Skip fetching if true (e.g., when ID is not available)
   * @default false
   */
  skip?: boolean;

  /**
   * Custom error mapper function
   * Maps API errors to ResumeViewerError enum
   * @default Maps 404 to NOT_FOUND, others to UNKNOWN
   */
  errorMapper?: ErrorMapper;

  /**
   * Error to return when skip is true due to missing ID
   * @default ResumeViewerError.NO_ID
   */
  skipError?: ResumeViewerError;
}

/**
 * Result type for useResumeViewer hook
 */
export interface UseResumeViewerResult<T> {
  /** Fetched data (null while loading or on error) */
  data: T | null;
  /** Loading state */
  loading: boolean;
  /** Error state (type-safe enum) */
  error: ResumeViewerError | null;
  /** Retry function to re-fetch data (memoized) */
  retry: () => void;
}

/**
 * Default error mapper
 * Maps common HTTP status codes to ResumeViewerError
 */
const defaultErrorMapper: ErrorMapper = (error: ApiError): ResumeViewerError => {
  if (!error.response) {
    return ResumeViewerError.NETWORK;
  }

  switch (error.response.status) {
    case 404:
      return ResumeViewerError.NOT_FOUND;
    case 403:
      return ResumeViewerError.INACTIVE;
    case 410:
      return ResumeViewerError.EXPIRED;
    default:
      return ResumeViewerError.UNKNOWN;
  }
};

/**
 * useResumeViewer - Custom hook for Resume viewer pages
 *
 * Extracts common data fetching, loading, and error handling logic
 * following 2025 React best practices:
 * - Memoized callbacks (useCallback)
 * - Type-safe error handling (enum)
 * - Configurable error mapping
 * - Skip option for conditional fetching
 *
 * @example
 * ```tsx
 * // ResumePreviewPage.tsx
 * const { data: resume, loading, error, retry } = useResumeViewer({
 *   fetchFn: () => getResume(resumeId!),
 *   deps: [resumeId],
 *   skip: !resumeId,
 *   errorMapper: (err) => {
 *     if (err.response?.status === 404) return ResumeViewerError.NOT_FOUND;
 *     return ResumeViewerError.UNKNOWN;
 *   },
 * });
 *
 * if (loading) return <LoadingSpinner />;
 * if (error === ResumeViewerError.NOT_FOUND) return <NotFoundMessage />;
 * if (error) return <ErrorMessage onRetry={retry} />;
 * ```
 */
export function useResumeViewer<T>({
  fetchFn,
  deps,
  skip = false,
  errorMapper = defaultErrorMapper,
  skipError = ResumeViewerError.NO_ID,
}: UseResumeViewerOptions<T>): UseResumeViewerResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState<ResumeViewerError | null>(skip ? skipError : null);

  // Use ref to store the latest fetchFn to avoid stale closures
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  // Use ref for errorMapper to avoid unnecessary re-renders
  const errorMapperRef = useRef(errorMapper);
  errorMapperRef.current = errorMapper;

  // AbortController ref for request cancellation (2025 best practice)
  const abortControllerRef = useRef<AbortController | null>(null);

  // Memoized load function (2025 best practice: useCallback for all handlers)
  const load = useCallback(async () => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (skip) {
      setError(skipError);
      setLoading(false);
      return;
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    try {
      setData(null);
      setLoading(true);
      setError(null);

      const result = await fetchFnRef.current();

      // Only update state if not aborted
      if (!abortControllerRef.current?.signal.aborted) {
        setData(result);
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error('[useResumeViewer] Fetch failed:', err);
      const mappedError = errorMapperRef.current(err as ApiError);
      if (!abortControllerRef.current?.signal.aborted) {
        setError(mappedError);
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [skip, skipError]);

  // Memoized retry function (stable reference)
  const retry = useCallback(() => {
    load();
  }, [load]);

  // Effect to trigger initial load and re-fetch on deps change
  useEffect(() => {
    load();

    // Cleanup: abort any in-flight request on unmount or deps change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps array is intentionally spread
  }, [load, ...deps]);

  return { data, loading, error, retry };
}

/**
 * Helper function to create error mapper for specific use cases
 * Useful for creating reusable error mappers
 *
 * @example
 * ```tsx
 * const sharedResumeErrorMapper = createErrorMapper({
 *   404: ResumeViewerError.NOT_FOUND,
 *   410: ResumeViewerError.EXPIRED,
 *   403: ResumeViewerError.INACTIVE,
 * });
 * ```
 */
export function createErrorMapper(
  statusMap: Partial<Record<number, ResumeViewerError>>,
  defaultError: ResumeViewerError = ResumeViewerError.UNKNOWN,
): ErrorMapper {
  return (error: ApiError): ResumeViewerError => {
    if (!error.response) {
      return ResumeViewerError.NETWORK;
    }

    const status = error.response.status;
    if (status && statusMap[status]) {
      return statusMap[status]!;
    }

    return defaultError;
  };
}
