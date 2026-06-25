import { describe, expect, it } from 'vitest';
import { buildApp } from './app';
import { loadConfig } from './config';

const config = loadConfig({
  DATABASE_URL: 'postgresql://quick:volta@localhost:5432/quick_volta',
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

describe('buildApp', () => {
  it('serves health', async () => {
    const app = buildApp({ config });
    const response = await app.inject({ method: 'GET', url: '/api/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });
});
