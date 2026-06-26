import { randomBytes } from 'node:crypto';
import { prisma } from '../db.js';

export const SESSION_COOKIE_NAME = 'qv_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function newSessionId(): string {
  return randomBytes(24).toString('hex');
}

export async function createSession(userId: string) {
  return prisma.session.create({
    data: {
      id: newSessionId(),
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
}

export async function getSessionUser(sessionId: string | undefined) {
  if (!sessionId) return null;
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;
  return session.user;
}

export async function destroySession(sessionId: string | undefined): Promise<void> {
  if (!sessionId) return;
  await prisma.session.deleteMany({ where: { id: sessionId } });
}
