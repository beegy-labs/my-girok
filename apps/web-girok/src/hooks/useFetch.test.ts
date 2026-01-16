/**
 * useFetch Hook Tests
 *
 * Tests for the data fetching hook with loading/error states.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFetch } from './useFetch';

describe('useFetch', () => {
  describe('immediate fetch (default)', () => {
    it('should fetch data immediately on mount', async () => {
      const mockData = { id: '1', name: 'Test' };
      const fetcher = vi.fn().mockResolvedValue(mockData);

      const { result } = renderHook(() => useFetch(fetcher));

      expect(result.current.loading).toBe(true);
      expect(fetcher).toHaveBeenCalledTimes(1);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeNull();
    });

    it('should set error state on fetch failure', async () => {
      const fetcher = vi.fn().mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() => useFetch(fetcher));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBe('Fetch failed');
    });

    it('should handle non-Error rejection', async () => {
      const fetcher = vi.fn().mockRejectedValue('string error');

      const { result } = renderHook(() => useFetch(fetcher));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Unknown error');
    });
  });

  describe('deferred fetch (immediate: false)', () => {
    it('should not fetch on mount when immediate is false', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'test' });

      const { result } = renderHook(() => useFetch(fetcher, { immediate: false }));

      // Give some time for any potential fetch to complete
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(fetcher).not.toHaveBeenCalled();
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeNull();
    });

    it('should fetch when refetch is called', async () => {
      const mockData = { id: '2' };
      const fetcher = vi.fn().mockResolvedValue(mockData);

      const { result } = renderHook(() => useFetch(fetcher, { immediate: false }));

      expect(result.current.data).toBeNull();

      await act(async () => {
        await result.current.refetch();
      });

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(result.current.data).toEqual(mockData);
    });
  });

  describe('refetch', () => {
    it('should refetch data when refetch is called', async () => {
      const mockData1 = { count: 1 };
      const mockData2 = { count: 2 };
      const fetcher = vi.fn().mockResolvedValueOnce(mockData1).mockResolvedValueOnce(mockData2);

      const { result } = renderHook(() => useFetch(fetcher));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData1);
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.data).toEqual(mockData2);
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('should set loading state during refetch', async () => {
      let resolvePromise: (value: unknown) => void;
      const fetcher = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          }),
      );

      const { result } = renderHook(() => useFetch(fetcher, { immediate: false }));

      act(() => {
        result.current.refetch();
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise!({ data: 'done' });
      });

      expect(result.current.loading).toBe(false);
    });

    it('should clear previous error on successful refetch', async () => {
      const fetcher = vi
        .fn()
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useFetch(fetcher));

      await waitFor(() => {
        expect(result.current.error).toBe('First error');
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.data).toEqual({ success: true });
    });
  });

  describe('unmount handling', () => {
    it('should not update state after unmount', async () => {
      let resolvePromise: (value: unknown) => void;
      const fetcher = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          }),
      );

      const { result, unmount } = renderHook(() => useFetch(fetcher));

      expect(result.current.loading).toBe(true);

      // Unmount before promise resolves
      unmount();

      // This should not cause errors or state updates
      await act(async () => {
        resolvePromise!({ data: 'late response' });
      });

      // No assertion needed - we just verify no errors were thrown
    });
  });

  describe('fetcher stability', () => {
    it('should handle fetcher reference changes without infinite loops', async () => {
      const mockData = { id: '1' };
      let callCount = 0;

      const { result, rerender } = renderHook(
        ({ id }: { id: string }) => {
          // Intentionally creating new function reference each render
          const fetcher = () => {
            callCount++;
            return Promise.resolve({ ...mockData, id });
          };
          return useFetch(fetcher);
        },
        { initialProps: { id: '1' } },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = callCount;

      // Rerender with new props (creates new fetcher reference)
      rerender({ id: '2' });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      // Should not have fetched again just because fetcher reference changed
      expect(callCount).toBe(initialCallCount);
    });
  });
});
