import { describe, expect, it } from 'vitest';
import { PART_OF_SPEECH_OPTIONS, normalizePartOfSpeech } from '../services/partOfSpeech';

describe('part of speech options', () => {
  it('includes common English dictionary part-of-speech abbreviations', () => {
    expect(PART_OF_SPEECH_OPTIONS.map((option) => option.value)).toEqual([
      'n.',
      'pron.',
      'v.',
      'aux.',
      'modal.',
      'adj.',
      'adv.',
      'prep.',
      'conj.',
      'det.',
      'art.',
      'num.',
      'interj.',
      'abbr.',
      'phr.',
      'idiom.',
      'prefix.',
      'suffix.',
    ]);
  });

  it('normalizes blank or invalid values to undefined', () => {
    expect(normalizePartOfSpeech('adj.')).toBe('adj.');
    expect(normalizePartOfSpeech(' v. ')).toBe('v.');
    expect(normalizePartOfSpeech('verb')).toBeUndefined();
    expect(normalizePartOfSpeech('')).toBeUndefined();
  });
});
