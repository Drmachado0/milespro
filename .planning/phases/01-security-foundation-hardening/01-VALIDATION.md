---
phase: 1
slug: security-foundation-hardening
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-12
updated: 2026-05-12
revision: 1
revision_notes: "B-1 (google-calendar-auth Deno test), B-2 (VALID_PLANS guard), B-3 (Task 4 split into 4a/4b/4c with checkpoint), B-4 (Task 5.5 post-rotation smoke), W-1..W-5 + I-1 + I-2 applied. See 01-06-PLAN.md output section for full revision audit."
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Per-Task map and Wave 0 list filled by gsd-planner during plan generation (2026-05-12).
> Updated 2026-05-12 (revision 1) — incorporates B-1/B-2/B-3/B-4 + W-1..W-5 + I-1 fixes.
> Full Validation Architecture analysis lives in `01-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.4 (existing) + supabase-js 2.x against `supabase start` (Plan 01 Task 1 adds the `integration` project) + Deno test (B-1 — `supabase/functions/google-calendar-auth/index.test.ts`) |
| **Config file** | `vitest.config.ts` (Plan 01 Task 1 splits into `unit` + `integration` projects) |
| **Quick run command** | `npm test -- --project=unit --run` (~3-30s after Wave 0; covers SEC-05 collapse-logic-deletion + SEC-07 component tests) |
| **Full suite command** | `npm test` (unit + integration; ~30s + ~15s after Wave 0) |
| **Deno test command (B-1)** | `deno test --allow-env --allow-net supabase/functions/google-calendar-auth/index.test.ts` |
| **Estimated runtime** | unit: ~30s · integration: ~15s · build+secret-grep: ~20s · CI cold: ~3-5min |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --project=unit --run`
- **After every plan wave:** Run `npm test` (full suite)
- **After SQL migrations applied (locally):** Run `npm test -- --project=integration --run` + `psql -c "SELECT enum_range(...)"` smoke
- **Before `/gsd-verify-work`:** Full suite green + `npm run build` exits 0 + `grep -rE 'service_role|sk_live|sk_test|eyJhbGc' dist/` returns 0 + `bash scripts/test-secret-guard.sh` exits 0
- **B-4 — after Task 5 service-role rotation:** Run Task 5.5 auto-discovery curl loop; every discovered edge function returns non-401/non-500
- **Max feedback latency:** 30 seconds (unit project after Wave 0; CI runs full ~5min on cold cache)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01.T1 | 01-01 | 0 | SEC-07 | T-1-XX (Pitfall 1) | vitest split: unit excludes adversarial; persistSession:false on admin AND user clients | property | `npm test -- --project=unit --run` exits 0 with 93+ tests | ❌ Wave 0 | ⬜ pending |
| 01.T2 | 01-01 | 0 | SEC-07 | T-1-02 (CI logs) | CI integration job uses ZERO `${{ secrets.* }}`; `needs: quality` gating | property | YAML structural grep + `grep secrets\\.` returns 0 | ❌ Wave 0 | ⬜ pending |
| 01.T3 | 01-01 | 0 | SEC-03/04 | T-1-02 | Shell harness verifies failOnSecretLeak rejects forbidden VITE_* AND missing required vars | smoke | `bash scripts/test-secret-guard.sh` exits 0 (after Plan 03 Task 1) | ❌ Wave 0 | ⬜ pending |
| 02.T1 | 01-02 | 1 | SEC-05 | T-1-06, T-1-XX-UX (W-3) | Pre-flight captures plan distribution + verifies no generated columns / functional indexes + W-3 sidebar requiredPlan preflight (1.6) | smoke | All 6 `/tmp/phase1-preflight-*.txt` exist (5 original + W-3 sidebar) + `grep "auth\\.jwt() ->> 'plan'"` returns 0 | ❌ diagnostic only | ⬜ pending |
| 02.T2 | 01-02 | 1 | SEC-05 | T-1-06 | Single-transaction enum recreate (5→3); CASCADE-drop+recreate functions; rollback comment block | property | `psql -c "SELECT enum_range(...)"` returns `{free,pro,vip}` | ❌ Wave 1 | ⬜ pending |
| 02.T3 | 01-02 | 1 | SEC-05 | T-1-XX (collapse regression) | TS canonical type + zero `'plus'`/isPlus/canAccessPlus identifiers + **B-2 VALID_PLANS runtime guard** + W-3 per-item nav re-tiering decisions documented + W-4 types regen idempotency note | property | `npm run typecheck` exits 0 + `grep -rE "['\"]plus['\"]" src/` returns 0 + `grep -n "VALID_PLANS.includes" src/hooks/useSubscription.ts` returns 1 + `npm test -- --project=unit --run` exits 0 with 93 existing tests | ❌ Wave 1 | ⬜ pending |
| 03.T1 | 01-03 | 1 | SEC-03/04 | T-1-02, T-1-XX (silent fallback) | failOnSecretLeak() in plugins[0]; deletes 3 `*_FALLBACK` constants; build aborts on poisoned env OR missing required env | property | `bash scripts/test-secret-guard.sh` exits 0 + structural grep checks on vite.config.ts | ❌ Wave 1 | ⬜ pending |
| 03.T2 | 01-03 | 1 | SEC-03 | T-1-02 | supabaseAdmin export deleted; client.ts is anon-only | property | `grep -rn "supabaseAdmin" src/` returns 0 + `grep -rE "service_role" dist/` returns 0 | ❌ Wave 1 | ⬜ pending |
| 03.T3 | 01-03 | 1 | SEC-03 | T-1-04 | OAUTH_STATE_SECRET as preferred HMAC secret with fallback to service-role during PR window + W-2 log idiom matches existing `console.warn` | smoke | `grep "Deno.env.get('OAUTH_STATE_SECRET')" supabase/functions/google-calendar-auth/index.ts` returns 1 + manual OAuth round-trip green | ❌ Wave 1 | ⬜ pending |
| 04.T1 | 01-04 | 2 | SEC-06 | T-1-01, T-1-03 | has_plan() SECURITY DEFINER with locked search_path; correct hierarchy; inline self-check DO block | property | `psql -c "SELECT public.has_plan(gen_random_uuid(), 'free')"` returns t | ❌ Wave 2 | ⬜ pending |
| 04.T2 | 01-04 | 2 | SEC-06 | T-1-XX (managed_accounts revoke) | managed_accounts table + RLS (4 snake_case policies, has_plan(_, 'vip') in WITH CHECK) + can_access_account() with revoked_at IS NULL hard-isolation + W-4 types regen diff is purely additive | property | `psql -c "SELECT to_regclass('public.managed_accounts')"` returns managed_accounts + `psql -c "SELECT polname FROM pg_policy WHERE polrelid='public.managed_accounts'::regclass"` returns 4 rows + `git diff src/integrations/supabase/types.ts` shows only additive managed_accounts shape | ❌ Wave 2 | ⬜ pending |
| 05.T1 | 01-05 | 3 | SEC-01, SEC-02 | T-1-01, T-1-XX (HIGH-04 missing WITH CHECK), T-1-XX (forgotten table), W-5 (legacy survivors) | All travel_* tables have 4 trust-kernel-named policies; every UPDATE has both USING and WITH CHECK; **W-5 DO block enumerates legacy + zero-survivors gate** | property | `psql -c "SELECT polrelid::regclass, COUNT(*) FROM pg_policy WHERE polname LIKE 'travel_%' GROUP BY polrelid"` shows 4 per table + zero-legacy-survivors psql returns 0 (W-5) + `psql -c "SELECT polname FROM pg_policy WHERE polcmd='w' AND polrelid IN (...) AND polwithcheck IS NULL"` returns 0 rows | ❌ Wave 3 | ⬜ pending |
| 05.T2 | 01-05 | 3 | SEC-01, SEC-02 | T-1-01 (vip_*), W-5 (legacy survivors) | All vip_* tables have trust-kernel policies (Case A) OR sentinel armed (Case B no-op); **W-5 DO block + zero-survivors gate** in Case A | property | Case A: same as 05.T1 with 'vip_%' substituted + W-5 gate. Case B: `grep "RAISE EXCEPTION" supabase/migrations/20260512120005_*.sql` returns 1 (sentinel) | ❌ Wave 3 | ⬜ pending |
| 06.T1 | 01-06 | 4 | SEC-01, SEC-02, SEC-06, SEC-07 | T-1-01, T-1-03, T-1-XX (Pitfall 5/6) | Adversarial integration test for every travel_* table × 3 plans × 4 ops; soft-isolation downgrade; re-sign-in pattern after admin update | integration | `npm test -- --project=integration --run` exits 0 with ≥32 tests passing | ❌ Wave 4 | ⬜ pending |
| 06.T2 | 01-06 | 4 | SEC-07 | T-1-XX (B-1 SEC-07 google-calendar-auth coverage), T-1-XX (B-2 collapse regression), T-1-XX (I-1 ErrorBoundary determinism) | 5 critical paths get ≥1 happy + ≥1 adversarial test (4 unit + **B-1 google-calendar-auth Deno test** as 5th file); **B-2 useSubscription Test 4 asserts strict `plan === 'free'` for legacy basic** (real regression guard); **I-1 ErrorBoundary home button uses `getByRole` (no hedge)** | unit + Deno | `npm test -- --project=unit --run` exits 0 with ≥105 tests passing AND `supabase/functions/google-calendar-auth/index.test.ts` exists with `Deno.test`/`signState`/`verifyState`/`tampered`/`TTL` markers AND `signState`/`verifyState` exported from `index.ts` | ❌ Wave 4 | ⬜ pending |
| 06.T3 | 01-06 | 4 | SEC-03 | T-1-04 | OAUTH_STATE_SECRET fallback removed; throws if unset; >11 min after Plan 03 deploy | property | `grep "OAUTH_STATE_SECRET ?? SUPABASE_SERVICE_ROLE_KEY" supabase/functions/google-calendar-auth/index.ts` returns 0 + manual OAuth round-trip green | ❌ Wave 4 | ⬜ pending |
| 06.T4a | 01-06 | 4 | SEC-01, SEC-02, SEC-05, SEC-06 | T-1-06 | **[B-3 split 1/3] Pre-deploy rehearsal** — db dump from prod → restore local → migrations + tests green | smoke | `/tmp/phase1-rehearsal-output.txt` and `/tmp/phase1-preflight-prod-dump.sql` exist; `npm test`/`typecheck`/`lint`/`build` all exit 0 against prod-shaped local DB | ❌ Wave 4 | ⬜ pending |
| 06.T4b | 01-06 | 4 | SEC-01, SEC-02, SEC-05, SEC-06 | T-1-XX (B-3 unauthorized prod push) | **[B-3 split 2/3 — CHECKPOINT human-confirm] Dry-run + human approval before push** | manual | Human signal `push-confirmed` after viewing dry-run output + rehearsal summary + linked-project ID confirmation | ❌ Wave 4 | ⬜ pending |
| 06.T4c | 01-06 | 4 | SEC-01, SEC-02, SEC-05, SEC-06 | T-1-06, T-1-XX (production access) | **[B-3 split 3/3] supabase db push --linked** (autonomous, post-checkpoint) | smoke | `supabase migration list --linked` shows all 5 Phase-1 timestamps as Applied; `psql "$PROD_DB_URL" -c "SELECT enum_range(NULL::public.subscription_plan)"` returns `{free,pro,vip}` | ❌ Wave 4 | ⬜ pending |
| 06.T5 | 01-06 | 4 | SEC-03 | T-1-XX (rotation in-flight) | **[CHECKPOINT human-action]** Service-role key rotated in Supabase Dashboard; new value set via `supabase secrets set` | manual | Human verification per checkpoint resume-signal `rotation-complete` | ❌ Wave 4 | ⬜ pending |
| 06.T5.5 | 01-06 | 4 | SEC-03 | T-1-XX (B-4 stale-secret edge function) | **[B-4] Auto-discovery curl smoke** — every supabase/functions/*/index.ts containing SUPABASE_SERVICE_ROLE_KEY is curled; non-401/non-500 status required | smoke | `/tmp/phase1-post-rotation-smoke.txt` captured; per-function HTTP status logged; zero 401/500 responses | ❌ Wave 4 | ⬜ pending |
| 06.T6 | 01-06 | 4 | SC#1-5 | All T-1-* | All 5 ROADMAP Success Criteria verified against PRODUCTION (adversarial curl, has_plan, dist/ grep, enum, npm test) | property + manual | Composite: SC#1 curl 403; SC#2 has_plan booleans; SC#3 dist/ grep + failOnSecretLeak; SC#4 enum + zero 'plus' literals; SC#5 npm test exit 0 | ❌ Wave 4 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

**All Wave 0 items are owned by Plan 01 (`01-01-PLAN.md`):**

- [ ] `vitest.config.ts` refactored into multi-project (`unit` + `integration`) — Plan 01 Task 1
- [ ] `src/test/integration/setup.ts` created (3 test users via service-role admin API) — Plan 01 Task 1
- [ ] `src/test/integration/adminClient.ts` (persistSession: false, autoRefreshToken: false) — Plan 01 Task 1
- [ ] `src/test/integration/fixtures.ts` (FREE_USER/PRO_USER/VIP_USER + clientAs + seedTravelClient) — Plan 01 Task 1
- [ ] `.github/workflows/ci.yml` — new `integration` job that runs `supabase start` — Plan 01 Task 2
- [ ] `scripts/test-secret-guard.sh` (post-build smoke harness for failOnSecretLeak) — Plan 01 Task 3
- [ ] `package.json` scripts — `test:unit` and `test:integration` shortcuts — Plan 01 Task 1

**Wave 0 also owns the diagnostic preflight in Plan 02 Task 1** (functionally Wave 0 in scope but written as Plan 02 Task 1):

- [ ] Pre-flight SQL: `SELECT plan, COUNT(*) FROM user_subscriptions GROUP BY plan` (output captured in PR description)
- [ ] `psql -c "\dt travel_*"` + `\dt vip_*` — confirm exact table count for Plan 05 RLS rewrites + Plan 06 TRAVEL_TABLES test array
- [ ] **W-3:** Pre-flight `cat src/config/sidebarNavigation.ts | grep -B2 -A2 "requiredPlan"` — disambiguates Plan 02 Task 3 §3.3 plus→pro|vip mappings
- [ ] Verify no `auth.jwt() ->> 'plan'` usage anywhere (Pitfall 6) — `grep -rE "auth\\.jwt\\(\\) ->> 'plan'" supabase/migrations/ src/` returns 0
- [ ] Verify no `supabaseAdmin` importers (RESEARCH §990) — `grep -rn "supabaseAdmin" src/` returns 0

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Owned By |
|----------|-------------|------------|-------------------|----------|
| Service-role key rotation in Supabase Dashboard | SEC-03 | Dashboard UI action; no API equivalent that's safe to script | Settings → API → Reset service role key → confirm new key works in `supabase secrets list` | Plan 06 Task 5 (checkpoint) |
| **B-3 — Production push human-confirm** | SEC-01..06 | High-blast-radius irreversible action; explicit human approval prevents accidental deploy | Review dry-run output + rehearsal summary + linked-project ID; type `push-confirmed` to proceed | Plan 06 Task 4b (checkpoint) |
| Production region remains consistent post-migration | (cycle-level) | Visual check; no automated assertion needed | Verify project URL hostname unchanged post-deploy | Plan 06 Task 6 (smoke) |
| In-flight OAuth state survival during OAUTH_STATE_SECRET migration | SEC-03 (D-10) | Time-boxed (10-min OAuth TTL) — observe a single live OAuth round-trip post-deploy | Trigger google-calendar-auth flow, complete callback, verify success in browser | Plan 03 Task 3 + Plan 06 Task 3 |
| Production rehearsal (db dump → restore local → re-run migrations + tests) | SEC-05 / D-04 | Now AUTONOMOUS as Task 4a (autonomous) — captured to `/tmp/phase1-rehearsal-output.txt`. Human review happens at Task 4b checkpoint, not at the rehearsal itself. | Per Plan 06 Task 4a — capture all test output | Plan 06 Task 4a (autonomous) → Task 4b (checkpoint) |
| Final SC #1 adversarial curl against PRODUCTION | SC #1 | Requires a real prod test user JWT; one-time verification post-deploy | Per Plan 06 Task 6 step 6.1 — curl + grep response body for `42501` | Plan 06 Task 6 |
| **W-3 — Sidebar UX leak smoke per tier** | (UX leak T-1-XX-UX, not security) | Visual check; not a security boundary | Sign in once as Pro user + once as VIP user; verify nav items render per intended tier (Pro user does NOT see VIP-only nav items, VIP user sees both Pro and VIP items) | Plan 06 Task 6 (smoke) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (verified per task acceptance_criteria block)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (every task has at least one automated grep / npm test / psql check)
- [x] Wave 0 covers all MISSING references (vitest project split, integration setup, CI integration job, secret-guard script — all in Plan 01) + W-3 sidebar preflight
- [x] No watch-mode flags in CI commands (every npm test invocation in plan acceptance_criteria uses `--run`)
- [x] Feedback latency < 30s for unit; < 5min for full CI (verified — see Test Infrastructure table)
- [x] `nyquist_compliant: true` set in frontmatter
- [x] **Revision 1 acceptance:**
  - [x] **B-1:** Plan 06 Task 2 includes 5th test file (`supabase/functions/google-calendar-auth/index.test.ts`) closing SEC-07 / ROADMAP SC #5 google-calendar-auth obligation in Phase 1
  - [x] **B-2:** Plan 02 Task 3 §3.1 ships VALID_PLANS runtime validation guard (Option A); Plan 06 Task 2 §2.3 Test 4 asserts strict `plan === 'free'` for legacy 'basic' (real regression guard)
  - [x] **B-3:** Plan 06 Task 4 split into 4a (rehearsal autonomous) + 4b (checkpoint human-confirm) + 4c (push autonomous post-checkpoint)
  - [x] **B-4:** Plan 06 Task 5.5 added with auto-discovery curl smoke (grep-based, no hardcoded function list)
  - [x] **W-1:** Plan 06 Task 6 / SUMMARY template includes TRAVEL_TABLES vs ROADMAP-14 reconciliation note
  - [x] **W-2:** Plan 03 Task 3 read_first + action explicitly verifies file's existing `console.*` log idiom; SUMMARY documents the choice
  - [x] **W-3:** Plan 02 Task 1 §1.6 adds sidebar requiredPlan preflight; Task 3 §3.3 reads it; T-1-XX-UX added to threat model; Plan 06 Task 6 manual smoke per tier
  - [x] **W-4:** Plan 02 Task 3 + Plan 04 Task 2 both note types regen is idempotent; Plan 04 acceptance includes `git diff` purely-additive check
  - [x] **W-5:** Plan 05 Task 1 + Task 2 use DO-block-based DROP enumeration (replaces per-name DROP IF EXISTS); inline self-check asserts zero legacy survivors
  - [x] **I-1:** Plan 06 Task 2 §2.4 ErrorBoundary test uses `screen.getByRole(...)` (no `if (homeBtn)` hedge)
  - [x] **I-2:** Addressed via W-4 (types regen coupling)

**Approval:** revision 1 (gsd-planner). Awaiting plan-checker re-review, then `/gsd-execute-phase 1`.
