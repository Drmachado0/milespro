# Codebase Structure

**Analysis Date:** 2026-05-11

## Directory Layout

```
miles-pro-hub/
├── .github/workflows/         # GitHub Actions CI (`ci.yml`)
├── .lovable/                  # Lovable AI editor metadata (`plan.md`)
├── .planning/                 # GSD planning artifacts (sketches + this codebase map)
│   ├── codebase/              # Architecture/convention docs (you are here)
│   └── sketches/              # UI mockup HTML snapshots before implementation
├── android/                   # Capacitor-generated Android Studio project (gradle, native shell)
├── ios/                       # Capacitor-generated Xcode project (App.xcodeproj, Swift entry)
├── public/                    # Static assets served verbatim by Vite
│   ├── images/                # `dashboard-preview.webp` (LCP image)
│   ├── pwa-192x192.png        # PWA icons
│   ├── pwa-512x512.png
│   ├── favicon.ico
│   ├── placeholder.svg
│   ├── robots.txt
│   └── sitemap.xml
├── scripts/                   # Python smoke-test / route audit scripts
├── src/                       # All application source (see breakdown below)
├── supabase/                  # Database migrations + edge functions + project config
│   ├── config.toml            # Project ID + per-function `verify_jwt` flags
│   ├── functions/             # Deno edge functions (15 total)
│   │   └── _shared/           # `cors.ts`, `crypto.ts`, `validate.ts` shared by functions
│   └── migrations/            # 76 timestamped SQL migrations (`YYYYMMDDhhmmss_<uuid>.sql`)
├── .env.example               # Template for VITE_SUPABASE_* + VITE_POSTHOG_* env vars
├── .gitignore                 # Ignores node_modules, dist, .env*, supabase/.temp, coverage
├── .npmrc                     # npm config (likely registry/save settings)
├── bun.lock / bun.lockb       # Bun lockfiles (Bun supported alongside npm)
├── package-lock.json          # npm lockfile
├── pnpm-lock.yaml             # pnpm lockfile (project supports all three managers)
├── capacitor.config.ts        # Capacitor app config (appId, splash, plugins, ios/android)
├── components.json            # shadcn/ui CLI config (style, aliases, tailwind path)
├── eslint.config.js           # Flat ESLint config (TS + react-hooks + react-refresh)
├── index.html                 # SPA entry HTML (CSP, GA4, PWA meta, inline skeleton)
├── package.json               # Dependencies + scripts (dev/build/test/lint/typecheck)
├── postcss.config.js          # Autoprefixer + Tailwind PostCSS pipeline
├── README.md                  # Project README
├── tailwind.config.ts         # Tailwind theme tokens (HSL CSS vars from index.css)
├── tsconfig.json              # Root TS config (refs app + node configs)
├── tsconfig.app.json          # App TS config (DOM lib, src includes)
├── tsconfig.node.json         # Vite/node-side TS config
├── vite.config.ts             # Vite + SWC + PWA + manualChunks + Supabase fallback inject
└── vitest.config.ts           # Vitest setup (jsdom env, setup file, alias)
```

### `src/` breakdown

```
src/
├── App.tsx                    # Root component — provider stack + lazy routes
├── main.tsx                   # Bootstrap — createRoot, error fallback, PostHog init
├── index.css                  # Tailwind layers + design tokens (HSL CSS vars, dark-first)
├── global.d.ts                # Global type augmentations (`globalThis.logger`)
├── vite-env.d.ts              # Vite client type reference
├── assets/                    # Bundled images (imported by components)
│   ├── airlines/              # Airline logos
│   ├── banks/                 # Bank logos
│   ├── landing/               # Landing-page imagery
│   └── programs/              # Loyalty program logos
├── components/
│   ├── ErrorBoundary.tsx      # AppErrorBoundary + SectionErrorBoundary
│   ├── NavLink.tsx            # Wrapped react-router NavLink with prefetch + haptics
│   ├── PlanProtectedRoute.tsx # Plan tier gate (free/plus/pro)
│   ├── ProtectedProviders.tsx # Lazy provider group for authenticated area
│   ├── ProtectedRoute.tsx     # Auth gate
│   ├── UpgradeBanner.tsx      # Subscription upsell banner
│   ├── UpgradePrompt.tsx      # Subscription upsell modal
│   ├── achievements/          # Badge cards, level header, stats cards
│   ├── alerts/                # Price/expiration alert dialogs and tabs
│   ├── auth/                  # Auth UI (e.g. PasswordStrengthIndicator)
│   ├── cards/                 # Credit-card-related UI (VIPBadge)
│   ├── charts/                # Recharts wrappers (CostEvolution, MonthlyOps, etc.)
│   ├── clube/                 # Club subscription charts/UI
│   ├── command-palette/       # cmdk-based ⌘K palette
│   ├── dashboard/             # Main dashboard widgets (KPI, hero, tables, alerts panels)
│   ├── forms/                 # Form input wrappers (HolderSelect, ProgramSelect, validated*)
│   ├── imposto-renda/         # Income-tax report UI
│   ├── landing/               # Public marketing/landing components
│   ├── layout/                # App shell (DashboardLayout, Sidebar, Header, breadcrumbs)
│   │   └── sidebar/           # Sidebar sub-components (NavGroup, NavItem, UserInfo, FixedGroup)
│   ├── onboarding/            # Onboarding cards, badge modals, level-up celebration
│   ├── programa-detalhado/    # Per-program detail page widgets (simulators, KPIs, charts)
│   ├── relatorios/            # Report tables/charts/exports
│   ├── sala-vip/              # VIP-lounge-tracking UI
│   ├── settings/              # Settings dialogs/forms
│   ├── simulator/             # Miles simulator widgets
│   ├── subscription/          # Subscription / plans UI
│   ├── tour/                  # Guided-tour components (StartTourButton, etc.)
│   └── ui/                    # ~63 shadcn/ui primitives + project primitives
├── config/                    # Declarative app config
│   ├── breadcrumbConfig.ts    # Path → breadcrumb label mapping
│   └── sidebarNavigation.ts   # Nav groups, items, icons, plan filters
├── content/
│   └── blog/                  # Markdown blog posts (rendered via react-markdown)
├── contexts/                  # React Context definitions split for Fast Refresh
│   ├── authContext.ts         # Pure context type (no JSX) — paired with AuthProvider.tsx
│   ├── AuthProvider.tsx       # Provider component with side effects
│   ├── commandPalette.ts / CommandPaletteContext.tsx
│   ├── offlineSync.ts / OfflineSyncContext.tsx
│   ├── promotionsContext.ts / PromotionsContext.tsx
│   └── tourContext.ts / TourContext.tsx
├── data/                      # Static data / registries
│   ├── badges.ts              # Achievement badge definitions
│   ├── levels.ts              # User level thresholds
│   ├── mockData.ts            # Demo / fixture data
│   ├── onboardingSteps.ts     # Onboarding step list
│   ├── programs.ts            # Loyalty program metadata
│   ├── quickActionsRegistry.ts# Dashboard quick-action registry
│   ├── tourSteps.ts           # Guided tour steps
│   └── validadeOptions.ts     # Validity (expiration) presets
├── hooks/                     # ~55 domain hooks (data + UI state)
│   ├── use-mobile.tsx         # Mobile breakpoint detection
│   ├── use-toast.ts           # shadcn toast (legacy — prefer sonner)
│   ├── useAuth.tsx            # Consumes AuthContext (throws if outside Provider)
│   ├── useOperations.ts       # CRUD + paginated query for `operations` table
│   ├── useProgramBalances.ts  # Derived program balances from operations
│   ├── useSubscription.ts     # Plan + limits + feature flags
│   ├── ...                    # Per-domain hooks (Tasks, Promotions, Cards, Goals, etc.)
│   └── travel/                # Travel-agency hooks (clients, tickets, hotels, cars, etc.)
├── integrations/
│   └── supabase/
│       ├── client.ts          # Typed createClient + admin client (do not duplicate)
│       └── types.ts           # Auto-generated Database type (2,531 lines — DO NOT edit)
├── lib/                       # Pure utilities (no React, mostly no Supabase)
│   ├── analytics.ts           # Custom event tracker
│   ├── auditLogger.ts         # Audit log writer (auth events)
│   ├── confettiLoader.ts      # Lazy canvas-confetti loader
│   ├── errorSanitizer.ts      # Strip secrets/PII from error messages
│   ├── fileValidation.ts      # File-type/size validators
│   ├── formatters.ts          # Display formatters (BRL, miles, etc.)
│   ├── haptics.ts             # Capacitor Haptics wrapper
│   ├── incomeTaxPdfGenerator.ts / invoiceGenerator.ts  # jsPDF generators
│   ├── logger.ts              # DEV-only console wrapper
│   ├── numberFormatter.ts     # Locale-aware number/currency parsing + formatting
│   ├── offlineQueue.ts        # Queue mutations while offline
│   ├── pdfLoader.ts           # Lazy jsPDF loader
│   ├── posthog.ts             # PostHog init + pageview helper
│   ├── queryClient.ts         # TanStack Query singleton + queryKeys catalog
│   ├── subscriptionLeads.ts   # Subscription lead capture
│   └── utils.ts               # shadcn `cn()` className merger
├── locales/
│   ├── index.ts               # `getTranslations(lang)` + `getNestedValue` + `interpolate`
│   ├── pt-BR.ts               # Brazilian Portuguese (default)
│   └── en-US.ts               # English
├── pages/                     # Route-level components (one file per route)
│   ├── Index.tsx              # `/` — landing page
│   ├── Auth.tsx               # `/auth` — sign in / sign up
│   ├── Dashboard.tsx          # `/dashboard` — main authenticated page
│   ├── Analises.tsx, Simulador.tsx, Titulares.tsx, Relatorios.tsx, Alertas.tsx,
│   │   Configuracoes.tsx, Conquistas.tsx, Assinatura.tsx, ProgramaDetalhado.tsx,
│   │   Instalar.tsx, Sobre.tsx, Blog.tsx, BlogAdmin.tsx, Termos.tsx,
│   │   Privacidade.tsx, NotFound.tsx
│   ├── agencia/               # Travel-agency module (Pro plan only) — 14 pages
│   ├── blog/[slug].tsx        # Dynamic blog post route
│   ├── gestao/                # Management screens (Cartoes, PrecosProgramas, ClubeAssinante, SalaVIP, ...)
│   ├── operacoes/             # Operation entry forms (Compra, Venda, Transferencia, ...)
│   ├── relatorios/            # Report sub-pages (CartoesRelatorio, EconomiaRelatorio, ...)
│   └── sistema/               # System pages (Programas, LimiteCPF)
├── providers/
│   └── LocalizationProvider.tsx  # i18n + formatter provider (currency/number/date)
├── test/
│   └── setup.ts               # Vitest setup (jest-dom matchers)
└── types/
    ├── miles.ts               # Domain types (operations, programs, etc.)
    ├── promotion.ts           # Promotion type union
    └── supabaseErrors.ts      # Typed Supabase error helpers
```

## Directory Purposes

**`src/pages/`:**
- Purpose: Route-level (top-level) components, one component per URL
- Contains: PascalCase `.tsx` files; subfolders mirror URL path segments
- Key files: `Dashboard.tsx`, `Index.tsx`, `Auth.tsx`, all `pages/operacoes/*.tsx`

**`src/components/`:**
- Purpose: Reusable React components — UI primitives in `ui/`, feature components in named subfolders
- Contains: PascalCase `.tsx` files grouped by feature (`dashboard/`, `agencia/...`, `landing/`, `forms/`, etc.)
- Key files: `layout/DashboardLayout.tsx`, `layout/Sidebar.tsx`, `layout/Header.tsx`, everything in `ui/`

**`src/hooks/`:**
- Purpose: Custom hooks — both data-fetching (Supabase + react-query) and UI state
- Naming: camelCase, **must** start with `use` (`useOperations.ts`, `useAuth.tsx`)
- Two legacy snake-case files exist (`use-mobile.tsx`, `use-toast.ts`) — these come from shadcn templates; new hooks must be camelCase

**`src/lib/`:**
- Purpose: Framework-agnostic utilities — logger, formatters, PDF generators, analytics, the query client singleton
- Naming: camelCase `.ts` (no JSX)
- Key files: `queryClient.ts`, `utils.ts` (the `cn()` helper), `formatters.ts`, `errorSanitizer.ts`

**`src/contexts/`:**
- Purpose: React Context split into two files per context — a pure type/createContext file (`*.ts`) and a provider with side effects (`*Provider.tsx`)
- Why split: keeps React Fast Refresh valid (only-export-components rule)
- Pattern: pair `authContext.ts` ↔ `AuthProvider.tsx`, then a consumer hook `useAuth` lives in `src/hooks/`

**`src/providers/`:**
- Purpose: Heavyweight providers that don't fit the `contexts/` split convention (currently only Localization)
- Contains: `LocalizationProvider.tsx`

**`src/integrations/supabase/`:**
- Purpose: Single Supabase client + generated DB types
- Important: `types.ts` is auto-generated (2,531 lines). Never hand-edit. Regenerate with the Supabase CLI when the schema changes.

**`src/config/`:**
- Purpose: Declarative app configuration consumed by components
- Contains: `sidebarNavigation.ts` (nav structure + plan filters), `breadcrumbConfig.ts`

**`src/data/`:**
- Purpose: Static reference data — badges, levels, programs, validity options
- Pattern: each file exports typed const arrays / records

**`src/locales/`:**
- Purpose: i18n string tables
- Naming: locale code matches BCP-47 (`pt-BR.ts`, `en-US.ts`)

**`src/types/`:**
- Purpose: Hand-written shared types not generated from Supabase
- Note: domain types tied to DB tables should reuse `Database['public']['Tables']['<x>']['Row']` from `integrations/supabase/types.ts` instead of redefining

**`src/content/blog/`:**
- Purpose: Blog posts as Markdown files, rendered via `react-markdown` + `remark-gfm`
- Naming: kebab-case `.md` (slug = filename)

**`src/assets/`:**
- Purpose: Bundled images imported by components (Vite hashes them)
- Subdirs: `airlines/`, `banks/`, `landing/`, `programs/`

**`supabase/migrations/`:**
- Purpose: Append-only Postgres migration history
- Naming: `YYYYMMDDhhmmss_<uuid-or-slug>.sql` (Supabase CLI format). Never edit a committed migration — add a new one.

**`supabase/functions/`:**
- Purpose: Deno edge functions (one folder per function, `index.ts` is the entry)
- Shared code in `_shared/` (CORS, crypto, validation helpers)

**`scripts/`:**
- Purpose: Python operational scripts (route audits, smoke tests against production)
- Generated/committed: committed; not part of the JS pipeline

**`.planning/`:**
- Purpose: GSD workflow artifacts (codebase docs + UI sketches)
- Generated: yes (by GSD commands like `/gsd-map-codebase`, `/gsd-sketch-ui`)
- Committed: yes

**`android/` and `ios/`:**
- Purpose: Native Capacitor projects (Gradle / Xcode)
- Generated: scaffolded by Capacitor; subsequent edits committed
- Note: when bumping Capacitor versions, run `npx cap sync` to refresh

## Key File Locations

**Entry points:**
- `index.html` — HTML shell, CSP, inline FCP skeleton
- `src/main.tsx` — JS bootstrap (mounts React)
- `src/App.tsx` — provider stack + all routes

**Build configuration:**
- `vite.config.ts` — Vite + SWC + PWA + manual chunks
- `tsconfig.json` (root), `tsconfig.app.json` (app), `tsconfig.node.json` (build tooling)
- `tailwind.config.ts` — design tokens
- `postcss.config.js` — PostCSS pipeline
- `eslint.config.js` — flat ESLint config (with per-folder overrides for `supabase/functions` and `src/components/ui`)
- `vitest.config.ts` — test runner

**Native / mobile:**
- `capacitor.config.ts` — Capacitor app config
- `android/app/src/main/AndroidManifest.xml` — Android manifest
- `ios/App/App.xcodeproj/project.pbxproj` — iOS Xcode project

**Core logic:**
- `src/integrations/supabase/client.ts` — Supabase client singleton
- `src/integrations/supabase/types.ts` — generated DB types
- `src/lib/queryClient.ts` — TanStack Query setup + queryKeys catalog
- `src/contexts/AuthProvider.tsx` — auth state
- `src/components/layout/DashboardLayout.tsx` — app shell
- `src/config/sidebarNavigation.ts` — nav definition

**Testing:**
- `src/test/setup.ts` — Vitest setup
- `*.test.ts` colocated next to the file under test (e.g. `src/lib/formatters.test.ts`, `src/hooks/useDebouncedValue.test.ts`)

**Database:**
- `supabase/migrations/*.sql` — schema migrations
- `supabase/functions/*/index.ts` — edge functions
- `supabase/config.toml` — function `verify_jwt` flags

## Naming Conventions

**Files:**
| Kind | Convention | Example |
|------|------------|---------|
| Page (route component) | `PascalCase.tsx` | `src/pages/Dashboard.tsx`, `src/pages/operacoes/Compra.tsx` |
| Domain component | `PascalCase.tsx` | `src/components/dashboard/HeroValueCard.tsx` |
| shadcn UI primitive | `kebab-case.tsx` | `src/components/ui/dropdown-menu.tsx`, `src/components/ui/pull-to-refresh.tsx` |
| Hook | `useXxx.ts` / `useXxx.tsx` (camelCase, must start with `use`) | `src/hooks/useOperations.ts`, `src/hooks/useAuth.tsx` |
| Legacy shadcn hook | `use-xxx.ts` (kebab-case, exception only) | `src/hooks/use-mobile.tsx`, `src/hooks/use-toast.ts` |
| Pure utility (lib) | `camelCase.ts` | `src/lib/numberFormatter.ts`, `src/lib/queryClient.ts` |
| Context type | `camelCase.ts` (no JSX) | `src/contexts/authContext.ts`, `src/contexts/tourContext.ts` |
| Context provider | `PascalCaseProvider.tsx` (paired with the `.ts` above) | `src/contexts/AuthProvider.tsx`, `src/contexts/TourContext.tsx` |
| Static data | `camelCase.ts` | `src/data/programs.ts`, `src/data/quickActionsRegistry.ts` |
| Locale file | `<bcp47>.ts` | `src/locales/pt-BR.ts`, `src/locales/en-US.ts` |
| Test file | `<source>.test.ts` colocated next to the source | `src/lib/formatters.test.ts` |
| Blog post | `kebab-case.md` (slug = filename) | `src/content/blog/cartoes-melhores-acumular-milhas-2026.md` |
| Migration | `YYYYMMDDhhmmss_<slug-or-uuid>.sql` | `supabase/migrations/20260510220500_create_subscription_leads.sql` |
| Edge function | one folder per fn, `index.ts` entry | `supabase/functions/health-check/index.ts` |

**Identifiers (TypeScript):**
| Kind | Convention | Example |
|------|------------|---------|
| Component / class | PascalCase | `function DashboardLayout()`, `class AppErrorBoundary` |
| Hook | camelCase, prefix `use` | `useOperations`, `useProgramBalances` |
| Function / variable | camelCase | `formatCurrency`, `queryClient` |
| Constant (module-level) | UPPER_SNAKE_CASE | `OPERATIONS_PAGE_SIZE`, `SWIPE_THRESHOLD`, `TOAST_LIMIT` |
| Type / interface | PascalCase | `interface CreateOperationData`, `type SubscriptionPlan` |
| Enum value (Postgres → TS) | snake_case lowercase | `'compra'`, `'venda'`, `'free'`, `'plus'`, `'pro'` |

**Routes / URLs:**
- kebab-case Portuguese segments: `/lancamentos/compra`, `/lancamentos/passagem-emitida`, `/gestao/precos-programas`, `/agencia/contas-receber`
- Dynamic segments: `:id`, `:slug`, `:program` (e.g. `/programa/:program`, `/blog/:slug`, `/gestao/cartoes/:id`)

**CSS / classnames:**
- Tailwind utilities only — composed with `cn()` from `src/lib/utils.ts`
- Design tokens via HSL CSS variables defined in `src/index.css` and exposed in `tailwind.config.ts` (e.g. `bg-primary`, `text-foreground`, `border-border`)

## Where to Add New Code

**New page (new route):**
1. Create `src/pages/<Area>/<Name>.tsx` (PascalCase). If the URL has a path segment like `/agencia/<x>`, put it under `src/pages/agencia/`.
2. Wrap content in `<DashboardLayout title="…">…</DashboardLayout>` for authenticated pages, or design a custom layout for public pages.
3. Add a lazy import + `<Route>` in `src/App.tsx` (currently the only routing module). Wrap with `<ProtectedRoute>` for auth-gated, plus `<PlanProtectedRoute requiredPlans={[...]}>` for plan-gated.
4. If it should be public, add the path to the `isPublicRoute` allow-list in `src/App.tsx:87` so heavy providers stay lazy.
5. Register the route in the sidebar via `src/config/sidebarNavigation.ts` (and add a breadcrumb label in `src/config/breadcrumbConfig.ts` if applicable).

**New shared component:**
- Domain-specific → `src/components/<feature>/<Name>.tsx` (`feature` = `dashboard`, `agencia`, `landing`, etc.). Create the folder if the feature doesn't exist yet.
- Generic UI primitive → prefer `npx shadcn add <component>`; otherwise drop a kebab-case file in `src/components/ui/`.
- Layout chrome → `src/components/layout/`.

**New hook:**
- Path: `src/hooks/use<Domain>.ts` (or `.tsx` if it returns JSX, like `useAuth.tsx`).
- Travel-agency-specific → `src/hooks/travel/use<X>.ts`.
- Pattern: import `supabase` from `@/integrations/supabase/client`, import `useAuth` for `user.id`, use `useQuery`/`useMutation`, **include `user.id` in queryKey**, invalidate via `useQueryClient().invalidateQueries({ queryKey: ... })`.
- Add the canonical key to `src/lib/queryClient.ts` `queryKeys` catalog.

**New context:**
1. Create the context type/object: `src/contexts/<name>Context.ts` (no JSX). `export const FooContext = createContext<FooContextType | undefined>(undefined);`
2. Create the provider: `src/contexts/<Name>Context.tsx` (or `<Name>Provider.tsx`). Houses `useState`, `useEffect`, etc.
3. Create the consumer hook in `src/hooks/use<Name>.ts(x)`: throws if context is undefined.
4. Mount the provider in `src/App.tsx` (root) or `src/components/ProtectedProviders.tsx` (auth-only).

**New utility (pure):**
- Path: `src/lib/<name>.ts`. Add a sibling `<name>.test.ts`. Export named functions; do not default-export utilities.

**New Supabase migration:**
1. Use the Supabase CLI: `supabase migration new <slug>` — generates `supabase/migrations/<timestamp>_<slug>.sql`
2. Write SQL that's idempotent where possible (`CREATE TABLE IF NOT EXISTS`, `DO $$ BEGIN ... EXCEPTION WHEN ...`)
3. **Always include RLS policies** (this codebase relies on RLS for tenant isolation). Pattern: `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY ... USING (auth.uid() = user_id)`.
4. After applying, regenerate `src/integrations/supabase/types.ts`: `supabase gen types typescript --project-id opusftqbbaozucmbuuug > src/integrations/supabase/types.ts`
5. Commit both the migration and the regenerated types in the same commit.

**New edge function:**
1. `supabase functions new <name>` → creates `supabase/functions/<name>/index.ts`
2. Add a `[functions.<name>]` entry to `supabase/config.toml`. **Default `verify_jwt = true`** unless the endpoint must be public.
3. Reuse `_shared/cors.ts` for CORS headers and `_shared/validate.ts` for input validation.
4. ESLint allows `any` in `supabase/functions/**` (see `eslint.config.js:34-40`) — but still prefer typed code.
5. Deploy: `supabase functions deploy <name>`.

**New static data / registry:**
- Path: `src/data/<name>.ts`. Export typed const arrays/records. Used by both hooks and components.

**New translation key:**
- Add to **both** `src/locales/pt-BR.ts` and `src/locales/en-US.ts` (same nested path). Access via `useLocalization().t('path.to.key')`.

**New test:**
- Colocate next to the file under test as `<file>.test.ts(x)`. Setup matchers come from `src/test/setup.ts` automatically. Run via `npm test`.

**New blog post:**
- Drop a Markdown file in `src/content/blog/<slug>.md` (kebab-case). The slug is the filename. Rendered by `src/pages/blog/[slug].tsx`.

## Special Directories

**`android/` and `ios/`:**
- Purpose: Capacitor-generated native projects
- Generated: initially yes; subsequent native edits (icons, plist entries) are hand-tracked and committed
- Committed: yes
- Sync command: `npx cap sync` after web bundle changes

**`supabase/.temp/` and `supabase/.branches/`:**
- Purpose: Local Supabase CLI scratch space
- Generated: yes
- Committed: no (in `.gitignore`)

**`dist/`:**
- Purpose: Vite build output (also Capacitor `webDir`)
- Generated: yes (`npm run build`)
- Committed: no

**`coverage/`:**
- Purpose: Vitest coverage reports (`npm run test:coverage`)
- Generated: yes
- Committed: no

**`node_modules/`:**
- Purpose: Dependency install
- Generated: yes
- Committed: no

**`.lovable/`:**
- Purpose: Lovable AI editor session metadata (`plan.md`)
- Generated: by Lovable
- Committed: yes (small metadata only)

**`.planning/sketches/`:**
- Purpose: Pre-implementation HTML mockups consumed by `/gsd-sketch-ui` workflow
- Generated: by GSD command
- Committed: yes

---

*Structure analysis: 2026-05-11*
