import { useNavigate } from 'react-router-dom';
import { useQuery } from "convex/react";
import { api } from '../../convex/_generated/api';
import { useEffect } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { Navbar } from '@/components/layout/Navbar';

export function Login() {
  const viewer = useQuery(api.users.viewer);
  const isAuthenticated = viewer !== null && viewer !== undefined;
  const navigate = useNavigate();

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
