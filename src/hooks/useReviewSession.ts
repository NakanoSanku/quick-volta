import { useState, useEffect, useCallback } from 'react';
import { cardRepository, type Card, type ReviewStats } from '../services/cardRepository';

// Helper to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export type Rating = 1 | 2 | 3 | 4;

export function calculateSM2(
  rating: Rating,
  prevInterval: number,
  prevEaseFactor: number,
  prevRepetitions: number
) {
  let interval = 0;
  let easeFactor = prevEaseFactor;
  let repetitions = prevRepetitions;

  if (rating === 1) {
    // Again
    repetitions = 0;
    interval = 1;
    easeFactor = Math.max(1.3, prevEaseFactor - 0.2);
  } else {
    // Correct reviews (Hard, Good, Easy)
    repetitions = prevRepetitions + 1;

    if (rating === 2) {
      // Hard
      if (repetitions === 1) {
        interval = 1;
      } else if (repetitions === 2) {
        interval = 3;
      } else {
        interval = Math.round(prevInterval * 1.2);
      }
      easeFactor = Math.max(1.3, prevEaseFactor - 0.15);
    } else if (rating === 3) {
      // Good
      if (repetitions === 1) {
        interval = 1;
      } else if (repetitions === 2) {
        interval = 6;
      } else {
        interval = Math.round(prevInterval * prevEaseFactor);
      }
      // easeFactor remains unchanged
    } else {
      // Easy
      if (repetitions === 1) {
        interval = 3;
      } else if (repetitions === 2) {
        interval = 8;
      } else {
        interval = Math.round(prevInterval * prevEaseFactor * 1.3);
      }
      easeFactor = prevEaseFactor + 0.15;
    }
  }

  return { interval, easeFactor, repetitions };
}

interface UseReviewSessionOptions {
  onStatsSaved?: (stats: ReviewStats) => void;
}

function defaultStatsFor(cardId: string): ReviewStats {
  return {
    cardId,
    reviewCount: 0,
    knownCount: 0,
    unknownCount: 0,
    lastReviewedAt: null,
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
    nextDueAt: null,
  };
}

export function useReviewSession(initialCards: Card[], options: UseReviewSessionOptions = {}) {
  const [sessionCards, setSessionCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [currentStats, setCurrentStats] = useState<ReviewStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Initialize and shuffle cards
  const startSession = useCallback(() => {
    const shuffled = shuffleArray(initialCards);
    setSessionCards(shuffled);
    setCurrentIndex(0);
    setReveal(false);
  }, [initialCards]);

  useEffect(() => {
    if (initialCards.length > 0 && sessionCards.length === 0) {
      startSession();
    }
  }, [initialCards, sessionCards.length, startSession]);

  const currentCard = sessionCards[currentIndex] || null;

  // Load stats when current card changes
  useEffect(() => {
    if (currentCard) {
      setLoadingStats(true);
      cardRepository
        .getStats(currentCard.id)
        .then((stats) => {
          setCurrentStats(stats);
        })
        .catch((err) => {
          console.error('Failed to load review stats:', err);
        })
        .finally(() => {
          setLoadingStats(false);
        });
    } else {
      setCurrentStats(null);
    }
  }, [currentCard]);

  const handleDecision = async (rating: Rating) => {
    if (!currentCard) return;

    const existingStats = currentStats ?? defaultStatsFor(currentCard.id);
    const nextDueTime = existingStats.nextDueAt ? new Date(existingStats.nextDueAt).getTime() : null;
    const isReviewingBeforeDue = nextDueTime !== null && Number.isFinite(nextDueTime) && nextDueTime > Date.now();

    if (isReviewingBeforeDue) {
      setReveal(false);
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    const { interval, easeFactor, repetitions } = calculateSM2(
      rating,
      existingStats.interval ?? 0,
      existingStats.easeFactor ?? 2.5,
      existingStats.repetitions ?? 0
    );

    const isKnown = rating > 1;

    const updatedStats: ReviewStats = {
      cardId: currentCard.id,
      reviewCount: existingStats.reviewCount + 1,
      knownCount: existingStats.knownCount + (isKnown ? 1 : 0),
      unknownCount: existingStats.unknownCount + (isKnown ? 0 : 1),
      lastReviewedAt: new Date().toISOString(),
      interval,
      easeFactor,
      repetitions,
      nextDueAt: new Date(Date.now() + interval * 24 * 60 * 60 * 1000).toISOString(),
    };

    setCurrentStats(updatedStats);
    options.onStatsSaved?.(updatedStats);

    // Go to next card immediately; persist the stats in the background so the UI
    // never waits on the network/database round trip.
    setReveal(false);
    setCurrentIndex((prev) => prev + 1);

    await cardRepository.saveStats(updatedStats).catch((err) => {
      console.error('Failed to save review stats:', err);
    });
  };

  const again = () => handleDecision(1);
  const hard = () => handleDecision(2);
  const good = () => handleDecision(3);
  const easy = () => handleDecision(4);

  const getIntervalPreviews = (stats: ReviewStats | null) => {
    const prevInterval = stats?.interval ?? 0;
    const prevEase = stats?.easeFactor ?? 2.5;
    const prevReps = stats?.repetitions ?? 0;

    return {
      again: calculateSM2(1, prevInterval, prevEase, prevReps).interval,
      hard: calculateSM2(2, prevInterval, prevEase, prevReps).interval,
      good: calculateSM2(3, prevInterval, prevEase, prevReps).interval,
      easy: calculateSM2(4, prevInterval, prevEase, prevReps).interval,
    };
  };

  const nextIntervals = getIntervalPreviews(currentStats);
  const isFinished = sessionCards.length > 0 && currentIndex >= sessionCards.length;

  return {
    sessionCards,
    currentIndex,
    currentCard,
    currentStats,
    loadingStats,
    reveal,
    setReveal,
    again,
    hard,
    good,
    easy,
    nextIntervals,
    isFinished,
    startSession,
    progress: sessionCards.length > 0 ? (currentIndex / sessionCards.length) * 100 : 0,
  };
}
