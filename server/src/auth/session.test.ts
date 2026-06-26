import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../db';
import { createSession, destroySession, getSessionUser } from './session';

describe('session helpers', () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it('creates a session and resolves its user', async () => {
    const user = await prisma.user.create({ data: { googleSub: 'sub-1', email: 'a@example.com' } });
    const session = await createSession(user.id);

    expect(session.id).toHaveLength(48);
    const resolved = await getSessionUser(session.id);
    expect(resolved?.id).toBe(user.id);
  });

  it('destroys a session', async () => {
    const user = await prisma.user.create({ data: { googleSub: 'sub-2', email: 'b@example.com' } });
    const session = await createSession(user.id);
    await destroySession(session.id);
    await expect(getSessionUser(session.id)).resolves.toBeNull();
  });
});
