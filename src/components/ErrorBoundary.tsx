import { Component, type ReactNode, type ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Dark themed error boundary with green retry button.
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
          className="min-h-dvh flex flex-col items-center justify-center p-6 bg-[#0a1a0f]"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-md w-full text-center space-y-4">
            <div className="text-4xl" aria-hidden="true">
              😵
            </div>
            <h1 className="text-xl font-bold text-white">
              Something went wrong
            </h1>
            <p className="text-[#8aaa8a] text-sm">
              An unexpected error occurred. Please try again.
            </p>
            {this.state.error && (
              <details className="text-left bg-[#1a2e1f] border border-[#2a4a32] rounded-lg p-3 text-xs text-[#8aaa8a]">
                <summary className="cursor-pointer font-medium text-white">
                  Error details
                </summary>
                <pre className="mt-2 whitespace-pre-wrap wrap-break-word text-[#FF6B35]">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              type="button"
              onClick={this.handleReset}
              className="mt-4 px-6 py-2.5 bg-[#00ff88] text-[#0a1a0f] font-bold rounded-lg
                hover:bg-[#00dd77] focus:outline-none focus:ring-2 focus:ring-[#00ff88]/30 focus:ring-offset-2 focus:ring-offset-[#0a1a0f]
                transition-colors"
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
