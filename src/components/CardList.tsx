import { Search, X, Tag, BookOpen, Plus, Play } from 'lucide-react';
import { type Card, type ReviewStats } from '../services/cardRepository';

interface CardListProps {
  filteredCards: Card[];
  dueCards: Card[];
  cardStats: Record<string, ReviewStats>;
  allTags: string[];
  selectedTags: string[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  toggleTag: (tag: string) => void;
  clearFilters: () => void;
  onSelectCard: (id: string) => void;
  onAddCardClick: () => void;
  onStartReviewDue: () => void;
  onStartReviewAll: () => void;
}

export function CardList({
  filteredCards,
  dueCards,
  cardStats,
  allTags,
  selectedTags,
  searchQuery,
  setSearchQuery,
  toggleTag,
  clearFilters,
  onSelectCard,
  onAddCardClick,
  onStartReviewDue,
  onStartReviewAll,
}: CardListProps) {
  return (
    <>
      <div className="top-header">
        <div className="header-title-row">
          <h1 className="header-title header-title-brand">Quick Volta</h1>
          {dueCards.length > 0 ? (
            <button
              className="btn btn-primary header-review-btn"
              onClick={onStartReviewDue}
              title="Review Due Cards"
            >
              <Play size={14} fill="currentColor" />
              <span>Review Due ({dueCards.length})</span>
            </button>
          ) : (
            filteredCards.length > 0 && (
              <button
                className="btn btn-secondary header-review-btn"
                onClick={onStartReviewAll}
                title="Review All Cards (Custom Study)"
              >
                <Play size={14} fill="currentColor" />
                <span>Review All ({filteredCards.length})</span>
              </button>
            )
          )}
        </div>

        <div className="search-container">
          <div className="search-input-wrapper">
            <Search className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search term, meaning, examples..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="tags-filter-row">
          {allTags.map((tag) => (
            <button
              key={tag}
              className={`tag-filter-badge ${selectedTags.includes(tag) ? 'active' : ''}`}
              onClick={() => toggleTag(tag)}
            >
              <Tag size={10} style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }} />
              {tag}
            </button>
          ))}
        </div>
      )}

      <div className="content-area">
        {filteredCards.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={48} className="empty-state-icon" />
            <h3>No cards found</h3>
            <p>
              {searchQuery || selectedTags.length > 0
                ? 'Try adjusting your search query or tag filters.'
                : 'Start by adding your first flashcard to begin learning.'}
            </p>
            {(searchQuery || selectedTags.length > 0) && (
              <button className="btn btn-secondary" onClick={clearFilters}>
                Clear Filters
              </button>
            )}
            {!searchQuery && selectedTags.length === 0 && (
              <button className="btn btn-primary" onClick={onAddCardClick}>
                <Plus size={16} />
                Add First Card
              </button>
            )}
          </div>
        ) : (
          filteredCards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              stats={cardStats[card.id]}
              onClick={() => onSelectCard(card.id)}
            />
          ))
        )}
      </div>

      <button className="fab" onClick={onAddCardClick} title="Add Card">
        <Plus size={24} />
      </button>
    </>
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

function formatReviewSchedule(stats: ReviewStats | undefined): string {
  if (!stats?.nextDueAt) return 'Review on 0 days';

  const now = new Date();
  const nextDueAt = new Date(stats.nextDueAt);
  const daysUntilReview = Math.max(0, Math.ceil((nextDueAt.getTime() - now.getTime()) / DAY_MS));

  return `Review on ${daysUntilReview} day${daysUntilReview === 1 ? '' : 's'}`;
}

// Inner component to render review schedule for each card item
function CardItem({
  card,
  stats,
  onClick,
}: {
  card: Card;
  stats: ReviewStats | undefined;
  onClick: () => void;
}) {
  const reviewSchedule = formatReviewSchedule(stats);

  return (
    <div className="flashcard-item" onClick={onClick}>
      <div className="card-header-row">
        <div className="card-term-row">
          <span className="card-term">{card.term}</span>
          {card.partOfSpeech && (
            <span className="part-of-speech-badge">{card.partOfSpeech}</span>
          )}
        </div>
      </div>
      <p className="card-meaning-preview">{card.meaning}</p>

      {card.tags.length > 0 && (
        <div className="card-tags-list">
          {card.tags.map((tag) => (
            <span key={tag} className="card-tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      <span className="card-stats-badge">{reviewSchedule}</span>
    </div>
  );
}
