import { openDb } from './db';
import { apiCardRepository } from './apiCardRepository';
import type { PartOfSpeech } from './partOfSpeech';

export interface Card {
  id: string;
  term: string;
  meaning: string;
  partOfSpeech?: PartOfSpeech;
  examples: string[];
  notes: string;
  tags: string[];
  source?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ReviewStats {
  cardId: string;
  reviewCount: number;
  knownCount: number;
  unknownCount: number;
  lastReviewedAt: string | null;
  interval: number; // in days
  easeFactor: number; // default 2.5
  repetitions: number; // consecutive correct reviews
  nextDueAt: string | null; // ISO timestamp
}

export interface CardRepository {
  getAllCards(): Promise<Card[]>;
  getCardById(id: string): Promise<Card | null>;
  saveCard(card: Card): Promise<void>;
  softDeleteCard(id: string): Promise<void>;
  getStats(cardId: string): Promise<ReviewStats>;
  saveStats(stats: ReviewStats): Promise<void>;
  getAllStats(): Promise<ReviewStats[]>;
}

class IndexedDbCardRepository implements CardRepository {
  async getAllCards(): Promise<Card[]> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('cards', 'readonly');
      const store = transaction.objectStore('cards');
      const request = store.getAll();

      request.onsuccess = () => {
        const allCards = request.result || [];
        const activeCards = allCards.filter((card) => card.deletedAt === null);
        resolve(activeCards);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getCardById(id: string): Promise<Card | null> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('cards', 'readonly');
      const store = transaction.objectStore('cards');
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async saveCard(card: Card): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('cards', 'readwrite');
      const store = transaction.objectStore('cards');
      const request = store.put(card);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async softDeleteCard(id: string): Promise<void> {
    const card = await this.getCardById(id);
    if (!card) {
      throw new Error(`Card with ID ${id} not found.`);
    }
    card.deletedAt = new Date().toISOString();
    card.updatedAt = card.deletedAt;
    await this.saveCard(card);
  }

  async getStats(cardId: string): Promise<ReviewStats> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('review_stats', 'readonly');
      const store = transaction.objectStore('review_stats');
      const request = store.get(cardId);

      request.onsuccess = () => {
        if (request.result) {
          resolve({
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0,
            nextDueAt: null,
            ...request.result,
          });
        } else {
          resolve({
            cardId,
            reviewCount: 0,
            knownCount: 0,
            unknownCount: 0,
            lastReviewedAt: null,
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0,
            nextDueAt: null,
          });
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getAllStats(): Promise<ReviewStats[]> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('review_stats', 'readonly');
      const store = transaction.objectStore('review_stats');
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result || [];
        const statsList = results.map((item) => ({
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          nextDueAt: null,
          ...item,
        }));
        resolve(statsList);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async saveStats(stats: ReviewStats): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('review_stats', 'readwrite');
      const store = transaction.objectStore('review_stats');
      const request = store.put(stats);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}

export const indexedDbCardRepository: CardRepository = new IndexedDbCardRepository();
export const cardRepository: CardRepository = apiCardRepository;

