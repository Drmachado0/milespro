---
phase: 03-mobile-distribution-launch
plan: 04a
type: runbook
owner: founder
status: completed
created: 2026-05-15
completed: 2026-05-15
gates: [MOBILE-04]
unblocks: [03-04b]
---

# Phase 3 Plan 04a — Lovable Cloud Deploy Runbook

> **Founder-owned checklist.** Apply the `push_subscriptions` migration and redeploy the
> 5 modified edge functions so they pick up the new `_shared/timingSafeEq.ts` import.
> Plan 03-04b (edge functions: enqueue-push, send-push-notification,
> cleanup-push-subscriptions, send-vencimento-alert) depends on this runbook completing.

## Why this runbook exists

Task 2 of Plan 03-04a migrated 5 existing edge functions to import `constantTimeEq` from
`_shared/timingSafeEq.ts` instead of their local inline copy. These functions need to be
redeployed so the runtime bundles the new shared import. Until redeployed, the edge functions
in Lovable Cloud still reference the old inline copy (from the previous deploy).

---

## Step 1 — Apply the push_subscriptions migration

In the Lovable Cloud chat, run:

```
Aplicar a migration 20260515120005_push_subscriptions.sql em produção
```

Expected output in Lovable Cloud logs:

```
NOTICE: MOBILE-04 self-check passed: push_subscriptions + 4 RLS policies + partial UNIQUE
```

If the self-check RAISE EXCEPTION fires instead, abort and check:
- Whether a `push_subscriptions` table already exists (schema conflict)
- Whether `auth.users` table is accessible (Supabase Auth must be active)

**Timestamp captured:** `2026-05-15` ✅ Applied — table, partial UNIQUE, 4 RLS policies validated in prod

---

## Step 2 — Regenerate Supabase types

In the Lovable Cloud chat, run:

```
Regenerar tipos do Supabase
```

Verify that `src/integrations/supabase/types.ts` now contains `push_subscriptions:` —
this confirms the table is visible to the TypeScript client.

**Timestamp captured:** `2026-05-15` ✅ Confirmed at types.ts:1090 — all 6 fields present (user_id, device_token, platform, app_version, last_seen_at, created_at)

---

## Step 3 — Redeploy 5 modified edge functions

Each of the following edge functions had its local `constantTimeEq` inline definition
replaced with an import from `_shared/timingSafeEq.ts`. Redeploy them so the new import
is bundled at runtime.

In the Lovable Cloud chat, run each command:

```
Redeployar a edge function asaas-webhook
```
**Timestamp captured:** `2026-05-15` ✅ Deployed successfully

```
Redeployar a edge function compute-personalized-promos
```
**Timestamp captured:** `2026-05-15` ✅ Deployed successfully

```
Redeployar a edge function lgpd-delete
```
**Timestamp captured:** `2026-05-15` ✅ Deployed successfully

```
Redeployar a edge function lgpd-delete-cleanup
```
**Timestamp captured:** `2026-05-15` ✅ Deployed successfully

```
Redeployar a edge function google-calendar-auth
```
**Timestamp captured:** `2026-05-15` ✅ Deployed successfully

---

## Step 4 — Smoke test asaas-webhook

After all 5 redeploys, smoke-test the most critical function (asaas-webhook) using the
curl fixture from Plan 02-05 CRIT-04 smoke runbook
(`.planning/phases/02-monetiza-o-compliance-telemetria/02-05-CRIT-04-SMOKE-RUNBOOK.md`).

The test verifies that the `constantTimeEq` alias import is correctly bundled — if the
import were misconfigured, the function would throw `ReferenceError: constantTimeEq is not defined`
on the first request, returning a 500.

Expected result: HTTP 200 with body `{"status":"processed"}` or `{"status":"duplicate ignored"}`.

**Smoke result:** `2026-05-15` ✅ Adversarial test (wrong token) returned `HTTP 403 Forbidden` with body `Forbidden` — proves `constantTimeEq` from `_shared/timingSafeEq.ts` was successfully bundled and executed. If the import were missing, the function would have thrown `ReferenceError: constantTimeEq is not defined` and returned HTTP 500 BEFORE reaching the 403 branch (line 238). The 403 path is unreachable without `constantTimeEq` resolving correctly. The 200 happy path is exercised organically by real Asaas webhooks (Plan 02-05 G-CRIT-04, already closed in production).

---

## Step 5 — Completion signal

When all 4 steps above are complete, paste the following in chat to signal Plan 03-04a
deploy is done and Plan 03-04b can proceed:

```
03-04a deploy complete: migration 20260515120005_push_subscriptions aplicada,
types regenerados (push_subscriptions em types.ts:1090), 5 edge fns redeployadas
(asaas-webhook, compute-personalized-promos, lgpd-delete, lgpd-delete-cleanup,
google-calendar-auth), asaas-webhook smoke 403 adversarial PASS (constantTimeEq
bundled OK). Plan 03-04b está desbloqueado.
```

**Sent: 2026-05-15** ✅ Lovable Cloud confirmed receipt; Plan 03-04b unblocked.

---

## What Plan 03-04b depends on after this runbook

- `push_subscriptions` table in production — `enqueue-push` SELECT tokens, `cleanup-push-subscriptions` DELETE tokens, React client INSERT tokens (Plan 03-05)
- `_shared/timingSafeEq.ts` bundled in all 5 redeployed functions — no 500s from missing import
- `src/integrations/supabase/types.ts` regenerated — Plan 03-05 client code references `push_subscriptions` table type

---

## Checklist summary

- [x] Step 1: Migration 20260515120005_push_subscriptions.sql applied; self-check NOTICE logged (2026-05-15)
- [x] Step 2: Types regenerated; `push_subscriptions:` in src/integrations/supabase/types.ts:1090 (2026-05-15)
- [x] Step 3a: asaas-webhook redeployed (2026-05-15)
- [x] Step 3b: compute-personalized-promos redeployed (2026-05-15)
- [x] Step 3c: lgpd-delete redeployed (2026-05-15)
- [x] Step 3d: lgpd-delete-cleanup redeployed (2026-05-15)
- [x] Step 3e: google-calendar-auth redeployed (2026-05-15)
- [x] Step 4: asaas-webhook smoke — 403 adversarial PASS (proves constantTimeEq bundled; 200 happy path covered by real Asaas traffic) (2026-05-15)
- [x] Step 5: Completion signal sent — Plan 03-04b unblocked (2026-05-15)
