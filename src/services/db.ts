const DB_NAME = 'FlashcardPwaDb';
const DB_VERSION = 1;

export function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB. Please check if storage is blocked or private browsing is active.'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = () => {
      const db = request.result;

      // Store 1: cards
      if (!db.objectStoreNames.contains('cards')) {
        const cardStore = db.createObjectStore('cards', { keyPath: 'id' });
        cardStore.createIndex('deletedAt', 'deletedAt', { unique: false });
        cardStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
      }

      // Store 2: review_stats
      if (!db.objectStoreNames.contains('review_stats')) {
        db.createObjectStore('review_stats', { keyPath: 'cardId' });
      }
    };
  });
}
