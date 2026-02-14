import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from "convex/react";
import { api } from '../../convex/_generated/api';
import { useEffect, useState } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { Navbar } from '@/components/layout/Navbar';
import { ClaimCommentsModal } from '@/components/auth/ClaimCommentsModal';
import { getExistingAnonymousId } from '@/lib/anonymousUser';

export function Login() {
  const viewer = useQuery(api.users.viewer);
  const isAuthenticated = viewer !== null && viewer !== undefined;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/';

  const [showClaimModal, setShowClaimModal] = useState(false);
  const [anonymousIdForClaim, setAnonymousIdForClaim] = useState<string | null>(null);
  const [hasProcessedAuth, setHasProcessedAuth] = useState(false);

  // When user becomes authenticated, check for anonymous comments
  useEffect(() => {
    if (isAuthenticated && !hasProcessedAuth) {
      setHasProcessedAuth(true);
      const anonymousId = getExistingAnonymousId();
      if (anonymousId) {
        setAnonymousIdForClaim(anonymousId);
        setShowClaimModal(true);
      } else {
        navigate(returnTo);
      }
    }
  }, [isAuthenticated, hasProcessedAuth, navigate, returnTo]);

  const handleClaimComplete = () => {
    setShowClaimModal(false);
    navigate(returnTo);
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto px-4 py-12">
        <LoginForm />
      </main>

      {showClaimModal && anonymousIdForClaim && (
        <ClaimCommentsModal
          isOpen={showClaimModal}
          onComplete={handleClaimComplete}
          anonymousId={anonymousIdForClaim}
        />
      )}
    </div>
  );
}
