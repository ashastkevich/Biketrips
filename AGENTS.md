# Repository Guidelines

## Project Structure & Module Organization

This repository contains the BikeTrips MVP TypeScript monorepo, planning documents, and shared assets for the web app.

- `docs/` contains product and architecture notes, including `project-overview.md`, `architecture.md`, and `mvp-implementation-plan.md`.
- `docs/production-operations.md` contains production deployment, server, email, and operations context. Read it before deployment, hosting, authentication, email, or production-debugging work.
- `apps/web` is the Next.js web app scaffold.
- `apps/web/public/img` stores local visual assets used by the web app.
- `apps/api` is the Node.js API scaffold before the NestJS implementation stage.
- `apps/bot` is the Telegram bot worker scaffold.
- `packages/domain`, `packages/api-client`, and `packages/config` contain shared domain types, API client code, and common config/env helpers.

Keep new planning material in `docs/` and web assets in `apps/web/public/img/`.

## Build, Test, and Development Commands

The monorepo uses npm workspaces. Common commands:

- `npm install` installs workspace dependencies.
- `npm run dev:web` starts the Next.js app.
- `npm run dev:api` starts the local API scaffold.
- `npm run dev:bot` starts the bot worker scaffold.
- `npm run lint` runs ESLint.
- `npm run typecheck` checks TypeScript across workspaces.
- `npm test` runs the automated tests.
- `npm run build` builds all buildable workspaces.
- `docker compose up -d postgres redis` starts local PostgreSQL and Redis.
- Use `git status` before and after changes to review the working tree.
- Use `rg "text"` to search project content quickly.

Local development and production deployment are deliberately separate. Develop
and test locally first. Production updates only after pushing committed changes
to remote `main`, which triggers GitHub Actions and the server deploy script.
Do not treat temporary SSH edits on production as the final source of truth;
commit and push the fix to `origin/main`.

## Coding Style & Naming Conventions

Use clear, semantic HTML and keep CSS organized by component or section.

Naming guidelines:

- Use kebab-case for CSS classes, for example `ride-card` and `search-toolbar`.
- Use lowercase, descriptive filenames for docs, for example `mvp-implementation-plan.md`.
- Keep image names descriptive. Existing legacy names such as `Photo1.jpg` may remain in `apps/web/public/img/`, but new assets should use meaningful names.

Prefer ASCII text unless a file already uses Russian copy or another clear project need requires non-ASCII content.

## Testing Guidelines

Automated tests are configured with Vitest. Run `npm test` before handing off code changes.

For web UI changes, manually verify:

- desktop and mobile responsive layout;
- image paths and rendering;
- anchor navigation;
- readable text contrast;
- no obvious overflow or overlapping UI.

For the planned MVP, add focused backend tests for trips, participants, limits, and waitlists; web smoke tests for the feed, trip page, creation form, and signup flow; and bot tests for queued Telegram notifications.

## Commit & Pull Request Guidelines

Recent commits use short imperative messages in sentence case, for example `Optimize card images` and `Organize project documentation`. Continue that style:

```text
Add MVP implementation plan
Update trip card layout
Document local setup
```

Pull requests should include:

- a short summary of the change;
- screenshots for visual changes;
- notes about manual testing performed;
- links to relevant issues or planning docs when applicable.

## Security & Configuration Tips

Do not commit secrets, Telegram bot tokens, database credentials, or production environment files. When application setup begins, add `.env.example` with safe placeholder values and keep real `.env` files ignored.

Production currently runs on `135.106.155.78` behind nginx. Web traffic is served
over HTTP by IP until a domain and HTTPS are configured. Email login uses the
UniSender transactional HTTPS API, not SMTP, because the production provider
blocks outbound SMTP ports.
