import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { toast } from 'sonner';
import {
  showErrorToast,
  showSuccessToast,
  showInfoToast,
  showWarningToast,
  showLoadingToast,
  toastPromise,
  dismissToast,
  dismissAllToasts,
} from './toast';
import type { AppError } from './error-handler';

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    promise: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe('Toast Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('showErrorToast', () => {
    it('should show error toast with string message', () => {
      const errorMessage = 'Something went wrong';

      showErrorToast(errorMessage);

      expect(toast.error).toHaveBeenCalledWith(errorMessage, {
        description: undefined,
        duration: 6000,
      });
    });

    it('should show error toast with AppError (transient)', () => {
      const appError: AppError = {
        code: 'NETWORK_ERROR',
        message: 'Network failed',
        userMessage: 'Unable to connect',
        technicalDetails: 'Connection timeout',
        isTransient: true,
        shouldRetry: true,
        statusCode: 503,
      };

      showErrorToast(appError);

      expect(toast.error).toHaveBeenCalledWith('Unable to connect', {
        description: 'Connection timeout',
        duration: 4000, // transient errors have shorter duration
      });
    });

    it('should show error toast with AppError (non-transient)', () => {
      const appError: AppError = {
        code: 'FORBIDDEN',
        message: 'Access denied',
        userMessage: "You don't have permission",
        technicalDetails: 'Missing role: admin',
        isTransient: false,
        shouldRetry: false,
        statusCode: 403,
      };

      showErrorToast(appError);

      expect(toast.error).toHaveBeenCalledWith("You don't have permission", {
        description: 'Missing role: admin',
        duration: 6000, // non-transient errors have longer duration
      });
    });

    it('should show error toast with regular Error object', () => {
      const error = new Error('Unexpected error occurred');

      showErrorToast(error);

      expect(toast.error).toHaveBeenCalledWith('Unexpected error occurred', {
        description: undefined,
        duration: 6000,
      });
    });

    it('should merge custom options with default options', () => {
      const errorMessage = 'Test error';
      const customOptions = {
        action: {
          label: 'Retry',
          onClick: vi.fn(),
        },
      };

      showErrorToast(errorMessage, customOptions);

      expect(toast.error).toHaveBeenCalledWith(errorMessage, {
        description: undefined,
        duration: 6000,
        action: customOptions.action,
      });
    });
  });

  describe('showSuccessToast', () => {
    it('should show success toast with message', () => {
      const message = 'Operation completed successfully';

      showSuccessToast(message);

      expect(toast.success).toHaveBeenCalledWith(message, {
        duration: 3000,
      });
    });

    it('should merge custom options', () => {
      const message = 'Success';
      const customOptions = { duration: 5000 };

      showSuccessToast(message, customOptions);

      expect(toast.success).toHaveBeenCalledWith(message, {
        duration: 5000, // custom duration overrides default
      });
    });
  });

  describe('showInfoToast', () => {
    it('should show info toast with message only', () => {
      const message = 'Information message';

      showInfoToast(message);

      expect(toast.info).toHaveBeenCalledWith(message, {
        description: undefined,
        duration: 4000,
      });
    });

    it('should show info toast with message and description', () => {
      const message = 'Profile updated';
      const description = 'Changes will take effect immediately';

      showInfoToast(message, description);

      expect(toast.info).toHaveBeenCalledWith(message, {
        description,
        duration: 4000,
      });
    });

    it('should merge custom options', () => {
      const message = 'Info';
      const description = 'Details';
      const customOptions = { duration: 6000 };

      showInfoToast(message, description, customOptions);

      expect(toast.info).toHaveBeenCalledWith(message, {
        description,
        duration: 6000,
      });
    });
  });

  describe('showWarningToast', () => {
    it('should show warning toast with message only', () => {
      const message = 'Warning message';

      showWarningToast(message);

      expect(toast.warning).toHaveBeenCalledWith(message, {
        description: undefined,
        duration: 5000,
      });
    });

    it('should show warning toast with message and description', () => {
      const message = 'Low disk space';
      const description = 'Consider removing old files';

      showWarningToast(message, description);

      expect(toast.warning).toHaveBeenCalledWith(message, {
        description,
        duration: 5000,
      });
    });

    it('should merge custom options', () => {
      const message = 'Warning';
      const description = 'Details';
      const customOptions = { duration: 7000 };

      showWarningToast(message, description, customOptions);

      expect(toast.warning).toHaveBeenCalledWith(message, {
        description,
        duration: 7000,
      });
    });
  });

  describe('showLoadingToast', () => {
    it('should show loading toast', () => {
      const message = 'Processing...';

      showLoadingToast(message);

      expect(toast.loading).toHaveBeenCalledWith(message);
    });
  });

  describe('toastPromise', () => {
    it('should handle promise with string messages', async () => {
      const promise = Promise.resolve('data');
      const messages = {
        loading: 'Loading...',
        success: 'Success!',
        error: 'Failed!',
      };

      toastPromise(promise, messages);

      expect(toast.promise).toHaveBeenCalledWith(promise, messages);
    });

    it('should handle promise with function messages', async () => {
      const promise = Promise.resolve({ id: '123' });
      const messages = {
        loading: 'Saving...',
        success: (data: { id: string }) => `Saved with ID: ${data.id}`,
        error: (err: Error) => `Error: ${err.message}`,
      };

      toastPromise(promise, messages);

      expect(toast.promise).toHaveBeenCalledWith(promise, messages);
    });
  });

  describe('dismissToast', () => {
    it('should dismiss toast by string ID', () => {
      const toastId = 'toast-123';

      dismissToast(toastId);

      expect(toast.dismiss).toHaveBeenCalledWith(toastId);
    });

    it('should dismiss toast by number ID', () => {
      const toastId = 456;

      dismissToast(toastId);

      expect(toast.dismiss).toHaveBeenCalledWith(toastId);
    });
  });

  describe('dismissAllToasts', () => {
    it('should dismiss all toasts', () => {
      dismissAllToasts();

      expect(toast.dismiss).toHaveBeenCalledWith();
    });
  });

  describe('Edge Cases', () => {
    it('should handle AppError without technicalDetails', () => {
      const appError: AppError = {
        code: 'NOT_FOUND',
        message: 'Resource not found',
        userMessage: 'The requested item was not found',
        isTransient: false,
        shouldRetry: false,
      };

      showErrorToast(appError);

      expect(toast.error).toHaveBeenCalledWith('The requested item was not found', {
        description: undefined,
        duration: 6000,
      });
    });

    it('should handle empty string error', () => {
      showErrorToast('');

      expect(toast.error).toHaveBeenCalledWith('', {
        description: undefined,
        duration: 6000,
      });
    });

    it('should handle Error with empty message', () => {
      const error = new Error();

      showErrorToast(error);

      expect(toast.error).toHaveBeenCalledWith('', {
        description: undefined,
        duration: 6000,
      });
    });
  });
});
