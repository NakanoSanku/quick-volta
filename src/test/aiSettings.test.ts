import { beforeEach, describe, expect, it } from 'vitest';
import {
  AI_SETTINGS_STORAGE_KEY,
  DEFAULT_AI_SETTINGS,
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
    });
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
    }));
  });

  it('resets persisted settings', () => {
    saveAiSettings({ enabled: true, apiKey: 'test-key' });
    resetAiSettings();
    expect(localStorage.getItem(AI_SETTINGS_STORAGE_KEY)).toBeNull();
    expect(loadAiSettings()).toEqual(DEFAULT_AI_SETTINGS);
  });
});
