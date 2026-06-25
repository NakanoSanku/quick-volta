# AI Model List Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the AI Settings model field load selectable model IDs from the configured OpenAI-compatible `/models` endpoint while preserving custom model entry.

**Architecture:** Add a focused `aiModels` service for model discovery. Keep persisted settings in `aiSettings`; Settings owns transient model-list UI state, auto-load/debounce behavior, refresh behavior, and custom model entry.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, browser `fetch`, OpenAI-compatible `GET /models`.

---

## File Structure

- Create `src/services/aiModels.ts`: fetch and parse OpenAI-compatible model lists.
- Create `src/test/aiModels.test.ts`: unit tests for model-list requests, parsing, sorting, and readable errors.
- Modify `src/components/Settings.tsx`: replace the plain Model input with a select + Refresh Models button + Custom model input.
- Modify `src/test/aiSettingsUi.test.tsx`: add UI tests for auto-load, refresh, selecting fetched models, custom model entry, current custom model preservation, and load errors.
- Modify `src/App.css`: add small model picker styles.

---

### Task 1: Model Discovery Service

**Files:**
- Create: `src/services/aiModels.ts`
- Test: `src/test/aiModels.test.ts`

- [ ] **Step 1: Write the failing service tests**

Create `src/test/aiModels.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_AI_SETTINGS, type AiSettings } from '../services/aiSettings';
import { AiModelListError, fetchAiModels } from '../services/aiModels';

function settings(patch: Partial<AiSettings> = {}): AiSettings {
  return {
    ...DEFAULT_AI_SETTINGS,
    enabled: true,
    baseUrl: 'http://localhost:11434/v1',
    apiKey: 'test-key',
    model: 'custom-model',
    ...patch,
  };
}

function mockFetchJson(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('fetchAiModels', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls the OpenAI-compatible models endpoint with bearer auth', async () => {
    const fetchMock = mockFetchJson({
      object: 'list',
      data: [{ id: 'z-model' }, { id: 'a-model' }],
    });

    await expect(fetchAiModels(settings())).resolves.toEqual(['a-model', 'z-model']);

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:11434/v1/models', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-key',
      },
    });
  });

  it('removes blank IDs, duplicate IDs, and sorts model IDs', async () => {
    mockFetchJson({
      data: [
        { id: 'gpt-z' },
        { id: '' },
        { id: 'gpt-a' },
        { id: 'gpt-z' },
        { id: 123 },
      ],
    });

    await expect(fetchAiModels(settings())).resolves.toEqual(['gpt-a', 'gpt-z']);
  });

  it('throws a readable error when base URL is missing', async () => {
    await expect(fetchAiModels(settings({ baseUrl: '' }))).rejects.toEqual(
      new AiModelListError('Base URL is required to load models.'),
    );
  });

  it('throws a readable error when API key is missing', async () => {
    await expect(fetchAiModels(settings({ apiKey: '' }))).rejects.toEqual(
      new AiModelListError('API key is required to load models.'),
    );
  });

  it('throws a readable error for provider failures', async () => {
    mockFetchJson({ error: { message: 'bad key' } }, false, 401);

    await expect(fetchAiModels(settings())).rejects.toEqual(
      new AiModelListError('Model list request failed with status 401.'),
    );
  });

  it('throws a readable error for invalid response shape', async () => {
    mockFetchJson({ object: 'list', data: null });

    await expect(fetchAiModels(settings())).rejects.toEqual(
      new AiModelListError('Model list response was invalid.'),
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm.cmd test -- src/test/aiModels.test.ts
```

Expected: FAIL because `src/services/aiModels.ts` does not exist.

- [ ] **Step 3: Implement the model discovery service**

Create `src/services/aiModels.ts`:

```ts
import { loadAiSettings, type AiSettings } from './aiSettings';

interface ModelListResponse {
  data?: Array<{ id?: unknown }>;
}

export class AiModelListError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiModelListError';
  }
}

function requireModelSettings(settings: AiSettings): void {
  if (!settings.baseUrl.trim()) {
    throw new AiModelListError('Base URL is required to load models.');
  }
  if (!settings.apiKey.trim()) {
    throw new AiModelListError('API key is required to load models.');
  }
}

export async function fetchAiModels(settings: AiSettings = loadAiSettings()): Promise<string[]> {
  requireModelSettings(settings);

  const response = await fetch(`${settings.baseUrl}/models`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
    },
  });

  if (!response.ok) {
    throw new AiModelListError(`Model list request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as ModelListResponse;
  if (!Array.isArray(data.data)) {
    throw new AiModelListError('Model list response was invalid.');
  }

  return Array.from(
    new Set(
      data.data
        .map((model) => (typeof model.id === 'string' ? model.id.trim() : ''))
        .filter((id) => id.length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b));
}
```

- [ ] **Step 4: Run service tests to verify they pass**

Run:

```bash
npm.cmd test -- src/test/aiModels.test.ts
```

Expected: PASS for all `fetchAiModels` tests.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/services/aiModels.ts src/test/aiModels.test.ts
git commit -m "feat: add AI model discovery service"
```

---

### Task 2: Settings Model Picker UI

**Files:**
- Modify: `src/components/Settings.tsx`
- Modify: `src/App.css`
- Test: `src/test/aiSettingsUi.test.tsx`

- [ ] **Step 1: Add failing Settings UI tests**

Append these tests to `src/test/aiSettingsUi.test.tsx` and add `waitFor` to the Testing Library import:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
```

Add this mock near the existing imports:

```tsx
import { fetchAiModels } from '../services/aiModels';

vi.mock('../services/aiModels', () => ({
  fetchAiModels: vi.fn(),
}));
```

Append tests inside `describe('AI settings UI', () => { ... })`:

```tsx
  it('auto-loads models when base URL and API key are saved', async () => {
    vi.mocked(fetchAiModels).mockResolvedValue(['gpt-a', 'gpt-b']);
    saveAiSettings({ apiKey: 'saved-key', model: 'gpt-a' });

    render(<Settings cards={[]} onImportSuccess={vi.fn()} />);

    expect(await screen.findByRole('option', { name: 'gpt-a' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'gpt-b' })).toBeInTheDocument();
    expect(screen.getByText('Loaded 2 models.')).toBeInTheDocument();
  });

  it('refreshes models when Refresh Models is clicked', async () => {
    vi.mocked(fetchAiModels)
      .mockResolvedValueOnce(['first-model'])
      .mockResolvedValueOnce(['second-model']);
    saveAiSettings({ apiKey: 'saved-key', model: 'first-model' });

    render(<Settings cards={[]} onImportSuccess={vi.fn()} />);
    expect(await screen.findByRole('option', { name: 'first-model' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Refresh Models' }));

    expect(await screen.findByRole('option', { name: 'second-model' })).toBeInTheDocument();
    expect(fetchAiModels).toHaveBeenCalledTimes(2);
  });

  it('saves a selected fetched model', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchAiModels).mockResolvedValue(['gpt-a', 'gpt-b']);
    saveAiSettings({ apiKey: 'saved-key', model: 'gpt-a' });

    render(<Settings cards={[]} onImportSuccess={vi.fn()} />);
    await screen.findByRole('option', { name: 'gpt-b' });

    await user.selectOptions(screen.getByLabelText('Model'), 'gpt-b');

    expect(loadAiSettings().model).toBe('gpt-b');
  });

  it('saves a custom model typed by the user', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchAiModels).mockResolvedValue(['gpt-a']);
    saveAiSettings({ apiKey: 'saved-key', model: 'gpt-a' });

    render(<Settings cards={[]} onImportSuccess={vi.fn()} />);
    await screen.findByRole('option', { name: 'gpt-a' });

    await user.clear(screen.getByLabelText('Custom model'));
    await user.type(screen.getByLabelText('Custom model'), 'local-custom');

    expect(loadAiSettings().model).toBe('local-custom');
  });

  it('keeps the current custom model visible when it is absent from fetched models', async () => {
    vi.mocked(fetchAiModels).mockResolvedValue(['gpt-a']);
    saveAiSettings({ apiKey: 'saved-key', model: 'local-custom' });

    render(<Settings cards={[]} onImportSuccess={vi.fn()} />);

    expect(await screen.findByRole('option', { name: 'local-custom (custom)' })).toBeInTheDocument();
    expect(screen.getByLabelText('Model')).toHaveValue('local-custom');
  });

  it('shows model load errors while leaving custom model editable', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchAiModels).mockRejectedValue(new Error('Model list request failed with status 401.'));
    saveAiSettings({ apiKey: 'saved-key', model: 'existing-model' });

    render(<Settings cards={[]} onImportSuccess={vi.fn()} />);

    expect(await screen.findByText('Model list request failed with status 401.')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Custom model'));
    await user.type(screen.getByLabelText('Custom model'), 'manual-after-error');

    expect(loadAiSettings().model).toBe('manual-after-error');
  });
```

- [ ] **Step 2: Run the UI tests to verify they fail**

Run:

```bash
npm.cmd test -- src/test/aiSettingsUi.test.tsx
```

Expected: FAIL because Settings has no model picker, no refresh button, and no auto-load behavior.

- [ ] **Step 3: Implement Settings model-list state and loader**

In `src/components/Settings.tsx`, change the React import to include `useCallback` and `useEffect`:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
```

Import the service:

```tsx
import { fetchAiModels } from '../services/aiModels';
```

Add state after `aiSettings`:

```tsx
  const [aiModels, setAiModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsMessage, setModelsMessage] = useState('Enter Base URL and API Key to load models.');
```

Add the loader after `updateAiSettings`:

```tsx
  const loadModels = useCallback(async () => {
    if (!aiSettings.baseUrl.trim() || !aiSettings.apiKey.trim()) {
      setAiModels([]);
      setModelsMessage('Enter Base URL and API Key to load models.');
      return;
    }

    setModelsLoading(true);
    try {
      const models = await fetchAiModels(aiSettings);
      setAiModels(models);
      setModelsMessage(`Loaded ${models.length} models.`);
    } catch (err) {
      setAiModels([]);
      setModelsMessage(err instanceof Error ? err.message : 'Failed to load models.');
    } finally {
      setModelsLoading(false);
    }
  }, [aiSettings]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadModels();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [loadModels]);

  const modelOptions = aiSettings.model && !aiModels.includes(aiSettings.model)
    ? [aiSettings.model, ...aiModels]
    : aiModels;
```

- [ ] **Step 4: Replace the existing Model input JSX**

Replace the current `Model` label/input block in `src/components/Settings.tsx` with:

```tsx
          <div className="settings-model-picker">
            <div className="settings-model-header-row">
              <label className="settings-field-row settings-model-select-row">
                <span>Model</span>
                <select
                  className="form-input"
                  value={aiSettings.model}
                  onChange={(e) => updateAiSettings({ model: e.target.value })}
                  aria-label="Model"
                >
                  {modelOptions.length === 0 && (
                    <option value={aiSettings.model}>{aiSettings.model || 'No models loaded'}</option>
                  )}
                  {modelOptions.map((model) => (
                    <option key={model} value={model}>
                      {model === aiSettings.model && !aiModels.includes(model) ? `${model} (custom)` : model}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="btn btn-secondary settings-refresh-models-btn"
                onClick={() => void loadModels()}
                disabled={modelsLoading}
              >
                {modelsLoading ? 'Loading...' : 'Refresh Models'}
              </button>
            </div>

            <label className="settings-field-row">
              <span>Custom model</span>
              <input
                className="form-input"
                type="text"
                value={aiSettings.model}
                onChange={(e) => updateAiSettings({ model: e.target.value })}
                aria-label="Custom model"
                placeholder="Enter a custom model id"
              />
            </label>

            <span className={modelsMessage.includes('failed') || modelsMessage.includes('required') || modelsMessage.includes('invalid') ? 'ai-feedback ai-feedback-error' : 'ai-feedback'}>
              {modelsMessage}
            </span>
          </div>
```

- [ ] **Step 5: Add model picker styles**

Append to `src/App.css`:

```css
.settings-model-picker {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.settings-model-header-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.settings-model-select-row {
  flex: 1;
}

.settings-refresh-models-btn {
  min-height: 42px;
  white-space: nowrap;
}
```

- [ ] **Step 6: Run UI tests to verify they pass**

Run:

```bash
npm.cmd test -- src/test/aiSettingsUi.test.tsx src/test/aiModels.test.ts
```

Expected: PASS for model service and Settings UI tests.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/components/Settings.tsx src/App.css src/test/aiSettingsUi.test.tsx
git commit -m "feat: add AI model picker settings"
```

---

### Task 3: Full Verification

**Files:**
- Modify only files touched in Tasks 1-2 if verification exposes failures.

- [ ] **Step 1: Run all tests**

Run:

```bash
npm.cmd test
```

Expected: PASS for the full Vitest suite.

- [ ] **Step 2: Run lint**

Run:

```bash
npm.cmd run lint
```

Expected: PASS with no lint errors.

- [ ] **Step 3: Run build**

Run:

```bash
npm.cmd run build
```

Expected: PASS with TypeScript and Vite build success.

- [ ] **Step 4: Browser verification**

Run:

```bash
npm.cmd run dev
```

Open the Vite URL and verify:

1. Settings AI Generation shows a Model select, Refresh Models button, and Custom model input.
2. With Base URL and API Key present, Settings auto-loads models from a mock or compatible `/models` endpoint.
3. Refresh Models reloads the list.
4. Selecting a fetched model updates the saved Model.
5. Typing a Custom model updates the saved Model.
6. If loading models fails, the inline error appears and Custom model remains editable.

- [ ] **Step 5: Commit verification fixes if needed**

If Steps 1-4 require changes:

```bash
git add src/services/aiModels.ts src/test/aiModels.test.ts src/components/Settings.tsx src/test/aiSettingsUi.test.tsx src/App.css
git commit -m "fix: stabilize AI model picker"
```

If no files changed, do not create an empty commit.

---

## Self-Review Notes

- Spec coverage: This plan covers `GET {baseUrl}/models`, bearer auth, parsing `data[].id`, auto-load with debounce, Refresh Models, selectable models, custom model entry, preserving absent saved models, and non-blocking errors.
- Type consistency: `AiModelListError` and `fetchAiModels(settings?: AiSettings)` are defined before Settings imports them.
- Verification coverage: service tests, UI tests, full suite, lint, build, and browser checks are included.
