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

describe('local browser data import route', () => {
  beforeEach(async () => {
    await prisma.reviewStats.deleteMany();
    await prisma.card.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it('imports local cards and review stats into the current user account', async () => {
    const app = buildApp({ config });
    const user = await createTestUser();

    const response = await injectAs(app, user.id, {
      method: 'POST',
      url: '/api/import/local-browser-data',
      payload: {
        cards: [{ id: 'local-card-1', term: 'hello', meaning: 'สวัสดี', examples: ['hello there'], notes: '', tags: ['greeting'], createdAt: '2026-06-25T00:00:00.000Z', updatedAt: '2026-06-25T00:00:00.000Z', deletedAt: null }],
        reviewStats: [{ cardId: 'local-card-1', reviewCount: 2, knownCount: 2, unknownCount: 0, lastReviewedAt: '2026-06-25T00:00:00.000Z', interval: 6, easeFactor: 2.5, repetitions: 2, nextDueAt: '2026-07-01T00:00:00.000Z' }],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ importedCards: 1, importedReviewStats: 1 });
    expect(await prisma.card.findFirst({ where: { id: 'local-card-1', userId: user.id } })).toEqual(expect.objectContaining({ term: 'hello' }));
    expect(await prisma.reviewStats.findUnique({ where: { cardId: 'local-card-1' } })).toEqual(expect.objectContaining({ reviewCount: 2 }));
  });
});
