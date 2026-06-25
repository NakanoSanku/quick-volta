import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Download, Info, Check, AlertTriangle, Database, Sparkles } from 'lucide-react';
import { type Card } from '../services/cardRepository';
import { useCsvImportExport } from '../hooks/useCsvImportExport';
import { loadAiSettings, saveAiSettings, type AiSettings } from '../services/aiSettings';
import { fetchAiModels } from '../services/aiModels';

interface SettingsProps {
  cards: Card[];
  onImportSuccess: () => void;
}

export function Settings({ cards, onImportSuccess }: SettingsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelRequestRef = useRef(0);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [aiSettings, setAiSettings] = useState<AiSettings>(() => loadAiSettings());
  const [aiModels, setAiModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsMessage, setModelsMessage] = useState('');

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
    setAiSettings(next);
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
        <div className="settings-section">
          <h2 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} className="empty-state-icon" />
            AI Generation
          </h2>

          <label className="settings-toggle-row">
            <span>
              <strong>Enable AI Generation</strong>
              <small>Show the AI button on the card form when a term is entered.</small>
            </span>
            <input
              type="checkbox"
              checked={aiSettings.enabled}
              onChange={(e) => updateAiSettings({ enabled: e.target.checked })}
              aria-label="Enable AI Generation"
            />
          </label>

          <label className="settings-field-row">
            <span>Base URL</span>
            <input
              className="form-input"
              type="text"
              value={aiSettings.baseUrl}
              onChange={(e) => updateAiSettings({ baseUrl: e.target.value })}
              aria-label="Base URL"
            />
          </label>

          <label className="settings-field-row">
            <span>API Key</span>
            <input
              className="form-input"
              type="password"
              value={aiSettings.apiKey}
              onChange={(e) => updateAiSettings({ apiKey: e.target.value })}
              aria-label="API Key"
              placeholder="sk-..."
            />
          </label>

          <div className="settings-model-picker">
            <div className="settings-model-header-row">
              <span>Model</span>
              <button
                className="btn btn-secondary settings-refresh-models-btn"
                type="button"
                onClick={() => void loadModels(aiSettings)}
                disabled={modelsLoading}
              >
                Refresh Models
              </button>
            </div>
            <div className="settings-model-select-row">
              <select
                className="form-input"
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
            </div>
            <label className="settings-field-row">
              <span>Custom model</span>
              <input
                className="form-input"
                type="text"
                value={aiSettings.model}
                onChange={(e) => updateAiSettings({ model: e.target.value })}
                aria-label="Custom model"
                placeholder="Type a model ID"
              />
            </label>
            {modelsMessage && (
              <div className={modelsMessage.startsWith('Loaded') || modelsMessage.startsWith('Loading') ? 'settings-model-status' : 'settings-model-error'}>
                {modelsMessage}
              </div>
            )}
          </div>

          <label className="settings-field-row">
            <span>Output Language</span>
            <input
              className="form-input"
              type="text"
              value={aiSettings.outputLanguage}
              onChange={(e) => updateAiSettings({ outputLanguage: e.target.value })}
              aria-label="Output Language"
            />
          </label>

          <label className="settings-field-row">
            <span>Example Count</span>
            <input
              className="form-input"
              type="number"
              min={0}
              max={5}
              value={aiSettings.exampleCount}
              onChange={(e) => updateAiSettings({ exampleCount: Number(e.target.value) })}
              aria-label="Example Count"
            />
          </label>

          <div className="settings-info-box">
            <Info size={16} style={{ float: 'left', marginRight: '8px', color: 'var(--secondary)' }} />
            The API key is saved only in this browser on this device. This is intended for personal local use, not shared public deployment.
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
