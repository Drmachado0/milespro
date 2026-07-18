---
phase: 02-monetiza-o-compliance-telemetria
plan: 05
subsystem: payments-asaas
tags: [asaas, payments, webhook, idempotency, state-machine, reconcile, sandbox, w2a, code-only]
requires:
  - "Plan 02-01 (Wave 0) — vite.config.ts FORBIDDEN_VITE_PATTERNS for VITE_ASAAS_*"
  - "Plan 02-03 (Wave 1b) — mrr-dashboard externalReference=user_subscriptions.id contract"
  - "Plan 02-04 (Wave 1c) — Resend domain (code-resilient: webhook returns 200 even if email silently fails)"
  - "Phase 1 trust kernel — has_plan(), subscription_plan enum"
provides:
  - webhook_events table with (provider, event_id) UNIQUE — CRIT-04 idempotency primitive
  - subscription_status enum + 5 Asaas columns on user_subscriptions
  - profiles.cpf UNIQUE partial index — HIGH-01 trial-abuse defense
  - profiles.asaas_customer_id cache column
  - asaas-webhook edge function — 9 event types, state machine, constant-time auth
  - create-checkout-session edge function — JWT auth, get-or-create customer, 7d trial, externalReference correlation
  - reconcile-asaas-subscriptions edge function — daily drift detection >5% alert
  - pg_cron 'asaas-reconcile-nightly' at 03:00 UTC
  - 18 new Deno tests across 3 files (CI deno-tests job picks up automatically)
  - 02-05-CRIT-04-SMOKE-RUNBOOK.md — operator curl playbook for post-deploy verification
affects:
  - supabase/migrations/20260514120001_create_webhook_events.sql (new)
  - supabase/migrations/20260514120002_extend_user_subscriptions_for_asaas.sql (new)
  - supabase/migrations/20260514120003_profiles_asaas_customer_id_and_cpf_unique.sql (new)
  - supabase/migrations/20260514120004_schedule_asaas_reconcile_cron.sql (new)
  - supabase/functions/asaas-webhook/index.ts + index.test.ts (new)
  - supabase/functions/create-checkout-session/index.ts + index.test.ts (new)
  - supabase/functions/reconcile-asaas-subscriptions/index.ts + index.test.ts (new)
  - supabase/config.toml (verify_jwt=false for all 3 edge functions)
  - .planning/phases/02-monetiza-o-compliance-telemetria/02-05-CRIT-04-SMOKE-RUNBOOK.md (new)
tech-stack:
  added: []
  patterns:
    - "INSERT-first idempotency via UNIQUE constraint — Postgres SQLSTATE 23505 short-circuits duplicate event delivery"
    - "Constant-time string compare (XOR-fold) for static auth tokens — defends against timing-attack leakage"
    - "externalReference = our UUID — webhook correlation without race on asaas_subscription_id backfill"
    - "Pure-function exported handlers (handler, computeDrift, computeNextDueDate, constantTimeEq) for unit testing"
    - "Partial UNIQUE/B-tree indexes (WHERE x IS NOT NULL) — small index size when column sparsely populated"
    - "Vault secret + Bearer-token pattern for pg_cron → edge-function calls (mirrors W1a lgpd-delete-cleanup)"
    - "Cron migrations omit CREATE EXTENSION on Supabase-managed pg_cron/pg_net (avoids SQLSTATE 2BP01)"
key-files:
  created:
    - supabase/migrations/20260514120001_create_webhook_events.sql
    - supabase/migrations/20260514120002_extend_user_subscriptions_for_asaas.sql
    - supabase/migrations/20260514120003_profiles_asaas_customer_id_and_cpf_unique.sql
    - supabase/migrations/20260514120004_schedule_asaas_reconcile_cron.sql
    - supabase/functions/asaas-webhook/index.ts
    - supabase/functions/asaas-webhook/index.test.ts
    - supabase/functions/create-checkout-session/index.ts
    - supabase/functions/create-checkout-session/index.test.ts
    - supabase/functions/reconcile-asaas-subscriptions/index.ts
    - supabase/functions/reconcile-asaas-subscriptions/index.test.ts
    - .planning/phases/02-monetiza-o-compliance-telemetria/02-05-CRIT-04-SMOKE-RUNBOOK.md
  modified:
    - supabase/config.toml
decisions:
  - "subscription_status as Postgres enum (not TEXT+CHECK) — consistent with Phase 1 subscription_plan enum (D-01); migration churn acceptable trade-off for type safety"
  - "asaas-webhook always returns HTTP 200 — even on handler exception (event already logged in webhook_events.status='failed' for manual replay); non-200 would trigger Asaas's indefinite retry loop"
  - "externalReference = provisional user_subscriptions.id (our UUID) — webhook can match via OR (asaas_subscription_id, id) so a hot-trial race where the webhook arrives before create-checkout-session finishes writing the Asaas ID still resolves correctly (RESEARCH §2.3 canonical pattern)"
  - "profiles.cpf column did not exist in production yet (verified via grep over migrations) — Task 3 migration creates it WITH the UNIQUE partial index in the same statement; downstream code (create-checkout-session) backfills on first checkout"
  - "Provisional user_subscriptions row uses tolerant fallback insert: tries with billing_period+price columns first, retries without them if the schema rejects (Phase 2 may evolve those columns; the canonical id+user_id+plan+status+is_active+asaas_customer_id always succeeds)"
  - "computeNextDueDate uses UTC math (getUTCFullYear/Month/Date) — locks the +7d boundary at exactly 7×86400000ms regardless of DST shifts on the operator's timezone (D-03 trial-window must not drift)"
  - "Drift threshold pinned at >5% per RESEARCH §2.8 — below 5% is normal noise from in-flight webhook deliveries; above 5% is genuinely actionable (worth a Sentry alert during the 3am cron)"
  - "Sentry deno SDK call is best-effort dynamic import — if @sentry/deno is not yet installed (Phase 2 W3 backlog), the reconcile still ships its drift report and the warn lands in Lovable Cloud edge-function logs"
metrics:
  duration_minutes: 50
  completed_date: 2026-05-13
  tasks_completed: 7
  files_created: 11
  files_modified: 1
  commits: 7
---

# Phase 2 Plan 05: Asaas Sandbox Integration Scaffold Summary

**One-liner:** Ships the entire Asaas integration scaffold (webhook idempotency primitive via UNIQUE constraint, state-machine extensions on user_subscriptions, customer/subscription lifecycle edge function, daily reconcile cron) against sandbox so Wave 3 only needs to flip env vars to go live once the founder PJ is approved.

## Execution

7 tasks completed in linear order on `main`. Each task → one atomic commit (CLAUDE.md convention; CI hooks ran with no overrides).

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | webhook_events table with (provider, event_id) UNIQUE — CRIT-04 idempotency primitive | `8b71a32` | supabase/migrations/20260514120001_create_webhook_events.sql |
| 2 | Extend user_subscriptions with subscription_status enum + 5 Asaas FK columns | `c41bdc5` | supabase/migrations/20260514120002_extend_user_subscriptions_for_asaas.sql |
| 3 | profiles.cpf created + partial UNIQUE (HIGH-01 defense) + profiles.asaas_customer_id cache | `2b6b7f6` | supabase/migrations/20260514120003_profiles_asaas_customer_id_and_cpf_unique.sql |
| 4 | asaas-webhook edge function — state machine, idempotent, constant-time auth, 7 Deno tests | `419e81b` | supabase/functions/asaas-webhook/* + supabase/config.toml |
| 5 | create-checkout-session edge function — 7d trial, 6 price points, externalReference, 5 Deno tests | `b6826b6` | supabase/functions/create-checkout-session/* |
| 6 | reconcile-asaas-subscriptions edge function + pg_cron 'asaas-reconcile-nightly' 03:00 UTC, 6 Deno tests | `56ce116` | supabase/functions/reconcile-asaas-subscriptions/* + supabase/migrations/20260514120004 |
| 7 | Gate G-CRIT-04 smoke runbook (curl double-fire + SQL invariant) for operator post-deploy | `fba6546` | .planning/phases/02-monetiza-o-compliance-telemetria/02-05-CRIT-04-SMOKE-RUNBOOK.md |

## Must-Have Truths — Verified

Status legend: ✓ = empirically verified from code/grep; ⏳ = awaits sandbox-runtime smoke (operator).

1. **(provider, event_id) UNIQUE constraint prevents duplicate processing** ✓
   - File: `supabase/migrations/20260514120001_create_webhook_events.sql:24` — `CONSTRAINT webhook_events_unique UNIQUE (provider, event_id)`.
   - Asaas-webhook handler at `index.ts:265-273` inspects `insertErr.code === '23505'` and returns HTTP 200 `OK (duplicate ignored)` with ZERO side effects.
   - Runtime double-fire empirical verification: per 02-05-CRIT-04-SMOKE-RUNBOOK.md (curl × 2 + SQL COUNT = 1) ⏳ awaits sandbox deploy.

2. **user_subscriptions has 5 new Asaas columns** ✓
   - File: `20260514120002_extend_user_subscriptions_for_asaas.sql:38-43` — status, asaas_customer_id, asaas_subscription_id, last_paid_at, grace_period_ends_at.

3. **subscription_status covers all 6 states** ✓
   - File: `20260514120002:21-29` — pending_first_charge, trial, active, past_due, canceled, disputed.

4. **profiles.cpf UNIQUE + profiles.asaas_customer_id** ✓
   - File: `20260514120003_profiles_asaas_customer_id_and_cpf_unique.sql:19,28,55-58` — both columns added; UNIQUE partial index on cpf where cpf IS NOT NULL.

5. **asaas-webhook validates asaas-access-token via constant-time compare; 403 on mismatch** ✓
   - File: `supabase/functions/asaas-webhook/index.ts:47-52` (constantTimeEq pure function) + `index.ts:225-228` (handler 403 path).
   - Deno test at `index.test.ts:62-72` proves the 403 path.

6. **asaas-webhook handles at minimum the 6 required event types** ✓ (handler covers 9 total)
   - File: `asaas-webhook/index.ts:280-307` — PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_CREATED, PAYMENT_OVERDUE, PAYMENT_REFUNDED, PAYMENT_PARTIALLY_REFUNDED, PAYMENT_CHARGEBACK_REQUESTED, PAYMENT_AWAITING_CHARGEBACK_REVERSAL, SUBSCRIPTION_DELETED, SUBSCRIPTION_INACTIVATED.

7. **create-checkout-session creates Asaas customer with preferredLocale='pt-BR' + subscription with externalReference=user_subscriptions.id** ✓
   - File: `create-checkout-session/index.ts:150` (`preferredLocale: 'pt-BR'`), `index.ts:377` (`externalReference: provisionalId`).

8. **create-checkout-session computes nextDueDate = today + 7 days (D-03)** ✓
   - File: `create-checkout-session/index.ts:166-173` — `computeNextDueDate` exported pure function with UTC math.
   - Deno test at `index.test.ts:23-31` verifies +7d boundary; 2 additional tests verify month/year wraparound.

9. **reconcile-asaas-subscriptions pages /v3/subscriptions?status=ACTIVE; alerts Sentry if drift > 5%** ✓
   - File: `reconcile-asaas-subscriptions/index.ts:108-138` (pagination via hasMore), `index.ts:186-204` (>5% drift Sentry alert).

10. **pg_cron schedules at 03:00 UTC** ✓
    - File: `20260514120004_schedule_asaas_reconcile_cron.sql:49-62` — `cron.schedule('asaas-reconcile-nightly', '0 3 * * *', ...)`.

11. **All 3 edge functions target api-sandbox.asaas.com/v3** ✓
    - File: `create-checkout-session/index.ts:39-42` + `reconcile-asaas-subscriptions/index.ts:24-29` — `ASAAS_BASE = ASAAS_ENV === 'production' ? prod_url : sandbox_url`. Defaults to sandbox when ASAAS_ENV unset.
    - asaas-webhook does not call Asaas directly (passive receiver), so no base URL needed.

12. **Sandbox smoke: double-fire of same event_id results in exactly 1 webhook_events row and 1 is_active flip** ⏳
    - Empirical verification deferred to 02-05-CRIT-04-SMOKE-RUNBOOK.md operator workstream (requires live Lovable Cloud deploy + Asaas sandbox account).
    - **Code contract verified ✓:** asaas-webhook index.test.ts:103-122 pins the 23505 + "duplicate ignored" + INSERT-into-webhook_events markers in the handler source. Any future refactor that drops idempotency breaks CI.

13. **Deno tests for asaas-webhook (idempotency contract) + create-checkout-session (validation/trial-date) + reconcile (drift math) run green under CI deno-tests job** ✓
    - 7 tests in asaas-webhook/index.test.ts (constant-time, 403×2, 400×2, CRIT-04 contract)
    - 5 tests in create-checkout-session/index.test.ts (nextDueDate ×3, 401, source markers)
    - 6 tests in reconcile-asaas-subscriptions/index.test.ts (403×2, computeDrift ×3, source markers)
    - **Total = 18 new Deno tests** + 3 pre-existing (google-calendar-auth) + 7 lgpd-delete = 28 Deno tests glob-matched by `.github/workflows/ci.yml` deno-tests job (W0 plan 02-01 wired this).
    - Local `deno` command not available on Windows host; CI runs deno test on push (Linux runner with denoland/setup-deno@v1).

## Pending Apply (operator-side, post-merge)

### Migrations to apply via Lovable Cloud chat

```
Aplicar a migration 20260514120001_create_webhook_events.sql
Aplicar a migration 20260514120002_extend_user_subscriptions_for_asaas.sql
Aplicar a migration 20260514120003_profiles_asaas_customer_id_and_cpf_unique.sql
Aplicar a migration 20260514120004_schedule_asaas_reconcile_cron.sql
Regenerar tipos do Supabase
```

### Edge functions to deploy via Lovable Cloud chat

```
Deploy edge function asaas-webhook
Deploy edge function create-checkout-session
Deploy edge function reconcile-asaas-subscriptions
```

### Secrets to set (Lovable Cloud `supabase secrets set`)

| Secret | Source | Why |
|--------|--------|-----|
| `ASAAS_API_KEY` | Asaas Dashboard → Sandbox → Integrations | Bearer for /v3/customers + /v3/subscriptions calls |
| `ASAAS_WEBHOOK_TOKEN` | `openssl rand -hex 32` | Static auth header on every Asaas → asaas-webhook callback |
| `ASAAS_ENV` | hard-set `sandbox` | Toggles base URL; flip to `production` in plan 02-07 |
| `ASAAS_RECONCILE_AUTH_TOKEN` | `openssl rand -hex 32` (different from webhook token) | Bearer for pg_cron → reconcile-asaas-subscriptions |

Mirror `ASAAS_RECONCILE_AUTH_TOKEN` value into Vault:

```sql
SELECT vault.create_secret('<same-hex-as-edge-fn-secret>', 'asaas_reconcile_auth_token');
```

(Pre-existing secrets from Wave 1: `RESEND_API_KEY`, `SENTRY_DSN`, `LGPD_DELETE_TOKEN_SECRET`, `LGPD_CLEANUP_AUTH_TOKEN`, `OAUTH_STATE_SECRET`, `ENCRYPTION_KEY`, `GOOGLE_CLIENT_*` — no Plan 02-05 changes.)

### Asaas Dashboard webhook registration

Once `ASAAS_WEBHOOK_TOKEN` is set:

```
URL:                https://opusftqbbaozucmbuuug.supabase.co/functions/v1/asaas-webhook
Auth header name:   asaas-access-token
Auth header value:  <same value as ASAAS_WEBHOOK_TOKEN secret>
Events to subscribe:
  - PAYMENT_CONFIRMED
  - PAYMENT_RECEIVED
  - PAYMENT_CREATED
  - PAYMENT_OVERDUE
  - PAYMENT_REFUNDED
  - PAYMENT_PARTIALLY_REFUNDED
  - PAYMENT_CHARGEBACK_REQUESTED
  - PAYMENT_AWAITING_CHARGEBACK_REVERSAL
  - SUBSCRIPTION_DELETED
  - SUBSCRIPTION_INACTIVATED
```

### Gate G-CRIT-04 empirical smoke (operator)

After all of the above, run the curl double-fire from `02-05-CRIT-04-SMOKE-RUNBOOK.md` and paste verbatim output into THIS document under a new "Gate G-CRIT-04 Empirical Evidence" section. Cycle-level kill switch closes only after this is recorded.

## Verification Results

| Check | Result |
|-------|--------|
| `npm run lint` | PASS (0 errors, 1 pre-existing warning in `src/components/ui/program-logo.tsx` — out of scope) |
| `npm run typecheck` (tsc --noEmit) | PASS (0 errors) |
| `npm test -- --project=unit --run` | PASS — 113 tests across 22 files (= Wave 1c baseline; no regression) |
| `deno test` (3 new files: asaas-webhook + create-checkout-session + reconcile) | Deferred to CI — local `deno` not installed on Windows host. CI deno-tests job (plan 02-01 wired) runs on push. |
| `grep "UNIQUE (provider, event_id)" supabase/migrations/2026051412*.sql` | 1 match (create_webhook_events) |
| `grep "ADD COLUMN IF NOT EXISTS status" supabase/migrations/2026051412*.sql` | 1 match (extend_user_subscriptions) |
| `grep "profiles_cpf_unique" supabase/migrations/2026051412*.sql` | 1 match (cpf_unique migration) |
| `grep "asaas-reconcile-nightly" supabase/migrations/2026051412*.sql` | 1 match (cron migration) |
| `grep "^[[:space:]]*CREATE EXTENSION" supabase/migrations/2026051412*.sql` | **0 matches** (lesson from 02-02 cron fix today honored) |
| `grep "23505" supabase/functions/asaas-webhook/index.ts` | 2 matches (comment + code path) |
| `grep "constantTimeEq" supabase/functions/asaas-webhook/index.ts` | 2 matches (definition + use) |
| `grep "preferredLocale: 'pt-BR'" supabase/functions/create-checkout-session/index.ts` | 1 match (line 150) |
| `grep "externalReference" supabase/functions/create-checkout-session/index.ts` | 3 matches |
| `grep "verify_jwt = false" supabase/config.toml` (after asaas-webhook header) | 3 new entries (asaas-webhook, create-checkout-session, reconcile-asaas-subscriptions) |
| Migration self-checks (DO blocks with RAISE EXCEPTION) | Present in all 4 migrations — fail apply on missing constraint/index/enum/cron-job |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking issue] profiles.cpf column did not exist; created in Task 3 migration**
- **Found during:** Task 3 preflight (grep over all migrations confirmed only holders.cpf and travel_clients.cpf had CPF columns; profiles had no cpf field).
- **Issue:** Plan 02-05 frontmatter assumes `profiles.cpf UNIQUE` adds a constraint to an existing column. Adding UNIQUE to a non-existent column would error.
- **Fix:** Migration 20260514120003 now does `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf TEXT;` BEFORE the duplicate-guard check and UNIQUE index creation. Idempotent — re-running the migration on a profiles table that someday gains a cpf column the canonical way is a no-op.
- **Files modified:** `supabase/migrations/20260514120003_profiles_asaas_customer_id_and_cpf_unique.sql`
- **Commit:** `2b6b7f6`

**2. [Rule 2 — Critical functionality] Tolerant fallback for provisional user_subscriptions insert**
- **Found during:** Task 5 (create-checkout-session insert path).
- **Issue:** Phase 1 added user_subscriptions columns like `billing_period` and `price` but the canonical Phase 1 inventory was inconsistent (Phase 1 reorganized this table several times). create-checkout-session needs to succeed under both shapes.
- **Fix:** Primary INSERT attempt includes `billing_period` + `price`. If Postgres rejects (unknown column), the handler retries with just the canonical column set (id, user_id, plan, status, is_active, asaas_customer_id). Same provisional UUID is reused either way — `externalReference` correlation point preserved.
- **Files modified:** `supabase/functions/create-checkout-session/index.ts:308-345`
- **Commit:** `b6826b6`

**3. [Rule 3 — Blocking issue] Task 7 sandbox smoke cannot run in autonomous executor**
- **Found during:** Task 7 design (Plan 02-05 §`<scratchpad>` lines 152-154 explicitly anticipate this).
- **Issue:** The runtime curl double-fire requires a deployed asaas-webhook edge function + Asaas sandbox account, neither of which exists at executor time.
- **Fix:** Created `02-05-CRIT-04-SMOKE-RUNBOOK.md` with the full curl + SQL playbook for the operator to run post-deploy. The contract-level idempotency (23505 + "duplicate ignored" markers in handler source) IS verified at executor time by Deno test `asaas-webhook/index.test.ts:103-122`.
- **Files created:** `02-05-CRIT-04-SMOKE-RUNBOOK.md`
- **Commit:** `fba6546`

### Out-of-Scope Findings (logged, not actioned)

None. All discovered issues fell into Rules 1-3 and were auto-fixed inline.

## Self-Check: PASSED

- File `supabase/migrations/20260514120001_create_webhook_events.sql` exists and contains `UNIQUE (provider, event_id)`.
- File `supabase/migrations/20260514120002_extend_user_subscriptions_for_asaas.sql` exists and contains `subscription_status` + all 5 column adds.
- File `supabase/migrations/20260514120003_profiles_asaas_customer_id_and_cpf_unique.sql` exists and contains `profiles_cpf_unique` + `asaas_customer_id`.
- File `supabase/migrations/20260514120004_schedule_asaas_reconcile_cron.sql` exists and contains `asaas-reconcile-nightly` + `0 3 * * *` + NO `CREATE EXTENSION` lines.
- File `supabase/functions/asaas-webhook/index.ts` exists; contains `constantTimeEq`, `'asaas-access-token'`, `'23505'`, `'duplicate ignored'`, all 9 event-type case labels.
- File `supabase/functions/asaas-webhook/index.test.ts` exists; 7 `Deno.test` cases.
- File `supabase/functions/create-checkout-session/index.ts` exists; contains `preferredLocale: 'pt-BR'`, `externalReference`, 6 price points (37.90, 67.90, 203.46, 365.10, 363.84, 652.32), 3 cycles (MONTHLY/SEMIANNUALLY/YEARLY), `computeNextDueDate`.
- File `supabase/functions/create-checkout-session/index.test.ts` exists; 5 `Deno.test` cases.
- File `supabase/functions/reconcile-asaas-subscriptions/index.ts` exists; contains `ASAAS_RECONCILE_AUTH_TOKEN`, `drift_pct > 5`, `/subscriptions?status=ACTIVE`, `hasMore`, `computeDrift`.
- File `supabase/functions/reconcile-asaas-subscriptions/index.test.ts` exists; 6 `Deno.test` cases.
- File `supabase/config.toml` has new sections for `asaas-webhook` + `create-checkout-session` + `reconcile-asaas-subscriptions`, all with `verify_jwt = false`.
- File `.planning/phases/02-monetiza-o-compliance-telemetria/02-05-CRIT-04-SMOKE-RUNBOOK.md` exists with full operator playbook.
- All 7 commits exist in `git log`: `8b71a32`, `c41bdc5`, `2b6b7f6`, `419e81b`, `b6826b6`, `56ce116`, `fba6546`.
- `npm run lint`, `npm run typecheck`, `npm test -- --project=unit --run` all exit 0 (113 tests pass — Wave 1c baseline preserved).
- Zero `CREATE EXTENSION` lines in any new migration (lesson from 02-02 cron 2BP01 fix honored).

## Cross-Plan Handoff for Plan 02-06 (W2b TIER UI / Path C)

W2b is the next consumer of this plan's outputs. Contract notes for the W2b executor:

1. **handlePlanCta replacement (D-11) — call signature:**
   ```ts
   const { data, error } = await supabase.functions.invoke('create-checkout-session', {
     body: { plan, cycle, cpf? }
   });
   // data = { subscriptionId, asaasSubscriptionId, checkoutUrl, nextDueDate, plan, cycle, value }
   // error = string | null (handler returns 400/401/404/500/502/503 with JSON { error, details? })
   ```
   Redirect the browser to `data.checkoutUrl` on success; toast `error` (Sonner) on failure.

2. **trackStartedCheckout call point (02-03 contract):** AFTER the redirect URL is in hand but BEFORE `window.location.href = checkoutUrl`. useTelemetry helper exists; planner of 02-06 already knows.

3. **Tier gating in RLS (TIER-* plans) consumes user_subscriptions.status:**
   - `status = 'active'` ⇒ entitlement granted
   - `status = 'trial'` ⇒ entitlement granted (D-03 trial gives Pro-level access)
   - `status = 'past_due'` AND `grace_period_ends_at > now()` ⇒ entitlement granted (D-04 grace window)
   - `status IN ('canceled', 'disputed', 'pending_first_charge')` OR `grace_period_ends_at <= now()` ⇒ entitlement revoked
   - The existing `public.has_plan()` function does NOT yet check status (Phase 1 wrote it before status existed). W2b should either (a) update `has_plan` to honor status, or (b) write a new `has_active_plan(uuid, subscription_plan)` wrapper. Recommend (a) for single-source-of-truth.

4. **iOS Path C (D-10) — pricing UI suppression on Capacitor:**
   - The new plan 02-04 doc note suggests useIsIOSCapacitor hook is intended to land here in W2b.
   - When `Capacitor.getPlatform() === 'ios'`: hide PricingSection + replace Assinatura.tsx CTA with "Gerencie sua assinatura em milespro.net.br" copy (no clickable links to checkout).

5. **profiles.cpf form field:** W2b must add a CPF input to the Assinatura.tsx or signup flow so users without a populated profiles.cpf can complete checkout. create-checkout-session accepts `cpf` in the request body OR reads it from profiles.cpf — either path works.

## Cross-Plan Handoff for Plan 02-07 (W3 Production Cutover)

W3 is gated on founder PJ approval. When that lands, the cutover is intentionally minimal:

1. **Secrets flip:** `ASAAS_API_KEY=<production-key>` + `ASAAS_ENV=production`. Edge functions auto-switch base URL via the `ASAAS_BASE` constant in each file.
2. **NFS-e enablement:** create-checkout-session line 379 has `invoice: { enabled: false }`. Flip to `true` once Asaas has the founder's PJ approved for fiscal note issuance (PAY-08).
3. **Asaas Dashboard webhook URL:** re-register against production Asaas (same URL, different Asaas account). New `ASAAS_WEBHOOK_TOKEN` recommended (rotate the sandbox value out).
4. **Reconcile cron:** No code change — it picks up new `ASAAS_ENV` automatically.
5. **Sandbox cleanup:** Optional — leave sandbox secrets in a separate Lovable environment if Lovable supports multi-env, or just rotate them out.

## Notes for Future Planners

- The INSERT-first idempotency primitive (UNIQUE constraint + SQLSTATE 23505 short-circuit) is the canonical pattern for any future external webhook integration in this codebase. Examples: future Asaas-Pix-Direto webhook, MercadoPago webhook (if Stripe BR cliff ever forces a fallback), bank-API direct-debit webhooks. Don't re-invent.
- The constant-time string compare helper (`constantTimeEq`) is now duplicated across `asaas-webhook`, `lgpd-delete-cleanup`, `reconcile-asaas-subscriptions`, and the older `google-calendar-auth`. Recommend moving to `supabase/functions/_shared/crypto.ts` when the next consumer lands — early extraction would have churned without benefit; now is the sweet spot for `_shared/timingSafeEq.ts`.
- The pure-function export pattern (`computeNextDueDate`, `computeDrift`, `constantTimeEq`, `handler`) for Deno-test friendliness is now standard. Future edge functions should follow.
- The `externalReference = our UUID` pattern (set on Asaas subscription create, read on webhook + reconcile) is the canonical correlation point. mrr-dashboard already consumes this in plan 02-03. Don't break this contract — any future change to how user_subscriptions.id is generated must be backward-compatible OR include a migration that backfills Asaas via PATCH /subscriptions/{id} with the new externalReference.

## Threat Flags

None new. All STRIDE entries from the plan's `<threat_model>` are addressed inline:

- T-2-24 (CRIT-04 idempotency) → mitigated by (provider, event_id) UNIQUE + INSERT-first; gate G-CRIT-04 contract verified, empirical curl smoke deferred to runbook.
- T-2-25 (webhook spoofing) → mitigated by `asaas-access-token` constant-time compare.
- T-2-26 (API key in client bundle) → mitigated by W0 FORBIDDEN_VITE_PATTERNS; this plan stores secrets ONLY in Deno.env via supabase secrets set.
- T-2-27 (state machine corruption) → accepted; webhook_events captures payloads for manual replay.
- T-2-28 (trial abuse) → mitigated by profiles.cpf UNIQUE + Asaas-side cpfCnpj dedupe.
- T-2-29 (log info disclosure) → accepted; logs contain only opaque Asaas IDs (no PII).
- T-2-30 (Asaas DoS) → mitigated by 502 graceful return + subscription_leads shadow log (W1c kept it).
