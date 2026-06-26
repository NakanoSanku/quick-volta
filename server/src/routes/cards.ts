import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';

const cardInputSchema = z.object({
  term: z.string().trim().min(1),
  meaning: z.string().trim().min(1),
  partOfSpeech: z.string().trim().optional(),
  examples: z.array(z.string()).default([]),
  notes: z.string().default(''),
  tags: z.array(z.string()).default([]),
  source: z.string().trim().optional(),
});

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function toCardDto(card: {
  id: string;
  term: string;
  meaning: string;
  partOfSpeech: string | null;
  examples: unknown;
  notes: string;
  tags: unknown;
  source: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}) {
  return {
    id: card.id,
    term: card.term,
    meaning: card.meaning,
    partOfSpeech: card.partOfSpeech ?? undefined,
    examples: toStringArray(card.examples),
    notes: card.notes,
    tags: toStringArray(card.tags),
    source: card.source ?? undefined,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
    deletedAt: card.deletedAt ? card.deletedAt.toISOString() : null,
  };
}

export async function cardsRoutes(app: FastifyInstance) {
  app.get('/api/cards', { preHandler: app.requireUser }, async (request) => {
    const cards = await prisma.card.findMany({
      where: { userId: request.user!.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return cards.map(toCardDto);
  });

  app.post('/api/cards', { preHandler: app.requireUser }, async (request, reply) => {
    const input = cardInputSchema.parse(request.body);
    const card = await prisma.card.create({ data: { ...input, userId: request.user!.id } });
    reply.status(201);
    return toCardDto(card);
  });

  app.get('/api/cards/:id', { preHandler: app.requireUser }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const card = await prisma.card.findFirst({ where: { id, userId: request.user!.id, deletedAt: null } });
    if (!card) return reply.status(404).send({ error: 'Card not found.' });
    return toCardDto(card);
  });

  app.put('/api/cards/:id', { preHandler: app.requireUser }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.card.findFirst({ where: { id, userId: request.user!.id, deletedAt: null } });
    if (!existing) return reply.status(404).send({ error: 'Card not found.' });
    const input = cardInputSchema.parse(request.body);
    const card = await prisma.card.update({ where: { id }, data: input });
    return toCardDto(card);
  });

  app.delete('/api/cards/:id', { preHandler: app.requireUser }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.card.findFirst({ where: { id, userId: request.user!.id, deletedAt: null } });
    if (!existing) return reply.status(404).send({ error: 'Card not found.' });
    await prisma.card.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  });
}
