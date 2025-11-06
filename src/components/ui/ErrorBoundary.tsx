import React, { Component } from 'react';
import type { ReactNode } from 'react';
import { HUDFrame } from './HUDFrame';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * ErrorBoundary - Catches JavaScript errors in the component tree
 * 
 * Features:
 * - Catches errors during rendering, in lifecycle methods, and in constructors
 * - Displays fallback UI when errors occur
 * - Optional error reporting callback
 * - HUD-styled error display for consistency
 * - Production-ready error handling
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error information
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call optional error reporting callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to log to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: logErrorToService(error, errorInfo);
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI with HUD styling
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <HUDFrame
            color="red"
            variant="panel"
            className="max-w-2xl w-full p-8"
          >
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-hud-red">
                  System Error Detected
                </h1>
                <p className="text-gray-300">
                  An unexpected error occurred in the Space Colony Exchange system.
                </p>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-black/50 p-4 rounded border border-hud-red/30 text-left">
                  <h3 className="text-hud-red font-semibold mb-2">Error Details:</h3>
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-auto max-h-32">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </div>
              )}

              <div className="flex gap-4 justify-center">
                <button
                  onClick={this.handleReset}
                  className="px-6 py-2 bg-hud-blue/20 border border-hud-blue text-hud-blue rounded hover:bg-hud-blue/30 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={this.handleReload}
                  className="px-6 py-2 bg-hud-amber/20 border border-hud-amber text-hud-amber rounded hover:bg-hud-amber/30 transition-colors"
                >
                  Reload Page
                </button>
              </div>

              <div className="text-sm text-gray-400">
                <p>If this problem persists, please contact the facilitator.</p>
                <p className="mt-1">Error ID: {Date.now()}</p>
              </div>
            </div>
          </HUDFrame>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
) {
  return (props: T) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );
}

export default ErrorBoundary;