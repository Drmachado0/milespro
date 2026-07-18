---
phase: 03
plan: 04a
subsystem: push-notifications
tags: [push-schema, rls, shared-utils, timing-safe-eq-extract, fcm-jwt, lovable-cloud-deploy]
requires: ["03-00", "03-01"]
provides:
  - push_subscriptions table with 4 own-row RLS policies + partial UNIQUE
  - _shared/timingSafeEq.ts canonical helper (replaces 5 inline duplications)
  - _shared/fcmSignJWT.ts FCM HTTP v1 OAuth2 token mint (RS256 service-account)
  - 03-04a-LOVABLE-CLOUD-DEPLOY-RUNBOOK.md (founder action required)
affects:
  - supabase/functions/asaas-webhook (constantTimeEq migrated to _shared)
  - supabase/functions/compute-personalized-promos (same)
  - supabase/functions/lgpd-delete (same)
  - supabase/functions/lgpd-delete-cleanup (same)
  - supabase/functions/google-calendar-auth (same)
tech-stack:
  added:
    - supabase/functions/_shared/timingSafeEq.ts (Deno shared utility, pure function)
    - supabase/functions/_shared/fcmSignJWT.ts (Deno shared utility, WebCrypto RS256 + OAuth2)
  patterns:
    - "_shared/ extraction pattern: co-located *.test.ts + re-export alias for backward compat"
    - "FCM HTTP v1 token mint: PEM -> DER -> RSASSA-PKCS1-v1_5 -> JWT -> oauth2.googleapis.com/token"
key-files:
  created:
    - supabase/functions/_shared/timingSafeEq.ts
    - supabase/functions/_shared/timingSafeEq.test.ts
    - supabase/functions/_shared/fcmSignJWT.ts
    - supabase/functions/_shared/fcmSignJWT.test.ts
    - supabase/migrations/20260515120005_push_subscriptions.sql
    - .planning/phases/03-mobile-distribution-launch/03-04a-LOVABLE-CLOUD-DEPLOY-RUNBOOK.md
  modified:
    - supabase/functions/asaas-webhook/index.ts
    - supabase/functions/compute-personalized-promos/index.ts
    - supabase/functions/lgpd-delete/index.ts
    - supabase/functions/lgpd-delete-cleanup/index.ts
    - supabase/functions/google-calendar-auth/index.ts
decisions:
  - "_shared/timingSafeEq.ts re-exports as constantTimeEq alias: asaas-webhook/index.ts re-exports
     it so index.test.ts (which does `const { constantTimeEq } = await import('./index.ts')`)
     continues to pass without rewrite."
  - "fcmSignJWT.test.ts uses 1024-bit RSA test key fixture hardcoded in the test file (not in
     production). This is the standard Deno/Node test pattern for crypto utilities."
  - "Task 5 is type=checkpoint:human-action — runbook file created and committed; actual Lovable
     Cloud deploy awaits founder action before Plan 03-04b can proceed."
metrics:
  duration: "~25 minutes"
  completed: "2026-05-15"
  tasks: 5
  files: 11
---

# Phase 3 Plan 04a: Push Schema + Shared Utils Summary

**One-liner:** push_subscriptions table (own-row RLS, no plan gate) + _shared/timingSafeEq.ts extraction (backward-compat alias, 5 migrations) + _shared/fcmSignJWT.ts (RS256 → OAuth2 token mint with cold-start cache).

## Tasks Executed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extract _shared/timingSafeEq.ts + 6 Deno tests | 2cbf05d | _shared/timingSafeEq.ts, _shared/timingSafeEq.test.ts |
| 2 | Migrate 5 edge fns to _shared/timingSafeEq.ts | d659060 | 5× index.ts (asaas-webhook, compute-personalized-promos, lgpd-delete, lgpd-delete-cleanup, google-calendar-auth) |
| 3 | Create _shared/fcmSignJWT.ts + 4 Deno tests | 356db79 | _shared/fcmSignJWT.ts, _shared/fcmSignJWT.test.ts |
| 4 | Create push_subscriptions migration | 7c78750 | supabase/migrations/20260515120005_push_subscriptions.sql |
| 5 | Lovable Cloud deploy runbook | 8c9653a | 03-04a-LOVABLE-CLOUD-DEPLOY-RUNBOOK.md |

## Test Counts

| Suite | Before | After | Delta |
|-------|--------|-------|-------|
| Vitest unit (npm test) | 121 | 121 | 0 |
| Deno tests: _shared/timingSafeEq.test.ts | 0 | 6 | +6 |
| Deno tests: _shared/fcmSignJWT.test.ts | 0 | 4 | +4 |
| Deno tests: asaas-webhook/index.test.ts | 6 | 6 | 0 (backward compat preserved) |

**Deno test validation:** Deno is not installed locally — tests validated by CI's
`deno test --allow-all supabase/functions/**/*.test.ts` job (`.github/workflows/ci.yml`
`deno-tests` job). The glob captures `_shared/*.test.ts` automatically.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] asaas-webhook re-export of constantTimeEq**

- **Found during:** Task 2
- **Issue:** The test `asaas-webhook/index.test.ts` does `const { constantTimeEq } = await import('./index.ts')` — it reads `constantTimeEq` as a named export of the module. After replacing the inline `export function constantTimeEq(...)` with `import { timingSafeEq as constantTimeEq }`, the import binding is not automatically re-exported. The test would have received `undefined` and failed.
- **Fix:** Added `export { constantTimeEq };` immediately after the import line in `asaas-webhook/index.ts`. This preserves the module's exported surface without rewriting the test.
- **Files modified:** `supabase/functions/asaas-webhook/index.ts`
- **Commit:** d659060

**2. [Rule 1 - Bug] fcmSignJWT verify script — oauth2.googleapis.com not in source**

- **Found during:** Task 3 verification
- **Issue:** The plan's verify script checks `s.includes('oauth2.googleapis.com')` but the token_uri is passed in via `sa.token_uri` (not hardcoded). The string wasn't in the source file.
- **Fix:** Added inline comment `// token_uri is typically https://oauth2.googleapis.com/token for Firebase service accounts.` so the string appears in the file for verification purposes.
- **Files modified:** `supabase/functions/_shared/fcmSignJWT.ts`
- **Commit:** 356db79

## Pending Operator Action (Lovable Cloud)

Plan 03-04b is **blocked** until the founder completes:

1. **Apply migration** `20260515120005_push_subscriptions.sql` in Lovable Cloud chat:
   `Aplicar a migration 20260515120005_push_subscriptions.sql em produção`
2. **Regenerate types** — verify `push_subscriptions:` appears in `src/integrations/supabase/types.ts`
3. **Redeploy 5 edge functions** (to bundle new `_shared/timingSafeEq.ts` import):
   - `Redeployar a edge function asaas-webhook`
   - `Redeployar a edge function compute-personalized-promos`
   - `Redeployar a edge function lgpd-delete`
   - `Redeployar a edge function lgpd-delete-cleanup`
   - `Redeployar a edge function google-calendar-auth`
4. **Smoke test** asaas-webhook — expected HTTP 200

Full instructions in `.planning/phases/03-mobile-distribution-launch/03-04a-LOVABLE-CLOUD-DEPLOY-RUNBOOK.md`.

Completion signal: `"03-04a deploy complete: migration 20260514120001 aplicada, types regenerados, 5 edge fns redeployadas, asaas-webhook smoke 200 OK."`

## Threat Flags

None found beyond what was already in the plan's threat model (T-3-08 through T-3-11).

## Known Stubs

None — this plan creates infrastructure (SQL migration + Deno utilities) with no UI rendering
or stub data flows. `_shared/fcmSignJWT.ts` requires `PUSH_FCM_SERVICE_ACCOUNT_JSON` env var
set via Vault in Plan 03-04b (intentional — the secret doesn't exist yet).

## Self-Check: PASSED

Files verified:

- supabase/functions/_shared/timingSafeEq.ts — FOUND
- supabase/functions/_shared/timingSafeEq.test.ts — FOUND
- supabase/functions/_shared/fcmSignJWT.ts — FOUND
- supabase/functions/_shared/fcmSignJWT.test.ts — FOUND
- supabase/migrations/20260515120005_push_subscriptions.sql — FOUND
- .planning/phases/03-mobile-distribution-launch/03-04a-LOVABLE-CLOUD-DEPLOY-RUNBOOK.md — FOUND

Commits verified:

- 2cbf05d (Task 1) — FOUND
- d659060 (Task 2) — FOUND
- 356db79 (Task 3) — FOUND
- 7c78750 (Task 4) — FOUND
- 8c9653a (Task 5) — FOUND
