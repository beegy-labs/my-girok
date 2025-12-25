// apps/web-admin/src/components/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './atoms/Button';
import { Card } from './atoms/Card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
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
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <Card className="flex flex-col items-center gap-4 py-12">
            <AlertTriangle size={48} className="text-theme-status-error-text" />
            <div className="text-center">
              <h2 className="text-lg font-semibold text-theme-text-primary">
                Something went wrong
              </h2>
              <p className="text-sm text-theme-text-secondary mt-1">
                {import.meta.env.DEV && this.state.error?.message
                  ? this.state.error.message
                  : 'An unexpected error occurred'}
              </p>
            </div>
            <Button onClick={this.handleReset} icon={RefreshCw}>
              Try Again
            </Button>
          </Card>
        )
      );
    }

    return this.props.children;
  }
}
