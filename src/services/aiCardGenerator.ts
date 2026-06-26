import { loadAiSettings, type AiSettings } from './aiSettings';
import { normalizePartOfSpeech, type PartOfSpeech } from './partOfSpeech';

export interface GeneratedCardInfo {
  meaning: string;
  partOfSpeech?: PartOfSpeech;
  examples: string[];
  notes: string;
  tags: string[];
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export class AiGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiGenerationError';
  }
}

function requireSettings(settings: AiSettings): void {
  if (!settings.enabled) throw new AiGenerationError('AI generation is disabled. Enable it in Settings first.');
  if (!settings.apiKey) throw new AiGenerationError('API key is required. Add it in Settings first.');
  if (!settings.baseUrl) throw new AiGenerationError('Base URL is required. Add it in Settings first.');
  if (!settings.model) throw new AiGenerationError('Model is required. Add it in Settings first.');
}

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function removeChineseFullStops(value: string): string {
  return value.replace(/。/g, '').trim();
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => cleanString(item)).filter((item) => item.length > 0);
}

function parseGeneratedInfo(content: string): GeneratedCardInfo {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new AiGenerationError('AI response was not valid JSON.');
  }

  const meaning = cleanString(parsed.meaning);
  if (!meaning) throw new AiGenerationError('AI response did not include a meaning.');

  return {
    meaning: removeChineseFullStops(meaning),
    partOfSpeech: normalizePartOfSpeech(cleanString(parsed.partOfSpeech)),
    examples: cleanStringArray(parsed.examples).map(removeChineseFullStops),
    notes: removeChineseFullStops(cleanString(parsed.notes)),
    tags: cleanStringArray(parsed.tags),
  };
}

function interpolatePromptTemplate(template: string, term: string, settings: AiSettings): string {
  const examplePhrase =
    settings.exampleCount === 1 ? '1 example sentence' : `${settings.exampleCount} example sentences`;
  const placeholders: Record<string, string> = {
    term,
    outputLanguage: settings.outputLanguage,
    exampleCount: String(settings.exampleCount),
    examplePhrase,
  };

  return Object.entries(placeholders).reduce(
    (prompt, [key, value]) => prompt.split(`{${key}}`).join(value),
    template,
  );
}

function buildPrompt(term: string, settings: AiSettings): string {
  return interpolatePromptTemplate(settings.cardGenerationPrompt, term, settings);
}

export async function generateCardInfo(term: string): Promise<GeneratedCardInfo> {
  const trimmedTerm = term.trim();
  if (!trimmedTerm) throw new AiGenerationError('Term / Phrase is required before AI generation.');

  const settings = loadAiSettings();
  requireSettings(settings);

  const response = await fetch(`${settings.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You generate structured flashcard content and return strict JSON only.' },
        { role: 'user', content: buildPrompt(trimmedTerm, settings) },
      ],
    }),
  });

  if (!response.ok) throw new AiGenerationError(`AI request failed with status ${response.status}.`);

  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new AiGenerationError('AI response did not include message content.');
  return parseGeneratedInfo(content);
}
