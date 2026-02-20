// @ts-nocheck
import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center text-text font-sans">
          <span className="material-icons-round text-6xl text-red-500 mb-4">error_outline</span>
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-sm text-textMuted max-w-sm mb-6">
            We encountered an unexpected error trying to load this section. 
          </p>
          <button 
             className="bg-primary text-white font-bold py-3 px-6 rounded-full hover:bg-primary/90 transition-colors shadow-sm"
             onClick={() => this.setState({ hasError: false })}
          >
            Try Again
          </button>
        </div>
      );
    }

    return <>{this.props.children}</>;
  }
}
