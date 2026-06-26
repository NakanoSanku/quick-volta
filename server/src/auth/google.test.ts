import { describe, expect, it, vi } from 'vitest';
import { exchangeGoogleCode, fetchGoogleProfile } from './google';

describe('google auth helpers', () => {
  it('exchanges an authorization code for an access token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ access_token: 'access-token', id_token: 'id-token' }),
    } as Response);

    const tokens = await exchangeGoogleCode({
      fetchImpl: fetchMock as unknown as typeof fetch,
      code: 'code-1',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: 'http://localhost/callback',
    });

    expect(tokens).toEqual({ accessToken: 'access-token', idToken: 'id-token' });
    expect(fetchMock).toHaveBeenCalledWith('https://oauth2.googleapis.com/token', expect.objectContaining({ method: 'POST' }));
  });

  it('fetches a normalized Google profile', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ sub: 'google-sub', email: 'me@example.com', name: 'Me', picture: 'https://avatar.test/me.png' }),
    } as Response);

    await expect(fetchGoogleProfile({ fetchImpl: fetchMock as unknown as typeof fetch, accessToken: 'access-token' })).resolves.toEqual({
      googleSub: 'google-sub',
      email: 'me@example.com',
      name: 'Me',
      avatarUrl: 'https://avatar.test/me.png',
    });
  });
});
