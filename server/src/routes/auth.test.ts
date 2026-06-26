import { beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { loadConfig } from '../config';
import { prisma } from '../db';
import { authCookieFor, createTestUser } from '../test/appTestHelpers';

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

describe('auth routes', () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it('returns anonymous state without a session', async () => {
    const app = buildApp({ config });
    const response = await app.inject({ method: 'GET', url: '/api/me' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ authenticated: false, user: null });
  });

  it('returns current user for a valid session cookie', async () => {
    const app = buildApp({ config });
    const user = await createTestUser({ email: 'me@example.com', name: 'Me' });
    const cookie = await authCookieFor(user.id);

    const response = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      authenticated: true,
      user: { id: user.id, email: 'me@example.com', name: 'Me', avatarUrl: null },
    });
  });

  it('logs out by deleting the session cookie and database session', async () => {
    const app = buildApp({ config });
    const user = await createTestUser();
    const cookie = await authCookieFor(user.id);

    const response = await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie } });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    expect(await prisma.session.count()).toBe(0);
    expect(response.headers['set-cookie']).toContain('qv_session=;');
  });
});
