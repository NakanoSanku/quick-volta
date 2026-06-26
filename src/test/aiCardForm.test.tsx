import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CardForm } from '../components/CardForm';
import { generateCardInfo } from '../services/aiCardGenerator';
import { saveAiSettings } from '../services/aiSettings';

vi.mock('../services/aiCardGenerator', () => ({ generateCardInfo: vi.fn() }));

const termInput = () => screen.getByPlaceholderText(/Hello/);
const meaningInput = () => screen.getByPlaceholderText('Enter the translation, meaning, or explanation');
const notesInput = () => screen.getByPlaceholderText('Pronunciation, usage rules, grammar notes...');

describe('CardForm AI generation', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(generateCardInfo).mockReset();
  });

  it('shows the AI button only after a term is entered', async () => {
    const user = userEvent.setup();
    render(<CardForm existingTags={[]} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'AI Generate' })).not.toBeInTheDocument();
    await user.type(termInput(), 'make up');
    expect(screen.getByRole('button', { name: 'AI Generate' })).toBeInTheDocument();
  });

  it('fills empty fields from generated card info', async () => {
    const user = userEvent.setup();
    vi.mocked(generateCardInfo).mockResolvedValue({
      meaning: 'to invent a story or excuse',
      partOfSpeech: 'phr.',
      examples: ['I made up a story.'],
      notes: 'Common phrasal verb.',
      tags: ['phrasal verb'],
    });
    render(<CardForm existingTags={[]} onSave={vi.fn()} onCancel={vi.fn()} />);
    await user.type(termInput(), 'make up');
    await user.click(screen.getByRole('button', { name: 'AI Generate' }));
    await waitFor(() => expect(meaningInput()).toHaveValue('to invent a story or excuse'));
    expect(screen.getByLabelText('Part of Speech')).toHaveValue('phr.');
    expect(screen.getByPlaceholderText('Example sentence #1')).toHaveValue('I made up a story.');
    expect(notesInput()).toHaveValue('Common phrasal verb.');
    expect(screen.getByText('phrasal verb')).toBeInTheDocument();
    expect(generateCardInfo).toHaveBeenCalledWith('make up');
  });

  it('keeps AI generated tags in the configured output language without adding English language tags', async () => {
    const user = userEvent.setup();
    saveAiSettings({ outputLanguage: '中文' });
    vi.mocked(generateCardInfo).mockResolvedValue({
      meaning: '敏捷的',
      partOfSpeech: 'adj.',
      examples: ['这只猫很敏捷'],
      notes: '常用于描述动作灵活',
      tags: ['形容词', '速度'],
    });

    render(<CardForm existingTags={[]} onSave={vi.fn()} onCancel={vi.fn()} />);
    await user.type(termInput(), 'nimble');
    await user.click(screen.getByRole('button', { name: 'AI Generate' }));

    await waitFor(() => expect(meaningInput()).toHaveValue('敏捷的'));
    expect(screen.getByText('形容词')).toBeInTheDocument();
    expect(screen.getByText('速度')).toBeInTheDocument();
    expect(screen.queryByText('chinese')).not.toBeInTheDocument();
  });

  it('does not overwrite non-empty user fields', async () => {
    const user = userEvent.setup();
    vi.mocked(generateCardInfo).mockResolvedValue({
      meaning: 'AI meaning',
      partOfSpeech: 'v.',
      examples: ['AI example.'],
      notes: 'AI notes',
      tags: ['ai-tag'],
    });
    render(<CardForm existingTags={[]} onSave={vi.fn()} onCancel={vi.fn()} />);
    await user.type(termInput(), 'hello');
    await user.type(meaningInput(), 'Manual meaning');
    await user.type(screen.getByPlaceholderText('Example sentence #1'), 'Manual example.');
    await user.type(notesInput(), 'Manual notes');
    await user.type(screen.getByPlaceholderText('Create new tag...'), 'manual-tag');
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: 'AI Generate' }));
    await waitFor(() => expect(generateCardInfo).toHaveBeenCalledWith('hello'));
    expect(meaningInput()).toHaveValue('Manual meaning');
    expect(screen.getByPlaceholderText('Example sentence #1')).toHaveValue('Manual example.');
    expect(notesInput()).toHaveValue('Manual notes');
    expect(screen.getByText('manual-tag')).toBeInTheDocument();
    expect(screen.queryByText('ai-tag')).not.toBeInTheDocument();
  });

  it('shows an inline error when generation fails', async () => {
    const user = userEvent.setup();
    vi.mocked(generateCardInfo).mockRejectedValue(new Error('API key is required. Add it in Settings first.'));
    render(<CardForm existingTags={[]} onSave={vi.fn()} onCancel={vi.fn()} />);
    await user.type(termInput(), 'hello');
    await user.click(screen.getByRole('button', { name: 'AI Generate' }));
    expect(await screen.findByText('API key is required. Add it in Settings first.')).toBeInTheDocument();
  });

  it('still requires meaning before saving', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<CardForm existingTags={[]} onSave={onSave} onCancel={vi.fn()} />);
    await user.type(termInput(), 'hello');
    await user.click(screen.getByRole('button', { name: 'Save Card' }));
    expect(screen.getByText('Meaning is required.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});
