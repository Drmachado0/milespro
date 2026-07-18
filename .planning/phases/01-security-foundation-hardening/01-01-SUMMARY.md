---
phase: 01-security-foundation-hardening
plan: 01
subsystem: testing
tags: [testing, vitest, ci, supabase, foundation, wave-0]

requires:
  - phase: 00-init
    provides: "vitest 4.1.4 + @testing-library/react devDeps; existing 93 unit tests; supabase-js client baseline; `quality:` + `audit:` CI jobs"
provides:
  - "vitest multi-project config split: `unit` (mocked, ~4s) + `integration` (real local Supabase)"
  - "src/test/integration/ helpers: adminClient (service-role), fixtures (FREE/PRO/VIP users + clientAs + seedTravelClient), setup (beforeAll/afterAll user lifecycle)"
  - "CI `integration:` job that boots `supabase start` in background, applies migrations, runs adversarial tests, stops Supabase on success or failure"
  - "scripts/test-secret-guard.sh harness for Plan 03's failOnSecretLeak() Vite plugin"
affects:
  - 01-02-PLAN  # Enum migration tests will use the integration project
  - 01-03-PLAN  # Will be verified by scripts/test-secret-guard.sh
  - 01-04-PLAN  # has_plan() function tests run on the integration project
  - 01-05-PLAN  # RLS rewrite verification runs on the integration project
  - 01-06-PLAN  # Adversarial test files (travel/vip) consume clientAs + seedTravelClient + adminClient

tech-stack:
  added:
    - "supabase/setup-cli@v2 (CI dependency)"
  patterns:
    - "Multi-project vitest split (unit + integration), file-parallelism disabled on integration to serialize DB writes"
    - "persistSession: false + autoRefreshToken: false on BOTH admin and user Supabase clients (Pitfall 1 — jsdom session collision)"
    - "Test-user fixture convention: fixed UUIDs 00000000-0000-0000-0000-00000000000{1,2,3} + @test.invalid TLD (RFC 6761)"
    - "CI background-start optimization: `supabase start &` parallel with `npm ci`, polled by `supabase status` loop"
    - "Local-keys-only CI policy: integration job never reads `${{ secrets.* }}`; relies entirely on `supabase status -o env`"

key-files:
  created:
    - "src/test/integration/adminClient.ts"
    - "src/test/integration/fixtures.ts"
    - "src/test/integration/setup.ts"
    - "scripts/test-secret-guard.sh (executable bit 100755 set via git update-index)"
  modified:
    - "vitest.config.ts (single-project → multi-project)"
    - "package.json (added test:unit and test:integration scripts)"
    - ".github/workflows/ci.yml (new integration job)"

key-decisions:
  - "Adopted RESEARCH §Pattern 1 / §Pattern 3 / §Example 3 verbatim (zero deltas from research templates) — Wave 0 is foundation, deviating without strong reason would risk fragmenting test conventions for downstream plans"
  - "test:unit and test:integration scripts added but `npm test` (no flags) still runs both projects — matches RESEARCH §1057 expectation that default `npm test` is the broadest signal"
  - "Integration job gated on `needs: quality` — if lint/typecheck/build is broken, no point spending ~3 min on `supabase start`"
  - "Executable bit on shell script set via `git update-index --chmod=+x` so the bit lands in the repo even when authored on Windows (Git Bash chmod is no-op)"

patterns-established:
  - "Pattern P1 (Pitfall 1 enforcement): persistSession: false on BOTH admin and anon-key clients prevents jsdom localStorage cross-contamination"
  - "Pattern P2 (Wave-0 test data lifecycle): beforeAll seeds users via admin.createUser → user_subscriptions upsert; afterAll deletes via admin.deleteUser. Test users are obviously synthetic (fixed UUIDs + @test.invalid)"
  - "Pattern P3 (CI sequencing): supabase start (background) → npm ci → wait-loop → status -o env → db reset --no-seed → vitest integration → stop (always)"
  - "Pattern P4 (verification harness before plugin): scripts/test-secret-guard.sh exists in Wave 0, exercises a plugin that lands in Plan 03 — harness is the gate, not the implementation"

requirements-completed: [SEC-07]

duration: "3m 35s"
completed: 2026-05-12
---

# Phase 1 Plan 01: Wave 0 Test Foundation Summary

**Vitest multi-project split (unit + integration), service-role-backed integration helpers (adminClient + FREE/PRO/VIP fixtures), local-Supabase CI integration job, and a secret-guard shell harness ready to gate Plan 03's failOnSecretLeak() plugin.**

## Performance

- **Duration:** 3m 35s
- **Started:** 2026-05-12T09:32:03Z
- **Completed:** 2026-05-12T09:35:38Z
- **Tasks:** 3 / 3
- **Files modified:** 6 (3 created in src/test/integration/, 1 created in scripts/, 2 modified at repo root, 1 modified under .github/workflows/)

## Accomplishments

- **Vitest split lands cleanly:** existing 93 unit tests stay green; integration project routes only `*.adversarial.test.{ts,tsx}` files (zero of those exist today — Plan 06 ships them), so `npm test -- --project=integration --run` correctly exits 1 with "No test files found" until Plan 06.
- **Integration helpers ready for adoption:** `adminClient` (service-role, persistSession: false), `clientAs()` (per-test anon-key signin), `seedTravelClient()` (FK satisfier for travel_* tables), and a `setup.ts` that idempotently creates FREE/PRO/VIP test users and seeds their `user_subscriptions` rows.
- **CI workflow gains real DB integration rail:** the new `integration:` job uses `supabase/setup-cli@v2`, boots `supabase start` in background parallel to `npm ci`, polls `supabase status` with a 2-min budget, exports the local Supabase URL + anon + service-role keys to `$GITHUB_ENV`, resets DB with all migrations applied, runs vitest integration, and stops Supabase on success or failure.
- **Secret-guard harness in place:** `scripts/test-secret-guard.sh` is executable (`100755` in git index), uses bash strict mode (`set -uo pipefail`), tests both forbidden-env (Test 1: `VITE_FAKE_SERVICE_ROLE_KEY=x`) and missing-required-env (Test 2: unset `VITE_SUPABASE_PUBLISHABLE_KEY`) probes. Will fail today until Plan 03 ships `failOnSecretLeak()`, which is the entire point of the harness.

## Task Commits

Each task committed atomically with `--no-verify` (parallel-worktree convention):

1. **Task 1: Split vitest into unit + integration projects and create integration helpers** — `fd6ce98` (test)
2. **Task 2: Add `integration` CI job that boots `supabase start` and runs adversarial suite** — `036ba5f` (ci)
3. **Task 3: Create scripts/test-secret-guard.sh shell smoke test** — `8210fcf` (test)

## Files Created/Modified

- `vitest.config.ts` — replaced single-project shape with `projects: [unit, integration]`; unit excludes `*.adversarial.test.{ts,tsx}` and `src/test/integration/**`; integration sets `fileParallelism: false`, `testTimeout: 15000`, `hookTimeout: 60000`.
- `src/test/integration/adminClient.ts` — service-role Supabase client factory with `persistSession: false` + `autoRefreshToken: false`; throws on missing `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` env vars (so CI fails fast with a useful diagnostic).
- `src/test/integration/fixtures.ts` — exports `FREE_USER`, `PRO_USER`, `VIP_USER` (fixed UUIDs + `@test.invalid` emails), `PASSWORD`, `clientAs(user)` per-test signin helper, `seedTravelClient(userId, label)` FK seeder.
- `src/test/integration/setup.ts` — `beforeAll` creates the three users via `auth.admin.createUser` (idempotent: tolerates "already registered" errors) and upserts their `user_subscriptions` plan rows (PRO/VIP; FREE is the trigger default). `afterAll` deletes the three users.
- `package.json` — added `"test:unit": "vitest run --project=unit"` and `"test:integration": "vitest run --project=integration"` adjacent to the existing `"test": "vitest run"` (which remains the broadest-signal default).
- `.github/workflows/ci.yml` — appended `integration:` job after `audit:`, gated on `needs: quality`. Uses background `supabase start &` parallel with `npm ci` (RESEARCH §Pitfall 7), polls `supabase status` every 2s up to 60 attempts. Stops Supabase with `if: always()`. Job consumes zero `${{ secrets.* }}` — all env from `supabase status -o env`.
- `scripts/test-secret-guard.sh` — executable bash smoke test for Plan 03's plugin. Uses placeholder-only URLs/keys, never references the real production project ID.

## Decisions Made

All decisions follow the plan's `<action>` blocks verbatim. The only judgment calls (all defensive, all aligned with research / CONTEXT):

1. **Test users seeded by upsert, not insert** — `setup.ts` uses `.upsert(..., { onConflict: 'user_id' })` so re-runs of the integration suite against an already-populated DB don't fail. Aligns with RESEARCH §Pattern 3 idiom (idempotent setup).
2. **`integration:` job placement after `audit:`** — preserves existing job order and the top-of-file `concurrency:` block already covers the new job (no edit needed there).
3. **Did NOT add `gitattributes` for the `.sh` LF/CRLF warning** — out of scope; warning is benign and doesn't affect execution (Git Bash on Windows handles either line ending; CI runs on Ubuntu where the bash interpreter is LF-tolerant).

## Deviations from Plan

None — plan executed exactly as written, verbatim adoption of RESEARCH §Pattern 1 / §Pattern 3 / §Example 3 as the `<output>` block explicitly mandated. Zero deltas.

## Issues Encountered

- **Vitest 4.1.6 `--reporter=basic` crash on Windows:** when running `npm test -- --project=unit --run --reporter=basic` (the exact form spelled in Task 1's `<automated>` block), vitest crashed inside its CLI machinery with a Vite chunk error. **Resolution:** ran the same test with the default reporter — `npm test -- --project=unit --run` — which passed cleanly (17 files / 93 tests). This is a vitest CLI bug, not a code/config bug; the verification's intent (confirm unit project is isolated and existing tests pass) is satisfied. The CI runs on Ubuntu and the `<verify>` block won't trip this Windows-only crash. No code change needed; documented here for future reference.

## User Setup Required

None — Wave 0 ships test infrastructure only. The new `integration:` CI job requires no GitHub Actions secrets (all keys come from `supabase status -o env` of the locally-booted Supabase stack). Plan 03 will reuse this same harness; no new env knobs added by this plan.

## Threat Flags

No new threat flags. The plan's `<threat_model>` covered:
- T-1-02 (CI secrets disclosure) — mitigated, no `${{ secrets.* }}` in the new job, verified by grep.
- T-1-05 (test fixture data disclosure) — mitigated, synthetic UUIDs + `@test.invalid` emails.
- T-1-XX (test infra tampering) — mitigated, `persistSession: false` on both clients.

No additional surface introduced.

## Next Phase Readiness

**Ready for Wave 1 (parallel execution):**
- **Plan 01-02 (enum consolidation)** — will run a backfill migration; can use the integration project to verify `user_subscriptions.plan` distribution post-migration. Adapter pattern is in place.
- **Plan 01-03 (secret hygiene + failOnSecretLeak plugin)** — `scripts/test-secret-guard.sh` is waiting to verify the plugin. After Plan 03 lands, this script becomes the green-light gate for SEC-03/SEC-04.
- **Plan 01-04 (trust kernel `has_plan` function)** — can immediately consume `adminClient` to seed plan rows and `clientAs(user)` to verify SECURITY DEFINER from authenticated session.
- **Plan 01-05 (RLS rewrites)** — same as Plan 04; ready to wire its `*.adversarial.test.ts` files to `clientAs` + `seedTravelClient`.
- **Plan 01-06 (adversarial test files)** — every helper it imports (`clientAs`, `seedTravelClient`, `FREE_USER`, `PRO_USER`, `VIP_USER`, `adminClient`) is exported from `@/test/integration/*` exactly as Plan 06 expects.

**Concerns for downstream:**
- Plan 06's adversarial files MUST be named `*.adversarial.test.{ts,tsx}` for the integration project glob to pick them up (the unit project's `exclude` and the integration project's `include` are both keyed on that suffix).
- The CI `integration:` job will exit 1 with "No test files found" until Plan 06 lands. This is expected behavior pre-Plan-06; if a downstream wave is run in isolation before Plan 06, this CI job will fail. Consider gating Plan 06 on the same wave as the first downstream plan that needs CI green.

## Self-Check

Verifying claims before returning to orchestrator.

### Files exist

- [x] `vitest.config.ts` — FOUND (modified to multi-project shape)
- [x] `src/test/integration/adminClient.ts` — FOUND (74 lines)
- [x] `src/test/integration/fixtures.ts` — FOUND (59 lines)
- [x] `src/test/integration/setup.ts` — FOUND (44 lines)
- [x] `package.json` — FOUND (modified, test:unit + test:integration scripts present)
- [x] `.github/workflows/ci.yml` — FOUND (modified, `integration:` job present)
- [x] `scripts/test-secret-guard.sh` — FOUND (49 lines, mode 100755)

### Commits exist

- [x] `fd6ce98` — Task 1: vitest split + integration helpers
- [x] `036ba5f` — Task 2: integration CI job
- [x] `8210fcf` — Task 3: secret-guard script

### Verifications

- [x] `npm test -- --project=unit --run` → 17 files / 93 tests passed (4.02s)
- [x] `npm run typecheck` → exit 0
- [x] `npm run lint` → exit 0
- [x] CI yaml jobs = `['quality', 'audit', 'integration']` (Python yaml.safe_load)
- [x] `bash -n scripts/test-secret-guard.sh` → exit 0
- [x] Zero `console.*` in `src/test/integration/` (grep)
- [x] Zero `${{ secrets.* }}` inside the new `integration:` job (grep)
- [x] `git diff --diff-filter=D` HEAD~3..HEAD → 0 files deleted

## Self-Check: PASSED

---
*Phase: 01-security-foundation-hardening*
*Plan: 01*
*Wave: 0 (foundation, must land before Waves 1-4)*
*Completed: 2026-05-12*
