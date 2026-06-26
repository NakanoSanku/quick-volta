import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../app';
import { loadConfig } from '../config';
import { prisma } from '../db';
import * as google from '../auth/google';

const config = loadConfig({
  DATABASE_URL: 'postgresql://quick_volta:quick_volta@localhost:5432/quick_volta',
  APP_BASE_URL: 'http://localhost:5173',
  API_BASE_URL: 'http://localhost:3000',
  SESSION_SECRET: '12345678901234567890123456789012',
  GOOGLE_CLIENT_ID: 'google-client-id',
  GOOGLE_CLIENT_SECRET: 'google-client-secret',
  GOOGLE_CALLBACK_URL: 'http://localhost:3000/api/auth/google/callback',
  LINE_CHANNEL_SECRET: 'line-secret',
  LINE_CHANNEL_ACCESS_TOKEN: 'line-token',
  LINE_BOT_ADD_FRIEND_URL: 'https://line.me/R/ti/p/@quickvolta',
  NODE_ENV: 'test',
});

describe('Google OAuth routes', () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    vi.restoreAllMocks();
  });

  it('redirects to Google with state cookie', async () => {
    const app = buildApp({ config });
    const response = await app.inject({ method: 'GET', url: '/api/auth/google' });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(response.headers.location).toContain('client_id=google-client-id');
    expect(response.headers['set-cookie']).toContain('qv_oauth_state=');
  });

  it('upserts user and creates a session on callback', async () => {
    vi.spyOn(google, 'exchangeGoogleCode').mockResolvedValue({ accessToken: 'access-token', idToken: 'id-token' });
    vi.spyOn(google, 'fetchGoogleProfile').mockResolvedValue({
      googleSub: 'google-sub',
      email: 'me@example.com',
      name: 'Me',
      avatarUrl: 'https://avatar.test/me.png',
    });

    const app = buildApp({ config });
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/google/callback?code=abc&state=state-1',
      headers: { cookie: 'qv_oauth_state=state-1' },
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('http://localhost:5173');
    expect(String(response.headers['set-cookie'])).toContain('qv_session=');
    expect(await prisma.user.findUnique({ where: { googleSub: 'google-sub' } })).toEqual(expect.objectContaining({ email: 'me@example.com' }));
  });

  it('rejects callback with mismatched state', async () => {
    const app = buildApp({ config });
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/google/callback?code=abc&state=wrong',
      headers: { cookie: 'qv_oauth_state=right' },
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('http://localhost:5173?authError=oauth_state');
  });
});

