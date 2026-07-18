---
phase: 03-mobile-distribution-launch
plan: 04b
type: runbook
owner: founder
status: pending
created: 2026-05-15
gates: [MOBILE-04, ROADMAP-SC#4]
unblocks: [03-05]
---

# Phase 3 Plan 04b — Lovable Cloud Deploy Runbook

> **Founder-owned checklist.** Deploy 4 new push edge functions
> (enqueue-push, send-push-notification, cleanup-push-subscriptions,
> send-vencimento-alert), redeploy 2 modified existing edge functions
> (asaas-webhook + compute-personalized-promos), apply 2 cron migrations
> (cleanup-sweep weekly + vencimento-alert daily), and provision 5 edge-fn
> secrets + 2 Vault entries.
>
> Plan 03-05 (client push integration — Capacitor wiring + AuthProvider
> SIGNED_OUT cleanup) depends on this runbook completing.

## Why this runbook exists

Plan 03-04b shipped 4 NEW edge functions + extended 2 EXISTING edge functions
with push fan-out helpers + added 2 cron migrations. None of these take effect
in production until the founder performs the Lovable Cloud chat actions below.
Claude cannot deploy directly.

---

## Prerequisite check (Plan 03-04a — already complete)

Before starting, confirm Plan 03-04a deploy completed:

- [ ] `push_subscriptions` table exists in production
      (visible in `src/integrations/supabase/types.ts:1090` — Plan 03-04a Step 2)
- [ ] `_shared/timingSafeEq.ts` + `_shared/fcmSignJWT.ts` are committed
      (Plan 03-04a Tasks 1, 3)
- [ ] 5 edge functions redeployed with `_shared/timingSafeEq.ts` import
      (Plan 03-04a Step 3)
- [ ] FCM service-account JSON provisioned via Plan 03-00 (Firebase project)

If any of the above is unchecked, do NOT proceed — Plan 03-04a is the
prerequisite.

---

## Step 1 — Generate 4 hex secrets (local action)

Generate 4 fresh 64-char hex tokens on your local machine. These will be used
as both edge-function secrets AND Vault entries (2 of them must match).

```bash
openssl rand -hex 32  # PUSH_ENQUEUE_AUTH_TOKEN
openssl rand -hex 32  # PUSH_SEND_AUTH_TOKEN
openssl rand -hex 32  # PUSH_CLEANUP_AUTH_TOKEN     (also → vault: push_cleanup_auth_token)
openssl rand -hex 32  # PUSH_VENCIMENTO_AUTH_TOKEN  (also → vault: push_vencimento_auth_token)
```

Record them locally in a password manager. **Do NOT commit to git.**

**Timestamp captured:** `_______`

---

## Step 2 — Apply 2 cron migrations

In the Lovable Cloud chat, run each command:

```
Aplicar a migration 20260515120006_schedule_cleanup_push_cron.sql em produção
```

Expected log output:
```
WARNING: push_cleanup_auth_token missing in vault.secrets — run: SELECT vault.create_secret(...) ...
```
The warning is expected on first apply — the Vault secret hasn't been created
yet (Step 4). The cron job IS scheduled regardless; it will simply fail at
runtime until the Vault secret exists.

**Timestamp captured:** `_______`

```
Aplicar a migration 20260515120007_schedule_send_vencimento_alert_cron.sql em produção
```

Expected log output:
```
WARNING: push_vencimento_auth_token missing in vault.secrets — run: SELECT vault.create_secret(...) ...
```

**Timestamp captured:** `_______`

> **DEVIATION NOTE:** The plan originally specified filenames
> `20260514120002_schedule_cleanup_push_cron.sql` and
> `20260514120004_schedule_send_vencimento_alert_cron.sql`, but those timestamps
> were already taken by Phase 2 W2a migrations. The executor (Plan 03-04b
> Task 5+6) renamed them to `20260515120006_*` and `20260515120007_*` to
> preserve monotonic ordering. The migration content is unchanged from the plan.

---

## Step 3 — Set 5 edge function secrets

In the Lovable Cloud dashboard → Edge Function Secrets panel, set:

| Secret name | Value | Source |
|-------------|-------|--------|
| `PUSH_ENQUEUE_AUTH_TOKEN` | hex from Step 1 | `openssl rand -hex 32` |
| `PUSH_SEND_AUTH_TOKEN` | hex from Step 1 | `openssl rand -hex 32` |
| `PUSH_CLEANUP_AUTH_TOKEN` | hex from Step 1 | `openssl rand -hex 32` |
| `PUSH_VENCIMENTO_AUTH_TOKEN` | hex from Step 1 | `openssl rand -hex 32` |
| `PUSH_FCM_SERVICE_ACCOUNT_JSON` | full JSON contents | Plan 03-00 Firebase project download |

For `PUSH_FCM_SERVICE_ACCOUNT_JSON`: paste the ENTIRE contents of the
service-account JSON file (the `{...}` blob with `type`, `project_id`,
`private_key`, `client_email`, `token_uri` keys) — do NOT paste a file path.

**Timestamp captured:** `_______`

---

## Step 4 — Create 2 Vault secrets (for pg_cron decryption)

In Lovable Cloud chat, run BOTH commands. The hex value MUST match the
corresponding edge-fn secret from Step 3 (cron and edge-fn use the same
shared secret — Vault decrypts it for pg_cron, edge-fn env reads it directly).

```
SELECT vault.create_secret('<same hex as PUSH_CLEANUP_AUTH_TOKEN>', 'push_cleanup_auth_token');
```

```
SELECT vault.create_secret('<same hex as PUSH_VENCIMENTO_AUTH_TOKEN>', 'push_vencimento_auth_token');
```

Verify:
```
SELECT name FROM vault.secrets WHERE name IN ('push_cleanup_auth_token', 'push_vencimento_auth_token');
```
Expected: 2 rows.

**Timestamp captured:** `_______`

---

## Step 5 — Deploy 4 NEW edge functions

In the Lovable Cloud chat, run each command:

```
Deployar nova edge function enqueue-push
```
**Timestamp captured:** `_______`

```
Deployar nova edge function send-push-notification
```
**Timestamp captured:** `_______`

```
Deployar nova edge function cleanup-push-subscriptions
```
**Timestamp captured:** `_______`

```
Deployar nova edge function send-vencimento-alert
```
**Timestamp captured:** `_______`

---

## Step 6 — Redeploy 2 MODIFIED existing edge functions

Both have new push fan-out helpers from Plan 03-04b.

```
Redeployar a edge function asaas-webhook
```
**Timestamp captured:** `_______`

```
Redeployar a edge function compute-personalized-promos
```
**Timestamp captured:** `_______`

---

## Step 7 — Verify 2 cron jobs scheduled

In Lovable Cloud chat:

```
SELECT jobname, schedule, command FROM cron.job
 WHERE jobname IN ('cleanup-push-subscriptions-weekly', 'send-vencimento-alert-daily');
```

Expected: 2 rows with `schedule` columns `'0 5 * * 0'` and `'0 8 * * *'`.

**Output captured:** `_______`

---

## Step 8 — Smoke test each new edge function

Replace `<your-uuid>` with your founder user_id; replace tokens with the
real values from Step 1.

### 8a — enqueue-push (no devices registered → noop 200)

```bash
curl -X POST \
  "https://opusftqbbaozucmbuuug.supabase.co/functions/v1/enqueue-push" \
  -H "Authorization: Bearer <PUSH_ENQUEUE_AUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "onboarding",
    "user_id": "<your-uuid>",
    "payload": {
      "title": "Smoke test",
      "body": "Smoke test body",
      "deep_link_path": "/dashboard"
    }
  }'
```

Expected: HTTP 200 with body `{"sent":0,"failed":0,"gated":false,"devices":0,"noop":true,...}`.

**Output captured:** `_______`

### 8b — cleanup-push-subscriptions (single mode, no rows → deleted=0)

```bash
curl -X POST \
  "https://opusftqbbaozucmbuuug.supabase.co/functions/v1/cleanup-push-subscriptions" \
  -H "Authorization: Bearer <PUSH_CLEANUP_AUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"<your-uuid>","mode":"single"}'
```

Expected: HTTP 200 with body `{"mode":"single","user_id":"<your-uuid>","deleted":0,"duration_ms":...}`.

**Output captured:** `_______`

### 8c — send-vencimento-alert (full scan; candidates probably 0 in sandbox)

```bash
curl -X POST \
  "https://opusftqbbaozucmbuuug.supabase.co/functions/v1/send-vencimento-alert" \
  -H "Authorization: Bearer <PUSH_VENCIMENTO_AUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: HTTP 200 with body `{"scanned":<n>,"candidates":0,"queued":0,"errors":0}` (or
`candidates`/`queued > 0` if you happen to be a Pro user with an
expiring balance — that means the cron is working AND you'll get a push if
you have a token registered).

**Output captured:** `_______`

### 8d — send-push-notification adversarial (wrong auth → 401)

```bash
curl -X POST \
  "https://opusftqbbaozucmbuuug.supabase.co/functions/v1/send-push-notification" \
  -H "Authorization: Bearer WRONG_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"device_token":"x","platform":"ios","payload":{"title":"t","body":"b","deep_link_path":"/d"},"event_type":"onboarding","group_key":"onboarding:global"}'
```

Expected: HTTP 401 with body `{"error":"Unauthorized"}`. (We don't smoke the
happy path here because FCM v1 needs a real registered device token.)

**Output captured:** `_______`

---

## Step 9 — Completion signal

When all 8 steps above are complete, paste the following in chat to signal
Plan 03-04b deploy is done and Plan 03-05 can proceed:

```
03-04b deploy complete: 2 migrations aplicadas (20260515120006 cleanup-sweep,
20260515120007 vencimento-daily), 5 secrets set (PUSH_ENQUEUE, PUSH_SEND,
PUSH_CLEANUP, PUSH_VENCIMENTO, PUSH_FCM_SERVICE_ACCOUNT_JSON), 2 vault entries
(push_cleanup_auth_token, push_vencimento_auth_token), 4 new edge fns
deployadas (enqueue-push, send-push-notification, cleanup-push-subscriptions,
send-vencimento-alert), 2 redeploys OK (asaas-webhook, compute-personalized-promos),
2 cron jobs verificados, 4 curl smokes 200/401 OK.
```

**Sent: `_______`**

---

## What Plan 03-05 depends on after this runbook

- `enqueue-push` URL reachable + Pro+ gated — client onboarding/milestone pushes
- `cleanup-push-subscriptions` (mode='signed_out') — AuthProvider SIGNED_OUT
  cleanup wiring (Q2 RESOLVED in 03-RESEARCH.md)
- `send-push-notification` (Vault-secret) — invoked transitively by enqueue-push
- `send-vencimento-alert` running daily at 08:00 UTC — closes ROADMAP SC#4
- `asaas-webhook` push fan-outs live — Plan 03-05 just needs to register tokens
- `compute-personalized-promos` promo_alert fan-outs live — Plan 03-05 just
  needs to render the deep-link target page

---

## Checklist summary

- [ ] Step 1: 4 hex secrets generated locally
- [ ] Step 2a: Migration 20260515120006_schedule_cleanup_push_cron.sql applied
- [ ] Step 2b: Migration 20260515120007_schedule_send_vencimento_alert_cron.sql applied
- [ ] Step 3: 5 edge-fn secrets set in Lovable Cloud
- [ ] Step 4a: vault.create_secret('push_cleanup_auth_token') created
- [ ] Step 4b: vault.create_secret('push_vencimento_auth_token') created
- [ ] Step 5a: enqueue-push deployed
- [ ] Step 5b: send-push-notification deployed
- [ ] Step 5c: cleanup-push-subscriptions deployed
- [ ] Step 5d: send-vencimento-alert deployed
- [ ] Step 6a: asaas-webhook redeployed
- [ ] Step 6b: compute-personalized-promos redeployed
- [ ] Step 7: 2 cron jobs verified via SELECT cron.job
- [ ] Step 8a: enqueue-push smoke 200 OK (noop)
- [ ] Step 8b: cleanup-push-subscriptions smoke 200 OK (single mode, deleted=0)
- [ ] Step 8c: send-vencimento-alert smoke 200 OK (full scan)
- [ ] Step 8d: send-push-notification adversarial smoke 401 OK
- [ ] Step 9: Completion signal sent — Plan 03-05 unblocked

---

## Note on plan deviation (Rule 1 — file rename)

The plan specified cron migration filenames `20260514120002_*` and
`20260514120004_*`, but those timestamps were already taken by Phase 2 W2a
migrations:

- `20260514120002_extend_user_subscriptions_for_asaas.sql` (Plan 02-05)
- `20260514120004_schedule_asaas_reconcile_cron.sql` (Plan 02-05)

The executor (Plan 03-04b Tasks 5+6) renamed the new migrations to:

- `20260515120006_schedule_cleanup_push_cron.sql`
- `20260515120007_schedule_send_vencimento_alert_cron.sql`

Migration content is unchanged from the plan. The new filenames are referenced
in Steps 2a and 2b above.

---

## Plan 03-05 Migration Apply

Plan 03-05 (client-side push integration) adds ONE new migration:

- `supabase/migrations/20260516120000_user_settings_push_pre_prompt.sql`

Apply via Lovable Cloud chat for the production Supabase project:

```
Aplicar a migration 20260516120000_user_settings_push_pre_prompt.sql em produção
Regenerar tipos do Supabase
```

Wait for confirmation. Verify (in Lovable Cloud chat):

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_settings'
  AND column_name = 'push_pre_prompt_seen_at';
```

Expected: 1 row with `data_type = 'timestamp with time zone'`.

Then verify types regeneration by checking `src/integrations/supabase/types.ts`
has `push_pre_prompt_seen_at: string | null` in the `user_settings` block.

After apply, mark below:

- [ ] 20260516120000_user_settings_push_pre_prompt.sql applied at <timestamp>
- [ ] Types regenerated at <timestamp>
- [ ] Column verified: user_settings.push_pre_prompt_seen_at = TIMESTAMPTZ NULL
- [ ] src/integrations/supabase/types.ts updated — user_settings Row/Insert/Update include push_pre_prompt_seen_at?: string | null

### Note on plan deviation (Rule 1 — file rename)

The plan specified filename `20260514120003_user_settings_push_pre_prompt.sql`,
but that timestamp was already taken by Phase 2 W2a migration
`20260514120003_profiles_asaas_customer_id_and_cpf_unique.sql`. The executor
(Plan 03-05 Task 1) renamed the new migration to:

- `20260516120000_user_settings_push_pre_prompt.sql`

(next safe slot after the most recent Lovable migration `20260516023851_*`).

Migration content is unchanged from the plan. Documented in 03-05-SUMMARY.md.

### After apply: client-side cleanup hint

Once types.ts is regenerated, `src/hooks/usePushPermission.ts` contains a
`as unknown as UserSettingsPushSlice` cast at the fetch boundary that becomes
unnecessary — the supabase client will infer the column type from the
regenerated types. Cleanup deferred to the next plan that touches the file
(same convention as AdminMetrics.tsx is_admin from Plan 02-03).
