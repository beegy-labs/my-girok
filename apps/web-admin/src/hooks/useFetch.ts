// apps/web-admin/src/hooks/useFetch.ts
import { useState, useCallback, useEffect, useRef } from 'react';

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseFetchOptions {
  immediate?: boolean;
}

/**
 * Custom hook for data fetching with loading/error states.
 *
 * @param fetcher - Function that returns a Promise. Should be wrapped in useCallback
 *                  or be a stable reference to prevent unnecessary refetches.
 * @param options - { immediate: boolean } - Whether to fetch immediately on mount
 *
 * @example
 * const fetchUsers = useCallback(() => api.getUsers(), []);
 * const { data, loading, error, refetch } = useFetch(fetchUsers);
 */
export function useFetch<T>(
  fetcher: () => Promise<T>,
  options: UseFetchOptions = {},
): UseFetchResult<T> {
  const { immediate = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Store fetcher in ref to avoid infinite loops when caller doesn't memoize
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Store immediate in ref - it's a mount-time option that shouldn't trigger re-fetches
  const immediateRef = useRef(immediate);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (immediateRef.current) {
      fetchData();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
