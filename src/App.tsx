import { useState } from 'react';
import { Layers, Settings as SettingsIcon } from 'lucide-react';
import { useCards } from './hooks/useCards';
import { CardList } from './components/CardList';
import { CardForm } from './components/CardForm';
import { CardDetail } from './components/CardDetail';
import { ReviewSession } from './components/ReviewSession';
import { Settings } from './components/Settings';
import { type Card } from './services/cardRepository';
import type { PartOfSpeech } from './services/partOfSpeech';
import { AuthGate } from './components/AuthGate';
import type { CurrentUser } from './services/auth';
import './App.css';

type Tab = 'cards' | 'review' | 'settings';
type SubScreen = 'list' | 'detail' | 'form';

function AuthenticatedApp({ user }: { user: CurrentUser }) {
  void user;
  const {
    cards,
    filteredCards,
    dueCards,
    cardStats,
    allTags,
    selectedTags,
    searchQuery,
    setSearchQuery,
    toggleTag,
    clearFilters,
    addCard,
    updateCard,
    deleteCard,
    refreshCards,
  } = useCards();

  const [activeTab, setActiveTab] = useState<Tab>('cards');
  const [subScreen, setSubScreen] = useState<SubScreen>('list');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  
  // Custom set of cards for the review session
  const [reviewCards, setReviewCards] = useState<Card[]>([]);

  // Navigation handlers
  const handleSelectCard = (id: string) => {
    setSelectedCardId(id);
    setSubScreen('detail');
  };

  const handleAddCardClick = () => {
    setEditingCard(null);
    setSubScreen('form');
  };

  const handleEditCardClick = (card: Card) => {
    setEditingCard(card);
    setSubScreen('form');
  };

  const handleFormCancel = () => {
    setSubScreen(editingCard ? 'detail' : 'list');
    setEditingCard(null);
  };

  const handleSaveCard = async (cardData: {
    term: string;
    meaning: string;
    partOfSpeech?: PartOfSpeech;
    examples: string[];
    notes: string;
    tags: string[];
    source?: string;
  }) => {
    if (editingCard) {
      await updateCard(editingCard.id, cardData);
    } else {
      await addCard(cardData);
    }
    setSubScreen('list');
    setEditingCard(null);
  };

  const handleDeleteCard = async (id: string) => {
    await deleteCard(id);
    setSubScreen('list');
    setSelectedCardId(null);
  };


  const handleStartReviewDue = () => {
    setReviewCards(dueCards);
    setActiveTab('review');
  };

  const handleStartReviewAll = () => {
    setReviewCards(filteredCards);
    setActiveTab('review');
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'cards') {
      setSubScreen('list');
      setSelectedCardId(null);
    } else if (tab === 'review') {
      // Default to reviewing all active cards
      setReviewCards(cards);
    }
  };

  // Render the current view
  const renderContent = () => {
    if (activeTab === 'review') {
      return (
        <ReviewSession
          cardsToReview={reviewCards}
          onExit={() => handleTabChange('cards')}
        />
      );
    }

    if (activeTab === 'settings') {
      return (
        <Settings
          cards={cards}
          onImportSuccess={refreshCards}
        />
      );
    }

    // Tab is 'cards'
    switch (subScreen) {
      case 'detail':
        return selectedCardId ? (
          <CardDetail
            cardId={selectedCardId}
            onBack={() => setSubScreen('list')}
            onEdit={handleEditCardClick}
            onDelete={handleDeleteCard}
          />
        ) : null;

      case 'form':
        return (
          <CardForm
            card={editingCard}
            existingTags={allTags}
            onSave={handleSaveCard}
            onCancel={handleFormCancel}
          />
        );

      case 'list':
      default:
        return (
          <CardList
            filteredCards={filteredCards}
            dueCards={dueCards}
            cardStats={cardStats}
            allTags={allTags}
            selectedTags={selectedTags}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            toggleTag={toggleTag}
            clearFilters={clearFilters}
            onSelectCard={handleSelectCard}
            onAddCardClick={handleAddCardClick}
            onStartReviewDue={handleStartReviewDue}
            onStartReviewAll={handleStartReviewAll}
          />
        );
    }
  };

  const showNav = activeTab !== 'review' && subScreen !== 'form';
  const isCardsActive = activeTab === 'cards';
  const isSettingsActive = activeTab === 'settings';

  return (
    <div className="app-container">
      {renderContent()}

      {/* Navigation bar is hidden during an active review session or during form editing to allow full focus */}
      {showNav && (
        <nav className="bottom-nav">
          <button
            className={`nav-item ${isCardsActive ? 'active' : ''}`}
            onClick={() => handleTabChange('cards')}
          >
            <Layers size={20} />
            <span>Cards</span>
          </button>
          <button
            className={`nav-item ${isSettingsActive ? 'active' : ''}`}
            onClick={() => handleTabChange('settings')}
          >
            <SettingsIcon size={20} />
            <span>Settings</span>
          </button>
        </nav>
      )}
    </div>
  );
}

export default function App() {
  return <AuthGate>{({ user }) => <AuthenticatedApp user={user} />}</AuthGate>;
}

