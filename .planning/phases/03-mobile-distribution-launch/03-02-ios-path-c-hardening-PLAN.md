---
phase: 03-mobile-distribution-launch
plan: 02
type: execute
wave: 1
depends_on: ["01"]
files_modified:
  - scripts/check-ios-strings.sh
  - .github/workflows/check-ios-strings.yml
  - src/pages/__tests__/Assinatura.test.tsx
  - src/pages/__tests__/Index.test.tsx
  - src/components/sections/__tests__/AnimatedSections.test.tsx
  - src/components/legal/__tests__/CrispWidget.test.tsx
  - src/test/helpers/iosCapacitorMock.ts
autonomous: true
requirements: [MOBILE-01]
tags: [path-c, crit-03, ios-strings-gate, ci, vitest, defense-in-depth]
must_haves:
  truths:
    - "scripts/check-ios-strings.sh PATTERN is verbatim from ROADMAP §'Phase 3 SC#1' (decision-locked 2026-05-14): `href=\"/planos|href=\"/checkout|href=\"/assinatura|window\\.location.*(?:planos|checkout|assinatura)|Browser\\.open.*(?:asaas|checkout|planos)` — narrowed from the original verbatim ROADMAP regex per documented rationale (impossible to pass on Vite-bundled SPA; the narrowed pattern catches the anti-steering vectors Apple Reviewer actually cares about)"
    - "scripts/check-ios-strings.sh runs `strings dist/assets/*.js | grep -E '<narrowed-pattern>'` and exits non-zero if ANY match found"
    - "scripts/check-ios-strings.sh has a comment-block header citing `.planning/ROADMAP.md` §'Phase 3 SC#1' with the rationale link so future maintainers do not widen it accidentally"
    - "scripts/check-ios-strings.sh filters via `grep -v '^#'` BEFORE the count (prevents the self-invalidating grep gate; gate is on actual matches not comments per planner anti-patterns)"
    - "scripts/check-ios-strings.sh is invoked by .github/workflows/check-ios-strings.yml on every push to main + every PR that touches src/** | vite.config.ts | capacitor.config.ts | scripts/check-ios-strings.sh"
    - "CI workflow runs `npm ci && npm run build` BEFORE invoking the script (so dist/ exists)"
    - "Per-page Path C unit tests exist for Assinatura.tsx, Index.tsx, AnimatedSections.tsx PricingSection, and CrispWidget — each asserts that when useIsIOSCapacitor() returns true, the component renders NO pricing strings (R$, Upgrade, Assinar, planos, checkout)"
    - "src/test/helpers/iosCapacitorMock.ts provides a vitest.mock() helper toggling useIsIOSCapacitor() between true/false so each test renders both branches"
    - "Test files mirror Phase 1 test conventions: located alongside source under __tests__/ folder, .test.tsx extension, render via @testing-library/react"
    - "Running `npm run build && bash scripts/check-ios-strings.sh` locally exits 0 (CLEAN: no anti-steering route-link patterns in iOS bundle) — proving Plan 02-06's Path C wrappers actually hold at the bundle level (G-CRIT-03 cycle-level kill switch)"
    - "Gate-semantics decision documented at `.planning/ROADMAP.md` §'Phase 3 SC#1' inline rationale block — do NOT silently soften the gate without surfacing the rationale there"
  artifacts:
    - path: scripts/check-ios-strings.sh
      provides: "G-CRIT-03 gate — checks dist/assets/*.js for anti-steering route-link patterns; exit non-zero on match; comment header references ROADMAP SC#1 rationale"
      contains: "ROADMAP.md §"
    - path: .github/workflows/check-ios-strings.yml
      provides: "CI step running the gate on every PR touching client code"
      contains: "check-ios-strings"
    - path: src/test/helpers/iosCapacitorMock.ts
      provides: "Shared test helper for toggling useIsIOSCapacitor() in vitest"
      contains: "vi.mock"
    - path: src/pages/__tests__/Assinatura.test.tsx
      provides: "Path C unit test: Assinatura renders neutral panel on iOS, full pricing UI on non-iOS"
      contains: "useIsIOSCapacitor"
    - path: src/pages/__tests__/Index.test.tsx
      provides: "Path C unit test: Index PricingSection hidden on iOS"
      contains: "useIsIOSCapacitor"
    - path: src/components/sections/__tests__/AnimatedSections.test.tsx
      provides: "Path C unit test: AnimatedSections PricingSection returns null on iOS"
      contains: "useIsIOSCapacitor"
    - path: src/components/legal/__tests__/CrispWidget.test.tsx
      provides: "Path C unit test: CrispWidget early-returns (does NOT mount Crisp script) on iOS"
      contains: "useIsIOSCapacitor"
    - path: .planning/ROADMAP.md
      provides: "Authoritative gate semantics rationale at §'Phase 3 SC#1' — referenced by check-ios-strings.sh header"
      contains: "Rationale for narrowed grep pattern"
  key_links:
    - from: "Plan 02-06 useIsIOSCapacitor() chokepoint (src/hooks/useIsIOSCapacitor.ts)"
      to: "All 4 Path C-wrapped components"
      via: "import hook, gate render"
      pattern: "useIsIOSCapacitor"
    - from: "CI workflow check-ios-strings.yml"
      to: "scripts/check-ios-strings.sh"
      via: "bash invocation"
      pattern: "bash scripts/check-ios-strings.sh"
    - from: "scripts/check-ios-strings.sh header comment"
      to: ".planning/ROADMAP.md §'Phase 3 SC#1'"
      via: "documentation pointer for future maintainers"
      pattern: "ROADMAP.md"
---

<objective>
Lock in the G-CRIT-03 cycle-level kill switch: a CI script + per-component unit tests that PROVE the iOS build contains zero anti-steering route-link patterns. Phase 2 W2b (Plan 02-06) shipped the runtime hide via `useIsIOSCapacitor()`; this plan adds the empirical, automated evidence that the hide is correct AND keeps it correct as new code lands.

Purpose: ROADMAP Phase 3 SC#1 (now reflecting the narrowed gate semantics decided 2026-05-14) + the "Test invocation matrix" §"cycle-level kill switches" both single out a `strings dist/assets/*.js | grep -E '<narrowed-pattern>'` invocation as the literal acceptance test that gates LAUNCH-06. The narrowed pattern was officially adopted by the founder (see ROADMAP SC#1 inline rationale) because the verbatim pattern from the original ROADMAP (`planos|checkout|R\$|Upgrade|Assinar`) cannot pass on a Vite-bundled SPA — the strings exist in shared React components gated at runtime by `useIsIOSCapacitor()`, not removed from the JS bundle. Apple's 3.1.3(b) Multiplatform Services rule cares about user-visible navigation to external purchase, not cosmetic strings in a minified bundle. The narrowed pattern catches every realistic Path C anti-pattern (anchor tags, programmatic `window.location` redirects, `Browser.open` calls) while remaining a green CI signal. The TestFlight walkthrough is the user-visible-UI gate; this grep is the code-path defense in depth.

Without a CI gate enforcing this, ANY future commit can regress CRIT-03 silently (a developer adds a new pricing component without the hook, code review misses it, App Store submission gets rejected for Guideline 3.1.1 anti-steering). Plan 03-02 is the defense-in-depth: the build-time grep gate PLUS unit-level proof that each Path C-wrapped component actually renders nothing when the hook returns true.

Output: One CI script (`scripts/check-ios-strings.sh`) + one GitHub Actions workflow + one shared test helper + four component test files. Wave 1 plan, independent of 03-03 (deep-links infra). Can run in parallel with 03-03.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/03-mobile-distribution-launch/03-CONTEXT.md
@.planning/phases/03-mobile-distribution-launch/03-RESEARCH.md
@.planning/phases/03-mobile-distribution-launch/03-PATTERNS.md
@.planning/phases/03-mobile-distribution-launch/03-VALIDATION.md
@src/hooks/useIsIOSCapacitor.ts
@src/pages/Assinatura.tsx
@src/pages/Index.tsx
@src/components/sections/AnimatedSections.tsx
@src/components/legal/CrispWidget.tsx

<interfaces>
<!-- Cross-plan contracts -->

**From Plan 02-06 (shipped) — consumed here:**
- `src/hooks/useIsIOSCapacitor.ts` exports both `useIsIOSCapacitor()` (hook) and `isIOSCapacitor()` (non-hook utility)
- `src/pages/Assinatura.tsx` early-returns a neutral panel when `useIsIOSCapacitor()` is true
- `src/pages/Index.tsx` PricingSection is skipped when hook is true (per Plan 02-06 §Task 4)
- `src/components/sections/AnimatedSections.tsx` PricingSection returns null on iOS
- `src/components/legal/CrispWidget.tsx` early-returns when hook is true (Plan 02-06 deviation: hide Crisp on iOS as conservative anti-steering measure)

**Vitest config:**
- `vitest.config.ts` has 2 projects: unit + integration
- Unit project runs `src/**/*.test.{ts,tsx}` in jsdom; integration project runs `src/test/integration/**/*.test.{ts,tsx}` against Supabase local stack
- This plan's tests are all unit-project tests (no DB, no network)

**Existing test patterns (must follow):**
- `@testing-library/react` for rendering
- `vi.mock('@/hooks/useIsIOSCapacitor', ...)` for mocking the hook
- `describe`/`it`/`expect` from vitest
- No snapshot tests (project convention — too brittle for the upcoming brand iteration)

**CI infra:**
- `.github/workflows/ci.yml` is the existing CI; it runs lint + typecheck + npm test
- This plan adds a SEPARATE workflow `.github/workflows/check-ios-strings.yml` rather than appending to `ci.yml` (cleaner, can disable independently, single-responsibility)
- Workflow runs `npm ci`, `npm run build`, then `bash scripts/check-ios-strings.sh`

**Authoritative gate-semantics source:**
- `.planning/ROADMAP.md` §"Phase 3 SC#1" carries the narrowed-pattern decision (locked 2026-05-14) and the rationale text. The script PATTERN in this plan MUST match it verbatim. Any future widening or softening of the gate REQUIRES first updating ROADMAP SC#1 (so the decision is surfaced + reviewable), THEN updating the script.

</interfaces>

<scratchpad>
**Why a separate workflow file:** Single-responsibility CI files are easier to disable per-PR (skip-ci tags, etc.) and easier to read in PR status checks. The strings gate is conceptually distinct from lint+typecheck+test — it's a security gate, not a code-quality gate.

**Why filter out comments before grep -c:** The planner rules explicitly call out "self-invalidating grep gate" — if the script itself contains the word "Upgrade" in a comment, `grep -c` would count it. Solution: `grep -v '^#'` strips comment lines (in `dist/assets/*.js`, those would be sourcemap comments) before counting matches.

**Why we run the gate on `dist/assets/*.js` not `ios/App/App/public/assets/*.js`:** The iOS bundle IS the contents of `dist/` copied into `ios/App/App/public/` by `npx cap sync`. Running on `dist/` is equivalent and avoids requiring `cap sync ios` to run in CI (which would need Xcode CLI tools on the runner — overkill).

**Why the PATTERN is narrowed from the verbatim ROADMAP regex:** See ROADMAP §"Phase 3 SC#1" inline rationale (locked 2026-05-14 by founder). The original verbatim pattern `planos|checkout|R\$|Upgrade|Assinar` cannot pass on a Vite-bundled SPA because pricing UI strings live in shared React components that are gated at RUNTIME by `useIsIOSCapacitor()`, not removed from the JS bundle at build time. Vite cannot tree-shake branches whose predicate is `Capacitor.getPlatform() === 'ios'` (a runtime check). The narrowed pattern catches the actual anti-steering vectors Apple cares about: `<a href="/planos">`, programmatic `window.location` redirects to pricing routes, and `Browser.open(<asaas-checkout-url>)` calls. The TestFlight manual walkthrough is the user-visible gate; this script is defense in depth.

**Anti-pattern not to grep for: "Pro" alone.** "Pro" appears in non-pricing contexts ("Produtor de conteúdo", "Profissional", page titles). Including "Pro" would generate false positives. Same for "VIP" — it's a tier label that appears in non-pricing copy ("Recurso VIP" in feature descriptions). The narrowed pattern explicitly avoids these tokens.

**Why 4 component tests not 3:** Plan 02-06 wrapped 4 surfaces (Assinatura, Index, AnimatedSections PricingSection, CrispWidget). All four need explicit proof; testing only 3 leaves the fourth as silent regression risk.
</scratchpad>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Create scripts/check-ios-strings.sh (G-CRIT-03 gate — verbatim from ROADMAP SC#1)</name>
  <files>scripts/check-ios-strings.sh</files>
  <read_first>
    - .planning/ROADMAP.md §"Phase 3: Mobile Distribution & Launch" Success Criteria #1 (locked 2026-05-14 — read the narrowed PATTERN + the inline rationale block VERBATIM; this script must match exactly)
    - .planning/phases/03-mobile-distribution-launch/03-VALIDATION.md (test infra row for MOBILE-01)
    - .planning/phases/03-mobile-distribution-launch/03-RESEARCH.md §"iOS Path C Build Verification" + §"Common Pitfalls" Pitfall 3
  </read_first>
  <action>
**1.1 — Create `scripts/check-ios-strings.sh`** with PATTERN matching ROADMAP §"Phase 3 SC#1" verbatim:

```bash
#!/usr/bin/env bash
# G-CRIT-03 gate — iOS Path C kill switch
#
# Verifies the production JS bundle ships ZERO anti-steering route-link patterns.
# Run after `npm run build` (which writes dist/assets/*.js).
# Exit 0 = clean (no patterns). Exit non-zero = leak detected.
#
# Cycle-level kill switch per ROADMAP §"Phase 3: Mobile Distribution & Launch"
# Success Criteria #1. Failing this blocks LAUNCH-06.
#
# ============================================================================
# AUTHORITATIVE DECISION REFERENCE
# ============================================================================
# The PATTERN below is the official narrowed gate locked 2026-05-14 (founder
# approved). DO NOT widen/soften without first updating:
#   .planning/ROADMAP.md §"Phase 3: Mobile Distribution & Launch" Success Criteria #1
#
# Why narrowed (full rationale in ROADMAP SC#1 inline block):
#   - The original verbatim pattern from ROADMAP (planos|checkout|R$|Upgrade|Assinar)
#     CANNOT pass on a Vite-bundled SPA. Pricing UI strings live in shared React
#     components gated at RUNTIME by useIsIOSCapacitor(). Vite cannot tree-shake
#     branches whose predicate is Capacitor.getPlatform() === 'ios' (runtime).
#   - Apple Guideline 3.1.3(b) Multiplatform Services cares about user-visible
#     NAVIGATION to external purchase, not cosmetic strings in a minified bundle.
#   - The narrowed pattern catches the realistic anti-steering vectors:
#       * <a href="/planos|/checkout|/assinatura">
#       * window.location.* to pricing routes
#       * Browser.open() to asaas/checkout/planos URLs
#   - TestFlight manual walkthrough is the user-visible-UI gate; this grep is
#     defense in depth that catches commits BEFORE they reach TestFlight.
# ============================================================================
#
# Tokens grepped (anti-steering specific, no false positives):
#   - href="/planos|/checkout|/assinatura       JSX anchor tags
#   - window.location.*(planos|checkout|assinatura)   programmatic redirects
#   - Browser.open.*(asaas|checkout|planos)     Capacitor Browser plugin
#
# Filter out comments BEFORE counting matches (prevents self-invalidating grep
# gate — sourcemap comments inside the JS could otherwise contribute false hits).

set -euo pipefail

DIST_DIR="${DIST_DIR:-dist/assets}"
# PATTERN locked verbatim to ROADMAP §"Phase 3 SC#1" (2026-05-14).
PATTERN='href="/planos|href="/checkout|href="/assinatura|window\.location.*(?:planos|checkout|assinatura)|Browser\.open.*(?:asaas|checkout|planos)'

if [ ! -d "$DIST_DIR" ]; then
  echo "ERROR: dist directory not found at $DIST_DIR" >&2
  echo "Run 'npm run build' first." >&2
  exit 2
fi

JS_FILES=$(find "$DIST_DIR" -name '*.js' -type f)
if [ -z "$JS_FILES" ]; then
  echo "ERROR: no .js files found in $DIST_DIR" >&2
  exit 2
fi

# Run strings on each .js, strip comment lines, then grep for the pattern.
COUNT=0
MATCHES=""
for f in $JS_FILES; do
  if command -v strings >/dev/null 2>&1; then
    CONTENT=$(strings "$f")
  else
    CONTENT=$(cat "$f")
  fi
  # Filter: drop lines starting with // (single-line JS comment) or # (defensive).
  FILTERED=$(printf '%s\n' "$CONTENT" | grep -v '^//' | grep -v '^#' || true)
  # Use grep -P for PCRE (?:...) non-capturing group support.
  FILE_MATCHES=$(printf '%s\n' "$FILTERED" | grep -oP "$PATTERN" 2>/dev/null || \
                  printf '%s\n' "$FILTERED" | grep -oE "$PATTERN" || true)
  if [ -n "$FILE_MATCHES" ]; then
    FILE_COUNT=$(printf '%s\n' "$FILE_MATCHES" | wc -l)
    COUNT=$((COUNT + FILE_COUNT))
    MATCHES="$MATCHES\n  $f: $FILE_COUNT hits"
    UNIQUE_HITS=$(printf '%s\n' "$FILE_MATCHES" | sort -u | head -5 | tr '\n' ' ')
    MATCHES="$MATCHES    [tokens: $UNIQUE_HITS]"
  fi
done

if [ "$COUNT" -gt 0 ]; then
  echo "FAIL: G-CRIT-03 gate detected $COUNT anti-steering route-link occurrence(s) in $DIST_DIR" >&2
  printf "%b\n" "$MATCHES" >&2
  echo "" >&2
  echo "Resolution: every surface that links to pricing must be wrapped in useIsIOSCapacitor()" >&2
  echo "such that the link DOM node is NOT rendered on iOS." >&2
  echo "See .planning/phases/02-monetiza-o-compliance-telemetria/02-06-PLAN.md §Task 4 for the canonical pattern." >&2
  echo "See .planning/ROADMAP.md §'Phase 3 SC#1' for gate semantics rationale." >&2
  exit 1
fi

echo "OK: G-CRIT-03 gate CLEAN — zero anti-steering route-links detected in $DIST_DIR"
exit 0
```

**1.2 — Make executable:**

```bash
chmod +x scripts/check-ios-strings.sh
```

(On Windows, file mode persistence is handled by git via `core.fileMode` config — usually fine; if not, add a `.gitattributes` entry: `scripts/*.sh text eol=lf` to ensure LF line endings.)

**1.3 — Local smoke test:**

```bash
npm run build  # → creates dist/
bash scripts/check-ios-strings.sh  # → expect "OK: G-CRIT-03 gate CLEAN"
```

**1.4 — PATTERN verification — DO NOT DRIFT FROM ROADMAP:**

The PATTERN string in the script MUST be byte-identical to the regex specified at `.planning/ROADMAP.md` §"Phase 3 SC#1". If they differ, fix the script (NOT the ROADMAP — the ROADMAP carries the authoritative decision). The decision was locked 2026-05-14 and any future modification requires first surfacing the change via a ROADMAP edit with rationale.

**1.5 — Local sanity test of the new pattern on current main:**

```bash
npm run build
bash scripts/check-ios-strings.sh
# → expect "OK: G-CRIT-03 gate CLEAN"
```

If FAIL, fix the source per the rule: anywhere we have a literal pricing-route href or `Browser.open` to Asaas/checkout/planos, wrap with `if (useIsIOSCapacitor()) return null` at the rendering site so the link DOM node is conditionally not in the rendered tree on iOS.

**Note for the gap audit:** This script is a defense-in-depth check. The PRIMARY check is the TestFlight manual walkthrough (V03-VALIDATION §"Manual-Only Verifications"). The grep gate catches commits BEFORE they reach TestFlight, but it is not the final word.

**1.6 — Convention enforcement:**
- POSIX `sh`-compatible Bash (works on Linux + macOS + Git-Bash on Windows)
- `set -euo pipefail` for strict error handling
- Exit codes: 0 = clean, 1 = leak detected, 2 = setup error (no dist/, no JS files)
- Output goes to stderr on failure, stdout on success (CI conventions)
- Header comment block contains the literal string `ROADMAP.md` so future maintainers grep-find the rationale source
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); if(!fs.existsSync('scripts/check-ios-strings.sh')){console.error('FAIL: script missing');process.exit(1);} const s=fs.readFileSync('scripts/check-ios-strings.sh','utf8'); const required=[['#!/usr/bin/env bash','shebang'],['set -euo pipefail','strict mode'],['DIST_DIR=','configurable dist'],['PATTERN=','grep pattern var'],['grep -v','comment filter (self-invalidating gate avoidance)'],['exit 0','clean exit code'],['exit 1','leak exit code'],['G-CRIT-03','gate identifier'],['ROADMAP.md','rationale source reference'],['href=\"/planos','narrowed PATTERN match (verbatim from ROADMAP SC#1)'],['Browser\\\\.open.*(?:asaas|checkout|planos)','Browser.open vector']]; const banned=[['planos|checkout|R\\\\$|Upgrade|Assinar','old verbatim pattern that cannot pass on Vite SPA — must use narrowed PATTERN per ROADMAP SC#1']]; let fail=false; for (const [n,w] of required){if(!s.includes(n)){console.error('FAIL: missing —',w);fail=true;}} for (const [n,w] of banned){if(s.includes(n)){console.error('FAIL: banned —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: check-ios-strings.sh structure (PATTERN matches ROADMAP SC#1 narrowed gate)');"</automated>
  </verify>
  <done>
    `scripts/check-ios-strings.sh` exists, executable, shebang-led, strict-mode, with PATTERN byte-identical to ROADMAP §"Phase 3 SC#1". Header comment-block cites ROADMAP for rationale. `npm run build && bash scripts/check-ios-strings.sh` exits 0 on current main.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Create CI workflow .github/workflows/check-ios-strings.yml</name>
  <files>.github/workflows/check-ios-strings.yml</files>
  <read_first>
    - .github/workflows/ci.yml (existing CI patterns — Node version, npm ci, caching)
    - scripts/check-ios-strings.sh (from Task 1)
  </read_first>
  <action>
**2.1 — Create `.github/workflows/check-ios-strings.yml`:**

```yaml
name: Check iOS Strings (G-CRIT-03 gate)

on:
  push:
    branches: [main]
  pull_request:
    paths:
      - 'src/**'
      - 'vite.config.ts'
      - 'capacitor.config.ts'
      - 'scripts/check-ios-strings.sh'
      - 'package.json'
      - 'package-lock.json'

# Concurrency: cancel any in-flight run for the same PR/branch when a new push arrives.
concurrency:
  group: check-ios-strings-${{ github.ref }}
  cancel-in-progress: true

jobs:
  check-ios-strings:
    name: G-CRIT-03 — iOS Path C kill switch
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node 22
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Build production bundle
        run: npm run build

      - name: Run G-CRIT-03 gate
        run: bash scripts/check-ios-strings.sh
```

**2.2 — Verify workflow lint:**

The `paths` filter ensures this job runs only when client code or config changes. Pure docs/markdown changes skip the gate (saves CI minutes).

The `concurrency` block cancels stale runs (e.g., a PR that gets a second commit triggers a new run; the prior is cancelled).

`--legacy-peer-deps` mirrors the existing `.npmrc` config (per CONCERNS.md — current state has `legacy-peer-deps=true`).

`timeout-minutes: 10` is generous; the actual run is ~3-4 minutes (cache-restore + install + build + 5s gate).

**2.3 — Commit and watch the first PR:**

After merge, the next PR touching `src/**` will trigger this workflow. Verify in PR status:
- `Check iOS Strings / G-CRIT-03 — iOS Path C kill switch` should appear as a status check
- Expected outcome: PASS (current main is clean)

**2.4 — Convention enforcement:**
- Node 22 (matches existing `.github/workflows/ci.yml`)
- `cache: 'npm'` (built-in setup-node caching, faster than manual)
- Job name matches the workflow name (single-job workflow, mirrors `ci.yml` style)
- No secrets needed (read-only check)
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const yaml=fs.readFileSync('.github/workflows/check-ios-strings.yml','utf8'); const required=[['name: Check iOS Strings','workflow name'],['paths:','path filter exists'],['vite.config.ts','vite config in path filter'],['capacitor.config.ts','capacitor config in path filter'],['scripts/check-ios-strings.sh','script in path filter'],['npm ci','clean install'],['npm run build','build step'],['bash scripts/check-ios-strings.sh','gate invocation'],['cancel-in-progress: true','concurrency cancel']]; let fail=false; for (const [n,w] of required){if(!yaml.includes(n)){console.error('FAIL: missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: check-ios-strings.yml workflow shape');"</automated>
  </verify>
  <done>
    `.github/workflows/check-ios-strings.yml` exists. Triggered on push to main + PRs touching src/vite/capacitor/script/package.json. Runs npm ci + build + gate. Concurrency cancels stale runs.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Create shared vitest helper src/test/helpers/iosCapacitorMock.ts</name>
  <files>src/test/helpers/iosCapacitorMock.ts</files>
  <read_first>
    - src/hooks/useIsIOSCapacitor.ts (exports `useIsIOSCapacitor` + `isIOSCapacitor` — both must be mockable)
    - .planning/phases/02-monetiza-o-compliance-telemetria/02-06-SUMMARY.md (Path C wrapper pattern reference)
    - existing vitest tests for reference: src/hooks/travel/travel.adversarial.test.ts (mock patterns)
  </read_first>
  <action>
**3.1 — Create `src/test/helpers/iosCapacitorMock.ts`:**

```ts
import { vi, beforeEach } from 'vitest';

/**
 * Test helper for toggling the canonical iOS Path C runtime gate.
 *
 * Use in any *.test.tsx that needs to render a component in both branches
 * (iOS = pricing UI hidden, non-iOS = pricing UI rendered).
 *
 * Usage:
 *   import { mockIsIOSCapacitor, setIsIOSCapacitor } from '@/test/helpers/iosCapacitorMock';
 *
 *   mockIsIOSCapacitor();  // call once at top of file
 *
 *   describe('Component', () => {
 *     it('hides pricing on iOS', () => {
 *       setIsIOSCapacitor(true);
 *       const { queryByText } = render(<Component />);
 *       expect(queryByText('R$ 37,90')).toBeNull();
 *     });
 *
 *     it('shows pricing on non-iOS', () => {
 *       setIsIOSCapacitor(false);
 *       const { getByText } = render(<Component />);
 *       expect(getByText('R$ 37,90')).toBeInTheDocument();
 *     });
 *   });
 */

let _value = false;

export function mockIsIOSCapacitor(): void {
  vi.mock('@/hooks/useIsIOSCapacitor', () => ({
    useIsIOSCapacitor: () => _value,
    isIOSCapacitor: () => _value,
  }));

  beforeEach(() => {
    _value = false;
  });
}

export function setIsIOSCapacitor(value: boolean): void {
  _value = value;
}
```

**3.2 — Convention enforcement:**
- Module-level `let _value` per the hoisted-mock vitest pattern (vi.mock hoists, but the factory closes over `_value` lazily so the setter works)
- `beforeEach` resets to `false` to prevent cross-test leakage
- Both `useIsIOSCapacitor` (hook) and `isIOSCapacitor` (utility) mocked — Plan 02-06 ships both exports
- No `any`; TypeScript strict-compatible
- pt-BR not needed; this is internal test infrastructure
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); if(!fs.existsSync('src/test/helpers/iosCapacitorMock.ts')){console.error('FAIL: helper missing');process.exit(1);} const c=fs.readFileSync('src/test/helpers/iosCapacitorMock.ts','utf8'); const required=[['mockIsIOSCapacitor','factory export'],['setIsIOSCapacitor','setter export'],['vi.mock','vitest mock invocation'],['@/hooks/useIsIOSCapacitor','target module'],['useIsIOSCapacitor:','hook export mock'],['isIOSCapacitor:','utility export mock'],['beforeEach','reset hook'],['= false','reset value']]; let fail=false; for (const [n,w] of required){if(!c.includes(n)){console.error('FAIL: missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: iosCapacitorMock helper');"</automated>
  </verify>
  <done>
    `src/test/helpers/iosCapacitorMock.ts` exports `mockIsIOSCapacitor()` + `setIsIOSCapacitor(value)` for vitest hook-toggle testing. TypeScript strict.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: Per-page Path C unit tests (Assinatura, Index, AnimatedSections, CrispWidget)</name>
  <files>src/pages/__tests__/Assinatura.test.tsx, src/pages/__tests__/Index.test.tsx, src/components/sections/__tests__/AnimatedSections.test.tsx, src/components/legal/__tests__/CrispWidget.test.tsx</files>
  <read_first>
    - src/pages/Assinatura.tsx (verify the Path C early-return shape — pt-BR copy "Gerencie sua assinatura")
    - src/pages/Index.tsx (verify how PricingSection is conditionally rendered)
    - src/components/sections/AnimatedSections.tsx (verify PricingSection returns null on iOS)
    - src/components/legal/CrispWidget.tsx (verify early-return on isIOSCapacitor())
    - src/test/helpers/iosCapacitorMock.ts (Task 3)
    - .planning/phases/02-monetiza-o-compliance-telemetria/02-06-PLAN.md §Task 4 (component shapes that must be testable)
  </read_first>
  <behavior>
    For each of the 4 components:
    - Test 1: iOS branch renders neutral panel (or null); no pricing strings ("R$", "Upgrade", "Assinar", "Pro", "VIP") appear in the DOM
    - Test 2: Non-iOS branch renders the pricing UI; expected pricing strings DO appear in the DOM
    - (Optional Test 3 for Assinatura.tsx): iOS branch has NO clickable link element pointing to /assinatura or /planos or external Asaas URL (D-T16 + Plan 02-06 "no clickable link")
  </behavior>
  <action>
**4.1 — Create `src/pages/__tests__/Assinatura.test.tsx`:**

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { mockIsIOSCapacitor, setIsIOSCapacitor } from '@/test/helpers/iosCapacitorMock';

// MUST come before the import of Assinatura
mockIsIOSCapacitor();

// Also mock auth + supabase to avoid network in tests
// (Assinatura uses useAuth + supabase.functions.invoke).
vi.mock('@/contexts/authContext', () => ({
  AuthContext: { Provider: ({ children }: { children: React.ReactNode }) => children },
  useAuth: () => ({ user: null, loading: false }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  },
}));

// Import AFTER mocks
import Assinatura from '@/pages/Assinatura';

function renderAssinatura() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Assinatura />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Assinatura Path C runtime hide', () => {
  it('iOS branch — neutral panel WITHOUT pricing strings, WITHOUT clickable checkout link', () => {
    setIsIOSCapacitor(true);
    const { container, queryByText, queryAllByRole } = renderAssinatura();

    // The neutral panel must mention "Gerencie sua assinatura" but NOT pricing.
    expect(queryByText(/Gerencie sua assinatura/i)).toBeInTheDocument();

    // No R$ currency strings (full strict — even hidden in attributes)
    expect(container.textContent || '').not.toMatch(/R\$/);
    // No CTA copy
    expect(container.textContent || '').not.toMatch(/Assinar|Upgrade/i);

    // CRIT-03 / D-T16: NO clickable link from inside iOS app to checkout/pricing route
    const links = queryAllByRole('link');
    for (const link of links) {
      const href = link.getAttribute('href') || '';
      expect(href).not.toMatch(/assinatura|planos|checkout|asaas/i);
    }
  });

  it('non-iOS (web/android) branch — pricing surface SHOWS pricing strings', () => {
    setIsIOSCapacitor(false);
    const { container } = renderAssinatura();

    // Some pricing string is present (R$ or plan name with price)
    const text = container.textContent || '';
    // We assert presence of R$ OR a plan-card heading like "Plano Pro" — both indicate pricing UI rendered.
    expect(text).toMatch(/R\$|Plano Pro|Plano VIP/i);
  });
});
```

**4.2 — Create `src/pages/__tests__/Index.test.tsx`:**

Same template, but for `Index` (the landing page). Index.tsx renders PricingSection via `<AnimatedSections.PricingSection />` and a direct fallback for anonymous users. Verify:
- iOS: no R$, no "Upgrade", no "Assinar" anywhere
- non-iOS: at least one pricing string appears

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { mockIsIOSCapacitor, setIsIOSCapacitor } from '@/test/helpers/iosCapacitorMock';

mockIsIOSCapacitor();

vi.mock('@/contexts/authContext', () => ({
  useAuth: () => ({ user: null, loading: false }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}));
// Posthog + Sentry are no-ops in tests (init only fires with key set)
vi.mock('@/lib/posthog', () => ({
  pageview: vi.fn(),
  track: vi.fn(),
}));

import Index from '@/pages/Index';

function renderIndex() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Index Path C runtime hide', () => {
  it('iOS branch — landing has NO pricing UI', () => {
    setIsIOSCapacitor(true);
    const { container } = renderIndex();
    const text = container.textContent || '';
    expect(text).not.toMatch(/R\$/);
    expect(text).not.toMatch(/Upgrade|Assinar/i);
  });

  it('non-iOS — landing has pricing UI', () => {
    setIsIOSCapacitor(false);
    const { container } = renderIndex();
    const text = container.textContent || '';
    expect(text).toMatch(/R\$|Plano Pro/i);
  });
});
```

**4.3 — Create `src/components/sections/__tests__/AnimatedSections.test.tsx`:**

Tests `PricingSection` directly (it is the component that Plan 02-06 wrapped with `if (useIsIOSCapacitor()) return null`).

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { mockIsIOSCapacitor, setIsIOSCapacitor } from '@/test/helpers/iosCapacitorMock';

mockIsIOSCapacitor();

vi.mock('@/lib/posthog', () => ({ track: vi.fn() }));

import { PricingSection } from '@/components/sections/AnimatedSections';

describe('AnimatedSections.PricingSection Path C runtime hide', () => {
  it('iOS branch — returns null (renders nothing)', () => {
    setIsIOSCapacitor(true);
    const { container } = render(
      <MemoryRouter>
        <PricingSection />
      </MemoryRouter>,
    );
    // null render → empty body of mount node
    expect(container.firstChild).toBeNull();
  });

  it('non-iOS — renders pricing cards with R$', () => {
    setIsIOSCapacitor(false);
    const { container } = render(
      <MemoryRouter>
        <PricingSection />
      </MemoryRouter>,
    );
    expect(container.textContent || '').toMatch(/R\$/);
  });
});
```

**4.4 — Create `src/components/legal/__tests__/CrispWidget.test.tsx`:**

Test that CrispWidget early-returns (does NOT mount Crisp script) on iOS.

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import { mockIsIOSCapacitor, setIsIOSCapacitor } from '@/test/helpers/iosCapacitorMock';

mockIsIOSCapacitor();

// Mock useConsent to return marketingOptedIn=true (so the OTHER gate doesn't short-circuit the test)
vi.mock('@/hooks/useConsent', () => ({
  useConsent: () => ({
    consent: { marketing_accepted_at: new Date().toISOString(), privacy_accepted_at: new Date().toISOString() },
    marketingOptedIn: true,
    privacyAcceptedAt: new Date().toISOString(),
    isLoading: false,
  }),
}));

vi.mock('@/contexts/authContext', () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

import CrispWidget from '@/components/legal/CrispWidget';

describe('CrispWidget Path C runtime hide', () => {
  it('iOS branch — does NOT inject Crisp script into document', () => {
    setIsIOSCapacitor(true);
    const before = document.querySelectorAll('script[src*="crisp"]').length;
    render(<CrispWidget />);
    const after = document.querySelectorAll('script[src*="crisp"]').length;
    expect(after).toBe(before);  // no new script tag
  });

  it('non-iOS branch — also no script injection in this test (Website ID env unset in vitest)', () => {
    setIsIOSCapacitor(false);
    // The widget is gated by VITE_CRISP_WEBSITE_ID which is unset in tests → early return.
    // This test simply asserts the component renders without throwing.
    const result = render(<CrispWidget />);
    expect(result.container).toBeDefined();
  });
});
```

**4.5 — Run all 4 test files locally:**

```bash
npm run test:unit -- src/pages/__tests__/Assinatura.test.tsx src/pages/__tests__/Index.test.tsx src/components/sections/__tests__/AnimatedSections.test.tsx src/components/legal/__tests__/CrispWidget.test.tsx
```

Expected: 8 tests passing (2 per file).

If a test FAILS, the failure indicates a real issue in Plan 02-06's Path C wrapping — surface it as a gap (not as a test bug) and require a fix in a follow-up plan.

**4.6 — Convention enforcement:**
- @testing-library/react for rendering (NOT enzyme — project doesn't use it)
- MemoryRouter wrapping for components with `<Link>`
- QueryClientProvider for components using react-query (Assinatura.tsx does)
- All `vi.mock(...)` calls BEFORE the corresponding `import` (vitest hoists mocks but discipline matters)
- pt-BR matches in assertions match the user-facing copy on web; iOS-branch tests assert absence of those same strings
- `queryByText` / `queryAllByRole` for "may not be present" assertions; `getByText` for "must be present"
- No snapshots (project convention)
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const files=['src/pages/__tests__/Assinatura.test.tsx','src/pages/__tests__/Index.test.tsx','src/components/sections/__tests__/AnimatedSections.test.tsx','src/components/legal/__tests__/CrispWidget.test.tsx']; let fail=false; for (const f of files){if(!fs.existsSync(f)){console.error('FAIL: missing file',f);fail=true;continue;} const c=fs.readFileSync(f,'utf8'); const need=[['mockIsIOSCapacitor','helper imported'],['setIsIOSCapacitor(true)','iOS branch tested'],['setIsIOSCapacitor(false)','non-iOS branch tested']]; for (const [n,w] of need){if(!c.includes(n)){console.error('FAIL:',f,'missing —',w);fail=true;}}} if(fail)process.exit(1); console.log('OK: 4 Path C unit test files present + both-branch coverage');"</automated>
  </verify>
  <done>
    4 unit test files exist, each tests both iOS=true and iOS=false branches via the shared mock helper. `npm run test:unit -- <these files>` exits 0 with 8 passing tests. If any FAIL, surface as a Phase 2 W2b gap.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Source code commit ↔ CI gate | Path C compliance enforced at PR merge time, not at submission time |
| Build output (`dist/`) ↔ iOS bundle (`ios/App/App/public/`) | Bundle is byte-identical; gate runs on `dist/` as proxy |
| Unit test mock ↔ runtime behavior | Mock toggles hook; production runs the real Capacitor check |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-3-01 | Tampering / Compliance | Future commit accidentally introduces a pricing CTA (`<a href="/planos">`) inside a component that does not gate by `useIsIOSCapacitor()` → iOS bundle ships anti-steering link → Apple Reviewer rejects under Guideline 3.1.1(a) | mitigate | (a) `scripts/check-ios-strings.sh` PATTERN locked verbatim to ROADMAP §"Phase 3 SC#1" (narrowed gate, 2026-05-14); script header comment-block points future maintainers at the ROADMAP rationale to prevent accidental widening or removal. (b) CI workflow `.github/workflows/check-ios-strings.yml` enforces on every PR + push to main. (c) Per-component unit tests in Task 4 prove each Path C-wrapped component renders no pricing on iOS. (d) Manual TestFlight walkthrough is the final gate (V03-VALIDATION §"Manual-Only Verifications"). |
| T-3-01b | Tampering | A developer disables the CI gate via `paths-ignore` on a PR | accept (requires social trust — solo developer) | The workflow is a single file; review-time visibility is high. If team grows, add branch-protection rule requiring this check to pass before merge. |
| T-3-01c | Spoofing | The script's grep regex misses a new anti-steering pattern (e.g., a future `<button onClick={() => window.location.assign('/checkout')}>`) | mitigate (partial) | The regex covers the known anti-steering vectors from ROADMAP SC#1. New patterns require ROADMAP SC#1 update FIRST (surfacing the decision), then script extension. Defense-in-depth: the unit tests in Task 4 assert NO clickable link with href matching pricing routes — the JSX-level assertion catches more shapes than the bundle-grep. |
| T-3-01d | Tampering | A future PR silently softens the PATTERN in the script without updating ROADMAP | mitigate | Task 1 verification regex banned-string `'planos|checkout|R\\$|Upgrade|Assinar'` (the legacy verbatim pattern) catches re-introduction of the impossible-to-satisfy gate. Header comment-block + must_haves entry on ROADMAP cross-reference make the decision discoverable. |
</threat_model>

<verification>
After all 4 tasks complete:

```bash
# 1. Script exists + executable + structure
test -x scripts/check-ios-strings.sh && grep -E '#!/usr/bin/env bash|set -euo pipefail' scripts/check-ios-strings.sh

# 2. Script PATTERN matches ROADMAP SC#1 (narrowed gate)
grep -F 'href="/planos|href="/checkout|href="/assinatura|window\.location.*(?:planos|checkout|assinatura)|Browser\.open.*(?:asaas|checkout|planos)' scripts/check-ios-strings.sh

# 3. Script header references ROADMAP rationale
grep -F 'ROADMAP.md' scripts/check-ios-strings.sh

# 4. CI workflow exists with required triggers
grep -E 'paths:|vite.config.ts|capacitor.config.ts' .github/workflows/check-ios-strings.yml

# 5. Local smoke: gate green on current main
npm run build && bash scripts/check-ios-strings.sh

# 6. Unit tests green
npm run test:unit -- src/pages/__tests__/Assinatura.test.tsx src/pages/__tests__/Index.test.tsx src/components/sections/__tests__/AnimatedSections.test.tsx src/components/legal/__tests__/CrispWidget.test.tsx

# 7. Existing unit suite still green (regression check)
npm run test:unit

# 8. Lint + typecheck still pass
npm run lint && npm run typecheck
```
</verification>

<success_criteria>
- `scripts/check-ios-strings.sh` exists, executable, exits 0 on current main, exits non-zero if anti-steering route-link pattern detected in `dist/assets/*.js`
- Script PATTERN is byte-identical to ROADMAP §"Phase 3 SC#1" narrowed gate (2026-05-14 locked decision)
- Script header comment-block references `.planning/ROADMAP.md` so future maintainers find the rationale before widening
- `.github/workflows/check-ios-strings.yml` runs on push to main + PR touching client code; calls `npm ci && npm run build && bash scripts/check-ios-strings.sh`
- `src/test/helpers/iosCapacitorMock.ts` provides `mockIsIOSCapacitor` + `setIsIOSCapacitor(value: boolean)` for vitest
- 4 component test files exist (Assinatura, Index, AnimatedSections, CrispWidget); each asserts iOS=true hides pricing, iOS=false shows pricing
- `npm run test:unit -- <new files>` passes 8 tests
- `npm run test:unit` (full unit suite) still passes 113+ existing + 8 new = 121+ tests
- `npm run lint && npm run typecheck` pass
</success_criteria>

<output>
After completion, create `.planning/phases/03-mobile-distribution-launch/03-02-SUMMARY.md` documenting:
- The locked gate semantics (anti-steering route-link pattern from ROADMAP §"Phase 3 SC#1", narrowed 2026-05-14) — including a link back to that rationale section
- CI workflow status from the first PR that triggered it
- Total unit-test count delta (113 → 121)
- Any gaps surfaced from Task 4 tests (if any component failed the iOS-hide assertion, that indicates a Plan 02-06 regression — file as gap-closure for follow-up plan)
- Reminder for future plans: any new pricing-adjacent component MUST consume `useIsIOSCapacitor` AND add a paired unit test in __tests__/; any future widening of the PATTERN requires ROADMAP SC#1 update first
</output>
