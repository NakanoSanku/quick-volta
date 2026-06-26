import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthGate } from '../components/AuthGate';

vi.mock('../services/auth', () => ({
  getCurrentUser: vi.fn(),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
}));

import { getCurrentUser, loginWithGoogle } from '../services/auth';

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
});
