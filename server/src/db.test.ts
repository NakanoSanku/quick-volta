import { describe, expect, it } from 'vitest';
import { prisma } from './db';

describe('Prisma schema', () => {
  it('exposes model delegates', () => {
    expect(prisma.user).toBeDefined();
    expect(prisma.session).toBeDefined();
    expect(prisma.card).toBeDefined();
    expect(prisma.reviewStats).toBeDefined();
    expect(prisma.lineConnection).toBeDefined();
    expect(prisma.lineBindingCode).toBeDefined();
    expect(prisma.reminderSettings).toBeDefined();
  });
});
