import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CardList } from '../components/CardList';
import type { Card, ReviewStats } from '../services/cardRepository';

const card: Card = {
  id: 'card-1',
  term: 'auto',
  meaning: '汽车',
  partOfSpeech: 'n.',
  examples: [],
  notes: '',
  tags: ['交通'],
  createdAt: '2026-06-25T00:00:00.000Z',
  updatedAt: '2026-06-25T00:00:00.000Z',
  deletedAt: null,
};

const stats: ReviewStats = {
  cardId: card.id,
  reviewCount: 1,
  knownCount: 1,
  unknownCount: 0,
  lastReviewedAt: '2026-06-25T00:00:00.000Z',
  interval: 3,
  easeFactor: 2.5,
  repetitions: 1,
  nextDueAt: '2026-06-28T00:00:00.000Z',
};

function renderCardList(cardStats: Record<string, ReviewStats> = { [card.id]: stats }) {
  render(
    <CardList
      filteredCards={[card]}
      dueCards={[card]}
      cardStats={cardStats}
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
}

describe('CardList review schedule display', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not show the card-level due badge and shows days until next review', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-25T00:00:00.000Z'));

    renderCardList();

    expect(screen.queryByTitle('Due for review')).not.toBeInTheDocument();
    expect(screen.getByText('Review on 3 days')).toBeInTheDocument();
    expect(screen.queryByText(/Reviewed 1x/i)).not.toBeInTheDocument();
  });
});
