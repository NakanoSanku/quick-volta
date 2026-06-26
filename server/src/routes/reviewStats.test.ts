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

describe('review stats routes', () => {
  beforeEach(async () => {
    await prisma.reviewStats.deleteMany();
    await prisma.card.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it('rejects anonymous list requests', async () => {
    const app = buildApp({ config });
    const response = await app.inject({ method: 'GET', url: '/api/review-stats' });
    expect(response.statusCode).toBe(401);
  });

  it('returns default stats for an owned card without stats', async () => {
    const app = buildApp({ config });
    const user = await createTestUser();
    const card = await prisma.card.create({ data: { userId: user.id, term: 'hello', meaning: 'meaning', examples: [], tags: [], notes: '' } });

    const response = await injectAs(app, user.id, { method: 'GET', url: `/api/review-stats/${card.id}` });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ cardId: card.id, reviewCount: 0, knownCount: 0, unknownCount: 0, lastReviewedAt: null, interval: 0, easeFactor: 2.5, repetitions: 0, nextDueAt: null });
  });

  it('saves and lists stats for the current user', async () => {
    const app = buildApp({ config });
    const user = await createTestUser();
    const card = await prisma.card.create({ data: { userId: user.id, term: 'hello', meaning: 'meaning', examples: [], tags: [], notes: '' } });

    const saveResponse = await injectAs(app, user.id, {
      method: 'PUT',
      url: `/api/review-stats/${card.id}`,
      payload: { reviewCount: 1, knownCount: 1, unknownCount: 0, lastReviewedAt: '2026-06-25T00:00:00.000Z', interval: 6, easeFactor: 2.5, repetitions: 2, nextDueAt: '2026-07-01T00:00:00.000Z' },
    });
    expect(saveResponse.statusCode).toBe(200);
    expect(saveResponse.json()).toEqual(expect.objectContaining({ cardId: card.id, reviewCount: 1, nextDueAt: '2026-07-01T00:00:00.000Z' }));

    const listResponse = await injectAs(app, user.id, { method: 'GET', url: '/api/review-stats' });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toHaveLength(1);
    expect(listResponse.json()[0].cardId).toBe(card.id);
  });

  it('returns 404 for cross-user card stats', async () => {
    const app = buildApp({ config });
    const user = await createTestUser();
    const otherUser = await createTestUser();
    const otherCard = await prisma.card.create({ data: { userId: otherUser.id, term: 'other', meaning: 'meaning', examples: [], tags: [], notes: '' } });

    const response = await injectAs(app, user.id, { method: 'GET', url: `/api/review-stats/${otherCard.id}` });
    expect(response.statusCode).toBe(404);
  });
});
