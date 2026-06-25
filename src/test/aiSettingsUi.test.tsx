import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Settings } from '../components/Settings';
import { loadAiSettings, saveAiSettings } from '../services/aiSettings';

describe('AI settings UI', () => {
  beforeEach(() => localStorage.clear());

  it('renders default AI generation settings', () => {
    render(<Settings cards={[]} onImportSuccess={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'AI Generation' })).toBeInTheDocument();
    expect(screen.getByLabelText('Enable AI Generation')).not.toBeChecked();
    expect(screen.getByLabelText('Base URL')).toHaveValue('https://api.openai.com/v1');
    expect(screen.getByLabelText('Model')).toHaveValue('gpt-4.1-mini');
    expect(screen.getByLabelText('Output Language')).toHaveValue('中文');
    expect(screen.getByLabelText('Example Count')).toHaveValue(1);
  });

  it('persists edited AI settings', async () => {
    const user = userEvent.setup();
    render(<Settings cards={[]} onImportSuccess={vi.fn()} />);
    await user.click(screen.getByLabelText('Enable AI Generation'));
    await user.clear(screen.getByLabelText('Base URL'));
    await user.type(screen.getByLabelText('Base URL'), 'http://localhost:11434/v1');
    await user.type(screen.getByLabelText('API Key'), 'secret-key');
    await user.clear(screen.getByLabelText('Model'));
    await user.type(screen.getByLabelText('Model'), 'local-model');
    await user.clear(screen.getByLabelText('Output Language'));
    await user.type(screen.getByLabelText('Output Language'), 'English');
    await user.clear(screen.getByLabelText('Example Count'));
    await user.type(screen.getByLabelText('Example Count'), '3');
    expect(loadAiSettings()).toEqual({
      enabled: true,
      baseUrl: 'http://localhost:11434/v1',
      apiKey: 'secret-key',
      model: 'local-model',
      outputLanguage: 'English',
      exampleCount: 3,
    });
  });

  it('loads previously saved settings', () => {
    saveAiSettings({ enabled: true, apiKey: 'saved-key', outputLanguage: 'Thai', exampleCount: 2 });
    render(<Settings cards={[]} onImportSuccess={vi.fn()} />);
    expect(screen.getByLabelText('Enable AI Generation')).toBeChecked();
    expect(screen.getByLabelText('API Key')).toHaveValue('saved-key');
    expect(screen.getByLabelText('Output Language')).toHaveValue('Thai');
    expect(screen.getByLabelText('Example Count')).toHaveValue(2);
  });
});
