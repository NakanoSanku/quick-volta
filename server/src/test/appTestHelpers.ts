import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';

export async function createTestUser(overrides: Partial<{ email: string; googleSub: string; name: string }> = {}) {
  return prisma.user.create({
    data: {
      googleSub: overrides.googleSub ?? `google-${crypto.randomUUID()}`,
      email: overrides.email ?? `user-${crypto.randomUUID()}@example.com`,
      name: overrides.name ?? 'Test User',
    },
  });
}

export async function createTestSession(userId: string, id = `session-${crypto.randomUUID()}`) {
  await prisma.session.create({
    data: { id, userId, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  });
  return id;
}

export async function authCookieFor(userId: string) {
  const sessionId = await createTestSession(userId);
  return `qv_session=${sessionId}`;
}

export async function injectAs(app: FastifyInstance, userId: string, options: Parameters<FastifyInstance['inject']>[0]) {
  const cookie = await authCookieFor(userId);
  const optionObject = typeof options === 'string' ? { url: options } : options;
  return app.inject({
    ...optionObject,
    headers: { ...(optionObject.headers ?? {}), cookie },
  });
}
