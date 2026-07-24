# Production operations

This document is the operational memory for BikeTrips production deployment.
Keep it current when deployment, hosting, email, or infrastructure changes.

## Development and release workflow

Development happens locally on this machine. Local changes must stay local until
they are intentionally committed and pushed.

Production is updated only from the remote GitHub `main` branch:

1. Develop locally.
2. Run local checks, at minimum:

   ```bash
   npm run typecheck
   npm test
   ```

3. Commit the change.
4. Push to `origin main`.
5. GitHub Actions runs `.github/workflows/deploy.yml`.
6. The production server pulls `origin/main`, builds, runs migrations, and
   restarts services.

Do not edit production source files as a long-term fix. Temporary server edits
are acceptable for emergency verification, but the fix must be committed and
pushed to `origin/main` so the next deploy does not revert it.

## Production server

- Provider: Selectel cloud server.
- Public IP: `135.106.155.78`.
- Public web URL: `https://biketrips.ru`.
- Alternate web URL: `https://www.biketrips.ru`.
- Public backend health URL: `https://biketrips.ru/backend/health`.
- OS: Ubuntu 24.04 LTS.
- Size: 2 vCPU, 4 GB RAM, 32 GB NVMe SSD.
- SSH access used during setup: `root@135.106.155.78`.
- Deploy user: `deploy`.
- App directory: `/srv/biketrips/app`.
- Server deploy script: `/usr/local/bin/biketrips-deploy`.
- Production env file: `/etc/biketrips/biketrips.env`.
- Production Compose file: `/srv/biketrips/docker-compose.production.yml`.

Open inbound ports are intentionally minimal:

- `22/tcp` for SSH.
- `80/tcp` for HTTP redirect to HTTPS.
- `443/tcp` for HTTPS.

HTTPS is enabled through Let's Encrypt/certbot for `biketrips.ru` and
`www.biketrips.ru`. The certificate is stored under
`/etc/letsencrypt/live/biketrips.ru/` and certbot's system timer handles
automatic renewal.

## Production services

Production runs on one virtual machine:

- `biketrips-web.service`: Next.js web app on `127.0.0.1:3000`.
- `biketrips-api.service`: NestJS API on `127.0.0.1:4000`.
- `biketrips-bot.service`: Telegram bot worker. At the time of writing the bot
  app is still a scaffold that exits successfully, so the service may be
  `inactive` without indicating a production incident.
- `nginx.service`: reverse proxy.
- Docker containers:
  - `biketrips-postgres`, bound to `127.0.0.1:5432`.
  - `biketrips-redis`, bound to `127.0.0.1:6379`.

Nginx routes:

- `/` proxies to Next.js.
- `/backend/` proxies to the NestJS API.
- Next.js owns its own `/api/...` route handlers, so do not proxy all `/api`
  traffic directly to NestJS.

Useful production checks:

```bash
ssh root@135.106.155.78 'systemctl is-active biketrips-api.service biketrips-web.service nginx.service docker.service'
ssh root@135.106.155.78 'curl -sS http://127.0.0.1/backend/health'
ssh root@135.106.155.78 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'
ssh root@135.106.155.78 'cd /srv/biketrips/app && sudo -u deploy git log -1 --oneline'
```

## GitHub Actions deployment

Workflow file:

- `.github/workflows/deploy.yml`

The workflow runs on push to `main` and can also be started manually with
`workflow_dispatch`. It connects over SSH as `deploy` and runs:

```bash
sudo /usr/local/bin/biketrips-deploy
```

Required GitHub Actions secrets:

- `SERVER_HOST`: production host, currently `135.106.155.78`.
- `SERVER_USER`: currently `deploy`.
- `SERVER_SSH_KEY`: private SSH key whose public key is in
  `/home/deploy/.ssh/authorized_keys`.

The server deploy script:

1. Fetches and hard-resets `/srv/biketrips/app` to `origin/main`.
2. Starts Postgres and Redis through production Docker Compose.
3. Runs `npm ci`.
4. Builds workspaces.
5. Runs API migrations.
6. Restarts API, web, and bot systemd services.

## Production environment

Real production values live only on the server and in GitHub Actions secrets.
Do not commit real secrets.

Important env names:

- `NODE_ENV=production`
- `WEB_PORT=3000`
- `API_PORT=4000`
- `NEXT_PUBLIC_API_URL=https://biketrips.ru/backend`
- `API_CORS_ORIGIN=https://biketrips.ru`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `EMAIL_CODE_SECRET`
- `EMAIL_FROM`
- `UNISENDER_API_URL`
- `UNISENDER_API_KEY`
- `NEXT_PUBLIC_MAPTILER_API_KEY`
- `DADATA_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`

## Email delivery

Production email login codes are sent through the UniSender transactional Web
API over HTTPS:

- Default endpoint:
  `https://goapi.unisender.ru/ru/transactional/api/v1/email/send.json`.
- API key env: `UNISENDER_API_KEY`.
- The code supports `SMTP_PASSWORD` as a compatibility fallback for the API key,
  but prefer explicit `UNISENDER_API_KEY` for new configuration.

Do not rely on SMTP from the Selectel VM. Selectel blocks outbound SMTP ports
`25`, `465`, and `587`, which caused email login requests to hang before the app
was switched to the UniSender HTTPS API.

If email login fails:

1. Check API logs:

   ```bash
   ssh root@135.106.155.78 'journalctl -u biketrips-api.service -n 120 --no-pager'
   ```

2. Check HTTPS connectivity to UniSender from the server.
3. Check the UniSender API response logged by `[BikeTrips] UniSender email
   delivery failed`.

## Known production notes

- The site now runs over HTTPS on `biketrips.ru`. The web route handlers use the
  incoming request protocol to decide the cookie `secure` flag, so session
  cookies are secure on the HTTPS domain while still behaving correctly in local
  HTTP development.
- The API currently runs in production through:

  ```bash
  npx tsx --tsconfig apps/api/tsconfig.json apps/api/src/index.ts
  ```

  This is a deployment workaround because `node dist/index.js` currently hits an
  ESM/TypeORM circular metadata runtime error around `OrganizerEntity` and
  `UserEntity`. Fix that code issue before switching systemd back to
  `npm run start -w @biketrips/api`.
- Backups are not configured yet. Add PostgreSQL backups before collecting
  valuable production data.
