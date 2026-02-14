import { useMutation } from 'convex/react';
import { useCallback, useRef } from 'react';
import { api } from '../../convex/_generated/api';
import { getExistingAnonymousId, clearAnonymousIdentity } from '@/lib/anonymousUser';

/**
 * Hook to claim anonymous comments after authentication.
 * Returns a function that should be called after successful signup/login.
 */
export function useClaimComments() {
  const claimMutation = useMutation(api.comments.claimAnonymousComments);
  const claimingRef = useRef(false);

  return useCallback(async () => {
    if (claimingRef.current) return;

    const anonymousId = getExistingAnonymousId();
    if (!anonymousId) return;

    try {
      claimingRef.current = true;
      await claimMutation({ anonymousId });
      clearAnonymousIdentity();
    } catch (error) {
      console.error('Failed to claim anonymous comments:', error);
    } finally {
      claimingRef.current = false;
    }
  }, [claimMutation]);
}
