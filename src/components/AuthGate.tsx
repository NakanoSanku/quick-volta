import { useEffect, useState, type ReactNode } from 'react';
import { getCurrentUser, loginWithGoogle, type CurrentUser } from '../services/auth';

interface AuthGateProps {
  children: (context: { user: CurrentUser }) => ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const authError = new URLSearchParams(window.location.search).get('authError');

  useEffect(() => {
    getCurrentUser()
      .then((result) => setUser(result.authenticated ? result.user : null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="auth-screen"><p>Loading Quick Volta...</p></div>;
  }

  if (!user) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1>Quick Volta</h1>
          <p>Sign in to sync flashcards, review progress, and LINE reminders.</p>
          {authError && <div className="error-banner">Google sign-in failed. Please try again.</div>}
          <button className="btn btn-primary" onClick={loginWithGoogle}>Sign in with Google</button>
        </div>
      </div>
    );
  }

  return <>{children({ user })}</>;
}
