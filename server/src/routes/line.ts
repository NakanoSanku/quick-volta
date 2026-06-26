import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import type { ServerConfig } from '../config.js';
import { verifyLineSignature } from '../line/signature.js';
import { replyLineMessage, sendLinePushMessage } from '../line/client.js';

function generateBindingCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i += 1) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `QV-${suffix}`;
}

const settingsSchema = z.object({
  enabled: z.boolean(),
  timezone: z.string().min(1),
  remindHour: z.number().int().min(0).max(23),
});

function rawBodyFromRequestBody(body: unknown): string {
  return typeof body === 'string' ? body : JSON.stringify(body ?? {});
}

interface LineWebhookBody {
  events?: Array<{
    type: string;
    replyToken?: string;
    source?: { userId?: string };
    message?: { type?: string; text?: string };
  }>;
}

export async function lineRoutes(app: FastifyInstance, config: ServerConfig) {
  app.get('/api/line/status', { preHandler: app.requireUser }, async (request) => {
    const [connection, settings] = await Promise.all([
      prisma.lineConnection.findUnique({ where: { userId: request.user!.id } }),
      prisma.reminderSettings.upsert({ where: { userId: request.user!.id }, create: { userId: request.user!.id }, update: {} }),
    ]);
    return {
      connection: connection && connection.status === 'active' ? { bound: true, boundAt: connection.boundAt.toISOString() } : { bound: false },
      reminderSettings: { enabled: settings.enabled, timezone: settings.timezone, remindHour: settings.remindHour, lastSentOn: settings.lastSentOn },
      botAddFriendUrl: config.lineBotAddFriendUrl,
    };
  });

  app.post('/api/line/binding-code', { preHandler: app.requireUser }, async (request) => {
    await prisma.lineBindingCode.updateMany({ where: { userId: request.user!.id, usedAt: null }, data: { usedAt: new Date() } });
    const code = generateBindingCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await prisma.lineBindingCode.create({ data: { userId: request.user!.id, code, expiresAt } });
    return { code, expiresAt: expiresAt.toISOString(), botAddFriendUrl: config.lineBotAddFriendUrl };
  });

  app.delete('/api/line/connection', { preHandler: app.requireUser }, async (request) => {
    await prisma.lineConnection.updateMany({ where: { userId: request.user!.id }, data: { status: 'unlinked' } });
    return { ok: true };
  });

  app.put('/api/reminder-settings', { preHandler: app.requireUser }, async (request) => {
    const input = settingsSchema.parse(request.body);
    const settings = await prisma.reminderSettings.upsert({
      where: { userId: request.user!.id },
      create: { userId: request.user!.id, ...input },
      update: input,
    });
    return { enabled: settings.enabled, timezone: settings.timezone, remindHour: settings.remindHour, lastSentOn: settings.lastSentOn };
  });

  app.post('/api/line/test-message', { preHandler: app.requireUser }, async (request, reply) => {
    const connection = await prisma.lineConnection.findUnique({ where: { userId: request.user!.id } });
    if (!connection || connection.status !== 'active') return reply.status(400).send({ error: 'LINE is not bound.' });
    await sendLinePushMessage(config.lineChannelAccessToken, connection.lineUserId, 'Quick Volta test message. LINE reminders are connected.');
    return { ok: true };
  });

  app.post('/api/line/webhook', async (request, reply) => {
    const rawBody = rawBodyFromRequestBody(request.body);
    const signatureHeader = request.headers['x-line-signature'];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    if (!verifyLineSignature(rawBody, signature, config.lineChannelSecret)) {
      return reply.status(401).send({ error: 'Invalid LINE signature.' });
    }

    const body = (typeof request.body === 'string' ? JSON.parse(request.body) : request.body ?? {}) as LineWebhookBody;
    for (const event of body.events ?? []) {
      const text = event.message?.type === 'text' ? event.message.text?.trim().toUpperCase() : '';
      const lineUserId = event.source?.userId;
      if (!text || !lineUserId) continue;

      const code = await prisma.lineBindingCode.findFirst({ where: { code: text, usedAt: null, expiresAt: { gt: new Date() } } });
      if (!code) {
        if (event.replyToken) await replyLineMessage(config.lineChannelAccessToken, event.replyToken, 'Binding code not found or expired. Please generate a new code in Quick Volta Settings.');
        continue;
      }

      await prisma.lineConnection.upsert({
        where: { userId: code.userId },
        create: { userId: code.userId, lineUserId, status: 'active' },
        update: { lineUserId, status: 'active', boundAt: new Date() },
      });
      await prisma.lineBindingCode.update({ where: { id: code.id }, data: { usedAt: new Date() } });
      if (event.replyToken) await replyLineMessage(config.lineChannelAccessToken, event.replyToken, 'Quick Volta LINE reminders are connected.');
    }

    return { ok: true };
  });
}
