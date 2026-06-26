import { useEffect, useState, type ReactNode } from 'react';
import { BookOpenCheck, Bell, Cloud } from 'lucide-react';
import { getCurrentUser, loginWithGoogle, logout, type CurrentUser } from '../services/auth';

interface AuthGateProps {
  children: (context: { user: CurrentUser; onLogout: () => Promise<void> }) => ReactNode;
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

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="auth-screen">
        <div className="auth-loading-card">
          <div className="auth-logo-mark">QV</div>
          <p>Loading Quick Volta...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-screen">
        <div className="auth-orb auth-orb-one" />
        <div className="auth-orb auth-orb-two" />
        <div className="auth-card">
          <div className="auth-logo-mark" aria-hidden="true">QV</div>
          <div className="auth-kicker">Personal flashcard review</div>
          <h1>Quick Volta</h1>
          <p className="auth-subtitle">Sign in to keep every card, review streak, and reminder in sync across devices.</p>
          <div className="auth-feature-list" aria-label="Quick Volta features">
            <span><BookOpenCheck size={15} /> Smart review</span>
            <span><Cloud size={15} /> Cloud sync</span>
            <span><Bell size={15} /> Due reminders</span>
          </div>
          {authError && <div className="error-banner auth-error">Google sign-in failed. Please try again.</div>}
          <button className="auth-google-button" onClick={loginWithGoogle} type="button">
            <span className="auth-google-icon" aria-hidden="true">G</span>
            <span>Sign in with Google</span>
          </button>
          <p className="auth-footnote">Your cards are private to your signed-in account.</p>
        </div>
      </div>
    );
  }

  return <>{children({ user, onLogout: handleLogout })}</>;
}
