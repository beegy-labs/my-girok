/**
 * useApiMutation Hook Tests
 *
 * Tests for the API mutation hook with error handling and retry logic.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import { useApiMutation } from './useApiMutation';
import { ErrorCode } from '../utils/error-handler';

// Helper to create mock AxiosError
function createAxiosError(status: number, message = 'Test error'): AxiosError {
  const error = new Error(message) as AxiosError;
  error.isAxiosError = true;
  error.config = {
    method: 'post',
    url: '/test',
    headers: new AxiosHeaders(),
  };
  error.response = {
    status,
    statusText: 'Error',
    data: { message },
    headers: {},
    config: error.config,
  };
  return error;
}

describe('useApiMutation', () => {
  describe('basic functionality', () => {
    it('should initialize with correct default state', () => {
      const mutationFn = vi.fn();
      const { result } = renderHook(() => useApiMutation({ mutationFn }));

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.errorMessage).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    it('should execute mutation and return data on success', async () => {
      const mockData = { id: '1', name: 'Test' };
      const mutationFn = vi.fn().mockResolvedValue(mockData);

      const { result } = renderHook(() => useApiMutation({ mutationFn }));

      await act(async () => {
        await result.current.mutate(undefined);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('should set isLoading during mutation execution', async () => {
      let resolvePromise: (value: string) => void;
      const mutationFn = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          }),
      );

      const { result } = renderHook(() => useApiMutation({ mutationFn }));

      act(() => {
        result.current.mutate(undefined);
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!('done');
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should handle error and set error state', async () => {
      const error = createAxiosError(400, 'Bad request');
      const mutationFn = vi.fn().mockRejectedValue(error);

      const { result } = renderHook(() => useApiMutation({ mutationFn }));

      await act(async () => {
        await result.current.mutate(undefined);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.code).toBe(ErrorCode.BAD_REQUEST);
      expect(result.current.errorMessage).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });

    it('should pass variables to mutationFn', async () => {
      const mutationFn = vi.fn().mockResolvedValue({ success: true });
      const { result } = renderHook(() =>
        useApiMutation<{ success: boolean }, { name: string }>({ mutationFn }),
      );

      await act(async () => {
        await result.current.mutate({ name: 'test' });
      });

      expect(mutationFn).toHaveBeenCalledWith({ name: 'test' });
    });
  });

  describe('mutateAsync', () => {
    it('should return data on success', async () => {
      const mockData = { id: '1' };
      const mutationFn = vi.fn().mockResolvedValue(mockData);

      const { result } = renderHook(() => useApiMutation({ mutationFn }));

      let returnedData: unknown;
      await act(async () => {
        returnedData = await result.current.mutateAsync(undefined);
      });

      expect(returnedData).toEqual(mockData);
    });

    it('should throw error on failure', async () => {
      const error = createAxiosError(500);
      const mutationFn = vi.fn().mockRejectedValue(error);

      const { result } = renderHook(() => useApiMutation({ mutationFn }));

      await act(async () => {
        await expect(result.current.mutateAsync(undefined)).rejects.toThrow();
      });
    });
  });

  describe('callbacks', () => {
    it('should call onSuccess callback with data and variables', async () => {
      const mockData = { id: '1' };
      const onSuccess = vi.fn();
      const mutationFn = vi.fn().mockResolvedValue(mockData);

      const { result } = renderHook(() =>
        useApiMutation<{ id: string }, { name: string }>({
          mutationFn,
          onSuccess,
        }),
      );

      await act(async () => {
        await result.current.mutate({ name: 'test' });
      });

      expect(onSuccess).toHaveBeenCalledWith(mockData, { name: 'test' });
    });

    it('should call onError callback with error and variables', async () => {
      const error = createAxiosError(400);
      const onError = vi.fn();
      const mutationFn = vi.fn().mockRejectedValue(error);

      const { result } = renderHook(() =>
        useApiMutation<unknown, { name: string }>({
          mutationFn,
          onError,
        }),
      );

      await act(async () => {
        await result.current.mutate({ name: 'test' });
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: ErrorCode.BAD_REQUEST }),
        { name: 'test' },
      );
    });

    it('should call onSettled callback on success', async () => {
      const mockData = { id: '1' };
      const onSettled = vi.fn();
      const mutationFn = vi.fn().mockResolvedValue(mockData);

      const { result } = renderHook(() =>
        useApiMutation<{ id: string }, { name: string }>({
          mutationFn,
          onSettled,
        }),
      );

      await act(async () => {
        await result.current.mutate({ name: 'test' });
      });

      expect(onSettled).toHaveBeenCalledWith(mockData, null, { name: 'test' });
    });

    it('should call onSettled callback on error', async () => {
      const error = createAxiosError(500);
      const onSettled = vi.fn();
      const mutationFn = vi.fn().mockRejectedValue(error);

      const { result } = renderHook(() =>
        useApiMutation<unknown, { name: string }>({
          mutationFn,
          onSettled,
        }),
      );

      await act(async () => {
        await result.current.mutate({ name: 'test' });
      });

      expect(onSettled).toHaveBeenCalledWith(null, expect.any(Object), { name: 'test' });
    });
  });

  describe('retry functionality', () => {
    it('should retry on transient error when retry is enabled', async () => {
      const error = createAxiosError(500);
      const mutationFn = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() =>
        useApiMutation({
          mutationFn,
          retry: true,
          retryConfig: { maxRetries: 2, initialDelayMs: 10 }, // Short delay for tests
        }),
      );

      await act(async () => {
        await result.current.mutate(undefined);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mutationFn).toHaveBeenCalledTimes(2);
    });

    it('should not retry when retry is disabled', async () => {
      const error = createAxiosError(500);
      const mutationFn = vi.fn().mockRejectedValue(error);

      const { result } = renderHook(() =>
        useApiMutation({
          mutationFn,
          retry: false,
        }),
      );

      await act(async () => {
        await result.current.mutate(undefined);
      });

      expect(mutationFn).toHaveBeenCalledTimes(1);
      expect(result.current.isError).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset state to initial values', async () => {
      const mockData = { id: '1' };
      const mutationFn = vi.fn().mockResolvedValue(mockData);

      const { result } = renderHook(() => useApiMutation({ mutationFn }));

      await act(async () => {
        await result.current.mutate(undefined);
      });

      expect(result.current.data).not.toBeNull();
      expect(result.current.isSuccess).toBe(true);

      act(() => {
        result.current.reset();
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });
});
