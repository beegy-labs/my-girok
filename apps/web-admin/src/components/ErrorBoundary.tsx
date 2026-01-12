// apps/web-admin/src/components/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './atoms/Button';
import { Card } from './atoms/Card';
import { trackError } from '../lib/otel';

interface Props extends WithTranslation {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundaryComponent extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    // Type guard for Error instances
    const errorInstance = error instanceof Error ? error : new Error(String(error));
    return { hasError: true, error: errorInstance };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    // Track error with OTEL
    const errorInstance = error instanceof Error ? error : new Error(String(error));
    trackError(errorInstance, this.props.componentName || 'ErrorBoundary');

    // Only log in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render() {
    const { t } = this.props;

    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <Card className="flex flex-col items-center gap-4 py-12">
            <AlertTriangle size={48} className="text-theme-status-error-text" aria-hidden="true" />
            <div className="text-center max-w-md">
              <h2 className="text-lg font-semibold text-theme-text-primary">
                {t('common.somethingWentWrong')}
              </h2>
              <p className="text-sm text-theme-text-secondary mt-1">
                {import.meta.env.DEV && this.state.error?.message
                  ? this.state.error.message
                  : t('common.unexpectedError')}
              </p>
              {import.meta.env.DEV && this.state.error?.stack && (
                <details className="mt-4 text-left">
                  <summary className="text-xs text-theme-text-tertiary cursor-pointer hover:text-theme-text-secondary">
                    Stack trace
                  </summary>
                  <pre className="mt-2 text-xs text-theme-text-tertiary font-mono whitespace-pre-wrap break-words p-3 bg-theme-background-secondary rounded border border-theme-border-default max-h-48 overflow-auto">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
            <Button onClick={this.handleReset} icon={RefreshCw}>
              {t('common.tryAgain')}
            </Button>
          </Card>
        )
      );
    }

    return this.props.children;
  }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryComponent);
