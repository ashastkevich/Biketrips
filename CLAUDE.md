# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Repository guidelines (structure, branch workflow, commit style, security notes) live in AGENTS.md and apply here too:

@AGENTS.md

## Commands

npm workspaces monorepo (Node 22). Package names: `@biketrips/web`, `@biketrips/api`, `@biketrips/bot`, `@biketrips/domain`, `@biketrips/api-client`, `@biketrips/config`.

```bash
docker compose up -d postgres redis          # local Postgres 16 + Redis 7 (only via Docker)
npm run migration:run -w @biketrips/api      # apply TypeORM migrations
npm run dev:api                              # API on :4000, Swagger at :4000/docs
npm run dev:web                              # Next.js on :3000
npm run dev:bot                              # Telegram bot worker
npm run storybook                            # web component stories on :6006
npm run lint && npm run typecheck && npm test   # same checks CI runs
npx vitest run apps/api/src/modules/trips/trips.service.test.ts   # single test file
npx vitest run -t "applies public filters"                        # single test by name
```

- Vitest runs from the repo root (`vitest.config.ts`) across all workspaces; there are no per-package test runners.
- Do not run `next build` while `next dev` is running: both use `.next` and the dev server loses CSS/manifests.
- More setup and troubleshooting: `docs/local-development.md` (Russian). Production/deploy context: `docs/production-operations.md`.

## Architecture

Three runtime apps share code through workspace packages that export TypeScript source directly (`exports: "./src/index.ts"`, no build step needed for consumers).

- `packages/domain`: the shared contract. Enum-like `as const` arrays (trip/participant/moderation statuses, difficulty, bike types, etc.), DTO-shaped interfaces (`TripSummary`, `TripDetail`, `CreateTripInput`...), and business rules such as `canJoinTrips` / `canCreateTrips` and slug generation. Changes to API shapes usually start here.
- `packages/api-client`: `BikeTripsApiClient`, a typed fetch wrapper over the REST API, used by web and bot. New endpoints need a method here.
- `packages/config`: env helpers (`readPortEnv`, `readOptionalEnv`) and shared tsconfig presets.

### API (`apps/api`, NestJS + TypeORM + PostgreSQL)

- ESM (`"type": "module"`): relative imports must use `.js` extensions.
- Modules in `src/modules/*` follow controller -> service -> `@InjectRepository` repositories (see `docs/architecture.md`). Entities live centrally in `src/infrastructure/database/entities/`. Global `ValidationPipe` with `whitelist: true` validates class-validator DTOs in each module's `dto/`.
- `trips.serializer.ts` maps entities to domain response shapes; don't return entities directly.
- Auth: JWT bearer tokens (`modules/auth`), issued after email-code or Telegram deep-link (one-time nonce) login. Permission guards in `access.guards.ts` call the domain rules (e.g. `canCreateTrips`) so web and API share one policy.
- `synchronize: false`. Schema changes require a migration in `src/infrastructure/database/migrations/` **and** registering its class in `data-source.ts` (the migration runner uses that explicit list).
- Uploaded route files and cover images are written to the local `storage/` directory (relative to cwd).

### Web (`apps/web`, Next.js 15 App Router, React 19, CSS modules)

- Pages are mostly server components that call the API server-side via `app/lib/api.ts`, which builds a `BikeTripsApiClient` with the JWT from the `biketrips_session` cookie. Server API base URL comes from `API_INTERNAL_URL` (fallback `NEXT_PUBLIC_API_URL`).
- `app/api/**/route.ts` are Next route handlers acting as a BFF for client-side actions (auth flows, participation, cover uploads, profile) and for server-only third-party keys (DaData geocoding). `app/api/auth/dev-session` issues dev-only sessions for test users (user/creator/admin).
- Maps use MapLibre with MapTiler (`app/maps`). UI copy is in Russian; display labels for domain enums are in `app/lib/labels.ts`.

### Bot (`apps/bot`)

Single-file worker (`src/index.ts`) that long-polls Telegram `getUpdates` to confirm Telegram logins and processes notification jobs by claiming them from the API (`/internal/notifications/claim`, then `/complete`). It sends Telegram messages and transactional email via the UniSender HTTPS API (SMTP is blocked in production). Notification jobs are rows in Postgres (`NotificationJobEntity`). Redis runs in Docker Compose, but no app code uses it yet (BullMQ in `docs/architecture.md` is still planned).

### Tests

API service tests construct services directly with hand-rolled `vi.fn()` repository mocks (no Nest testing module or real DB). Web route handler tests sit next to their `route.ts`.

## Deployment

CI (`.github/workflows/ci.yml`) runs lint, typecheck and tests. Pushing to `origin/main` triggers `deploy.yml`, which SSHes to the server and runs `/usr/local/bin/biketrips-deploy`. Per AGENTS.md, only push when the user asks.
