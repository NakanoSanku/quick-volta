import { beforeEach, describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useReviewSession } from '../hooks/useReviewSession';
import { cardRepository } from '../services/cardRepository';

// Mock the repository to avoid database connection attempts during hook tests
vi.mock('../services/cardRepository', () => {
  const mockRepository = {
    getStats: vi.fn().mockImplementation((cardId: string) => {
      return Promise.resolve({
        cardId,
        reviewCount: 2,
        knownCount: 1,
        unknownCount: 1,
        lastReviewedAt: '2026-06-25T00:00:00.000Z',
      });
    }),
    saveStats: vi.fn().mockResolvedValue(undefined),
  };
  return {
    cardRepository: mockRepository,
  };
});

const mockCards = [
  {
    id: 'card-1',
    term: 'term-1',
    meaning: 'meaning-1',
    examples: ['ex-1'],
    notes: 'notes-1',
    tags: ['tag-1'],
    createdAt: '2026-06-25T00:00:00.000Z',
    updatedAt: '2026-06-25T00:00:00.000Z',
    deletedAt: null,
  },
  {
    id: 'card-2',
    term: 'term-2',
    meaning: 'meaning-2',
    examples: [],
    notes: '',
    tags: [],
    createdAt: '2026-06-25T00:00:00.000Z',
    updatedAt: '2026-06-25T00:00:00.000Z',
    deletedAt: null,
  },
];

describe('useReviewSession Hook', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.mocked(cardRepository.getStats).mockImplementation((cardId: string) => {
      return Promise.resolve({
        cardId,
        reviewCount: 2,
        knownCount: 1,
        unknownCount: 1,
        lastReviewedAt: '2026-06-25T00:00:00.000Z',
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        nextDueAt: null,
      });
    });
    vi.mocked(cardRepository.saveStats).mockResolvedValue(undefined);
  });

  it('should initialize review session correctly', async () => {
    const { result } = renderHook(() => useReviewSession(mockCards));

    await waitFor(() => expect(result.current.loadingStats).toBe(false));

    expect(result.current.currentIndex).toBe(0);
    expect(result.current.reveal).toBe(false);
    expect(result.current.isFinished).toBe(false);
    expect(result.current.sessionCards).toHaveLength(2);
  });

  it('should handle card reveal', async () => {
    const { result } = renderHook(() => useReviewSession(mockCards));

    await waitFor(() => expect(result.current.loadingStats).toBe(false));
    expect(result.current.reveal).toBe(false);

    act(() => {
      result.current.setReveal(true);
    });

    expect(result.current.reveal).toBe(true);
  });

  it('should progress to the next card on know/again decision', async () => {
    const { result } = renderHook(() => useReviewSession(mockCards));

    await waitFor(() => expect(result.current.loadingStats).toBe(false));
    // Initially at card index 0
    expect(result.current.currentIndex).toBe(0);

    // Call good
    await act(async () => {
      await result.current.good();
    });

    // Wait for the next card stats to load
    await waitFor(() => expect(result.current.loadingStats).toBe(false));

    // Repository saveStats should be called
    expect(cardRepository.saveStats).toHaveBeenCalled();

    // Should increment index and reset reveal
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.reveal).toBe(false);

    // Call again
    await act(async () => {
      await result.current.again();
    });

    expect(result.current.currentIndex).toBe(2);
    expect(result.current.isFinished).toBe(true);
  });

  it('notifies callers when review stats are saved', async () => {
    const onStatsSaved = vi.fn();
    const { result } = renderHook(() => useReviewSession(mockCards, { onStatsSaved }));

    await waitFor(() => expect(result.current.loadingStats).toBe(false));

    await act(async () => {
      await result.current.good();
    });

    expect(onStatsSaved).toHaveBeenCalledWith(expect.objectContaining({
      cardId: expect.any(String),
      reviewCount: 3,
      knownCount: 2,
      unknownCount: 1,
      interval: expect.any(Number),
      nextDueAt: expect.any(String),
    }));
  });

  it('moves to the next card immediately without waiting for stats save', async () => {
    let resolveSave: (() => void) | undefined;
    vi.mocked(cardRepository.saveStats).mockReturnValueOnce(new Promise<void>((resolve) => {
      resolveSave = resolve;
    }));

    const { result } = renderHook(() => useReviewSession(mockCards));

    await waitFor(() => expect(result.current.loadingStats).toBe(false));

    act(() => {
      void result.current.good();
    });

    await waitFor(() => expect(result.current.currentIndex).toBe(1));
    expect(cardRepository.saveStats).toHaveBeenCalled();

    await act(async () => {
      resolveSave?.();
    });
  });

  it('does not update review stats when reviewing a card before it is due', async () => {
    vi.mocked(cardRepository.getStats).mockResolvedValueOnce({
      cardId: 'card-1',
      reviewCount: 3,
      knownCount: 3,
      unknownCount: 0,
      lastReviewedAt: '2026-06-25T00:00:00.000Z',
      interval: 6,
      easeFactor: 2.5,
      repetitions: 2,
      nextDueAt: '2999-07-01T00:00:00.000Z',
    });
    const onStatsSaved = vi.fn();

    const { result } = renderHook(() => useReviewSession(mockCards, { onStatsSaved }));

    await waitFor(() => expect(result.current.loadingStats).toBe(false));

    await act(async () => {
      await result.current.good();
    });

    expect(result.current.currentIndex).toBe(1);
    expect(cardRepository.saveStats).not.toHaveBeenCalled();
    expect(onStatsSaved).not.toHaveBeenCalled();
  });
});
