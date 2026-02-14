import { useNavigate } from 'react-router-dom';
import { useQuery } from "convex/react";
import { api } from '../../convex/_generated/api';
import { useEffect, useRef } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { Navbar } from '@/components/layout/Navbar';
import { useClaimComments } from '@/hooks/useClaimComments';

export function Login() {
  const viewer = useQuery(api.users.viewer);
  const isAuthenticated = viewer !== null && viewer !== undefined;
  const navigate = useNavigate();
  const claimComments = useClaimComments();
  const hasClaimedRef = useRef(false);

  // Claim anonymous comments when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && !hasClaimedRef.current) {
      hasClaimedRef.current = true;
      void claimComments();
    }
  }, [isAuthenticated, claimComments]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto px-4 py-12">
        <LoginForm />
      </main>
    </div>
  );
}
