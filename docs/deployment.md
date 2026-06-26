# Quick Volta Docker Deployment

This guide deploys Quick Volta at:

```txt
https://flash.20030131.xyz
```

The production Docker setup contains three services:

- `web`: Nginx serving the built Vite PWA and proxying `/api/` to the API service.
- `api`: Node/Fastify API. It runs `prisma migrate deploy` before starting.
- `postgres`: PostgreSQL 16 with persistent Docker volume storage.

The Docker `web` service binds to `127.0.0.1:8080`; use the host Nginx/Caddy to terminate HTTPS and proxy traffic to it.

## 1. Server prerequisites

Install Docker and Docker Compose plugin on the server.

Ubuntu example:

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg nginx certbot python3-certbot-nginx
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Log out and back in after adding your user to the `docker` group, or prefix Docker commands with `sudo`.

## 2. DNS

Create an `A` record:

```txt
flash.20030131.xyz -> your_server_public_ipv4
```

Wait until DNS resolves before requesting HTTPS certificates.

## 3. Prepare configuration

Clone or upload the project, then create the production env file:

```bash
cd quick-volta
cp .env.production.example .env
nano .env
```

Use these public URL values:

```env
APP_BASE_URL=https://flash.20030131.xyz
API_BASE_URL=https://flash.20030131.xyz
GOOGLE_CALLBACK_URL=https://flash.20030131.xyz/api/auth/google/callback
REMINDER_CRON_ENABLED=true
REMINDER_CHECK_INTERVAL_MINUTES=30
```

Set a strong database password:

```env
POSTGRES_USER=quick_volta
POSTGRES_PASSWORD=replace-with-a-long-random-database-password
POSTGRES_DB=quick_volta
```

Do not set `DATABASE_URL` manually for Docker Compose production. `docker-compose.prod.yml` builds it from `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` so the API connects to the `postgres` container.

Fill these secrets from Google and LINE:

```env
SESSION_SECRET=at-least-32-random-characters
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
LINE_CHANNEL_SECRET=...
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_BOT_ADD_FRIEND_URL=https://line.me/R/ti/p/@your-bot-basic-id
```

## 4. Configure Google OAuth

In Google Cloud Console, add this Authorized redirect URI:

```txt
https://flash.20030131.xyz/api/auth/google/callback
```

## 5. Configure LINE Messaging API

In LINE Developers Console, set the Messaging API webhook URL:

```txt
https://flash.20030131.xyz/api/line/webhook
```

Then enable **Use webhook**.

The add-friend URL in `.env` should look like:

```env
LINE_BOT_ADD_FRIEND_URL=https://line.me/R/ti/p/@239euigr
```

## 6. Build and start Docker services

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Check service status:

```bash
docker compose -f docker-compose.prod.yml ps
```

Read logs:

```bash
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f web
```

The API container runs database migrations automatically on startup.

## 7. Configure host Nginx and HTTPS

Create a host Nginx site:

```bash
sudo nano /etc/nginx/sites-available/quick-volta
```

Paste:

```nginx
server {
    listen 80;
    server_name flash.20030131.xyz;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/quick-volta /etc/nginx/sites-enabled/quick-volta
sudo nginx -t
sudo systemctl reload nginx
```

Request a Let's Encrypt certificate:

```bash
sudo certbot --nginx -d flash.20030131.xyz
```

## 8. Smoke tests

After HTTPS is active:

```bash
curl https://flash.20030131.xyz/api/health
```

Expected:

```json
{"ok":true}
```

Then open:

```txt
https://flash.20030131.xyz
```

Sign in with Google, open Settings, generate a LINE binding code, add the LINE bot, send the code to the bot, then use **Send LINE test message**.

## 9. Updating the app

On the server:

```bash
cd quick-volta
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## 10. Backup database

Create a backup:

```bash
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U quick_volta quick_volta > quick-volta-backup.sql
```

Restore example:

```bash
cat quick-volta-backup.sql | docker compose -f docker-compose.prod.yml exec -T postgres psql -U quick_volta quick_volta
```

## 11. Useful troubleshooting

Check API logs:

```bash
docker compose -f docker-compose.prod.yml logs --tail=200 api
```

Check Nginx container logs:

```bash
docker compose -f docker-compose.prod.yml logs --tail=200 web
```

Restart services:

```bash
docker compose -f docker-compose.prod.yml restart
```

Stop services without deleting data:

```bash
docker compose -f docker-compose.prod.yml down
```

Delete all production database data only if you intentionally want a clean database:

```bash
docker compose -f docker-compose.prod.yml down -v
```