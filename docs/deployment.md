# Quick Volta Server Deployment

## Services

Quick Volta production deployment needs:

- PostgreSQL
- Node.js API server
- Built Vite frontend static files
- HTTPS reverse proxy

## Environment

Copy `.env.example` to `.env` at the project root, or to `server/.env` if you keep API configuration beside the server package. The API loads both files on startup without overriding real process environment variables.

Fill these values:

- `DATABASE_URL`
- `APP_BASE_URL`
- `API_BASE_URL`
- `SESSION_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `LINE_CHANNEL_SECRET`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_BOT_ADD_FRIEND_URL`
- `REMINDER_CRON_ENABLED`
- `REMINDER_CHECK_INTERVAL_MINUTES`

Keep provider secrets in server-side env/config files only. Do not add Google or LINE secrets to frontend code.

## Local development

```bash
docker compose up -d postgres
npm install
npm --prefix server install
npm --prefix server run prisma:generate
npm --prefix server run prisma:migrate
npm run dev
npm run dev:server
```

If `prisma migrate dev` fails on a local Windows/Node engine issue, generate migration SQL from the checked-in Prisma schema and apply it to the local Docker database before running tests:

```bash
npm --prefix server exec prisma migrate diff -- --from-empty --to-schema-datamodel server/prisma/schema.prisma --script
```

## Production build

```bash
npm run build:all
npm --prefix server run prisma:generate
npm --prefix server run prisma:deploy
npm --prefix server start
```

## Google OAuth

Configure the Google OAuth callback URL as:

```txt
https://your-domain.example/api/auth/google/callback
```

## LINE webhook

Set the LINE Messaging API webhook URL to:

```txt
https://your-domain.example/api/line/webhook
```

Enable webhook delivery in the LINE Developers console.
