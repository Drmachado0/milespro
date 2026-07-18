---
phase: 01-security-foundation-hardening
plan: 03
subsystem: security-secret-hygiene
tags: [security, secrets, vite, supabase, edge-functions, sec-03, sec-04]
requirements: [SEC-03, SEC-04]
dependency_graph:
  requires:
    - "Plan 01 (scripts/test-secret-guard.sh harness — used to verify failOnSecretLeak)"
  provides:
    - "failOnSecretLeak() Vite plugin guarding the build host -> client bundle boundary"
    - "anon-only supabase client at src/integrations/supabase/client.ts (no admin export)"
    - "OAUTH_STATE_SECRET dual-read in google-calendar-auth (D-10 step 1)"
  affects:
    - "Plan 06 (owns final OAUTH_STATE_SECRET fallback removal AND service-role key rotation)"
tech_stack:
  added: []
  patterns:
    - "Vite plugin pattern using config() hook + Node process.env for build-time guards"
    - "Dual-read env fallback pattern for staged secret cutover with TTL-bounded drain window"
key_files:
  created:
    - .planning/phases/01-security-foundation-hardening/01-03-SUMMARY.md
    - .planning/phases/01-security-foundation-hardening/deferred-items.md
  modified:
    - vite.config.ts
    - src/integrations/supabase/client.ts
    - supabase/functions/google-calendar-auth/index.ts
decisions:
  - "Use console.warn (not logger.warn) in the edge-function fallback notice — matches the file's existing console.* idiom; logger.* migration is scoped to src/, not supabase/functions/"
  - "Define failOnSecretLeak() inline in vite.config.ts rather than as a separate package — single consumer, no reuse pressure yet"
  - "Document the case-collision PromotionsContext build issue as deferred (out of scope for Plan 03) rather than fixing it inline"
metrics:
  duration_minutes: ~25
  tasks_completed: 3
  files_modified: 3
  files_created: 2
  commits: 3
  completed_date: 2026-05-12
---

# Phase 1 Plan 03: Secret Hygiene Summary

## One-liner

failOnSecretLeak() Vite plugin guards the build, supabaseAdmin export is gone, and OAUTH_STATE_SECRET is split out of SUPABASE_SERVICE_ROLE_KEY with a TTL-safe dual-read fallback (D-10 step 1; Plan 06 owns step 2).

## What was built

1. **`vite.config.ts` hardening** — Three hardcoded `*_FALLBACK` constants (anon JWT + URL + project ID) deleted. New `failOnSecretLeak()` plugin placed as the FIRST plugin entry so it runs before any other build work. Plugin uses Node `process.env` (NOT `import.meta.env` per RESEARCH Pitfall 4) and aborts the build via thrown `Error` from the `config()` hook on either:
   - any matching `FORBIDDEN_VITE_PATTERNS` env present (would inline a secret into the client bundle), or
   - any of `REQUIRED_VITE_VARS` missing (would previously fall back to a known-public hardcoded value).
2. **`src/integrations/supabase/client.ts` cleanup** — Deleted the `VITE_SUPABASE_SERVICE_ROLE_KEY` `import.meta.env` read and the `supabaseAdmin` export. The most privileged Supabase credential is no longer reachable from any client-side surface. Added a removal comment (`Service-role client REMOVED`) so future greps are self-documenting.
3. **`supabase/functions/google-calendar-auth/index.ts` dual-read** — Introduced `Deno.env.get('OAUTH_STATE_SECRET')` as the preferred HMAC secret with fallback `OAUTH_STATE_SECRET ?? SUPABASE_SERVICE_ROLE_KEY ?? ''`. The 10-minute state TTL (line 147) is the natural drain window — Plan 06 deletes the fallback >10 min after deploy. Fallback notice uses `console.warn` to match the file's existing log idiom (W-2).

## Tasks executed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Add failOnSecretLeak() Vite plugin and delete hardcoded fallbacks | `4a4d069` | `vite.config.ts`, `.planning/phases/01-security-foundation-hardening/deferred-items.md` |
| 2 | Delete supabaseAdmin export from src/integrations/supabase/client.ts | `7d1ea39` | `src/integrations/supabase/client.ts` |
| 3 | Split OAUTH_STATE_SECRET from service-role in google-calendar-auth (dual-read with fallback) | `cec9554` | `supabase/functions/google-calendar-auth/index.ts` |

## Exact regex / required-var lists landed

**FORBIDDEN_VITE_PATTERNS** (any matching env in `process.env` aborts build):
```typescript
const FORBIDDEN_VITE_PATTERNS: readonly RegExp[] = [
  /^VITE_.*SERVICE_ROLE/i,
  /^VITE_.*SECRET_KEY/i,
  /^VITE_.*WEBHOOK_SECRET/i,
  /^VITE_.*PRIVATE_KEY/i,
  // Phase 2 additions (Asaas) will land here:
  // /^VITE_ASAAS_.*SECRET/i,
];
```

**REQUIRED_VITE_VARS** (any missing aborts build):
```typescript
const REQUIRED_VITE_VARS: readonly string[] = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_PROJECT_ID',
];
```

**Convention for future additions:** when Phase 2 introduces Asaas keys, mirror the same convention — public-prefixed `VITE_ASAAS_*PUBLIC*` goes into `REQUIRED_VITE_VARS` (if anything client-side needs it), and any `VITE_ASAAS_*SECRET*` / `VITE_ASAAS_*WEBHOOK*` regex goes into `FORBIDDEN_VITE_PATTERNS`.

## OAUTH_STATE_SECRET cutover sequence

D-10 sequence (Plan 03 owns step 1; Plan 06 owns step 2):

| Step | Owner | What | Status |
|------|-------|------|--------|
| 1.a | **Operator (Plan 06 deploy gate)** | `OAUTH_STATE_SECRET=$(openssl rand -hex 32 || node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")` | Pending — see deploy gate below |
| 1.b | **Operator (Plan 06 deploy gate)** | `supabase secrets set OAUTH_STATE_SECRET="$OAUTH_STATE_SECRET"` | Pending |
| 1.c | **Plan 03 (this PR)** | Edit `google-calendar-auth/index.ts`: introduce dual-read with fallback | **DONE (commit `cec9554`)** |
| 1.d | **Operator (Plan 06 deploy gate)** | `supabase functions deploy google-calendar-auth` (deploys dual-read code) | Pending |
| 2.a | **Operator (Plan 06)** | Wait >10 min post-deploy 1.d (state TTL drain) | Pending |
| 2.b | **Plan 06** | Edit again: remove the `?? SUPABASE_SERVICE_ROLE_KEY` fallback; throw if `OAUTH_STATE_SECRET` unset | Future (Plan 06) |
| 2.c | **Operator (Plan 06 deploy gate)** | `supabase functions deploy google-calendar-auth` (deploys no-fallback code) | Future |

## Deploy gate (handoff to phase orchestrator / operator)

Per the parallel-executor contract, this agent did **not** execute live operations against the production Supabase project. The Plan 03 deliverable is the **code change in this branch**. The orchestrator (or a follow-up plan that runs with an authenticated `supabase` CLI session) must run, in this exact order, **before merging Plan 03's code to a branch that auto-deploys edge functions**:

```bash
# 1. Generate the new secret on the operator's workstation (Windows uses Node fallback):
OAUTH_STATE_SECRET=$(openssl rand -hex 32 2>/dev/null \
  || node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "OAUTH_STATE_SECRET length: ${#OAUTH_STATE_SECRET}"   # expect 64

# 2. Set it on the project — no redeploy required for *this* step:
supabase secrets set OAUTH_STATE_SECRET="$OAUTH_STATE_SECRET"
supabase secrets list | grep OAUTH_STATE_SECRET   # verify

# 3. Deploy the dual-read code (this PR's commit cec9554):
supabase functions deploy google-calendar-auth

# 4. Smoke: HTTP 200 expected (function still callable):
curl -i "$SUPABASE_URL/functions/v1/google-calendar-auth?action=status" \
  -H "Authorization: Bearer $TEST_USER_JWT"

# 5. Securely store OAUTH_STATE_SECRET in the password manager — it is long-lived.
#    Plan 06 does NOT regenerate it; rotation is a future, separate runbook.
```

Plan 06 then owns service-role key rotation (Supabase Dashboard reset) AND the fallback-removal code edit + re-deploy after the >10 min wait.

## W-2 — Log idiom decision

**Decision:** Use `console.warn` for the dual-read fallback notice in `google-calendar-auth/index.ts`.

**Evidence:** Preflight grep against the file (run 2026-05-12 in this worktree):

```
$ grep -n "console\.\|logger\." supabase/functions/google-calendar-auth/index.ts
102:    console.error('ENCRYPTION_KEY environment variable is not set');
173:        console.error('Token exchange error:', tokens);
199:        console.error('Database error:', upsertError);
203:      console.log(`Google Calendar connected for user: ${user_id}`);
378:        console.error('Token refresh error:', tokens);
417:    console.error('Error:', error);
```

The file uses only `console.*` (5 × `console.error`, 1 × `console.log`) and has zero `logger.*` references. Importing `@/lib/logger` here would be cross-runtime (Vite client lib used inside a Deno edge function) and goes against CLAUDE.md's note that the `logger.*` migration was scoped to `src/`. New code matches the existing idiom; Plan 06 will delete the entire branch when it removes the fallback.

## Verification

| Gate | Command | Result |
|------|---------|--------|
| `vite.config.ts` contains plugin function | `grep -n failOnSecretLeak vite.config.ts` | 3 matches (definition + invocation in plugins array + reference in `defineConfig` comment) |
| Hardcoded JWT prefix gone | `grep -c "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" vite.config.ts` | 0 |
| `*_FALLBACK` constants gone | `grep -c "SUPABASE_URL_FALLBACK" vite.config.ts` | 0 |
| `supabaseAdmin` gone from src/ | `grep -rn "supabaseAdmin" src/` | 0 |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` gone from src/ | `grep -rn "VITE_SUPABASE_SERVICE_ROLE_KEY" src/` | 0 |
| Edge function has OAUTH_STATE_SECRET dual-read | `grep -n "OAUTH_STATE_SECRET ?? SUPABASE_SERVICE_ROLE_KEY" supabase/functions/google-calendar-auth/index.ts` | 1 match |
| State TTL preserved (10 min) | `grep -n "10 * 60 * 1000" supabase/functions/google-calendar-auth/index.ts` | 1 match (line 147 unchanged) |
| `scripts/test-secret-guard.sh` (Plan 01 harness) | `bash scripts/test-secret-guard.sh` | **PASS** — both tests (forbidden env → abort; missing required → abort) |
| Typecheck | `npm run typecheck` | exit 0 |
| Lint | `npm run lint` | exit 0 |
| Unit tests | `npm test -- --project=unit --run` | 17 files, 93 tests passed |
| Live build smoke | `VITE_* env valid && npm run build` | **Blocked** by a pre-existing case-collision import error in `src/components/ProtectedProviders.tsx` (logged in `deferred-items.md`). Confirmed pre-existing via `git stash` test on base commit `0cfb268`. The `failOnSecretLeak()` plugin's `config()` hook runs *before* rollup import resolution begins, so the deferred bug does not affect the guard's behaviour — both secret-guard tests confirm the plugin works end-to-end. |

## Threat surface mitigated

- **T-1-02 (Information Disclosure):** `supabaseAdmin` export removed; `failOnSecretLeak()` rejects any `VITE_*SERVICE_ROLE` env that would inline the credential at build time. Belt-and-suspenders: source-level delete + build-time guard.
- **T-1-04 (OAuth State Replay / Spoofing):** `OAUTH_STATE_SECRET` lifecycle is now independent of the service-role key. Plan 06's service-role rotation no longer invalidates in-flight OAuth states once the fallback is removed.
- **T-1-XX (silent fallback):** Three `*_FALLBACK` constants deleted; missing env now produces a loud build failure instead of a bundle pinned to a known-public anon JWT.
- **T-1-XX (Pitfall 4):** Plugin uses `process.env` (not `import.meta.env`) — only OS-level env vars trigger the guard, which is exactly the threat surface (CI/host config).

## On the leaked anon JWT

The hardcoded JWT in the deleted `SUPABASE_PUBLISHABLE_KEY_FALLBACK` constant was an anon-role token (designed to be public; CONCERNS calls this out). The security issue was **not** that the value itself was a secret — it was that *missing env produced a build pinned to a known-public value*, masking deploy misconfiguration and tying the build to a specific Supabase project. After this plan, missing env produces a build failure with an actionable error message, not a silent boot against a hardcoded project.

## Deviations from plan

### Auto-fixed

None of the Rules 1/2/3 deviation categories triggered. The plan's `<action>` blocks were applied verbatim with one micro-adjustment:

1. **[Rule 2 - Critical functionality — comment hygiene]** In `src/integrations/supabase/client.ts`, the plan's removal comment block contained the literal string `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`, which would have caused the plan's own automated verification (`grep banned SUPABASE_SERVICE_ROLE_KEY`) to fail. Reworded the comment to describe Deno edge runtime behaviour without inlining the env-var name, preserving the operational guidance while passing the banned-string check.
   - **Found during:** Task 2 verify step
   - **Fix:** Reworded the comment block (no behavioural change; same intent)
   - **Files modified:** `src/integrations/supabase/client.ts`
   - **Commit:** `7d1ea39`

### Deferred (out-of-scope per task boundary)

1. **Pre-existing case-collision import in `src/components/ProtectedProviders.tsx`** — Two tracked files differing only by case (`src/contexts/PromotionsContext.tsx` AND `src/contexts/promotionsContext.ts`, introduced by `62e7a57`) cause `npm run build` to fail on case-insensitive filesystems. Confirmed pre-existing via `git stash` on Plan 03's base commit. Logged in `.planning/phases/01-security-foundation-hardening/deferred-items.md`.
   - **Why not fixed here:** Outside Plan 03's allowed file set (`vite.config.ts`, `src/integrations/supabase/client.ts`, `supabase/functions/google-calendar-auth/index.ts`). Fixing it would require renaming/removing a contexts file and updating consumers — properly belongs in a follow-up commit or a later plan that already touches `src/contexts/` or `src/components/ProtectedProviders.tsx`.

## Deploy gates (NOT deviations — Plan-defined handoffs)

| Gate | Owner | Notes |
|------|-------|-------|
| `supabase secrets set OAUTH_STATE_SECRET` | Operator (orchestrator follow-up) | Must run BEFORE the dual-read function deploy so the new branch never observes an unset secret. |
| `supabase functions deploy google-calendar-auth` | Operator (orchestrator follow-up) | Deploys the dual-read code from this PR. Code-only deploy; `supabase secrets set` does NOT require a redeploy by itself. |
| Service-role key reset in Supabase Dashboard | **Plan 06** | Explicitly NOT done in Plan 03 per execution context (`<parallel_execution>`). |
| Final `OAUTH_STATE_SECRET` fallback removal | **Plan 06** | Edit + redeploy >10 min after the dual-read deploy. |

## Self-Check: PASSED

- File `vite.config.ts` exists and contains `failOnSecretLeak`, `FORBIDDEN_VITE_PATTERNS`, `REQUIRED_VITE_VARS`, and `name: 'milespro:fail-on-secret-leak'` (verified).
- File `src/integrations/supabase/client.ts` exists, contains `Service-role client REMOVED`, and does NOT contain `supabaseAdmin` or `VITE_SUPABASE_SERVICE_ROLE_KEY` (verified).
- File `supabase/functions/google-calendar-auth/index.ts` exists and contains both `Deno.env.get('OAUTH_STATE_SECRET')` and `OAUTH_STATE_SECRET ?? SUPABASE_SERVICE_ROLE_KEY` (verified).
- Commit `4a4d069` exists in `git log` (Task 1).
- Commit `7d1ea39` exists in `git log` (Task 2).
- Commit `cec9554` exists in `git log` (Task 3).
- File `.planning/phases/01-security-foundation-hardening/deferred-items.md` exists.
- `scripts/test-secret-guard.sh` exits 0 (both tests PASS).
- `npm run typecheck`, `npm run lint`, and `npm test -- --project=unit --run` (93 tests) all exit 0.
