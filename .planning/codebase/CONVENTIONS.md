# Coding Conventions

**Analysis Date:** 2026-05-11

## Toolchain & Enforcement

**TypeScript** — `tsconfig.json` + `tsconfig.app.json`:
- `strict: true` (enables all strict-mode checks: `strictNullChecks`, `noImplicitAny`, etc.)
- `noUnusedLocals: false`, `noUnusedParameters: false` — unused symbols are NOT a build error
- `noImplicitReturns: true` and `noFallthroughCasesInSwitch: true` (app config)
- `allowJs: true`, `isolatedModules: true`, `moduleResolution: "bundler"`
- Path alias `@/*` → `./src/*` is the only alias and is used everywhere

**ESLint** — `eslint.config.js` (flat config, ESLint 9):
- Extends `js.configs.recommended` and `tseslint.configs.recommended`
- Plugins: `react-hooks`, `react-refresh`
- Key rules:
  - `@typescript-eslint/no-unused-vars`: **off** (intentionally — matches tsconfig)
  - `@typescript-eslint/no-explicit-any`: **warn** (not error — `any` is tolerated)
  - `react-hooks/exhaustive-deps`: **warn**
  - `react-refresh/only-export-components`: warn, allowConstantExport
- File-specific overrides:
  - `supabase/functions/**/*.ts` (Deno) — `no-explicit-any` off, `no-case-declarations` off
  - `src/components/ui/**/*.{ts,tsx}` (shadcn wrappers) — `no-explicit-any` off, `no-empty-object-type` off, `react-refresh/only-export-components` off
- Ignored dirs: `dist`, `node_modules`, `android`, `ios`, `coverage`

**Prettier / Editorconfig:** None present — formatting relies on editor defaults and ESLint. No `.prettierrc`, `.editorconfig`, or `biome.json`.

**Run scripts** (`package.json`):
```bash
npm run lint        # eslint .
npm run typecheck   # tsc --noEmit
npm run build       # vite build
```

## Naming Patterns

**Files:**
- React components: `PascalCase.tsx` (`HeroValueCard.tsx`, `ProtectedRoute.tsx`, `ErrorBoundary.tsx`)
- shadcn/ui primitives: `kebab-case.tsx` (`alert-dialog.tsx`, `pull-to-refresh.tsx`, `optimized-image.tsx`) — all under `src/components/ui/`
- Hooks: `camelCase.ts` starting with `use` (`useOperations.ts`, `useDebouncedValue.ts`, `useFormValidation.ts`); two legacy kebab-case exceptions: `use-mobile.tsx`, `use-toast.ts`
- Pages: `PascalCase.tsx` (`Dashboard.tsx`, `Simulador.tsx`, `Configuracoes.tsx`); dynamic blog post uses Next-style bracket: `src/pages/blog/[slug].tsx`
- Utility libs (`src/lib/`): `camelCase.ts` (`formatters.ts`, `errorSanitizer.ts`, `pdfLoader.ts`)
- Test files: same name as source + `.test.ts(x)`, co-located (`useRateLimit.ts` + `useRateLimit.test.ts`)
- Context files: split pair pattern — pure context object as `camelCaseContext.ts` (`authContext.ts`), provider component as `PascalCaseProvider.tsx` (`AuthProvider.tsx`). The split exists to satisfy `react-refresh/only-export-components`.

**Directories:** lowercase, plural where applicable (`components/`, `hooks/`, `lib/`, `pages/`, `contexts/`, `providers/`, `integrations/`). Subgroups inside `components/` are kebab-case for multi-word (`command-palette/`, `imposto-renda/`, `programa-detalhado/`, `sala-vip/`) and single-word otherwise (`dashboard/`, `forms/`, `auth/`, `tour/`, `ui/`).

**Functions:** `camelCase`. Hooks always start with `use`. Pure helpers prefixed with verb (`formatCurrencyBR`, `parseNumberBR`, `validateImageFile`, `sanitizeError`). Async DB helpers often `checkX`, `fetchX`, `createX`.

**Variables:** `camelCase`. Module-level constants in `UPPER_SNAKE_CASE` (`STORAGE_KEY`, `MAX_ATTEMPTS`, `WINDOW_MS`, `OPERATIONS_PAGE_SIZE`, `DEFAULT_MAX_FILE_SIZE`).

**Types:** `PascalCase` for both `interface` and `type` aliases (`CreateOperationData`, `FieldValidation`, `ValidationRule`, `RateLimitState`, `Task`, `TaskPriority`). String-literal unions used heavily for plan/role/status enums (`'free' | 'basic' | 'plus' | 'pro'`). Database row/enum types pulled via generated `Database` type: `Database['public']['Tables']['operations']['Row']`, `Database['public']['Enums']['operation_type']`.

## Code Style

**General:**
- Single quotes for strings in `.ts`/`.tsx` (e.g., `import { ... } from 'react'`)
- Semicolons required (universal in source)
- 2-space indentation
- Arrow functions for components and callbacks; named `function` declarations for hook bodies and exported helpers (`export function useTasks()`, `export function formatCurrencyBR(value: number)`)
- `interface` preferred over `type` for object shapes; `type` used for unions and aliases

**Imports:** see [Import Organization](#import-organization).

**JSX:** explicit `ReactNode` type for `children`. `forwardRef` used for ref-forwarding wrappers (`NavLink.tsx`, `ValidatedInput.tsx`) — always followed by `Component.displayName = "..."`.

## Import Organization

**Order observed across files** (no automated enforcement, but consistent):
1. React / framework imports — `react`, `react-router-dom`, `react-error-boundary`
2. Third-party libs — `@tanstack/react-query`, `sonner`, `lucide-react`, `framer-motion`, `recharts`
3. Aliased internal imports via `@/` — in this order:
   - `@/integrations/supabase/...`
   - `@/lib/...`
   - `@/hooks/...`
   - `@/contexts/...`
   - `@/components/ui/...` then `@/components/...`
4. Relative imports (`./useAuth`, `../pages/...`) — used sparingly; same-folder hook deps and route prefetch maps

**Type-only imports:** use `import type { ... }` selectively (e.g., `import type { User, Session } from '@supabase/supabase-js'` in `AuthProvider.tsx`, `import type { FieldValidation } from '@/hooks/useFormValidation'` in `ValidatedInput.tsx`). Not enforced but encouraged for cross-module type refs.

**Path alias:** `@/` is the ONLY alias (`vite.config.ts` line 211, `tsconfig.json` line 11, `vitest.config.ts` line 8, `components.json`). Always prefer `@/...` over relative paths except for sibling files in the same directory.

**Lazy imports:** all pages in `src/App.tsx` are loaded with `lazy(() => import("./pages/..."))`. Heavy libraries (jsPDF, canvas-confetti) are loaded through dedicated lazy loaders (`src/lib/pdfLoader.ts`, `src/lib/confettiLoader.ts`).

## Error Handling

**Three-layer strategy:**

1. **`react-error-boundary` for UI crashes** — `src/components/ErrorBoundary.tsx` exports `AppErrorBoundary` (page-level, with home button + retry) and `SectionErrorBoundary` (inline, used inside dashboard sections). `AppErrorBoundary` wraps the whole router in `App.tsx`.

2. **`sanitizeError` / `getSafeErrorMessage` for user-visible messages** — `src/lib/errorSanitizer.ts` maps Postgres / Supabase / network errors to friendly Portuguese strings (`"Este registro já existe."`, `"Sessão expirada. Faça login novamente."`). NEVER show raw error strings to users — always pass through `getSafeErrorMessage(error)` before `toast.error(...)`.

3. **`try/catch` + `toast` in mutations** — async hooks (`useOperations.ts`, `useTasks.ts`, `useVIPEntries.ts`, all `hooks/travel/*`) follow this exact pattern in `useMutation`:
```ts
mutationFn: async (data) => {
  if (!user?.id) throw new Error('Usuário não autenticado');
  const { data: result, error } = await supabase.from('x').insert(...).select().single();
  if (error) throw error;
  return result;
},
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['x'] });
  toast.success('Operação criada com sucesso');
},
onError: (error) => {
  toast.error(getSafeErrorMessage(error));
}
```

**Toasts:** `sonner` is the single toast library — `import { toast } from 'sonner'` (44 files). `toast.success(...)` and `toast.error(...)` are the two dominant variants; `toast.info` and `toast.warning` are rare. The `<Toaster />` (shadcn) and `<Sonner />` (sonner) are both mounted in `App.tsx`, but new code should call `sonner` directly.

**Logger:** `src/lib/logger.ts` is a dev-only wrapper around `console`. In production all methods are no-ops. Use it everywhere instead of raw `console.*`. Always pass a tag prefix as the first arg:
```ts
import { logger } from '@/lib/logger';
logger.log('[Auth]', 'User logged in');
logger.error('[ErrorBoundary]', 'Caught error:', error);
logger.warn('[Operations]', `Reached safety limit of ${OPERATIONS_SAFETY_LIMIT} rows`);
```
Recent commits replaced raw `console.*` calls with `logger.*`. Source code currently has 0 `console.*` calls (the 42 grep matches are all inside binary `.png` assets, not source files). Use `logger.*` for any new logging.

**Audit log:** `src/lib/auditLogger.ts` exposes `auditAuth.signup/loginSuccess/loginFailed/logout` for security-relevant events.

## State Management

**Server state:** `@tanstack/react-query` is the only server-state solution. The shared `queryClient` is configured in `src/lib/queryClient.ts` with mobile-aware defaults (longer `staleTime`/`gcTime` on mobile). Standard query keys live in `queryKeys` (object-keyed, hierarchical):
```ts
queryKeys.operations.list({ status: 'active' })
queryKeys.tasks.pending()
queryKeys.travelClients.detail(id)
```
Always include `user?.id` in query keys for user-scoped data and gate fetches with `enabled: !!user?.id` to prevent cross-user cache leaks.

**Local UI state:** `useState` + `useReducer` in components and hooks. `useMemo`/`useCallback` are used aggressively for expensive derivations and stable handler refs (Dashboard `firstName`, NavLink handlers).

**Cross-cutting state:** React Context, split into pure context object + provider component:
- `src/contexts/authContext.ts` + `AuthProvider.tsx` — auth/session
- `src/contexts/promotionsContext.ts` + `PromotionsContext.tsx`
- `src/contexts/commandPalette.ts` + `CommandPaletteContext.tsx`
- `src/contexts/offlineSync.ts` + `OfflineSyncContext.tsx`
- `src/contexts/tourContext.ts` + `TourContext.tsx`
- `src/providers/LocalizationProvider.tsx`

Heavy providers are mounted only on protected routes via `src/components/ProtectedProviders.tsx` (lazy-loaded in `App.tsx`).

**Forms:** `react-hook-form` + `@hookform/resolvers` + `zod` for full forms; for lightweight cases there is the in-house `useFormValidation` hook (`src/hooks/useFormValidation.ts`) plus `ValidatedInput` / `ValidatedSubmitButton` (`src/components/forms/`).

**Persistence:** `localStorage` directly for simple feature flags, rate limits, offline queue, intent capture (`useRateLimit`, `offlineQueue`, `subscriptionLeads`). Wrap in try/catch (e.g., `useRateLimit.ts` line 12-19).

## Tailwind / shadcn Usage

**Tailwind config:** `tailwind.config.ts`
- `darkMode: ["class"]` — toggled by `next-themes` via `<ThemeProvider attribute="class" defaultTheme="dark">` in `App.tsx`
- All colors are HSL CSS variables (`hsl(var(--primary))`, `hsl(var(--destructive))`, etc.) defined in `src/index.css`. NEVER hardcode hex colors — always use the semantic token (`bg-primary`, `text-muted-foreground`, `border-destructive`, `bg-destructive/10`)
- Custom `xs: '475px'` screen breakpoint
- Font stack: `DM Sans` (sans), `Inter` (display), `JetBrains Mono` (mono), `Libre Caslon Text` (serif)
- `tailwindcss-animate` plugin + custom keyframes (`fade-in`, `scale-in`, `shimmer`, `ripple`, `highlight-pulse`)

**shadcn/ui:** `components.json` style is `"default"`, baseColor `"slate"`, alias `@/components/ui`. All primitives are wrappers around `@radix-ui/*`. Don't edit shadcn primitives unless the change is broadly applicable; create a new wrapper in `src/components/...` instead.

**`cn()` helper:** `src/lib/utils.ts` — combines `clsx` + `tailwind-merge`. Always use `cn(...)` when conditionally composing classNames (never raw template strings).
```ts
className={cn(
  "touch-manipulation select-none",
  className,
  isActive && activeClassName,
)}
```

**className conventions:** Tailwind utility-first, no CSS modules. Prefer responsive prefixes (`sm:`, `md:`) over imperative breakpoint logic. Spacing scale uses `space-y-*` / `gap-*` (e.g., `space-y-6` between page sections).

## Comments

**Style: terse, English, only when non-obvious.**
- Module-level JSDoc blocks (`/** ... */`) on exported helpers and complex functions (~67 occurrences across `src/lib/` and `src/hooks/`). Keep to 2-4 lines; describe purpose and any non-obvious behavior, not the signature.
- Inline `//` comments for the rationale behind a non-obvious decision — especially CRITICAL flags about ordering, security, or memory:
  ```ts
  // CRITICAL: Execute getSession IMMEDIATELY (no defer) to ensure user is available before queries mount
  // CRITICAL: Clear cache when user changes (logout/login with different account)
  // Safety cap to avoid loading unbounded history into memory (mobile OOM risk).
  ```
- Section comments inside JSX (`{/* Greeting + primary actions */}`) are common in pages.
- No author tags, no change-log comments, no boilerplate file headers. Do not add them.
- Mixed Portuguese/English: code identifiers and comments are mostly English; user-facing strings, toast messages, and DB-domain terms are Portuguese (`'Usuário não autenticado'`, `'Nova Operação'`).

## Function Design

- Hook bodies are `export function useX(...)`. Avoid `const useX = () => {}` for hooks (consistency with surrounding code).
- Components: arrow `const X = (...) => {...}` or `export default function X() {...}` for pages. Either is acceptable; pages tend to use `export default function`.
- Prefer pure helpers in `src/lib/` over methods on classes. There are essentially no classes in `src/`.
- Always type props with an `interface NameProps { ... }` directly above the component.
- Destructure props with defaults: `function ErrorFallback({ error, resetErrorBoundary, title = 'Algo deu errado', showHomeButton = true }: ErrorFallbackProps)`.
- Use `unknown` (not `any`) for untyped third-party data; narrow with `instanceof Error` or type guards. `any` is allowed only inside `src/components/ui/**` shadcn wrappers and `supabase/functions/**`.

## Module Design

- One default export per page; named exports for everything else (hooks, helpers, sub-components).
- No barrel `index.ts` files in `src/components/` — always import the leaf file directly (`@/components/dashboard/HeroValueCard`).
- Co-locate tightly coupled helpers with their consumer; promote to `src/lib/` only when reused.
- Public Supabase types come from the generated `@/integrations/supabase/types` (the `Database` type). Do not re-define DB row shapes by hand.

---

*Convention analysis: 2026-05-11*
