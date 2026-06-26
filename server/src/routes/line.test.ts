import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../app';
import { loadConfig } from '../config';
import { prisma } from '../db';
import { createTestUser, injectAs } from '../test/appTestHelpers';
import { sendLinePushMessage, replyLineMessage } from '../line/client';

vi.mock('../line/client', () => ({
  sendLinePushMessage: vi.fn().mockResolvedValue(undefined),
  replyLineMessage: vi.fn().mockResolvedValue(undefined),
}));

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

function sign(body: string) {
  return createHmac('sha256', config.lineChannelSecret).update(body).digest('base64');
}

describe('LINE routes', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await prisma.lineBindingCode.deleteMany();
    await prisma.lineConnection.deleteMany();
    await prisma.reminderSettings.deleteMany();
    await prisma.reviewStats.deleteMany();
    await prisma.card.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it('rejects anonymous LINE status requests', async () => {
    const app = buildApp({ config });
    const response = await app.inject({ method: 'GET', url: '/api/line/status' });
    expect(response.statusCode).toBe(401);
  });

  it('creates a binding code for the current user', async () => {
    const app = buildApp({ config });
    const user = await createTestUser();

    const response = await injectAs(app, user.id, { method: 'POST', url: '/api/line/binding-code' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(expect.objectContaining({ botAddFriendUrl: 'https://line.me/R/ti/p/@quickvolta' }));
    expect(response.json().code).toMatch(/^QV-[A-Z0-9]{4}$/);
  });

  it('rejects webhook requests with invalid signatures', async () => {
    const app = buildApp({ config });
    const response = await app.inject({ method: 'POST', url: '/api/line/webhook', headers: { 'x-line-signature': 'bad' }, payload: { events: [] } });
    expect(response.statusCode).toBe(401);
  });

  it('binds a valid text code from a LINE webhook event', async () => {
    const app = buildApp({ config });
    const user = await createTestUser();
    const codeResponse = await injectAs(app, user.id, { method: 'POST', url: '/api/line/binding-code' });
    const code = codeResponse.json().code;
    const rawBody = JSON.stringify({ events: [{ type: 'message', replyToken: 'reply-token', source: { userId: 'line-user-1' }, message: { type: 'text', text: code } }] });

    const response = await app.inject({ method: 'POST', url: '/api/line/webhook', headers: { 'content-type': 'application/json', 'x-line-signature': sign(rawBody) }, payload: rawBody });

    expect(response.statusCode).toBe(200);
    expect(await prisma.lineConnection.findUnique({ where: { userId: user.id } })).toEqual(expect.objectContaining({ lineUserId: 'line-user-1', status: 'active' }));
    expect((await prisma.lineBindingCode.findFirst({ where: { code } }))?.usedAt).not.toBeNull();
    expect(replyLineMessage).toHaveBeenCalledWith('line-token', 'reply-token', 'Quick Volta LINE reminders are connected.');
  });

  it('sends a test message when LINE is bound', async () => {
    const app = buildApp({ config });
    const user = await createTestUser();
    await prisma.lineConnection.create({ data: { userId: user.id, lineUserId: 'line-user-1' } });

    const response = await injectAs(app, user.id, { method: 'POST', url: '/api/line/test-message' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    expect(sendLinePushMessage).toHaveBeenCalledWith('line-token', 'line-user-1', 'Quick Volta test message. LINE reminders are connected.');
  });
});
