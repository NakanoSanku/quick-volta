import { describe, expect, it } from 'vitest';
import { loadConfig } from './config';

describe('loadConfig', () => {
  it('loads required config values', () => {
    expect(loadConfig({
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
      REMINDER_CRON_ENABLED: 'true',
      REMINDER_CHECK_INTERVAL_MINUTES: '15',
      NODE_ENV: 'test',
    })).toEqual(expect.objectContaining({
      databaseUrl: 'postgresql://quick:volta@localhost:5432/quick_volta',
      appBaseUrl: 'http://localhost:5173',
      apiBaseUrl: 'http://localhost:3000',
      reminderCronEnabled: true,
      reminderCheckIntervalMinutes: 15,
      port: 3000,
    }));
  });

  it('throws for missing required values', () => {
    expect(() => loadConfig({})).toThrow('DATABASE_URL is required.');
  });
});
