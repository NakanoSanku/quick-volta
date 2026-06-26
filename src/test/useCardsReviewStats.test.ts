import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCards } from '../hooks/useCards';
import type { Card, ReviewStats } from '../services/cardRepository';

const dueCard = vi.hoisted<Card>(() => ({
  id: 'card-1',
  term: 'cook',
  meaning: '烹调食物的行为',
  partOfSpeech: 'v.',
  examples: [],
  notes: '',
  tags: ['烹饪'],
  createdAt: '2026-06-25T00:00:00.000Z',
  updatedAt: '2026-06-25T00:00:00.000Z',
  deletedAt: null,
}));

vi.mock('../services/cardRepository', () => ({
  cardRepository: {
    getAllCards: vi.fn().mockResolvedValue([dueCard]),
    getAllStats: vi.fn().mockResolvedValue([]),
    getCardById: vi.fn(),
    saveCard: vi.fn(),
    softDeleteCard: vi.fn(),
    getStats: vi.fn(),
    saveStats: vi.fn(),
  },
}));

describe('useCards review stats updates', () => {
  it('immediately recalculates due cards when review stats are updated', async () => {
    const { result } = renderHook(() => useCards());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.dueCards).toHaveLength(1);

    const reviewedStats: ReviewStats = {
      cardId: dueCard.id,
      reviewCount: 1,
      knownCount: 1,
      unknownCount: 0,
      lastReviewedAt: '2026-06-26T00:00:00.000Z',
      interval: 6,
      easeFactor: 2.5,
      repetitions: 1,
      nextDueAt: '2026-07-02T00:00:00.000Z',
    };

    act(() => {
      result.current.applyReviewStats(reviewedStats);
    });

    expect(result.current.cardStats[dueCard.id]).toEqual(reviewedStats);
    expect(result.current.dueCards).toHaveLength(0);
  });
});
