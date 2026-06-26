import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../db';
import { createTestUser } from '../test/appTestHelpers';
import { runReminderCheck } from './scheduler';
import { sendLinePushMessage } from '../line/client';
import { loadConfig } from '../config';

vi.mock('../line/client', () => ({
  sendLinePushMessage: vi.fn().mockResolvedValue(undefined),
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

describe('runReminderCheck', () => {
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

  it('sends one reminder for due cards and records local send date', async () => {
    const user = await createTestUser();
    await prisma.lineConnection.create({ data: { userId: user.id, lineUserId: 'line-user-1' } });
    await prisma.reminderSettings.create({ data: { userId: user.id, enabled: true, timezone: 'Asia/Bangkok', remindHour: 9 } });
    await prisma.card.create({ data: { userId: user.id, term: 'due', meaning: 'meaning', examples: [], tags: [], notes: '' } });

    const result = await runReminderCheck(config, new Date('2026-06-25T02:30:00.000Z'));

    expect(result).toEqual({ sent: 1 });
    expect(sendLinePushMessage).toHaveBeenCalledWith('line-token', 'line-user-1', expect.stringContaining('You have 1 cards due today.'));
    expect((await prisma.reminderSettings.findUnique({ where: { userId: user.id } }))?.lastSentOn).toBe('2026-06-25');
  });

  it('does not send duplicate same-day reminders', async () => {
    const user = await createTestUser();
    await prisma.lineConnection.create({ data: { userId: user.id, lineUserId: 'line-user-1' } });
    await prisma.reminderSettings.create({ data: { userId: user.id, enabled: true, timezone: 'Asia/Bangkok', remindHour: 9, lastSentOn: '2026-06-25' } });
    await prisma.card.create({ data: { userId: user.id, term: 'due', meaning: 'meaning', examples: [], tags: [], notes: '' } });

    await expect(runReminderCheck(config, new Date('2026-06-25T02:30:00.000Z'))).resolves.toEqual({ sent: 0 });
    expect(sendLinePushMessage).not.toHaveBeenCalled();
  });

  it('does not send when reminders are disabled, unbound, or no cards are due', async () => {
    const disabledUser = await createTestUser({ email: 'disabled@example.com' });
    await prisma.lineConnection.create({ data: { userId: disabledUser.id, lineUserId: 'line-disabled' } });
    await prisma.reminderSettings.create({ data: { userId: disabledUser.id, enabled: false, timezone: 'Asia/Bangkok', remindHour: 9 } });
    await prisma.card.create({ data: { userId: disabledUser.id, term: 'due', meaning: 'meaning', examples: [], tags: [], notes: '' } });

    const noDueUser = await createTestUser({ email: 'nodue@example.com' });
    await prisma.lineConnection.create({ data: { userId: noDueUser.id, lineUserId: 'line-nodue' } });
    await prisma.reminderSettings.create({ data: { userId: noDueUser.id, enabled: true, timezone: 'Asia/Bangkok', remindHour: 9 } });
    const futureCard = await prisma.card.create({ data: { userId: noDueUser.id, term: 'future', meaning: 'meaning', examples: [], tags: [], notes: '' } });
    await prisma.reviewStats.create({ data: { userId: noDueUser.id, cardId: futureCard.id, nextDueAt: new Date('2026-06-26T00:00:00.000Z') } });

    await expect(runReminderCheck(config, new Date('2026-06-25T02:30:00.000Z'))).resolves.toEqual({ sent: 0 });
    expect(sendLinePushMessage).not.toHaveBeenCalled();
  });
});
