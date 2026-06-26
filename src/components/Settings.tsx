import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Download, Info, Check, AlertTriangle, Database, Sparkles, Globe, Key, Cpu, Sliders, Hash, RefreshCw, Eye, EyeOff, ChevronDown, Search, X } from 'lucide-react';
import { type Card } from '../services/cardRepository';
import { useCsvImportExport } from '../hooks/useCsvImportExport';
import { DEFAULT_CARD_GENERATION_PROMPT, loadAiSettings, saveAiSettings, type AiSettings } from '../services/aiSettings';
import { fetchAiModels } from '../services/aiModels';
import type { CurrentUser } from '../services/auth';
import { getLocalMigrationSummary, uploadLocalBrowserData, type LocalMigrationSummary } from '../services/localDataMigration';

const LANGUAGE_OPTIONS = [
  { value: '中文', label: '中文 (Chinese)' },
  { value: 'English', label: 'English' },
  { value: 'Thai', label: 'ไทย (Thai)' },
  { value: 'Japanese', label: '日本語 (Japanese)' },
  { value: 'Korean', label: '한국어 (Korean)' }
];

interface SettingsProps {
  cards: Card[];
  onImportSuccess: () => void;
  currentUser?: CurrentUser;
  onLogout?: () => Promise<void>;
}

export function Settings({ cards, onImportSuccess, currentUser, onLogout }: SettingsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelRequestRef = useRef(0);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [aiSettings, setAiSettings] = useState<AiSettings>(() => loadAiSettings());
  const [aiModels, setAiModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsMessage, setModelsMessage] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [langSearchQuery, setLangSearchQuery] = useState('');
  const [localSummary, setLocalSummary] = useState<LocalMigrationSummary>({ cardCount: 0, reviewStatsCount: 0 });
  const [migrationMessage, setMigrationMessage] = useState('');
  const [migrationLoading, setMigrationLoading] = useState(false);
  const modelSearchInputRef = useRef<HTMLInputElement>(null);
  const langSearchInputRef = useRef<HTMLInputElement>(null);

  // Click outside to close custom select dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when model dropdown opens
  useEffect(() => {
    if (modelDropdownOpen && modelSearchInputRef.current) {
      modelSearchInputRef.current.focus();
    } else if (!modelDropdownOpen) {
      setModelSearchQuery('');
    }
  }, [modelDropdownOpen]);

  // Focus search input when language dropdown opens
  useEffect(() => {
    if (langDropdownOpen && langSearchInputRef.current) {
      langSearchInputRef.current.focus();
    } else if (!langDropdownOpen) {
      setLangSearchQuery('');
    }
  }, [langDropdownOpen]);

  const languageOptions = useMemo(() => {
    const currentLang = aiSettings.outputLanguage.trim();
    if (!currentLang || LANGUAGE_OPTIONS.some(opt => opt.value === currentLang)) {
      return LANGUAGE_OPTIONS;
    }
    return [
      { value: currentLang, label: `${currentLang} (Custom)` },
      ...LANGUAGE_OPTIONS
    ];
  }, [aiSettings.outputLanguage]);

  const filteredLanguageOptions = useMemo(() => {
    const query = langSearchQuery.trim().toLowerCase();
    if (!query) return languageOptions;
    return languageOptions.filter(opt => opt.label.toLowerCase().includes(query) || opt.value.toLowerCase().includes(query));
  }, [languageOptions, langSearchQuery]);

  const {
    parseAndPreviewCsv,
    previewRows,
    clearPreview,
    confirmImport,
    exportToCsv,
    errorMsg,
    hasErrors,
    totalCount,
    validCount,
  } = useCsvImportExport(onImportSuccess);

  const updateAiSettings = (patch: Partial<AiSettings>) => {
    const next = saveAiSettings(patch);
    setAiSettings(patch.cardGenerationPrompt === undefined ? next : {
      ...next,
      cardGenerationPrompt: patch.cardGenerationPrompt,
    });
  };

  const loadModels = useCallback(async (settings: Pick<AiSettings, 'baseUrl' | 'apiKey'>) => {
    const requestId = modelRequestRef.current + 1;
    modelRequestRef.current = requestId;

    if (!settings.baseUrl.trim() || !settings.apiKey.trim()) {
      setAiModels([]);
      setModelsLoading(false);
      setModelsMessage('');
      return;
    }

    setModelsLoading(true);
    setModelsMessage('Loading models...');

    try {
      const models = await fetchAiModels({ ...loadAiSettings(), baseUrl: settings.baseUrl, apiKey: settings.apiKey });
      if (modelRequestRef.current !== requestId) return;

      const nextModels = Array.isArray(models) ? models : [];
      setAiModels(nextModels);
      setModelsMessage(`Loaded ${nextModels.length} models.`);
    } catch (err) {
      if (modelRequestRef.current !== requestId) return;

      setAiModels([]);
      setModelsMessage(err instanceof Error ? err.message : 'Failed to load models.');
    } finally {
      if (modelRequestRef.current === requestId) {
        setModelsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const settingsForModelLoad = {
      baseUrl: aiSettings.baseUrl,
      apiKey: aiSettings.apiKey,
    };

    const timeoutId = window.setTimeout(() => {
      void loadModels(settingsForModelLoad);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [aiSettings.baseUrl, aiSettings.apiKey, loadModels]);

  const modelOptions = useMemo(() => {
    const currentModel = aiSettings.model.trim();
    if (!currentModel || aiModels.includes(currentModel)) {
      return aiModels.map((model) => ({ label: model, value: model }));
    }

    return [
      { label: `${currentModel} (custom)`, value: currentModel },
      ...aiModels.map((model) => ({ label: model, value: model })),
    ];
  }, [aiModels, aiSettings.model]);

  const filteredModelOptions = useMemo(() => {
    const query = modelSearchQuery.trim().toLowerCase();
    if (!query) return modelOptions;
    return modelOptions.filter(opt => opt.label.toLowerCase().includes(query) || opt.value.toLowerCase().includes(query));
  }, [modelOptions, modelSearchQuery]);

  useEffect(() => {
    void getLocalMigrationSummary()
      .then(setLocalSummary)
      .catch(() => setLocalSummary({ cardCount: 0, reviewStatsCount: 0 }));
  }, []);

  const handleUploadLocalData = async () => {
    setMigrationLoading(true);
    setMigrationMessage('');
    try {
      const result = await uploadLocalBrowserData();
      setMigrationMessage(`Imported ${result.importedCards} cards and ${result.importedReviewStats} review stats.`);
      onImportSuccess();
    } catch (err) {
      setMigrationMessage(err instanceof Error ? err.message : 'Failed to upload local data.');
    } finally {
      setMigrationLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseAndPreviewCsv(text);
    };
    reader.readAsText(file);
    // Reset file input value so same file can be selected again
    e.target.value = '';
  };

  const handleDropzoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleConfirmImport = async () => {
    try {
      const count = await confirmImport();
      setSuccessMsg(`Successfully imported ${count} cards!`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = () => {
    exportToCsv(cards);
  };

  return (
    <>
      <div className="top-header">
        <div className="header-title-row">
          <h1 className="header-title">Settings & Data</h1>
        </div>
      </div>

      <div className="content-area">
        <div className="settings-section">
          <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Account</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {currentUser ? `Signed in as ${currentUser.email}` : 'Signed in'}
          </p>
          {onLogout && (
            <button className="btn btn-secondary" onClick={() => void onLogout()}>
              Sign out
            </button>
          )}
        </div>

        {localSummary.cardCount > 0 && (
          <div className="settings-section">
            <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Migrate local data to account</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              This browser has {localSummary.cardCount} local cards and {localSummary.reviewStatsCount} review stats. Upload them to your signed-in account.
            </p>
            <button className="btn btn-primary" onClick={handleUploadLocalData} disabled={migrationLoading}>
              {migrationLoading ? 'Uploading...' : 'Upload local data'}
            </button>
            {migrationMessage && <div className="settings-info-box">{migrationMessage}</div>}
          </div>
        )}

        {/* local storage warning */}
        <div className="settings-section">
          <h2 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} className="empty-state-icon" />
            Local-First Storage
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            Your flashcard data is stored securely and directly in your browser's local database (IndexedDB). It is offline-first and never leaves your device.
          </p>
          <div className="settings-info-box">
            <Info size={16} style={{ float: 'left', marginRight: '8px', color: 'var(--secondary)' }} />
            <strong>Important:</strong> Clearing your browser data, website storage, or using private browsing mode can delete this database. Please make regular CSV backups to secure your data.
          </div>
        </div>

        {/* AI Generation */}
        <div className="settings-section settings-card-ai">
          <div className="settings-header-row">
            <h2 className="settings-title-h2">
              <Sparkles size={18} className="settings-header-icon" />
              AI Generation
            </h2>
            <div className="switch-container">
              <input
                type="checkbox"
                checked={aiSettings.enabled}
                onChange={(e) => updateAiSettings({ enabled: e.target.checked })}
                aria-label="Enable AI Generation"
                className="switch-inner-checkbox"
              />
              <div className="switch-wrapper">
                <div className="switch-slider" />
              </div>
            </div>
          </div>

          <div className="settings-toggle-row-desc">
            Show the AI button on the card form when a term is entered.
          </div>

          <div className={`settings-collapsible-content ${aiSettings.enabled ? 'expanded' : ''}`}>
            
            {/* Base URL */}
            <div className="settings-form-group">
              <label htmlFor="base-url-input" className="settings-field-label">Base URL</label>
              <div className="settings-input-wrapper">
                <Globe size={16} className="settings-input-icon-left" />
                <input
                  id="base-url-input"
                  className="form-input settings-input-with-icon"
                  type="text"
                  value={aiSettings.baseUrl}
                  onChange={(e) => updateAiSettings({ baseUrl: e.target.value })}
                  aria-label="Base URL"
                />
              </div>
            </div>

            {/* API Key */}
            <div className="settings-form-group">
              <label htmlFor="api-key-input" className="settings-field-label">API Key</label>
              <div className="settings-input-wrapper">
                <Key size={16} className="settings-input-icon-left" />
                <input
                  id="api-key-input"
                  className="form-input settings-input-with-icon settings-input-with-action"
                  type={showApiKey ? 'text' : 'password'}
                  value={aiSettings.apiKey}
                  onChange={(e) => updateAiSettings({ apiKey: e.target.value })}
                  aria-label="API Key"
                  placeholder="sk-..."
                />
                <button
                  type="button"
                  className="settings-input-action-btn"
                  onClick={() => setShowApiKey(!showApiKey)}
                  title={showApiKey ? 'Hide API Key' : 'Show API Key'}
                  aria-label={showApiKey ? 'Hide API Key' : 'Show API Key'}
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Model Picker Card */}
            <div className="settings-sub-card">
              <div className="settings-sub-card-header">
                <span className="settings-sub-card-title">
                  <Cpu size={15} />
                  Model Configuration
                </span>
                <button
                  className="btn btn-secondary settings-refresh-models-btn btn-refresh-models"
                  type="button"
                  onClick={() => void loadModels(aiSettings)}
                  disabled={modelsLoading}
                  aria-label="Refresh Models"
                >
                  <RefreshCw size={13} className={modelsLoading ? 'spin' : ''} />
                  <span>{modelsLoading ? 'Refreshing...' : 'Refresh Models'}</span>
                </button>
              </div>

              {/* Predefined select */}
              <div className="settings-form-group">
                <label htmlFor="model-select" className="settings-field-label-sub">Predefined Model</label>
                
                {/* Visually hidden native select to maintain 100% test compatibility and accessibility */}
                <select
                  id="model-select"
                  className="visually-hidden"
                  value={aiSettings.model}
                  onChange={(e) => updateAiSettings({ model: e.target.value })}
                  aria-label="Model"
                >
                  {modelOptions.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>

                {/* Custom styled select dropdown matching POS style */}
                <div className="custom-select-container" ref={modelDropdownRef}>
                  <div 
                    className={`custom-select-trigger ${modelDropdownOpen ? 'active' : ''}`} 
                    onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setModelDropdownOpen(!modelDropdownOpen);
                      }
                    }}
                  >
                    {aiSettings.model ? (
                      <span className="pos-label-preview">
                        {modelOptions.find((opt) => opt.value === aiSettings.model)?.label || aiSettings.model}
                      </span>
                    ) : (
                      <span className="pos-placeholder">Select Model</span>
                    )}
                    <ChevronDown size={18} className={`select-chevron ${modelDropdownOpen ? 'open' : ''}`} />
                  </div>

                  {modelDropdownOpen && (
                    <div className="custom-select-dropdown">
                      <div className="custom-select-search-wrapper">
                        <Search size={14} className="custom-select-search-icon" />
                        <input
                          ref={modelSearchInputRef}
                          type="text"
                          className="custom-select-search-input"
                          placeholder="Search models..."
                          value={modelSearchQuery}
                          onChange={(e) => setModelSearchQuery(e.target.value)}
                        />
                        {modelSearchQuery && (
                          <button
                            type="button"
                            className="custom-select-clear-btn"
                            onClick={() => setModelSearchQuery('')}
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                      <div className="custom-select-options-list">
                        {filteredModelOptions.map((opt) => (
                          <div
                            key={opt.value}
                            className={`custom-select-option ${aiSettings.model === opt.value ? 'selected' : ''}`}
                            onClick={() => {
                              updateAiSettings({ model: opt.value });
                              setModelDropdownOpen(false);
                            }}
                          >
                            <span className="pos-option-label">{opt.label}</span>
                            {aiSettings.model === opt.value && <Check size={14} className="option-check-icon" />}
                          </div>
                        ))}
                        {filteredModelOptions.length === 0 && (
                          <div className="custom-select-no-results">No models found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Custom input */}
              <div className="settings-form-group" style={{ marginTop: '10px' }}>
                <label htmlFor="custom-model-input" className="settings-field-label-sub">Custom model</label>
                <div className="settings-input-wrapper">
                  <Sliders size={14} className="settings-input-icon-left" />
                  <input
                    id="custom-model-input"
                    className="form-input settings-input-with-icon"
                    type="text"
                    value={aiSettings.model}
                    onChange={(e) => updateAiSettings({ model: e.target.value })}
                    aria-label="Custom model"
                    placeholder="Type a model ID"
                  />
                </div>
              </div>

              {modelsMessage && (
                <div className={`settings-model-status-badge ${modelsMessage.startsWith('Loaded') || modelsMessage.startsWith('Loading') ? 'success' : 'error'}`}>
                  <span className="badge-dot" />
                  <span className="badge-text">{modelsMessage}</span>
                </div>
              )}
            </div>

            {/* Output Language & Example Count stacked vertically */}
            <div className="settings-form-group">
              <label htmlFor="language-input" className="settings-field-label">Output Language</label>
              
              {/* Visually hidden text input to maintain test compatibility (user.clear, user.type) */}
              <input
                id="language-input"
                className="visually-hidden"
                type="text"
                value={aiSettings.outputLanguage}
                onChange={(e) => updateAiSettings({ outputLanguage: e.target.value })}
                aria-label="Output Language"
              />

              {/* Custom styled select dropdown matching POS style */}
              <div className="custom-select-container" ref={langDropdownRef}>
                <div 
                  className={`custom-select-trigger ${langDropdownOpen ? 'active' : ''}`} 
                  onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setLangDropdownOpen(!langDropdownOpen);
                    }
                  }}
                >
                  {aiSettings.outputLanguage ? (
                    <span className="pos-label-preview">
                      {languageOptions.find((opt) => opt.value === aiSettings.outputLanguage)?.label || aiSettings.outputLanguage}
                    </span>
                  ) : (
                    <span className="pos-placeholder">Select Language</span>
                  )}
                  <ChevronDown size={18} className={`select-chevron ${langDropdownOpen ? 'open' : ''}`} />
                </div>

                {langDropdownOpen && (
                  <div className="custom-select-dropdown">
                    <div className="custom-select-search-wrapper">
                      <Search size={14} className="custom-select-search-icon" />
                      <input
                        ref={langSearchInputRef}
                        type="text"
                        className="custom-select-search-input"
                        placeholder="Search languages..."
                        value={langSearchQuery}
                        onChange={(e) => setLangSearchQuery(e.target.value)}
                      />
                      {langSearchQuery && (
                        <button
                          type="button"
                          className="custom-select-clear-btn"
                          onClick={() => setLangSearchQuery('')}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    <div className="custom-select-options-list">
                      {filteredLanguageOptions.map((opt) => (
                        <div
                          key={opt.value}
                          className={`custom-select-option ${aiSettings.outputLanguage === opt.value ? 'selected' : ''}`}
                          onClick={() => {
                            updateAiSettings({ outputLanguage: opt.value });
                            setLangDropdownOpen(false);
                          }}
                        >
                          <span className="pos-option-label">{opt.label}</span>
                          {aiSettings.outputLanguage === opt.value && <Check size={14} className="option-check-icon" />}
                        </div>
                      ))}
                      {filteredLanguageOptions.length === 0 && (
                        <div className="custom-select-no-results">No languages found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="settings-form-group">
              <label htmlFor="example-count-input" className="settings-field-label">Example Count</label>
              <div className="settings-input-wrapper">
                <Hash size={16} className="settings-input-icon-left" />
                <input
                  id="example-count-input"
                  className="form-input settings-input-with-icon"
                  type="number"
                  min={0}
                  max={5}
                  value={aiSettings.exampleCount}
                  onChange={(e) => updateAiSettings({ exampleCount: Number(e.target.value) })}
                  aria-label="Example Count"
                />
              </div>
            </div>

            <div className="settings-form-group">
              <div className="settings-header-row" style={{ marginBottom: '6px' }}>
                <label htmlFor="card-generation-prompt-input" className="settings-field-label">Card generation prompt</label>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => updateAiSettings({ cardGenerationPrompt: DEFAULT_CARD_GENERATION_PROMPT })}
                  aria-label="Reset Prompt"
                >
                  Reset Prompt
                </button>
              </div>
              <textarea
                id="card-generation-prompt-input"
                className="form-input"
                value={aiSettings.cardGenerationPrompt}
                onChange={(e) => updateAiSettings({ cardGenerationPrompt: e.target.value })}
                aria-label="Card generation prompt"
                rows={10}
                spellCheck={false}
                style={{ resize: 'vertical', minHeight: '180px', lineHeight: 1.4 }}
              />
              <div className="settings-toggle-row-desc" style={{ marginTop: '6px' }}>
                Placeholders: {'{term}'}, {'{outputLanguage}'}, {'{exampleCount}'}, {'{examplePhrase}'}.
              </div>
            </div>

            {/* Info notice */}
            <div className="settings-alert-box">
              <Info size={16} className="alert-icon" />
              <div className="alert-text">
                The API key is saved only in this browser on this device. This is intended for personal local use, not shared public deployment.
              </div>
            </div>
          </div>
        </div>

        {/* CSV Import / Export */}
        <div className="settings-section">
          <h2 style={{ fontSize: '16px', fontWeight: 600 }}>CSV Backup</h2>
          
          <div className="detail-actions-row" style={{ marginTop: '5px' }}>
            <button className="btn btn-secondary w-full" onClick={handleExport} disabled={cards.length === 0}>
              <Download size={16} />
              Export CSV ({cards.length} Cards)
            </button>
          </div>

          <div
            className="csv-dropzone"
            onClick={handleDropzoneClick}
            style={{ marginTop: '10px' }}
          >
            <Upload size={24} className="empty-state-icon" />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>Upload CSV Backup</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Headers must contain "term" and "meaning"
            </span>
            <input
              type="file"
              ref={fileInputRef}
              className="csv-file-input"
              accept=".csv"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* Success message banner */}
        {successMsg && (
          <div className="error-banner" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'var(--success)', color: '#a7f3d0' }}>
            <Check size={16} />
            {successMsg}
          </div>
        )}

        {/* Import Preview */}
        {previewRows.length > 0 && (
          <div className="preview-panel">
            <div className="preview-summary-row">
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 600 }}>CSV Import Preview</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Found {totalCount} rows. Ready to import <strong>{validCount}</strong> valid cards.
                </p>
              </div>
              {hasErrors && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--warning)', fontSize: '11px', fontWeight: 500 }}>
                  <AlertTriangle size={12} />
                  <span>{totalCount - validCount} rows have errors</span>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="error-banner">
                <AlertTriangle size={16} />
                {errorMsg}
              </div>
            )}

            <div className="preview-table-container">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Term</th>
                    <th>Meaning</th>
                    <th>POS</th>
                    <th>Tags</th>
                    <th>Examples</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr key={row.index} className={row.isValid ? '' : 'preview-row-invalid'}>
                      <td>{row.index}</td>
                      <td style={{ fontWeight: 500 }}>{row.term || '(Empty)'}</td>
                      <td>{row.meaning || '(Empty)'}</td>
                      <td>{row.partOfSpeech || ''}</td>
                      <td>{row.tags.join(', ')}</td>
                      <td>{row.examples.join(' | ')}</td>
                      <td>
                        {row.isValid ? (
                          <span style={{ color: 'var(--success)', fontWeight: 600 }}>Valid</span>
                        ) : (
                          <span className="preview-error-badge" title={row.errors.join(', ')}>
                            Invalid
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="detail-actions-row" style={{ marginTop: '8px' }}>
              <button
                className="btn btn-primary w-full"
                onClick={handleConfirmImport}
                disabled={validCount === 0}
              >
                Confirm Import ({validCount} Cards)
              </button>
              <button className="btn btn-secondary" onClick={clearPreview}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Global error banner if parsing failed */}
        {!previewRows.length && errorMsg && (
          <div className="error-banner">
            <AlertTriangle size={16} />
            {errorMsg}
          </div>
        )}
      </div>
    </>
  );
}
