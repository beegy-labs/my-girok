import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useApiError, useErrorMessage } from './useApiError';
import * as errorHandler from '../lib/error-handler';
import * as toast from '../lib/toast';

// Mock dependencies
vi.mock('../lib/error-handler', async () => {
  const actual = await vi.importActual('../lib/error-handler');
  return {
    ...actual,
    handleApiError: vi.fn(),
    withRetry: vi.fn((fn) => fn()),
    getErrorMessage: vi.fn(),
  };
});

vi.mock('../lib/toast', () => ({
  showErrorToast: vi.fn(),
}));

describe('useApiError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful API calls', () => {
    it('should execute function and return result', async () => {
      const mockData = { id: '123', name: 'Test' };
      const apiCall = vi.fn().mockResolvedValue(mockData);

      const { result } = renderHook(() => useApiError());

      let returnedData;
      await act(async () => {
        returnedData = await result.current.executeWithErrorHandling(apiCall);
      });

      expect(apiCall).toHaveBeenCalledTimes(1);
      expect(returnedData).toEqual(mockData);
      expect(result.current.error).toBeNull();
      expect(result.current.hasError).toBe(false);
      expect(result.current.errorMessage).toBeNull();
    });

    it('should clear previous error before executing', async () => {
      const mockError = new Error('First error');
      const mockAppError = {
        code: 'SERVER_ERROR',
        message: 'Server error',
        userMessage: 'Something went wrong',
        isTransient: false,
        shouldRetry: false,
      };

      vi.mocked(errorHandler.handleApiError).mockReturnValue(mockAppError);

      const { result } = renderHook(() => useApiError());

      // First call fails
      const failingCall = vi.fn().mockRejectedValue(mockError);
      await act(async () => {
        await result.current.executeWithErrorHandling(failingCall);
      });

      expect(result.current.hasError).toBe(true);

      // Second call succeeds
      const successfulCall = vi.fn().mockResolvedValue({ id: '123' });
      await act(async () => {
        await result.current.executeWithErrorHandling(successfulCall);
      });

      expect(result.current.hasError).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('failed API calls', () => {
    it('should handle error and show error toast by default', async () => {
      const mockError = new Error('API Error');
      const mockAppError = {
        code: 'SERVER_ERROR',
        message: 'Server error occurred',
        userMessage: 'Something went wrong',
        isTransient: false,
        shouldRetry: false,
      };
      const apiCall = vi.fn().mockRejectedValue(mockError);

      vi.mocked(errorHandler.handleApiError).mockReturnValue(mockAppError);

      const { result } = renderHook(() =>
        useApiError({
          context: 'TestContext',
        }),
      );

      await act(async () => {
        await result.current.executeWithErrorHandling(apiCall);
      });

      expect(errorHandler.handleApiError).toHaveBeenCalledWith(mockError, 'TestContext');
      expect(toast.showErrorToast).toHaveBeenCalledWith(mockAppError);
      expect(result.current.error).toEqual(mockAppError);
      expect(result.current.hasError).toBe(true);
      expect(result.current.errorMessage).toBe('Something went wrong');
    });

    it('should not show error toast when showToast is false', async () => {
      const mockError = new Error('API Error');
      const mockAppError = {
        code: 'SERVER_ERROR',
        message: 'Server error occurred',
        userMessage: 'Something went wrong',
        isTransient: false,
        shouldRetry: false,
      };
      const apiCall = vi.fn().mockRejectedValue(mockError);

      vi.mocked(errorHandler.handleApiError).mockReturnValue(mockAppError);

      const { result } = renderHook(() =>
        useApiError({
          showToast: false,
        }),
      );

      await act(async () => {
        await result.current.executeWithErrorHandling(apiCall);
      });

      expect(toast.showErrorToast).not.toHaveBeenCalled();
      expect(result.current.error).toEqual(mockAppError);
      expect(result.current.hasError).toBe(true);
    });

    it('should call onError callback when provided', async () => {
      const mockError = new Error('API Error');
      const mockAppError = {
        code: 'SERVER_ERROR',
        message: 'Server error',
        userMessage: 'Something went wrong',
        isTransient: false,
        shouldRetry: false,
      };
      const apiCall = vi.fn().mockRejectedValue(mockError);
      const onError = vi.fn();

      vi.mocked(errorHandler.handleApiError).mockReturnValue(mockAppError);

      const { result } = renderHook(() =>
        useApiError({
          onError,
        }),
      );

      await act(async () => {
        await result.current.executeWithErrorHandling(apiCall);
      });

      expect(onError).toHaveBeenCalledWith(mockAppError);
    });

    it('should return null on error', async () => {
      const mockError = new Error('API Error');
      const mockAppError = {
        code: 'SERVER_ERROR',
        message: 'Server error',
        userMessage: 'Something went wrong',
        isTransient: false,
        shouldRetry: false,
      };
      const apiCall = vi.fn().mockRejectedValue(mockError);

      vi.mocked(errorHandler.handleApiError).mockReturnValue(mockAppError);

      const { result } = renderHook(() => useApiError());

      let returnedData;
      await act(async () => {
        returnedData = await result.current.executeWithErrorHandling(apiCall);
      });

      expect(returnedData).toBeNull();
    });
  });

  describe('retry functionality', () => {
    it('should use withRetry when retry is enabled', async () => {
      const mockData = { id: '123' };
      const apiCall = vi.fn().mockResolvedValue(mockData);
      const retryConfig = { maxRetries: 3, initialDelayMs: 100 };

      vi.mocked(errorHandler.withRetry).mockImplementation(async (fn) => fn());

      const { result } = renderHook(() =>
        useApiError({
          retry: true,
          retryConfig,
        }),
      );

      await act(async () => {
        await result.current.executeWithErrorHandling(apiCall);
      });

      expect(errorHandler.withRetry).toHaveBeenCalled();
    });

    it('should not use withRetry when retry is disabled', async () => {
      const mockData = { id: '123' };
      const apiCall = vi.fn().mockResolvedValue(mockData);

      const { result } = renderHook(() =>
        useApiError({
          retry: false,
        }),
      );

      await act(async () => {
        await result.current.executeWithErrorHandling(apiCall);
      });

      expect(errorHandler.withRetry).not.toHaveBeenCalled();
      expect(apiCall).toHaveBeenCalledTimes(1);
    });
  });

  describe('error state management', () => {
    it('should clear error when clearError is called', async () => {
      const mockError = new Error('API Error');
      const mockAppError = {
        code: 'SERVER_ERROR',
        message: 'Server error',
        userMessage: 'Something went wrong',
        isTransient: false,
        shouldRetry: false,
      };
      const apiCall = vi.fn().mockRejectedValue(mockError);

      vi.mocked(errorHandler.handleApiError).mockReturnValue(mockAppError);

      const { result } = renderHook(() => useApiError());

      await act(async () => {
        await result.current.executeWithErrorHandling(apiCall);
      });

      expect(result.current.hasError).toBe(true);
      expect(result.current.error).toEqual(mockAppError);

      act(() => {
        result.current.clearError();
      });

      expect(result.current.hasError).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.errorMessage).toBeNull();
    });

    it('should handle multiple sequential API calls', async () => {
      const mockAppError1 = {
        code: 'ERROR_1',
        message: 'First error',
        userMessage: 'First error message',
        isTransient: false,
        shouldRetry: false,
      };
      const mockAppError2 = {
        code: 'ERROR_2',
        message: 'Second error',
        userMessage: 'Second error message',
        isTransient: false,
        shouldRetry: false,
      };

      vi.mocked(errorHandler.handleApiError)
        .mockReturnValueOnce(mockAppError1)
        .mockReturnValueOnce(mockAppError2);

      const { result } = renderHook(() => useApiError());

      const failingCall1 = vi.fn().mockRejectedValue(new Error('Error 1'));
      await act(async () => {
        await result.current.executeWithErrorHandling(failingCall1);
      });

      expect(result.current.error).toEqual(mockAppError1);
      expect(result.current.errorMessage).toBe('First error message');

      const failingCall2 = vi.fn().mockRejectedValue(new Error('Error 2'));
      await act(async () => {
        await result.current.executeWithErrorHandling(failingCall2);
      });

      expect(result.current.error).toEqual(mockAppError2);
      expect(result.current.errorMessage).toBe('Second error message');
    });
  });

  describe('loading state management', () => {
    it('should be false initially', () => {
      const { result } = renderHook(() => useApiError());

      expect(result.current.isLoading).toBe(false);
    });

    it('should be false after successful API call', async () => {
      const mockData = { id: '123' };
      const apiCall = vi.fn().mockResolvedValue(mockData);

      const { result } = renderHook(() => useApiError());

      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        await result.current.executeWithErrorHandling(apiCall);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should be false after API call fails', async () => {
      const mockError = new Error('API Error');
      const mockAppError = {
        code: 'SERVER_ERROR',
        message: 'Server error',
        userMessage: 'Something went wrong',
        isTransient: false,
        shouldRetry: false,
      };
      const apiCall = vi.fn().mockRejectedValue(mockError);

      vi.mocked(errorHandler.handleApiError).mockReturnValue(mockAppError);

      const { result } = renderHook(() => useApiError());

      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        await result.current.executeWithErrorHandling(apiCall);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(true);
    });

    it('should handle multiple sequential calls', async () => {
      const mockData1 = { id: '1' };
      const mockData2 = { id: '2' };
      const apiCall1 = vi.fn().mockResolvedValue(mockData1);
      const apiCall2 = vi.fn().mockResolvedValue(mockData2);

      const { result } = renderHook(() => useApiError());

      await act(async () => {
        await result.current.executeWithErrorHandling(apiCall1);
      });

      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        await result.current.executeWithErrorHandling(apiCall2);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle null result from API call', async () => {
      const apiCall = vi.fn().mockResolvedValue(null);

      const { result } = renderHook(() => useApiError());

      let returnedData;
      await act(async () => {
        returnedData = await result.current.executeWithErrorHandling(apiCall);
      });

      expect(returnedData).toBeNull();
      expect(result.current.hasError).toBe(false);
    });

    it('should handle undefined result from API call', async () => {
      const apiCall = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() => useApiError());

      let returnedData;
      await act(async () => {
        returnedData = await result.current.executeWithErrorHandling(apiCall);
      });

      expect(returnedData).toBeUndefined();
      expect(result.current.hasError).toBe(false);
    });
  });
});

describe('useErrorMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return null for null error', () => {
    const { result } = renderHook(() => useErrorMessage(null));

    expect(result.current).toBeNull();
  });

  it('should return null for undefined error', () => {
    const { result } = renderHook(() => useErrorMessage(undefined));

    expect(result.current).toBeNull();
  });

  it('should call getErrorMessage for error object', () => {
    const mockError = new Error('Test error');
    vi.mocked(errorHandler.getErrorMessage).mockReturnValue('Test error message');

    const { result } = renderHook(() => useErrorMessage(mockError));

    expect(errorHandler.getErrorMessage).toHaveBeenCalledWith(mockError);
    expect(result.current).toBe('Test error message');
  });
});
