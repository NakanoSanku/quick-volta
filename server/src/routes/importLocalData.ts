import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';

const importCardSchema = z.object({
  id: z.string().min(1),
  term: z.string().min(1),
  meaning: z.string().min(1),
  partOfSpeech: z.string().optional(),
  examples: z.array(z.string()).default([]),
  notes: z.string().default(''),
  tags: z.array(z.string()).default([]),
  source: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});

const importStatsSchema = z.object({
  cardId: z.string().min(1),
  reviewCount: z.number().int().min(0),
  knownCount: z.number().int().min(0),
  unknownCount: z.number().int().min(0),
  lastReviewedAt: z.string().datetime().nullable(),
  interval: z.number().int().min(0),
  easeFactor: z.number().min(1.3),
  repetitions: z.number().int().min(0),
  nextDueAt: z.string().datetime().nullable(),
});

const importSchema = z.object({
  cards: z.array(importCardSchema),
  reviewStats: z.array(importStatsSchema),
});

export async function importLocalDataRoutes(app: FastifyInstance) {
  app.post('/api/import/local-browser-data', { preHandler: app.requireUser }, async (request) => {
    const input = importSchema.parse(request.body);
    let importedCards = 0;
    let importedReviewStats = 0;

    await prisma.$transaction(async (tx) => {
      const cardIdMap = new Map<string, string>();

      for (const card of input.cards) {
        const existing = await tx.card.findUnique({ where: { id: card.id } });
        const data = {
          userId: request.user!.id,
          term: card.term,
          meaning: card.meaning,
          partOfSpeech: card.partOfSpeech,
          examples: card.examples,
          notes: card.notes,
          tags: card.tags,
          source: card.source,
          createdAt: new Date(card.createdAt),
          updatedAt: new Date(card.updatedAt),
          deletedAt: card.deletedAt ? new Date(card.deletedAt) : null,
        };

        if (!existing) {
          await tx.card.create({ data: { id: card.id, ...data } });
          cardIdMap.set(card.id, card.id);
        } else if (existing.userId === request.user!.id) {
          await tx.card.update({ where: { id: card.id }, data });
          cardIdMap.set(card.id, card.id);
        } else {
          const created = await tx.card.create({ data });
          cardIdMap.set(card.id, created.id);
        }
        importedCards += 1;
      }

      for (const stats of input.reviewStats) {
        const mappedCardId = cardIdMap.get(stats.cardId);
        if (!mappedCardId) continue;
        await tx.reviewStats.upsert({
          where: { cardId: mappedCardId },
          create: {
            cardId: mappedCardId,
            userId: request.user!.id,
            reviewCount: stats.reviewCount,
            knownCount: stats.knownCount,
            unknownCount: stats.unknownCount,
            lastReviewedAt: stats.lastReviewedAt ? new Date(stats.lastReviewedAt) : null,
            interval: stats.interval,
            easeFactor: stats.easeFactor,
            repetitions: stats.repetitions,
            nextDueAt: stats.nextDueAt ? new Date(stats.nextDueAt) : null,
          },
          update: {
            reviewCount: stats.reviewCount,
            knownCount: stats.knownCount,
            unknownCount: stats.unknownCount,
            lastReviewedAt: stats.lastReviewedAt ? new Date(stats.lastReviewedAt) : null,
            interval: stats.interval,
            easeFactor: stats.easeFactor,
            repetitions: stats.repetitions,
            nextDueAt: stats.nextDueAt ? new Date(stats.nextDueAt) : null,
          },
        });
        importedReviewStats += 1;
      }
    });

    return { importedCards, importedReviewStats };
  });
}
