# Plan 02-05 — Gate G-CRIT-04 Sandbox Smoke Runbook

**Purpose:** Empirically prove webhook idempotency via curl double-fire after the asaas-webhook edge function is deployed to Lovable Cloud sandbox.

**Cycle-level kill switch:** This gate is the entire reason Plan 02-05 exists. If duplicate webhook delivery produces 2 webhook_events rows OR 2 plan flips, monetization breaks under retry-storm conditions and the cycle ships with a known crash bug.

---

## Prerequisites (operator-side)

1. Migrations applied via Lovable Cloud chat:
   ```
   Aplicar a migration 20260514120001_create_webhook_events.sql
   Aplicar a migration 20260514120002_extend_user_subscriptions_for_asaas.sql
   Aplicar a migration 20260514120003_profiles_asaas_customer_id_and_cpf_unique.sql
   Aplicar a migration 20260514120004_schedule_asaas_reconcile_cron.sql
   ```

2. Edge functions deployed via Lovable Cloud chat:
   ```
   Deploy edge function asaas-webhook
   Deploy edge function create-checkout-session
   Deploy edge function reconcile-asaas-subscriptions
   ```

3. Secrets set via Lovable Cloud chat:
   ```
   Generate ASAAS_WEBHOOK_TOKEN: openssl rand -hex 32
   Generate ASAAS_RECONCILE_AUTH_TOKEN: openssl rand -hex 32
   Set edge function secret ASAAS_API_KEY=<sandbox-key-from-asaas-dashboard>
   Set edge function secret ASAAS_WEBHOOK_TOKEN=<hex-from-step-above>
   Set edge function secret ASAAS_ENV=sandbox
   Set edge function secret ASAAS_RECONCILE_AUTH_TOKEN=<hex-from-step-above>
   Create Vault secret: SELECT vault.create_secret('<same-hex>', 'asaas_reconcile_auth_token');
   ```

4. Asaas Dashboard → Webhooks → register URL:
   ```
   URL: https://opusftqbbaozucmbuuug.supabase.co/functions/v1/asaas-webhook
   Auth header name: asaas-access-token
   Auth header value: <same value as ASAAS_WEBHOOK_TOKEN above>
   Events: PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_CREATED, PAYMENT_OVERDUE,
           PAYMENT_REFUNDED, PAYMENT_PARTIALLY_REFUNDED, PAYMENT_CHARGEBACK_REQUESTED,
           PAYMENT_AWAITING_CHARGEBACK_REVERSAL, SUBSCRIPTION_DELETED,
           SUBSCRIPTION_INACTIVATED
   ```

---

## Step 1 — Generate test event and double-fire

```bash
# Powershell users: substitute env-var syntax appropriately
ASAAS_WEBHOOK_TOKEN="<your-hex-token-here>"

EVENT_ID="evt_test_$(uuidgen 2>/dev/null || node -e 'console.log(crypto.randomUUID())')"
PAYLOAD=$(cat <<EOF
{
  "id": "${EVENT_ID}",
  "event": "PAYMENT_RECEIVED",
  "payment": {
    "id": "pay_test_001",
    "subscription": "sub_test_001",
    "value": 37.90,
    "paymentDate": "$(date -u +%Y-%m-%d)",
    "externalReference": "00000000-0000-0000-0000-000000000001"
  }
}
EOF
)

# First call — expected: HTTP 200, body "OK"
curl -i -s -X POST https://opusftqbbaozucmbuuug.supabase.co/functions/v1/asaas-webhook \
  -H "asaas-access-token: ${ASAAS_WEBHOOK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "${PAYLOAD}" | tee /tmp/asaas-first.out

# Second call — same event_id — expected: HTTP 200, body "OK (duplicate ignored)"
curl -i -s -X POST https://opusftqbbaozucmbuuug.supabase.co/functions/v1/asaas-webhook \
  -H "asaas-access-token: ${ASAAS_WEBHOOK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "${PAYLOAD}" | tee /tmp/asaas-second.out
```

**PASS criteria:**
- First response: `HTTP/2 200` with body `OK`
- Second response: `HTTP/2 200` with body `OK (duplicate ignored)`
- Wall-clock: second call returns faster than first (no Supabase mutation, just the unique-violation short-circuit)

---

## Step 2 — Verify DB invariant

Via Supabase MCP / Lovable Cloud chat:

```sql
SELECT COUNT(*) FROM webhook_events
WHERE event_id = '<paste the EVENT_ID from step 1>';
-- PASS: 1 row
-- FAIL: 2 or more rows (the UNIQUE constraint did not fire — cycle-level bug)

SELECT id, status, processed_at, error_message FROM webhook_events
WHERE event_id = '<EVENT_ID>';
-- PASS: status='processed', processed_at IS NOT NULL, error_message IS NULL
```

---

## Step 3 — Adversarial cases

**Wrong token must 403:**
```bash
curl -i -s -X POST https://opusftqbbaozucmbuuug.supabase.co/functions/v1/asaas-webhook \
  -H "asaas-access-token: WRONG_TOKEN_VALUE" \
  -H "Content-Type: application/json" \
  -d "${PAYLOAD}"
# Expected: HTTP/2 403
```

**Empty body must 400:**
```bash
curl -i -s -X POST https://opusftqbbaozucmbuuug.supabase.co/functions/v1/asaas-webhook \
  -H "asaas-access-token: ${ASAAS_WEBHOOK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: HTTP/2 400
```

**No header must 403:**
```bash
curl -i -s -X POST https://opusftqbbaozucmbuuug.supabase.co/functions/v1/asaas-webhook \
  -H "Content-Type: application/json" \
  -d "${PAYLOAD}"
# Expected: HTTP/2 403
```

---

## Step 4 — Capture evidence for SUMMARY

After all 4 steps pass, paste the verbatim curl output blocks into
`.planning/phases/02-monetiza-o-compliance-telemetria/02-05-SUMMARY.md`
under the section "Gate G-CRIT-04 Empirical Evidence". Include:

- First call response headers + body
- Second call response headers + body (must include "duplicate ignored")
- SQL COUNT(*) output (must be 1)
- Wrong-token / empty-body / no-header responses

Gate G-CRIT-04 is THEN closed.

---

## Why this is a runbook, not an executor task

Plan 02-05 was authored knowing that the Asaas sandbox account and the
Lovable Cloud edge function deploy are operator-side workstreams that
cannot run inside Claude's autonomous executor. Per the plan's `<scratchpad>`:

> "Sandbox account creation + setting ASAAS_API_KEY is operator-visible
>  work but is documented inline in the deploy step. The actual e2e smoke
>  tests (curl double-fire, create subscription against sandbox) MAY require
>  operator to provision sandbox first OR can be deferred to a checkpoint
>  task. This plan deploys code and runs smoke tests SECOND (after operator
>  confirms sandbox keys are set)."

The Deno test suite for asaas-webhook already covers the CRIT-04 _contract_
(23505 path + "duplicate ignored" body marker — see
`supabase/functions/asaas-webhook/index.test.ts:106`). The runtime double-fire
in this runbook is the _empirical_ proof against a live edge function.
