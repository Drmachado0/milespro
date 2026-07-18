# External Integrations

**Analysis Date:** 2026-05-11

## APIs & External Services

**Supabase (BaaS — primary backend):**
The entire backend lives in a single Supabase project, ref `opusftqbbaozucmbuuug` (`supabase/config.toml:1`, hardcoded fallback in `vite.config.ts:15`). Five Supabase product surfaces are used:

- **Postgres / PostgREST (Database):**
  - Client: `@supabase/supabase-js` ^2.86.0 via `src/integrations/supabase/client.ts`
  - Generated types: `src/integrations/supabase/types.ts` (2,531 lines, `public` schema only)
  - Migrations: 30+ SQL files under `supabase/migrations/20251127*` … `20251218*`
  - Tables backed up by `supabase/functions/backup-database/index.ts:5-18` reveal the core domain: `operations`, `credit_cards`, `holders`, `program_accounts`, `user_subscriptions`, `subscription_history`, `travel_clients`, `client_messages`, `agency_settings`, `profiles`, `user_roles`, `program_market_prices`, plus `promotions`, `user_promotion_reads`, `alerts`, `accumulation_goals`, `price_alerts`, `tasks`, `pending_bonuses`, `club_subscriptions`, `travel_tickets`, `travel_hotel_reservations`, `travel_car_rentals`, `travel_quotes`, `travel_receivables`, `travel_cruises`, `travel_insurances`, `travel_attractions`, `travel_transfers`, `google_calendar_integrations`, `calendar_events`.
  - RPC calls: `supabase.rpc('log_audit_event', ...)` in `src/lib/auditLogger.ts:50` (audit logging bypasses RLS via SECURITY DEFINER function).
  - Sample read/write hooks: `src/hooks/useExpirationAlerts.ts`, `src/hooks/useBadges.ts`, `src/hooks/useOnboarding.ts`, `src/hooks/useMilestoneStats.ts`, `src/hooks/useIssuedTicketsReport.ts`, plus everything in `src/hooks/travel/`.

- **Auth:**
  - Module: `src/contexts/AuthProvider.tsx` (wraps `supabase.auth`)
  - Methods used: `supabase.auth.signUp(...)` (`AuthProvider.tsx:57`), `signInWithPassword(...)` (`AuthProvider.tsx:95`), `signOut()` (`AuthProvider.tsx:113`), `getSession()` (`AuthProvider.tsx:21`), `onAuthStateChange(...)` (`AuthProvider.tsx:30`), `getUser(jwt)` (in every edge function for JWT verification).
  - Session storage: `localStorage` with `autoRefreshToken: true`, `persistSession: true` (`src/integrations/supabase/client.ts:13-17`).
  - Email/password only — no social providers wired.
  - On signup, a `profiles` row is upserted with `plan: 'free'` and onboarding state (`AuthProvider.tsx:79-87`).
  - Auth is paired with audit logging — every login/logout/signup hits `auditAuth.*` in `src/lib/auditLogger.ts:72-103`.

- **Storage (object buckets):**
  Five buckets are referenced from code:
  - `avatars` — user profile pictures (`src/pages/Configuracoes.tsx:260,302,308`, `src/pages/Titulares.tsx:127,133,172,178`)
  - `milhas` — agency logos (private bucket, signed URLs with 1-year expiry; `src/pages/agencia/Configuracoes.tsx:80-89`)
  - `program-icons` — admin-uploaded program icons (`src/pages/sistema/Programas.tsx:215,221,265,271`)
  - `client-attachments` — email attachments for travel clients (`src/hooks/useClientMessages.ts:154,161`; signed URLs generated server-side in `supabase/functions/send-client-email/index.ts:188`)
  - `backups` — JSON snapshots written by the backup edge function (`supabase/functions/backup-database/index.ts:93,103,114,125,131-132`); auto-bucket-create with `createBucket('backups', { public: false })` at `backup-database/index.ts:102`.

- **Realtime (postgres_changes):**
  - Single channel: `supabase.channel('promotions-${Date.now()}')` listening to `postgres_changes` on `public.promotions` for INSERT/UPDATE/DELETE (`src/contexts/PromotionsContext.tsx:210-247`).
  - Triggers in-browser `Notification` push when a new promotion arrives.
  - Has manual reconnect/backoff logic with `MAX_RECONNECT_ATTEMPTS` and exponential delay (`PromotionsContext.tsx:259-279`).
  - This is the **only** realtime subscription in the codebase — no other tables are subscribed.

- **Edge Functions (Deno):** 11 functions under `supabase/functions/`. JWT verification config in `supabase/config.toml:3-34` — most have `verify_jwt = false` and validate tokens manually inside the handler; only `backup-database` uses `verify_jwt = true`.

  | Function | Path | Trigger | External calls |
  |---|---|---|---|
  | `fetch-promotions` | `supabase/functions/fetch-promotions/index.ts` | User-initiated (`src/hooks/useFetchPromotions.ts:22`) | Scrapes 4 sites (melhorescartoes.com.br, passageirodeprimeira.com, livelo.com.br, melhoresdestinos.com.br) → calls **Lovable AI Gateway** at `https://ai.gateway.lovable.dev/v1/chat/completions` with model `google/gemini-2.5-flash` (`fetch-promotions/index.ts:174-217`) using `LOVABLE_API_KEY` |
  | `fetch-market-prices` | `supabase/functions/fetch-market-prices/index.ts` | User-initiated (`src/hooks/useMarketPrices.ts:19,33,88`, `src/pages/gestao/PrecosProgramas.tsx:455`) | Currently uses an **in-memory reference table** (`MARKET_PRICES`, `fetch-market-prices/index.ts:40-81`) covering ~30 Brazilian/intl programs. No live external API call — `refresh` mutates with random ±1 noise to simulate market drift |
  | `get-exchange-rate` | `supabase/functions/get-exchange-rate/index.ts` | User-initiated (`src/hooks/useExchangeRate.ts:15`, 5-min stale) | **AwesomeAPI** (`https://economia.awesomeapi.com.br/json/last/USD-BRL`) primary; **Banco Central do Brasil PTAX** (`https://olinda.bcb.gov.br/olinda/servico/PTAX/.../CotacaoDolarDia`) fallback; hardcoded `5.50` final fallback |
  | `send-client-email` | `supabase/functions/send-client-email/index.ts` | User-initiated (`src/hooks/useClientMessages.ts:105`) | **Resend** API via `https://esm.sh/resend@4.0.0` using `RESEND_API_KEY`. From-address hardcoded to `onboarding@resend.dev` (`send-client-email/index.ts:214`) — see CONCERNS, you can only email the Resend account owner until a domain is verified |
  | `google-calendar-auth` | `supabase/functions/google-calendar-auth/index.ts` | OAuth init/callback/status/disconnect/refresh (`src/hooks/travel/useGoogleCalendar.ts:29,46,67`) | **Google OAuth 2.0** (`https://accounts.google.com/o/oauth2/v2/auth`, `https://oauth2.googleapis.com/token`, `https://oauth2.googleapis.com/revoke`) using `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. Tokens AES-GCM-encrypted with `ENCRYPTION_KEY` before being stored in `google_calendar_integrations` table (`google-calendar-auth/index.ts:181-182`). HMAC-SHA-256 signed `state` parameter for CSRF protection (`google-calendar-auth/index.ts:41-77`) |
  | `sync-calendar-events` | `supabase/functions/sync-calendar-events/index.ts` | User-initiated (`src/hooks/travel/useGoogleCalendar.ts:85,111,135`) | **Google Calendar API v3** (`https://www.googleapis.com/calendar/v3/calendars/{id}/events`) — formats and pushes 7 reservation types (ticket, hotel, car, cruise, insurance, attraction, transfer) with type-specific colorIds. Mapping persisted in `calendar_events` table |
  | `process-club-subscriptions` | `supabase/functions/process-club-subscriptions/index.ts` | **Cron** (auth via `SUPABASE_SERVICE_ROLE_KEY` Bearer or `x-cron-secret` header; `process-club-subscriptions/index.ts:44-61`) | None — pure DB worker. Generates monthly points + initial/recurring bonuses based on `billing_day` and writes new `operations` rows + updates `subscription_history` |
  | `cleanup-old-promotions` | `supabase/functions/cleanup-old-promotions/index.ts` | **Cron** (same auth pattern as `process-club-subscriptions`) | None — deactivates `promotions` >7d old, deletes >30d old, removes orphan `user_promotion_reads` |
  | `backup-database` | `supabase/functions/backup-database/index.ts` | Admin-initiated (requires `user_roles.role = 'admin'`, `verify_jwt = true`) | Reads 12 tables (`backup-database/index.ts:5-18`) → JSON → uploads to Supabase Storage `backups/{date}/full-backup-{ts}.json`; deletes folders >30d old |
  | `mrr-dashboard` | `supabase/functions/mrr-dashboard/index.ts` | User-initiated (`src/hooks/useMRRDashboard.ts`) | None — aggregates `user_subscriptions` rows against in-memory `PLAN_PRICES` (`mrr-dashboard/index.ts:5-11`: free, basic, plus, pro, pro_familia) |
  | `health-check` | `supabase/functions/health-check/index.ts` | External monitoring | None — pings `profiles` table, returns `{ status, supabase_status, version }` |
  | `program-accounts` | `supabase/functions/program-accounts/index.ts` | CRUD wrapper (used by program-account UI) | None — wraps inserts/updates to `program_accounts.password_encrypted` with AES-GCM via `_shared/crypto.ts` so plaintext passwords never sit in the column |

  Shared utilities under `supabase/functions/_shared/`: `cors.ts`, `crypto.ts` (AES-GCM `encrypt` / `decrypt` / `looksEncrypted`, also exposed as `encryptString` / `decryptString`), `validate.ts` (re-exports `zod` + `parseAndValidate`).

  Several functions implement **per-IP in-memory rate limiting** (`fetch-promotions/index.ts:30-44`, `fetch-market-prices/index.ts:23-37`, `send-client-email/index.ts:10-24`).

**Lovable AI Gateway:**
- Endpoint: `https://ai.gateway.lovable.dev/v1/chat/completions`
- Model: `google/gemini-2.5-flash`
- Auth: `LOVABLE_API_KEY` (Deno env)
- Used in: `supabase/functions/fetch-promotions/index.ts:174-217` only — to extract structured promotion data from scraped HTML

**Google APIs:**
- **OAuth 2.0** (`https://accounts.google.com/o/oauth2/v2/auth`, `https://oauth2.googleapis.com/token`, `https://oauth2.googleapis.com/revoke`) — used in `supabase/functions/google-calendar-auth/index.ts` and refreshed inside `supabase/functions/sync-calendar-events/index.ts:88-125`
- **Google Calendar API v3** (`https://www.googleapis.com/calendar/v3/calendars/.../events`) — used in `supabase/functions/sync-calendar-events/index.ts:213,267`
- Scope: `https://www.googleapis.com/auth/calendar.events` (`google-calendar-auth/index.ts:14`)
- Credentials: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (Deno env)

**External quote/pricing APIs:**
- **AwesomeAPI** (`https://economia.awesomeapi.com.br/json/last/USD-BRL`) — USD/BRL spot quote, no auth, called from `get-exchange-rate/index.ts:13`
- **Banco Central do Brasil PTAX** (`https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(...)`) — official daily rate fallback, no auth, called from `get-exchange-rate/index.ts:31`

**Resend (transactional email):**
- Endpoint: SDK `https://esm.sh/resend@4.0.0`
- Auth: `RESEND_API_KEY` (Deno env)
- Used in: `supabase/functions/send-client-email/index.ts:7,213`
- From-address: hardcoded `onboarding@resend.dev` (Resend default sandbox domain) — production sending requires a verified domain

**Web scraping targets** (no auth, scraped by `fetch-promotions`):
- `https://www.melhorescartoes.com.br/c/promocoes-milhas`
- `https://passageirodeprimeira.com/black-friday-2025`
- `https://www.livelo.com.br/ganhe-pontos-parceiros-favoritos`
- `https://www.melhoresdestinos.com.br/promocao-passagens-aereas`

(Defined in `supabase/functions/fetch-promotions/index.ts:5-26`.)

## Data Storage

**Databases:**
- Supabase Postgres (single project, ref `opusftqbbaozucmbuuug`)
  - Connection: managed by `@supabase/supabase-js`; URL + anon key injected via `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` (with hardcoded fallbacks in `vite.config.ts:12-14`)
  - Edge functions connect with `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS
  - Schema source of truth: `supabase/migrations/*.sql` + generated `src/integrations/supabase/types.ts`

**File Storage:**
- Supabase Storage buckets: `avatars`, `milhas`, `program-icons`, `client-attachments`, `backups` (see Storage section above for usage)

**Caching:**
- Client-side: TanStack React Query with mobile-aware staleTime (`src/lib/queryClient.ts:22-24`)
- Service Worker: Workbox runtime caches per origin pattern (`vite.config.ts:94-205`)
  - `api-cache` (Supabase REST, NetworkFirst, 24h)
  - `functions-cache` (Edge Functions, NetworkFirst, 1h)
  - `storage-cache` (Supabase Storage, CacheFirst, 7d)
  - `images-cache`, `fonts-cache`, `google-fonts-stylesheets`, `google-fonts-webfonts`, `static-resources`
  - Auth endpoints (`/auth/*`) explicitly NetworkOnly (no caching for security)
- Server-side: none beyond Postgres / Supabase managed cache

## Authentication & Identity

**Auth Provider:** Supabase Auth (email + password only)
- Frontend: `src/contexts/AuthProvider.tsx` exposing `signUp`, `signIn`, `signOut`, `user`, `session`, `loading`
- Route gating: `src/components/ProtectedRoute.tsx` (auth required) and `src/components/PlanProtectedRoute.tsx` (plan tier required: `plus`, `pro` for VIP/agency routes — see `src/App.tsx:143,157-171`)
- Session changes clear React Query cache to prevent cross-user data leakage (`AuthProvider.tsx:35-39, 112`)
- Audit logging: every auth event hits `auditAuth.*` in `src/lib/auditLogger.ts:72-103` which RPCs into `log_audit_event`
- Role-based admin gate: `user_roles.role = 'admin'` checked manually in `backup-database/index.ts:45-53`
- A second `supabaseAdmin` client (service-role) is conditionally created in `src/integrations/supabase/client.ts:22-29` if `VITE_SUPABASE_SERVICE_ROLE_KEY` is set — **this exposes service-role to the browser if the env var is ever defined client-side**, see CONCERNS.

## Monitoring & Observability

**Error Tracking:** None wired (no Sentry / Rollbar / Bugsnag dependency in `package.json`). Errors go to in-memory `logger` (`src/lib/logger.ts`) which is a no-op in production.

**Logs:**
- Client: `src/lib/logger.ts` — `console.log/error/warn/info/debug` only when `import.meta.env.DEV` is true; production = no-op
- Edge functions: raw `console.log` / `console.error`, surfaced via Supabase Edge Function logs in the dashboard

**Audit trail:**
- `src/lib/auditLogger.ts` writes to `audit_logs` (table presence inferred from `log_audit_event` RPC) for auth, exports, settings changes, sensitive data access, bulk ops
- Captures `event_type`, `event_category`, `description`, `metadata`, `user_agent` (no client IP — `auditLogger.ts:55`)

**Analytics — three coexisting systems:**
- **Google Analytics 4** (`G-76K94DJ792`) loaded inline in `index.html:69-75` via `gtag.js`; wrapper in `src/lib/analytics.ts` exposes `trackPageView`, `trackBillingPeriodChange`, `trackPlanView`, `trackSignupStart`, `trackConversion`, `trackScrollDepth`, `trackSectionView`, `trackFAQExpand`, `trackTestimonialView`, `trackComparisonView`, `trackDemoVideoClick`. Hook: `src/hooks/useAnalytics.ts`.
- **PostHog** — **mock implementation only** (`src/lib/posthog.ts`). The file is a stub that logs via `logger.debug` and never calls real PostHog. Comment at `src/lib/posthog.ts:1-8` documents the intended migration path: `npm install posthog-js`, set `VITE_POSTHOG_KEY` + `VITE_POSTHOG_HOST`, replace stub. Bootstrap reads `VITE_POSTHOG_KEY` in `src/main.tsx:7-10` and pageviews fire from `src/App.tsx:104-106` — but they currently log to noop. **`posthog-js` is NOT a dependency** in `package.json`.
- **Internal MRR dashboard** via `supabase/functions/mrr-dashboard/index.ts` + `src/hooks/useMRRDashboard.ts` — aggregates `user_subscriptions` for ARR/MRR view.

**Health checks:**
- `supabase/functions/health-check/index.ts` returns service+DB status (intended for external uptime monitoring)

**CSP:**
- Strict Content-Security-Policy meta tag in `index.html:7` whitelists Supabase REST + WSS, Google Analytics, Google Tag Manager, Google Fonts, `storage.googleapis.com`. **Note:** PostHog domains are not in the CSP, so enabling real PostHog will require updating CSP first.

## CI/CD & Deployment

**Hosting:**
- **Web:** Static SPA. Canonical domain `https://milespro.net.br/` (per `index.html:12`). Lovable preview deploy at `https://e39f4ef4-c00a-4d6e-8e5c-8722bb465399.lovableproject.com` (per `capacitor.config.ts:8`). The deployer is not in repo (likely Lovable platform / external static host).
- **Backend:** Supabase managed (Postgres, Auth, Storage, Realtime, Edge Functions all in project `opusftqbbaozucmbuuug`)
- **Mobile:** Capacitor 7 shells under `android/` (gradle build) and `ios/App/` (Xcode project). Both currently configured to load remote `lovableproject.com` URL via `capacitor.config.ts:8` instead of bundled `dist/`.

**CI Pipeline:**
- GitHub Actions: `.github/workflows/ci.yml`
- Triggers: `push` / `pull_request` on `main`, `master`, `develop`
- Jobs:
  - `quality` (Node 22): `npm ci` → `npm run lint` → `npm run typecheck` → `npm run build` → bundle size summary → upload `dist-{sha}` artifact (7-day retention)
  - `audit` (Node 22, `continue-on-error: true`): `npm audit --omit=dev --audit-level=high`
- Build secrets: `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`
- **`npm run test` is NOT executed in CI** despite 17 vitest files / 93+ passing tests existing locally.

**Edge function deployment:**
- Manual via Supabase CLI / dashboard (no CI step). `supabase/config.toml` is committed and controls `verify_jwt` flags per function.

## Environment Configuration

**Required env vars (client, prefixed `VITE_`):**
- `VITE_SUPABASE_URL` — Supabase project URL (fallback hardcoded in `vite.config.ts:12`)
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/publishable key (fallback hardcoded in `vite.config.ts:13-14`)
- `VITE_SUPABASE_PROJECT_ID` — Supabase project ref (fallback hardcoded in `vite.config.ts:15`)

**Optional client env vars:**
- `VITE_SUPABASE_SERVICE_ROLE_KEY` — if set, creates a service-role client in the browser (DANGEROUS, see CONCERNS); read at `src/integrations/supabase/client.ts:7`
- `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` — currently no-op (stub implementation)
- `VITE_SALES_WHATSAPP` — international phone digits for sales WhatsApp link (`src/pages/Assinatura.tsx:245`)
- `VITE_ENABLE_SUBSCRIPTION_LEADS` — `"true"` to enable lead capture writes (`src/lib/subscriptionLeads.ts:39`); guard exists because the migration `20260510220500_create_subscription_leads.sql` is referenced in `.env.example:8` and may not be applied yet

**Required server env vars (Supabase Edge Function dashboard):**
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (auto-injected by Supabase)
- `LOVABLE_API_KEY` — Lovable AI Gateway (`fetch-promotions`)
- `RESEND_API_KEY` — Resend transactional email (`send-client-email`)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth (`google-calendar-auth`, `sync-calendar-events`)
- `ENCRYPTION_KEY` — AES-GCM key for `_shared/crypto.ts` (encrypts Google tokens, `program_accounts.password_encrypted`)
- `CRON_SECRET` — alternate auth for cron-triggered functions (`process-club-subscriptions`, `cleanup-old-promotions`)

**Secrets location:**
- Client: GitHub Actions repository secrets (`VITE_SUPABASE_*`); `.env.example` shows local override structure; `.env` is gitignored
- Server: Supabase project dashboard → Edge Functions → Secrets

**`.npmrc`:** `legacy-peer-deps=true` (no auth tokens)

## Webhooks & Callbacks

**Incoming:**
- `https://{SUPABASE_URL}/functions/v1/google-calendar-auth?action=callback` — Google OAuth redirect URI (`supabase/functions/google-calendar-auth/index.ts:166`); validates HMAC-signed `state` and exchanges code for tokens

**Outgoing:**
- Resend → email delivery (no return webhook configured)
- Google Calendar event push (`POST/PUT/DELETE` to `calendar/v3/calendars/{id}/events`)
- Google OAuth token revoke (`POST https://oauth2.googleapis.com/revoke?token=...`)

**Cron-triggered (Supabase scheduled jobs, configured externally):**
- `process-club-subscriptions` — daily, generates monthly points/bonuses for active club subscriptions
- `cleanup-old-promotions` — periodic, deactivates >7d / deletes >30d / removes orphan reads
- Both authenticate via `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}` or `x-cron-secret` header

## Notable Browser/Native APIs (no SDK)

- **Web Notifications API** — `src/hooks/useNotifications.ts` and `src/contexts/PromotionsContext.tsx:230` push browser notifications when new promotions arrive via Realtime
- **Vibration API** — `navigator.vibrate(...)` in `src/lib/haptics.ts:33` provides haptic feedback (mobile web). **No Capacitor Haptics plugin is used** despite Capacitor being installed.
- **Service Worker** — registered by `vite-plugin-pwa` with workbox runtime caching (`vite.config.ts:39-208`)
- **Online/offline detection** — `src/hooks/useNetworkStatus.ts`, `src/lib/offlineQueue.ts`, `src/contexts/OfflineSyncContext.tsx`

## Mobile Platform Integration

- Capacitor 7.4.4 wraps the SPA into iOS/Android apps. Configuration in `capacitor.config.ts`:
  - `appId: app.lovable.e39f4ef4c00a4d6e8e5c8722bb465399`, `appName: milespro`
  - `webDir: dist` declared, but `server.url` overrides this to load `https://e39f4ef4-c00a-4d6e-8e5c-8722bb465399.lovableproject.com?forceHideBadge=true` — meaning the native shell currently loads the remote Lovable preview rather than bundled assets
  - Plugins config (no JS imports though): `SplashScreen` (2s, dark bg), `Keyboard` (resize body, dark style), `StatusBar` (dark, `#171717`)
  - iOS: `contentInset: 'automatic'`, `preferredContentMode: 'mobile'`
  - Android: `allowMixedContent: true`, `captureInput: true`, `webContentsDebuggingEnabled: false`
- **Zero `@capacitor/*` imports exist in `src/`** — mobile-specific behavior currently goes through Web APIs (Notification, Vibration), so the Capacitor shells are essentially WebView wrappers without native bridge usage.

---

*Integration audit: 2026-05-11*
