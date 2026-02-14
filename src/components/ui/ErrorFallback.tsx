import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

import type { FallbackProps } from 'react-error-boundary';

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card max-w-md text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
        <p className="text-sm text-studio-text-secondary mb-6">
          An unexpected error occurred. You can try again or go back to the home page.
        </p>
        {import.meta.env.DEV && (
          <pre className="text-xs text-red-400 bg-studio-dark rounded-lg p-3 mb-4 text-left overflow-auto max-h-32">
            {error instanceof Error ? error.message : String(error)}
          </pre>
        )}
        <div className="flex gap-3 justify-center">
          <Button variant="primary" onClick={resetErrorBoundary}>
            Try Again
          </Button>
          <Button variant="secondary" onClick={() => { window.location.href = '/'; }}>
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
