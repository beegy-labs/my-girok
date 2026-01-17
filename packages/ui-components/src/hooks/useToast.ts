import { toast } from 'sonner';

interface ToastOptions {
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
}

/**
 * useToast hook
 * Wrapper around Sonner toast library for consistent toast notifications
 *
 * @example
 * ```tsx
 * const { showToast } = useToast();
 *
 * showToast({
 *   type: 'success',
 *   title: 'Success',
 *   message: 'Operation completed successfully',
 *   duration: 4000,
 * });
 * ```
 */
export function useToast() {
  const showToast = ({ type, title, message, duration = 4000 }: ToastOptions) => {
    const toastFn = toast[type];
    toastFn(title, {
      description: message,
      duration,
    });
  };

  return {
    showToast,
  };
}
