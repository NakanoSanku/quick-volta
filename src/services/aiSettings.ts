export const AI_SETTINGS_STORAGE_KEY = 'quick-volta-ai-settings';

export interface AiSettings {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
  outputLanguage: string;
  exampleCount: number;
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: false,
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4.1-mini',
  outputLanguage: '中文',
  exampleCount: 1,
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

export function normalizeAiSettings(settings: Partial<AiSettings>): AiSettings {
  return {
    enabled: Boolean(settings.enabled),
    baseUrl: cleanBaseUrl(settings.baseUrl),
    apiKey: cleanText(settings.apiKey, DEFAULT_AI_SETTINGS.apiKey),
    model: cleanText(settings.model, DEFAULT_AI_SETTINGS.model),
    outputLanguage: cleanText(settings.outputLanguage, DEFAULT_AI_SETTINGS.outputLanguage),
    exampleCount: clampExampleCount(settings.exampleCount),
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
