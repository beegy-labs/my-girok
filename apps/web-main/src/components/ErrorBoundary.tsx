import { Component, ErrorInfo, ReactNode } from 'react';
import { CharacterMessage } from './characters';

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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg-primary">
          <CharacterMessage
            type="error"
            size={150}
            action={
              <button
                onClick={this.handleReset}
                className="bg-gradient-to-r from-amber-700 to-amber-600 dark:from-amber-400 dark:to-amber-500
                           hover:from-amber-800 hover:to-amber-700 dark:hover:from-amber-300 dark:hover:to-amber-400
                           text-white dark:text-gray-900 px-6 py-3 rounded-lg font-semibold
                           shadow-lg shadow-amber-700/30 dark:shadow-amber-500/20
                           transform hover:scale-105 transition-all"
              >
                홈으로 돌아가기
              </button>
            }
          />
        </div>
      );
    }

    return this.props.children;
  }
}
