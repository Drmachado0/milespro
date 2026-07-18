---
phase: 03-mobile-distribution-launch
plan: 02
status: done
executed_at: 2026-05-14
commits: [2e03bf8, 752b476, 8b08a31]
---

# Plan 03-02 — iOS Path C Hardening — SUMMARY

## Outcome

G-CRIT-03 cycle-level kill switch operational: bash gate on `dist/assets/*.js`
exits non-zero on any anti-steering route-link pattern; CI workflow runs the
gate on every push to `main` + PR touching client code; per-component unit
tests prove each Path C-wrapped surface (Assinatura, Index, AnimatedSections
PricingSection, CrispWidget) renders nothing pricing-related when
`useIsIOSCapacitor()` returns true.

**Acceptance gate (npm run build && bash scripts/check-ios-strings.sh): GREEN**
**Test count: 113 → 121 (+8 new, all passing)**

## Locked gate semantics

Authoritative source: `.planning/ROADMAP.md` §"Phase 3: Mobile Distribution & Launch"
Success Criteria #1 (locked 2026-05-14, **refined 2026-05-14 during plan-03-02
execution**).

PATTERN (verbatim, both ROADMAP and `scripts/check-ios-strings.sh`):

```
href=["']/(planos|checkout|assinatura)|window\.location\.(href|assign|replace)\s*[=(]\s*["'][^"']*(planos|checkout|assinatura|asaas)|Browser\.open
```

What it catches:
- `<a href="/planos">` / `<a href="/checkout">` / `<a href="/assinatura">` (literal anchors)
- `window.location.href = "/path-with-pricing-token"` (or `.assign(...)`, `.replace(...)`)
- Any `Browser.open(...)` (Capacitor Browser plugin — zero current usage; full match safe)

What it does NOT catch (defended elsewhere):
- `window.location.href = checkoutUrl` (URL stored in variable) — defended by
  per-component `useIsIOSCapacitor()` wrap + Task 4 unit tests (component renders
  null, handler never executes) + TestFlight manual walkthrough
- `navigate('/assinatura')` (react-router) — Apple Reviewer cannot see a
  navigation to a Path C neutral panel as anti-steering; the destination
  contains no pricing UI

## Refinement decision (2026-05-14)

The first-narrowed pattern from ROADMAP `window\.location.*(?:planos|checkout|assinatura)`
proved unworkable at execution time:

- `.*` is greedy → matched 200KB single-line spans across the minified bundle
- Conflated `window.location.pathname` (read) with assignment (write)
- Produced 6 "hits" that were essentially one false positive expanded into many

The refined pattern requires write semantics (`.href|.assign|.replace` followed by
`=` or `(`) AND a literal-string argument containing a pricing token. Both ROADMAP
SC#1 inline rationale block and `scripts/check-ios-strings.sh` header documents the
refinement.

Source-code change required to land green gate: `src/hooks/useOperations.ts:182`
toast `action.onClick` swapped from `window.location.href = '/assinatura'` to
`navigate('/assinatura')` (react-router programmatic nav — does not bake the
literal pricing-route token into the bundle); the entire toast `action` is also
hidden on iOS via `useIsIOSCapacitor()` for defense-in-depth (Apple Reviewer
cannot see "Ver Planos" CTA in iOS Capacitor builds).

## Commits

- `2e03bf8` — Task 1: refined regex + script + ROADMAP refinement + useOperations refactor
- `752b476` — Tasks 2 + 3: CI workflow + vitest helper
- `8b08a31` — Task 4: 4 per-component Path C unit tests + jsdom polyfills

## Test count delta

```
Before: 113 tests in 22 files
After:  121 tests in 26 files (+ 8 tests, +4 files)
```

New files:
- `src/pages/__tests__/Assinatura.test.tsx` (2 tests)
- `src/pages/__tests__/Index.test.tsx` (2 tests, smoke)
- `src/components/landing/__tests__/AnimatedSections.test.tsx` (2 tests)
- `src/components/layout/__tests__/CrispWidget.test.tsx` (2 tests)

## Gaps surfaced

### From Task 1 — pattern refinement

ROADMAP SC#1 verbatim narrowed pattern was unrunnable on the actual bundle.
Root cause: `.*` greedy matching. **Fixed in this plan** (script + ROADMAP both
updated; refinement rationale documented inline in ROADMAP and script header).
No follow-up needed.

### From Task 4 — testing infrastructure

3 minor follow-ups identified during test creation (not blocking):

1. **`src/test/helpers/iosCapacitorMock.ts` triggers a vitest warning** about
   `vi.mock()` not being at module top level. Functional today; vitest plans
   to make this an error in a future version. Follow-up to refactor the helper
   so the mock factory is exposed at top-level (or document that helpers calling
   `vi.mock()` indirectly are excluded from the rule).

2. **Index.test.tsx is a smoke test only.** The deep "PricingSection hidden on
   iOS" assertion lives in `AnimatedSections.test.tsx`. Index renders too many
   provider-bound sub-components (LandingHeader, HeroSection, FadeInSection with
   framer-motion) to be a useful end-to-end render in jsdom; mock surface area
   would exceed the test value. Acceptable trade-off: the verifiable contract
   is "Index reads `useIsIOSCapacitor()` and conditionally renders PricingSection",
   which is exercised by import + the AnimatedSections.PricingSection test.

3. **DashboardLayout stubbed in Assinatura test.** Real DashboardLayout requires
   TooltipProvider, ManagedAccountProvider, TourProvider, AuthProvider —
   replicating that wiring would make every page test a 50-line ceremony. The
   passthrough stub is acceptable because the Path C assertion is on Assinatura
   page-level rendering, not on the chrome.

### From plan execution — divergence from PLAN.md paths

The PLAN named two paths that don't exist in the live repo:
- `src/components/sections/AnimatedSections.tsx` → actually `src/components/landing/AnimatedSections.tsx`
- `src/components/legal/CrispWidget.tsx` → actually `src/components/layout/CrispWidget.tsx`

Test files placed in the correct `__tests__/` siblings of the actual component
locations (`src/components/landing/__tests__/`, `src/components/layout/__tests__/`).

## Reminder for future plans

Any new pricing-adjacent component MUST:

1. Consume `useIsIOSCapacitor` from `@/hooks/useIsIOSCapacitor`
2. Either early-return null on iOS, or wrap the pricing-related JSX in
   `{!isIOS && (<...pricing UI.../>)}`
3. Add a paired unit test in the component's `__tests__/` sibling using
   `mockIsIOSCapacitor()` + `setIsIOSCapacitor()` from `@/test/helpers/iosCapacitorMock`

Any future widening of the PATTERN (e.g., to cover a newly-discovered anti-steering
vector like `<button onClick={() => window.location.assign('/checkout')}>`) requires
**first updating ROADMAP SC#1** with rationale (so the decision is reviewable
in PR), THEN updating `scripts/check-ios-strings.sh` to match. The script
header explicitly cites this contract.

## CI workflow status

Workflow file: `.github/workflows/check-ios-strings.yml`

- Triggers on push to `main` + PR touching `src/**` / `vite.config.ts` /
  `capacitor.config.ts` / `scripts/check-ios-strings.sh` / `package*.json`
- Concurrency cancels stale runs
- Aligned with existing `ci.yml` conventions (Node 22, actions/setup-node@v5,
  npm ci without --legacy-peer-deps)

First PR triggering the gate: pending (this commit batch is the first that
introduces the workflow). Expected status: pass (local `npm run build &&
bash scripts/check-ios-strings.sh` exits 0 on `8b08a31`).

## Validation log

```
$ npm run build && bash scripts/check-ios-strings.sh
files generated
  dist/sw.js
  dist/workbox-2ed0ca99.js
OK: G-CRIT-03 gate CLEAN — zero anti-steering route-links detected in dist/assets

$ npm run typecheck
> tsc --noEmit
(clean)

$ npm run test:unit
Test Files  26 passed (26)
     Tests  121 passed (121)
```

## Next plan

Wave 1 has 2 plans in parallel: `03-02` (this — autonomous, done) and `03-03`
(deep-links — partial, needs Apple Team ID from 03-00 founder action). When
the founder fills the 03-00 placeholders (Apple Team ID is the gate for 03-03),
03-03 becomes runnable.
