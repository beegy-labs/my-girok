/**
 * Toast Provider Component
 *
 * Wraps the application with Sonner's Toaster component.
 * Integrates with the theme system for consistent styling.
 */

import { Toaster } from 'sonner';
import { useTheme } from '../contexts/ThemeContext';

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const { resolvedTheme } = useTheme();

  return (
    <>
      {children}
      <Toaster
        theme={resolvedTheme as 'light' | 'dark'}
        position="bottom-right"
        expand={false}
        richColors
        closeButton
        toastOptions={{
          classNames: {
            toast: 'bg-theme-bg-card border-theme-border-default',
            title: 'text-theme-text-primary',
            description: 'text-theme-text-secondary',
            actionButton: 'bg-primary-600 text-white hover:bg-primary-700',
            cancelButton: 'bg-theme-bg-secondary hover:bg-theme-bg-tertiary',
            closeButton:
              'bg-theme-bg-secondary text-theme-text-tertiary hover:bg-theme-bg-tertiary',
            error:
              'bg-theme-status-error-bg border-theme-status-error text-theme-status-error-text',
            success:
              'bg-theme-status-success-bg border-theme-status-success text-theme-status-success-text',
            warning:
              'bg-theme-status-warning-bg border-theme-status-warning text-theme-status-warning-text',
            info: 'bg-theme-status-info-bg border-theme-status-info text-theme-status-info-text',
          },
        }}
      />
    </>
  );
}
