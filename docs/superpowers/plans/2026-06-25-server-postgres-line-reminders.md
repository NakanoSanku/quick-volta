# Server PostgreSQL LINE Reminders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Node.js API server with PostgreSQL persistence, Google OAuth login, API-backed cards/review stats, one-time IndexedDB migration, and LINE review-due reminders.

**Architecture:** Keep the existing Vite React frontend. Add a sibling `server/` TypeScript Fastify app using Prisma/PostgreSQL. Preserve the frontend `CardRepository` contract so most UI and review logic stays stable while persistence moves to authenticated API calls.

**Tech Stack:** React 19, Vite, Vitest, Testing Library, Node.js, TypeScript, Fastify, Prisma, PostgreSQL, Google OAuth 2.0, LINE Messaging API, HTTP-only session cookies.

---

## File Structure

- Modify `package.json`: add `dev:server`, `build:server`, `build:all`, `test:server`, and `test:all`.
- Modify `.gitignore`: ignore `.env`, `server/.env`, `server/dist`, and `.postgres-data`.
- Create `.env.example`: server environment variable template.
- Create `docker-compose.yml`: local PostgreSQL.
- Create `server/package.json`, `server/tsconfig.json`, `server/vitest.config.ts`.
- Create `server/prisma/schema.prisma`.
- Create `server/src/config.ts`, `server/src/app.ts`, `server/src/index.ts`, `server/src/db.ts`.
- Create `server/src/auth/session.ts`, `server/src/auth/google.ts`, `server/src/plugins/auth.ts`.
- Create `server/src/routes/auth.ts`, `cards.ts`, `reviewStats.ts`, `importLocalData.ts`, `line.ts`.
- Create `server/src/line/signature.ts`, `server/src/line/client.ts`.
- Create `server/src/reminders/time.ts`, `server/src/reminders/scheduler.ts`.
- Create backend tests beside implementation files.
- Create `src/services/apiClient.ts`, `auth.ts`, `apiCardRepository.ts`, `localDataMigration.ts`, `lineReminderApi.ts`.
- Modify `src/services/cardRepository.ts` to export `indexedDbCardRepository` and default to API repository.
- Create `src/components/AuthGate.tsx`.
- Modify `src/App.tsx`, `src/components/Settings.tsx`, `src/App.css`.
- Create frontend tests in `src/test/*`.
- Create `docs/deployment.md`.

---

## Task 1: Scaffold Server Project

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `.env.example`
- Create: `docker-compose.yml`
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/vitest.config.ts`
- Create: `server/src/config.ts`
- Create: `server/src/app.ts`
- Create: `server/src/index.ts`
- Test: `server/src/config.test.ts`
- Test: `server/src/app.test.ts`

- [ ] **Step 1: Write failing tests**

Create `server/src/config.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { loadConfig } from './config';

describe('loadConfig', () => {
  it('loads required config values', () => {
    expect(loadConfig({
      DATABASE_URL: 'postgresql://quick:volta@localhost:5432/quick_volta',
      APP_BASE_URL: 'http://localhost:5173',
      API_BASE_URL: 'http://localhost:3000',
      SESSION_SECRET: '12345678901234567890123456789012',
      GOOGLE_CLIENT_ID: 'google-client-id',
      GOOGLE_CLIENT_SECRET: 'google-client-secret',
      GOOGLE_CALLBACK_URL: 'http://localhost:3000/api/auth/google/callback',
      LINE_CHANNEL_SECRET: 'line-secret',
      LINE_CHANNEL_ACCESS_TOKEN: 'line-token',
      LINE_BOT_ADD_FRIEND_URL: 'https://line.me/R/ti/p/@quickvolta',
      REMINDER_CRON_ENABLED: 'true',
      REMINDER_CHECK_INTERVAL_MINUTES: '15',
      NODE_ENV: 'test',
    })).toEqual(expect.objectContaining({
      databaseUrl: 'postgresql://quick:volta@localhost:5432/quick_volta',
      appBaseUrl: 'http://localhost:5173',
      apiBaseUrl: 'http://localhost:3000',
      reminderCronEnabled: true,
      reminderCheckIntervalMinutes: 15,
      port: 3000,
    }));
  });

  it('throws for missing required values', () => {
    expect(() => loadConfig({})).toThrow('DATABASE_URL is required.');
  });
});
```

Create `server/src/app.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildApp } from './app';
import { loadConfig } from './config';

const config = loadConfig({
  DATABASE_URL: 'postgresql://quick:volta@localhost:5432/quick_volta',
  APP_BASE_URL: 'http://localhost:5173',
  API_BASE_URL: 'http://localhost:3000',
  SESSION_SECRET: '12345678901234567890123456789012',
  GOOGLE_CLIENT_ID: 'google-client-id',
  GOOGLE_CLIENT_SECRET: 'google-client-secret',
  GOOGLE_CALLBACK_URL: 'http://localhost:3000/api/auth/google/callback',
  LINE_CHANNEL_SECRET: 'line-secret',
  LINE_CHANNEL_ACCESS_TOKEN: 'line-token',
  LINE_BOT_ADD_FRIEND_URL: 'https://line.me/R/ti/p/@quickvolta',
  NODE_ENV: 'test',
});

describe('buildApp', () => {
  it('serves health', async () => {
    const app = buildApp({ config });
    const response = await app.inject({ method: 'GET', url: '/api/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: Verify red**

Run:

```bash
npm.cmd --prefix server test -- server/src/config.test.ts server/src/app.test.ts
```

Expected: FAIL because the server package and files do not exist.

- [ ] **Step 3: Install server dependencies**

Run:

```bash
New-Item -ItemType Directory -Force server/src | Out-Null
npm.cmd init -w server -y
npm.cmd install -w server @fastify/cookie @fastify/cors @prisma/client fastify zod
npm.cmd install -w server -D @types/node prisma tsx typescript vitest
```

- [ ] **Step 4: Add scaffold files**

`server/package.json` scripts:

```json
{
  "dev": "tsx watch src/index.ts",
  "build": "tsc -p tsconfig.json",
  "start": "node dist/index.js",
  "test": "vitest run",
  "prisma:generate": "prisma generate",
  "prisma:migrate": "prisma migrate dev",
  "prisma:studio": "prisma studio"
}
```

Create `server/tsconfig.json` with NodeNext, strict mode, `rootDir: "src"`, and `outDir: "dist"`.

Create `server/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', globals: true, restoreMocks: true },
});
```

Create `server/src/config.ts` with `loadConfig(env = process.env)` and required keys from `.env.example`. It must trim base URLs, parse boolean `REMINDER_CRON_ENABLED`, parse integer `REMINDER_CHECK_INTERVAL_MINUTES`, default `PORT` to `3000`, and throw `${KEY} is required.` for missing required values.

Create `server/src/app.ts`:

```ts
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import type { ServerConfig } from './config.js';

export function buildApp({ config }: { config: ServerConfig }) {
  const app = Fastify({ logger: config.nodeEnv !== 'test' });
  void app.register(cookie, { secret: config.sessionSecret });
  void app.register(cors, { origin: config.appBaseUrl, credentials: true });
  app.get('/api/health', async () => ({ ok: true }));
  return app;
}
```

Create `server/src/index.ts`:

```ts
import { buildApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = buildApp({ config });
await app.listen({ port: config.port, host: '0.0.0.0' });
```

Create `docker-compose.yml` with PostgreSQL 16-alpine, database/user/password `quick_volta`, port `5432:5432`, and volume `./.postgres-data:/var/lib/postgresql/data`.

Create `.env.example` with all variables from the design spec.

Update root scripts:

```json
"dev:server": "npm --prefix server run dev",
"build:server": "npm --prefix server run build",
"build:all": "npm run build && npm run build:server",
"test:server": "npm --prefix server test",
"test:all": "npm run test && npm run test:server"
```

- [ ] **Step 5: Verify green**

Run:

```bash
npm.cmd --prefix server test -- server/src/config.test.ts server/src/app.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .gitignore .env.example docker-compose.yml server
git commit -m "feat: scaffold server application"
```

---

## Task 2: Add Prisma PostgreSQL Schema

**Files:**
- Create: `server/prisma/schema.prisma`
- Create: `server/src/db.ts`
- Create: `server/src/test/appTestHelpers.ts`
- Test: `server/src/db.test.ts`

- [ ] **Step 1: Write failing delegate test**

Create `server/src/db.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { prisma } from './db';

describe('Prisma schema', () => {
  it('exposes model delegates', () => {
    expect(prisma.user).toBeDefined();
    expect(prisma.session).toBeDefined();
    expect(prisma.card).toBeDefined();
    expect(prisma.reviewStats).toBeDefined();
    expect(prisma.lineConnection).toBeDefined();
    expect(prisma.lineBindingCode).toBeDefined();
    expect(prisma.reminderSettings).toBeDefined();
  });
});
```

- [ ] **Step 2: Verify red**

Run:

```bash
npm.cmd --prefix server test -- server/src/db.test.ts
```

Expected: FAIL because Prisma client and schema are missing.

- [ ] **Step 3: Add schema**

Create `server/prisma/schema.prisma` with:

- `User`: `id`, unique `googleSub`, `email`, nullable `name`, nullable `avatarUrl`, timestamps.
- `Session`: string `id`, `userId`, `expiresAt`, `createdAt`, cascade user relation.
- `Card`: `id`, `userId`, `term`, `meaning`, nullable `partOfSpeech`, JSON `examples`, `notes`, JSON `tags`, nullable `source`, timestamps, nullable `deletedAt`.
- `ReviewStats`: `cardId` primary key, `userId`, counts, nullable `lastReviewedAt`, `interval`, `easeFactor`, `repetitions`, nullable `nextDueAt`.
- `LineConnection`: `userId` unique, `lineUserId` unique, enum status `active | unlinked | blocked`, `boundAt`, timestamps.
- `LineBindingCode`: `userId`, unique `code`, `expiresAt`, nullable `usedAt`, `createdAt`.
- `ReminderSettings`: primary key `userId`, `enabled`, `timezone`, `remindHour`, nullable `lastSentOn`, timestamps.

Use PostgreSQL datasource and Prisma client generator. Use JSON for `examples` and `tags`.

Create `server/src/db.ts`:

```ts
import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();
```

Create `server/src/test/appTestHelpers.ts` with `createTestUser`, `createTestSession`, `authCookieFor`, and `injectAs(app, userId, options)` helpers.

- [ ] **Step 4: Generate and migrate**

Run:

```bash
docker compose up -d postgres
$env:DATABASE_URL='postgresql://quick_volta:quick_volta@localhost:5432/quick_volta'
npm.cmd --prefix server run prisma:generate
npm.cmd --prefix server run prisma:migrate -- --name init
```

- [ ] **Step 5: Verify green**

Run:

```bash
$env:DATABASE_URL='postgresql://quick_volta:quick_volta@localhost:5432/quick_volta'; npm.cmd --prefix server test -- server/src/db.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/prisma server/src/db.ts server/src/test/appTestHelpers.ts server/src/db.test.ts
git commit -m "feat: add postgres schema"
```

---

## Task 3: Add Sessions and `/api/me`

**Files:**
- Create: `server/src/auth/session.ts`
- Create: `server/src/plugins/auth.ts`
- Create: `server/src/routes/auth.ts`
- Modify: `server/src/app.ts`
- Test: `server/src/auth/session.test.ts`
- Test: `server/src/routes/auth.test.ts`

- [ ] **Step 1: Write failing tests**

Create tests for:

1. `createSession(userId)` creates a 48-character session ID.
2. `getSessionUser(sessionId)` resolves the user while session is unexpired.
3. `destroySession(sessionId)` removes the session.
4. `GET /api/me` returns `{ authenticated: false, user: null }` without cookie.
5. `GET /api/me` returns current user DTO with valid `qv_session`.
6. `POST /api/auth/logout` deletes the session and clears cookie.

- [ ] **Step 2: Verify red**

Run:

```bash
$env:DATABASE_URL='postgresql://quick_volta:quick_volta@localhost:5432/quick_volta'; npm.cmd --prefix server test -- server/src/auth/session.test.ts server/src/routes/auth.test.ts
```

Expected: FAIL because session code is missing.

- [ ] **Step 3: Implement sessions**

Create `server/src/auth/session.ts`:

```ts
import { randomBytes } from 'node:crypto';
import { prisma } from '../db.js';

export const SESSION_COOKIE_NAME = 'qv_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function newSessionId() {
  return randomBytes(24).toString('hex');
}

export async function createSession(userId: string) {
  return prisma.session.create({
    data: { id: newSessionId(), userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
}

export async function getSessionUser(sessionId: string | undefined) {
  if (!sessionId) return null;
  const session = await prisma.session.findUnique({ where: { id: sessionId }, include: { user: true } });
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;
  return session.user;
}

export async function destroySession(sessionId: string | undefined) {
  if (sessionId) await prisma.session.deleteMany({ where: { id: sessionId } });
}
```

Create `server/src/plugins/auth.ts` to decorate `request.user` and `app.requireUser`; unauthenticated protected routes return `401` with `{ error: 'Authentication required.' }`.

Create `server/src/routes/auth.ts` with `GET /api/me`, `POST /api/auth/logout`, and a temporary `GET /api/auth/google` redirect that Task 4 replaces with full OAuth state handling.

Register auth plugin and auth routes in `server/src/app.ts`.

- [ ] **Step 4: Verify green**

Run:

```bash
$env:DATABASE_URL='postgresql://quick_volta:quick_volta@localhost:5432/quick_volta'; npm.cmd --prefix server test -- server/src/auth/session.test.ts server/src/routes/auth.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/auth/session.ts server/src/plugins/auth.ts server/src/routes/auth.ts server/src/app.ts server/src/auth/session.test.ts server/src/routes/auth.test.ts
git commit -m "feat: add session authentication"
```

---

## Task 4: Add Google OAuth Login

**Files:**
- Create: `server/src/auth/google.ts`
- Modify: `server/src/routes/auth.ts`
- Test: `server/src/auth/google.test.ts`
- Test: `server/src/routes/googleAuth.test.ts`

- [ ] **Step 1: Write failing tests**

Create tests for:

1. `exchangeGoogleCode()` POSTs to `https://oauth2.googleapis.com/token` and returns `{ accessToken, idToken }`.
2. `fetchGoogleProfile()` GETs `https://openidconnect.googleapis.com/v1/userinfo` and returns `{ googleSub, email, name, avatarUrl }`.
3. `GET /api/auth/google` redirects to Google and sets `qv_oauth_state`.
4. OAuth callback rejects mismatched state by redirecting to `${APP_BASE_URL}?authError=oauth_state`.
5. OAuth callback with mocked Google helpers upserts user and sets `qv_session`.

- [ ] **Step 2: Verify red**

Run:

```bash
$env:DATABASE_URL='postgresql://quick_volta:quick_volta@localhost:5432/quick_volta'; npm.cmd --prefix server test -- server/src/auth/google.test.ts server/src/routes/googleAuth.test.ts
```

Expected: FAIL because Google OAuth helpers and callback are incomplete.

- [ ] **Step 3: Implement helpers and callback**

Create `server/src/auth/google.ts` with `exchangeGoogleCode()` and `fetchGoogleProfile()` using `fetch`, readable errors for non-OK responses, and validation that tokens/profile fields exist.

Update `server/src/routes/auth.ts`:

- `GET /api/auth/google`: generate random state, set `qv_oauth_state` HTTP-only cookie, redirect to Google with `openid email profile`.
- `GET /api/auth/google/callback`: verify state, exchange code, fetch profile, upsert user by `googleSub`, create session, set `qv_session`, redirect to `APP_BASE_URL`.
- On provider failure, redirect to `${APP_BASE_URL}?authError=oauth_callback`.

- [ ] **Step 4: Verify green**

Run:

```bash
$env:DATABASE_URL='postgresql://quick_volta:quick_volta@localhost:5432/quick_volta'; npm.cmd --prefix server test -- server/src/auth/google.test.ts server/src/routes/googleAuth.test.ts server/src/routes/auth.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/auth/google.ts server/src/routes/auth.ts server/src/auth/google.test.ts server/src/routes/googleAuth.test.ts
git commit -m "feat: add google oauth login"
```

---

## Task 5: Add Cards API

**Files:**
- Create: `server/src/routes/cards.ts`
- Modify: `server/src/app.ts`
- Test: `server/src/routes/cards.test.ts`

- [ ] **Step 1: Write failing tests**

Test these behaviours:

1. Anonymous `GET /api/cards` returns `401`.
2. Authenticated `POST /api/cards` creates a card for current user and returns `201`.
3. `GET /api/cards` returns only active cards for current user, sorted newest first.
4. `GET /api/cards/:id` returns `404` for another user's card.
5. `PUT /api/cards/:id` updates an owned active card.
6. `DELETE /api/cards/:id` soft-deletes an owned card and list no longer returns it.

- [ ] **Step 2: Verify red**

```bash
$env:DATABASE_URL='postgresql://quick_volta:quick_volta@localhost:5432/quick_volta'; npm.cmd --prefix server test -- server/src/routes/cards.test.ts
```

Expected: FAIL because cards routes are missing.

- [ ] **Step 3: Implement routes**

Create `server/src/routes/cards.ts`:

- Use zod input: `term`, `meaning`, optional `partOfSpeech`, `examples`, `notes`, `tags`, optional `source`.
- Convert Prisma cards to existing frontend shape with ISO date strings and `deletedAt: null | string`.
- Scope every query by `request.user!.id`.
- Return `404` for missing/cross-user resources.

Register routes in `server/src/app.ts`.

- [ ] **Step 4: Verify green**

```bash
$env:DATABASE_URL='postgresql://quick_volta:quick_volta@localhost:5432/quick_volta'; npm.cmd --prefix server test -- server/src/routes/cards.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/cards.ts server/src/app.ts server/src/routes/cards.test.ts
git commit -m "feat: add cards api"
```

---

## Task 6: Add Review Stats API and Local Import API

**Files:**
- Create: `server/src/routes/reviewStats.ts`
- Create: `server/src/routes/importLocalData.ts`
- Modify: `server/src/app.ts`
- Test: `server/src/routes/reviewStats.test.ts`
- Test: `server/src/routes/importLocalData.test.ts`

- [ ] **Step 1: Write failing tests**

`reviewStats.test.ts` must cover:

- anonymous rejection;
- default stats for owned card with no stats;
- save stats through `PUT /api/review-stats/:cardId`;
- list stats through `GET /api/review-stats`;
- `404` for cross-user card stats.

`importLocalData.test.ts` must cover importing this payload:

```json
{
  "cards": [{
    "id": "local-card-1",
    "term": "hello",
    "meaning": "สวัสดี",
    "examples": ["hello there"],
    "notes": "",
    "tags": ["greeting"],
    "createdAt": "2026-06-25T00:00:00.000Z",
    "updatedAt": "2026-06-25T00:00:00.000Z",
    "deletedAt": null
  }],
  "reviewStats": [{
    "cardId": "local-card-1",
    "reviewCount": 2,
    "knownCount": 2,
    "unknownCount": 0,
    "lastReviewedAt": "2026-06-25T00:00:00.000Z",
    "interval": 6,
    "easeFactor": 2.5,
    "repetitions": 2,
    "nextDueAt": "2026-07-01T00:00:00.000Z"
  }]
}
```

Expected response: `{ importedCards: 1, importedReviewStats: 1 }`.

- [ ] **Step 2: Verify red**

```bash
$env:DATABASE_URL='postgresql://quick_volta:quick_volta@localhost:5432/quick_volta'; npm.cmd --prefix server test -- server/src/routes/reviewStats.test.ts server/src/routes/importLocalData.test.ts
```

Expected: FAIL because routes are missing.

- [ ] **Step 3: Implement routes**

Create `reviewStats.ts`:

- `GET /api/review-stats`
- `GET /api/review-stats/:cardId`
- `PUT /api/review-stats/:cardId`
- Verify card belongs to current user before returning or saving stats.
- Return default stats when owned card has no stats.

Create `importLocalData.ts`:

- `POST /api/import/local-browser-data`
- Validate cards and stats with zod.
- Upsert cards with current `userId`.
- Upsert only stats whose `cardId` exists in the imported card set.
- Preserve local card IDs.

Register both route files in `server/src/app.ts`.

- [ ] **Step 4: Verify green**

```bash
$env:DATABASE_URL='postgresql://quick_volta:quick_volta@localhost:5432/quick_volta'; npm.cmd --prefix server test -- server/src/routes/reviewStats.test.ts server/src/routes/importLocalData.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/reviewStats.ts server/src/routes/importLocalData.ts server/src/app.ts server/src/routes/reviewStats.test.ts server/src/routes/importLocalData.test.ts
git commit -m "feat: add review stats and local import api"
```

---

## Task 7: Add Frontend AuthGate and API Repository

**Files:**
- Create: `src/services/apiClient.ts`
- Create: `src/services/auth.ts`
- Create: `src/services/apiCardRepository.ts`
- Modify: `src/services/cardRepository.ts`
- Create: `src/components/AuthGate.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.css`
- Test: `src/test/authGate.test.tsx`
- Test: `src/test/apiCardRepository.test.ts`

- [ ] **Step 1: Write failing tests**

`apiCardRepository.test.ts` verifies:

- `getAllCards()` calls `/api/cards` with `credentials: 'include'`.
- `getAllStats()` calls `/api/review-stats`.
- `saveCard(existingCard)` checks `/api/cards/:id`, then sends `PUT /api/cards/:id`.
- `softDeleteCard(id)` sends `DELETE /api/cards/:id`.
- `saveStats(stats)` sends `PUT /api/review-stats/:cardId`.

`authGate.test.tsx` verifies:

- anonymous users see a `Sign in with Google` button;
- clicking it calls `loginWithGoogle`;
- authenticated users render child app content with current user.

- [ ] **Step 2: Verify red**

```bash
npm.cmd test -- src/test/apiCardRepository.test.ts src/test/authGate.test.tsx
```

Expected: FAIL because services/components are missing.

- [ ] **Step 3: Implement API services**

Create `apiClient.ts` with `apiJson<T>(path, init)` that always uses `credentials: 'include'`, sends JSON headers, parses structured `{ error }`, and throws `ApiError`.

Create `auth.ts` with:

- `getCurrentUser(): Promise<CurrentUserResponse>`
- `loginWithGoogle(): void` assigning `window.location` to `/api/auth/google`
- `logout(): Promise<void>`

Create `apiCardRepository.ts` implementing the existing `CardRepository` interface.

Modify `cardRepository.ts`:

- export the current IndexedDB repository as `indexedDbCardRepository`;
- export API repository as default `cardRepository`.

- [ ] **Step 4: Implement AuthGate**

Create `AuthGate.tsx`:

- call `getCurrentUser()` on mount;
- show loading state;
- show sign-in screen if anonymous;
- show OAuth error message when `authError` exists in URL;
- render children for authenticated user.

Modify `App.tsx`:

- extract existing app body into `AuthenticatedApp({ user })`;
- default export wraps it with `AuthGate`.

Add minimal `.auth-screen` and `.auth-card` styles.

- [ ] **Step 5: Verify green**

```bash
npm.cmd test -- src/test/apiCardRepository.test.ts src/test/authGate.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/services/apiClient.ts src/services/auth.ts src/services/apiCardRepository.ts src/services/cardRepository.ts src/components/AuthGate.tsx src/App.tsx src/App.css src/test/apiCardRepository.test.ts src/test/authGate.test.tsx
git commit -m "feat: add frontend auth and api repository"
```

---

## Task 8: Add IndexedDB Migration UI

**Files:**
- Create: `src/services/localDataMigration.ts`
- Modify: `src/components/Settings.tsx`
- Modify: `src/App.tsx`
- Test: `src/test/localDataMigration.test.ts`
- Test: `src/test/localMigrationUi.test.tsx`

- [ ] **Step 1: Write failing tests**

`localDataMigration.test.ts` verifies:

- `getLocalMigrationSummary()` returns local card/stat counts from `indexedDbCardRepository`;
- `uploadLocalBrowserData()` POSTs `{ cards, reviewStats }` to `/api/import/local-browser-data`.

`localMigrationUi.test.tsx` verifies:

- Settings shows `Migrate local data to account` when local card count > 0;
- clicking `Upload local data` calls the migration service;
- `onImportSuccess` runs after successful upload.

- [ ] **Step 2: Verify red**

```bash
npm.cmd test -- src/test/localDataMigration.test.ts src/test/localMigrationUi.test.tsx
```

Expected: FAIL because migration service/UI is missing.

- [ ] **Step 3: Implement migration service**

Create `localDataMigration.ts`:

```ts
import { apiJson } from './apiClient';
import { indexedDbCardRepository } from './cardRepository';

export async function getLocalMigrationSummary() {
  const [cards, stats] = await Promise.all([
    indexedDbCardRepository.getAllCards(),
    indexedDbCardRepository.getAllStats(),
  ]);
  return { cardCount: cards.length, reviewStatsCount: stats.length };
}

export async function uploadLocalBrowserData() {
  const [cards, reviewStats] = await Promise.all([
    indexedDbCardRepository.getAllCards(),
    indexedDbCardRepository.getAllStats(),
  ]);
  return apiJson<{ importedCards: number; importedReviewStats: number }>('/api/import/local-browser-data', {
    method: 'POST',
    body: JSON.stringify({ cards, reviewStats }),
  });
}
```

- [ ] **Step 4: Add Settings UI**

Modify `SettingsProps` to include:

```ts
currentUser: CurrentUser;
onLogout: () => Promise<void>;
```

Add an Account section showing `currentUser.email` and `Sign out`.

Add migration state:

- `localSummary`
- `migrationMessage`
- `migrationLoading`

Add migration section when `localSummary.cardCount > 0` with button text `Upload local data`.

Modify `App.tsx` so Settings receives `currentUser` and `onLogout`.

- [ ] **Step 5: Verify green**

```bash
npm.cmd test -- src/test/localDataMigration.test.ts src/test/localMigrationUi.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/services/localDataMigration.ts src/components/Settings.tsx src/App.tsx src/test/localDataMigration.test.ts src/test/localMigrationUi.test.tsx
git commit -m "feat: add local data migration"
```

---

## Task 9: Add LINE Binding API and Webhook

**Files:**
- Create: `server/src/line/signature.ts`
- Create: `server/src/line/client.ts`
- Create: `server/src/routes/line.ts`
- Modify: `server/src/app.ts`
- Test: `server/src/line/signature.test.ts`
- Test: `server/src/routes/line.test.ts`

- [ ] **Step 1: Write failing tests**

Tests must verify:

1. `verifyLineSignature(rawBody, signature, secret)` accepts HMAC-SHA256 base64 signature.
2. Invalid LINE signature returns `false`.
3. Anonymous `GET /api/line/status` returns `401`.
4. Authenticated `POST /api/line/binding-code` returns `QV-XXXX`, expiry, and bot add-friend URL.
5. `POST /api/line/webhook` with invalid signature returns `401`.
6. Webhook text message with valid code creates active `LineConnection` and marks code used.
7. `POST /api/line/test-message` sends a LINE push message when bound.

- [ ] **Step 2: Verify red**

```bash
$env:DATABASE_URL='postgresql://quick_volta:quick_volta@localhost:5432/quick_volta'; npm.cmd --prefix server test -- server/src/line/signature.test.ts server/src/routes/line.test.ts
```

Expected: FAIL because LINE modules/routes are missing.

- [ ] **Step 3: Implement LINE helpers**

Create `signature.ts` using `createHmac('sha256', channelSecret).update(rawBody).digest('base64')` and `timingSafeEqual`.

Create `client.ts` with:

- `sendLinePushMessage(accessToken, to, text)` -> POST `https://api.line.me/v2/bot/message/push`
- `replyLineMessage(accessToken, replyToken, text)` -> POST `https://api.line.me/v2/bot/message/reply`

Both throw readable errors for non-OK status.

- [ ] **Step 4: Implement LINE routes**

Create `line.ts`:

- `GET /api/line/status`
- `POST /api/line/binding-code`
- `DELETE /api/line/connection`
- `PUT /api/reminder-settings`
- `POST /api/line/test-message`
- `POST /api/line/webhook`

Binding-code rules:

- generate `QV-` plus four uppercase non-ambiguous characters;
- expire in 15 minutes;
- mark previous unused codes for the user as used.

Webhook rules:

- verify `x-line-signature` before processing;
- process text message events;
- normalize text by `trim().toUpperCase()`;
- find unused, unexpired binding code;
- upsert active line connection with `source.userId`;
- mark code used;
- reply success or expired-code message.

Register routes in `server/src/app.ts`.

- [ ] **Step 5: Resolve raw-body signature handling**

If Fastify JSON parsing prevents exact raw-body signature verification, add route-specific raw parsing for `/api/line/webhook`. Do not globally parse all JSON as strings if it breaks existing JSON route tests.

- [ ] **Step 6: Verify green**

```bash
$env:DATABASE_URL='postgresql://quick_volta:quick_volta@localhost:5432/quick_volta'; npm.cmd --prefix server test -- server/src/line/signature.test.ts server/src/routes/line.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server/src/line/signature.ts server/src/line/client.ts server/src/routes/line.ts server/src/app.ts server/src/line/signature.test.ts server/src/routes/line.test.ts
git commit -m "feat: add line binding api"
```

---

## Task 10: Add Reminder Scheduler

**Files:**
- Create: `server/src/reminders/time.ts`
- Create: `server/src/reminders/scheduler.ts`
- Modify: `server/src/index.ts`
- Test: `server/src/reminders/time.test.ts`
- Test: `server/src/reminders/scheduler.test.ts`

- [ ] **Step 1: Write failing tests**

Tests must verify:

- `getLocalDateAndHour(new Date('2026-06-25T02:30:00.000Z'), 'Asia/Bangkok')` returns `{ localDate: '2026-06-25', localHour: 9 }`;
- scheduler sends one reminder when user has enabled settings, active LINE connection, due cards, matching local hour, and no `lastSentOn` for that local date;
- scheduler updates `lastSentOn`;
- scheduler skips duplicate same-day reminders;
- scheduler skips unbound LINE, disabled settings, wrong hour, and no due cards.

- [ ] **Step 2: Verify red**

```bash
$env:DATABASE_URL='postgresql://quick_volta:quick_volta@localhost:5432/quick_volta'; npm.cmd --prefix server test -- server/src/reminders/time.test.ts server/src/reminders/scheduler.test.ts
```

Expected: FAIL because scheduler files are missing.

- [ ] **Step 3: Implement time helper**

Create `time.ts` with `Intl.DateTimeFormat('en-CA', { timeZone, year, month, day, hour, hour12: false }).formatToParts(now)`.

- [ ] **Step 4: Implement scheduler**

Create `scheduler.ts` with:

- `countDueCardsForUser(userId, now)`: active cards are due when no stats, `nextDueAt` is null, or `nextDueAt <= now`.
- `runReminderCheck(config, now = new Date())`: select enabled settings, require active LINE, require local hour match, require `lastSentOn !== localDate`, send message, update `lastSentOn`.
- `startReminderScheduler(config)`: no-op when disabled, otherwise run once and `setInterval`.

Reminder message:

```txt
Quick Volta Review Reminder

You have {count} cards due today.
Open Quick Volta to review:
{APP_BASE_URL}
```

Modify `server/src/index.ts` to call `startReminderScheduler(config)` after app starts.

- [ ] **Step 5: Verify green**

```bash
$env:DATABASE_URL='postgresql://quick_volta:quick_volta@localhost:5432/quick_volta'; npm.cmd --prefix server test -- server/src/reminders/time.test.ts server/src/reminders/scheduler.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/reminders/time.ts server/src/reminders/scheduler.ts server/src/index.ts server/src/reminders/time.test.ts server/src/reminders/scheduler.test.ts
git commit -m "feat: add line reminder scheduler"
```

---

## Task 11: Add Frontend LINE Reminder Settings

**Files:**
- Create: `src/services/lineReminderApi.ts`
- Modify: `src/components/Settings.tsx`
- Modify: `src/App.css`
- Test: `src/test/lineReminderSettings.test.tsx`

- [ ] **Step 1: Write failing UI tests**

Tests must verify:

- Settings calls `getLineReminderStatus()` and renders `LINE Reminders`;
- unbound state has `Generate LINE binding code`;
- clicking it displays code `QV-8K3D`;
- bound state has `Send LINE test message`;
- toggling `Enable LINE reminders` calls `updateReminderSettings`;
- changing `Reminder hour` calls `updateReminderSettings` with the selected hour.

- [ ] **Step 2: Verify red**

```bash
npm.cmd test -- src/test/lineReminderSettings.test.tsx
```

Expected: FAIL because service and UI are missing.

- [ ] **Step 3: Implement `lineReminderApi.ts`**

Export:

- `getLineReminderStatus()`
- `createLineBindingCode()`
- `unlinkLineConnection()`
- `updateReminderSettings(settings)`
- `sendLineTestMessage()`

Use `apiJson` and endpoint paths from the spec.

- [ ] **Step 4: Add Settings section**

Add a `LINE Reminders` section with:

- bound/unbound status;
- generate code button;
- add-friend link;
- visible binding code and expiry;
- test message button when bound;
- unlink button when bound;
- reminder enabled checkbox;
- timezone input defaulting to `Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'`;
- hour select with values `0` through `23`.

- [ ] **Step 5: Verify green**

```bash
npm.cmd test -- src/test/lineReminderSettings.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/services/lineReminderApi.ts src/components/Settings.tsx src/App.css src/test/lineReminderSettings.test.tsx
git commit -m "feat: add line reminder settings ui"
```

---

## Task 12: Deployment Docs and Full Verification

**Files:**
- Create: `docs/deployment.md`
- Modify: `README.md`
- Modify source files only if verification exposes failures.

- [ ] **Step 1: Write deployment docs**

Create `docs/deployment.md` covering:

- required services: PostgreSQL, Node API, built Vite frontend, HTTPS reverse proxy;
- `.env.example` values;
- local development commands;
- production build commands;
- Prisma migration command;
- LINE webhook URL: `https://your-domain.example/api/line/webhook`;
- Google OAuth callback URL: `https://your-domain.example/api/auth/google/callback`.

Update `README.md` with a `Server-backed deployment` section linking to `docs/deployment.md`.

- [ ] **Step 2: Backend verification**

Run:

```bash
docker compose up -d postgres
$env:DATABASE_URL='postgresql://quick_volta:quick_volta@localhost:5432/quick_volta'
npm.cmd --prefix server run prisma:generate
npm.cmd --prefix server run prisma:migrate
npm.cmd --prefix server test
npm.cmd --prefix server run build
```

Expected: all pass.

- [ ] **Step 3: Frontend verification**

Run:

```bash
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Expected: all pass.

- [ ] **Step 4: Manual integrated checks**

Run:

```bash
npm.cmd run dev
npm.cmd run dev:server
```

Verify:

1. Anonymous user sees Google sign-in.
2. Authenticated app loads with a real Google OAuth config or a test session.
3. Creating a card persists to PostgreSQL.
4. Reviewing a card updates `review_stats.nextDueAt`.
5. Local migration imports existing IndexedDB cards.
6. LINE binding code is generated.
7. LINE bot message with the code binds the user.
8. Test message sends to LINE.
9. Scheduler sends one due-card reminder and does not repeat on same local date.

- [ ] **Step 5: Commit**

```bash
git add docs/deployment.md README.md
git commit -m "docs: add server deployment guide"
```

If verification changed source files, include those exact changed source files in the same commit.

---

## Self-Review Notes

- Spec coverage: This plan covers the approved architecture, PostgreSQL schema, Google OAuth, sessions, scoped card/review APIs, local IndexedDB migration, LINE binding, webhook signature verification, reminder settings, scheduler idempotency, and deployment docs.
- Scope control: It does not add Next.js, SQLite, Telegram, commercial billing, admin UI, allowlist, card sharing, or offline bidirectional sync.
- TDD: Each implementation task begins with failing tests and expected red/green commands.
- Type consistency: Backend DTOs preserve existing frontend `Card` and `ReviewStats` ISO string shapes.
- Highest-risk area: LINE raw-body signature verification; Task 9 includes an explicit parser checkpoint.
