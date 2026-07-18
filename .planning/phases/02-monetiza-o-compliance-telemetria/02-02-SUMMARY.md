---
phase: 02-monetiza-o-compliance-telemetria
plan: 02
subsystem: compliance
tags: [compliance, lgpd, consent, dsr, privacy, dpo, soft-delete, pg_cron, hmac]
requires:
  - "Plan 02-01 (Wave 0 foundation) — provides deno-tests CI job + FORBIDDEN_VITE_PATTERNS Asaas guard + Pro/VIP tier names"
  - "Phase 1 trust kernel: public.has_plan(uuid, subscription_plan) + public.can_access_account(uuid, uuid)"
  - "Phase 1 _shared helpers: cors.ts + validate.ts"
  - "Phase 1 HMAC pattern: supabase/functions/google-calendar-auth/index.ts:50-66 (signState/verifyState)"
  - "Phase 1 FK CASCADE: user_subscriptions(user_id) → auth.users(id) ON DELETE CASCADE"
provides:
  - public.user_consents table + append-only RLS (LGPD Art. 8 §4)
  - public.lgpd_export_log table (COMPL-01 rate limit + audit)
  - public.deletion_audit table (COMPL-02 hard-delete audit trail)
  - profiles.deletion_requested_at / deletion_confirmed_at / deletion_token columns
  - profiles_select RLS policy with soft-hide branch (T-2-09 mitigation)
  - useConsent React hook exposing analyticsOptedIn (hand-off to plan 02-03 PostHog opt-in)
  - <ConsentBanner /> mounted in App.tsx (4-checkbox granular UI)
  - lgpd-export edge function (JSON bundle, 1/hr rate limit)
  - lgpd-delete edge function (request + confirm + HMAC token + Resend email)
  - lgpd-delete-cleanup edge function (daily pg_cron @ 04:00 UTC)
  - /lgpd/confirm route + LgpdConfirmDelete page
  - supabase/config.toml entries for the 3 lgpd-* functions
  - Privacidade.tsx full rewrite with Asaas/PostHog/Sentry/Resend/Lovable/Crisp sub-processors + SCC + DPO
  - 5 Deno tests for lgpd-delete HMAC + 4 Deno tests for lgpd-export auth/rate-limit
affects:
  - supabase/migrations/20260513120001_create_user_consents.sql (new)
  - supabase/migrations/20260513120002_soft_delete_columns_and_audit.sql (new)
  - supabase/migrations/20260513120003_schedule_lgpd_delete_cron.sql (new)
  - supabase/functions/lgpd-export/index.ts (new) + index.test.ts (new)
  - supabase/functions/lgpd-delete/index.ts (new) + index.test.ts (new)
  - supabase/functions/lgpd-delete-cleanup/index.ts (new)
  - supabase/config.toml (lgpd-* function entries appended)
  - src/hooks/useConsent.ts (new)
  - src/components/legal/ConsentBanner.tsx (new)
  - src/pages/LgpdConfirmDelete.tsx (new)
  - src/pages/Privacidade.tsx (rewrite)
  - src/App.tsx (ConsentBanner mount + /lgpd/confirm route)
tech-stack:
  added:
    - pg_cron extension (idempotent CREATE EXTENSION IF NOT EXISTS)
    - pg_net extension (already enabled in Supabase Pro, idempotent)
    - Vault secret integration (vault.decrypted_secrets read in cron schedule)
    - Resend HTTPS API (fetch-based, pt-BR plain + minimal HTML templates)
  patterns:
    - HMAC-signed deletion token bound to user.id (24h TTL) — reuses google-calendar-auth HMAC pattern
    - Append-only RLS via missing UPDATE/DELETE policies (LGPD audit trail)
    - Service-role bypass for cross-table reads with explicit JWT pre-check
    - Bearer-token auth for pg_cron-invoked edge function (constant-time compare)
    - Best-effort external API cascade with try/catch per provider (audit row captures partial completion)
    - Soft-delete + 7-day window + daily cron cleanup pattern (D-18)
key-files:
  created:
    - supabase/migrations/20260513120001_create_user_consents.sql
    - supabase/migrations/20260513120002_soft_delete_columns_and_audit.sql
    - supabase/migrations/20260513120003_schedule_lgpd_delete_cron.sql
    - supabase/functions/lgpd-export/index.ts
    - supabase/functions/lgpd-export/index.test.ts
    - supabase/functions/lgpd-delete/index.ts
    - supabase/functions/lgpd-delete/index.test.ts
    - supabase/functions/lgpd-delete-cleanup/index.ts
    - src/hooks/useConsent.ts
    - src/components/legal/ConsentBanner.tsx
    - src/pages/LgpdConfirmDelete.tsx
  modified:
    - src/App.tsx
    - src/pages/Privacidade.tsx
    - supabase/config.toml
decisions:
  - "CURRENT_CONSENT_VERSION = '2026-05-12' (bumps on every material policy text change; coordinate with Privacidade.tsx LAST_UPDATED)"
  - "Token format <hex-hmac>:<unix-millis-expires>:<hex-nonce> with HMAC bound to user.id — DB read alone cannot forge"
  - "Deletion confirm path requires JWT (1st factor) + email token (2nd factor) — anonymous attacker who steals token still cannot confirm"
  - "lgpd-delete-cleanup auth via LGPD_CLEANUP_AUTH_TOKEN env (Deno.env.get) compared constant-time against Vault-stored copy that pg_cron pulls at invoke time"
  - "PostHog opt-in handoff: useConsent exposes analyticsOptedIn; plan 02-03 wires useEffect → posthog.opt_in_capturing() (NOT in this plan to preserve plan boundary)"
  - "Existing 'Users can view their own profile' policy kept; new profiles_select policy ADDED for VIP managed_account read with deletion_requested_at IS NULL filter"
  - "Original ALTER COLUMN intentionally non-destructive (IF NOT EXISTS) — re-run safe"
  - "Privacidade.tsx Sentry mention scoped to legitimate-interest base legal with PII-scrubbed-before-send disclosure (matches plan 02-03 sentry.ts beforeSend regex pattern)"
metrics:
  duration_minutes: 70
  completed_date: 2026-05-12
  tasks_completed: 7
  files_created: 11
  files_modified: 3
  commits: 8
---

# Phase 2 Plan 02: LGPD Compliance — DSR + Consent + Soft-Delete Summary

**One-liner:** Ships every LGPD obligation that must exist BEFORE the first paid signup — granular consent banner with append-only `user_consents` log, JSON-bundle DSR export endpoint with 1/hr rate limit, HMAC-token-confirmed soft-delete with daily pg_cron hard-delete cascade, and a full privacy-policy rewrite with the Phase 2 sub-processor list + SCC clause + DPO email — establishing the legal gate that ANPD compliance hangs on for the Phase 2 W3 production cutover.

## Execution

7 tasks completed in linear order on `main`. Each task = one atomic commit (8 total — task 4 plus a lint auto-fix follow-up).

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | user_consents + lgpd_export_log tables + append-only RLS | `b6113f4` | supabase/migrations/20260513120001_create_user_consents.sql |
| 2 | profiles soft-delete columns + deletion_audit + profiles_select RLS | `63d5fba` | supabase/migrations/20260513120002_soft_delete_columns_and_audit.sql |
| 3 | useConsent hook + ConsentBanner component + App.tsx mount | `2ae538a` | src/hooks/useConsent.ts, src/components/legal/ConsentBanner.tsx, src/App.tsx |
| 4 | lgpd-export edge function (JSON bundle + 1/hr rate limit) + 4 Deno tests | `5f9b2cb` | supabase/functions/lgpd-export/{index.ts, index.test.ts} |
| 5 | lgpd-delete request/confirm + HMAC token + Resend email + LgpdConfirmDelete page + config.toml | `dafb7dc` | supabase/functions/lgpd-delete/{index.ts, index.test.ts}, src/pages/LgpdConfirmDelete.tsx, src/App.tsx, supabase/config.toml |
| 6 | lgpd-delete-cleanup edge function + pg_cron daily schedule | `5f831d0` | supabase/functions/lgpd-delete-cleanup/index.ts, supabase/migrations/20260513120003_schedule_lgpd_delete_cron.sql |
| 7 | Privacidade.tsx rewrite (Asaas/PostHog/Sentry/Resend/Lovable/Crisp + SCC + DPO §13) | `4e9dc35` | src/pages/Privacidade.tsx |
| 4a | Auto-fix: replace @ts-ignore Sentry stub with typed globalThis lookup (lint) | `9ed919e` | supabase/functions/lgpd-export/index.ts, supabase/functions/lgpd-delete/index.ts |

## Must-Have Truths — Status

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | lgpd-export returns JSON bundle <5s with profile/sub/operations/programs/travel_*/consents | code-ready | Function exports `handler` + `default`; bundle keys present; Promise.all of 14 tables; rate-limit 1/hr via lgpd_export_log; live <5s verification deferred to deploy-time |
| 2 | lgpd-delete?action=request populates profiles.deletion_requested_at + sends Resend email with HMAC token link | code-ready | UPDATE writes both deletion_requested_at + deletion_token; Resend POST to /emails with pt-BR plain+html body; link points to /lgpd/confirm?token=... |
| 3 | After 7 days from deletion_confirmed_at, cleanup cron purges + writes deletion_audit | code-ready | Edge function queries `deletion_confirmed_at < now()-interval '7 days'`; audit row INSERT precedes auth.users delete; pg_cron schedule '0 4 * * *' lands in production once migration applied |
| 4 | Before consent recorded, ConsentBanner renders AND PostHog opt-out | code-ready (partial) | ConsentBanner renders only when needsConsent === true; the actual PostHog opt-out lives in plan 02-03 src/lib/posthog.ts (handoff via analyticsOptedIn) — see "Handoff to Plan 02-03" below |
| 5 | Privacidade.tsx lists Asaas + PostHog Cloud EU + Sentry + Resend + Lovable Cloud (us-east-1) + Crisp + SCC clause | ✓ | Grep verified: all 6 sub-processors present; SCC + "Cláusulas Contratuais Padrão" present in §10 |
| 6 | Privacidade.tsx mailto → dpo@milespro.net.br (2 places) | ✓ | §7 contact + §12 contact + §13 (new) all use dpo@milespro.net.br; banned grep for `mailto:suporte@milespro.net.br` returns 0 matches in this file |
| 7 | user_consents append-only (no UPDATE/DELETE policies; INSERT auth.uid()=user_id; SELECT self) | ✓ | Migration has 2 policies only (select + insert); explicit comment "No UPDATE / no DELETE policies"; revoking = NEW INSERT with flipped flags |
| 8 | lgpd-export rate-limited 1/hour via lgpd_export_log; 2nd call within 1h returns HTTP 429 | code-ready | RATE_LIMIT_WINDOW_MS = 3_600_000; returns HTTP 429 with retry_after_seconds + Retry-After header when lastLog.created_at within window |
| 9 | Soft-deleted user hidden from VIP managed_account owners | code-ready | New profiles_select policy with `deletion_requested_at IS NULL AND public.can_access_account(...)` branch; original "Users can view their own profile" policy preserved for self-access during 7-day window |
| 10 | Deno tests for lgpd-export + lgpd-delete run green in CI under deno-tests job | code-ready | 4 lgpd-export tests + 5 lgpd-delete tests written; deno-tests CI job from plan 02-01 globs `supabase/functions/**/*.test.ts` — CI will validate on next push |

**Why "code-ready" vs ✓:** Items 1-4 and 8-10 depend on deploy-time application of the 3 migrations + 3 edge function deploys + 2 Vault secrets via Lovable Cloud chat (see "Pending Apply" below). Until then they are statically verified against the source but not exercised end-to-end against the production Supabase project.

## Verification Results

| Check | Result |
|-------|--------|
| `npm run lint` | PASS (0 errors, 1 pre-existing warning in `src/components/ui/program-logo.tsx` — out of scope) |
| `npm run typecheck` (tsc --noEmit) | PASS (0 errors) |
| `npm test -- --project=unit --run` | PASS — 109 tests across 21 files (≥109 Wave-0 baseline maintained) |
| Deno tests (lgpd-export, lgpd-delete) | NOT RUN LOCALLY — deno binary not installed on Windows host. Will run in CI under `deno-tests` job (glob `supabase/functions/**/*.test.ts` from plan 02-01) |
| `grep -E '^\[functions\.(lgpd-export\|lgpd-delete\|lgpd-delete-cleanup)\]' supabase/config.toml` | 3 matches |
| `grep -E 'ConsentBanner\|LgpdConfirmDelete\|/lgpd/confirm' src/App.tsx` | 5 matches (import + lazy load + 2 routes + 1 mount) |
| `grep "Stripe" src/pages/Privacidade.tsx` | 0 matches |
| `grep "dpo@milespro.net.br" src/pages/Privacidade.tsx` | 4 matches (§7 + §8 + §12 + §13) |
| `grep "Cláusulas Contratuais Padrão" src/pages/Privacidade.tsx` | 1 match (§10 SCC clause) |
| 3 migration files exist | ✓ — 20260513120001/2/3_*.sql all present |
| LGPD_DELETE_TOKEN_SECRET via Deno.env.get | ✓ — no hardcoded secret in any file |

## Pending Apply (deploy-time, not executor-time)

Per the windows_environment instruction, all SQL migrations and edge-function deploys are deferred to Lovable Cloud chat. The following must run BEFORE plan 02-02 is functionally complete in production:

### Migrations to apply (in order)

1. `supabase/migrations/20260513120001_create_user_consents.sql` — Lovable chat: `Aplicar a migration 20260513120001_create_user_consents.sql em produção`
2. `supabase/migrations/20260513120002_soft_delete_columns_and_audit.sql` — Lovable chat: `Aplicar a migration 20260513120002_soft_delete_columns_and_audit.sql em produção`
3. `supabase/migrations/20260513120003_schedule_lgpd_delete_cron.sql` — Lovable chat: `Aplicar a migration 20260513120003_schedule_lgpd_delete_cron.sql em produção`
4. Regenerate Supabase types: `Regenerar tipos do Supabase`

### Secrets to provision

Generate hex tokens:
```bash
LGPD_DELETE_TOKEN_SECRET=$(openssl rand -hex 32)
LGPD_CLEANUP_AUTH_TOKEN=$(openssl rand -hex 32)
```

Set via Lovable Cloud chat:
1. `Set edge function secret LGPD_DELETE_TOKEN_SECRET=<hex>`
2. `Set edge function secret LGPD_CLEANUP_AUTH_TOKEN=<hex>` (same value as Vault)
3. `Create Vault secret: SELECT vault.create_secret('<same-hex-as-cleanup-token>', 'lgpd_cleanup_auth_token')`
4. (Optional, plan 02-04 also wires this) `Set edge function secret RESEND_API_KEY=<resend key>`
5. (Optional) `Set edge function secret APP_URL=https://app.milespro.net.br`
6. (Optional, plan 02-05 PAY) `Set edge function secret ASAAS_API_KEY=<sandbox key>`
7. (Optional, plan 02-03 TEL) `Set edge function secret POSTHOG_API_KEY=...` + `POSTHOG_PROJECT_ID=...`
8. (Optional, plan 02-03 TEL) `Set edge function secret SENTRY_API_KEY=...` + `SENTRY_ORG_SLUG=...`

Functions 6-8 are only needed for full external cascade in lgpd-delete-cleanup; the function will gracefully no-op them and still complete the auth.users delete + audit row write.

### Edge functions to deploy

1. `Deploy edge function lgpd-export`
2. `Deploy edge function lgpd-delete`
3. `Deploy edge function lgpd-delete-cleanup`

### Post-deploy smoke tests

Per Plan 02-02 verification block §1-§5:

```bash
USER_JWT="<sandbox user>"

# 1. lgpd-export happy path
curl -i -X GET https://opusftqbbaozucmbuuug.supabase.co/functions/v1/lgpd-export \
  -H "Authorization: Bearer $USER_JWT"
# Expect: 200, response time <5s, JSON body has `data.profile`, etc

# 2. lgpd-export rate limit (run within 1h of #1)
curl -i -X GET https://opusftqbbaozucmbuuug.supabase.co/functions/v1/lgpd-export \
  -H "Authorization: Bearer $USER_JWT"
# Expect: 429 with retry_after_seconds

# 3. lgpd-delete request
curl -i -X POST "https://opusftqbbaozucmbuuug.supabase.co/functions/v1/lgpd-delete?action=request" \
  -H "Authorization: Bearer $USER_JWT"
# Expect: 200; email arrives at user's inbox

# 4. lgpd-delete confirm (paste token from email)
curl -i -X POST "https://opusftqbbaozucmbuuug.supabase.co/functions/v1/lgpd-delete?action=confirm" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"token":"<token-from-email>"}'
# Expect: 200 with hard_delete_after timestamp

# 5. Force cron (manual smoke)
curl -i -X POST https://opusftqbbaozucmbuuug.supabase.co/functions/v1/lgpd-delete-cleanup \
  -H "Authorization: Bearer $LGPD_CLEANUP_AUTH_TOKEN"
# Expect: 200 with summary {processed, errors, deleted_user_ids, duration_ms}

# 6. Verify cron job in DB
# SELECT jobname, schedule FROM cron.job WHERE jobname='lgpd-delete-cleanup-daily';
```

## Handoff to Plan 02-03 (telemetry)

The ConsentBanner writes `user_consents.analytics_opted_in` (and `marketing_opted_in`) but DOES NOT call PostHog directly. The actual PostHog opt-in is plan 02-03's responsibility because:

- 02-02 owns: ConsentBanner UI + user_consents writes
- 02-03 owns: src/lib/posthog.ts (init with `opt_out_capturing_by_default: true`), src/lib/sentry.ts, src/main.tsx wiring

**Contract (for plan 02-03 to consume):**

```ts
import { useConsent } from '@/hooks/useConsent';

function PostHogConsentBridge() {
  const { analyticsOptedIn } = useConsent();
  useEffect(() => {
    if (analyticsOptedIn) enableAnalytics();  // posthog.opt_in_capturing()
    else disableAnalytics();                   // posthog.opt_out_capturing()
  }, [analyticsOptedIn]);
  return null;
}
```

Place this bridge component near the App.tsx root (alongside or inside `<ConsentBanner />`) so PostHog state tracks user_consents state without 02-02 needing to know PostHog exists.

**Critical:** Plan 02-03 must NOT init PostHog on module load with auto-capture enabled. Use `opt_out_capturing_by_default: true` per Research §5.3, and rely on the bridge above to flip the switch ONLY when `analytics_opted_in === true`. Network-tab verification (Gate G-HIGH-03) must show zero requests to `eu.i.posthog.com` before consent.

## Sub-Processor List (final, for legal review coordination)

The Privacidade.tsx §5 sub-processor section now declares the following seven third parties. Coordinate any change with the lawyer/DPO review BEFORE public launch:

1. **Lovable Cloud (Supabase managed)** — database + auth + edge functions; region us-east-1; SCC for BR→US
2. **Asaas** — payments + NFS-e; region BR (no transfer)
3. **PostHog Cloud EU** — product analytics (opt-in); region EU (GDPR adequacy)
4. **Sentry** — error monitoring with PII scrubbing; region US; SCC for BR→US
5. **Resend** — transactional email; region US; SCC for BR→US
6. **Crisp** — helpdesk live-chat; region EU (GDPR adequacy)
7. **Google Calendar API** — opt-in for Multi-CPF VIP users only; region US; SCC for BR→US

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Lint bug] Replace @ts-ignore with typed globalThis lookup for Sentry stub**
- **Found during:** Final verification (npm run lint)
- **Issue:** Project ESLint rule `@typescript-eslint/ban-ts-comment` forbids `@ts-ignore` in favor of `@ts-expect-error`. But the Sentry stub is intentionally a no-op until plan 02-03 wires real init — there is no error to expect (`typeof Sentry !== 'undefined'` resolves without TS error in the Deno edge environment).
- **Resolution:** Replaced the `// @ts-ignore` + `typeof Sentry !== 'undefined'` block with a typed `(globalThis as { Sentry?: ... }).Sentry?.captureException?.(err)` lookup that compiles clean without suppression comments and still resolves to `undefined` when Sentry is not loaded.
- **Files modified:** supabase/functions/lgpd-export/index.ts (line 222-228), supabase/functions/lgpd-delete/index.ts (line 360-365)
- **Commit:** 9ed919e

**2. [Rule 1 — Adversarial RLS check] profiles_select policy ADDED rather than DROP/REPLACE original**
- **Found during:** Task 2 (per the plan's task 2.2 adversarial check step)
- **Issue:** The plan's Task 2 action assumed an existing `profiles_select` policy with a `can_access_account` branch to extend. Source check showed the actual existing policy is named **`"Users can view their own profile"`** (string with spaces/quotes, from migration `20251127134056_e0d95026-e2a7-473d-8a23-cece3e2e0390.sql:128`) using `USING (auth.uid() = id)` only — no `can_access_account` branch. A naive `DROP POLICY profiles_select` would have done nothing (no policy by that name to drop) but then `CREATE POLICY profiles_select` would have created a SECOND, more permissive policy alongside the original.
- **Resolution:** Kept the original `"Users can view their own profile"` policy intact and added a new `profiles_select` policy with the full OR-branch (self always allowed + `can_access_account` + `deletion_requested_at IS NULL`). Since RLS policies on the same command are OR-ed, the net effect equals what the plan intended. The original policy guarantees self always sees own data even during the 7-day deletion window (D-18 reversal flow), which is the safer default.
- **Files modified:** supabase/migrations/20260513120002_soft_delete_columns_and_audit.sql (extended comment documenting the dual-policy design)
- **Commit:** 63d5fba (no separate commit — design choice baked into Task 2)

**3. [Plan-coordination] Added BOTH /lgpd/confirm and /lgpd/confirm-delete routes**
- **Found during:** Task 5 (App.tsx route wiring)
- **Issue:** The plan inconsistently refers to the page as both `/lgpd/confirm` (in the edge function email body + Task 5.3 action) and `/lgpd/confirm-delete` (in the must_haves recap and files_modified list). Either path may have been used in copy that was already sent in test emails.
- **Resolution:** Registered BOTH routes pointing to the same `LgpdConfirmDelete` page. Future plans can canonicalize either path; both work today.
- **Files modified:** src/App.tsx
- **Commit:** dafb7dc

**4. [Plan-coordination] LGPD_DELETE_TOKEN_SECRET env var name aligned with prompt instruction**
- **Found during:** Task 5
- **Issue:** The plan's action text used `LGPD_DELETE_SECRET` (line 498), but the executor prompt's success criteria explicitly requires `LGPD_DELETE_TOKEN_SECRET`. These are different env var names and the function would have failed without one or the other.
- **Resolution:** The edge function reads `Deno.env.get('LGPD_DELETE_TOKEN_SECRET') ?? Deno.env.get('LGPD_DELETE_SECRET')` to satisfy either name. Pending Apply section above tells the operator to set `LGPD_DELETE_TOKEN_SECRET` (canonical). The plan owner can drop the legacy fallback in a future cleanup if they prefer.
- **Files modified:** supabase/functions/lgpd-delete/index.ts (line 35)
- **Commit:** dafb7dc

### Deferred Items (out of scope for plan 02-02)

These were discovered or anticipated during execution but belong to other plans:

| Item | Reason | Suggested owner |
|------|--------|-----------------|
| PostHog opt-in actual wiring | Plan boundary — 02-02 owns user_consents writes, 02-03 owns PostHog init | Plan 02-03 (telemetry) |
| Sentry init + beforeSend regex | Same boundary | Plan 02-03 |
| Resend domain warmup (SPF/DKIM/DMARC) | DNS + Resend dashboard work | Plan 02-04 (infra) |
| Crisp helpdesk widget embed | Privacidade.tsx already lists Crisp as sub-processor but the actual `<CrispWidget />` is not in this plan | Plan 02-04 |
| Settings page "Excluir minha conta" button | UI surface for end-user to trigger lgpd-delete?action=request | Plan 02-06 (TIER UI / Path C) or follow-up backlog item — for now invocation is API-only or admin-driven |
| Settings page "Exportar meus dados" button | Same — endpoint exists, no UI yet | Plan 02-06 or backlog |
| DPO admin tooling to read deletion_audit + lgpd_export_log | Not needed for v1 (founder reads via Supabase Studio); roadmap v2 | Backlog |
| Asaas customer delete API verification (sandbox vs prod base URL) | Plan 02-05 (PAY) flips to live keys; until then ASAAS_API_URL defaults to sandbox in lgpd-delete-cleanup | Plan 02-05 |
| Settings → re-consent flow (user opts in/out of analytics post-signup) | UI surface — for v1, user can revoke by deleting account; granular toggle is v2 | Backlog |

## Threat Surface Audit (per plan threat_model)

All seven threats in `<threat_model>` are addressed:

| Threat | Mitigation in this plan |
|--------|--------------------------|
| T-2-06 Info disclosure (export bundle) | JWT auth + 1/hr rate limit + inline response (no email-link leak) |
| T-2-07 Tampering (delete confirm) | HMAC token + 24h expiry + DB row cross-check + timing-safe compare |
| T-2-08 Repudiation (regret window) | 7-day cancellation window via dpo@ email |
| T-2-09 Info disclosure (soft-deleted profile) | profiles_select RLS adds deletion_requested_at IS NULL filter |
| T-2-10 Audit gap | deletion_audit row written BEFORE auth.users DELETE; row_counts captured |
| T-2-11 Cron tampering | Vault-stored bearer secret + constant-time compare; never logged |
| T-2-12 Analytics PII | ConsentBanner gates PostHog (handoff to 02-03) — analyticsOptedIn defaults false |

No new threat flags discovered. Plan boundary respected.

## Self-Check: PASSED

- File `supabase/migrations/20260513120001_create_user_consents.sql` exists and contains `CREATE TABLE public.user_consents` + `CREATE TABLE public.lgpd_export_log` + 3 RLS policies.
- File `supabase/migrations/20260513120002_soft_delete_columns_and_audit.sql` exists with 3 ADD COLUMN clauses + deletion_audit + new profiles_select policy.
- File `supabase/migrations/20260513120003_schedule_lgpd_delete_cron.sql` exists with `cron.schedule('lgpd-delete-cleanup-daily', '0 4 * * *', ...)`.
- File `src/hooks/useConsent.ts` exists and exports `useConsent` + `CURRENT_CONSENT_VERSION`.
- File `src/components/legal/ConsentBanner.tsx` exists and contains 4 separate Checkbox/Label pairs.
- File `src/pages/LgpdConfirmDelete.tsx` exists with 3 render states (loading/confirmed/error).
- File `src/pages/Privacidade.tsx` exists and contains all 7 sub-processors + SCC + DPO §13.
- File `src/App.tsx` mounts `<ConsentBanner />` + has `/lgpd/confirm` + `/lgpd/confirm-delete` routes.
- File `supabase/functions/lgpd-export/index.ts` + `index.test.ts` exist.
- File `supabase/functions/lgpd-delete/index.ts` + `index.test.ts` exist.
- File `supabase/functions/lgpd-delete-cleanup/index.ts` exists.
- File `supabase/config.toml` has `[functions.lgpd-export]`, `[functions.lgpd-delete]`, `[functions.lgpd-delete-cleanup]` entries.
- All 8 commits exist in `git log`: b6113f4, 63d5fba, 2ae538a, 5f9b2cb, dafb7dc, 5f831d0, 4e9dc35, 9ed919e.
- `npm run lint`, `npm run typecheck`, `npm test -- --project=unit --run` all exit 0 (109 tests pass).
- `LGPD_DELETE_TOKEN_SECRET` is read via `Deno.env.get(...)` — no hardcoded secret in any file (verified via grep).

## Wave Unblocking

Plan 02-02 unblocks the rest of Wave 1 + Wave 2:

- **Plan 02-03 (telemetry):** can now consume `useConsent().analyticsOptedIn` for PostHog opt-in bridge; can rewrite `src/lib/posthog.ts` knowing the consent gate exists.
- **Plan 02-04 (infra):** can wire the production Resend domain (`noreply@milespro.net.br`) which lgpd-delete already references via the RESEND_FROM env var; the SPF/DKIM/DMARC warmup work is independent.
- **Plan 02-05 (PAY/Asaas):** the `profiles.asaas_customer_id` column is referenced in lgpd-delete-cleanup but does NOT exist yet — Plan 02-05's Task creating the Asaas customer record will add it. The cleanup function gracefully handles `asaas_customer_id IS NULL` (skips the Asaas DELETE call) so 02-02 ships without blocking on 02-05.
- **Plan 02-06 (TIER UI / Path C):** can add the "Exportar meus dados" + "Excluir minha conta" buttons in Configurações pointing to the lgpd-* endpoints that already exist.

## Notes for Future Planners

- **CURRENT_CONSENT_VERSION bump rule:** Any change to the public-facing Termos.tsx or Privacidade.tsx text that materially affects user obligations triggers a CURRENT_CONSENT_VERSION bump in `src/hooks/useConsent.ts` AND a LAST_UPDATED bump in `src/pages/Privacidade.tsx`. Both bumps in the same commit. The banner will then re-appear for every active user, asking them to re-consent on the new version.
- **HMAC token pattern reuse:** The `<hex-hmac>:<expires>:<nonce>` token format from lgpd-delete is the canonical short-lived-token shape for this codebase. Future plans needing similar email-link tokens (e.g., team invites, password reset rebuilds) should reuse `signDeletionToken`/`verifyDeletionToken` — rename them generically (`signToken`/`verifyToken`) and move to `supabase/functions/_shared/hmac.ts` when the second use case lands.
- **Cron retry semantics:** lgpd-delete-cleanup batches 100 rows per run and runs daily. If 100+ rows queue up (extreme edge case for v1 scale), the second batch waits 24h. If volume ever reaches that scale, raise the batch cap or run hourly via a separate cron job — both are 1-line changes.
- **Sentry stub forward-compatibility:** Both lgpd-export and lgpd-delete have a `(globalThis as ...).Sentry?.captureException?.(err)` block. When plan 02-03 lands the Deno `@sentry/deno` import + init, these blocks start capturing automatically — no code change needed in lgpd-* functions.
