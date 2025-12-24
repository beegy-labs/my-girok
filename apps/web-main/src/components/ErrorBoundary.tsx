import { Component, ErrorInfo, ReactNode } from 'react';
import StatusMessage from './StatusMessage';
import { Button } from '@my-girok/ui-components';
import i18n from '../i18n/config';

const ERROR_COUNT_KEY = 'errorBoundary_retryCount';
const MAX_RETRY_COUNT = 3;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

/**
 * ErrorBoundary - Catches React errors and displays WCAG-compliant error message
 *
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    const storedCount = sessionStorage.getItem(ERROR_COUNT_KEY);
    this.state = {
      hasError: false,
      retryCount: storedCount ? parseInt(storedCount, 10) : 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    const newCount = this.state.retryCount + 1;
    sessionStorage.setItem(ERROR_COUNT_KEY, newCount.toString());
    this.setState({ retryCount: newCount });
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    sessionStorage.removeItem(ERROR_COUNT_KEY);
    this.setState({ hasError: false, error: undefined, retryCount: 0 });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const showRefreshButton = this.state.retryCount < MAX_RETRY_COUNT;

      return (
        <div className="min-h-screen flex items-center justify-center bg-theme-bg-page">
          <StatusMessage
            type="error"
            action={
              <div className="flex gap-3">
                <Button variant="primary" size="lg" onClick={this.handleGoHome}>
                  {i18n.t('common.backToHome')}
                </Button>
                {showRefreshButton && (
                  <Button variant="secondary" size="lg" onClick={this.handleRefresh}>
                    {i18n.t('common.refresh')}
                  </Button>
                )}
              </div>
            }
          />
        </div>
      );
    }

    return this.props.children;
  }
}
