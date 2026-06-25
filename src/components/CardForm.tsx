import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Trash2, Plus, Save, X, Search, Check, ChevronDown, Sparkles } from 'lucide-react';
import { type Card } from '../services/cardRepository';
import { generateCardInfo } from '../services/aiCardGenerator';
import { PART_OF_SPEECH_OPTIONS, normalizePartOfSpeech, type PartOfSpeech } from '../services/partOfSpeech';

const PART_OF_SPEECH_GROUPS = [
  {
    title: 'Common',
    values: ['n.', 'v.', 'adj.', 'adv.', 'pron.'] as const,
  },
  {
    title: 'Grammar Structure',
    values: ['prep.', 'conj.', 'det.', 'art.'] as const,
  },
  {
    title: 'Verbs & Numbers',
    values: ['aux.', 'modal.', 'num.', 'interj.'] as const,
  },
  {
    title: 'Word Parts & Idioms',
    values: ['abbr.', 'phr.', 'idiom.', 'prefix.', 'suffix.'] as const,
  },
];


interface CardFormProps {
  card?: Card | null; // If provided, we are editing
  existingTags: string[];
  onSave: (cardData: {
    term: string;
    meaning: string;
    partOfSpeech?: PartOfSpeech;
    examples: string[];
    notes: string;
    tags: string[];
    source?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export function CardForm({ card, existingTags, onSave, onCancel }: CardFormProps) {
  const [term, setTerm] = useState('');
  const [meaning, setMeaning] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState<PartOfSpeech | ''>('');
  const [examples, setExamples] = useState<string[]>(['']);
  const [notes, setNotes] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [source, setSource] = useState('');
  const [errors, setErrors] = useState<{ term?: string; meaning?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationSuccess, setGenerationSuccess] = useState<string | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Populate form if editing
  useEffect(() => {
    if (card) {
      setTerm(card.term);
      setMeaning(card.meaning);
      setPartOfSpeech(card.partOfSpeech || '');
      setExamples(card.examples.length > 0 ? card.examples : ['']);
      setNotes(card.notes);
      setSelectedTags(card.tags);
      setSource(card.source || '');
    } else {
      setTerm('');
      setMeaning('');
      setPartOfSpeech('');
      setExamples(['']);
      setNotes('');
      setSelectedTags([]);
      setSource('');
    }
    setGenerationError(null);
    setGenerationSuccess(null);
  }, [card]);

  const handleExampleChange = (index: number, value: string) => {
    const updated = [...examples];
    updated[index] = value;
    setExamples(updated);
  };

  const addExampleField = () => {
    setExamples([...examples, '']);
  };

  const removeExampleField = (index: number) => {
    const updated = examples.filter((_, i) => i !== index);
    setExamples(updated.length > 0 ? updated : ['']);
  };

  const validate = () => {
    const tempErrors: { term?: string; meaning?: string } = {};
    if (!term.trim()) {
      tempErrors.term = 'Term is required.';
    }
    if (!meaning.trim()) {
      tempErrors.meaning = 'Meaning is required.';
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleAddNewTag = () => {
    const trimmed = newTagInput.trim().toLowerCase();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags([...selectedTags, trimmed]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter((tag) => tag !== tagToRemove));
  };

  const handleToggleExistingTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      handleRemoveTag(tag);
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleNewTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddNewTag();
    }
  };

  const areExamplesBlank = (values: string[]) => values.every((value) => value.trim().length === 0);

  const handleAiGenerate = async () => {
    const trimmedTerm = term.trim();
    setGenerationError(null);
    setGenerationSuccess(null);

    if (!trimmedTerm) {
      setErrors((current) => ({ ...current, term: 'Term is required.' }));
      return;
    }

    setIsGenerating(true);
    try {
      const generated = await generateCardInfo(trimmedTerm);

      if (!meaning.trim()) {
        setMeaning(generated.meaning);
        if (errors.meaning) {
          setErrors((current) => ({ ...current, meaning: undefined }));
        }
      }

      if (!partOfSpeech && generated.partOfSpeech) {
        setPartOfSpeech(generated.partOfSpeech);
      }

      if (areExamplesBlank(examples) && generated.examples.length > 0) {
        setExamples(generated.examples);
      }

      if (!notes.trim() && generated.notes) {
        setNotes(generated.notes);
      }

      if (selectedTags.length === 0 && generated.tags.length > 0) {
        setSelectedTags(generated.tags);
      }

      setGenerationSuccess('AI generated card details. Review before saving.');
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'AI generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      // Process examples: filter out empty entries
      const cleanedExamples = examples
        .map((ex) => ex.trim())
        .filter((ex) => ex.length > 0);

      await onSave({
        term: term.trim(),
        meaning: meaning.trim(),
        partOfSpeech: normalizePartOfSpeech(partOfSpeech),
        examples: cleanedExamples,
        notes: notes.trim(),
        tags: selectedTags,
        source: source.trim() || undefined,
      });
    } catch (err) {
      console.error('Failed to save card:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedOption = PART_OF_SPEECH_OPTIONS.find((opt) => opt.value === partOfSpeech);

  const filteredGroups = PART_OF_SPEECH_GROUPS.map((group) => {
    const matched = PART_OF_SPEECH_OPTIONS.filter(
      (opt) =>
        (group.values as readonly string[]).includes(opt.value) &&
        (opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          opt.value.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    return { ...group, options: matched };
  }).filter((group) => group.options.length > 0);

  const showNoPos =
    !searchQuery ||
    'no part of speech'.includes(searchQuery.toLowerCase()) ||
    'none'.includes(searchQuery.toLowerCase());

  return (
    <>
      <div className="top-header">
        <div className="header-title-row">
          <button className="header-action-btn" onClick={onCancel} title="Go Back">
            <ChevronLeft size={20} />
          </button>
          <h1 className="header-title" style={{ marginRight: 'auto', marginLeft: '12px' }}>
            {card ? 'Edit Card' : 'Add Card'}
          </h1>
        </div>
      </div>

      <div className="content-area">
        <form onSubmit={handleSubmit} className="form-container">
          <div className="form-group">
            <label className="form-label">Term / Phrase *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. สวัสดี (sawatdi) or Hello"
              value={term}
              onChange={(e) => {
                setTerm(e.target.value);
                if (errors.term) setErrors({ ...errors, term: undefined });
              }}
            />
            {errors.term && <span style={{ color: 'var(--danger)', fontSize: '12px' }}>{errors.term}</span>}
            {term.trim() && (
              <div className="ai-generate-panel">
                <button
                  type="button"
                  className="btn btn-secondary ai-generate-btn"
                  onClick={handleAiGenerate}
                  disabled={isGenerating}
                  aria-label="AI Generate"
                >
                  <Sparkles size={16} />
                  {isGenerating ? 'Generating...' : 'AI Generate'}
                </button>
                {generationError && <span className="ai-feedback ai-feedback-error">{generationError}</span>}
                {generationSuccess && <span className="ai-feedback ai-feedback-success">{generationSuccess}</span>}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Meaning *</label>
            <textarea
              className="form-input form-textarea"
              placeholder="Enter the translation, meaning, or explanation"
              value={meaning}
              onChange={(e) => {
                setMeaning(e.target.value);
                if (errors.meaning) setErrors({ ...errors, meaning: undefined });
              }}
            />
            {errors.meaning && <span style={{ color: 'var(--danger)', fontSize: '12px' }}>{errors.meaning}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="part-of-speech-select">Part of Speech</label>
            
            {/* Visually hidden native select to maintain 100% test compatibility and accessibility */}
            <select
              id="part-of-speech-select"
              className="visually-hidden"
              value={partOfSpeech}
              onChange={(e) => setPartOfSpeech(normalizePartOfSpeech(e.target.value) || '')}
            >
              <option value="">No part of speech</option>
              {PART_OF_SPEECH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.value} — {option.label}
                </option>
              ))}
            </select>

            {/* Custom styled select dropdown */}
            <div className="custom-select-container" ref={dropdownRef}>
              <div 
                className={`custom-select-trigger ${isOpen ? 'active' : ''}`} 
                onClick={() => setIsOpen(!isOpen)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsOpen(!isOpen);
                  }
                }}
              >
                {selectedOption ? (
                  <div className="selected-value-container">
                    <span className="pos-badge-preview">{selectedOption.value}</span>
                    <span className="pos-label-preview">{selectedOption.label}</span>
                  </div>
                ) : (
                  <span className="pos-placeholder">No part of speech</span>
                )}
                <ChevronDown size={18} className={`select-chevron ${isOpen ? 'open' : ''}`} />
              </div>

              {isOpen && (
                <div className="custom-select-dropdown">
                  <div className="custom-select-search-wrapper">
                    <Search size={14} className="custom-select-search-icon" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      className="custom-select-search-input"
                      placeholder="Search part of speech..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className="custom-select-clear-btn"
                        onClick={() => setSearchQuery('')}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <div className="custom-select-options-list">
                    {showNoPos && (
                      <div
                        className={`custom-select-option ${partOfSpeech === '' ? 'selected' : ''}`}
                        onClick={() => {
                          setPartOfSpeech('');
                          setIsOpen(false);
                          setSearchQuery('');
                        }}
                      >
                        <span className="no-pos-text">No part of speech</span>
                        {partOfSpeech === '' && <Check size={14} className="option-check-icon" />}
                      </div>
                    )}

                    {filteredGroups.map((group) => (
                      <div key={group.title} className="custom-select-group">
                        <div className="custom-select-group-title">{group.title}</div>
                        {group.options.map((opt) => (
                          <div
                            key={opt.value}
                            className={`custom-select-option ${partOfSpeech === opt.value ? 'selected' : ''}`}
                            onClick={() => {
                              setPartOfSpeech(opt.value);
                              setIsOpen(false);
                              setSearchQuery('');
                            }}
                          >
                            <div className="option-content">
                              <span className="pos-option-badge">{opt.value}</span>
                              <span className="pos-option-label">{opt.label}</span>
                            </div>
                            {partOfSpeech === opt.value && <Check size={14} className="option-check-icon" />}
                          </div>
                        ))}
                      </div>
                    ))}

                    {filteredGroups.length === 0 && !showNoPos && (
                      <div className="custom-select-no-results">No results found</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Example Sentences</label>
            {examples.map((example, index) => (
              <div key={index} className="repeatable-item-row">
                <textarea
                  className="form-input form-textarea"
                  style={{ minHeight: '60px', flex: 1 }}
                  placeholder={`Example sentence #${index + 1}`}
                  value={example}
                  onChange={(e) => handleExampleChange(index, e.target.value)}
                />
                <button
                  type="button"
                  className="header-action-btn"
                  style={{ borderColor: 'rgba(244, 63, 94, 0.2)', color: 'var(--danger)' }}
                  onClick={() => removeExampleField(index)}
                  title="Remove example"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button type="button" className="repeatable-add-btn" onClick={addExampleField}>
              <Plus size={14} />
              Add Example Sentence
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              className="form-input form-textarea"
              placeholder="Pronunciation, usage rules, grammar notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tags</label>
            <div className="form-tags-container">
              {/* Selected Tags list */}
              <div className="form-selected-tags">
                {selectedTags.length === 0 ? (
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No tags selected</span>
                ) : (
                  selectedTags.map((tag) => (
                    <span key={tag} className="form-tag-badge">
                      <span>{tag}</span>
                      <button
                        type="button"
                        className="form-tag-remove-btn"
                        onClick={() => handleRemoveTag(tag)}
                        title="Remove tag"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Add New Tag row */}
              <div className="form-tag-input-row">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Create new tag..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={handleNewTagKeyDown}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0 16px', height: '42px', borderRadius: '8px' }}
                  onClick={handleAddNewTag}
                  title="Add tag"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Existing Tags suggestion list */}
              {existingTags.length > 0 && (
                <div className="form-existing-tags-section">
                  <span className="form-existing-tags-title">Choose from existing tags:</span>
                  <div className="form-existing-tags-list">
                    {existingTags.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          className={`form-existing-tag-badge ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleToggleExistingTag(tag)}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Source (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Textbook, Podcast Chapter 1"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            style={{ marginTop: '10px', height: '48px' }}
            disabled={isSubmitting}
          >
            <Save size={18} />
            {isSubmitting ? 'Saving...' : 'Save Card'}
          </button>
        </form>
      </div>
    </>
  );
}
