// apps/web-admin/src/components/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './atoms/Button';
import { Card } from './atoms/Card';

interface Props extends WithTranslation {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
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
            <div className="text-center">
              <h2 className="text-lg font-semibold text-theme-text-primary">
                {t('common.somethingWentWrong')}
              </h2>
              <p className="text-sm text-theme-text-secondary mt-1">
                {import.meta.env.DEV && this.state.error?.message
                  ? this.state.error.message
                  : t('common.unexpectedError')}
              </p>
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
