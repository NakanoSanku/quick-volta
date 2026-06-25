import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveAiSettings } from '../services/aiSettings';
import { generateCardInfo, AiGenerationError } from '../services/aiCardGenerator';

function mockFetchJson(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('aiCardGenerator', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('rejects when AI generation is disabled', async () => {
    await expect(generateCardInfo('hello')).rejects.toEqual(
      new AiGenerationError('AI generation is disabled. Enable it in Settings first.'),
    );
  });

  it('rejects when API key is missing', async () => {
    saveAiSettings({ enabled: true, apiKey: '', model: 'gpt-4.1-mini' });
    await expect(generateCardInfo('hello')).rejects.toEqual(
      new AiGenerationError('API key is required. Add it in Settings first.'),
    );
  });

  it('sends an OpenAI-compatible chat completions request', async () => {
    saveAiSettings({
      enabled: true,
      baseUrl: 'http://localhost:11434/v1',
      apiKey: 'secret-key',
      model: 'test-model',
      outputLanguage: 'English',
      exampleCount: 2,
    });
    const fetchMock = mockFetchJson({
      choices: [{
        message: { content: JSON.stringify({
          meaning: 'to invent a story or excuse',
          partOfSpeech: 'phr.',
          examples: ['I made up a story.', 'She made up an excuse.'],
          notes: 'Common phrasal verb.',
          tags: ['phrasal verb'],
        }) },
      }],
    });

    const result = await generateCardInfo('make up');

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:11434/v1/chat/completions', expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer secret-key',
      },
    }));
    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(requestBody).toEqual(expect.objectContaining({
      model: 'test-model',
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }));
    expect(JSON.stringify(requestBody.messages)).toContain('make up');
    expect(JSON.stringify(requestBody.messages)).toContain('English');
    expect(JSON.stringify(requestBody.messages)).toContain('2 example sentence');
    expect(result).toEqual({
      meaning: 'to invent a story or excuse',
      partOfSpeech: 'phr.',
      examples: ['I made up a story.', 'She made up an excuse.'],
      notes: 'Common phrasal verb.',
      tags: ['phrasal verb'],
    });
  });

  it('normalizes invalid optional values to safe values', async () => {
    saveAiSettings({ enabled: true, apiKey: 'key' });
    mockFetchJson({ choices: [{ message: { content: JSON.stringify({
      meaning: 'a greeting',
      partOfSpeech: 'unknown-pos',
      examples: ['Hello there.', 42, ''],
      notes: 123,
      tags: ['greeting', '', 99],
    }) } }] });

    await expect(generateCardInfo('hello')).resolves.toEqual({
      meaning: 'a greeting',
      partOfSpeech: undefined,
      examples: ['Hello there.'],
      notes: '',
      tags: ['greeting'],
    });
  });

  it('throws a readable error for provider failures', async () => {
    saveAiSettings({ enabled: true, apiKey: 'key' });
    mockFetchJson({ error: { message: 'bad key' } }, false, 401);
    await expect(generateCardInfo('hello')).rejects.toEqual(
      new AiGenerationError('AI request failed with status 401.'),
    );
  });

  it('throws a readable error for invalid JSON content', async () => {
    saveAiSettings({ enabled: true, apiKey: 'key' });
    mockFetchJson({ choices: [{ message: { content: 'not-json' } }] });
    await expect(generateCardInfo('hello')).rejects.toEqual(
      new AiGenerationError('AI response was not valid JSON.'),
    );
  });
});
