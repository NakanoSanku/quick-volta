import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getLocalMigrationSummary, uploadLocalBrowserData } from '../services/localDataMigration';
import { indexedDbCardRepository } from '../services/cardRepository';

vi.mock('../services/cardRepository', () => ({
  indexedDbCardRepository: {
    getAllCards: vi.fn(),
    getAllStats: vi.fn(),
  },
}));

describe('localDataMigration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('counts local cards and stats', async () => {
    vi.mocked(indexedDbCardRepository.getAllCards).mockResolvedValue([{ id: 'card-1' } as never]);
    vi.mocked(indexedDbCardRepository.getAllStats).mockResolvedValue([{ cardId: 'card-1' } as never]);

    await expect(getLocalMigrationSummary()).resolves.toEqual({ cardCount: 1, reviewStatsCount: 1 });
  });

  it('uploads local cards and stats to the import endpoint', async () => {
    vi.mocked(indexedDbCardRepository.getAllCards).mockResolvedValue([{ id: 'card-1', term: 'hello', meaning: 'meaning', examples: [], notes: '', tags: [], createdAt: '2026-06-25T00:00:00.000Z', updatedAt: '2026-06-25T00:00:00.000Z', deletedAt: null } as never]);
    vi.mocked(indexedDbCardRepository.getAllStats).mockResolvedValue([{ cardId: 'card-1', reviewCount: 0, knownCount: 0, unknownCount: 0, lastReviewedAt: null, interval: 0, easeFactor: 2.5, repetitions: 0, nextDueAt: null } as never]);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ importedCards: 1, importedReviewStats: 1 }) });
    vi.stubGlobal('fetch', fetchMock);

    await expect(uploadLocalBrowserData()).resolves.toEqual({ importedCards: 1, importedReviewStats: 1 });
    expect(fetchMock).toHaveBeenCalledWith('/api/import/local-browser-data', expect.objectContaining({ method: 'POST', credentials: 'include' }));
  });
});
