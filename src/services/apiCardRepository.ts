import { apiJson } from './apiClient';
import type { Card, CardRepository, ReviewStats } from './cardRepository';

function cardPayload(card: Card) {
  return {
    id: card.id,
    term: card.term,
    meaning: card.meaning,
    partOfSpeech: card.partOfSpeech,
    examples: card.examples,
    notes: card.notes,
    tags: card.tags,
    source: card.source,
  };
}

export const apiCardRepository: CardRepository = {
  getAllCards() {
    return apiJson<Card[]>('/api/cards');
  },

  getCardById(id) {
    return apiJson<Card>(`/api/cards/${id}`);
  },

  async saveCard(card) {
    const exists = await fetch(`/api/cards/${card.id}`, { credentials: 'include' });
    const method = exists.ok ? 'PUT' : 'POST';
    const path = exists.ok ? `/api/cards/${card.id}` : '/api/cards';
    await apiJson<Card>(path, { method, body: JSON.stringify(cardPayload(card)) });
  },

  async softDeleteCard(id) {
    await apiJson<{ ok: true }>(`/api/cards/${id}`, { method: 'DELETE' });
  },

  getStats(cardId) {
    return apiJson<ReviewStats>(`/api/review-stats/${cardId}`);
  },

  async saveStats(stats) {
    const { cardId, ...payload } = stats;
    await apiJson<ReviewStats>(`/api/review-stats/${cardId}`, { method: 'PUT', body: JSON.stringify(payload) });
  },

  getAllStats() {
    return apiJson<ReviewStats[]>('/api/review-stats');
  },
};
