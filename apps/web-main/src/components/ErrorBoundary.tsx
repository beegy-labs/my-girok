import { Component, ErrorInfo, ReactNode } from 'react';
import { CharacterMessage } from './characters';
import i18n from '../i18n/config';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * ErrorBoundary - Catches React errors and displays character error message
 *
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-vintage-bg-page dark:bg-dark-bg-primary">
          <CharacterMessage
            type="error"
            size={150}
            action={
              <button
                onClick={this.handleReset}
                className="bg-gradient-to-r from-vintage-primary-dark to-vintage-primary dark:from-vintage-primary-dark dark:to-vintage-primary
                           hover:from-vintage-primary hover:to-vintage-primary-light dark:hover:from-vintage-primary dark:hover:to-vintage-primary-light
                           text-white dark:text-white px-6 py-3 rounded-lg font-semibold
                           shadow-lg shadow-vintage-primary/30 dark:shadow-vintage-primary/30
                           transform hover:scale-105 transition-all"
              >
                {i18n.t('common.backToHome')}
              </button>
            }
          />
        </div>
      );
    }

    return this.props.children;
  }
}
