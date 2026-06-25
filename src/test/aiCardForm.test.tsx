import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CardForm } from '../components/CardForm';
import { generateCardInfo } from '../services/aiCardGenerator';

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
