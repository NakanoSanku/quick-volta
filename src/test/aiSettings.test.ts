import { beforeEach, describe, expect, it } from 'vitest';
import {
  AI_SETTINGS_STORAGE_KEY,
  DEFAULT_AI_SETTINGS,
  DEFAULT_CARD_GENERATION_PROMPT,
  loadAiSettings,
  resetAiSettings,
  saveAiSettings,
} from '../services/aiSettings';

describe('aiSettings', () => {
  beforeEach(() => localStorage.clear());

  it('loads default settings when local storage is empty', () => {
    expect(loadAiSettings()).toEqual(DEFAULT_AI_SETTINGS);
  });

  it('persists edited settings to local storage', () => {
    saveAiSettings({
      enabled: true,
      baseUrl: 'http://localhost:11434/v1',
      apiKey: 'test-key',
      model: 'local-model',
      outputLanguage: 'English',
      exampleCount: 3,
    });

    expect(loadAiSettings()).toEqual({
      enabled: true,
      baseUrl: 'http://localhost:11434/v1',
      apiKey: 'test-key',
      model: 'local-model',
      outputLanguage: 'English',
      exampleCount: 3,
      cardGenerationPrompt: DEFAULT_CARD_GENERATION_PROMPT,
    });
  });

  it('includes an editable default card generation prompt', () => {
    expect(DEFAULT_AI_SETTINGS.cardGenerationPrompt).toBe(DEFAULT_CARD_GENERATION_PROMPT);
    expect(DEFAULT_CARD_GENERATION_PROMPT).toContain('{term}');
    expect(DEFAULT_CARD_GENERATION_PROMPT).toContain('{outputLanguage}');
    expect(DEFAULT_CARD_GENERATION_PROMPT).toContain('{exampleCount}');
    expect(DEFAULT_CARD_GENERATION_PROMPT).toContain('{examplePhrase}');
    expect(DEFAULT_CARD_GENERATION_PROMPT).toContain('same language as the Term / Phrase');
  });

  it('persists custom card generation prompt text', () => {
    const customPrompt = [
      'Generate a card for {term}',
      'Use {outputLanguage}',
      'Return {exampleCount} examples',
    ].join('\n');

    saveAiSettings({ cardGenerationPrompt: customPrompt });

    expect(loadAiSettings().cardGenerationPrompt).toBe(customPrompt);
  });

  it('falls back to the default prompt when saved prompt is blank', () => {
    saveAiSettings({ cardGenerationPrompt: '   ' });

    expect(loadAiSettings().cardGenerationPrompt).toBe(DEFAULT_CARD_GENERATION_PROMPT);
  });

  it('clamps example count between 0 and 5', () => {
    saveAiSettings({ exampleCount: 99 });
    expect(loadAiSettings().exampleCount).toBe(5);
    saveAiSettings({ exampleCount: -4 });
    expect(loadAiSettings().exampleCount).toBe(0);
  });

  it('trims base URL trailing slashes and text values', () => {
    saveAiSettings({
      baseUrl: ' https://example.test/v1/// ',
      apiKey: '  key  ',
      model: '  model-a  ',
      outputLanguage: '  中文  ',
    });

    expect(loadAiSettings()).toEqual(expect.objectContaining({
      baseUrl: 'https://example.test/v1',
      apiKey: 'key',
      model: 'model-a',
      outputLanguage: '中文',
      cardGenerationPrompt: DEFAULT_CARD_GENERATION_PROMPT,
    }));
  });

  it('resets persisted settings', () => {
    saveAiSettings({ enabled: true, apiKey: 'test-key' });
    resetAiSettings();
    expect(localStorage.getItem(AI_SETTINGS_STORAGE_KEY)).toBeNull();
    expect(loadAiSettings()).toEqual(DEFAULT_AI_SETTINGS);
  });
});
