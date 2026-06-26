import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReviewSession } from '../components/ReviewSession';
import { type Card } from '../services/cardRepository';
import { playTermTts } from '../services/tts';

const { setRevealMock } = vi.hoisted(() => ({
  setRevealMock: vi.fn(),
}));

vi.mock('../services/tts', () => ({
  playTermTts: vi.fn(),
}));

vi.mock('../hooks/useReviewSession', () => ({
  useReviewSession: vi.fn((cardsToReview: Card[]) => ({
    sessionCards: cardsToReview,
    currentIndex: 0,
    currentCard: cardsToReview[0],
    currentStats: null,
    reveal: true,
    setReveal: setRevealMock,
    again: vi.fn(),
    hard: vi.fn(),
    good: vi.fn(),
    easy: vi.fn(),
    nextIntervals: { again: 1, hard: 1, good: 1, easy: 3 },
    isFinished: false,
    startSession: vi.fn(),
    progress: 0,
    loadingStats: false,
  })),
}));

const reviewCard: Card = {
  id: 'card-1',
  term: 'nimble',
  meaning: 'quick and light in movement',
  partOfSpeech: 'adj.',
  examples: ['The nimble cat jumped over the wall.'],
  notes: '',
  tags: ['english'],
  createdAt: '2026-06-25T00:00:00.000Z',
  updatedAt: '2026-06-25T00:00:00.000Z',
  deletedAt: null,
};

describe('ReviewSession card sides', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setRevealMock.mockClear();
  });

  it('uses the term as the card front prompt', () => {
    const { container } = render(<ReviewSession cardsToReview={[reviewCard]} onExit={vi.fn()} />);

    const front = container.querySelector('.flip-card-front');
    expect(front).toHaveTextContent('Term / Phrase');
    expect(front?.querySelector('.review-term')).toHaveTextContent('nimble');
    expect(front).not.toHaveTextContent('quick and light in movement');
  });

  it('uses the meaning as the revealed answer', () => {
    const { container } = render(<ReviewSession cardsToReview={[reviewCard]} onExit={vi.fn()} />);

    const back = container.querySelector('.flip-card-back');
    const meaningBox = back?.querySelector('.detail-meaning-box');
    expect(back).toHaveTextContent('Meaning');
    expect(meaningBox).toHaveClass('review-meaning-box');
    expect(meaningBox?.querySelector('.detail-meaning-label')).toHaveTextContent('Meaning');
    expect(meaningBox?.querySelector('.detail-meaning-text')).toHaveTextContent('quick and light in movement');
  });

  it('plays the term from the card front without revealing or hiding the card', async () => {
    const user = userEvent.setup();
    const { container } = render(<ReviewSession cardsToReview={[reviewCard]} onExit={vi.fn()} />);

    const frontSpeakButton = container.querySelector('.flip-card-front button[title="Speak Term"]');
    expect(frontSpeakButton).toBeInTheDocument();

    await user.click(frontSpeakButton as HTMLElement);

    expect(playTermTts).toHaveBeenCalledWith('nimble', ['english']);
    expect(setRevealMock).not.toHaveBeenCalled();
  });

  it('moves term speech to the back header and removes meaning speech and part of speech', () => {
    const { container } = render(<ReviewSession cardsToReview={[reviewCard]} onExit={vi.fn()} />);

    const back = container.querySelector('.flip-card-back');
    const backHeader = back?.querySelector('.detail-header');
    const meaningBox = back?.querySelector('.detail-meaning-box');

    expect(backHeader?.querySelector('button[title="Speak Term"]')).toBeInTheDocument();
    expect(backHeader?.querySelector('button[title="Favorite Card"]')).not.toBeInTheDocument();
    expect(backHeader?.querySelector('button[title="Remove Favorite"]')).not.toBeInTheDocument();
    expect(meaningBox?.querySelector('button[title="Speak Term"]')).not.toBeInTheDocument();
    expect(meaningBox?.querySelector('.detail-pos-badge')).not.toBeInTheDocument();
  });
});
