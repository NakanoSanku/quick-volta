import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CARD_GENERATION_PROMPT, saveAiSettings } from '../services/aiSettings';
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
    expect(JSON.stringify(requestBody.messages)).toContain('same language as the Term / Phrase');
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

  it('removes Chinese full stops from generated text fields', async () => {
    saveAiSettings({ enabled: true, apiKey: 'key', outputLanguage: '中文' });
    mockFetchJson({ choices: [{ message: { content: JSON.stringify({
      meaning: '敏捷的。',
      partOfSpeech: 'adj.',
      examples: ['这只猫很敏捷。', '他动作很快。'],
      notes: '常用于描述动作灵活。',
      tags: ['形容词'],
    }) } }] });

    await expect(generateCardInfo('nimble')).resolves.toEqual({
      meaning: '敏捷的',
      partOfSpeech: 'adj.',
      examples: ['这只猫很敏捷', '他动作很快'],
      notes: '常用于描述动作灵活',
      tags: ['形容词'],
    });
  });

  it('asks for tags in the configured output language and preserves localized tags', async () => {
    saveAiSettings({ enabled: true, apiKey: 'key', outputLanguage: '中文' });
    const fetchMock = mockFetchJson({ choices: [{ message: { content: JSON.stringify({
      meaning: '敏捷的',
      partOfSpeech: 'adj.',
      examples: ['这只猫很敏捷'],
      notes: '常用于描述动作灵活',
      tags: ['形容词', '速度'],
    }) } }] });

    const result = await generateCardInfo('nimble');
    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const prompt = JSON.stringify(requestBody.messages);

    expect(prompt).toContain('Use 中文 for meaning, notes, and tags.');
    expect(prompt).toContain('Example Sentences must stay in the same language as the Term / Phrase');
    expect(prompt).toContain('tags must be short strings in 中文');
    expect(prompt).not.toContain('tags must be short lowercase strings');
    expect(result.tags).toEqual(['形容词', '速度']);
  });

  it('uses the built-in prompt template by default', async () => {
    saveAiSettings({ enabled: true, apiKey: 'key', outputLanguage: '中文', exampleCount: 1 });
    const fetchMock = mockFetchJson({ choices: [{ message: { content: JSON.stringify({
      meaning: '奔跑',
      partOfSpeech: 'v.',
      examples: ['I run every morning.'],
      notes: '',
      tags: ['动词'],
    }) } }] });

    await generateCardInfo('run');

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const userPrompt = requestBody.messages.find((message: { role: string }) => message.role === 'user').content;
    expect(DEFAULT_CARD_GENERATION_PROMPT).toContain('Example Sentences must stay in the same language as the Term / Phrase');
    expect(userPrompt).toContain('Generate flashcard information for this term or phrase: "run".');
    expect(userPrompt).toContain('Use 中文 for meaning, notes, and tags.');
    expect(userPrompt).toContain('Return exactly 1 example sentence.');
    expect(userPrompt).toContain('Example Sentences must stay in the same language as the Term / Phrase');
  });

  it('replaces placeholders in a custom prompt template before sending the request', async () => {
    saveAiSettings({
      enabled: true,
      apiKey: 'key',
      outputLanguage: 'Thai',
      exampleCount: 3,
      cardGenerationPrompt: [
        'Term={term}',
        'Language={outputLanguage}',
        'Count={exampleCount}',
        'Phrase={examplePhrase}',
      ].join('\n'),
    });
    const fetchMock = mockFetchJson({ choices: [{ message: { content: JSON.stringify({
      meaning: 'ทดสอบ',
      partOfSpeech: 'n.',
      examples: ['test example'],
      notes: '',
      tags: ['คำนาม'],
    }) } }] });

    await generateCardInfo('test');

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const userPrompt = requestBody.messages.find((message: { role: string }) => message.role === 'user').content;
    expect(userPrompt).toBe([
      'Term=test',
      'Language=Thai',
      'Count=3',
      'Phrase=3 example sentences',
    ].join('\n'));
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
