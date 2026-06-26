import { useState, useEffect } from 'react';
import { ArrowLeft, Globe, Tag, Volume2, BookOpen, FileText, TrendingUp, Calendar, Clock, Edit3, Trash2 } from 'lucide-react';
import { type Card, cardRepository, type ReviewStats } from '../services/cardRepository';
import { playTermTts } from '../services/tts';

interface CardDetailProps {
  cardId: string;
  initialCard?: Card | null;
  initialStats?: ReviewStats | null;
  onBack: () => void;
  onEdit: (card: Card) => void;
  onDelete: (id: string) => Promise<void>;
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

export function CardDetail({ cardId, initialCard, initialStats, onBack, onEdit, onDelete }: CardDetailProps) {
  const [card, setCard] = useState<Card | null>(initialCard ?? null);
  const [stats, setStats] = useState<ReviewStats | null>(initialStats ?? (initialCard ? defaultStatsFor(cardId) : null));
  const [loading, setLoading] = useState(!initialCard);

  useEffect(() => {
    let active = true;

    if (initialCard) {
      setCard(initialCard);
      setStats(initialStats ?? defaultStatsFor(cardId));
      setLoading(false);
      return () => {
        active = false;
      };
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const [cardData, statsData] = await Promise.all([
          cardRepository.getCardById(cardId),
          cardRepository.getStats(cardId),
        ]);
        if (active) {
          setCard(cardData);
          setStats(statsData);
        }
      } catch (err) {
        console.error('Failed to load card details:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [cardId, initialCard, initialStats]);

  const playTTS = () => {
    if (!card?.term) return;
    playTermTts(card.term, card.tags);
  };

  const handleDelete = async () => {
    if (!card) return;
    const confirmDelete = window.confirm('Are you sure you want to delete this flashcard?');
    if (confirmDelete) {
      await onDelete(card.id);
    }
  };

  if (loading) {
    return (
      <>
        <div className="top-header">
          <div className="header-title-row header-title-row-centered">
            <button className="header-back-btn" onClick={onBack} title="Go Back">
              <ArrowLeft size={20} />
            </button>
            <h1 className="header-title header-title-centered">
              Card Details
            </h1>
            <div className="header-spacer" />
          </div>
        </div>
        <div className="content-area text-center" style={{ marginTop: '40px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Loading card details...</p>
        </div>
      </>
    );
  }

  if (!card) {
    return (
      <>
        <div className="top-header">
          <div className="header-title-row header-title-row-centered">
            <button className="header-back-btn" onClick={onBack} title="Go Back">
              <ArrowLeft size={20} />
            </button>
            <h1 className="header-title header-title-centered">
              Not Found
            </h1>
            <div className="header-spacer" />
          </div>
        </div>
        <div className="content-area text-center" style={{ marginTop: '40px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Card could not be found or has been deleted.</p>
        </div>
      </>
    );
  }

  const accuracy = stats && stats.reviewCount > 0
    ? Math.round((stats.knownCount / stats.reviewCount) * 100)
    : 0;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <div className="top-header">
        <div className="header-title-row header-title-row-centered">
          <button className="header-back-btn" onClick={onBack} title="Go Back">
            <ArrowLeft size={20} />
          </button>
          <h1 className="header-title header-title-centered">
            Card Details
          </h1>
          <div className="header-spacer" />
        </div>
      </div>

      <div className="content-area" style={{ position: 'relative' }}>
        {/* Background Leaves decoration */}
        <div className="leaves-bg-decor" style={{ position: 'absolute', top: '-25px', right: '15px', zIndex: 0, opacity: 0.8, pointerEvents: 'none' }}>
          <svg width="70" height="70" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 90C20 90 45 65 55 40C58 30 68 20 78 24C88 28 92 40 84 52C70 74 20 90 20 90Z" fill="#10b981" opacity="0.15"/>
            <path d="M20 90C20 90 55 75 70 55C80 45 84 32 80 24C76 16 64 16 55 24C35 40 20 90 20 90Z" fill="#34d399" opacity="0.2"/>
            <path d="M20 90L62 58" stroke="#059669" strokeWidth="2" strokeLinecap="round" opacity="0.2"/>
          </svg>
        </div>

        <div className="detail-card" style={{ zIndex: 1 }}>
          <div className="detail-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 className="detail-term">{card.term}</h2>
                {card.partOfSpeech && (
                  <span className="detail-pos-badge" style={{ marginTop: 0 }}>{card.partOfSpeech}</span>
                )}
              </div>
              <button className="detail-favorite-btn" onClick={playTTS} title="Speak Term">
                <Volume2 size={18} />
              </button>
            </div>

            {card.tags.length > 0 && (
              <div className="card-tags-list" style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {card.tags.map((tag, i) => (
                  <span key={tag} className="card-tag" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', fontSize: '12px', border: '1px solid rgba(16, 185, 129, 0.08)', color: 'var(--text-secondary)' }}>
                    {i === 0 ? <Globe size={12} /> : <Tag size={12} />}
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Meaning Hero Box */}
            <div className="detail-meaning-box">
              <span className="detail-meaning-label">Meaning</span>
              <div className="detail-meaning-text">
                {card.meaning}
              </div>
            </div>
          </div>

          {/* Examples Panel */}
          {card.examples.length > 0 && (
            <div className="detail-section-v2">
              <div className="detail-section-title-v2">
                <BookOpen size={16} style={{ color: 'var(--primary)' }} />
                <span>Examples</span>
              </div>
              <div className="detail-panel-v2">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {card.examples.map((example, i) => (
                    <div key={i} className="example-row">
                      <span className="example-bullet">&bull;</span>
                      <span className="example-text">{example}</span>
                      <button
                        className="example-tts-btn"
                        onClick={() => playTermTts(example, card.tags)}
                        title="Speak Example"
                        aria-label={`Speak example ${i + 1}`}
                      >
                        <Volume2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Notes Panel */}
          {card.notes && (
            <div className="detail-section-v2">
              <div className="detail-section-title-v2">
                <FileText size={16} style={{ color: 'var(--primary)' }} />
                <span>Notes</span>
              </div>
              <div className="detail-panel-v2">
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {card.notes}
                </div>
              </div>
            </div>
          )}

          {/* Spaced Repetition Stats block */}
          <div className="detail-meta-panel">
            <div className="detail-meta-row-v2">
              <TrendingUp size={16} style={{ color: 'var(--primary)' }} />
              <span>
                Reviewed {stats?.reviewCount || 0} time{stats?.reviewCount !== 1 ? 's' : ''}
                <span style={{ margin: '0 8px', color: 'var(--text-muted)' }}>|</span>
                <strong style={{ color: accuracy >= 70 ? 'var(--success)' : 'var(--warning)', fontWeight: '600' }}>
                  {accuracy}% accuracy
                </strong>
              </span>
            </div>

            <div className="detail-meta-row-v2">
              <Calendar size={16} style={{ color: 'var(--primary)' }} />
              <span>Last reviewed: {stats?.lastReviewedAt ? formatDate(stats.lastReviewedAt) : 'Never reviewed'}</span>
            </div>

            <div className="detail-meta-row-v2">
              <Clock size={16} style={{ color: 'var(--primary)' }} />
              <span>Created: {formatDate(card.createdAt)}</span>
            </div>
          </div>

          {/* Side-by-side action buttons */}
          <div className="detail-actions-row">
            <button className="btn btn-edit" onClick={() => onEdit(card)}>
              <Edit3 size={16} />
              Edit
            </button>
            <button className="btn btn-delete" onClick={handleDelete}>
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
