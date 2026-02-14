import { useMemo } from 'react';
import { getAnonymousIdentity, type AnonymousIdentity } from '@/lib/anonymousUser';

/**
 * Hook to get the current anonymous identity.
 * Identity is created once and persisted in localStorage.
 */
export function useAnonymousIdentity(): AnonymousIdentity {
  // Memoize to avoid regenerating on every render
  const identity = useMemo(() => getAnonymousIdentity(), []);
  return identity;
}
