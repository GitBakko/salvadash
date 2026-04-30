# SalvaDash — Project Guide

Personal-savings tracker PWA. Italian-first, English supported. Single-tenant per user, multi-user via invite.

## Stack

| Layer    | Tech                                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------------ |
| Frontend | React 19, Vite 6, TanStack Router (file-based) + Query, Zustand, Tailwind v4, Recharts, Dexie, i18next, PWA              |
| Backend  | Express 4, Prisma 7 (`@prisma/adapter-pg`), PostgreSQL 16, JWT (httpOnly cookies), Nodemailer, web-push, node-cron, XLSX |
| Shared   | Zod schemas + TS types — single source of truth for API contract                                                         |
| Infra    | pnpm monorepo, Docker (Postgres dev), PM2 + IIS (Windows Server prod), GitHub Actions CI                                 |

Node ≥ 20, pnpm ≥ 9. Workspaces: `frontend`, `backend`, `shared`.

## Layout

```
backend/src/
  config/         env-driven config (jwt, smtp, vapid, backup)
  lib/            prisma, auth (jwt+bcrypt), calculations (dashboard/analytics), backup, push, email-templates
  middleware/     auth.ts (authenticate + requireRole RBAC; ROOT bypasses)
  routes/         auth, accounts, income-sources, entries, data, admin, notifications, push, backup, invite-codes, version
  generated/prisma  Prisma client output (committed-out, regen via db:generate)
frontend/src/
  routes/         file-based; __root layout handles auth-gating + PWA shell
  components/     UI (Header, BottomNav, modals, ui/ primitives)
  hooks/          queries.ts (TanStack Query bindings), use-offline-sync, use-push
  lib/            api.ts (fetch wrapper + auto-refresh on 401), db.ts (Dexie cache), format.ts
  stores/         zustand: auth-store, theme-store, ui-store
  i18n/           it.json, en.json
shared/src/
  schemas/        Zod (user, account, entry, income-source, invite-code, notification, admin)
  types/          UserPublic, AccountPublic, EntryPublic, DashboardData, AnalyticsData, …
  version.ts, changelog.ts
```

## Data model (Prisma)

`User (ROOT|ADMIN|BASE)` → `Account (MAIN|SUB)` → `EntryBalance`
`User` → `IncomeSource` → `EntryIncome`
`MonthlyEntry` aggregates one month's `EntryBalance[]` + `EntryIncome[]`.
Plus `InviteCode` (single-use), `Notification`, `PushSubscription`, `BackupLog`.
All money: `Decimal(12,2)`. Most relations cascade-delete.

## API conventions

- Mount: `app.use('/api', apiRoutes)`. All routes return `{ success: boolean, data?, error?, details? }`.
- Auth: `accessToken` cookie (15m, path `/`) + `refreshToken` (7d, path `/api/auth/refresh`), httpOnly. `secure+strict` in prod.
- Validation: every body via `safeParse`. On fail: 400 + `parsed.error.flatten()` in `details`.
- Most routers do `router.use(authenticate)` at top. Admin/backup/invite-codes also `requireRole('ADMIN','ROOT')`.
- Frontend `api.ts`: on 401 (except `/auth/refresh`,`/auth/login`) auto-calls refresh once, retries.

## Calculations

`backend/src/lib/calculations.ts` is the pure dashboard/analytics core. Routes (`/data/dashboard`, `/data/analytics`, `/data/export/json`) are thin wrappers. Money math uses `Decimal` → number conversion via `toNumber`. Filtered to entries with non-zero balances.

## Build & Run

```bash
pnpm install
docker compose up -d            # Postgres
cp .env.example .env            # then edit
pnpm db:generate && pnpm db:push
pnpm dev                        # backend :3000, frontend :5173
pnpm build                      # shared → backend → frontend
pnpm test                       # vitest both sides
```

Prod: `pm2 start backend/ecosystem.config.json`; IIS reverse-proxy `/api`,`/uploads` → `:3000`, SPA fallback for `/*`. Full guide in `DEPLOY-GUIDA-IIS.md`.

## Production environment

| Component       | Detail                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------- |
| Public URL      | `https://salvadash.epartner.it`                                                                 |
| App server      | Windows Server 2019                                                                             |
| App path        | `E:\www\salvadash\` (frontend `frontend\dist\`, backend root, `backend\uploads\`)               |
| App runtime     | Node.js 20 + PM2 (process `salvadash-api` on `:3000`), IIS reverse-proxy on `:80`/`:443`        |
| DB server       | Windows Server 2019 (separate host)                                                             |
| DB engine       | PostgreSQL 18                                                                                   |
| DB endpoint     | `192.168.3.243:5432/salvadash`                                                                  |
| DB data dir     | `E:\postresql\data` (note: actual folder name lacks the `g`)                                    |
| DB pg_hba.conf  | App access via `host salvadash salvadash 192.168.3.0/24 md5`; superuser only via `127.0.0.1/32` |
| DB service name | `postgresql-x64-18`                                                                             |

**Currently running in prod:** check `/api/health` or footer version badge. Upgrade procedure per release in `dist-release/<version>/UPGRADE-<version>.md`.

## Conventions / gotchas

- Routes import Prisma client from `../generated/prisma/client.js` (Prisma 7 ESM output, post-build script `fix-prisma-esm.mjs`). Adapter `PrismaPg` strips `?schema=` before passing URL to `pg`.
- Compiled `.d.ts`/`.js`/`.js.map` files sit next to `.ts`/`.tsx` in `frontend/src/` — they are build outputs. Edit only `.ts`/`.tsx`.
- Avatar upload: multer disk-storage to `backend/uploads/avatars/`, served via `/uploads`. 2 MB limit, jpg/png/webp.
- Excel import (`/data/import`) reads sheet header row as month-columns; rows with label matching account or income-source name. Unknown labels skipped.
- Auth flows respond 200 on `forgot-password` and `resend-verification` regardless (anti-enumeration).
- `lastSeenVersion` triggers `WhatsNewModal` on first login post-update.
- Service worker + Dexie cache: `cacheEntries`/`cacheAccounts`/`cacheDashboard` keyed by `userId`. Clear on logout via `clearUserCache`.
- Conventional Commits enforced; commits in Italian or English fine.

## Known refactor surfaces (active)

- `frontend/src/routes/admin.lazy.tsx` (~1.2k lines) — multiple sections in one file (overview, users, invite codes, backups, maintenance). Pre-existing `any`/unused warnings. Split when next touched.
- `frontend/src/routes/settings.lazy.tsx` (~930 lines) — profile, password, currency, language, notifications, push, data export/import, reset. Split by section when next touched.

**Closed in v1.2.0 (impeccable remediation):**

- `frontend/src/hooks/queries.ts` → split per-domain under `hooks/queries/` (barrel re-exports)
- `frontend/src/components/AccountFilterBar.tsx` → exports pure `toggleAccountId` for testing
- Dashboard/Analytics/History/Settings routes split into route-config + `.lazy.tsx` for code-splitting
- YearPills extracted from `routes/index.tsx`
- AccountForm extracted from `AccountFormModal` for full-screen route reuse
- Backend boilerplate consolidated via `lib/http.ts` (`asyncHandler`, `respondValidation`) and `lib/entries-shared.ts` (`entryInclude`, `formatEntry`, `validateUserOwnership`)

## Scripts

`pnpm dev` `pnpm build` `pnpm test` `pnpm lint` `pnpm format` `pnpm db:{generate,migrate,push,seed,studio}` `pnpm clean`.
