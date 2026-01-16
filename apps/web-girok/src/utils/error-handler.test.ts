/**
 * Error Handler Tests
 *
 * Tests for centralized error handling utilities.
 */

import { describe, it, expect, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import {
  ErrorCode,
  parseAxiosError,
  handleApiError,
  withRetry,
  getErrorMessage,
  isAuthenticationError,
  isValidationError,
  getValidationErrors,
} from './error-handler';

// Helper to create mock AxiosError
function createAxiosError(
  status?: number,
  data?: Record<string, unknown>,
  code?: string,
): AxiosError {
  const error = new Error('Test error') as AxiosError;
  error.isAxiosError = true;
  error.code = code;
  error.config = {
    method: 'get',
    url: '/test',
    headers: new AxiosHeaders(),
  };

  if (status !== undefined) {
    error.response = {
      status,
      statusText: 'Error',
      data: data || {},
      headers: {},
      config: error.config,
    };
  }

  return error;
}

describe('error-handler', () => {
  describe('parseAxiosError', () => {
    it('should parse 400 Bad Request error', () => {
      const error = createAxiosError(400);
      const result = parseAxiosError(error);

      expect(result.code).toBe(ErrorCode.BAD_REQUEST);
      expect(result.statusCode).toBe(400);
      expect(result.isTransient).toBe(false);
      expect(result.shouldRetry).toBe(false);
      expect(result.userMessage).toContain('Invalid request');
    });

    it('should parse 401 Unauthorized error', () => {
      const error = createAxiosError(401);
      const result = parseAxiosError(error);

      expect(result.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(result.statusCode).toBe(401);
      expect(result.isTransient).toBe(false);
      expect(result.shouldRetry).toBe(false);
    });

    it('should parse 403 Forbidden error', () => {
      const error = createAxiosError(403);
      const result = parseAxiosError(error);

      expect(result.code).toBe(ErrorCode.FORBIDDEN);
      expect(result.statusCode).toBe(403);
    });

    it('should parse 404 Not Found error', () => {
      const error = createAxiosError(404);
      const result = parseAxiosError(error);

      expect(result.code).toBe(ErrorCode.NOT_FOUND);
      expect(result.statusCode).toBe(404);
    });

    it('should parse 429 Rate Limited error as transient', () => {
      const error = createAxiosError(429);
      const result = parseAxiosError(error);

      expect(result.code).toBe(ErrorCode.RATE_LIMITED);
      expect(result.statusCode).toBe(429);
      expect(result.isTransient).toBe(true);
      expect(result.shouldRetry).toBe(true);
    });

    it('should parse 500 Internal Server Error as transient', () => {
      const error = createAxiosError(500);
      const result = parseAxiosError(error);

      expect(result.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
      expect(result.statusCode).toBe(500);
      expect(result.isTransient).toBe(true);
      expect(result.shouldRetry).toBe(true);
    });

    it('should parse 503 Service Unavailable as transient', () => {
      const error = createAxiosError(503);
      const result = parseAxiosError(error);

      expect(result.code).toBe(ErrorCode.SERVICE_UNAVAILABLE);
      expect(result.isTransient).toBe(true);
      expect(result.shouldRetry).toBe(true);
    });

    it('should parse network error (ERR_NETWORK) as transient', () => {
      const error = createAxiosError(undefined, undefined, 'ERR_NETWORK');
      const result = parseAxiosError(error);

      expect(result.code).toBe(ErrorCode.NETWORK_ERROR);
      expect(result.isTransient).toBe(true);
      expect(result.shouldRetry).toBe(true);
    });

    it('should parse timeout error (ECONNABORTED) as transient', () => {
      const error = createAxiosError(undefined, undefined, 'ECONNABORTED');
      const result = parseAxiosError(error);

      expect(result.code).toBe(ErrorCode.TIMEOUT);
      expect(result.isTransient).toBe(true);
      expect(result.shouldRetry).toBe(true);
    });

    it('should extract server message from response data', () => {
      const error = createAxiosError(400, { message: 'Custom server message' });
      const result = parseAxiosError(error);

      expect(result.message).toBe('Custom server message');
    });

    it('should extract error field from response data', () => {
      const error = createAxiosError(400, { error: 'Error from server' });
      const result = parseAxiosError(error);

      expect(result.message).toBe('Error from server');
    });

    it('should handle unknown status codes', () => {
      const error = createAxiosError(418); // I'm a teapot
      const result = parseAxiosError(error);

      expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR);
    });
  });

  describe('handleApiError', () => {
    it('should handle AxiosError', () => {
      const error = createAxiosError(404);
      const result = handleApiError(error);

      expect(result.code).toBe(ErrorCode.NOT_FOUND);
    });

    it('should handle regular Error', () => {
      const error = new Error('Regular error');
      const result = handleApiError(error);

      expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(result.message).toBe('Regular error');
      expect(result.isTransient).toBe(false);
      expect(result.shouldRetry).toBe(false);
    });

    it('should handle non-Error objects', () => {
      const result = handleApiError('string error');

      expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(result.message).toBe('string error');
    });

    it('should handle null/undefined', () => {
      const result = handleApiError(null);

      expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR);
    });
  });

  describe('withRetry', () => {
    it('should return result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient error and succeed', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(createAxiosError(500))
        .mockResolvedValueOnce('success after retry');

      const result = await withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 10, // Use short delays for testing
      });

      expect(result).toBe('success after retry');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-transient error (400)', async () => {
      const fn = vi.fn().mockRejectedValue(createAxiosError(400));

      await expect(withRetry(fn, { maxRetries: 3 })).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries exceeded', async () => {
      const fn = vi.fn().mockRejectedValue(createAxiosError(500));

      await expect(
        withRetry(fn, {
          maxRetries: 2,
          initialDelayMs: 10, // Use short delays for testing
        }),
      ).rejects.toThrow();

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should use custom retry config', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(createAxiosError(500))
        .mockResolvedValueOnce('success');

      const startTime = Date.now();
      const result = await withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 50,
        backoffMultiplier: 2,
      });
      const elapsed = Date.now() - startTime;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
      // Should have waited at least 50ms for first retry
      expect(elapsed).toBeGreaterThanOrEqual(40); // Allow some timing variance
    });
  });

  describe('getErrorMessage', () => {
    it('should return user-friendly message for AxiosError', () => {
      const error = createAxiosError(404);
      const message = getErrorMessage(error);

      expect(message).toContain('not found');
    });

    it('should return generic message for unknown error', () => {
      const message = getErrorMessage('unknown');

      expect(message).toContain('unexpected error');
    });
  });

  describe('isAuthenticationError', () => {
    it('should return true for 401 error', () => {
      const error = createAxiosError(401);
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('should return false for other status codes', () => {
      const error = createAxiosError(403);
      expect(isAuthenticationError(error)).toBe(false);
    });

    it('should return false for non-Axios error', () => {
      expect(isAuthenticationError(new Error('test'))).toBe(false);
    });
  });

  describe('isValidationError', () => {
    it('should return true for 400 error', () => {
      const error = createAxiosError(400);
      expect(isValidationError(error)).toBe(true);
    });

    it('should return true for 422 error', () => {
      const error = createAxiosError(422);
      expect(isValidationError(error)).toBe(true);
    });

    it('should return false for other status codes', () => {
      const error = createAxiosError(500);
      expect(isValidationError(error)).toBe(false);
    });
  });

  describe('getValidationErrors', () => {
    it('should extract errors object from response', () => {
      const error = createAxiosError(400, {
        errors: { email: 'Invalid email', name: 'Name required' },
      });

      const errors = getValidationErrors(error);

      expect(errors).toEqual({ email: 'Invalid email', name: 'Name required' });
    });

    it('should extract fieldErrors object from response', () => {
      const error = createAxiosError(422, {
        fieldErrors: { password: 'Too short' },
      });

      const errors = getValidationErrors(error);

      expect(errors).toEqual({ password: 'Too short' });
    });

    it('should return null for non-validation error', () => {
      const error = createAxiosError(500);
      const errors = getValidationErrors(error);

      expect(errors).toBeNull();
    });

    it('should return null if no error fields in response', () => {
      const error = createAxiosError(400, { message: 'Error' });
      const errors = getValidationErrors(error);

      expect(errors).toBeNull();
    });
  });
});
