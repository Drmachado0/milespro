# Testing Patterns

**Analysis Date:** 2026-05-11

## Test Framework

**Runner:**
- `vitest` 4.1.4 — config at `vitest.config.ts`
- Uses `@vitejs/plugin-react-swc` so React/TSX in test files compiles the same way as the app
- Path alias `@/` → `./src/` is mirrored from the Vite config

**Environment:**
- `jsdom` 29.0.2 — browser DOM stub for tests that touch `window`/`document`/`navigator`
- `globals: true` — `describe`, `it`, `expect`, `vi`, `beforeEach`, `afterEach` are available without imports, but the codebase imports them explicitly anyway (`import { describe, it, expect, vi, beforeEach } from 'vitest';`). Keep the explicit imports for new tests — it matches existing style.

**Assertion library:**
- `vitest`'s built-in `expect`
- Extended with `@testing-library/jest-dom/vitest` (loaded in setup) for DOM matchers like `toBeInTheDocument`, `toHaveTextContent` — though these are not yet exercised because no component tests exist

**React testing:**
- `@testing-library/react` 16.3.2 — `renderHook`, `act`, `cleanup` (used by hook tests)
- `@testing-library/dom` 10.4.1, `@testing-library/jest-dom` 6.9.1, `@testing-library/user-event` 14.6.1 — installed but currently unused (no `render(<Component/>)` calls anywhere in `src/`)

**Setup file:** `src/test/setup.ts` (referenced as `setupFiles: ['./src/test/setup.ts']`):
```ts
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
```
That is the entire global setup — minimal, no MSW, no global mocks. Per-test mocks are defined inline.

## Run Commands

```bash
npm test              # vitest run               — single CI-style run
npm run test:watch    # vitest                   — watch mode
npm run test:ui       # vitest --ui              — interactive UI (@vitest/ui)
npm run test:coverage # vitest run --coverage    — v8 coverage, text + html reporter
```

**CI integration:** `.github/workflows/ci.yml` runs `lint`, `typecheck`, and `build` — but **does NOT run `npm test`**. Tests must be run locally before pushing. Adding a `npm test` step to the `quality` job is a low-effort improvement.

## Coverage Configuration

From `vitest.config.ts`:
- Provider: `v8`
- Reporters: `text`, `html` (HTML report goes to `coverage/`)
- Excluded paths:
  - `src/main.tsx` (entry bootstrap)
  - `src/**/*.d.ts` (declarations)
  - `src/test/**` (the setup itself)
  - `src/integrations/**` (generated Supabase client + types)
- No coverage thresholds enforced.

## Test File Organization

**Location:** **Co-located** next to the source file (`src/lib/formatters.ts` ↔ `src/lib/formatters.test.ts`). No separate `__tests__/` directory. The vitest `include` glob is `src/**/*.{test,spec}.{ts,tsx}`.

**Naming:** `<source-name>.test.ts` (no `.spec.*` files exist).

**Extension:** All current tests are `.test.ts`. There are **0** `.test.tsx` files — no React component is rendered in any test.

## Current Coverage — 17 test files

```
src/hooks/useDebouncedValue.test.ts
src/hooks/useFormValidation.test.ts
src/hooks/useIntersectionPrefetch.test.ts
src/hooks/useNetworkStatus.test.ts
src/hooks/useRateLimit.test.ts
src/lib/analytics.test.ts
src/lib/errorSanitizer.test.ts
src/lib/fileValidation.test.ts
src/lib/formatters.test.ts
src/lib/haptics.test.ts
src/lib/logger.test.ts
src/lib/numberFormatter.test.ts
src/lib/offlineQueue.test.ts
src/lib/pdfLoader.test.ts
src/lib/posthog.test.ts
src/lib/queryClient.test.ts
src/lib/subscriptionLeads.test.ts
```

**One-line summary per file:**

| Test file | What it covers |
|-----------|----------------|
| `src/hooks/useDebouncedValue.test.ts` | `useDebouncedValue` + `useDebouncedCallback` — debounce timing, type inference, cleanup. Uses `vi.useFakeTimers()` + `renderHook` + `act`. |
| `src/hooks/useFormValidation.test.ts` | `useFormValidation` — required / minValue / custom rules, touched-field gating, `markAllFieldsTouched`, `getInvalidFieldsLabels`. |
| `src/hooks/useIntersectionPrefetch.test.ts` | `prefetchRoute` smoke tests — does not throw for known/unknown routes (no IntersectionObserver simulation). |
| `src/hooks/useNetworkStatus.test.ts` | `useNetworkStatus` — initial online state, offline/online event handling, listener cleanup on unmount. Mocks `navigator.onLine` + `window.addEventListener`. |
| `src/hooks/useRateLimit.test.ts` | `useRateLimit` — attempt counting, lockout after 5 attempts, reset, `blockedMinutesRemaining`. Resets `localStorage` before each test. |
| `src/lib/analytics.test.ts` | Google Analytics wrappers — `trackPageView`, `trackConversion`, `trackScrollDepth`. Stubs `window.gtag`. |
| `src/lib/errorSanitizer.test.ts` | `sanitizeError`, `isUserFacingError`, `getSafeErrorMessage` — Postgres/RLS/network → friendly Portuguese messages, secret redaction (IPs, passwords). Uses `it.each(...)` table-driven tests. |
| `src/lib/fileValidation.test.ts` | `validateImageFile`, `getSafeFileExtension` — accept JPG, reject PDF, oversized, path traversal. |
| `src/lib/formatters.test.ts` | BR formatters — currency, number, CPF, CNPJ, phone (mobile/landline), CEP, date. |
| `src/lib/haptics.test.ts` | `haptic`, `hapticButton/Success/Warning/Error/Impact` — verifies `navigator.vibrate` patterns and graceful failure. |
| `src/lib/logger.test.ts` | `logger.log/error/warn/info/debug` and default export — smoke tests that methods are callable without throwing. |
| `src/lib/numberFormatter.test.ts` | Locale-aware `parseNumber/parseCurrency/formatNumber/formatCurrency/formatNumberInput/formatCurrencyInput` for `pt-BR` and `en-US`. |
| `src/lib/offlineQueue.test.ts` | `queueOperation`, `getPendingOperations`, `syncPendingOperations`, `removeOperation`, `clearPendingOperations`. Mocks `@/integrations/supabase/client`. |
| `src/lib/pdfLoader.test.ts` | `loadPDFLibraries`, `preloadPDFLibraries` — verifies dynamic jsPDF + autotable load resolves. |
| `src/lib/posthog.test.ts` | `initPosthog`, `isEnabled`, `identify`, `track`, `pageview`, `reset` — gated init via API key. |
| `src/lib/queryClient.test.ts` | `queryKeys.operations.list/detail`, `programBalances.byProgram`, `tasks.pending`. Mocks `window.matchMedia`. |
| `src/lib/subscriptionLeads.test.ts` | `createSubscriptionLead` (disabled-without-env), `saveSubscriptionIntentLocally`. Mocks Supabase client. |

**Total assertions:** 93 tests passing across the 17 files (per recent commit `f06248b`).

## What Is NOT Tested

**Components:** `src/components/**` has **0 tests** (verified with `find ... -name "*.test.*"` under `src/components/`). This includes:
- `ErrorBoundary.tsx`, `ProtectedRoute.tsx`, `PlanProtectedRoute.tsx`, `NavLink.tsx`, `UpgradePrompt.tsx`, `UpgradeBanner.tsx`
- All of `src/components/dashboard/`, `src/components/forms/`, `src/components/auth/`, `src/components/layout/`, `src/components/onboarding/`, `src/components/charts/`, `src/components/clube/`, `src/components/sala-vip/`, `src/components/relatorios/`, `src/components/imposto-renda/`, `src/components/programa-detalhado/`, `src/components/landing/`, `src/components/settings/`, `src/components/simulator/`, `src/components/cards/`, `src/components/alerts/`, `src/components/achievements/`, `src/components/command-palette/`, `src/components/subscription/`, `src/components/tour/`
- All shadcn wrappers in `src/components/ui/`

**Pages:** `src/pages/**` has **0 tests** (~50+ page files including `Dashboard.tsx`, `Auth.tsx`, `Simulador.tsx`, `Relatorios.tsx`, all `agencia/*`, all `operacoes/*`, all `gestao/*`, all `relatorios/*`, all `sistema/*`, all `blog/*`).

**Other untested areas:**
- Most of `src/hooks/` — only 5 of ~50 hooks have tests. Big gaps: `useOperations`, `useAuth`, `useTasks`, `useSubscription`, `useNotifications`, `useOnboarding`, `useTour`, `useProgramBalances`, `useExpirationAlerts`, all of `src/hooks/travel/*`.
- `src/contexts/*` and `src/providers/*` — no provider tests.
- `src/lib/` untested helpers: `auditLogger.ts`, `confettiLoader.ts`, `incomeTaxPdfGenerator.ts`, `invoiceGenerator.ts`, `utils.ts` (the `cn` helper).
- `supabase/functions/**` — no edge-function tests (Deno runtime, would need separate harness).
- `src/integrations/supabase/**` — intentionally excluded from coverage (generated client).

**Integration / E2E:** None. No Playwright, Cypress, or WebdriverIO. No Capacitor device tests. No visual-regression tooling.

**Net result:** The current suite is a **pure-logic safety net** — it locks down formatters, validation primitives, error sanitization, the offline queue, the PostHog/Google Analytics shims, and a handful of hooks that are easy to test in isolation. It does **not** verify any rendered UI, any Supabase round-trip, or any full user flow.

## Test Structure

**Standard skeleton** (matches every test file in the repo):
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react'; // for hook tests

describe('subjectName', () => {
  beforeEach(() => {
    // reset mocks / localStorage / module state
  });

  it('does the thing', () => {
    expect(actual).toBe(expected);
  });
});
```

**Conventions observed:**
- One `describe` per exported subject; siblings flat (no deep nesting).
- `it('verb-phrase', ...)` written in plain English (mostly), occasionally Portuguese.
- Setup goes in `beforeEach`; teardown via `afterEach` only when fake timers / mocks need restoring.
- `vi.restoreAllMocks()` after suites that spy on `console` or `window`.
- Table-driven assertions via `it.each([...])` where mappings are tested (`errorSanitizer.test.ts`).

## Mocking Patterns

**Mocking framework:** built-in `vi.mock`, `vi.fn`, `vi.spyOn`, `vi.useFakeTimers`, `vi.resetModules`.

**Hoisted module mocks** — declared at the top of the file with `vi.mock(...)`:
```ts
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null })),
        })),
      })),
    })),
    functions: { invoke: vi.fn() },
    auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: null } })) },
  },
}));
```
This pattern is used in `src/lib/offlineQueue.test.ts` and `src/lib/subscriptionLeads.test.ts` — the only two tests that touch Supabase. **Always mock `@/integrations/supabase/client` at the module level — never hit a real Supabase project from a test.**

**Module mocks for logger:**
```ts
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn() },
}));
```
(`src/lib/errorSanitizer.test.ts`).

**Dynamic `await import(...)` after mock setup** — used when the module reads env / `window` state at import time, so `vi.resetModules()` between tests forces a fresh module instance:
```ts
beforeEach(() => {
  vi.resetModules();
  window.gtag = vi.fn();
});

it('trackPageView calls gtag', async () => {
  const { trackPageView } = await import('./analytics');
  trackPageView('/pricing', 'Pricing');
  expect(window.gtag).toHaveBeenCalledWith('event', 'page_view', expect.objectContaining({ page_path: '/pricing' }));
});
```
Used in `analytics.test.ts`, `posthog.test.ts`, `queryClient.test.ts`, `pdfLoader.test.ts`, `subscriptionLeads.test.ts`, `offlineQueue.test.ts`, `useRateLimit.test.ts`, `haptics.test.ts`, `logger.test.ts`. Carry this pattern into any new test of a module with import-time side-effects.

**Spying on globals:**
- `vi.spyOn(console, 'log').mockImplementation(() => {})` — silence noisy logs (`logger.test.ts`)
- `vi.spyOn(window, 'addEventListener')` / `removeEventListener` to capture listeners and dispatch events synchronously (`useNetworkStatus.test.ts`)

**Browser API stubs** (jsdom is missing many APIs):
- `navigator.vibrate` → `vi.fn()` (`haptics.test.ts`, prefixed with `// @ts-expect-error jsdom lacks vibrate`)
- `navigator.onLine` → `Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true })` (`useNetworkStatus.test.ts`)
- `window.matchMedia` → `vi.fn().mockImplementation(...)` (`queryClient.test.ts`)
- `window.gtag` / `window.dataLayer` → assigned directly (`analytics.test.ts`)
- `localStorage` is provided by jsdom — call `localStorage.clear()` in `beforeEach` for any test that touches it (`useRateLimit`, `offlineQueue`, `subscriptionLeads`).

**What to mock:**
- All network IO (Supabase, edge functions, PostHog, Google Analytics, exchange rate APIs).
- Logger (when asserting it was called).
- Browser APIs not in jsdom (vibrate, matchMedia, IntersectionObserver, geolocation).

**What NOT to mock:**
- `localStorage` / `sessionStorage` — use the real jsdom impl, just `clear()` between tests.
- `Date` / `setTimeout` — use `vi.useFakeTimers()` + `vi.advanceTimersByTime(ms)` instead of manual mocks.
- The module under test — never partial-mock (`vi.spyOn` on the same module's exports).
- `@/lib/utils` (`cn`) and other pure helpers — let them run.

## Common Patterns

**Async / Promise testing:**
```ts
it('queues and syncs', async () => {
  const { queueOperation, syncPendingOperations, getPendingCount } = await import('./offlineQueue');
  queueOperation('operations', 'insert', { foo: 'bar' });
  const result = await syncPendingOperations();
  expect(result.synced).toBe(1);
  expect(getPendingCount()).toBe(0);
});
```

**Error / throwing assertions:**
```ts
expect(() => logger.log('test')).not.toThrow();
expect(() => prefetchRoute('/nonexistent')).not.toThrow();
expect(sanitizeError(new Error('permission denied for table'))).toBe('Você não tem permissão para esta ação.');
```

**Hook testing with timers:**
```ts
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), { initialProps: { value: 'a' } });
rerender({ value: 'b' });
act(() => { vi.advanceTimersByTime(300); });
expect(result.current).toBe('b');
```

**Hook testing with state changes:**
```ts
const { result } = renderHook(() => useFormValidation({ name: '' }, config));
act(() => { result.current.markFieldTouched('name'); });
expect(result.current.fieldValidations.name.error).toBe('Nome obrigatório');
```

**Table-driven assertions:**
```ts
it.each([
  ['violates foreign key constraint', 'Este item está vinculado a outros registros e não pode ser removido.'],
  ['duplicate key value violates unique constraint', 'Este registro já existe.'],
  // ...
])('maps %s to a friendly Portuguese message', (raw, expected) => {
  expect(sanitizeError(new Error(raw))).toBe(expected);
});
```

## Recommendations for New Tests

When adding tests for new code, follow these baselines (derived from the existing patterns):

1. **Co-locate** — `Foo.ts` ↔ `Foo.test.ts` next to it. Never use `__tests__/`.
2. **Import all globals explicitly** from `vitest` — keeps tests greppable and IDE-friendly even with `globals: true`.
3. **Always mock `@/integrations/supabase/client`** for any code that reaches into Supabase. Use the nested-builder mock shape from `offlineQueue.test.ts`.
4. **Reset `localStorage`** in `beforeEach` for any test that touches storage.
5. **Use `vi.resetModules()` + dynamic `await import(...)`** when the module reads `window` / env at import time.
6. **Use `vi.useFakeTimers()`** for any timeout/interval/debounce logic.
7. **Use `renderHook` + `act`** from `@testing-library/react` for hook tests.
8. **Component tests are still missing** — when adding the first one, render with `@testing-library/react` and wrap in `MemoryRouter` (because most pages depend on `react-router-dom`) plus a `QueryClientProvider` with a fresh `QueryClient({ defaultOptions: { queries: { retry: false } } })`.

---

*Testing analysis: 2026-05-11*
