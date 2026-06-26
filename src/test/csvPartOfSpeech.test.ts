import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { arrayToCSVRow, parseCSV, useCsvImportExport } from '../hooks/useCsvImportExport';
import { cardRepository } from '../services/cardRepository';

vi.mock('../services/cardRepository', () => ({
  cardRepository: {
    saveCard: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('CSV part of speech support', () => {
  it('parses partOfSpeech as its own CSV column', async () => {
    const { result } = renderHook(() => useCsvImportExport());

    act(() => {
      result.current.parseAndPreviewCsv('term,meaning,partOfSpeech\nสวย,beautiful,adj.');
    });

    expect(result.current.previewRows[0].partOfSpeech).toBe('adj.');

    await act(async () => {
      await result.current.confirmImport();
    });

    expect(cardRepository.saveCard).toHaveBeenCalledWith(expect.objectContaining({
      term: 'สวย',
      meaning: 'beautiful',
      partOfSpeech: 'adj.',
    }));
  });

  it('exports a partOfSpeech header and value', () => {
    expect(parseCSV('term,meaning,partOfSpeech\nสวย,beautiful,adj.')).toEqual([
      ['term', 'meaning', 'partOfSpeech'],
      ['สวย', 'beautiful', 'adj.'],
    ]);
    expect(arrayToCSVRow(['สวย', 'beautiful', 'adj.'])).toBe('สวย,beautiful,adj.');
  });
});
