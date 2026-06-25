# AI Card Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add AI-assisted flashcard field generation from a required `Term / Phrase`, with configurable OpenAI-compatible API settings and non-overwriting form application.

**Architecture:** Keep AI settings and API calls in focused service modules under `src/services/`. `Settings` edits persisted AI configuration, while `CardForm` only validates the term, calls the generator, and applies returned values to empty fields. Tests mock service boundaries so UI behavior and API request/parse behavior are independently verified.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, browser `localStorage`, browser `fetch`, OpenAI-compatible `/chat/completions` HTTP API.

---

## File Structure

- Create `src/services/aiSettings.ts`: AI settings type, defaults, load/save/reset helpers, and example count clamping.
- Create `src/services/aiCardGenerator.ts`: OpenAI-compatible request builder, response parser, setting validation, generated card type, and part-of-speech normalization.
- Create `src/test/aiSettings.test.ts`: settings defaults, persistence, trimming, and clamping tests.
- Create `src/test/aiCardGenerator.test.ts`: request payload, parsing, validation, provider failure, and invalid JSON tests.
- Create `src/test/aiCardForm.test.tsx`: button visibility, successful generation, non-overwrite behavior, error display, and save validation tests.
- Create `src/test/aiSettingsUi.test.tsx`: Settings AI section rendering and persistence tests.
- Modify `src/components/Settings.tsx`: render and persist `AI Generation` settings.
- Modify `src/components/CardForm.tsx`: add inline AI button and apply generated values only to blank fields.
- Modify `src/App.css`: style AI settings controls, generate button, and feedback text.

---

### Task 1: AI Settings Service

**Files:**
- Create: `src/services/aiSettings.ts`
- Test: `src/test/aiSettings.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/test/aiSettings.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import {
  AI_SETTINGS_STORAGE_KEY,
  DEFAULT_AI_SETTINGS,
  loadAiSettings,
  resetAiSettings,
  saveAiSettings,
} from '../services/aiSettings';

describe('aiSettings', () => {
  beforeEach(() => localStorage.clear());

  it('loads default settings when local storage is empty', () => {
    expect(loadAiSettings()).toEqual(DEFAULT_AI_SETTINGS);
  });

  it('persists edited settings to local storage', () => {
    saveAiSettings({
      enabled: true,
      baseUrl: 'http://localhost:11434/v1',
      apiKey: 'test-key',
      model: 'local-model',
      outputLanguage: 'English',
      exampleCount: 3,
    });

    expect(loadAiSettings()).toEqual({
      enabled: true,
      baseUrl: 'http://localhost:11434/v1',
      apiKey: 'test-key',
      model: 'local-model',
      outputLanguage: 'English',
      exampleCount: 3,
    });
  });

  it('clamps example count between 0 and 5', () => {
    saveAiSettings({ exampleCount: 99 });
    expect(loadAiSettings().exampleCount).toBe(5);
    saveAiSettings({ exampleCount: -4 });
    expect(loadAiSettings().exampleCount).toBe(0);
  });

  it('trims base URL trailing slashes and text values', () => {
    saveAiSettings({
      baseUrl: ' https://example.test/v1/// ',
      apiKey: '  key  ',
      model: '  model-a  ',
      outputLanguage: '  中文  ',
    });

    expect(loadAiSettings()).toEqual(expect.objectContaining({
      baseUrl: 'https://example.test/v1',
      apiKey: 'key',
      model: 'model-a',
      outputLanguage: '中文',
    }));
  });

  it('resets persisted settings', () => {
    saveAiSettings({ enabled: true, apiKey: 'test-key' });
    resetAiSettings();
    expect(localStorage.getItem(AI_SETTINGS_STORAGE_KEY)).toBeNull();
    expect(loadAiSettings()).toEqual(DEFAULT_AI_SETTINGS);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm test -- src/test/aiSettings.test.ts
```

Expected: FAIL because `src/services/aiSettings.ts` does not exist.

- [ ] **Step 3: Implement the settings service**

Create `src/services/aiSettings.ts`:

```ts
export const AI_SETTINGS_STORAGE_KEY = 'quick-volta-ai-settings';

export interface AiSettings {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
  outputLanguage: string;
  exampleCount: number;
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: false,
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4.1-mini',
  outputLanguage: '中文',
  exampleCount: 1,
};

function clampExampleCount(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_AI_SETTINGS.exampleCount;
  return Math.min(5, Math.max(0, Math.trunc(parsed)));
}

function cleanBaseUrl(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim() : DEFAULT_AI_SETTINGS.baseUrl;
  return raw.replace(/\/+$/, '') || DEFAULT_AI_SETTINGS.baseUrl;
}

function cleanText(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

export function normalizeAiSettings(settings: Partial<AiSettings>): AiSettings {
  return {
    enabled: Boolean(settings.enabled),
    baseUrl: cleanBaseUrl(settings.baseUrl),
    apiKey: cleanText(settings.apiKey, DEFAULT_AI_SETTINGS.apiKey),
    model: cleanText(settings.model, DEFAULT_AI_SETTINGS.model) || DEFAULT_AI_SETTINGS.model,
    outputLanguage:
      cleanText(settings.outputLanguage, DEFAULT_AI_SETTINGS.outputLanguage) ||
      DEFAULT_AI_SETTINGS.outputLanguage,
    exampleCount: clampExampleCount(settings.exampleCount),
  };
}

export function loadAiSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(AI_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    return normalizeAiSettings({ ...DEFAULT_AI_SETTINGS, ...(JSON.parse(raw) as Partial<AiSettings>) });
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export function saveAiSettings(settings: Partial<AiSettings>): AiSettings {
  const next = normalizeAiSettings({ ...loadAiSettings(), ...settings });
  localStorage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function resetAiSettings(): void {
  localStorage.removeItem(AI_SETTINGS_STORAGE_KEY);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```bash
npm test -- src/test/aiSettings.test.ts
```

Expected: PASS for all `aiSettings` tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/aiSettings.ts src/test/aiSettings.test.ts
git commit -m "feat: add AI settings persistence"
```

---

### Task 2: AI Card Generator Service

**Files:**
- Create: `src/services/aiCardGenerator.ts`
- Test: `src/test/aiCardGenerator.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/test/aiCardGenerator.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveAiSettings } from '../services/aiSettings';
import { generateCardInfo, AiGenerationError } from '../services/aiCardGenerator';

function mockFetchJson(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('aiCardGenerator', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('rejects when AI generation is disabled', async () => {
    await expect(generateCardInfo('hello')).rejects.toEqual(
      new AiGenerationError('AI generation is disabled. Enable it in Settings first.'),
    );
  });

  it('rejects when API key is missing', async () => {
    saveAiSettings({ enabled: true, apiKey: '', model: 'gpt-4.1-mini' });
    await expect(generateCardInfo('hello')).rejects.toEqual(
      new AiGenerationError('API key is required. Add it in Settings first.'),
    );
  });

  it('sends an OpenAI-compatible chat completions request', async () => {
    saveAiSettings({
      enabled: true,
      baseUrl: 'http://localhost:11434/v1',
      apiKey: 'secret-key',
      model: 'test-model',
      outputLanguage: 'English',
      exampleCount: 2,
    });
    const fetchMock = mockFetchJson({
      choices: [{
        message: { content: JSON.stringify({
          meaning: 'to invent a story or excuse',
          partOfSpeech: 'phr.',
          examples: ['I made up a story.', 'She made up an excuse.'],
          notes: 'Common phrasal verb.',
          tags: ['phrasal verb'],
        }) },
      }],
    });

    const result = await generateCardInfo('make up');

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:11434/v1/chat/completions', expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer secret-key',
      },
    }));
    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(requestBody).toEqual(expect.objectContaining({
      model: 'test-model',
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }));
    expect(JSON.stringify(requestBody.messages)).toContain('make up');
    expect(JSON.stringify(requestBody.messages)).toContain('English');
    expect(JSON.stringify(requestBody.messages)).toContain('2 example sentence');
    expect(result).toEqual({
      meaning: 'to invent a story or excuse',
      partOfSpeech: 'phr.',
      examples: ['I made up a story.', 'She made up an excuse.'],
      notes: 'Common phrasal verb.',
      tags: ['phrasal verb'],
    });
  });

  it('normalizes invalid optional values to safe values', async () => {
    saveAiSettings({ enabled: true, apiKey: 'key' });
    mockFetchJson({ choices: [{ message: { content: JSON.stringify({
      meaning: 'a greeting',
      partOfSpeech: 'unknown-pos',
      examples: ['Hello there.', 42, ''],
      notes: 123,
      tags: ['greeting', '', 99],
    }) } }] });

    await expect(generateCardInfo('hello')).resolves.toEqual({
      meaning: 'a greeting',
      partOfSpeech: undefined,
      examples: ['Hello there.'],
      notes: '',
      tags: ['greeting'],
    });
  });

  it('throws a readable error for provider failures', async () => {
    saveAiSettings({ enabled: true, apiKey: 'key' });
    mockFetchJson({ error: { message: 'bad key' } }, false, 401);
    await expect(generateCardInfo('hello')).rejects.toEqual(
      new AiGenerationError('AI request failed with status 401.'),
    );
  });

  it('throws a readable error for invalid JSON content', async () => {
    saveAiSettings({ enabled: true, apiKey: 'key' });
    mockFetchJson({ choices: [{ message: { content: 'not-json' } }] });
    await expect(generateCardInfo('hello')).rejects.toEqual(
      new AiGenerationError('AI response was not valid JSON.'),
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test -- src/test/aiCardGenerator.test.ts
```

Expected: FAIL because `src/services/aiCardGenerator.ts` does not exist.

- [ ] **Step 3: Implement the generator service**

Create `src/services/aiCardGenerator.ts`:

```ts
import { loadAiSettings, type AiSettings } from './aiSettings';
import { normalizePartOfSpeech, type PartOfSpeech } from './partOfSpeech';

export interface GeneratedCardInfo {
  meaning: string;
  partOfSpeech?: PartOfSpeech;
  examples: string[];
  notes: string;
  tags: string[];
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export class AiGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiGenerationError';
  }
}

function requireSettings(settings: AiSettings): void {
  if (!settings.enabled) throw new AiGenerationError('AI generation is disabled. Enable it in Settings first.');
  if (!settings.apiKey) throw new AiGenerationError('API key is required. Add it in Settings first.');
  if (!settings.baseUrl) throw new AiGenerationError('Base URL is required. Add it in Settings first.');
  if (!settings.model) throw new AiGenerationError('Model is required. Add it in Settings first.');
}

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => cleanString(item)).filter((item) => item.length > 0);
}

function parseGeneratedInfo(content: string): GeneratedCardInfo {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new AiGenerationError('AI response was not valid JSON.');
  }
  const meaning = cleanString(parsed.meaning);
  if (!meaning) throw new AiGenerationError('AI response did not include a meaning.');
  return {
    meaning,
    partOfSpeech: normalizePartOfSpeech(cleanString(parsed.partOfSpeech)),
    examples: cleanStringArray(parsed.examples),
    notes: cleanString(parsed.notes),
    tags: cleanStringArray(parsed.tags).map((tag) => tag.toLowerCase()),
  };
}

function buildPrompt(term: string, settings: AiSettings): string {
  const examplePhrase =
    settings.exampleCount === 1 ? '1 example sentence' : `${settings.exampleCount} example sentences`;
  return [
    `Generate flashcard information for this term or phrase: "${term}".`,
    `Use ${settings.outputLanguage} for meaning and notes.`,
    `Return exactly ${examplePhrase}.`,
    'Return concise flashcard-ready content.',
    'Return JSON only with keys: meaning, partOfSpeech, examples, notes, tags.',
    'partOfSpeech must be one of: n., v., adj., adv., pron., prep., conj., det., art., aux., modal., num., interj., abbr., phr., idiom., prefix., suffix., or empty.',
    'examples must be an array of strings. tags must be short lowercase strings.',
  ].join('\n');
}

export async function generateCardInfo(term: string): Promise<GeneratedCardInfo> {
  const trimmedTerm = term.trim();
  if (!trimmedTerm) throw new AiGenerationError('Term / Phrase is required before AI generation.');
  const settings = loadAiSettings();
  requireSettings(settings);
  const response = await fetch(`${settings.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You generate structured flashcard content and return strict JSON only.' },
        { role: 'user', content: buildPrompt(trimmedTerm, settings) },
      ],
    }),
  });
  if (!response.ok) throw new AiGenerationError(`AI request failed with status ${response.status}.`);
  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new AiGenerationError('AI response did not include message content.');
  return parseGeneratedInfo(content);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test -- src/test/aiCardGenerator.test.ts
```

Expected: PASS for all `aiCardGenerator` tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/aiCardGenerator.ts src/test/aiCardGenerator.test.ts
git commit -m "feat: add AI card generator service"
```

---

### Task 3: Settings UI for AI Generation

**Files:**
- Modify: `src/components/Settings.tsx`
- Modify: `src/App.css`
- Test: `src/test/aiSettingsUi.test.tsx`

- [ ] **Step 1: Write the failing UI tests**

Create `src/test/aiSettingsUi.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Settings } from '../components/Settings';
import { loadAiSettings, saveAiSettings } from '../services/aiSettings';

describe('AI settings UI', () => {
  beforeEach(() => localStorage.clear());

  it('renders default AI generation settings', () => {
    render(<Settings cards={[]} onImportSuccess={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'AI Generation' })).toBeInTheDocument();
    expect(screen.getByLabelText('Enable AI Generation')).not.toBeChecked();
    expect(screen.getByLabelText('Base URL')).toHaveValue('https://api.openai.com/v1');
    expect(screen.getByLabelText('Model')).toHaveValue('gpt-4.1-mini');
    expect(screen.getByLabelText('Output Language')).toHaveValue('中文');
    expect(screen.getByLabelText('Example Count')).toHaveValue(1);
  });

  it('persists edited AI settings', async () => {
    const user = userEvent.setup();
    render(<Settings cards={[]} onImportSuccess={vi.fn()} />);
    await user.click(screen.getByLabelText('Enable AI Generation'));
    await user.clear(screen.getByLabelText('Base URL'));
    await user.type(screen.getByLabelText('Base URL'), 'http://localhost:11434/v1');
    await user.type(screen.getByLabelText('API Key'), 'secret-key');
    await user.clear(screen.getByLabelText('Model'));
    await user.type(screen.getByLabelText('Model'), 'local-model');
    await user.clear(screen.getByLabelText('Output Language'));
    await user.type(screen.getByLabelText('Output Language'), 'English');
    await user.clear(screen.getByLabelText('Example Count'));
    await user.type(screen.getByLabelText('Example Count'), '3');
    expect(loadAiSettings()).toEqual({
      enabled: true,
      baseUrl: 'http://localhost:11434/v1',
      apiKey: 'secret-key',
      model: 'local-model',
      outputLanguage: 'English',
      exampleCount: 3,
    });
  });

  it('loads previously saved settings', () => {
    saveAiSettings({ enabled: true, apiKey: 'saved-key', outputLanguage: 'Thai', exampleCount: 2 });
    render(<Settings cards={[]} onImportSuccess={vi.fn()} />);
    expect(screen.getByLabelText('Enable AI Generation')).toBeChecked();
    expect(screen.getByLabelText('API Key')).toHaveValue('saved-key');
    expect(screen.getByLabelText('Output Language')).toHaveValue('Thai');
    expect(screen.getByLabelText('Example Count')).toHaveValue(2);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test -- src/test/aiSettingsUi.test.tsx
```

Expected: FAIL because `Settings` has no `AI Generation` section.

- [ ] **Step 3: Modify Settings component**

In `src/components/Settings.tsx`, use these imports:

```tsx
import { useRef, useState } from 'react';
import { Upload, Download, Info, Check, AlertTriangle, Database, Sparkles } from 'lucide-react';
import { type Card } from '../services/cardRepository';
import { useCsvImportExport } from '../hooks/useCsvImportExport';
import { loadAiSettings, saveAiSettings, type AiSettings } from '../services/aiSettings';
```

Inside `Settings`, after `successMsg` state, add:

```tsx
const [aiSettings, setAiSettings] = useState<AiSettings>(() => loadAiSettings());

const updateAiSettings = (patch: Partial<AiSettings>) => {
  const next = saveAiSettings(patch);
  setAiSettings(next);
};
```

Add this JSX after the Local-First Storage section and before CSV Backup:

```tsx
<div className="settings-section">
  <h2 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
    <Sparkles size={18} className="empty-state-icon" />
    AI Generation
  </h2>
  <label className="settings-toggle-row">
    <span><strong>Enable AI Generation</strong><small>Show the AI button on the card form when a term is entered.</small></span>
    <input type="checkbox" checked={aiSettings.enabled} onChange={(e) => updateAiSettings({ enabled: e.target.checked })} aria-label="Enable AI Generation" />
  </label>
  <label className="settings-field-row"><span>Base URL</span><input className="form-input" type="text" value={aiSettings.baseUrl} onChange={(e) => updateAiSettings({ baseUrl: e.target.value })} aria-label="Base URL" /></label>
  <label className="settings-field-row"><span>API Key</span><input className="form-input" type="password" value={aiSettings.apiKey} onChange={(e) => updateAiSettings({ apiKey: e.target.value })} aria-label="API Key" placeholder="sk-..." /></label>
  <label className="settings-field-row"><span>Model</span><input className="form-input" type="text" value={aiSettings.model} onChange={(e) => updateAiSettings({ model: e.target.value })} aria-label="Model" /></label>
  <label className="settings-field-row"><span>Output Language</span><input className="form-input" type="text" value={aiSettings.outputLanguage} onChange={(e) => updateAiSettings({ outputLanguage: e.target.value })} aria-label="Output Language" /></label>
  <label className="settings-field-row"><span>Example Count</span><input className="form-input" type="number" min={0} max={5} value={aiSettings.exampleCount} onChange={(e) => updateAiSettings({ exampleCount: Number(e.target.value) })} aria-label="Example Count" /></label>
  <div className="settings-info-box">
    <Info size={16} style={{ float: 'left', marginRight: '8px', color: 'var(--secondary)' }} />
    The API key is saved only in this browser on this device. This is intended for personal local use, not shared public deployment.
  </div>
</div>
```

- [ ] **Step 4: Add CSS for the settings controls**

Append to `src/App.css`:

```css
.settings-toggle-row,
.settings-field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.settings-toggle-row span,
.settings-field-row span {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 13px;
  color: var(--text-primary);
}

.settings-toggle-row small {
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.35;
}

.settings-toggle-row input[type='checkbox'] {
  width: 20px;
  height: 20px;
  accent-color: var(--primary);
  flex: 0 0 auto;
}

.settings-field-row .form-input {
  max-width: 58%;
}
```

- [ ] **Step 5: Run tests and commit**

```bash
npm test -- src/test/aiSettingsUi.test.tsx src/test/aiSettings.test.ts
git add src/components/Settings.tsx src/App.css src/test/aiSettingsUi.test.tsx
git commit -m "feat: add AI generation settings UI"
```

Expected: PASS before committing.

---

### Task 4: Card Form AI Button and Field Application

**Files:**
- Modify: `src/components/CardForm.tsx`
- Modify: `src/App.css`
- Test: `src/test/aiCardForm.test.tsx`

- [ ] **Step 1: Write the failing form tests**

Create `src/test/aiCardForm.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CardForm } from '../components/CardForm';
import { generateCardInfo } from '../services/aiCardGenerator';

vi.mock('../services/aiCardGenerator', () => ({ generateCardInfo: vi.fn() }));

describe('CardForm AI generation', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(generateCardInfo).mockReset();
  });

  it('shows the AI button only after a term is entered', async () => {
    const user = userEvent.setup();
    render(<CardForm existingTags={[]} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'AI Generate' })).not.toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('e.g. 喔抚喔编釜喔斷傅 (sawatdi) or Hello'), 'make up');
    expect(screen.getByRole('button', { name: 'AI Generate' })).toBeInTheDocument();
  });

  it('fills empty fields from generated card info', async () => {
    const user = userEvent.setup();
    vi.mocked(generateCardInfo).mockResolvedValue({
      meaning: 'to invent a story or excuse',
      partOfSpeech: 'phr.',
      examples: ['I made up a story.'],
      notes: 'Common phrasal verb.',
      tags: ['phrasal verb'],
    });
    render(<CardForm existingTags={[]} onSave={vi.fn()} onCancel={vi.fn()} />);
    await user.type(screen.getByPlaceholderText('e.g. 喔抚喔编釜喔斷傅 (sawatdi) or Hello'), 'make up');
    await user.click(screen.getByRole('button', { name: 'AI Generate' }));
    await waitFor(() => expect(screen.getByPlaceholderText('Enter the translation, meaning, or explanation')).toHaveValue('to invent a story or excuse'));
    expect(screen.getByLabelText('Part of Speech')).toHaveValue('phr.');
    expect(screen.getByPlaceholderText('Example sentence #1')).toHaveValue('I made up a story.');
    expect(screen.getByPlaceholderText('Pronunciation, usage rules, grammar notes...')).toHaveValue('Common phrasal verb.');
    expect(screen.getByText('phrasal verb')).toBeInTheDocument();
    expect(generateCardInfo).toHaveBeenCalledWith('make up');
  });

  it('does not overwrite non-empty user fields', async () => {
    const user = userEvent.setup();
    vi.mocked(generateCardInfo).mockResolvedValue({
      meaning: 'AI meaning',
      partOfSpeech: 'v.',
      examples: ['AI example.'],
      notes: 'AI notes',
      tags: ['ai-tag'],
    });
    render(<CardForm existingTags={[]} onSave={vi.fn()} onCancel={vi.fn()} />);
    await user.type(screen.getByPlaceholderText('e.g. 喔抚喔编釜喔斷傅 (sawatdi) or Hello'), 'hello');
    await user.type(screen.getByPlaceholderText('Enter the translation, meaning, or explanation'), 'Manual meaning');
    await user.type(screen.getByPlaceholderText('Example sentence #1'), 'Manual example.');
    await user.type(screen.getByPlaceholderText('Pronunciation, usage rules, grammar notes...'), 'Manual notes');
    await user.type(screen.getByPlaceholderText('Create new tag...'), 'manual-tag');
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: 'AI Generate' }));
    await waitFor(() => expect(generateCardInfo).toHaveBeenCalledWith('hello'));
    expect(screen.getByPlaceholderText('Enter the translation, meaning, or explanation')).toHaveValue('Manual meaning');
    expect(screen.getByPlaceholderText('Example sentence #1')).toHaveValue('Manual example.');
    expect(screen.getByPlaceholderText('Pronunciation, usage rules, grammar notes...')).toHaveValue('Manual notes');
    expect(screen.getByText('manual-tag')).toBeInTheDocument();
    expect(screen.queryByText('ai-tag')).not.toBeInTheDocument();
  });

  it('shows an inline error when generation fails', async () => {
    const user = userEvent.setup();
    vi.mocked(generateCardInfo).mockRejectedValue(new Error('API key is required. Add it in Settings first.'));
    render(<CardForm existingTags={[]} onSave={vi.fn()} onCancel={vi.fn()} />);
    await user.type(screen.getByPlaceholderText('e.g. 喔抚喔编釜喔斷傅 (sawatdi) or Hello'), 'hello');
    await user.click(screen.getByRole('button', { name: 'AI Generate' }));
    expect(await screen.findByText('API key is required. Add it in Settings first.')).toBeInTheDocument();
  });

  it('still requires meaning before saving', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<CardForm existingTags={[]} onSave={onSave} onCancel={vi.fn()} />);
    await user.type(screen.getByPlaceholderText('e.g. 喔抚喔编釜喔斷傅 (sawatdi) or Hello'), 'hello');
    await user.click(screen.getByRole('button', { name: 'Save Card' }));
    expect(screen.getByText('Meaning is required.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test -- src/test/aiCardForm.test.tsx
```

Expected: FAIL because `CardForm` has no AI button.

- [ ] **Step 3: Modify CardForm imports and state**

In `src/components/CardForm.tsx`, update imports:

```tsx
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Trash2, Plus, Save, X, Search, Check, ChevronDown, Sparkles } from 'lucide-react';
import { type Card } from '../services/cardRepository';
import { generateCardInfo } from '../services/aiCardGenerator';
import { PART_OF_SPEECH_OPTIONS, normalizePartOfSpeech, type PartOfSpeech } from '../services/partOfSpeech';
```

After `isSubmitting` state, add:

```tsx
const [isGenerating, setIsGenerating] = useState(false);
const [generationError, setGenerationError] = useState<string | null>(null);
const [generationSuccess, setGenerationSuccess] = useState<string | null>(null);
```

In the `useEffect` that populates the form, add:

```tsx
setGenerationError(null);
setGenerationSuccess(null);
```

- [ ] **Step 4: Add the generation handler**

Add before `handleSubmit`:

```tsx
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
      if (errors.meaning) setErrors((current) => ({ ...current, meaning: undefined }));
    }
    if (!partOfSpeech && generated.partOfSpeech) setPartOfSpeech(generated.partOfSpeech);
    if (areExamplesBlank(examples) && generated.examples.length > 0) setExamples(generated.examples);
    if (!notes.trim() && generated.notes) setNotes(generated.notes);
    if (selectedTags.length === 0 && generated.tags.length > 0) setSelectedTags(generated.tags);
    setGenerationSuccess('AI generated card details. Review before saving.');
  } catch (err) {
    setGenerationError(err instanceof Error ? err.message : 'AI generation failed.');
  } finally {
    setIsGenerating(false);
  }
};
```

- [ ] **Step 5: Add the button JSX below the term input**

In the `Term / Phrase` form group, after the term error span, add:

```tsx
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
```

- [ ] **Step 6: Add CSS for the form AI controls**

Append to `src/App.css`:

```css
.ai-generate-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.ai-generate-btn {
  width: 100%;
  min-height: 42px;
  border-color: rgba(139, 92, 246, 0.3);
  color: var(--primary);
  background: rgba(139, 92, 246, 0.06);
}

.ai-generate-btn:hover:not(:disabled) {
  border-color: var(--primary);
  background: rgba(139, 92, 246, 0.1);
}

.ai-generate-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.ai-feedback {
  font-size: 12px;
  line-height: 1.4;
}

.ai-feedback-error {
  color: var(--danger);
}

.ai-feedback-success {
  color: var(--success);
}
```

- [ ] **Step 7: Run form tests and commit**

```bash
npm test -- src/test/aiCardForm.test.tsx
git add src/components/CardForm.tsx src/App.css src/test/aiCardForm.test.tsx
git commit -m "feat: add AI generation to card form"
```

Expected: PASS before committing.

---

### Task 5: Full Verification and Regression Fixes

**Files:**
- Modify only files already touched by Tasks 1-4 if verification exposes failures.

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: PASS for the full Vitest suite.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: PASS with no new lint errors from AI generation files.

- [ ] **Step 3: Run production build**

```bash
npm run build
```

Expected: PASS with TypeScript and Vite build success.

- [ ] **Step 4: Manually verify in the browser**

```bash
npm run dev
```

Open the Vite URL shown in the terminal and verify:

1. Settings shows `AI Generation`.
2. Enabling AI and entering Base URL, API Key, Model, Output Language, and Example Count persists after navigating away and back.
3. Add Card hides the AI button when `Term / Phrase` is empty.
4. Add Card shows the AI button after typing a term.
5. Clicking AI Generate shows `Generating...` while the request is in flight.
6. A successful compatible provider response fills blank fields.
7. Manually filled fields remain unchanged after generation.
8. Save Card still refuses to save when `Meaning` is blank.

- [ ] **Step 5: Commit verification fixes if any files changed**

If Step 1-4 required code changes, run:

```bash
git add src/services/aiSettings.ts src/services/aiCardGenerator.ts src/components/Settings.tsx src/components/CardForm.tsx src/App.css src/test/aiSettings.test.ts src/test/aiCardGenerator.test.ts src/test/aiSettingsUi.test.tsx src/test/aiCardForm.test.tsx
git commit -m "fix: stabilize AI card generation"
```

If no files changed, do not create an empty commit.

---

## Self-Review Notes

- Spec coverage: Tasks cover settings persistence, Settings UI, OpenAI-compatible `/chat/completions`, inline term-driven AI button, empty-field-only application, example count, output language, local API key notice, generation errors, and save validation.
- Type consistency: `AiSettings`, `GeneratedCardInfo`, `AiGenerationError`, and `generateCardInfo(term: string)` are defined before UI tasks use them.
- Verification coverage: service tests, UI tests, full test suite, lint, build, and manual browser checks are all included.
