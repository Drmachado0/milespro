# Codebase Concerns

**Analysis Date:** 2026-05-11

> Honest assessment of the `miles-pro-hub` codebase for prioritization purposes.
> Scope: ~1,285 commits over ~6 months, 93 vitest tests passing, React 18 + TS + Vite + Supabase + Capacitor.
> The single biggest finding is **plan gating is purely client-side** for agency tables — see Security section.

---

## Tech Debt

### Oversized page components (god components)

Multiple page-level components have grown past 500 LOC, often combining data fetching, form state, business logic, and presentation in a single file. They are hard to test, hard to refactor, and slow `react-refresh` HMR.

| File | Lines | Notes |
|------|-------|-------|
| `src/components/landing/AnimatedSections.tsx` | 1344 | Marketing landing page; mixes 6+ sections into one module. Module-level `IS_MOBILE` const computed at import time (line ~22) prevents proper SSR/test rendering. Zero `useMemo`. |
| `src/pages/agencia/Orcamentos.tsx` | 1131 | Travel quotes page. 4 `useMemo` for ~10 useState blocks; multiple filters + dialog + PDF generation in one file. |
| `src/pages/agencia/Passagens.tsx` | 1069 | 5 `useMemo`. Heavy churn (28 commits since November). |
| `src/pages/Configuracoes.tsx` | 1068 | Settings page. **Zero memoization.** |
| `src/pages/gestao/PrecosProgramas.tsx` | 1058 | 4 `useMemo`. |
| `src/pages/gestao/ClubeAssinante.tsx` | 958 | |
| `src/pages/agencia/Carros.tsx` | 933 | **Zero memoization** despite filtering and PDF export. |
| `src/pages/gestao/Cartoes.tsx` | 925 | **Zero memoization**, 27 commits — high churn × low test coverage. |
| `src/pages/agencia/Transportes.tsx` | 916 | |
| `src/pages/agencia/Hoteis.tsx` | 879 | |

**Impact:** Adding any new feature inside these files compounds the problem; bugs caught during refactor in one section break unrelated sections.

**Fix approach:** Carve out per-section subcomponents in a sibling folder (e.g., `src/pages/agencia/orcamentos/{Filters,Dialog,Table,Export}.tsx`) and lift cross-section state into a small hook (`useOrcamentosState`).

### Duplicate / parallel-ish hook implementations

`src/hooks/` contains both `useTour.ts` and `useTourContext.ts`, `useOfflineSync.ts` and `useOfflineSyncContext.ts`, `usePromotions.ts` and `usePromotionsContext.ts`. The duplication is intentional (split for fast-refresh — see commit `62e7a57`), but the naming makes the relationship non-obvious. Same for `OperationsTable.tsx` / `OperationsTableMemo.tsx` and `ProgramCard.tsx` / `ProgramCardMemo.tsx` in `src/components/dashboard/` — both versions still ship.

**Impact:** Future contributors will not know which one to use; some imports may pick the unmemoized variant.

**Fix approach:** Pick one, delete the other, document the rationale in `src/contexts/` README.

### `supabase/integrations/types.ts` is 2,531 lines

Auto-generated from Supabase schema (per the file header). Not technical debt itself, but it inflates `tsc` time, IDE memory, and grep noise. Excluded from coverage in `vitest.config.ts:24`.

**Fix approach:** Add a regen script in `scripts/` and document the regen step; keep generated.

### TODO / FIXME / HACK comments

`grep -rn "TODO|FIXME|HACK"` across `src/` returned **zero true matches** — only false positives in placeholder strings (e.g., `R$ X.XXX,XX` triggers on `XXX`). Either the team has been disciplined, or shortcuts are tracked elsewhere (Lovable, GitHub Issues). **Worth verifying** that there is not a parallel issue tracker before assuming there is no debt to track.

### Type-system escape hatches in the data layer

The travel-agency hook layer relies on `as never` and `as unknown as` casts to satisfy generated Supabase types:

| File | Casts |
|------|-------|
| `src/hooks/travel/useTravelTickets.ts` | 2 (`as never`) |
| `src/hooks/travel/useTravelHotels.ts` | 2 |
| `src/hooks/travel/useTravelCars.ts` | 2 |
| `src/hooks/travel/useTravelCruises.ts` | 2 |
| `src/hooks/useClubSubscriptions.ts` | 2 (`as never`) + 1 (`as unknown as`) |
| `src/hooks/useBadges.ts` | 2 (`as unknown as OnboardingProgressWithBadges`) |
| `src/hooks/useOnboarding.ts` | 1 (`as unknown as OnboardingProgress`) |
| `src/lib/offlineQueue.ts` | 3 (`as 'operations'`, `as never`) |
| `src/pages/Relatorios.tsx`, `src/pages/relatorios/PassagensEmitidas.tsx` | 4 (`as unknown as Record<string, unknown>[]`) |

**Impact:** These bypass the type checker. A schema-changing migration that breaks a column rename will compile cleanly and fail at runtime.

**Fix approach:** Define narrow interfaces per insert/update payload colocated with the hook; use `Database['public']['Tables']['travel_tickets']['Insert']` directly rather than `Omit<TravelTicket, ...>`.

### Three lockfiles committed

`bun.lock`, `bun.lockb`, `pnpm-lock.yaml`, and `package-lock.json` all coexist in the repo root. CI uses `npm ci`. The other two will silently drift.

**Fix approach:** Pick one (npm based on CI), delete the other lockfiles, and add a CI check that fails if multiple lockfiles exist.

### `legacy-peer-deps=true` in `.npmrc`

Indicates one or more dependencies have unresolved peer-dep conflicts. Not breaking, but it hides warnings that may matter at upgrade time.

**Fix approach:** Run `npm ls` to identify the offending packages and resolve before the next major React/TS upgrade.

### Lovable plan committed

`.lovable/plan.md` (an in-progress AI-generated plan for ROISimulator methodology) is checked in. It is the second-most-churned file (50 modifications), suggesting it is being used as scratchpad. Either move it under `.planning/` (the GSD home) or `.gitignore` it.

---

## Test Coverage Gaps

**Headline:** Of 93 passing tests, **0 cover any component or any page.** All tests live in `src/lib/` (12 of 17 files) and `src/hooks/` (5 of ~57 hooks).

| Layer | Files | Tested | Coverage |
|-------|-------|--------|----------|
| `src/components/**/*.tsx` (all subdirs) | 182 | 0 | **0%** |
| `src/pages/**/*.tsx` | 57 | 0 | **0%** |
| `src/hooks/*.ts(x)` | 64 (incl. travel) | 5 | **~8%** |
| `src/lib/*.ts` | 17 | 12 | **~71%** |
| `src/contexts/`, `src/providers/` | 11 | 0 | **0%** |
| Supabase edge functions (`supabase/functions/`) | 13 | 0 | **0%** |

### Untested critical paths (priority order)

1. **`src/contexts/AuthProvider.tsx`** — handles signup, signin, signout, profile creation, cache clearing on user change. A bug here logs users into other people's data.
2. **`src/components/PlanProtectedRoute.tsx`** + **`src/hooks/useSubscription.ts`** — entire monetization gate. No test verifies `canAccessPro` math against the `subscription_plan` enum.
3. **`src/lib/offlineQueue.ts`** is tested for queue semantics but **not** for the `as 'operations'` table-name spoof — a bug here lets queued mutations land in the wrong table.
4. **`src/hooks/useOperations.ts`**, **`src/hooks/useConsolidatedSavings.ts`** (503 LOC) — heavy financial math; zero tests.
5. **All 14 `src/hooks/travel/*.ts`** — write paths (insert/update/delete) for the entire agency module. Zero tests.
6. **`supabase/functions/google-calendar-auth/index.ts`** (422 LOC) — implements custom HMAC OAuth state signing using the service-role key as the secret. Cryptographic code with no tests is a red flag.
7. **`src/components/ErrorBoundary.tsx`** — last line of defense; not tested.
8. **`src/lib/auditLogger.ts`** — security audit log writer; no test covers RPC call shape.

### Component tests that should exist for first milestone

- `src/components/dashboard/HeroValueCard.tsx`, `KPICard.tsx`, `ProgramCard.tsx` — render contracts for the most-viewed page.
- `src/components/forms/ValidatedInput.tsx`, `ValidatedSubmitButton.tsx` — tested via `useFormValidation`, but the component side is untested.
- `src/components/UpgradeBanner.tsx`, `UpgradePrompt.tsx` — show/hide is plan-driven, the conversion funnel depends on this.

---

## Security

### CRITICAL: Plan gating is purely client-side for agency tables

`src/components/PlanProtectedRoute.tsx:28` decides access by reading `useSubscription().canAccessPro`, which in turn reads `user_subscriptions.plan` via `src/hooks/useSubscription.ts:181`. **The route guard is the only check.** All `travel_*` table policies (defined in `supabase/migrations/20260131123615_267dcb8d-8b75-4b1f-9b24-1596a9ebef74.sql`, e.g. `travel_cruises`, `travel_insurances`, `travel_attractions`, `travel_transfers`) are of the form:

```sql
CREATE POLICY "Users can create their own cruises"
ON public.travel_cruises FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

There is **no plan check.** A `free`-plan user who knows their JWT can `POST` directly to `/rest/v1/travel_cruises` with their own `user_id` and create rows the UI says they cannot create. The same holds for `vip_lounge_*` tables (intended `plus`/`pro`-gated by `App.tsx:143`).

**Mitigations in place:**
- `subscription_plan` cannot be self-elevated: `user_subscriptions` has only a `SELECT` policy (`supabase/migrations/20251228134346_09ff8933-fdd7-4006-b6b0-051e339f9f12.sql:23`). No UPDATE/INSERT for users.
- A `can_access_feature(_user_id, _feature)` SQL function exists (same migration, line 79) but is **not invoked by any RLS policy** in the migrations directory.

**Fix approach:** Add `WITH CHECK (auth.uid() = user_id AND public.can_access_feature(auth.uid(), 'agency'))` to every `travel_*` insert/update policy. Add equivalent `USING` clauses to SELECT policies if you want hard data-isolation when a user downgrades.

**Impact:** Revenue leakage; potential basis for refund disputes and class-action exposure if discovered post-launch.

### CRITICAL: Hardcoded Supabase publishable key in `vite.config.ts`

`vite.config.ts:14` contains a baked-in JWT (Supabase `anon` key) as a fallback. The same key (and the project URL) is also referenced in `index.html:7` (CSP) and the PWA service-worker config in `vite.config.ts:97-134`. The author comment claims the key is "PUBLIC and safe to ship" — that is true for an anon key, **but**:

- The hardcoded fallback masks misconfigured deploys: if the build env is wrong, the app still runs against the real production project, which means staging/preview branches may write to prod data.
- If the project ever rotates the anon key, every git commit that pinned the old one will lock that historical build to a dead key.

**Fix approach:** Remove the fallback and let the build fail loudly if env vars are missing. If you want a smoke-test deploy story, use a dedicated dev project ID and gate it behind `mode === 'development'`.

### HIGH: `VITE_SUPABASE_SERVICE_ROLE_KEY` referenced in client code

`src/integrations/supabase/client.ts:7` reads `import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY` and creates a `supabaseAdmin` client if present. **Vite exposes any `VITE_*` variable to the client bundle.** If anyone ever sets that env var (because the auto-completion of `VITE_SUPABASE_*` is tempting), the service-role key — which bypasses RLS — ships in the JavaScript bundle to every visitor.

The comment on line 21 says "should only be used in trusted environments" — but `import.meta.env` is exclusively a client-side build-time substitution. There is no trusted runtime here.

**Fix approach:** Delete lines 7 and 22-29 of `src/integrations/supabase/client.ts`. Service-role usage belongs only in `supabase/functions/*` (Deno edge runtime), where it correctly reads `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`.

### MEDIUM: OAuth state HMAC secret reused from service-role key

`supabase/functions/google-calendar-auth/index.ts:12` uses `SUPABASE_SERVICE_ROLE_KEY` as the HMAC secret for signing OAuth state tokens. Functionally fine, but couples two unrelated security concerns: rotating the service-role key (e.g. after a leak) silently invalidates all in-flight OAuth flows, and a leak of either weakens the other.

**Fix approach:** Add a dedicated `OAUTH_STATE_SECRET` env var in the function and document it next to `ENCRYPTION_KEY`.

### LOW: `dangerouslySetInnerHTML` usage

Two occurrences:
- `src/components/ui/chart.tsx:70` — injects color CSS variables. Input is `config` from props; if a caller passes user-controlled `color` values, CSS injection becomes possible (low impact, no `expression()` in modern browsers).
- `src/main.tsx:37` — sets a static fallback HTML on bootstrap failure. Safe.

**Fix approach:** Add a comment in `chart.tsx` warning callers not to pass untrusted color strings, or sanitize.

### `.env` handling

- `.env.example` exists at the repo root and contains only placeholder values (`""`). No real secrets.
- `.gitignore:16-18` correctly ignores `.env` and `.env.*` (allowing `.env.example`).
- `git ls-files | grep '^\.env'` returns only `.env.example` — confirmed clean.

### Hardcoded secrets scan

`grep -rE 'sk_(live|test)_|pk_live_|service_role'` in `src/` returned only the references in `client.ts` documented above (no actual secret values). The base64-looking strings in `bun.lock` are package integrity hashes, not credentials.

### CSP

`index.html:7` defines a strict CSP including `default-src 'self'` and explicit `connect-src` allowlist for Supabase/GA/fonts. **Good.** Watch out for the `'unsafe-inline'` in `script-src` (needed for the inline bootstrap script in `index.html:70-75`) — long-term, replace inline GA snippets with deferred external scripts and drop `unsafe-inline`.

---

## Performance

### Bundle / lazy loading audit

| Item | Status | File |
|------|--------|------|
| All page components | Lazy-loaded ✓ | `src/App.tsx:22-82` |
| `ProtectedProviders` | Lazy-loaded ✓ | `src/App.tsx:19` |
| `jspdf` + `jspdf-autotable` | Lazy-loaded ✓ | `src/lib/pdfLoader.ts` (verified: `src/lib/invoiceGenerator.ts:1` and `incomeTaxPdfGenerator.ts:1` only import the loader, not jspdf directly) |
| `canvas-confetti` | Lazy-loaded ✓ | `src/lib/confettiLoader.ts` |
| Manual chunks defined | ✓ | `vite.config.ts:221-237` (vendor-react, vendor-ui, vendor-charts, vendor-motion, vendor-supabase) |
| `chunkSizeWarningLimit` | 500 KB | `vite.config.ts:239` |
| Workbox PWA caching | ✓ | `vite.config.ts:88-206` |

### Performance gaps

1. **Zero memoization in 6 of the 10 largest pages.** `Configuracoes.tsx` (1068 LOC), `Cartoes.tsx` (925 LOC), `Carros.tsx` (933 LOC), `Transportes.tsx` (916 LOC), `Hoteis.tsx` (879 LOC), `Seguros.tsx` (859 LOC), and `landing/AnimatedSections.tsx` (1344 LOC) have **no `useMemo` and no `React.memo`**. Tables with derived rows recompute on every parent re-render.

2. **`AnimatedSections.tsx:22` computes `IS_MOBILE` at module load.** Reads `window.matchMedia` synchronously during import. This (a) breaks SSR/Capacitor pre-render, (b) defeats `viewport-resize` adaptation, (c) blocks the entire landing chunk on a sync layout read.

3. **`useConsolidatedSavings.ts` (503 LOC)** does parallelize via `await Promise.all(fetchPromises)` (line 429) — good. But each branch does `.select('id, ...')` from a different table; this could be 6+ round-trips on dashboard load. Consider a SQL view (`v_consolidated_savings`) that returns the union shape in one query.

4. **Mobile detection runs once at module load in `queryClient.ts:7`.** Same SSR/window issue as #2 (less critical because react-query is post-mount).

5. **`useTravelTickets.ts:17` uses `select('*, client:travel_clients(*)')`** — a join via Supabase's resource embedding. For 100+ tickets, returns the full client row per ticket (denormalized). Add column projection (`client:travel_clients(id, name, email)`).

6. **Service worker `NetworkFirst` for `/rest/.*`** with 10s timeout (`vite.config.ts:101`). On flaky 3G this is 10 s of UI freeze before falling back. Consider `NetworkFirst` with `networkTimeoutSeconds: 3` or `StaleWhileRevalidate` for non-mutating list queries.

### Database indexes

`grep -c "CREATE INDEX"` across `supabase/migrations/*.sql` = **42 indexes** vs **40 `CREATE TABLE`** statements. Indexes exist but coverage is uneven — needs an audit pass against actual query patterns (`useOperations`, `useConsolidatedSavings` are the candidates). Suggested approach: enable `pg_stat_statements` and run the Supabase advisors via MCP to surface missing indexes empirically rather than guessing.

---

## Fragile Areas

(Files identified by high git churn cross-referenced with size and zero test coverage.)

### `src/components/layout/Sidebar.tsx` — 85 modifications, 637 LOC

Most-churned source file in the entire history. No tests. Drives all navigation, plan gating display, and active-route highlighting. Every tweak risks a regression in a different breakpoint.

**Safe modification:** Always test on mobile + desktop + the `Sidebar.tsx` PWA shortcut variant after changes.

### `src/App.tsx` — 72 modifications, 200 LOC

Route table touched in roughly 1 of every 18 commits. Each new page = another `lazy()` + `ProtectedRoute` + `PlanProtectedRoute` wrapper. Easy to forget a guard (and you have already seen one — `/agencia/*` routes gate by `requiredPlans={['pro']}` which only includes `pro`, not `pro_familia` introduced in migration `20260206223914`).

**Verify:** That every `requiredPlans` check still matches the live enum values (`free`, `pro`, `pro_familia`, `basic`). Today's `useSubscription.ts:243-245` collapses `basic` → `plus` and `pro_familia` → `pro`, so the route guard works by accident, not by design.

### `src/pages/Index.tsx` (51 mods) and `src/pages/Dashboard.tsx` (45 mods)

Landing page and post-login dashboard. Both heavily modified, neither tested. These are the two pages a regression hurts the most.

### `src/integrations/supabase/types.ts` — 49 modifications

Auto-regenerated; not really fragile in a logic sense, but every regen is a chance for downstream `as never` casts (see Tech Debt) to silently break.

### Travel/agency hook layer (14 files in `src/hooks/travel/`)

Combined ~2,000 LOC, zero tests, schema-coupled via `as never`. The newest module in the codebase (Jan-Feb 2026 churn) and also the most security-sensitive (plan gating gap above).

### `src/lib/offlineQueue.ts`

Cast `operation.table as 'operations'` at lines 71/75/79 lets the queue write to ANY table with no compile-time check. Combined with the plan-gating gap, an attacker who modifies the queue payload in `localStorage` could write to agency tables they should not access.

---

## Open Work Signals

- **`@ts-ignore` / `@ts-nocheck`:** None in `src/`. Three `@ts-expect-error` / `eslint-disable` exist, all in test files for valid reasons. Commit `1ed1c56` ("remove @ts-nocheck") confirms this was a recent cleanup pass.
- **`any` type usage:** Exactly **1** in production code: `src/hooks/useOnboarding.ts:134` uses `'any-operation'` as a query key string (not a type). All other matches are the word "any" inside comments. ESLint rule `@typescript-eslint/no-explicit-any: warn` is in effect (`eslint.config.js:29`).
- **`console.*` calls in `src/`:** **Zero.** All logging routes through `src/lib/logger.ts`, which is a no-op in production.
- **PostHog integration is a mock.** `src/lib/posthog.ts:1-8` documents that the real integration is not wired (`npm install posthog-js` step pending). `src/main.tsx:7-10` reads `VITE_POSTHOG_KEY` but the `initPosthog` function only logs to the dev logger. **Analytics shipped today produce no real events.** Decide whether to fix or remove the import to reduce confusion.
- **`VITE_ENABLE_SUBSCRIPTION_LEADS` feature flag** (`src/lib/subscriptionLeads.ts:39`) defaults to `false` and the comment in `.env.example:8` warns to enable only after the migration is applied. Verify the prod env actually has it set to `true`, otherwise pricing-page lead capture is silently no-op.
- **npm audit:** `npm audit --json` returns **0 vulnerabilities** (production and dev). Clean.
- **Deprecated APIs:** None detected (`grep -ri "deprecated"` in `src/` returned no matches).
- **CI security audit step** (`.github/workflows/ci.yml:61-80`) is set to `continue-on-error: true` — the build will not fail if `npm audit` reports highs. Consider tightening once the codebase is stable.

---

## Missing Critical Features

- **No bundle-size budget enforcement in CI.** `.github/workflows/ci.yml:47-51` prints sizes to the step summary but never fails on regression. Add `bundlewatch` or a custom diff against the previous commit.
- **No e2e tests.** Vitest covers units only. Auth, plan upgrade flow, and offline-sync are exactly the flows that integration tests would catch (and unit tests will not).
- **No formal payments integration.** `src/lib/subscriptionLeads.ts` captures intent; actual upgrade goes through manual WhatsApp (`src/pages/Assinatura.tsx:245`). Stripe is mentioned in `Privacidade.tsx:56` and the landing trust badge (`AnimatedSections.tsx:1108`) but not wired. Either implement or remove the badge to match reality.
- **No Sentry / error reporting.** `ErrorBoundary.tsx:84-90` only logs to the dev logger. Production crashes are invisible.
- **No formal API contract for edge functions.** `supabase/functions/_shared/validate.ts` exists (Zod) but each function rolls its own validation. Coverage is uneven.

---

## Scaling Limits

- **Free plan is `20 operations/month`** (`src/hooks/useSubscription.ts:120` + DB enum default). The `count_monthly_operations` SQL function (`supabase/migrations/20251228134346_...sql:107`) does a full table scan filtered by user — fine today, but add a partial index on `(user_id, created_at)` once any single user crosses ~10k operations.
- **`subscription_plan` enum has 5 values** (`free`, `pro`, `agency`, `pro_familia`, `basic`) but the TS type (`src/hooks/useSubscription.ts:5`) declares only 3 (`free`, `plus`, `pro`). The collapse logic at lines 242-245 handles it, but adding a 6th plan will require touching both layers and every route guard. Consolidate before launch.
- **Lockfile situation** (3 lockfiles) becomes a real merge-conflict generator at >5 contributors.

---

## Dependencies at Risk

- **`vite-plugin-pwa@^1.2.0`** — major version 1; ecosystem is active. Watch for breaking changes in workbox config shape.
- **`recharts@^2.15.4`** — known to have memory issues with large datasets; not a problem yet (charts are dashboard-only) but a concern if reports grow.
- **`@types/node@^25.6.0`** — pinned at Node 25 types, but CI uses Node 22 (`.github/workflows/ci.yml:28`). Cosmetic mismatch; align to avoid surprises.
- **`canvas-confetti@^1.9.4`** — vendored, lazy-loaded, low risk.
- **`lovable-tagger@^1.1.11`** — Lovable-specific tagging plugin used in dev mode. Check whether Lovable still requires it; if you migrate off Lovable, remove.

---

*Concerns audit: 2026-05-11*
