export const PART_OF_SPEECH_OPTIONS = [
  { value: 'n.', label: 'Noun' },
  { value: 'pron.', label: 'Pronoun' },
  { value: 'v.', label: 'Verb' },
  { value: 'aux.', label: 'Auxiliary verb' },
  { value: 'modal.', label: 'Modal verb' },
  { value: 'adj.', label: 'Adjective' },
  { value: 'adv.', label: 'Adverb' },
  { value: 'prep.', label: 'Preposition' },
  { value: 'conj.', label: 'Conjunction' },
  { value: 'det.', label: 'Determiner' },
  { value: 'art.', label: 'Article' },
  { value: 'num.', label: 'Numeral' },
  { value: 'interj.', label: 'Interjection' },
  { value: 'abbr.', label: 'Abbreviation' },
  { value: 'phr.', label: 'Phrase' },
  { value: 'idiom.', label: 'Idiom' },
  { value: 'prefix.', label: 'Prefix' },
  { value: 'suffix.', label: 'Suffix' },
] as const;

export type PartOfSpeech = (typeof PART_OF_SPEECH_OPTIONS)[number]['value'];

const PART_OF_SPEECH_VALUES = new Set<string>(
  PART_OF_SPEECH_OPTIONS.map((option) => option.value),
);

export function normalizePartOfSpeech(value: string | null | undefined): PartOfSpeech | undefined {
  const normalized = value?.trim();
  if (!normalized || !PART_OF_SPEECH_VALUES.has(normalized)) {
    return undefined;
  }
  return normalized as PartOfSpeech;
}
