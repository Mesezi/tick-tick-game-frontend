import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — classroom-themed error fallback.
 * Chalkboard surface, school-red retry button.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught rendering error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="min-h-dvh flex flex-col items-center justify-center p-6 bg-chalk-board"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-md w-full text-center space-y-4">
            <div aria-hidden="true">
              <AlertTriangle className="w-10 h-10 mx-auto text-school-amber" />
            </div>
            <h1 className="text-xl font-bold font-display text-chalk-white">
              Something went wrong
            </h1>
            <p className="text-sm font-hand text-chalk-white">
              An unexpected error occurred. Please try again.
            </p>
            {this.state.error && (
              <details className="text-left rounded-xl p-3 text-sm card-dark">
                <summary className="cursor-pointer font-medium font-hand text-chalk-white">
                  Error details
                </summary>
                <pre className="mt-2 whitespace-pre-wrap wrap-break-word text-school-red">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              type="button"
              onClick={this.handleReset}
              className="mt-4 px-6 py-3 rounded-xl font-bold active:scale-95 transition-all btn-primary font-hand text-[15px]"
              style={{ boxShadow: '0 4px 12px rgba(107,68,35,0.28)' }}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
