import { describe, it, expect } from 'vitest';
import { parseCSV, arrayToCSVRow } from '../hooks/useCsvImportExport';

describe('CSV Parser & Serializer Utilities', () => {
  describe('parseCSV', () => {
    it('should parse simple CSV rows', () => {
      const csv = 'term,meaning,tags\nhello,สวัสดี,english\nworld,โลก,english';
      const result = parseCSV(csv);
      expect(result).toEqual([
        ['term', 'meaning', 'tags'],
        ['hello', 'สวัสดี', 'english'],
        ['world', 'โลก', 'english'],
      ]);
    });

    it('should parse quoted fields with commas', () => {
      const csv = 'term,meaning,notes\n"hello, world",สวัสดี,"greeting, standard"';
      const result = parseCSV(csv);
      expect(result).toEqual([
        ['term', 'meaning', 'notes'],
        ['hello, world', 'สวัสดี', 'greeting, standard'],
      ]);
    });

    it('should parse quoted fields with newlines', () => {
      const csv = 'term,meaning\nhello,"สวัสดี\n(sawatdi)"';
      const result = parseCSV(csv);
      expect(result).toEqual([
        ['term', 'meaning'],
        ['hello', 'สวัสดี\n(sawatdi)'],
      ]);
    });

    it('should parse double quotes inside quoted fields', () => {
      const csv = 'term,meaning\n"say ""hello""","พูด ""สวัสดี"""';
      const result = parseCSV(csv);
      expect(result).toEqual([
        ['term', 'meaning'],
        ['say "hello"', 'พูด "สวัสดี"'],
      ]);
    });
  });

  describe('arrayToCSVRow', () => {
    it('should not quote simple fields', () => {
      const row = ['hello', 'สวัสดี', 'tag1'];
      expect(arrayToCSVRow(row)).toBe('hello,สวัสดี,tag1');
    });

    it('should quote fields containing commas', () => {
      const row = ['hello, world', 'สวัสดี'];
      expect(arrayToCSVRow(row)).toBe('"hello, world",สวัสดี');
    });

    it('should quote fields containing quotes and escape them', () => {
      const row = ['say "hello"', 'สวัสดี'];
      expect(arrayToCSVRow(row)).toBe('"say ""hello""",สวัสดี');
    });

    it('should quote fields containing newlines', () => {
      const row = ['hello', 'สวัสดี\n(sawatdi)'];
      expect(arrayToCSVRow(row)).toBe('hello,"สวัสดี\n(sawatdi)"');
    });
  });
});
