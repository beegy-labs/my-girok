/**
 * Toast Notifications
 *
 * Centralized toast notification system using Sonner.
 * Integrates with AppError for consistent error display.
 */

import { toast, type ExternalToast } from 'sonner';
import { AppError } from './error-handler';

export interface ToastOptions extends ExternalToast {
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Show error toast notification
 */
export function showErrorToast(error: AppError | Error | string, options?: ToastOptions) {
  let message: string;
  let description: string | undefined;
  let duration: number;

  if (typeof error === 'string') {
    message = error;
    description = undefined;
    duration = 6000;
  } else if ('code' in error && 'userMessage' in error) {
    // AppError
    const appError = error as AppError;
    message = appError.userMessage;
    description = appError.technicalDetails;
    duration = appError.isTransient ? 4000 : 6000;
  } else {
    // Regular Error
    message = error.message;
    description = undefined;
    duration = 6000;
  }

  return toast.error(message, {
    description,
    duration,
    ...options,
  });
}

/**
 * Show success toast notification
 */
export function showSuccessToast(message: string, options?: ToastOptions) {
  return toast.success(message, {
    duration: 3000,
    ...options,
  });
}

/**
 * Show info toast notification
 */
export function showInfoToast(message: string, description?: string, options?: ToastOptions) {
  return toast.info(message, {
    description,
    duration: 4000,
    ...options,
  });
}

/**
 * Show warning toast notification
 */
export function showWarningToast(message: string, description?: string, options?: ToastOptions) {
  return toast.warning(message, {
    description,
    duration: 5000,
    ...options,
  });
}

/**
 * Show loading toast notification
 */
export function showLoadingToast(message: string) {
  return toast.loading(message);
}

/**
 * Promise-based toast with automatic state management
 */
export function toastPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((err: Error) => string);
  },
) {
  return toast.promise(promise, messages);
}

/**
 * Dismiss a specific toast
 */
export function dismissToast(toastId: string | number) {
  toast.dismiss(toastId);
}

/**
 * Dismiss all toasts
 */
export function dismissAllToasts() {
  toast.dismiss();
}
