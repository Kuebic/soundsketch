import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

import type { FallbackProps } from 'react-error-boundary';

export function PlayerErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="card text-center py-8">
      <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
      <p className="text-sm text-studio-text-secondary mb-4">
        Failed to load the audio player. This may be a temporary issue.
      </p>
      {import.meta.env.DEV && (
        <pre className="text-xs text-red-400 bg-studio-dark rounded-lg p-2 mb-3 text-left overflow-auto max-h-24 mx-4">
          {error instanceof Error ? error.message : String(error)}
        </pre>
      )}
      <Button variant="secondary" size="sm" onClick={resetErrorBoundary}>
        Retry
      </Button>
    </div>
  );
}
