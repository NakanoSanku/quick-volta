import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Settings } from '../components/Settings';
import { DEFAULT_CARD_GENERATION_PROMPT, loadAiSettings, saveAiSettings } from '../services/aiSettings';
import { fetchAiModels } from '../services/aiModels';

vi.mock('../services/aiModels', () => ({
  fetchAiModels: vi.fn(),
}));

describe('AI settings UI', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(fetchAiModels).mockReset();
  });

  it('renders default AI generation settings', () => {
    render(<Settings cards={[]} onImportSuccess={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'AI Generation' })).toBeInTheDocument();
    expect(screen.getByLabelText('Enable AI Generation')).not.toBeChecked();
    expect(screen.getByLabelText('Base URL')).toHaveValue('https://api.openai.com/v1');
    expect(screen.getByRole('button', { name: 'Groq' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerebras' })).toBeInTheDocument();
    expect(screen.getByLabelText('Model')).toHaveValue('gpt-4.1-mini');
    expect(screen.getByLabelText('Output Language')).toHaveValue('中文');
    expect(screen.getByLabelText('Example Count')).toHaveValue(1);
    expect(screen.getByLabelText('Card generation prompt')).toHaveValue(DEFAULT_CARD_GENERATION_PROMPT);
  });

  it('persists edited AI settings', async () => {
    const user = userEvent.setup();
    render(<Settings cards={[]} onImportSuccess={vi.fn()} />);
    await user.click(screen.getByLabelText('Enable AI Generation'));
    await user.clear(screen.getByLabelText('Base URL'));
    await user.type(screen.getByLabelText('Base URL'), 'http://localhost:11434/v1');
    await user.type(screen.getByLabelText('API Key'), 'secret-key');
    await user.clear(screen.getByLabelText('Custom model'));
    await user.type(screen.getByLabelText('Custom model'), 'local-model');
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
      cardGenerationPrompt: DEFAULT_CARD_GENERATION_PROMPT,
    });
  });

  it('applies built-in base URL provider presets', async () => {
    const user = userEvent.setup();
    render(<Settings cards={[]} onImportSuccess={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Groq' }));
    expect(screen.getByLabelText('Base URL')).toHaveValue('https://api.groq.com/openai/v1');
    expect(loadAiSettings().baseUrl).toBe('https://api.groq.com/openai/v1');

    await user.click(screen.getByRole('button', { name: 'Cerebras' }));
    expect(screen.getByLabelText('Base URL')).toHaveValue('https://api.cerebras.ai/v1');
    expect(loadAiSettings().baseUrl).toBe('https://api.cerebras.ai/v1');
  });

  it('persists edited card generation prompt text', async () => {
    const user = userEvent.setup();
    render(<Settings cards={[]} onImportSuccess={vi.fn()} />);
    const customPrompt = 'Custom prompt for {term} in {outputLanguage} with {examplePhrase}';

    const promptInput = screen.getByLabelText('Card generation prompt');
    await user.clear(promptInput);
    await user.click(promptInput);
    await user.paste(customPrompt);

    expect(loadAiSettings().cardGenerationPrompt).toBe(customPrompt);
  });

  it('resets the card generation prompt to the built-in default', async () => {
    const user = userEvent.setup();
    saveAiSettings({ cardGenerationPrompt: 'Custom prompt for {term}' });
    render(<Settings cards={[]} onImportSuccess={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Reset Prompt' }));

    expect(screen.getByLabelText('Card generation prompt')).toHaveValue(DEFAULT_CARD_GENERATION_PROMPT);
    expect(loadAiSettings().cardGenerationPrompt).toBe(DEFAULT_CARD_GENERATION_PROMPT);
  });

  it('loads previously saved settings', () => {
    saveAiSettings({ enabled: true, apiKey: 'saved-key', outputLanguage: 'Thai', exampleCount: 2 });
    render(<Settings cards={[]} onImportSuccess={vi.fn()} />);
    expect(screen.getByLabelText('Enable AI Generation')).toBeChecked();
    expect(screen.getByLabelText('API Key')).toHaveValue('saved-key');
    expect(screen.getByLabelText('Output Language')).toHaveValue('Thai');
    expect(screen.getByLabelText('Example Count')).toHaveValue(2);
  });

  it('auto-loads models when base URL and API key are saved', async () => {
    vi.mocked(fetchAiModels).mockResolvedValue(['gpt-a', 'gpt-b']);
    saveAiSettings({ apiKey: 'saved-key', model: 'gpt-a' });

    render(<Settings cards={[]} onImportSuccess={vi.fn()} />);

    expect(await screen.findByRole('option', { name: 'gpt-a' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'gpt-b' })).toBeInTheDocument();
    expect(screen.getByText('Loaded 2 models.')).toBeInTheDocument();
  });

  it('refreshes models when Refresh Models is clicked', async () => {
    vi.mocked(fetchAiModels)
      .mockResolvedValueOnce(['first-model'])
      .mockResolvedValueOnce(['second-model']);
    saveAiSettings({ apiKey: 'saved-key', model: 'first-model' });

    render(<Settings cards={[]} onImportSuccess={vi.fn()} />);
    expect(await screen.findByRole('option', { name: 'first-model' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Refresh Models' }));

    expect(await screen.findByRole('option', { name: 'second-model' })).toBeInTheDocument();
    expect(fetchAiModels).toHaveBeenCalledTimes(2);
  });

  it('saves a selected fetched model', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchAiModels).mockResolvedValue(['gpt-a', 'gpt-b']);
    saveAiSettings({ apiKey: 'saved-key', model: 'gpt-a' });

    render(<Settings cards={[]} onImportSuccess={vi.fn()} />);
    await screen.findByRole('option', { name: 'gpt-b' });

    await user.selectOptions(screen.getByLabelText('Model'), 'gpt-b');

    expect(loadAiSettings().model).toBe('gpt-b');
  });

  it('saves a custom model typed by the user', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchAiModels).mockResolvedValue(['gpt-a']);
    saveAiSettings({ apiKey: 'saved-key', model: 'gpt-a' });

    render(<Settings cards={[]} onImportSuccess={vi.fn()} />);
    await screen.findByRole('option', { name: 'gpt-a' });

    await user.clear(screen.getByLabelText('Custom model'));
    await user.type(screen.getByLabelText('Custom model'), 'local-custom');

    expect(loadAiSettings().model).toBe('local-custom');
  });

  it('keeps the current custom model visible when it is absent from fetched models', async () => {
    vi.mocked(fetchAiModels).mockResolvedValue(['gpt-a']);
    saveAiSettings({ apiKey: 'saved-key', model: 'local-custom' });

    render(<Settings cards={[]} onImportSuccess={vi.fn()} />);

    expect(await screen.findByRole('option', { name: 'local-custom (custom)' })).toBeInTheDocument();
    expect(screen.getByLabelText('Model')).toHaveValue('local-custom');
  });

  it('shows model load errors while leaving custom model editable', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchAiModels).mockRejectedValue(new Error('Model list request failed with status 401.'));
    saveAiSettings({ apiKey: 'saved-key', model: 'existing-model' });

    render(<Settings cards={[]} onImportSuccess={vi.fn()} />);

    expect(await screen.findByText('Model list request failed with status 401.')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Custom model'));
    await user.type(screen.getByLabelText('Custom model'), 'manual-after-error');

    expect(loadAiSettings().model).toBe('manual-after-error');
  });
});
