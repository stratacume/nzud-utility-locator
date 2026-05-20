import React from 'react';

interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <h1 className="text-2xl font-bold text-brand-navy mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-6">
              We hit an unexpected error. Please refresh the page. If this keeps happening,
              email <a href="mailto:julian@nzutilitydetection.com" className="text-brand-orange underline">julian@nzutilitydetection.com</a>
              {' '}or call <a href="tel:0272670217" className="text-brand-orange underline">027 267 0217</a>.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-brand-orange text-white rounded-lg font-semibold hover:bg-orange-600"
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
