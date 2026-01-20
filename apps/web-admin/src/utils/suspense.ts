/**
 * Suspense-compatible data fetching utilities for React 19 use() hook
 *
 * Usage:
 * ```tsx
 * const resource = createResource(() => api.fetchData());
 *
 * function Component() {
 *   const data = use(resource.read());
 *   return <div>{data}</div>;
 * }
 * ```
 */

type ResourceStatus = 'pending' | 'success' | 'error';

interface Resource<T> {
  read: () => Promise<T>;
  invalidate: () => void;
}

interface CacheEntry<T> {
  status: ResourceStatus;
  value?: T;
  error?: Error;
  promise?: Promise<T>;
}

/**
 * Create a Suspense-compatible resource that caches the result
 *
 * @param fetcher - Async function that fetches data
 * @returns Resource object with read() and invalidate() methods
 */
export function createResource<T>(fetcher: () => Promise<T>): Resource<T> {
  let cache: CacheEntry<T> = {
    status: 'pending',
  };

  const read = (): Promise<T> => {
    switch (cache.status) {
      case 'pending': {
        if (!cache.promise) {
          cache.promise = fetcher()
            .then((data) => {
              cache.status = 'success';
              cache.value = data;
              return data;
            })
            .catch((error) => {
              cache.status = 'error';
              cache.error = error instanceof Error ? error : new Error(String(error));
              throw cache.error;
            });
        }
        throw cache.promise;
      }
      case 'success':
        return Promise.resolve(cache.value!);
      case 'error':
        throw cache.error;
    }
  };

  const invalidate = () => {
    cache = {
      status: 'pending',
    };
  };

  return { read, invalidate };
}

/**
 * Create a keyed resource cache for dynamic queries
 * Useful for paginated lists, filtered data, etc.
 *
 * @param fetcher - Async function that fetches data based on key
 * @returns Object with get() and invalidate() methods
 */
export function createKeyedResourceCache<TKey extends string, TValue>(
  fetcher: (key: TKey) => Promise<TValue>,
) {
  const cache = new Map<TKey, Resource<TValue>>();

  return {
    get: (key: TKey): Resource<TValue> => {
      if (!cache.has(key)) {
        cache.set(
          key,
          createResource(() => fetcher(key)),
        );
      }
      return cache.get(key)!;
    },
    invalidate: (key?: TKey) => {
      if (key) {
        cache.get(key)?.invalidate();
      } else {
        cache.forEach((resource) => resource.invalidate());
        cache.clear();
      }
    },
  };
}

/**
 * Serialize query parameters to a cache key
 */
export function queryCacheKey(params: unknown): string {
  return JSON.stringify(
    Object.entries(params as Record<string, unknown>)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}
