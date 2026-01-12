/**
 * ErrorDisplay Component
 *
 * Displays user-friendly error messages inline.
 * Used for API errors, form validation errors, etc.
 */

import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { AppError } from '../lib/error-handler';
import { Button } from './atoms/Button';

export interface ErrorDisplayProps {
  /**
   * Error to display
   */
  error: AppError | string | null;

  /**
   * Error variant style
   */
  variant?: 'banner' | 'inline' | 'card';

  /**
   * Show retry button
   */
  showRetry?: boolean;

  /**
   * Retry callback
   */
  onRetry?: () => void;

  /**
   * Show dismiss button
   */
  showDismiss?: boolean;

  /**
   * Dismiss callback
   */
  onDismiss?: () => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Get error message from various error types
 */
function getErrorMessage(error: AppError | string | null): string | null {
  if (!error) return null;
  if (typeof error === 'string') return error;
  return error.userMessage || error.message;
}

/**
 * Get technical details if available
 */
function getTechnicalDetails(error: AppError | string | null): string | null {
  if (!error || typeof error === 'string') return null;
  return error.technicalDetails || null;
}

export function ErrorDisplay({
  error,
  variant = 'inline',
  showRetry = false,
  onRetry,
  showDismiss = false,
  onDismiss,
  className = '',
}: ErrorDisplayProps) {
  if (!error) return null;

  const message = getErrorMessage(error);
  const technicalDetails = getTechnicalDetails(error);

  if (!message) return null;

  const baseClasses = 'rounded-lg border';
  const variantClasses = {
    banner: 'bg-theme-status-error-background border-theme-status-error-border p-4',
    inline: 'bg-theme-status-error-background border-theme-status-error-border p-3',
    card: 'bg-theme-background-primary border-theme-border-default p-6 shadow-sm',
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          size={variant === 'card' ? 24 : 20}
          className="text-theme-status-error-text flex-shrink-0 mt-0.5"
          aria-hidden="true"
        />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-theme-status-error-text">{message}</p>

          {technicalDetails && (
            <details className="mt-2">
              <summary className="text-xs text-theme-text-secondary cursor-pointer hover:text-theme-text-primary">
                Technical details
              </summary>
              <pre className="mt-1 text-xs text-theme-text-secondary font-mono whitespace-pre-wrap break-words">
                {technicalDetails}
              </pre>
            </details>
          )}

          {(showRetry || showDismiss) && (
            <div className="flex items-center gap-2 mt-3">
              {showRetry && onRetry && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onRetry}
                  icon={RefreshCw}
                  className="text-xs"
                >
                  Try again
                </Button>
              )}
              {showDismiss && onDismiss && (
                <button
                  onClick={onDismiss}
                  className="text-xs text-theme-text-secondary hover:text-theme-text-primary transition-colors"
                  aria-label="Dismiss error"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>

        {showDismiss && onDismiss && (
          <button
            onClick={onDismiss}
            className="text-theme-text-tertiary hover:text-theme-text-primary transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Compact error display for forms
 */
export function FormErrorDisplay({
  error,
  className = '',
}: {
  error: string | null;
  className?: string;
}) {
  if (!error) return null;

  return (
    <div className={`flex items-center gap-2 text-sm text-theme-status-error-text ${className}`}>
      <AlertCircle size={16} aria-hidden="true" />
      <span>{error}</span>
    </div>
  );
}

/**
 * Full page error display
 */
export function PageError({
  error,
  onRetry,
  onGoBack,
}: {
  error: AppError | string;
  onRetry?: () => void;
  onGoBack?: () => void;
}) {
  const technicalDetails = getTechnicalDetails(error);

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <div className="max-w-md w-full">
        <ErrorDisplay error={error} variant="card" className="mb-4" />

        {technicalDetails && (
          <details className="mt-4 p-4 bg-theme-background-secondary rounded-lg border border-theme-border-default">
            <summary className="text-sm font-medium text-theme-text-primary cursor-pointer">
              Technical Details
            </summary>
            <pre className="mt-2 text-xs text-theme-text-secondary font-mono whitespace-pre-wrap break-words">
              {technicalDetails}
            </pre>
          </details>
        )}

        <div className="flex items-center gap-3 mt-6">
          {onRetry && (
            <Button onClick={onRetry} icon={RefreshCw} className="flex-1">
              Try Again
            </Button>
          )}
          {onGoBack && (
            <Button onClick={onGoBack} variant="secondary" className="flex-1">
              Go Back
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
