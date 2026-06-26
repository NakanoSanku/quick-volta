import { useState, useEffect, useMemo, useCallback } from 'react';
import { cardRepository, type Card, type ReviewStats } from '../services/cardRepository';

export function useCards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [cardStats, setCardStats] = useState<Record<string, ReviewStats>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const fetchCards = useCallback(async () => {
    try {
      setLoading(true);
      const data = await cardRepository.getAllCards();
      const statsList = await cardRepository.getAllStats();

      const statsMap: Record<string, ReviewStats> = {};
      statsList.forEach((s) => {
        statsMap[s.cardId] = s;
      });
      setCardStats(statsMap);

      // Sort by createdAt descending so new cards appear first by default
      const sorted = data.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setCards(sorted);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch cards:', err);
      setError('Failed to load cards from local storage.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const addCard = async (
    cardData: Omit<Card, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
  ): Promise<Card> => {
    const now = new Date().toISOString();
    const newCard: Card = {
      ...cardData,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    await cardRepository.saveCard(newCard);
    await fetchCards();
    return newCard;
  };

  const updateCard = async (
    id: string,
    cardData: Partial<Omit<Card, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>>
  ): Promise<Card> => {
    const existing = await cardRepository.getCardById(id);
    if (!existing) {
      throw new Error(`Card with ID ${id} not found.`);
    }

    const updatedCard: Card = {
      ...existing,
      ...cardData,
      updatedAt: new Date().toISOString(),
    };

    await cardRepository.saveCard(updatedCard);
    await fetchCards();
    return updatedCard;
  };

  const deleteCard = async (id: string): Promise<void> => {
    await cardRepository.softDeleteCard(id);
    await fetchCards();
  };

  const applyReviewStats = useCallback((stats: ReviewStats) => {
    setCardStats((prev) => ({
      ...prev,
      [stats.cardId]: stats,
    }));
  }, []);

  // Get all unique tags from non-deleted cards
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    cards.forEach((card) => {
      card.tags.forEach((tag) => {
        const trimmed = tag.trim();
        if (trimmed) {
          tagsSet.add(trimmed);
        }
      });
    });
    return Array.from(tagsSet).sort();
  }, [cards]);

  // Filtered cards based on search and tag selections
  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      // 1. Tag filtering (AND condition: card must have all selected tags)
      if (selectedTags.length > 0) {
        const cardTags = card.tags.map((t) => t.toLowerCase().trim());
        const matchesTags = selectedTags.every((tag) =>
          cardTags.includes(tag.toLowerCase().trim())
        );
        if (!matchesTags) return false;
      }

      // 2. Search query filtering
      if (searchQuery.trim() === '') return true;
      const query = searchQuery.toLowerCase().trim();
      const matchTerm = card.term.toLowerCase().includes(query);
      const matchMeaning = card.meaning.toLowerCase().includes(query);
      const matchNotes = card.notes.toLowerCase().includes(query);
      const matchPartOfSpeech = card.partOfSpeech?.toLowerCase().includes(query) ?? false;
      const matchExamples = card.examples.some((ex) =>
        ex.toLowerCase().includes(query)
      );

      return matchTerm || matchMeaning || matchNotes || matchPartOfSpeech || matchExamples;
    });
  }, [cards, searchQuery, selectedTags]);

  const dueCards = useMemo(() => {
    const now = new Date().toISOString();
    return filteredCards.filter((card) => {
      const stats = cardStats[card.id];
      return !stats || !stats.nextDueAt || stats.nextDueAt <= now;
    });
  }, [filteredCards, cardStats]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
  };

  return {
    cards,
    filteredCards,
    dueCards,
    cardStats,
    allTags,
    selectedTags,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    toggleTag,
    clearFilters,
    addCard,
    updateCard,
    deleteCard,
    applyReviewStats,
    refreshCards: fetchCards,
  };
}
