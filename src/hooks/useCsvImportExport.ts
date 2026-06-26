import { useState } from 'react';
import { type Card, cardRepository } from '../services/cardRepository';
import { normalizePartOfSpeech, type PartOfSpeech } from '../services/partOfSpeech';

export interface CsvPreviewRow {
  index: number; // 1-indexed row number in CSV file
  term: string;
  meaning: string;
  partOfSpeech?: PartOfSpeech;
  examples: string[];
  notes: string;
  tags: string[];
  source: string;
  isValid: boolean;
  errors: string[];
}

export function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          cell += '"';
          i++; // Skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(cell);
        cell = '';
      } else if (char === '\r' || char === '\n') {
        row.push(cell);
        cell = '';
        if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
          result.push(row);
        }
        row = [];
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n
        }
      } else {
        cell += char;
      }
    }
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell);
    result.push(row);
  }

  return result;
}

export function arrayToCSVRow(arr: string[]): string {
  return arr
    .map((val) => {
      const clean = val || '';
      if (clean.includes('"') || clean.includes(',') || clean.includes('\n') || clean.includes('\r')) {
        return `"${clean.replace(/"/g, '""')}"`;
      }
      return clean;
    })
    .join(',');
}

export function useCsvImportExport(onImportSuccess?: () => void) {
  const [previewRows, setPreviewRows] = useState<CsvPreviewRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const clearPreview = () => {
    setPreviewRows([]);
    setErrorMsg(null);
  };

  const parseAndPreviewCsv = (csvText: string) => {
    clearPreview();
    if (!csvText.trim()) {
      setErrorMsg('CSV content is empty.');
      return;
    }

    try {
      const allRows = parseCSV(csvText);
      if (allRows.length < 2) {
        setErrorMsg('CSV must contain a header row and at least one data row.');
        return;
      }

      const headers = allRows[0].map((h) => h.trim().toLowerCase());

      // Determine column indices
      const termIdx = headers.indexOf('term');
      const meaningIdx = headers.indexOf('meaning');
      const partOfSpeechIdx = headers.findIndex((header) =>
        ['partofspeech', 'part_of_speech', 'part of speech', 'pos'].includes(header),
      );
      const examplesIdx = headers.indexOf('examples');
      const notesIdx = headers.indexOf('notes');
      const tagsIdx = headers.indexOf('tags');
      const sourceIdx = headers.indexOf('source');

      if (termIdx === -1 || meaningIdx === -1) {
        setErrorMsg('CSV must include at least "term" and "meaning" columns in the header.');
        return;
      }

      const tempPreviews: CsvPreviewRow[] = [];

      for (let i = 1; i < allRows.length; i++) {
        const row = allRows[i];

        // Skip completely empty rows
        if (row.length === 0 || (row.length === 1 && row[0].trim() === '')) {
          continue;
        }

        const term = row[termIdx] ? row[termIdx].trim() : '';
        const meaning = row[meaningIdx] ? row[meaningIdx].trim() : '';
        const partOfSpeech = normalizePartOfSpeech(
          partOfSpeechIdx !== -1 && row[partOfSpeechIdx] ? row[partOfSpeechIdx] : '',
        );

        const examplesRaw = examplesIdx !== -1 && row[examplesIdx] ? row[examplesIdx].trim() : '';
        const examples = examplesRaw
          ? examplesRaw
              .split(/\r?\n|\|/)
              .map((ex) => ex.trim())
              .filter((ex) => ex !== '')
          : [];

        const notes = notesIdx !== -1 && row[notesIdx] ? row[notesIdx].trim() : '';

        const tagsRaw = tagsIdx !== -1 && row[tagsIdx] ? row[tagsIdx].trim() : '';
        const tags = tagsRaw
          ? tagsRaw
              .split(',')
              .map((tag) => tag.trim())
              .filter((tag) => tag !== '')
          : [];

        const source = sourceIdx !== -1 && row[sourceIdx] ? row[sourceIdx].trim() : '';

        const errors: string[] = [];
        if (!term) {
          errors.push('Term is required.');
        }
        if (!meaning) {
          errors.push('Meaning is required.');
        }

        tempPreviews.push({
          index: i + 1, // 1-indexed row number
          term,
          meaning,
          partOfSpeech,
          examples,
          notes,
          tags,
          source,
          isValid: errors.length === 0,
          errors,
        });
      }

      if (tempPreviews.length === 0) {
        setErrorMsg('No valid data rows found in the CSV.');
      } else {
        setPreviewRows(tempPreviews);
      }
    } catch (e) {
      console.error('CSV Parsing Error:', e);
      setErrorMsg('Failed to parse CSV file. Ensure it is valid CSV formatting.');
    }
  };

  const confirmImport = async (): Promise<number> => {
    const validRows = previewRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      throw new Error('No valid cards to import.');
    }

    const now = new Date().toISOString();
    let importCount = 0;

    for (const row of validRows) {
      const card: Card = {
        id: crypto.randomUUID(),
        term: row.term,
        meaning: row.meaning,
        partOfSpeech: row.partOfSpeech,
        examples: row.examples,
        notes: row.notes,
        tags: row.tags,
        source: row.source || undefined,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      await cardRepository.saveCard(card);
      importCount++;
    }

    clearPreview();
    if (onImportSuccess) {
      onImportSuccess();
    }
    return importCount;
  };

  const exportToCsv = (cardsToExport: Card[]) => {
    const activeCards = cardsToExport.filter((c) => c.deletedAt === null);

    // Header
    const headers = ['term', 'meaning', 'partOfSpeech', 'examples', 'notes', 'tags', 'source'];
    const rows = [headers.join(',')];

    for (const card of activeCards) {
      // Examples are joined by " | " during export for clean single-line representation
      const examplesString = card.examples.join(' | ');
      const tagsString = card.tags.join(',');

      const rowData = [
        card.term,
        card.meaning,
        card.partOfSpeech || '',
        examplesString,
        card.notes,
        tagsString,
        card.source || '',
      ];
      rows.push(arrayToCSVRow(rowData));
    }

    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);

    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `flashcards-export-${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasErrors = previewRows.some((r) => !r.isValid);
  const totalCount = previewRows.length;
  const validCount = previewRows.filter((r) => r.isValid).length;

  return {
    parseAndPreviewCsv,
    previewRows,
    clearPreview,
    confirmImport,
    exportToCsv,
    errorMsg,
    hasErrors,
    totalCount,
    validCount,
  };
}
