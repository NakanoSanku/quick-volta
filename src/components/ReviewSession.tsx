import { RefreshCw, Award, Home, ArrowLeft, BookOpen, FileText, Volume2, Globe, Tag } from 'lucide-react';
import { type Card, type ReviewStats } from '../services/cardRepository';
import { useReviewSession } from '../hooks/useReviewSession';
import { playTermTts } from '../services/tts';

interface ReviewSessionProps {
  cardsToReview: Card[];
  onExit: () => void;
  onStatsSaved?: (stats: ReviewStats) => void;
}

export function ReviewSession({ cardsToReview, onExit, onStatsSaved }: ReviewSessionProps) {
  const {
    sessionCards,
    currentIndex,
    currentCard,
    currentStats,
    reveal,
    setReveal,
    again,
    hard,
    good,
    easy,
    nextIntervals,
    isFinished,
    startSession,
    progress,
  } = useReviewSession(cardsToReview, { onStatsSaved });

  const playTTS = (text: string, tags: string[]) => {
    playTermTts(text, tags);
  };

  if (cardsToReview.length === 0) {
    return (
      <>
        <div className="top-header">
          <div className="header-title-row header-title-row-centered">
            <button className="header-back-btn" onClick={onExit} title="Exit Review">
              <ArrowLeft size={20} />
            </button>
            <h1 className="header-title header-title-centered">
              Review Mode
            </h1>
            <div className="header-spacer" />
          </div>
        </div>
        <div className="content-area">
          <div className="empty-state">
            <Award size={48} className="empty-state-icon" style={{ color: 'var(--primary)' }} />
            <h3>No cards to review</h3>
            <p>You need to create at least one card to start a review session.</p>
            <button className="btn btn-primary" onClick={onExit}>
              Go to Card List
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="top-header">
        <div className="header-title-row header-title-row-centered">
          <button className="header-back-btn" onClick={onExit} title="Exit Review">
            <ArrowLeft size={20} />
          </button>
          <h1 className="header-title header-title-centered">
            Review ({currentIndex + (isFinished ? 0 : 1)}/{sessionCards.length})
          </h1>
          <div className="header-spacer" />
        </div>
        <div className="review-progress-bar">
          <div className="review-progress-fill" style={{ width: `${progress}%` }}></div>
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

        {isFinished ? (
          <div className="session-finished-card" style={{ zIndex: 1, background: '#ffffff', border: '1px solid rgba(16, 185, 129, 0.06)', borderRadius: '24px', boxShadow: '0 10px 30px rgba(16, 185, 129, 0.04)' }}>
            <div className="finished-icon-container" style={{ background: 'rgba(16, 185, 129, 0.05)', color: 'var(--primary)' }}>
              <Award size={40} />
            </div>
            <h2 className="finished-title">Session Complete!</h2>
            <p className="finished-text">
              Excellent job! You have reviewed all <strong>{sessionCards.length}</strong> cards in this session.
            </p>
            <div className="review-actions-panel w-full" style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button className="btn btn-primary w-full" onClick={startSession} style={{ height: '46px', borderRadius: '12px', fontWeight: '600' }}>
                <RefreshCw size={16} />
                Review Again
              </button>
              <button className="btn btn-secondary w-full" onClick={onExit} style={{ height: '46px', borderRadius: '12px', fontWeight: '600', background: 'white', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                <Home size={16} />
                Back to Card List
              </button>
            </div>
          </div>
        ) : (
          currentCard && (
            <div className="review-container" style={{ zIndex: 1 }}>
              <div className="review-card-wrapper" onClick={() => setReveal(!reveal)}>
                <div className={`flip-card-inner ${reveal ? 'revealed' : ''}`}>
                  {/* FRONT SIDE - PROMPT (TERM / PHRASE) */}
                  <div className="flip-card-front">
                    {currentStats && currentStats.reviewCount > 0 && (
                      <span className="review-stats-summary" style={{ position: 'absolute', top: '16px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        Accuracy: {Math.round((currentStats.knownCount / currentStats.reviewCount) * 100)}% ({currentStats.reviewCount} reviews)
                      </span>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px' }}>Term / Phrase</span>
                      <h2 className="review-term" style={{ fontSize: '32px', margin: 0, textShadow: 'none' }}>{currentCard.term}</h2>
                      {currentCard.partOfSpeech && (
                        <span className="detail-pos-badge" style={{ marginTop: '4px' }}>{currentCard.partOfSpeech}</span>
                      )}
                    </div>
                    <button
                      className="tts-btn review-front-tts-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        playTTS(currentCard.term, currentCard.tags);
                      }}
                      title="Speak Term"
                    >
                      <Volume2 size={16} />
                    </button>
                  </div>

                  {/* BACK SIDE - ANSWER (WORD/PHRASE) + DETAILS */}
                  <div className="flip-card-back">
                    <div className="review-back-scroll">
                      {/* Term and Star/Tags Header */}
                      <div className="detail-header" style={{ width: '100%', borderBottom: '1px solid rgba(16, 185, 129, 0.08)', paddingBottom: '16px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h2 className="detail-term" style={{ fontSize: '28px', margin: 0 }}>{currentCard.term}</h2>
                            {currentCard.partOfSpeech && (
                              <span className="detail-pos-badge" style={{ marginTop: 0 }}>{currentCard.partOfSpeech}</span>
                            )}
                          </div>
                          <button
                            className="detail-favorite-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              playTTS(currentCard.term, currentCard.tags);
                            }}
                            title="Speak Term"
                          >
                            <Volume2 size={18} />
                          </button>
                        </div>
                        {currentCard.tags.length > 0 && (
                          <div className="card-tags-list" style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {currentCard.tags.map((tag, i) => (
                              <span key={tag} className="card-tag" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', fontSize: '12px', border: '1px solid rgba(16, 185, 129, 0.08)', color: 'var(--text-secondary)' }}>
                                {(tag.includes('语') || i === 0) ? <Globe size={12} /> : <Tag size={12} />}
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Meaning Hero Box */}
                      <div className="detail-meaning-box review-meaning-box">
                        <span className="detail-meaning-label">Meaning</span>
                        <div className="detail-meaning-text review-meaning-text">
                          {currentCard.meaning}
                        </div>
                      </div>

                      {/* Examples Panel */}
                      {currentCard.examples.length > 0 && (
                        <div className="detail-section-v2" style={{ width: '100%', marginBottom: '16px', textAlign: 'left' }}>
                          <div className="detail-section-title-v2">
                            <BookOpen size={16} style={{ color: 'var(--primary)' }} />
                            <span>Examples</span>
                          </div>
                          <div className="detail-panel-v2">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {currentCard.examples.map((example, i) => (
                                <div key={i} className="example-row">
                                  <span className="example-bullet">&bull;</span>
                                  <span className="example-text">{example}</span>
                                  <button
                                    className="example-tts-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      playTTS(example, currentCard.tags);
                                    }}
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
                      {currentCard.notes && (
                        <div className="detail-section-v2" style={{ width: '100%', marginBottom: '16px', textAlign: 'left' }}>
                          <div className="detail-section-title-v2">
                            <FileText size={16} style={{ color: 'var(--primary)' }} />
                            <span>Notes</span>
                          </div>
                          <div className="detail-panel-v2">
                            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                              {currentCard.notes}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION PANEL */}
              {reveal && (
                <div className="review-actions-panel">
                  <div className="decision-buttons-row">
                    <button className="btn-decision again" onClick={again} title="Failed to recall, review again soon">
                      <span className="btn-decision-label">Again</span>
                      <span className="btn-decision-interval">{nextIntervals.again}d</span>
                    </button>
                    <button className="btn-decision hard" onClick={hard} title="Recalled with serious difficulty">
                      <span className="btn-decision-label">Hard</span>
                      <span className="btn-decision-interval">{nextIntervals.hard}d</span>
                    </button>
                    <button className="btn-decision good" onClick={good} title="Recalled correctly after hesitation">
                      <span className="btn-decision-label">Good</span>
                      <span className="btn-decision-interval">{nextIntervals.good}d</span>
                    </button>
                    <button className="btn-decision easy" onClick={easy} title="Perfect, instant recall">
                      <span className="btn-decision-label">Easy</span>
                      <span className="btn-decision-interval">{nextIntervals.easy}d</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </>
  );
}
