import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CardDetail } from '../components/CardDetail';
import { ReviewSession } from '../components/ReviewSession';
import { cardRepository, type Card } from '../services/cardRepository';
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

vi.mock('../hooks/useReviewSession', () => ({
  useReviewSession: vi.fn((cardsToReview: Card[]) => ({
    sessionCards: cardsToReview,
    currentIndex: 0,
    currentCard: cardsToReview[0],
    currentStats: {
      cardId: cardsToReview[0]?.id ?? 'card-1',
      reviewCount: 0,
      knownCount: 0,
      unknownCount: 0,
      lastReviewedAt: null,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      nextDueAt: null,
    },
    reveal: true,
    setReveal: vi.fn(),
    again: vi.fn(),
    hard: vi.fn(),
    good: vi.fn(),
    easy: vi.fn(),
    nextIntervals: { again: 0, hard: 1, good: 3, easy: 7 },
    isFinished: false,
    startSession: vi.fn(),
    progress: 50,
    loadingStats: false,
  })),
}));

const exampleCard: Card = {
  id: 'card-1',
  term: 'เหี้ย',
  meaning: 'test meaning',
  examples: ['ตัวอย่างที่หนึ่ง', 'ตัวอย่างที่สอง'],
  notes: '',
  tags: ['thai'],
  createdAt: '2026-06-25T00:00:00.000Z',
  updatedAt: '2026-06-25T00:00:00.000Z',
  deletedAt: null,
};

describe('example TTS buttons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cardRepository.getCardById).mockResolvedValue(exampleCard);
    vi.mocked(cardRepository.getStats).mockResolvedValue({
      cardId: exampleCard.id,
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

  it('plays a selected example from the card detail page', async () => {
    const user = userEvent.setup();

    render(
      <CardDetail
        cardId={exampleCard.id}
        onBack={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await screen.findByText('ตัวอย่างที่หนึ่ง');
    const exampleButtons = screen.getAllByTitle('Speak Example');

    expect(exampleButtons).toHaveLength(2);

    await user.click(exampleButtons[1]);

    expect(playTermTts).toHaveBeenCalledWith('ตัวอย่างที่สอง', ['thai']);
  });

  it('plays a selected example from the revealed review card without hiding the answer', async () => {
    const user = userEvent.setup();

    render(<ReviewSession cardsToReview={[exampleCard]} onExit={vi.fn()} />);

    await screen.findByText('ตัวอย่างที่หนึ่ง');
    const exampleButtons = screen.getAllByTitle('Speak Example');

    expect(exampleButtons).toHaveLength(2);

    await user.click(exampleButtons[0]);

    expect(playTermTts).toHaveBeenCalledWith('ตัวอย่างที่หนึ่ง', ['thai']);
  });
});
