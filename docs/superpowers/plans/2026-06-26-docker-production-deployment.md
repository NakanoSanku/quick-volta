# Docker Production Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package Quick Volta as production Docker services and document deployment for `flash.20030131.xyz`.

**Architecture:** Use Docker Compose with separate `web`, `api`, and `postgres` services. The web service serves the built Vite PWA through Nginx and proxies `/api/*` to the API service; the API service runs Prisma migrations before starting Fastify; Postgres stores application data in a named volume.

**Tech Stack:** Docker, Docker Compose, Nginx, Node.js 22 Alpine, Fastify, Prisma, PostgreSQL 16 Alpine, Vite.

---

### Task 1: Docker build files

**Files:**
- Create: `Dockerfile.web`
- Create: `Dockerfile.api`
- Create: `.dockerignore`
- Create: `deploy/api-entrypoint.sh`

- [x] Create a frontend Dockerfile that builds the Vite app and serves `dist` from Nginx.
- [x] Create an API Dockerfile that installs server dependencies, generates Prisma Client, compiles TypeScript, and starts through an entrypoint.
- [x] Create an entrypoint that runs `npx prisma migrate deploy` before `npm run start`.
- [x] Create a `.dockerignore` that excludes local dependencies, build output, logs, Git data, and local secrets.

### Task 2: Compose and Nginx runtime configuration

**Files:**
- Create: `docker-compose.prod.yml`
- Create: `deploy/nginx.conf`
- Create: `.env.production.example`

- [x] Define a `postgres` service with a named volume and healthcheck.
- [x] Define an `api` service that uses `.env`, overrides `DATABASE_URL` to the Compose Postgres hostname, and waits for Postgres health.
- [x] Define a `web` service that exposes Nginx on `127.0.0.1:8080` for a host HTTPS reverse proxy.
- [x] Configure Nginx to serve the PWA and proxy `/api/` to `http://api:3000`.
- [x] Add a production environment template for domain, Google OAuth, LINE Messaging API, reminders, and Postgres credentials.

### Task 3: Deployment documentation and verification

**Files:**
- Modify: `docs/deployment.md`

- [x] Document how to copy `.env.production.example` to `.env` and fill secrets.
- [x] Document Docker Compose build/start commands.
- [x] Document host Nginx reverse proxy and HTTPS commands.
- [x] Document LINE and Google callback URLs.
- [x] Verify app and server builds still pass.
- [x] Verify Docker Compose configuration is syntactically valid.