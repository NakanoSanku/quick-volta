import { prisma } from '../db.js';
import type { ServerConfig } from '../config.js';
import { sendLinePushMessage } from '../line/client.js';
import { getLocalDateAndHour } from './time.js';

export async function countDueCardsForUser(userId: string, now = new Date()): Promise<number> {
  const activeCards = await prisma.card.findMany({
    where: { userId, deletedAt: null },
    select: { id: true, reviewStats: { select: { nextDueAt: true } } },
  });
  return activeCards.filter((card) => !card.reviewStats?.nextDueAt || card.reviewStats.nextDueAt <= now).length;
}

export async function runReminderCheck(config: ServerConfig, now = new Date()): Promise<{ sent: number }> {
  const settings = await prisma.reminderSettings.findMany({
    where: { enabled: true },
    include: { user: { include: { lineConnection: true } } },
  });
  let sent = 0;

  for (const setting of settings) {
    const connection = setting.user.lineConnection;
    if (!connection || connection.status !== 'active') continue;

    const { localDate, localHour } = getLocalDateAndHour(now, setting.timezone);
    if (localHour !== setting.remindHour) continue;
    if (setting.lastSentOn === localDate) continue;

    const dueCount = await countDueCardsForUser(setting.userId, now);
    if (dueCount <= 0) continue;

    await sendLinePushMessage(
      config.lineChannelAccessToken,
      connection.lineUserId,
      `Quick Volta Review Reminder\n\nYou have ${dueCount} cards due today.\nOpen Quick Volta to review:\n${config.appBaseUrl}`,
    );
    await prisma.reminderSettings.update({ where: { userId: setting.userId }, data: { lastSentOn: localDate } });
    sent += 1;
  }

  return { sent };
}

export function startReminderScheduler(config: ServerConfig): NodeJS.Timeout | null {
  if (!config.reminderCronEnabled) return null;
  const intervalMs = config.reminderCheckIntervalMinutes * 60 * 1000;
  void runReminderCheck(config);
  return setInterval(() => void runReminderCheck(config), intervalMs);
}
