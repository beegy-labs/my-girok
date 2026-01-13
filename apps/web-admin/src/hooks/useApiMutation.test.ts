import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useApiMutation } from './useApiMutation';
import * as errorHandler from '../lib/error-handler';
import * as toast from '../lib/toast';

// Mock dependencies
vi.mock('../lib/error-handler', async () => {
  const actual = await vi.importActual('../lib/error-handler');
  return {
    ...actual,
    handleApiError: vi.fn(),
    withRetry: vi.fn((fn) => fn()),
  };
});

vi.mock('../lib/toast', () => ({
  showErrorToast: vi.fn(),
  showSuccessToast: vi.fn(),
}));

describe('useApiMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful mutations', () => {
    it('should execute mutation and return data', async () => {
      const mockData = { id: '123', name: 'Test' };
      const mutationFn = vi.fn().mockResolvedValue(mockData);

      const { result } = renderHook(() =>
        useApiMutation({
          mutationFn,
        }),
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeNull();

      await act(async () => {
        await result.current.mutate();
      });

      expect(mutationFn).toHaveBeenCalledTimes(1);
      expect(result.current.data).toEqual(mockData);
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('should show success toast when successToast is a string', async () => {
      const mockData = { id: '123' };
      const mutationFn = vi.fn().mockResolvedValue(mockData);
      const successMessage = 'Item created successfully';

      const { result } = renderHook(() =>
        useApiMutation({
          mutationFn,
          successToast: successMessage,
        }),
      );

      await act(async () => {
        await result.current.mutate();
      });

      expect(toast.showSuccessToast).toHaveBeenCalledWith(successMessage);
    });

    it('should show success toast when successToast is a function', async () => {
      const mockData = { id: '123', name: 'Test Item' };
      const mutationFn = vi.fn().mockResolvedValue(mockData);
      const successToastFn = vi.fn((data: typeof mockData) => `Created "${data.name}"`);

      const { result } = renderHook(() =>
        useApiMutation({
          mutationFn,
          successToast: successToastFn,
        }),
      );

      await act(async () => {
        await result.current.mutate();
      });

      expect(successToastFn).toHaveBeenCalledWith(mockData);
      expect(toast.showSuccessToast).toHaveBeenCalledWith('Created "Test Item"');
    });

    it('should call onSuccess callback', async () => {
      const mockData = { id: '123' };
      const mutationFn = vi.fn().mockResolvedValue(mockData);
      const onSuccess = vi.fn();
      const variables = { name: 'Test' };

      const { result } = renderHook(() =>
        useApiMutation({
          mutationFn,
          onSuccess,
        }),
      );

      await act(async () => {
        await result.current.mutate(variables);
      });

      expect(onSuccess).toHaveBeenCalledWith(mockData, variables);
    });

    it('should call onSettled callback on success', async () => {
      const mockData = { id: '123' };
      const mutationFn = vi.fn().mockResolvedValue(mockData);
      const onSettled = vi.fn();
      const variables = { name: 'Test' };

      const { result } = renderHook(() =>
        useApiMutation({
          mutationFn,
          onSettled,
        }),
      );

      await act(async () => {
        await result.current.mutate(variables);
      });

      expect(onSettled).toHaveBeenCalledWith(mockData, null, variables);
    });
  });

  describe('failed mutations', () => {
    it('should handle error and show error toast by default', async () => {
      const mockError = new Error('API Error');
      const mockAppError = {
        code: 'SERVER_ERROR',
        message: 'Server error occurred',
        userMessage: 'Something went wrong',
        isTransient: false,
        shouldRetry: false,
      };
      const mutationFn = vi.fn().mockRejectedValue(mockError);

      vi.mocked(errorHandler.handleApiError).mockReturnValue(mockAppError);

      const { result } = renderHook(() =>
        useApiMutation({
          mutationFn,
          context: 'TestContext',
        }),
      );

      await act(async () => {
        await result.current.mutate();
      });

      expect(errorHandler.handleApiError).toHaveBeenCalledWith(mockError, 'TestContext');
      expect(toast.showErrorToast).toHaveBeenCalledWith(mockAppError);
      expect(result.current.error).toEqual(mockAppError);
      expect(result.current.isError).toBe(true);
      expect(result.current.isSuccess).toBe(false);
    });

    it('should not show error toast when showErrorToast is false', async () => {
      const mockError = new Error('API Error');
      const mockAppError = {
        code: 'SERVER_ERROR',
        message: 'Server error occurred',
        userMessage: 'Something went wrong',
        isTransient: false,
        shouldRetry: false,
      };
      const mutationFn = vi.fn().mockRejectedValue(mockError);

      vi.mocked(errorHandler.handleApiError).mockReturnValue(mockAppError);

      const { result } = renderHook(() =>
        useApiMutation({
          mutationFn,
          showErrorToast: false,
        }),
      );

      await act(async () => {
        await result.current.mutate();
      });

      expect(toast.showErrorToast).not.toHaveBeenCalled();
      expect(result.current.error).toEqual(mockAppError);
    });

    it('should call onError callback', async () => {
      const mockError = new Error('API Error');
      const mockAppError = {
        code: 'SERVER_ERROR',
        message: 'Server error',
        userMessage: 'Something went wrong',
        isTransient: false,
        shouldRetry: false,
      };
      const mutationFn = vi.fn().mockRejectedValue(mockError);
      const onError = vi.fn();
      const variables = { name: 'Test' };

      vi.mocked(errorHandler.handleApiError).mockReturnValue(mockAppError);

      const { result } = renderHook(() =>
        useApiMutation({
          mutationFn,
          onError,
        }),
      );

      await act(async () => {
        await result.current.mutate(variables);
      });

      expect(onError).toHaveBeenCalledWith(mockAppError, variables);
    });

    it('should call onSettled callback on error', async () => {
      const mockError = new Error('API Error');
      const mockAppError = {
        code: 'SERVER_ERROR',
        message: 'Server error',
        userMessage: 'Something went wrong',
        isTransient: false,
        shouldRetry: false,
      };
      const mutationFn = vi.fn().mockRejectedValue(mockError);
      const onSettled = vi.fn();
      const variables = { name: 'Test' };

      vi.mocked(errorHandler.handleApiError).mockReturnValue(mockAppError);

      const { result } = renderHook(() =>
        useApiMutation({
          mutationFn,
          onSettled,
        }),
      );

      await act(async () => {
        await result.current.mutate(variables);
      });

      expect(onSettled).toHaveBeenCalledWith(null, mockAppError, variables);
    });
  });

  describe('retry functionality', () => {
    it('should use withRetry when retry is enabled', async () => {
      const mockData = { id: '123' };
      const mutationFn = vi.fn().mockResolvedValue(mockData);
      const retryConfig = { maxAttempts: 3, delayMs: 100 };

      vi.mocked(errorHandler.withRetry).mockImplementation(async (fn) => fn());

      const { result } = renderHook(() =>
        useApiMutation({
          mutationFn,
          retry: true,
          retryConfig,
        }),
      );

      await act(async () => {
        await result.current.mutate();
      });

      expect(errorHandler.withRetry).toHaveBeenCalled();
    });

    it('should not use withRetry when retry is disabled', async () => {
      const mockData = { id: '123' };
      const mutationFn = vi.fn().mockResolvedValue(mockData);

      const { result } = renderHook(() =>
        useApiMutation({
          mutationFn,
          retry: false,
        }),
      );

      await act(async () => {
        await result.current.mutate();
      });

      expect(errorHandler.withRetry).not.toHaveBeenCalled();
      expect(mutationFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('state management', () => {
    it('should reset state correctly', async () => {
      const mockData = { id: '123' };
      const mutationFn = vi.fn().mockResolvedValue(mockData);

      const { result } = renderHook(() =>
        useApiMutation({
          mutationFn,
        }),
      );

      await act(async () => {
        await result.current.mutate();
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.isSuccess).toBe(true);

      act(() => {
        result.current.reset();
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    it('should set isLoading correctly during mutation', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      const mutationFn = vi.fn().mockReturnValue(promise);

      const { result } = renderHook(() =>
        useApiMutation({
          mutationFn,
        }),
      );

      expect(result.current.isLoading).toBe(false);

      const mutatePromise = act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      act(() => {
        resolvePromise!({ id: '123' });
      });

      await mutatePromise;

      expect(result.current.isLoading).toBe(false);
    });

    it('should return errorMessage from error', async () => {
      const mockError = new Error('API Error');
      const mockAppError = {
        code: 'SERVER_ERROR',
        message: 'Server error',
        userMessage: 'User-friendly error message',
        isTransient: false,
        shouldRetry: false,
      };
      const mutationFn = vi.fn().mockRejectedValue(mockError);

      vi.mocked(errorHandler.handleApiError).mockReturnValue(mockAppError);

      const { result } = renderHook(() =>
        useApiMutation({
          mutationFn,
        }),
      );

      await act(async () => {
        await result.current.mutate();
      });

      expect(result.current.errorMessage).toBe('User-friendly error message');
    });
  });

  describe('mutateAsync', () => {
    it('should return data from mutateAsync', async () => {
      const mockData = { id: '123', name: 'Test' };
      const mutationFn = vi.fn().mockResolvedValue(mockData);

      const { result } = renderHook(() =>
        useApiMutation({
          mutationFn,
        }),
      );

      let returnedData;
      await act(async () => {
        returnedData = await result.current.mutateAsync();
      });

      expect(returnedData).toEqual(mockData);
    });

    it('should throw error from mutateAsync', async () => {
      const mockError = new Error('API Error');
      const mockAppError = {
        code: 'SERVER_ERROR',
        message: 'Server error',
        userMessage: 'Something went wrong',
        isTransient: false,
        shouldRetry: false,
      };
      const mutationFn = vi.fn().mockRejectedValue(mockError);

      vi.mocked(errorHandler.handleApiError).mockReturnValue(mockAppError);

      const { result } = renderHook(() =>
        useApiMutation({
          mutationFn,
        }),
      );

      await act(async () => {
        await expect(result.current.mutateAsync()).rejects.toThrow();
      });
    });
  });
});
