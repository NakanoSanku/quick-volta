export const AI_SETTINGS_STORAGE_KEY = 'quick-volta-ai-settings';

export const DEFAULT_CARD_GENERATION_PROMPT = [
  'Generate flashcard information for this term or phrase: "{term}".',
  'Use {outputLanguage} for meaning, notes, and tags.',
  'Return exactly {examplePhrase}.',
  'Example Sentences must stay in the same language as the Term / Phrase, regardless of the Output Language.',
  'Do not use the Chinese full stop character "。" in meaning, notes, or examples.',
  'Return concise flashcard-ready content.',
  'Return JSON only with keys: meaning, partOfSpeech, examples, notes, tags.',
  'partOfSpeech must be one of: n., v., adj., adv., pron., prep., conj., det., art., aux., modal., num., interj., abbr., phr., idiom., prefix., suffix., or empty.',
  'examples must be an array of strings. tags must be short strings in {outputLanguage}.',
  'Available placeholders: {term}, {outputLanguage}, {exampleCount}, {examplePhrase}.',
].join('\n');

export interface AiSettings {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
  outputLanguage: string;
  exampleCount: number;
  cardGenerationPrompt: string;
}

export const AI_BASE_URL_PROVIDERS = [
  { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1' },
  { label: 'Cerebras', baseUrl: 'https://api.cerebras.ai/v1' },
] as const;

export const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: false,
  baseUrl: AI_BASE_URL_PROVIDERS[0].baseUrl,
  apiKey: '',
  model: 'gpt-4.1-mini',
  outputLanguage: '中文',
  exampleCount: 1,
  cardGenerationPrompt: DEFAULT_CARD_GENERATION_PROMPT,
};

function clampExampleCount(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_AI_SETTINGS.exampleCount;
  return Math.min(5, Math.max(0, Math.trunc(parsed)));
}

function cleanBaseUrl(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim() : DEFAULT_AI_SETTINGS.baseUrl;
  if (/^[a-z][a-z0-9+.-]*:\/?\/?$/i.test(raw)) {
    return raw;
  }
  return raw.replace(/\/{2,}$/, '');
}

function cleanText(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function cleanPrompt(value: unknown): string {
  const prompt = typeof value === 'string' ? value.trim() : '';
  return prompt || DEFAULT_CARD_GENERATION_PROMPT;
}

export function normalizeAiSettings(settings: Partial<AiSettings>): AiSettings {
  return {
    enabled: Boolean(settings.enabled),
    baseUrl: cleanBaseUrl(settings.baseUrl),
    apiKey: cleanText(settings.apiKey, DEFAULT_AI_SETTINGS.apiKey),
    model: cleanText(settings.model, DEFAULT_AI_SETTINGS.model),
    outputLanguage: cleanText(settings.outputLanguage, DEFAULT_AI_SETTINGS.outputLanguage),
    exampleCount: clampExampleCount(settings.exampleCount),
    cardGenerationPrompt: cleanPrompt(settings.cardGenerationPrompt),
  };
}

export function loadAiSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(AI_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    return normalizeAiSettings({ ...DEFAULT_AI_SETTINGS, ...(JSON.parse(raw) as Partial<AiSettings>) });
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export function saveAiSettings(settings: Partial<AiSettings>): AiSettings {
  const next = normalizeAiSettings({ ...loadAiSettings(), ...settings });
  localStorage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function resetAiSettings(): void {
  localStorage.removeItem(AI_SETTINGS_STORAGE_KEY);
}
