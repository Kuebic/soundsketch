import { useState } from 'react';
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from '../ui/Button';
import { Loader2 } from 'lucide-react';

function getFriendlyError(err: unknown, isSignUp: boolean): string {
  const message = err instanceof Error ? err.message : "";

  if (message.includes("Invalid password") || message.includes("InvalidSecret"))
    return "Incorrect password. Please try again.";
  if (message.includes("Could not find user") || message.includes("InvalidAccountId"))
    return "No account found with that username or email.";
  if (message.includes("already exists") || message.includes("UniqueError"))
    return "An account with that username or email already exists. Try logging in instead.";
  if (message.includes("rate limit") || message.includes("RateLimited"))
    return "Too many attempts. Please wait a moment and try again.";
  if (message.includes("Server Error") || message.includes("Index") || message.includes("Uncaught"))
    return "Something went wrong on our end. Please try again later.";

  return isSignUp
    ? "Could not create account. Please try again."
    : "Could not sign in. Please try again.";
}

export function LoginForm() {
  // Sign in fields
  const [identifier, setIdentifier] = useState(''); // username or email for login
  const [password, setPassword] = useState('');

  // Sign up fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuthActions();
  const convex = useConvex();

  const validateUsername = (value: string): string | null => {
    const trimmed = value.trim();
    if (trimmed.length < 3) return 'Username must be at least 3 characters';
    if (trimmed.length > 30) return 'Username must be 30 characters or fewer';
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) return 'Username can only contain letters, numbers, and underscores';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isSignUp) {
      // Validate username
      const usernameError = validateUsername(username);
      if (usernameError) {
        setError(usernameError);
        setLoading(false);
        return;
      }

      // Validate password confirmation
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      try {
        // If no email provided, generate a placeholder from username
        // This satisfies the Password provider while making email effectively optional
        const effectiveEmail = email.trim() || `${username.trim().toLowerCase()}@soundsketch.local`;

        await signIn("password", {
          email: effectiveEmail,
          password,
          flow: "signUp",
          name: username.trim(),
          username: username.trim().toLowerCase(),
        });
      } catch (err) {
        setError(getFriendlyError(err, true));
      } finally {
        setLoading(false);
      }
    } else {
      try {
        // Resolve username to email first (supports username or email login)
        const resolved = await convex.query(api.users.resolveLoginIdentifier, {
          identifier: identifier.trim(),
        });

        if (!resolved) {
          setError("No account found with that username or email.");
          setLoading(false);
          return;
        }

        await signIn("password", {
          email: resolved.email,
          password,
          flow: "signIn",
        });
      } catch (err) {
        setError(getFriendlyError(err, false));
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="card max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">
        {isSignUp ? 'Create Account' : 'Welcome Back'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {isSignUp ? (
          <>
            {/* Username (required for signup) */}
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                className="input"
                required
                disabled={loading}
                minLength={3}
                maxLength={30}
              />
              <p className="text-xs text-studio-text-secondary mt-1">
                Letters, numbers, and underscores only
              </p>
            </div>

            {/* Email (optional) */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Email <span className="text-studio-text-secondary">(optional)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input"
                disabled={loading}
              />
              <p className="text-xs text-studio-text-secondary mt-1">
                Only needed for password recovery
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
                required
                disabled={loading}
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
                required
                disabled={loading}
              />
            </div>
          </>
        ) : (
          <>
            {/* Login: Username or Email */}
            <div>
              <label className="block text-sm font-medium mb-2">Username or Email</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="username or email"
                className="input"
                required
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
                required
                disabled={loading}
              />
            </div>
          </>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
              {isSignUp ? 'Creating Account...' : 'Logging In...'}
            </>
          ) : (
            <>{isSignUp ? 'Sign Up' : 'Log In'}</>
          )}
        </Button>

        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError(null);
          }}
          className="w-full text-sm text-studio-text-secondary hover:text-studio-text-primary transition-colors"
          disabled={loading}
        >
          {isSignUp
            ? 'Already have an account? Log in'
            : "Don't have an account? Sign up"}
        </button>
      </form>
    </div>
  );
}
