import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiCardRepository } from '../services/apiCardRepository';

describe('apiCardRepository', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('loads cards and review stats through authenticated API calls', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue([{ id: 'card-1', term: 'hello', meaning: 'สวัสดี', examples: [], notes: '', tags: [], createdAt: '2026-06-25T00:00:00.000Z', updatedAt: '2026-06-25T00:00:00.000Z', deletedAt: null }]) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue([{ cardId: 'card-1', reviewCount: 0, knownCount: 0, unknownCount: 0, lastReviewedAt: null, interval: 0, easeFactor: 2.5, repetitions: 0, nextDueAt: null }]) });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiCardRepository.getAllCards()).resolves.toHaveLength(1);
    await expect(apiCardRepository.getAllStats()).resolves.toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/cards', expect.objectContaining({ credentials: 'include' }));
    expect(fetchMock).toHaveBeenCalledWith('/api/review-stats', expect.objectContaining({ credentials: 'include' }));
  });

  it('creates and updates cards through API', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(null) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ id: 'card-1', term: 'updated', meaning: 'meaning', examples: [], notes: '', tags: [], createdAt: '2026-06-25T00:00:00.000Z', updatedAt: '2026-06-25T00:00:00.000Z', deletedAt: null }) });
    vi.stubGlobal('fetch', fetchMock);

    await apiCardRepository.saveCard({ id: 'card-1', term: 'updated', meaning: 'meaning', examples: [], notes: '', tags: [], createdAt: '2026-06-25T00:00:00.000Z', updatedAt: '2026-06-25T00:00:00.000Z', deletedAt: null });

    expect(fetchMock).toHaveBeenCalledWith('/api/cards/card-1', expect.objectContaining({ method: 'PUT', credentials: 'include' }));
  });
});
