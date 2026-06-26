import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CardForm } from '../components/CardForm';
import { CardList } from '../components/CardList';
import type { Card } from '../services/cardRepository';

const baseCard: Card = {
  id: 'card-1',
  term: 'สวย',
  meaning: 'beautiful',
  partOfSpeech: 'adj.',
  examples: [],
  notes: '',
  tags: [],
  createdAt: '2026-06-25T00:00:00.000Z',
  updatedAt: '2026-06-25T00:00:00.000Z',
  deletedAt: null,
};

describe('part of speech UI', () => {
  it('saves the selected part of speech from the card form', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(<CardForm existingTags={[]} onSave={onSave} onCancel={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('e.g. สวัสดี (sawatdi) or Hello'), 'สวย');
    await user.type(screen.getByPlaceholderText('Enter the translation, meaning, or explanation'), 'beautiful');
    await user.selectOptions(screen.getByLabelText('Part of Speech'), 'adj.');
    await user.click(screen.getByRole('button', { name: 'Save Card' }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      term: 'สวย',
      meaning: 'beautiful',
      partOfSpeech: 'adj.',
    }));
  });

  it('shows part of speech next to a card in the list', () => {
    render(
      <CardList
        filteredCards={[baseCard]}
        dueCards={[baseCard]}
        cardStats={{}}
        allTags={[]}
        selectedTags={[]}
        searchQuery=""
        setSearchQuery={vi.fn()}
        toggleTag={vi.fn()}
        clearFilters={vi.fn()}
        onSelectCard={vi.fn()}
        onAddCardClick={vi.fn()}
        onStartReviewDue={vi.fn()}
        onStartReviewAll={vi.fn()}
      />,
    );

    expect(screen.getByText('adj.')).toBeInTheDocument();
  });
});
