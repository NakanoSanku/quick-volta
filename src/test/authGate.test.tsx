import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthGate } from '../components/AuthGate';

vi.mock('../services/auth', () => ({
  getCurrentUser: vi.fn(),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
}));

import { getCurrentUser, loginWithGoogle, logout } from '../services/auth';

describe('AuthGate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows Google sign-in when anonymous', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ authenticated: false, user: null });
    render(<AuthGate>{() => <div>Private app</div>}</AuthGate>);

    expect(await screen.findByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sign in with Google' }));
    expect(loginWithGoogle).toHaveBeenCalled();
  });

  it('renders children for authenticated users', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ authenticated: true, user: { id: 'user-1', email: 'me@example.com', name: 'Me', avatarUrl: null } });
    render(<AuthGate>{({ user }) => <div>Welcome {user.email}</div>}</AuthGate>);

    await waitFor(() => expect(screen.getByText('Welcome me@example.com')).toBeInTheDocument());
  });

  it('signs out and returns to the sign-in screen without relying on a page reload', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ authenticated: true, user: { id: 'user-1', email: 'me@example.com', name: 'Me', avatarUrl: null } });
    vi.mocked(logout).mockResolvedValue(undefined);

    render(
      <AuthGate>
        {({ user, onLogout }) => (
          <div>
            <div>Welcome {user.email}</div>
            <button onClick={() => void onLogout()}>Sign out</button>
          </div>
        )}
      </AuthGate>,
    );

    await waitFor(() => expect(screen.getByText('Welcome me@example.com')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(logout).toHaveBeenCalled());
    expect(await screen.findByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
  });
});
