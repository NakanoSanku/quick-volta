import { beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { loadConfig } from '../config';
import { prisma } from '../db';
import { createTestUser, injectAs } from '../test/appTestHelpers';

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

describe('cards routes', () => {
  beforeEach(async () => {
    await prisma.reviewStats.deleteMany();
    await prisma.card.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it('rejects anonymous card list requests', async () => {
    const app = buildApp({ config });
    const response = await app.inject({ method: 'GET', url: '/api/cards' });
    expect(response.statusCode).toBe(401);
  });

  it('creates and lists only current user cards', async () => {
    const app = buildApp({ config });
    const user = await createTestUser({ email: 'a@example.com' });
    const otherUser = await createTestUser({ email: 'b@example.com' });
    await prisma.card.create({ data: { userId: otherUser.id, term: 'other', meaning: 'other meaning', examples: [], tags: [], notes: '' } });

    const createResponse = await injectAs(app, user.id, {
      method: 'POST',
      url: '/api/cards',
      payload: { term: 'hello', meaning: 'สวัสดี', partOfSpeech: 'n.', examples: ['hello there'], notes: 'note', tags: ['greeting'], source: 'manual' },
    });
    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toEqual(expect.objectContaining({ term: 'hello', meaning: 'สวัสดี', examples: ['hello there'], tags: ['greeting'] }));

    const listResponse = await injectAs(app, user.id, { method: 'GET', url: '/api/cards' });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toHaveLength(1);
    expect(listResponse.json()[0].term).toBe('hello');
  });

  it('updates and soft-deletes owned cards', async () => {
    const app = buildApp({ config });
    const user = await createTestUser();
    const card = await prisma.card.create({ data: { userId: user.id, term: 'old', meaning: 'old meaning', examples: [], tags: [], notes: '' } });

    const updateResponse = await injectAs(app, user.id, { method: 'PUT', url: `/api/cards/${card.id}`, payload: { term: 'new', meaning: 'new meaning', examples: ['example'], tags: ['tag'], notes: 'updated' } });
    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json()).toEqual(expect.objectContaining({ id: card.id, term: 'new', meaning: 'new meaning' }));

    const deleteResponse = await injectAs(app, user.id, { method: 'DELETE', url: `/api/cards/${card.id}` });
    expect(deleteResponse.statusCode).toBe(200);
    expect(deleteResponse.json()).toEqual({ ok: true });

    const listResponse = await injectAs(app, user.id, { method: 'GET', url: '/api/cards' });
    expect(listResponse.json()).toEqual([]);
  });

  it('returns 404 for cross-user card access', async () => {
    const app = buildApp({ config });
    const user = await createTestUser();
    const otherUser = await createTestUser();
    const card = await prisma.card.create({ data: { userId: otherUser.id, term: 'other', meaning: 'other', examples: [], tags: [], notes: '' } });

    const response = await injectAs(app, user.id, { method: 'GET', url: `/api/cards/${card.id}` });
    expect(response.statusCode).toBe(404);
  });
});
