import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';

const statsInputSchema = z.object({
  reviewCount: z.number().int().min(0),
  knownCount: z.number().int().min(0),
  unknownCount: z.number().int().min(0),
  lastReviewedAt: z.string().datetime().nullable(),
  interval: z.number().int().min(0),
  easeFactor: z.number().min(1.3),
  repetitions: z.number().int().min(0),
  nextDueAt: z.string().datetime().nullable(),
});

function defaultStats(cardId: string) {
  return { cardId, reviewCount: 0, knownCount: 0, unknownCount: 0, lastReviewedAt: null, interval: 0, easeFactor: 2.5, repetitions: 0, nextDueAt: null };
}

function toStatsDto(stats: {
  cardId: string;
  reviewCount: number;
  knownCount: number;
  unknownCount: number;
  lastReviewedAt: Date | null;
  interval: number;
  easeFactor: number;
  repetitions: number;
  nextDueAt: Date | null;
}) {
  return {
    cardId: stats.cardId,
    reviewCount: stats.reviewCount,
    knownCount: stats.knownCount,
    unknownCount: stats.unknownCount,
    lastReviewedAt: stats.lastReviewedAt?.toISOString() ?? null,
    interval: stats.interval,
    easeFactor: stats.easeFactor,
    repetitions: stats.repetitions,
    nextDueAt: stats.nextDueAt?.toISOString() ?? null,
  };
}

export async function reviewStatsRoutes(app: FastifyInstance) {
  app.get('/api/review-stats', { preHandler: app.requireUser }, async (request) => {
    const stats = await prisma.reviewStats.findMany({ where: { userId: request.user!.id } });
    return stats.map(toStatsDto);
  });

  app.get('/api/review-stats/:cardId', { preHandler: app.requireUser }, async (request, reply) => {
    const { cardId } = request.params as { cardId: string };
    const card = await prisma.card.findFirst({ where: { id: cardId, userId: request.user!.id, deletedAt: null } });
    if (!card) return reply.status(404).send({ error: 'Card not found.' });
    const stats = await prisma.reviewStats.findUnique({ where: { cardId } });
    return stats ? toStatsDto(stats) : defaultStats(cardId);
  });

  app.put('/api/review-stats/:cardId', { preHandler: app.requireUser }, async (request, reply) => {
    const { cardId } = request.params as { cardId: string };
    const card = await prisma.card.findFirst({ where: { id: cardId, userId: request.user!.id, deletedAt: null } });
    if (!card) return reply.status(404).send({ error: 'Card not found.' });
    const input = statsInputSchema.parse(request.body);
    const stats = await prisma.reviewStats.upsert({
      where: { cardId },
      create: {
        cardId,
        userId: request.user!.id,
        reviewCount: input.reviewCount,
        knownCount: input.knownCount,
        unknownCount: input.unknownCount,
        lastReviewedAt: input.lastReviewedAt ? new Date(input.lastReviewedAt) : null,
        interval: input.interval,
        easeFactor: input.easeFactor,
        repetitions: input.repetitions,
        nextDueAt: input.nextDueAt ? new Date(input.nextDueAt) : null,
      },
      update: {
        reviewCount: input.reviewCount,
        knownCount: input.knownCount,
        unknownCount: input.unknownCount,
        lastReviewedAt: input.lastReviewedAt ? new Date(input.lastReviewedAt) : null,
        interval: input.interval,
        easeFactor: input.easeFactor,
        repetitions: input.repetitions,
        nextDueAt: input.nextDueAt ? new Date(input.nextDueAt) : null,
      },
    });
    return toStatsDto(stats);
  });
}
