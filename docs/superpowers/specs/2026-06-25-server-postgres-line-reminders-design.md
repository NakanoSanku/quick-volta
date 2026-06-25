# Server PostgreSQL and LINE Review Reminders Design

Date: 2026-06-25
Status: Approved for planning

## Goal

Move Quick Volta from a local-only IndexedDB flashcard PWA to a small multi-user server-backed app that can be deployed on a personal server, shared with a friend, and later expanded if public interest grows. The first server-backed version will use PostgreSQL for durable multi-user storage, Google OAuth for login, and LINE Messaging API reminders for due reviews.

## Confirmed Decisions

- Use option A: keep the existing Vite React frontend and add a separate Node.js TypeScript API server.
- Use PostgreSQL instead of SQLite because the project may later become public or commercial.
- Use Google OAuth login without an email allowlist. Any Google account can sign in, but all app data remains user-scoped.
- Use LINE Messaging API with a LINE Official Account / bot, not LINE Notify.
- First reminder provider is LINE only.
- LINE binding uses a one-time code: the web app shows a code, the user sends it to the LINE bot, and the webhook binds the LINE user ID to the authenticated app user.
- Deploy target is the user's own server first.
- Preserve existing local cards by providing a one-time browser-to-account migration flow.

## External API Notes

- Google OAuth should use the web-server authorization code flow because the backend can store client secrets and maintain session state.
- LINE Messaging API webhooks are sent to a bot server when users interact with a LINE Official Account. Webhook signatures must be verified before events are processed.
- LINE push messages can send messages to a user at any time once the backend knows a valid LINE user ID and has a channel access token.
- LINE webhook URL must be served over HTTPS for production deployment.

## Architecture

Keep the frontend as a React/Vite SPA and add a sibling backend application:

```txt
quick-volta/
  src/                    # existing React frontend
  server/                 # new Node.js API server
    src/
    prisma/
  package.json            # may become root workspace scripts
```

Runtime architecture:

```txt
React PWA
  -> HTTPS API calls with session cookie
Node API Server
  -> Prisma
PostgreSQL

Node API Server
  -> Google OAuth callback
  -> LINE webhook
  -> LINE push message API
  -> reminder scheduler
```

The backend owns authentication, authorization, database writes, LINE webhook validation, reminder scheduling, and provider calls. The frontend owns presentation, review interaction, local data migration UI, and settings forms.

## Backend Technology

Recommended stack:

- Node.js + TypeScript.
- Fastify for API routes and hooks, or Express if implementation simplicity wins during planning. The design only requires standard HTTP routing, JSON body handling, cookies, and a raw-body route for LINE signature verification.
- Prisma ORM.
- PostgreSQL.
- Server-side session cookie for browser auth.
- A lightweight in-process scheduler for first deployment, with a database lock/idempotency design so it can later move to a separate worker or cron process.

## Authentication

Google OAuth login flow:

1. User clicks `Sign in with Google` in the frontend.
2. Frontend navigates to `GET /api/auth/google`.
3. Backend creates an OAuth state value and redirects to Google.
4. Google redirects back to `GET /api/auth/google/callback` with an authorization code.
5. Backend exchanges the code, verifies the identity, and reads the Google subject, email, display name, and avatar.
6. Backend upserts the user by `googleSub`.
7. Backend creates a server-side session and sets an HTTP-only cookie.
8. Frontend calls `GET /api/me` to load the current user.

No email allowlist is used in v1. Authorization is instead enforced by `userId` scoping on every data query.

Session requirements:

- Cookie is HTTP-only, secure in production, same-site lax.
- Logout destroys the server-side session.
- API routes that access user data require an authenticated session.
- OAuth state prevents CSRF during login.

## Database Model

Use UUID primary keys unless Prisma and PostgreSQL defaults choose an equivalent stable ID type.

### users

Represents an authenticated Google account.

- `id`
- `googleSub` unique
- `email`
- `name`
- `avatarUrl`
- `createdAt`
- `updatedAt`

### sessions

Server-side sessions for authenticated browser users.

- `id`
- `userId`
- `expiresAt`
- `createdAt`

### cards

Server-backed version of the existing `Card` shape.

- `id`
- `userId`
- `term`
- `meaning`
- `partOfSpeech` nullable string
- `examples` string array or JSON array
- `notes`
- `tags` string array or JSON array
- `source` nullable string
- `createdAt`
- `updatedAt`
- `deletedAt` nullable

Indexes:

- `(userId, deletedAt)` for active card lists.
- `(userId, updatedAt)` for sorting and later sync features.

### review_stats

Server-backed version of the existing `ReviewStats` shape.

- `cardId` primary key or unique
- `userId`
- `reviewCount`
- `knownCount`
- `unknownCount`
- `lastReviewedAt` nullable timestamp
- `interval` integer days
- `easeFactor` numeric
- `repetitions` integer
- `nextDueAt` nullable timestamp
- `createdAt`
- `updatedAt`

Indexes:

- `(userId, nextDueAt)` for due-card queries and reminder checks.

### line_connections

Stores the LINE recipient for a user.

- `id`
- `userId` unique
- `lineUserId` unique
- `status` enum: `active`, `unlinked`, `blocked`
- `boundAt`
- `createdAt`
- `updatedAt`

### line_binding_codes

One-time codes shown in Settings and sent by the user to the bot.

- `id`
- `userId`
- `code` unique
- `expiresAt`
- `usedAt` nullable
- `createdAt`

Rules:

- Codes expire quickly, for example after 15 minutes.
- Generating a new code invalidates or supersedes previous unused codes for that user.
- Matching is case-insensitive after trimming whitespace.

### reminder_settings

Per-user reminder preferences.

- `userId` primary key
- `enabled`
- `timezone`
- `remindHour`
- `lastSentOn` nullable date string or date column
- `createdAt`
- `updatedAt`

Rules:

- Default `enabled` is false.
- Default `timezone` is derived from the browser during Settings setup, falling back to UTC.
- Default `remindHour` is a reasonable local morning or evening hour, for example 9.
- `lastSentOn` prevents duplicate daily reminders.

## API Design

All authenticated routes return `401` when no valid session exists.

### Auth

- `GET /api/auth/google`: start Google OAuth.
- `GET /api/auth/google/callback`: finish OAuth and redirect to app.
- `POST /api/auth/logout`: destroy session.
- `GET /api/me`: return current user profile or anonymous state.

### Cards

- `GET /api/cards`: list active cards for current user.
- `POST /api/cards`: create card for current user.
- `GET /api/cards/:id`: fetch one card if owned by current user.
- `PUT /api/cards/:id`: update one owned card.
- `DELETE /api/cards/:id`: soft-delete one owned card.

### Review stats

- `GET /api/review-stats`: list stats for current user.
- `GET /api/review-stats/:cardId`: get stats for an owned card.
- `PUT /api/review-stats/:cardId`: save stats for an owned card.
- Optional later endpoint: `POST /api/reviews/:cardId/ratings` to move SM-2 calculation server-side. For v1, the frontend can keep the existing SM-2 calculation and submit the resulting stats.

### Local data migration

- `POST /api/import/local-browser-data`: authenticated bulk import of cards and review stats from IndexedDB.

Behavior:

- Frontend reads current local IndexedDB data.
- User confirms upload to their account.
- Backend inserts cards and stats scoped to current user.
- Preserve existing card IDs when possible if there is no conflict for that user.
- If a duplicate ID exists, either update it when content matches or assign a new ID and map review stats accordingly. Implementation plan should choose the simpler deterministic behavior.

### LINE binding and reminders

- `GET /api/line/status`: return bound/unbound state and reminder settings.
- `POST /api/line/binding-code`: create and return a one-time binding code plus bot add-friend URL or QR URL config.
- `DELETE /api/line/connection`: unlink current user's LINE connection.
- `PUT /api/reminder-settings`: update enabled/timezone/remindHour.
- `POST /api/line/test-message`: send a test LINE message to the bound user, useful during setup.
- `POST /api/line/webhook`: public LINE webhook endpoint; requires LINE signature verification instead of browser session.

## Frontend Changes

### App shell and auth state

Add an auth-aware app shell:

- On startup, call `GET /api/me`.
- If anonymous, show a simple sign-in screen with Google login.
- If authenticated, show the existing app.
- Add logout in Settings.

### API-backed repository

Replace the current IndexedDB repository implementation with an API-backed repository that keeps the existing TypeScript interfaces where possible:

- `getAllCards()` calls `GET /api/cards`.
- `getCardById(id)` calls `GET /api/cards/:id`.
- `saveCard(card)` creates or updates through API.
- `softDeleteCard(id)` calls `DELETE /api/cards/:id`.
- `getStats(cardId)`, `getAllStats()`, and `saveStats(stats)` call review stats APIs.

The existing hooks and components should require minimal changes if the repository contract stays stable.

### Local migration UI

Settings should show a `Migrate local data to account` section when the browser contains local IndexedDB cards:

- Show count of local cards and review stats.
- Explain that this uploads local browser data into the logged-in account.
- Require an explicit confirmation click.
- After success, refresh server cards.
- Do not delete local IndexedDB data automatically in v1; show a note that the server account is now the source of truth.

### LINE Reminder Settings UI

Add a Settings section:

- Connection status: `Not bound`, `Bound`, or `Unavailable`.
- `Generate binding code` button.
- Display binding code, expiry, and instructions:
  1. Add the Quick Volta LINE Official Account.
  2. Send the binding code as a LINE message.
  3. Return to this page and refresh status.
- `Send test message` button when bound.
- `Unlink LINE` button when bound.
- Reminder toggle.
- Timezone input/select, prefilled from browser timezone.
- Reminder hour select.

## LINE Binding Flow

1. Authenticated user opens Settings.
2. User clicks `Generate binding code`.
3. Backend creates a code like `QV-8K3D` and stores it with expiry.
4. User adds the LINE Official Account as a friend and sends the code.
5. LINE sends a webhook event to `/api/line/webhook`.
6. Backend verifies `x-line-signature` against the raw request body and channel secret.
7. Backend reads text message events, extracts and normalizes the code, and finds an unused non-expired binding code.
8. Backend upserts `line_connections` with the event source user ID.
9. Backend marks the code as used.
10. Backend replies to the LINE event with a short success or failure message.
11. Frontend status shows bound on next refresh.

If a user blocks the bot or push fails permanently, the backend should mark the connection as not active when the provider returns an unrecoverable recipient error. The first implementation can log the failure and leave the connection active unless the API response clearly indicates invalid recipient.

## Reminder Scheduler

The scheduler runs every 15 or 30 minutes.

For each user with:

- reminders enabled;
- active LINE connection;
- local time currently in the configured reminder hour window;
- no reminder already sent for that local date;

it counts active cards with due stats:

- cards with no stats are due;
- cards with `nextDueAt` null are due;
- cards with `nextDueAt <= now` are due.

If due count is greater than 0, send one LINE push message and update `lastSentOn`.

Message content for v1:

```txt
Quick Volta Review Reminder

You have {count} cards due today.
Open Quick Volta to review:
{APP_BASE_URL}
```

Do not send actual card terms or meanings in v1. This keeps messages short and avoids leaking study content into notification previews.

Idempotency:

- Use `lastSentOn` per user local date to avoid repeat reminders.
- In a future multi-instance deployment, wrap reminder selection/update in a transaction or use a job table with uniqueness on `(userId, localDate)`.

## Error Handling

Frontend:

- Show login errors on the sign-in screen if OAuth callback redirects with an error.
- Show API failures in the same places the local repository currently reports local storage failures.
- Show LINE binding code expiry and let the user generate a new code.
- Show test-message errors in Settings.

Backend:

- Return structured JSON errors for API routes.
- Log provider errors with enough context to debug, without logging secrets.
- Reject unauthenticated user data routes with `401`.
- Reject cross-user card/stat access with `404` to avoid leaking resource existence.
- Return `200` quickly for LINE webhook verification events with an empty events array.

## Security and Privacy

- All user data queries must be scoped by authenticated `userId`.
- Google OAuth client secret, session secret, LINE channel secret, LINE channel access token, and database URL are server-only environment variables.
- LINE webhook signature verification is required before processing events.
- Production cookies use `Secure`, `HttpOnly`, and `SameSite=Lax`.
- The backend should trust proxy headers only when configured behind a known reverse proxy.
- Do not put API tokens in the frontend bundle.
- Do not include card content in reminder messages in v1.

## Environment Variables

```txt
DATABASE_URL=
APP_BASE_URL=
API_BASE_URL=
SESSION_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_BOT_ADD_FRIEND_URL=
REMINDER_CRON_ENABLED=true
REMINDER_CHECK_INTERVAL_MINUTES=30
```

## Deployment Shape

Personal server deployment can run:

- PostgreSQL service.
- Node API server process managed by systemd, Docker Compose, or a process manager.
- Static frontend served by Nginx/Caddy or by the Node server.
- HTTPS termination through Caddy, Nginx + Let's Encrypt, or another reverse proxy.

Recommended first deployment is Docker Compose with PostgreSQL and the Node API. The frontend can either be built into static files served by the backend or served separately by the reverse proxy. Implementation planning should choose the simpler path for this repository.

## Testing Plan

### Backend unit/integration tests

- Google OAuth callback upserts a user and creates a session, with Google calls mocked.
- Authenticated routes reject anonymous requests.
- Card CRUD is scoped to the current user.
- Review stats are scoped to the current user and require owned cards.
- Local import creates cards and stats for current user.
- LINE binding code creation generates an expiring code.
- LINE webhook rejects invalid signatures.
- LINE webhook binds a valid text code to the LINE user ID.
- LINE webhook ignores expired or used codes.
- Reminder scheduler sends one message for due cards and updates `lastSentOn`.
- Reminder scheduler does not send duplicate same-day reminders.
- Reminder scheduler does not send when no due cards, reminders disabled, or LINE unbound.

### Frontend tests

- Anonymous users see the Google sign-in screen.
- Authenticated users see cards loaded from API repository.
- Existing card list/review flows continue to work through the repository contract.
- Settings shows migration count and calls import endpoint after confirmation.
- Settings generates and displays LINE binding code.
- Settings displays bound/unbound LINE status.
- Settings updates reminder settings.

### Verification

- Run full frontend tests.
- Run backend tests.
- Run Prisma migration against a local PostgreSQL database.
- Run build for frontend and backend.
- Manual browser test: Google login, create card, review card, migrate local data if present.
- Manual LINE test: generate code, send it to bot, verify bound status, send test message.

## Migration and Rollout Plan

1. Add backend without removing IndexedDB files.
2. Add PostgreSQL schema and Prisma client.
3. Add auth and current-user endpoint.
4. Add API repository while preserving TypeScript card/review interfaces.
5. Add migration UI to upload local data to the server.
6. Add LINE binding and reminders.
7. Once stable, update Settings copy so PostgreSQL account storage is described as the source of truth instead of local-only storage.
8. Keep local IndexedDB migration code for at least the first deployed version so existing browser data can be recovered.

## Out of Scope

- Next.js migration.
- SQLite support.
- Email, Telegram, Discord, or push notification providers.
- Payment, subscriptions, or commercial account tiers.
- Admin dashboard.
- Public registration restrictions or invite system.
- Sharing cards between users.
- Offline-first bidirectional sync.
- Sending full card contents in LINE reminders.
- Multi-language reminder templates.
