"use client";

import React, { ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error("Error caught by boundary:", error);
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        this.props.fallback?.(this.state.error, this.retry) || (
          <div className="glass p-6 rounded-lg border border-accent-red/30 bg-accent-red/5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-accent-red shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-accent-red mb-1">Something went wrong</h3>
                <p className="text-sm text-text-secondary mb-3">{this.state.error.message}</p>
                <button
                  onClick={this.retry}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent-red/10 text-accent-red rounded-md hover:bg-accent-red/20 transition-colors text-sm font-medium"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Try again
                </button>
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
