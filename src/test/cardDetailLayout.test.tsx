import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CardDetail } from '../components/CardDetail';
import { cardRepository, type Card, type ReviewStats } from '../services/cardRepository';
import { playTermTts } from '../services/tts';

vi.mock('../services/tts', () => ({
  playTermTts: vi.fn(),
}));

vi.mock('../services/cardRepository', async () => {
  const actual = await vi.importActual<typeof import('../services/cardRepository')>('../services/cardRepository');
  return {
    ...actual,
    cardRepository: {
      getCardById: vi.fn(),
      getStats: vi.fn(),
    },
  };
});

const detailCard: Card = {
  id: 'card-1',
  term: 'nimble',
  meaning: 'quick and light in movement',
  partOfSpeech: 'adj.',
  examples: ['The nimble cat jumped.'],
  notes: 'Often used for quick movement.',
  tags: ['english', 'speed'],
  createdAt: '2026-06-25T00:00:00.000Z',
  updatedAt: '2026-06-25T00:00:00.000Z',
  deletedAt: null,
};

const detailStats: ReviewStats = {
  cardId: detailCard.id,
  reviewCount: 2,
  knownCount: 2,
  unknownCount: 0,
  lastReviewedAt: '2026-06-25T00:00:00.000Z',
  interval: 3,
  easeFactor: 2.5,
  repetitions: 2,
  nextDueAt: '2026-06-28T00:00:00.000Z',
};

describe('CardDetail layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cardRepository.getCardById).mockResolvedValue(detailCard);
    vi.mocked(cardRepository.getStats).mockResolvedValue({
      cardId: detailCard.id,
      reviewCount: 0,
      knownCount: 0,
      unknownCount: 0,
      lastReviewedAt: null,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      nextDueAt: null,
    });
  });

  it('uses the term as the header and moves term speech there', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <CardDetail
        cardId={detailCard.id}
        onBack={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await screen.findByText('nimble');

    const detailHeader = container.querySelector('.detail-header');
    const meaningBox = container.querySelector('.detail-meaning-box');
    const headerSpeakButton = detailHeader?.querySelector('button[title="Speak Term"]');

    expect(detailHeader?.querySelector('.detail-term')).toHaveTextContent('nimble');
    expect(detailHeader?.querySelector('.detail-pos-badge')).toHaveTextContent('adj.');
    expect(detailHeader?.querySelector('button[title="Favorite Card"]')).not.toBeInTheDocument();
    expect(detailHeader?.querySelector('button[title="Remove Favorite"]')).not.toBeInTheDocument();
    expect(headerSpeakButton).toBeInTheDocument();
    expect(meaningBox?.querySelector('.detail-meaning-text')).toHaveTextContent('quick and light in movement');
    expect(meaningBox?.querySelector('.detail-pos-badge')).not.toBeInTheDocument();
    expect(meaningBox?.querySelector('button[title="Speak Term"]')).not.toBeInTheDocument();

    await user.click(headerSpeakButton as HTMLElement);

    expect(playTermTts).toHaveBeenCalledWith('nimble', ['english', 'speed']);
  });

  it('renders immediately from initial card data without refetching', () => {
    render(
      <CardDetail
        cardId={detailCard.id}
        initialCard={detailCard}
        initialStats={detailStats}
        onBack={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.queryByText('Loading card details...')).not.toBeInTheDocument();
    expect(screen.getByText('nimble')).toBeInTheDocument();
    expect(screen.getByText(/Reviewed 2 times/)).toBeInTheDocument();
    expect(cardRepository.getCardById).not.toHaveBeenCalled();
    expect(cardRepository.getStats).not.toHaveBeenCalled();
  });
});
