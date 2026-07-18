<!-- refreshed: 2026-05-11 -->
# Architecture

**Analysis Date:** 2026-05-11

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│  Browser / Native Shell (PWA + Capacitor iOS/Android)               │
│  `index.html` boots inline skeleton, then loads `src/main.tsx`      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     React 18 SPA — `src/App.tsx`                    │
│                                                                     │
│  Provider stack (top → bottom):                                     │
│    QueryClientProvider → ThemeProvider → LocalizationProvider →     │
│    AuthProvider → TooltipProvider → BrowserRouter →                 │
│    AppErrorBoundary → ConditionalProviders                          │
│                                                                     │
│  ConditionalProviders (lazy, auth-only):                            │
│    CommandPalette → Promotions → OfflineSync → Tour                 │
└────────┬────────────────────────────┬──────────────────┬───────────┘
         │                            │                  │
         ▼                            ▼                  ▼
┌──────────────────┐      ┌────────────────────┐   ┌────────────────┐
│ Pages (routes)   │      │ Layout components  │   │ Domain         │
│ `src/pages/**`   │      │ `src/components/   │   │ components     │
│ Lazy-loaded via  │      │  layout/**`        │   │ `src/components│
│ React.lazy()     │      │ DashboardLayout +  │   │  /<area>/**`   │
│ + <Suspense>     │      │ Sidebar + Header   │   │ (dashboard,    │
│                  │      │                    │   │  agencia, etc) │
└────────┬─────────┘      └─────────┬──────────┘   └────────┬───────┘
         │                          │                       │
         └──────────────┬───────────┴───────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Hooks layer — `src/hooks/**`                                       │
│  ~55 hooks wrap domain operations. Each hook owns its react-query   │
│  cache key + Supabase calls + mutations + toast feedback.           │
│  Pattern: useOperations, useProgramBalances, useTravelClients...    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Service / lib layer — `src/lib/**`, `src/integrations/supabase/**` │
│  - `queryClient.ts`: TanStack Query singleton + queryKeys catalog   │
│  - `integrations/supabase/client.ts`: typed Supabase client         │
│  - Pure utilities: formatters, logger, errorSanitizer, posthog,     │
│    haptics, offlineQueue, pdfLoader, auditLogger                    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Supabase BaaS — project `opusftqbbaozucmbuuug`                     │
│  - Postgres (RLS-protected) accessed over PostgREST                 │
│  - GoTrue auth (email/password, persisted to localStorage)          │
│  - Realtime (websocket) — used by client                            │
│  - Storage (images/exports)                                          │
│  - Edge Functions (Deno) in `supabase/functions/**`                 │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| App root | Compose providers, wire router, register lazy routes | `src/App.tsx` |
| Bootstrap | Mount React, error fallback HTML, PostHog init, expose `logger` global | `src/main.tsx` |
| AuthProvider | Holds Supabase session/user, exposes `signIn`/`signUp`/`signOut`, clears query cache on user change | `src/contexts/AuthProvider.tsx` |
| LocalizationProvider | i18n (pt-BR/en-US), number/currency/date formatters, `t()` lookup | `src/providers/LocalizationProvider.tsx` |
| ProtectedRoute | Auth gate; redirects to `/auth` when no user | `src/components/ProtectedRoute.tsx` |
| PlanProtectedRoute | Plan gate (free/plus/pro); redirects to `/assinatura` | `src/components/PlanProtectedRoute.tsx` |
| ProtectedProviders | Lazy-mounted provider group for authenticated area | `src/components/ProtectedProviders.tsx` |
| AppErrorBoundary | Top-level + per-section `react-error-boundary` wrappers with sanitized messages | `src/components/ErrorBoundary.tsx` |
| DashboardLayout | App shell (sidebar + header + main) with mobile swipe + safe-area CSS vars | `src/components/layout/DashboardLayout.tsx` |
| Sidebar | Plan-filtered, user-reorderable nav driven by `src/config/sidebarNavigation.ts` | `src/components/layout/Sidebar.tsx` |
| QueryClient | Mobile-aware defaults (longer staleTime), retry policy, central `queryKeys` catalog | `src/lib/queryClient.ts` |
| Supabase client | Typed `createClient<Database>` + optional admin (service-role) client | `src/integrations/supabase/client.ts` |
| Generated DB types | Auto-generated `Database` type — 2,531 lines of tables/enums/views | `src/integrations/supabase/types.ts` |

## Pattern Overview

**Overall:** SPA + BaaS (Backend-as-a-Service) with feature-folder presentation and a hooks-as-services data layer.

**Key Characteristics:**
- **Single-page app**, fully client-rendered. No SSR. Vite + React 18 + TypeScript strict.
- **Backend = Supabase only**. No bespoke Node/Express server. All persistence and auth go through `@/integrations/supabase/client`. Multi-tenant isolation is enforced at the database via RLS on `user_id`.
- **Hooks own a slice of the domain**. There is no `src/services/` directory — each `src/hooks/use<X>.ts` encapsulates Supabase queries, mutations, react-query cache invalidation, and toast notifications for one domain object.
- **Provider stack split by auth state.** Public routes (`/`, `/auth`, `/blog`, `/sobre`, `/termos`, `/privacidade`, `/instalar`) skip heavy providers. Authenticated routes get the full provider tree via `ConditionalProviders` in `src/App.tsx`.
- **Route-level code splitting** via `React.lazy()` for every page (~70 routes). Page chunks share vendor splits defined in `vite.config.ts` (`vendor-react`, `vendor-ui`, `vendor-query`, `vendor-charts`, `vendor-motion`, `vendor-supabase`, `vendor-utils`).
- **PWA + Capacitor**. The same Vite bundle ships as a web app (with `vite-plugin-pwa` service worker) and as native iOS/Android shells via Capacitor (`capacitor.config.ts`, `ios/`, `android/`).
- **Mobile-first concerns are pervasive**: `useIsMobile`, haptics, swipe gestures in `DashboardLayout`, mobile-tuned `staleTime` in `queryClient`, safe-area CSS vars in `src/index.css`.

## Layers

**Bootstrap layer:**
- Purpose: Wire React to DOM, install global error fallback, init analytics
- Location: `src/main.tsx`, `index.html`
- Contains: `bootstrap()` async loader, fallback HTML, `app:mounted` event
- Depends on: `react-dom/client`, `@/lib/posthog`, `@/lib/logger`
- Used by: `index.html` `<script type="module" src="/src/main.tsx">`

**Provider / context layer:**
- Purpose: Cross-cutting state (auth, theme, query cache, i18n, tour, command palette, offline sync, promotions)
- Location: `src/contexts/**`, `src/providers/**`
- Contains: Both context objects (`*Context.ts`, plain `createContext`) and the providers (`*Provider.tsx`, side-effect-bearing components). They are split into separate files so React Fast Refresh stays valid.
- Depends on: Supabase client, react-query, localStorage
- Used by: `src/App.tsx` (root), `ProtectedProviders` (auth-only)

**Routing layer:**
- Purpose: URL → page mapping, auth + plan gating, page-view tracking
- Location: `src/App.tsx` (all routes inline), `src/components/ProtectedRoute.tsx`, `src/components/PlanProtectedRoute.tsx`
- Contains: `<Routes>` with `<Route>` declarations, all wrapped in `<ProtectedRoute>` and (for plus/pro features) `<PlanProtectedRoute>`
- Depends on: `react-router-dom@6`, `useAuth`, `useSubscription`
- Used by: `AppRoutes` inside `App.tsx`

**Page layer:**
- Purpose: Top-level route components — one file per route
- Location: `src/pages/**`
- Contains: PascalCase `.tsx` files; subfolders mirror URL segments (`pages/operacoes/Compra.tsx` → `/lancamentos/compra`, `pages/agencia/Clientes.tsx` → `/agencia/clientes`)
- Depends on: `DashboardLayout`, domain hooks, domain components
- Used by: `App.tsx` lazy imports

**Layout / shell layer:**
- Purpose: Sidebar, header, breadcrumbs, page wrappers
- Location: `src/components/layout/**`
- Key files: `DashboardLayout.tsx`, `Sidebar.tsx`, `Header.tsx`, `PageHeader.tsx`, `NavigationBreadcrumb.tsx`, `sidebar/SidebarNavGroup.tsx`, `sidebar/SidebarNavItem.tsx`
- Depends on: `useAuth`, `useSubscription`, `useUnifiedAlertCount`, `src/config/sidebarNavigation.ts`

**Domain components layer:**
- Purpose: Feature-specific UI (cards, charts, dialogs, tables) grouped by feature folder
- Location: `src/components/<feature>/**` (achievements, alerts, cards, charts, clube, command-palette, dashboard, forms, imposto-renda, landing, onboarding, programa-detalhado, relatorios, sala-vip, settings, simulator, subscription, tour)
- Depends on: shadcn/ui primitives in `src/components/ui/`, hooks layer

**UI primitives layer:**
- Purpose: shadcn/ui (Radix-based) wrappers + a few project-specific primitives
- Location: `src/components/ui/**` (~63 files: `button.tsx`, `dialog.tsx`, `card.tsx`, `form.tsx`, `sidebar.tsx`, `chart.tsx`, `pull-to-refresh.tsx`, `virtualized-table.tsx`, `optimized-image.tsx`, `bank-logo.tsx`, `program-logo.tsx`, etc.)
- Conventions: kebab-case filenames, ESLint relaxes `no-explicit-any` and `react-refresh/only-export-components` for this folder (`eslint.config.js:42-49`)

**Hooks / data layer:**
- Purpose: Domain operations — every database object has a paired hook
- Location: `src/hooks/**`, plus travel-agency subgroup `src/hooks/travel/**`
- Contains: ~55 hooks; canonical pattern is `useQuery` + `useMutation` + `queryClient.invalidateQueries` + sonner `toast` (see `src/hooks/useOperations.ts`)
- Depends on: Supabase client, `@tanstack/react-query`, `useAuth` (for `user.id` in queryKeys)

**Lib / utility layer:**
- Purpose: Pure functions and singletons — no React, no Supabase calls (mostly)
- Location: `src/lib/**`
- Notable: `queryClient.ts` (TanStack Query setup + `queryKeys` catalog), `formatters.ts`, `numberFormatter.ts`, `logger.ts`, `errorSanitizer.ts`, `auditLogger.ts`, `posthog.ts`, `analytics.ts`, `haptics.ts`, `offlineQueue.ts`, `pdfLoader.ts`, `incomeTaxPdfGenerator.ts`, `invoiceGenerator.ts`, `confettiLoader.ts`, `fileValidation.ts`, `subscriptionLeads.ts`, `utils.ts` (the shadcn `cn()` helper)

**Static-data / config layer:**
- Purpose: Constants, registries, navigation config, content
- Location: `src/data/**` (`badges.ts`, `levels.ts`, `programs.ts`, `quickActionsRegistry.ts`, `tourSteps.ts`, `validadeOptions.ts`, `onboardingSteps.ts`, `mockData.ts`), `src/config/**` (`sidebarNavigation.ts`, `breadcrumbConfig.ts`), `src/locales/**` (`pt-BR.ts`, `en-US.ts`, `index.ts`), `src/content/blog/**` (markdown posts)

**Backend layer (Supabase, separate process):**
- Purpose: Database + auth + realtime + storage + edge functions
- Location: `supabase/migrations/**` (76 SQL files), `supabase/functions/**` (15 Deno functions), `supabase/config.toml`
- Edge functions: `backup-database`, `cleanup-old-promotions`, `fetch-market-prices`, `fetch-promotions`, `get-exchange-rate`, `google-calendar-auth`, `health-check`, `mrr-dashboard`, `process-club-subscriptions`, `program-accounts`, `send-client-email`, `sync-calendar-events`. Most have `verify_jwt = false` (config in `supabase/config.toml`); only `backup-database` has `verify_jwt = true`.
- Shared edge code: `supabase/functions/_shared/{cors.ts, crypto.ts, validate.ts}`

## Data Flow

### Primary Request Path (read)

1. User navigates → `<Route>` in `src/App.tsx:113-173` matches → page chunk lazy-loads
2. Page calls a domain hook, e.g. `useOperations()` (`src/pages/Dashboard.tsx:49`)
3. Hook builds a queryKey scoped to `user.id` and calls `supabase.from('operations').select(...)` (`src/hooks/useOperations.ts:76-107`)
4. TanStack Query caches the result in `queryClient` (`src/lib/queryClient.ts:18-49`); mobile gets longer `staleTime`
5. Hook returns data; page renders via `DashboardLayout` shell + domain components

### Primary Request Path (write)

1. User submits form, e.g. `Compra` page → `createOperation.mutate(data)` (`src/pages/operacoes/Compra.tsx:39`)
2. Mutation runs server-side limit check → `INSERT` into `operations` (`src/hooks/useOperations.ts:110-144`)
3. `onSuccess` invalidates affected query keys: `operations`, `operations_infinite`, `program_balances`, `monthly_operations_count` (`useOperations.ts:146-150`)
4. `sonner` toast confirms with translated label and formatted quantity
5. Subscribed components (Dashboard cards, balance widgets) refetch automatically

### Auth Flow

1. App mounts → `AuthProvider.useEffect` calls `supabase.auth.getSession()` synchronously (`src/contexts/AuthProvider.tsx:21-27`)
2. Subscribes to `supabase.auth.onAuthStateChange` (`AuthProvider.tsx:30-46`)
3. When `previousUserIdRef !== currentUserId`, calls `queryClient.clear()` to prevent cross-user cache leakage (`AuthProvider.tsx:36-39`)
4. `signOut()` clears the cache *before* calling `supabase.auth.signOut()` (`AuthProvider.tsx:109-114`)
5. `<ProtectedRoute>` watches `useAuth().user` and `<Navigate to="/auth">` when null (`src/components/ProtectedRoute.tsx:20-22`)

### Plan-Gate Flow

1. `<PlanProtectedRoute requiredPlans={['plus','pro']}>` reads `useSubscription().plan` (`src/components/PlanProtectedRoute.tsx:17`)
2. If `requiredPlans.some(...)` fails against `canAccessPlus`/`canAccessPro` flags → `<Navigate to="/assinatura">` (`PlanProtectedRoute.tsx:28-37`)
3. Sidebar similarly filters nav items via `filterNavGroupsByPlan(...)` (`src/components/layout/Sidebar.tsx:53-56`)

**State Management:**
- **Server state:** TanStack Query (`@tanstack/react-query@5`). Single `queryClient` exported from `src/lib/queryClient.ts` with a typed `queryKeys` catalog at lines 55-124.
- **Auth state:** React Context (`AuthContext` in `src/contexts/authContext.ts` + `AuthProvider` in `src/contexts/AuthProvider.tsx`).
- **UI/local state:** `useState`/`useReducer` inside components.
- **Persistent local state:** `localStorage` (Supabase session, localization settings, sidebar order, theme via `next-themes`).
- **Theme:** `next-themes` with `attribute="class"` and `defaultTheme="dark"` (`src/App.tsx:184`).

## Key Abstractions

**AuthContext / AuthProvider:**
- Purpose: Single source of truth for Supabase session + user
- Files: `src/contexts/authContext.ts` (context type), `src/contexts/AuthProvider.tsx` (provider), `src/hooks/useAuth.tsx` (consumer hook)
- Pattern: Context split into a separate `*.ts` file (no JSX) so React Fast Refresh accepts the `Provider` file. The same pattern applies to `commandPaletteContext`, `offlineSync`, `promotionsContext`, `tourContext`.

**queryClient + queryKeys catalog:**
- Purpose: Central TanStack Query setup + canonical key strings to keep invalidation consistent
- File: `src/lib/queryClient.ts`
- Pattern: All hooks must use keys from `queryKeys.<domain>` (e.g. `queryKeys.operations.list(filters)`) — but in practice many hooks still inline string arrays (drift from the catalog — see `useOperations.ts:77` which uses `['operations', user?.id, ...]` instead of `queryKeys.operations.list(...)`).

**Lazy provider conditionalization:**
- Purpose: Skip Promotions/OfflineSync/Tour/CommandPalette on landing/auth pages to shrink initial JS
- File: `src/App.tsx:85-98` (`ConditionalProviders`), `src/components/ProtectedProviders.tsx`
- Pattern: `useLocation().pathname` checked against a hard-coded `isPublicRoute` allow-list

**Sidebar config registry:**
- Purpose: Declarative nav definition with plan filtering and user reorder
- File: `src/config/sidebarNavigation.ts` (groups + items + icons), `src/components/layout/Sidebar.tsx` (consumer)
- Pattern: `getNavGroups()` → `filterNavGroupsByPlan(groups, canAccessPro, canAccessPlus)` → user-saved `sidebar_order` from `profiles.sidebar_order` overrides default order

**Localization layer:**
- Purpose: i18n strings + locale-aware number/currency/date formatting
- Files: `src/providers/LocalizationProvider.tsx`, `src/hooks/useLocalization.ts` (context type + storage helpers), `src/locales/{pt-BR,en-US,index}.ts`
- Pattern: `useLocalization()` exposes `t(key, params)`, `formatCurrency`, `formatNumber`, `formatDate`, `parseNumber`, `parseCurrency` — all delegated to `src/lib/numberFormatter.ts`

**Supabase typed client:**
- Purpose: Strongly-typed DB access; a generated `Database` type powers IntelliSense for every query
- Files: `src/integrations/supabase/client.ts` (clients), `src/integrations/supabase/types.ts` (2,531-line generated `Database` type — DO NOT hand-edit; regenerate with `supabase gen types typescript`)
- Pattern: `import { supabase } from '@/integrations/supabase/client'` — never `createClient` ad hoc. A second `supabaseAdmin` (service-role) is exported but null unless `VITE_SUPABASE_SERVICE_ROLE_KEY` is set.

## Entry Points

**HTML entry:**
- Location: `index.html`
- Triggers: User loads URL or PWA shell launches
- Responsibilities: Inline CSS skeleton for instant FCP, CSP meta tags, GA4 snippet, font preload, mounts `<div id="root">`, loads `/src/main.tsx`

**JS bootstrap:**
- Location: `src/main.tsx`
- Triggers: Browser executes the module script in `index.html`
- Responsibilities: Initialize PostHog (if key present), expose `logger` global, dynamic-import `App`, render with `createRoot`, dispatch `app:mounted` event, install `window.error` fallback

**Root component:**
- Location: `src/App.tsx`
- Triggers: `createRoot(...).render(<App />)` from `main.tsx`
- Responsibilities: Compose providers, register every route as a `React.lazy` chunk, wrap with `AppErrorBoundary` and `ConditionalProviders`

**Vite config:**
- Location: `vite.config.ts`
- Triggers: `npm run dev` / `npm run build` / `npm run preview`
- Responsibilities: SWC React plugin, lovable-tagger (dev only), `vite-plugin-pwa` config (Workbox runtime caching for Supabase REST/auth/functions/storage and fonts), manual chunk splits, hard-coded Supabase URL fallbacks injected via `define`

**Capacitor config:**
- Location: `capacitor.config.ts`
- Triggers: `npx cap sync` / iOS Xcode build / Android Gradle build
- Responsibilities: App ID `app.lovable.e39f4ef4c00a4d6e8e5c8722bb465399`, splash screen, status bar, keyboard plugins. Note: `server.url` points at `https://e39f4ef4-c00a-4d6e-8e5c-8722bb465399.lovableproject.com` (live-reload from Lovable preview, not the local `dist/`)

**Vitest config:**
- Location: `vitest.config.ts`
- Triggers: `npm test` / `npm run test:watch` / `npm run test:coverage`
- Responsibilities: jsdom env, setup file `src/test/setup.ts`, path alias `@`

## Architectural Constraints

- **Threading:** Single-threaded browser main thread. PWA service worker runs in a separate thread but only handles cache (no app logic).
- **Global state (module-level):**
  - `queryClient` singleton (`src/lib/queryClient.ts:18`)
  - `supabase` and `supabaseAdmin` singletons (`src/integrations/supabase/client.ts:12,22`)
  - `globalThis.logger` exposed in `src/main.tsx:13` (typed in `src/global.d.ts`)
- **Multi-tenancy is enforced at the database (RLS), not the client.** Every domain table filters by `user_id` and every hook re-asserts `.eq('user_id', user.id)` defensively. Cache leakage is prevented by including `user.id` in queryKeys and clearing the cache on user change in `AuthProvider.tsx:36-39`.
- **Hard-coded fallbacks for Supabase URL/anon-key in `vite.config.ts:12-15`.** Build never fails for missing env vars — it ships those values into the bundle. Server-role key is the only secret-handled var.
- **No SSR.** PWA `navigateFallback: '/index.html'` ensures deep-link refreshes work; service worker has `navigateFallbackDenylist: [/^\/api/, /^\/auth/]` to bypass cache on those.
- **Code splitting depends on `React.lazy` import shape.** Many lazy routes use `.then(m => ({ default: m.X }))` — only needed when the page exports a named (non-default) component (`src/App.tsx:19`). Plain pages use the simple `lazy(() => import(...))` form.
- **Capacitor `server.url` overrides `webDir`.** While set, the native shells load the Lovable preview, not local builds. To ship a native build off the local bundle, that line must be removed.

## Anti-Patterns

### Inline string queryKeys instead of `queryKeys` catalog

**What happens:** Many hooks build their own array literal keys (e.g. `['operations', user?.id, applyHistoryFilter, historyStartDate]` in `src/hooks/useOperations.ts:77`) even though `src/lib/queryClient.ts:55-124` defines a typed catalog (`queryKeys.operations.list(...)`).
**Why it's wrong:** Invalidation calls have to mirror the literal shape exactly. Drift between definer and invalidator silently breaks cache freshness — already visible in `Dashboard.tsx:64-69` where invalidation strings (`['market-prices']`) don't match the catalog (`queryKeys.marketPrices.all = ['market_prices']`).
**Do this instead:** Use the catalog: `queryKey: queryKeys.operations.list({ ... })` and `queryClient.invalidateQueries({ queryKey: queryKeys.operations.all })`. Add new keys to the catalog before introducing them in hooks.

### Routes declared inline in `App.tsx`

**What happens:** All ~70 `<Route>` declarations live in a single 200-line file (`src/App.tsx:108-174`).
**Why it's wrong:** Adding a feature requires touching the same file every time, increasing merge-conflict risk on a 1000+ commit history. Plan-gating logic is repeated verbatim across every `/agencia/*` route.
**Do this instead:** Extract route groups into per-area config (`src/routes/agenciaRoutes.ts`, `src/routes/operacoesRoutes.ts`) and map them in `App.tsx`. Wrap groups with a single `<Route element={<ProtectedRoute><PlanProtectedRoute requiredPlans={['pro']}/></ProtectedRoute>}>` parent instead of repeating the wrappers per route.

### Direct `supabase.from(...)` calls inside page components

**What happens:** Pages bypass the hooks layer for one-off data, e.g. `src/pages/operacoes/Compra.tsx:51-62` queries `credit_cards` directly via `useQuery` + `supabase.from('credit_cards')`.
**Why it's wrong:** Same query is duplicated across pages with slightly different keys, breaks invalidation centralization, and mixes presentation with data access.
**Do this instead:** Add `useCreditCards()` to `src/hooks/` and have the page consume it. The catalog already has `queryKeys.creditCards.all`.

### Public route allow-list duplicated

**What happens:** `src/App.tsx:87` hard-codes `['/', '/auth', '/instalar', '/sobre', '/blog', '/termos', '/privacidade']` for `ConditionalProviders`. The `/blog/:slug` route, however, is *not* in the list, so blog posts pay the full provider cost.
**Why it's wrong:** Easy to forget to update when adding public pages; subtle perf regressions slip through.
**Do this instead:** Mark route components as `route.public = true` (or move public routes into a separate `<Routes>` element under a different provider tree).

### Edge functions with `verify_jwt = false`

**What happens:** 11 of 12 declared edge functions in `supabase/config.toml` set `verify_jwt = false`, including `send-client-email` and `google-calendar-auth`.
**Why it's wrong:** Anyone on the internet can hit those endpoints. Without explicit user identity, server-side rate-limiting and per-user authorization must be re-implemented inside each function.
**Do this instead:** Default to `verify_jwt = true` and only opt out for true public endpoints (e.g. `health-check`, public price feeds). Inside the function, use `supabase.auth.getUser()` to authorize.

## Error Handling

**Strategy:** Layered. The DOM has a hand-rolled fallback (`src/main.tsx:15-29`). The React tree is wrapped in `<AppErrorBoundary>` (top-level) and per-section `<SectionErrorBoundary>` from `src/components/ErrorBoundary.tsx`. Hooks always wrap Supabase errors in `getSafeErrorMessage(err)` from `src/lib/errorSanitizer.ts` before showing toasts.

**Patterns:**
- Mutations: try/catch in `mutationFn` rethrows, then `onError` shows `toast.error` with sanitized message (`src/hooks/useOperations.ts:175-190`)
- Auth errors logged via `auditAuth` (`src/lib/auditLogger.ts`) — distinct from console logger
- DEV-only verbose logging via `src/lib/logger.ts` (`logger.log/error/warn`); production silent
- Error boundary calls `sanitizeError(error)` so raw Supabase messages never reach the UI

## Cross-Cutting Concerns

**Logging:** `src/lib/logger.ts` (gated by `import.meta.env.DEV`); also exposed as `globalThis.logger` for legacy call sites (declared in `src/global.d.ts`).
**Audit log:** `src/lib/auditLogger.ts` for security-relevant auth events (signup, login success/fail, logout). Persisted to a Supabase table.
**Validation:** `zod@3` for schema validation. Per-field UI validation via `src/hooks/useFormValidation.ts` and `react-hook-form` (`@hookform/resolvers`).
**Authentication:** Supabase GoTrue, persisted in `localStorage`, auto-refresh enabled (`src/integrations/supabase/client.ts:13-17`).
**Authorization:** Two layers — `<ProtectedRoute>` (auth required) and `<PlanProtectedRoute>` (plan tier check via `useSubscription`). Database-level RLS is the enforcement layer.
**Analytics:** Google Analytics 4 (gtag in `index.html:69-75`) + PostHog (initialized in `src/main.tsx` if `VITE_POSTHOG_KEY` set; pageviews fired in `App.tsx:104-106`) + custom `src/lib/analytics.ts`.
**Toasts:** Two systems coexist — `sonner` (preferred, used by hooks) and shadcn `useToast` (`src/hooks/use-toast.ts` for legacy components). Both `<Toaster />` and `<Sonner />` are mounted in `App.tsx:188-189`.
**Offline support:** `src/contexts/OfflineSyncContext.tsx` + `src/lib/offlineQueue.ts` queue mutations while offline; `src/components/ui/offline-indicator.tsx` shows status; `useNetworkStatus` hook drives UX.
**Haptics:** `src/lib/haptics.ts` wraps the Capacitor Haptics plugin (silent no-op on web).
**PWA:** `vite-plugin-pwa` with full Workbox runtime caching strategy in `vite.config.ts:39-209`.

---

*Architecture analysis: 2026-05-11*
