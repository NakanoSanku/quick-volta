import { loadAiSettings, type AiSettings } from './aiSettings';

interface ModelListResponse {
  data?: Array<{ id?: unknown }>;
}

export class AiModelListError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiModelListError';
  }
}

function requireModelSettings(settings: AiSettings): void {
  if (!settings.baseUrl.trim()) {
    throw new AiModelListError('Base URL is required to load models.');
  }
  if (!settings.apiKey.trim()) {
    throw new AiModelListError('API key is required to load models.');
  }
}

export async function fetchAiModels(settings: AiSettings = loadAiSettings()): Promise<string[]> {
  requireModelSettings(settings);

  const response = await fetch(`${settings.baseUrl}/models`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
    },
  });

  if (!response.ok) {
    throw new AiModelListError(`Model list request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as ModelListResponse;
  if (!Array.isArray(data.data)) {
    throw new AiModelListError('Model list response was invalid.');
  }

  return Array.from(
    new Set(
      data.data
        .map((model) => (typeof model.id === 'string' ? model.id.trim() : ''))
        .filter((id) => id.length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b));
}
