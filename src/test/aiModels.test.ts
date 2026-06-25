import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_AI_SETTINGS, type AiSettings } from '../services/aiSettings';
import { AiModelListError, fetchAiModels } from '../services/aiModels';

function settings(patch: Partial<AiSettings> = {}): AiSettings {
  return {
    ...DEFAULT_AI_SETTINGS,
    enabled: true,
    baseUrl: 'http://localhost:11434/v1',
    apiKey: 'test-key',
    model: 'custom-model',
    ...patch,
  };
}

function mockFetchJson(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('fetchAiModels', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls the OpenAI-compatible models endpoint with bearer auth', async () => {
    const fetchMock = mockFetchJson({
      object: 'list',
      data: [{ id: 'z-model' }, { id: 'a-model' }],
    });

    await expect(fetchAiModels(settings())).resolves.toEqual(['a-model', 'z-model']);

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:11434/v1/models', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-key',
      },
    });
  });

  it('removes blank IDs, duplicate IDs, and sorts model IDs', async () => {
    mockFetchJson({
      data: [
        { id: 'gpt-z' },
        { id: '' },
        { id: 'gpt-a' },
        { id: 'gpt-z' },
        { id: 123 },
      ],
    });

    await expect(fetchAiModels(settings())).resolves.toEqual(['gpt-a', 'gpt-z']);
  });

  it('throws a readable error when base URL is missing', async () => {
    await expect(fetchAiModels(settings({ baseUrl: '' }))).rejects.toEqual(
      new AiModelListError('Base URL is required to load models.'),
    );
  });

  it('throws a readable error when API key is missing', async () => {
    await expect(fetchAiModels(settings({ apiKey: '' }))).rejects.toEqual(
      new AiModelListError('API key is required to load models.'),
    );
  });

  it('throws a readable error for provider failures', async () => {
    mockFetchJson({ error: { message: 'bad key' } }, false, 401);

    await expect(fetchAiModels(settings())).rejects.toEqual(
      new AiModelListError('Model list request failed with status 401.'),
    );
  });

  it('throws a readable error for invalid response shape', async () => {
    mockFetchJson({ object: 'list', data: null });

    await expect(fetchAiModels(settings())).rejects.toEqual(
      new AiModelListError('Model list response was invalid.'),
    );
  });
});
