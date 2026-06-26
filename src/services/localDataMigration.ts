import { apiJson } from './apiClient';
import { indexedDbCardRepository } from './cardRepository';

export interface LocalMigrationSummary {
  cardCount: number;
  reviewStatsCount: number;
}

export interface LocalMigrationResult {
  importedCards: number;
  importedReviewStats: number;
}

export async function getLocalMigrationSummary(): Promise<LocalMigrationSummary> {
  const [cards, stats] = await Promise.all([
    indexedDbCardRepository.getAllCards(),
    indexedDbCardRepository.getAllStats(),
  ]);
  return { cardCount: cards.length, reviewStatsCount: stats.length };
}

export async function uploadLocalBrowserData(): Promise<LocalMigrationResult> {
  const [cards, reviewStats] = await Promise.all([
    indexedDbCardRepository.getAllCards(),
    indexedDbCardRepository.getAllStats(),
  ]);
  return apiJson<LocalMigrationResult>('/api/import/local-browser-data', {
    method: 'POST',
    body: JSON.stringify({ cards, reviewStats }),
  });
}
