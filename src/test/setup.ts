import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock IndexedDB since jsdom doesn't implement it fully/reliably by default
const mockIndexedDB = {
  open: vi.fn(),
};

globalThis.indexedDB = mockIndexedDB as unknown as IDBFactory;

// Mock crypto.randomUUID
if (!globalThis.crypto) {
  // @ts-expect-error - mock environment
  globalThis.crypto = {};
}
if (!globalThis.crypto.randomUUID) {
  globalThis.crypto.randomUUID = () => '12345678-1234-1234-1234-123456789012';
}
