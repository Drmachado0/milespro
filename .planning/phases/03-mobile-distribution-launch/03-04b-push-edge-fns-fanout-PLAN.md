---
phase: 03-mobile-distribution-launch
plan: 04b
type: execute
wave: 2
depends_on: ["04a"]
files_modified:
  - supabase/functions/enqueue-push/index.ts
  - supabase/functions/enqueue-push/index.test.ts
  - supabase/functions/send-push-notification/index.ts
  - supabase/functions/send-push-notification/index.test.ts
  - supabase/functions/cleanup-push-subscriptions/index.ts
  - supabase/functions/cleanup-push-subscriptions/index.test.ts
  - supabase/functions/send-vencimento-alert/index.ts
  - supabase/functions/send-vencimento-alert/index.test.ts
  - supabase/functions/asaas-webhook/index.ts
  - supabase/functions/compute-personalized-promos/index.ts
  - supabase/migrations/20260514120002_schedule_cleanup_push_cron.sql
  - supabase/migrations/20260514120004_schedule_send_vencimento_alert_cron.sql
  - src/test/integration/push.adversarial.test.ts
autonomous: false
requirements: [MOBILE-04, MOBILE-03]
tags: [push-edge-fns, fcm, apns, fan-out, multi-device, vencimento-cron, adversarial-rls, lovable-cloud-deploy]
must_haves:
  truths:
    - "supabase/functions/enqueue-push/index.ts accepts JWT-Bearer OR Vault-secret-Bearer auth; body {event_type: 'expiry_60d'|'expiry_13d'|'payment_event'|'onboarding'|'promo_alert', user_id, payload}; gates Pro+ events (expiry_60d, expiry_13d, promo_alert) via server-side has_plan('pro') RPC; fan-outs to send-push-notification per device_token (multi-device delivery per Q4 RESOLVED); logs telemetry"
    - "enqueue-push fan-out delivers to ALL tokens for the user_id (multi-device — Q4 RESOLVED in RESEARCH.md). Each FCM payload includes (a) Android `notification.tag` keyed as `${event_type}:${payload.balance_id ?? 'global'}` so duplicate deliveries collapse on Android; (b) iOS `apns.payload.aps.thread-id` keyed identically so iOS groups them under one notification thread; (c) `data.balance_id` (when present in payload) for client-side coalescing"
    - "supabase/functions/send-push-notification/index.ts auth via Vault-secret-Bearer (PUSH_SEND_AUTH_TOKEN); reads PUSH_FCM_SERVICE_ACCOUNT_JSON from Deno.env; calls _shared/fcmSignJWT.ts to mint OAuth2 token; POSTs to https://fcm.googleapis.com/v1/projects/<project_id>/messages:send with FCM v1 payload shape (message.token + notification + data.deep_link_path + apns.payload.aps.thread-id + android.notification.tag — both keyed by (event_type, balance_id) per Q4 RESOLVED); handles 404 UNREGISTERED + 400 INVALID_ARGUMENT by DELETE from push_subscriptions WHERE device_token=$token; returns {sent, failed, removed_stale}"
    - "supabase/functions/cleanup-push-subscriptions/index.ts auth via Vault-secret-Bearer (PUSH_CLEANUP_AUTH_TOKEN); accepts body {user_id, mode:'single'|'sweep'|'signed_out'}; mode='single' from asaas-webhook on downgrade (DELETE WHERE user_id=$param); mode='signed_out' from AuthProvider on Supabase SIGNED_OUT event (Plan 03-05 wiring, Q2 RESOLVED — DELETE WHERE user_id=$param, same SQL as 'single' but distinguishes telemetry); mode='sweep' from weekly cron (DELETE WHERE last_seen_at < now() - interval '60 days'); returns {deleted, duration_ms}"
    - "supabase/functions/send-vencimento-alert/index.ts is the daily cron edge fn (ROADMAP SC#4 + D-T06 #1 — CLOSED here, was unplanned in original 03-04) — queries balances JOIN user_settings (alert_antecipation_days threshold) JOIN user_subscriptions (filter has_plan('pro')); identifies users where (expires_at - alert_antecipation_days) <= now() AND expires_at > now(); iterates matching rows; calls enqueue-push per user with event_type='expiry_60d' (when 60-day window matched) or 'expiry_13d' (when 13-day window matched, per project naming convention from D-T06); payload includes balance_id, program_name, expires_at, points_expiring; deep_link_path='/programa/${program_id}'; returns {scanned, queued, errors}"
    - "send-vencimento-alert exports `findUsersToAlert(balances, settings, subscriptions, now): Array<{user_id, event_type, balance_id, program_name, points_expiring, expires_at}>` as a pure function (no DB) so it can be unit-tested in isolation; the HTTP handler is a thin wrapper that fetches data + invokes the pure fn"
    - "supabase/migrations/20260514120002_schedule_cleanup_push_cron.sql schedules weekly Sunday 05:00 UTC sweep via pg_cron + net.http_post calling cleanup-push-subscriptions with body {mode:'sweep'} + Vault-decrypted auth token (D-T08 defense-in-depth weekly sweep)"
    - "supabase/migrations/20260514120004_schedule_send_vencimento_alert_cron.sql schedules daily 08:00 UTC scan via pg_cron + net.http_post calling send-vencimento-alert with Vault-decrypted auth token (matches Phase 2 cron pattern, e.g., compute-personalized-promos @ 02:00 UTC)"
    - "asaas-webhook handleRefund + handleSubscriptionCanceled + handlePaymentOverdue fan-out to cleanup-push-subscriptions (best-effort try/catch); handlePaymentConfirmed + handlePaymentReceived fan-out to enqueue-push with event_type='payment_event' (All tiers, no Pro+ gate); deep_link_path='/dashboard' (Path C — NEVER /assinatura on iOS)"
    - "compute-personalized-promos post-INSERT fan-out: for each successful user_promo_alerts insert, POST to enqueue-push with event_type='promo_alert', user_id, payload containing from_program + to_program + bonus_pct + deep_link_path='/promocoes' + balance_id (when known) (D-T06 #2)"
    - "enqueue-push: 6 Deno test cases (rejects missing auth → 401; Pro+ event_type from Free user → 403 with body {error:'plan_required'}; multi-device fan-out scenario asserts N tokens → N send-push-notification calls; payment_event from Free user → bypasses has_plan gate; promo_alert with no tokens for user → 200 + sent=0 noop; malformed body → 400)"
    - "send-push-notification: 4 Deno test cases (rejects missing auth → 401; signs FCM JWT + POSTs to FCM v1 endpoint with correct payload shape including thread-id/tag with balance_id; 404 UNREGISTERED → DELETE token from push_subscriptions; 5xx FCM error → returns failed counter incremented)"
    - "cleanup-push-subscriptions: 5 Deno test cases (rejects missing auth → 401; single-mode body {user_id} → DELETEs that user's rows + returns {deleted, mode:'single'}; signed_out-mode body {user_id, mode:'signed_out'} → same SQL effect + returns {deleted, mode:'signed_out'} for telemetry distinction; sweep-mode body {mode:'sweep'} → returns {deleted, mode:'sweep'}; user_id with zero tokens → 200 + deleted=0)"
    - "send-vencimento-alert: 4 Deno test cases for the pure `findUsersToAlert(...)` function (Free user is filtered out by subscription join; user without alert_antecipation_days defaults to 60 days; balance expiring in 60 days → event_type='expiry_60d'; balance expiring in 13 days → event_type='expiry_13d'; balance already expired → not in result set) + 1 HTTP-handler test (rejects missing auth → 401)"
    - "src/test/integration/push.adversarial.test.ts (Vitest integration) mirrors vip.adversarial.test.ts: Free INSERT own row → succeeds (no has_plan gate at table); Free INSERT cross-user row → 42501; Free SELECT cross-user row → empty; Pro UPDATE own last_seen_at → succeeds; Pro UPDATE another user's row → 42501; duplicate device_token for same user → 23505 unique violation"
    - "[BLOCKING] Lovable Cloud deploy task: deploy 4 new edge functions (enqueue-push + send-push-notification + cleanup-push-subscriptions + send-vencimento-alert), redeploy 2 modified edge fns (asaas-webhook + compute-personalized-promos — they pick up the fan-out helper changes), apply 2 cron migrations (20260514120002 cleanup-sweep + 20260514120004 vencimento-daily), set 4 secrets (PUSH_SEND_AUTH_TOKEN + PUSH_ENQUEUE_AUTH_TOKEN + PUSH_CLEANUP_AUTH_TOKEN + PUSH_FCM_SERVICE_ACCOUNT_JSON), Vault create_secret('push_cleanup_auth_token' + 'push_vencimento_auth_token' for cron decrypted_secrets), regenerate types.ts — captured in 03-04b-LOVABLE-CLOUD-DEPLOY-RUNBOOK.md"
  artifacts:
    - path: supabase/functions/enqueue-push/index.ts
      provides: "Pro+-gated push dispatcher; multi-device fan-out per Q4; thread-id/tag keyed by (event_type, balance_id)"
      contains: "has_plan"
    - path: supabase/functions/send-push-notification/index.ts
      provides: "FCM HTTP v1 wrapper; handles 404 UNREGISTERED stale-token cleanup; thread-id/tag for grouping"
      contains: "fcm.googleapis.com"
    - path: supabase/functions/cleanup-push-subscriptions/index.ts
      provides: "Downgrade + SIGNED_OUT + sweep cleanup of push_subscriptions (3 modes)"
      contains: "signed_out"
    - path: supabase/functions/send-vencimento-alert/index.ts
      provides: "Daily cron — scans balances vs alert_antecipation_days threshold; Pro+ only; deep-links to /programa/${id} (ROADMAP SC#4 + D-T06 #1)"
      contains: "findUsersToAlert"
    - path: supabase/migrations/20260514120002_schedule_cleanup_push_cron.sql
      provides: "Weekly Sunday 05:00 UTC sweep via pg_cron + net.http_post"
      contains: "cleanup-push-subscriptions-weekly"
    - path: supabase/migrations/20260514120004_schedule_send_vencimento_alert_cron.sql
      provides: "Daily 08:00 UTC vencimento scan via pg_cron + net.http_post (ROADMAP SC#4)"
      contains: "send-vencimento-alert-daily"
    - path: src/test/integration/push.adversarial.test.ts
      provides: "RLS adversarial proof for push_subscriptions table"
      contains: "push_subscriptions"
    - path: .planning/phases/03-mobile-distribution-launch/03-04b-LOVABLE-CLOUD-DEPLOY-RUNBOOK.md
      provides: "Founder runbook for Lovable Cloud deploy of 4 new edge fns + 2 modified fns + 2 cron migrations + 4 secrets"
      contains: "Aplicar a migration 20260514120002"
  key_links:
    - from: "compute-personalized-promos insert loop (Plan 02-06)"
      to: "supabase/functions/enqueue-push"
      via: "fetch POST best-effort with PUSH_ENQUEUE_AUTH_TOKEN Bearer"
      pattern: "enqueue-push"
    - from: "asaas-webhook handleRefund/handleSubscriptionCanceled/handlePaymentOverdue"
      to: "supabase/functions/cleanup-push-subscriptions"
      via: "fetch POST best-effort with PUSH_CLEANUP_AUTH_TOKEN Bearer"
      pattern: "cleanup-push-subscriptions"
    - from: "pg_cron job send-vencimento-alert-daily (08:00 UTC)"
      to: "supabase/functions/send-vencimento-alert"
      via: "net.http_post + Vault decrypted_secrets push_vencimento_auth_token"
      pattern: "send-vencimento-alert"
    - from: "AuthProvider SIGNED_OUT event listener (Plan 03-05 wiring)"
      to: "supabase/functions/cleanup-push-subscriptions (mode='signed_out')"
      via: "supabase.functions.invoke('cleanup-push-subscriptions', { body: { user_id, mode: 'signed_out' } })"
      pattern: "signed_out"
---

<objective>
Ship the 4 new push edge functions (enqueue-push, send-push-notification, cleanup-push-subscriptions, send-vencimento-alert), the fan-out wiring from existing edge fns (asaas-webhook downgrade + payment events; compute-personalized-promos D-T06 #2), 2 cron migrations (weekly cleanup sweep + daily vencimento scan), and the RLS adversarial test for push_subscriptions. Plan 03-04a already shipped the shared utilities and table schema; this plan layers the application logic on top.

Purpose:
- **MOBILE-04** requires push wired for both iOS APNs + Android FCM. The 4 event types from D-T06 (expiry_60d, expiry_13d, payment_event, onboarding, promo_alert) all flow through enqueue-push, with Pro+ events server-side gated by has_plan('pro').
- **ROADMAP SC#4** demands a daily cron that scans `balances` where `expires_at - alert_antecipation_days <= now()` and fires push to matching Pro users. This was UNPLANNED in the original single-plan 03-04 (plan-checker iter 1 BLOCKER #2). Closed here via the new `send-vencimento-alert` edge fn + cron migration.
- **D-T08 + Q2 RESOLVED** (RESEARCH.md): cleanup-push-subscriptions now supports `mode='signed_out'` for SIGNED_OUT cleanup (Plan 03-05 wires this in AuthProvider).
- **Q4 RESOLVED** (RESEARCH.md): multi-device delivery — fan-out to ALL tokens per user_id; payload includes thread-id (iOS) + tag (Android) keyed by `(event_type, balance_id)` so duplicate deliveries across devices collapse into one visual notification per user.

Output: 4 new edge functions + tests, 2 fan-out additions to existing fns, 2 cron migrations, 1 adversarial integration test, 1 Lovable Cloud deploy runbook.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/03-mobile-distribution-launch/03-CONTEXT.md
@.planning/phases/03-mobile-distribution-launch/03-RESEARCH.md
@.planning/phases/03-mobile-distribution-launch/03-PATTERNS.md
@.planning/phases/03-mobile-distribution-launch/03-VALIDATION.md
@.planning/phases/03-mobile-distribution-launch/03-00-ACCOUNT-PROVISIONING-RUNBOOK.md
@.planning/phases/03-mobile-distribution-launch/03-04a-push-schema-shared-utils-PLAN.md
@supabase/functions/asaas-webhook/index.ts
@supabase/functions/compute-personalized-promos/index.ts
@supabase/functions/create-managed-account/index.ts
@supabase/functions/lgpd-delete-cleanup/index.ts
@supabase/migrations/20260515120002_user_settings_alert_antecipation.sql

<interfaces>
<!-- Cross-plan contracts -->

**Consumed from Plan 03-04a (shipped just before this plan):**
- `_shared/timingSafeEq.ts` — imported by all 4 new edge fns for Vault-secret Bearer auth
- `_shared/fcmSignJWT.ts` — imported by send-push-notification for FCM HTTP v1 token mint
- `push_subscriptions` table with own-row RLS — enqueue-push selects from it; cleanup deletes; client INSERTs (Plan 03-05)

**Consumed from Plan 03-00 (account provisioning):**
- Firebase `project_id` — embedded in the FCM v1 URL inside send-push-notification
- FCM service-account JSON (CONTENTS, not path) — pasted into Vault as `push_fcm_service_account` during deploy task

**Consumed from Plan 02-06 (shipped):**
- `compute-personalized-promos` insert loop at lines 163-182 — extended here with post-insert fan-out to enqueue-push (D-T06 #2)
- `user_settings.alert_antecipation_days` column (TIER-02 — Pro+ user preference for vencimento alert window) — JOINed by send-vencimento-alert
- `user_promo_alerts` table — INSERT by compute-personalized-promos; fan-out triggered here

**Consumed from Plan 02-05 (shipped):**
- `asaas-webhook` state machine — handleRefund/handleSubscriptionCanceled/handlePaymentOverdue extended with cleanup-push fan-out; handlePaymentConfirmed/handlePaymentReceived extended with enqueue-push fan-out
- Vault-secret + Bearer pattern from `reconcile-asaas-subscriptions` is the template for our 4 new secrets

**Consumed from Phase 1 (shipped):**
- `public.has_plan(uid, plan)` trust kernel function — used by enqueue-push for Pro+ gating AND by send-vencimento-alert's `findUsersToAlert` pure-fn join

**Produced for Plan 03-05 (client push integration):**
- enqueue-push URL endpoint — client may call directly for `onboarding_milestone` events (or future client-triggered pushes)
- cleanup-push-subscriptions mode='signed_out' — invoked from AuthProvider on Supabase SIGNED_OUT event (Q2 RESOLVED in RESEARCH.md; Plan 03-05 wires the call site)
- Adversarial test fixture pattern from `vip.adversarial.test.ts` is the template for `push.adversarial.test.ts` (this plan's Task 11)

**balances table (existing):**
- Schema reference: `balances(id UUID PK, user_id UUID FK, program_id UUID FK, points BIGINT, expires_at TIMESTAMPTZ NULL, ...)`. The `expires_at` column is the trigger for vencimento alerts.

</interfaces>

<scratchpad>
**Why this plan is in Wave 2 (after 03-04a, before 03-05):**
- depends_on 04a — needs the migrated _shared utilities + push_subscriptions table
- 03-05 depends_on 04b — client integration needs the edge fn endpoints + AuthProvider SIGNED_OUT wire target

**Why send-vencimento-alert is here (not in 03-04a or its own plan):**
- It's a NEW edge fn that uses enqueue-push as fan-out (downstream dependency)
- D-T06 #1 explicitly says "cron diário escaneia balances onde `expires_at - alert_antecipation_days <= now()`" — same execution shape as compute-personalized-promos
- Splitting into its own plan would create a 5-plan Phase 3 push pipeline, which is overkill — keeping it in 03-04b alongside the related edge fns preserves cohesion
- ROADMAP SC#4 demands this; closing the gap inside an existing plan is cheaper than splitting

**Why multi-device fan-out with thread-id/tag (Q4 RESOLVED):**
- User has both iPhone + iPad logged in → 2 push_subscriptions rows
- Pre-fix: a single vencimento alert hits both devices independently, each shows as a separate notification — confusing
- Post-fix: enqueue-push fan-outs to BOTH tokens; each FCM payload sets thread-id='expiry_13d:<balance_id>' on iOS (groups under one thread visually) + tag identically on Android (collapses if user opens one)
- This is a UX correctness fix, not just engineering hygiene

**Why mode='signed_out' is distinct from mode='single':**
- Same SQL effect (DELETE WHERE user_id = $param)
- Different telemetry meaning: 'single' is downgrade (Asaas event); 'signed_out' is user-initiated logout
- Tracking these distinctly helps debug "I never get notifications" complaints — could be either downgrade or stale logout cleanup
- Code path is shared except for the response shape (`mode` field echo)

**Why findUsersToAlert is extracted as a pure function:**
- The HTTP handler is a thin wrapper that does (1) auth, (2) fetch data, (3) call pure fn, (4) iterate enqueue-push calls
- The pure fn is unit-testable without any DB stub — feed it 3 arrays of fixtures, assert the output array shape
- Plan 03-VALIDATION §"Per-Task Verification Map" row for MOBILE-04 vencimento cron specifically asks for unit-level coverage; the pure fn is the unit

**Plan size:** 11 tasks. Same density as the original 03-04 BEFORE the vencimento cron was added; sustainable because 03-04a peeled off 5 tasks (shared utils + migration + 5-fn migration + deploy). Net delta: -5 (to 04a) + 2 (send-vencimento + cron migration) = -3. So 03-04b is at 8 tasks ≈ original concerns, just no infrastructure noise.

Re-count: 1=enqueue-push, 2=send-push-notification, 3=cleanup-push-subscriptions (with signed_out mode), 4=send-vencimento-alert (with pure fn + tests), 5=cron migration for cleanup sweep, 6=cron migration for vencimento daily, 7=asaas-webhook fan-out, 8=compute-personalized-promos fan-out, 9=push.adversarial.test.ts, 10=[BLOCKING] Lovable Cloud deploy runbook. = 10 tasks. OK above the 5-task threshold but cohesive — each task is one fn or one migration or one fan-out, all part of the push pipeline.
</scratchpad>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create enqueue-push edge function + Deno tests (multi-device fan-out per Q4)</name>
  <files>supabase/functions/enqueue-push/index.ts, supabase/functions/enqueue-push/index.test.ts</files>
  <read_first>
    - supabase/functions/create-managed-account/index.ts (JWT auth + has_plan RPC analog)
    - supabase/functions/compute-personalized-promos/index.ts (Bearer auth + service-role + fanout analog; lines 104-194)
    - supabase/functions/_shared/cors.ts (CORS helpers)
    - supabase/functions/_shared/validate.ts (zod helpers)
    - supabase/functions/_shared/timingSafeEq.ts (Plan 03-04a Task 1)
    - .planning/phases/03-mobile-distribution-launch/03-PATTERNS.md §"enqueue-push/index.ts"
    - .planning/phases/03-mobile-distribution-launch/03-RESEARCH.md §"Open Questions (RESOLVED)" Q4 (multi-device fan-out + thread-id/tag keying)
  </read_first>
  <behavior>
    POST /functions/v1/enqueue-push with body:
      {
        event_type: 'expiry_60d' | 'expiry_13d' | 'payment_event' | 'onboarding' | 'promo_alert',
        user_id: string (UUID),
        payload: { title, body, deep_link_path, balance_id?, ... } (free-form per event)
      }

    Auth: ACCEPT either
      - Authorization: Bearer <JWT> (client invocation; caller user_id must match body.user_id)
      - Authorization: Bearer <PUSH_ENQUEUE_AUTH_TOKEN> (cron/edge-fn invocation; Vault secret)

    Behavior:
      1. Validate body shape via zod; reject malformed → 400
      2. Auth: JWT or Vault-secret; reject otherwise → 401
      3. If JWT path: verify caller.id === body.user_id
      4. Pro+ gate: if event_type ∈ {expiry_60d, expiry_13d, promo_alert}, check has_plan(body.user_id, 'pro')
         - false → 403 { error: 'plan_required' }
         - true → continue
      5. payment_event + onboarding: skip Pro+ gate
      6. SELECT device_token, platform FROM push_subscriptions WHERE user_id = body.user_id AND device_token IS NOT NULL
      7. **MULTI-DEVICE FAN-OUT (Q4 RESOLVED):** For each row, fire-and-await fetch to send-push-notification with:
         { device_token, platform, payload, event_type, group_key: `${event_type}:${payload.balance_id ?? 'global'}` }
         The group_key is passed through to send-push-notification which uses it as thread-id (iOS) + tag (Android).
      8. Return { sent: <count>, failed: <count>, gated: false, devices: <total tokens> }
  </behavior>
  <action>
**1.1 — Create `supabase/functions/enqueue-push/index.ts`:**

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { z } from 'https://esm.sh/zod@3.22.4';

import { createCorsResponse, createCorsErrorResponse, corsHeaders } from '../_shared/cors.ts';
import { timingSafeEq } from '../_shared/timingSafeEq.ts';

const PRO_PLUS_EVENTS = ['expiry_60d', 'expiry_13d', 'promo_alert'] as const;
const ALL_TIER_EVENTS = ['payment_event', 'onboarding'] as const;
type EventType = typeof PRO_PLUS_EVENTS[number] | typeof ALL_TIER_EVENTS[number];

const requestBodySchema = z.object({
  event_type: z.enum([...PRO_PLUS_EVENTS, ...ALL_TIER_EVENTS] as [EventType, ...EventType[]]),
  user_id: z.string().uuid(),
  payload: z.object({
    title: z.string(),
    body: z.string(),
    deep_link_path: z.string().startsWith('/'),
    balance_id: z.string().uuid().optional(),
  }).passthrough(),
});

type RequestBody = z.infer<typeof requestBodySchema>;

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return createCorsErrorResponse('Method not allowed', req, 405);

  // 1. Parse body
  let body: RequestBody;
  try {
    const raw = await req.json();
    body = requestBodySchema.parse(raw);
  } catch (err) {
    return createCorsErrorResponse(`Invalid body: ${String(err)}`, req, 400);
  }

  // 2. Auth — Vault secret OR JWT
  const PUSH_ENQUEUE_AUTH_TOKEN = Deno.env.get('PUSH_ENQUEUE_AUTH_TOKEN') ?? '';
  const authHeader = req.headers.get('Authorization') ?? '';
  const providedToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return createCorsErrorResponse('Server misconfigured', req, 500);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let viaVaultSecret = false;
  let callerUserId: string | null = null;

  if (PUSH_ENQUEUE_AUTH_TOKEN && timingSafeEq(providedToken, PUSH_ENQUEUE_AUTH_TOKEN)) {
    viaVaultSecret = true;
  } else {
    if (!providedToken) {
      return createCorsErrorResponse('Authentication required', req, 401);
    }
    const { data: userData, error: userErr } = await supabase.auth.getUser(providedToken);
    if (userErr || !userData?.user) {
      return createCorsErrorResponse('Invalid or expired token', req, 401);
    }
    callerUserId = userData.user.id;
    if (callerUserId !== body.user_id) {
      return createCorsErrorResponse('Cannot enqueue push for another user', req, 403);
    }
  }

  // 3. Pro+ gate
  const isProEvent = (PRO_PLUS_EVENTS as readonly string[]).includes(body.event_type);
  if (isProEvent) {
    const { data: hasPro, error: planErr } = await (supabase as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: boolean | null; error: { message: string } | null }>;
    }).rpc('has_plan', { _user_id: body.user_id, _required_plan: 'pro' });
    if (planErr) {
      return createCorsErrorResponse(`has_plan check failed: ${planErr.message}`, req, 500);
    }
    if (!hasPro) {
      return createCorsErrorResponse('plan_required', req, 403);
    }
  }

  // 4. Fetch ALL device tokens for this user (multi-device per Q4 RESOLVED)
  const { data: tokens, error: selErr } = await supabase
    .from('push_subscriptions')
    .select('device_token, platform')
    .eq('user_id', body.user_id)
    .not('device_token', 'is', null);

  if (selErr) {
    return createCorsErrorResponse(`Failed to fetch tokens: ${selErr.message}`, req, 500);
  }
  if (!tokens || tokens.length === 0) {
    return createCorsResponse({ sent: 0, failed: 0, gated: false, devices: 0, noop: true }, req);
  }

  // 5. Fan-out — multi-device delivery with group_key for thread-id/tag (Q4 RESOLVED)
  const PUSH_SEND_AUTH_TOKEN = Deno.env.get('PUSH_SEND_AUTH_TOKEN') ?? '';
  if (!PUSH_SEND_AUTH_TOKEN) {
    return createCorsErrorResponse('PUSH_SEND_AUTH_TOKEN not set', req, 500);
  }
  const sendUrl = `${SUPABASE_URL}/functions/v1/send-push-notification`;

  // group_key keys the iOS thread-id + Android tag for visual grouping.
  // Pattern: <event_type>:<balance_id or 'global'>
  const groupKey = `${body.event_type}:${body.payload.balance_id ?? 'global'}`;

  let sent = 0;
  let failed = 0;
  for (const row of tokens) {
    try {
      const resp = await fetch(sendUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PUSH_SEND_AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_token: row.device_token,
          platform: row.platform,
          payload: body.payload,
          event_type: body.event_type,
          group_key: groupKey,
        }),
      });
      if (resp.ok) sent++;
      else failed++;
    } catch (_err) {
      failed++;
    }
  }

  return createCorsResponse({ sent, failed, gated: false, devices: tokens.length, viaVaultSecret, group_key: groupKey }, req);
}

Deno.serve(handler);
```

**1.2 — Create `supabase/functions/enqueue-push/index.test.ts`:**

6 Deno test cases:
1. Rejects missing auth → 401 (and malformed body → 400 first if body precedes auth)
2. Rejects invalid body (malformed event_type) → 400
3. Vault secret auth path bypasses JWT (asserts status NOT 401)
4. Rejects wrong Vault secret + no JWT → 401
5. Body schema validates deep_link_path starts with `/`
6. **Multi-device fan-out** (Q4 RESOLVED): mock 3 push_subscriptions rows for user; assert 3 send-push-notification calls happen; assert each carries the same `group_key: 'expiry_13d:<balance_id>'`

(Full test fixtures + mocks follow the pattern from the original single-plan 03-04 Task 5 test file.)

**1.3 — Convention enforcement:**
- TypeScript strict; zod for body validation
- Discriminated event_type union
- Auth: vault-secret OR JWT; never both at once
- Pro+ gate uses has_plan RPC (Phase 1 trust kernel)
- Multi-device fan-out per Q4 RESOLVED — DO NOT short-circuit to first token only
- group_key passed through to send-push-notification (Task 2 consumes it for thread-id/tag)
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const s=fs.readFileSync('supabase/functions/enqueue-push/index.ts','utf8'); const t=fs.readFileSync('supabase/functions/enqueue-push/index.test.ts','utf8'); const req=[['PRO_PLUS_EVENTS','event-type taxonomy'],['has_plan','trust kernel call'],['plan_required','403 error string'],['PUSH_ENQUEUE_AUTH_TOKEN','vault secret env'],['PUSH_SEND_AUTH_TOKEN','downstream secret'],['push_subscriptions','table read'],[\"from '../_shared/timingSafeEq.ts'\",'shared import'],['zod','validation lib'],['group_key','Q4 multi-device fan-out keying'],['balance_id','balance_id passthrough for thread-id']]; let fail=false; for (const [n,w] of req){if(!s.includes(n)){console.error('FAIL: enqueue-push missing —',w);fail=true;}} if(!t.includes('multi-device') && !t.includes('Multi-device') && !t.includes('group_key')){console.error('FAIL: test does not assert Q4 multi-device fan-out');fail=true;} if(fail)process.exit(1); console.log('OK: enqueue-push + tests (multi-device fan-out)');"</automated>
  </verify>
  <done>
    enqueue-push/index.ts implements dual-auth + Pro+ gate via has_plan + MULTI-DEVICE fan-out to send-push-notification with group_key per Q4 RESOLVED. 6 Deno tests including multi-device scenario.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Create send-push-notification edge function + Deno tests (thread-id + tag with balance_id)</name>
  <files>supabase/functions/send-push-notification/index.ts, supabase/functions/send-push-notification/index.test.ts</files>
  <read_first>
    - supabase/functions/_shared/fcmSignJWT.ts (Plan 03-04a Task 3)
    - supabase/functions/_shared/timingSafeEq.ts (Plan 03-04a Task 1)
    - supabase/functions/compute-personalized-promos/index.ts (Bearer auth pattern)
    - .planning/phases/03-mobile-distribution-launch/03-RESEARCH.md §"Pattern 3" + §"Open Questions (RESOLVED)" Q4
  </read_first>
  <behavior>
    POST /functions/v1/send-push-notification with body:
      { device_token, platform, payload, event_type, group_key }
    Auth: Bearer PUSH_SEND_AUTH_TOKEN (Vault secret).

    Flow:
      1. Verify auth → 401
      2. Read PUSH_FCM_SERVICE_ACCOUNT_JSON from env; parse → service account
      3. Call getFCMAccessToken(sa) — mint or fetch cached
      4. POST to https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send with payload:
         - message.token = body.device_token
         - message.notification = { title, body }
         - message.data = { deep_link_path, event_type, balance_id? }
         - **apns.payload.aps.thread-id = body.group_key** (Q4 — iOS visual grouping)
         - **android.notification.tag = body.group_key** (Q4 — Android collapse)
         - apns.payload.aps.sound = 'default'
         - android.priority = 'HIGH'
      5. On 200 → return { ok: true }
      6. On 404 / 400 INVALID_ARGUMENT → DELETE token + return { ok: false, removed_stale: true }
      7. On 5xx → return { ok: false, retry: true }
  </behavior>
  <action>
**2.1 — Create `supabase/functions/send-push-notification/index.ts`:**

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

import { createCorsResponse, createCorsErrorResponse, corsHeaders } from '../_shared/cors.ts';
import { timingSafeEq } from '../_shared/timingSafeEq.ts';
import { getFCMAccessToken, type FCMServiceAccount } from '../_shared/fcmSignJWT.ts';

interface RequestBody {
  device_token: string;
  platform: 'ios' | 'android';
  payload: { title: string; body: string; deep_link_path: string; balance_id?: string; [k: string]: unknown };
  event_type: string;
  group_key: string; // Q4 RESOLVED: thread-id (iOS) + tag (Android) value
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return createCorsErrorResponse('Method not allowed', req, 405);

  // 1. Auth
  const PUSH_SEND_AUTH_TOKEN = Deno.env.get('PUSH_SEND_AUTH_TOKEN') ?? '';
  if (!PUSH_SEND_AUTH_TOKEN) {
    return createCorsErrorResponse('PUSH_SEND_AUTH_TOKEN not set', req, 500);
  }
  const authHeader = req.headers.get('Authorization') ?? '';
  const provided = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!timingSafeEq(provided, PUSH_SEND_AUTH_TOKEN)) {
    return createCorsErrorResponse('Unauthorized', req, 401);
  }

  // 2. Parse body
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return createCorsErrorResponse('Invalid JSON body', req, 400);
  }
  if (!body.device_token || !body.platform || !body.payload || !body.group_key) {
    return createCorsErrorResponse('Missing required fields (device_token, platform, payload, group_key)', req, 400);
  }

  // 3. Load service account
  const saJson = Deno.env.get('PUSH_FCM_SERVICE_ACCOUNT_JSON') ?? '';
  if (!saJson) {
    return createCorsErrorResponse('PUSH_FCM_SERVICE_ACCOUNT_JSON not set', req, 500);
  }
  let sa: FCMServiceAccount;
  try {
    sa = JSON.parse(saJson);
  } catch (err) {
    return createCorsErrorResponse(`Invalid service-account JSON: ${String(err)}`, req, 500);
  }

  // 4. Mint access token + build FCM v1 payload
  let accessToken: string;
  try {
    accessToken = await getFCMAccessToken(sa);
  } catch (err) {
    return createCorsErrorResponse(`FCM token mint failed: ${String(err)}`, req, 500);
  }

  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
  const fcmPayload = {
    message: {
      token: body.device_token,
      notification: { title: body.payload.title, body: body.payload.body },
      data: {
        deep_link_path: body.payload.deep_link_path,
        event_type: body.event_type,
        ...(body.payload.balance_id ? { balance_id: body.payload.balance_id } : {}),
      },
      apns: {
        payload: {
          aps: {
            alert: { title: body.payload.title, body: body.payload.body },
            sound: 'default',
            'thread-id': body.group_key, // Q4 RESOLVED — iOS visual grouping
          },
        },
      },
      android: {
        notification: { tag: body.group_key }, // Q4 RESOLVED — Android collapse
        priority: 'HIGH' as const,
      },
    },
  };

  const fcmResp = await fetch(fcmUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(fcmPayload),
  });

  if (fcmResp.ok) {
    return createCorsResponse({ ok: true, group_key: body.group_key }, req);
  }

  // 5. Stale token cleanup (404 / 400 INVALID_ARGUMENT)
  const errText = await fcmResp.text();
  const isStale = fcmResp.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(errText);

  if (isStale) {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await supabase.from('push_subscriptions').delete().eq('device_token', body.device_token);
    }
    return createCorsResponse({ ok: false, removed_stale: true, status: fcmResp.status }, req);
  }

  return createCorsResponse({ ok: false, retry: fcmResp.status >= 500, status: fcmResp.status, error: errText }, req);
}

Deno.serve(handler);
```

**2.2 — Create `supabase/functions/send-push-notification/index.test.ts`:**

4 Deno test cases:
1. Rejects missing auth → 401
2. Rejects wrong token → 401
3. Rejects missing required fields (no group_key) → 400
4. Handler reaches FCM (mock returns 200); asserts apns.payload.aps.thread-id === group_key + android.notification.tag === group_key

**2.3 — Convention enforcement:**
- TypeScript strict
- Vault-secret auth via timingSafeEq
- FCM v1 payload uses `message.token` + platform-specific overrides
- `thread-id` on iOS = `group_key` (Q4 RESOLVED)
- `tag` on Android = `group_key` (Q4 RESOLVED)
- 404 UNREGISTERED → DELETE token
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const s=fs.readFileSync('supabase/functions/send-push-notification/index.ts','utf8'); const req=[['getFCMAccessToken','FCM token mint'],['fcm.googleapis.com','FCM v1 URL'],['messages:send','FCM endpoint path'],['PUSH_FCM_SERVICE_ACCOUNT_JSON','env'],['UNREGISTERED','stale detection'],[\"'thread-id': body.group_key\",'iOS Q4 grouping'],['tag: body.group_key','android Q4 collapse'],['removed_stale','stale return shape'],['timingSafeEq','auth check'],[\"from '../_shared/fcmSignJWT.ts'\",'shared import'],['group_key','Q4 grouping key field']]; let fail=false; for (const [n,w] of req){if(!s.includes(n)){console.error('FAIL: send-push-notification missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: send-push-notification (Q4 thread-id/tag wired)');"</automated>
  </verify>
  <done>
    send-push-notification/index.ts implements FCM v1 POST with thread-id/tag = group_key per Q4 RESOLVED + stale-token cleanup. 4 Deno tests including Q4 wiring assertion.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Create cleanup-push-subscriptions edge function + Deno tests (single + signed_out + sweep modes)</name>
  <files>supabase/functions/cleanup-push-subscriptions/index.ts, supabase/functions/cleanup-push-subscriptions/index.test.ts</files>
  <read_first>
    - supabase/functions/lgpd-delete-cleanup/index.ts (analog Bearer + service-role + bulk-delete)
    - supabase/functions/_shared/timingSafeEq.ts (Plan 03-04a Task 1)
    - .planning/phases/03-mobile-distribution-launch/03-RESEARCH.md §"Open Questions (RESOLVED)" Q2 (SIGNED_OUT cleanup)
  </read_first>
  <behavior>
    POST /functions/v1/cleanup-push-subscriptions with body:
      { user_id?: string, mode?: 'single' | 'signed_out' | 'sweep' }
    Auth: Bearer PUSH_CLEANUP_AUTH_TOKEN (Vault secret).

    Modes:
      - 'single' (default if user_id present): asaas-webhook downgrade trigger.
        DELETE FROM push_subscriptions WHERE user_id = $param. Returns {deleted, user_id, mode: 'single'}.
      - 'signed_out' (Q2 RESOLVED): AuthProvider SIGNED_OUT event trigger.
        DELETE FROM push_subscriptions WHERE user_id = $param.
        Same SQL as 'single' but returns mode='signed_out' for telemetry distinction.
      - 'sweep': weekly cron periodic cleanup.
        DELETE WHERE last_seen_at < now() - interval '60 days'. Returns {deleted, mode: 'sweep'}.
  </behavior>
  <action>
**3.1 — Create `supabase/functions/cleanup-push-subscriptions/index.ts`:**

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

import { createCorsResponse, createCorsErrorResponse, corsHeaders } from '../_shared/cors.ts';
import { timingSafeEq } from '../_shared/timingSafeEq.ts';

type Mode = 'single' | 'signed_out' | 'sweep';

interface RequestBody {
  user_id?: string;
  mode?: Mode;
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return createCorsErrorResponse('Method not allowed', req, 405);

  // 1. Auth
  const PUSH_CLEANUP_AUTH_TOKEN = Deno.env.get('PUSH_CLEANUP_AUTH_TOKEN') ?? '';
  if (!PUSH_CLEANUP_AUTH_TOKEN) {
    return createCorsErrorResponse('PUSH_CLEANUP_AUTH_TOKEN not set', req, 500);
  }
  const authHeader = req.headers.get('Authorization') ?? '';
  const expected = `Bearer ${PUSH_CLEANUP_AUTH_TOKEN}`;
  if (!timingSafeEq(authHeader, expected)) {
    return createCorsErrorResponse('Unauthorized', req, 401);
  }

  // 2. Parse body
  let body: RequestBody = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return createCorsErrorResponse('Invalid JSON body', req, 400);
  }

  const mode: Mode = body.mode ?? 'single';
  const started = Date.now();

  // 3. Service-role client (bypasses RLS for cleanup)
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return createCorsErrorResponse('Server misconfigured', req, 500);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 4. Branch by mode
  if (mode === 'single' || mode === 'signed_out') {
    // Q2 RESOLVED — 'signed_out' is the AuthProvider SIGNED_OUT cleanup path.
    // Same SQL effect as 'single' (downgrade); mode is echoed back for telemetry distinction.
    if (!body.user_id) {
      return createCorsErrorResponse(`user_id required for ${mode} mode`, req, 400);
    }
    const { error, count } = await supabase
      .from('push_subscriptions')
      .delete({ count: 'exact' })
      .eq('user_id', body.user_id);
    if (error) {
      return createCorsErrorResponse(`Delete failed: ${error.message}`, req, 500);
    }
    return createCorsResponse({
      mode,
      user_id: body.user_id,
      deleted: count ?? 0,
      duration_ms: Date.now() - started,
    }, req);
  }

  // mode === 'sweep'
  const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - SIXTY_DAYS_MS).toISOString();
  const { error, count } = await supabase
    .from('push_subscriptions')
    .delete({ count: 'exact' })
    .lt('last_seen_at', cutoff);
  if (error) {
    return createCorsErrorResponse(`Sweep failed: ${error.message}`, req, 500);
  }
  return createCorsResponse({
    mode: 'sweep',
    cutoff,
    deleted: count ?? 0,
    duration_ms: Date.now() - started,
  }, req);
}

Deno.serve(handler);
```

**3.2 — Create `supabase/functions/cleanup-push-subscriptions/index.test.ts`:**

5 Deno test cases:
1. Rejects missing auth → 401
2. Rejects wrong token → 401
3. Single mode requires user_id → 400
4. Signed_out mode requires user_id → 400 (parameter symmetric with single mode)
5. Sweep mode does not require user_id (auth + body validation pass; downstream SUPABASE call may fail in test env but assertion is NOT 401 and NOT 400)

**3.3 — Convention enforcement:**
- TypeScript strict
- Vault secret auth via `Bearer ` prefix check + timingSafeEq
- Service-role client bypasses RLS for delete
- 3 modes branched explicitly; mode='signed_out' shares SQL with 'single'
- 60-day sweep cutoff
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const s=fs.readFileSync('supabase/functions/cleanup-push-subscriptions/index.ts','utf8'); const req=[['PUSH_CLEANUP_AUTH_TOKEN','vault secret env'],['push_subscriptions','table name'],[\"mode === 'single' || mode === 'signed_out'\",'unified single+signed_out branch (Q2 RESOLVED)'],['signed_out','Q2 SIGNED_OUT mode'],[\"mode === 'sweep'\",'sweep branch'],['60 *','sweep cutoff'],['last_seen_at','sweep predicate'],['timingSafeEq','auth check']]; let fail=false; for (const [n,w] of req){if(!s.includes(n)){console.error('FAIL: cleanup-push-subscriptions missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: cleanup-push-subscriptions (3 modes incl Q2 signed_out)');"</automated>
  </verify>
  <done>
    cleanup-push-subscriptions/index.ts implements single + signed_out + sweep modes (Q2 RESOLVED for signed_out). 5 Deno tests cover all 3 modes.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: Create send-vencimento-alert edge function + Deno tests (ROADMAP SC#4 + D-T06 #1 — daily cron, CLOSED)</name>
  <files>supabase/functions/send-vencimento-alert/index.ts, supabase/functions/send-vencimento-alert/index.test.ts</files>
  <read_first>
    - supabase/functions/compute-personalized-promos/index.ts (analog cron edge fn — auth, DB fetch, fan-out pattern; lines 1-50 + 163-194)
    - supabase/functions/_shared/timingSafeEq.ts (Plan 03-04a Task 1)
    - supabase/migrations/20260515120002_user_settings_alert_antecipation.sql (alert_antecipation_days column from Plan 02-06; defaults to 60 days when NULL)
    - .planning/phases/03-mobile-distribution-launch/03-CONTEXT.md D-T06 #1 (vencimento de milhas cron — Pro+ only)
    - .planning/ROADMAP.md §"Phase 3 SC#4" (success criterion: send-vencimento-alert cron delivery)
  </read_first>
  <behavior>
    POST /functions/v1/send-vencimento-alert (cron-only invocation; Bearer PUSH_VENCIMENTO_AUTH_TOKEN).

    Flow:
      1. Verify auth → 401
      2. Fetch joined data (service-role; bypasses RLS for system query):
         - balances WHERE expires_at IS NOT NULL AND expires_at > now()
         - user_settings (for alert_antecipation_days; default 60 if NULL)
         - user_subscriptions (filter has_plan('pro') — Pro+ only)
      3. Call pure `findUsersToAlert(balances, settings, subscriptions, now)` → Array<{user_id, event_type, balance_id, program_name, points_expiring, expires_at}>
      4. For each matched user, POST to enqueue-push with:
         - event_type = 'expiry_60d' (when 60-day threshold matched first) or 'expiry_13d' (when 13-day threshold matched first)
         - user_id, payload = {title, body, deep_link_path: '/programa/${program_id}', balance_id, points_expiring, expires_at}
      5. Return { scanned: <balances_count>, queued: <users_alerted>, errors: <fan_out_failures> }

    PURE FN `findUsersToAlert(balances, settings, subscriptions, now)`:
      - For each balance, find its user's alert_antecipation_days (default 60 if no row in settings) and Pro+ status
      - If NOT Pro+ → exclude
      - If expires_at <= now → exclude (already expired)
      - If (expires_at - alert_antecipation_days days) <= now AND (expires_at - 13 days) <= now → event_type='expiry_13d' (closer threshold wins)
      - Else if (expires_at - alert_antecipation_days days) <= now → event_type='expiry_60d' (or whatever 'antecipation' window matched)
      - Else → not yet in alerting window
      - Return Array<{user_id, event_type, balance_id, program_name, points_expiring, expires_at}>
  </behavior>
  <action>
**4.1 — Create `supabase/functions/send-vencimento-alert/index.ts`:**

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

import { createCorsResponse, createCorsErrorResponse, corsHeaders } from '../_shared/cors.ts';
import { timingSafeEq } from '../_shared/timingSafeEq.ts';

interface Balance {
  id: string;
  user_id: string;
  program_id: string;
  program_name?: string;
  points: number;
  expires_at: string; // ISO timestamp
}

interface UserSettings {
  user_id: string;
  alert_antecipation_days: number | null;
}

interface UserSubscription {
  user_id: string;
  plan: 'free' | 'pro' | 'vip';
}

export interface AlertCandidate {
  user_id: string;
  event_type: 'expiry_60d' | 'expiry_13d';
  balance_id: string;
  program_id: string;
  program_name: string;
  points_expiring: number;
  expires_at: string;
}

/**
 * Pure function — no DB, no fetch. Determines which users to alert based on
 * (a) Pro+ status, (b) alert_antecipation_days threshold, (c) 13-day urgent window.
 *
 * Algorithm:
 *   - 13-day window takes precedence (closer-to-expiry = higher urgency)
 *   - Then the user's alert_antecipation_days window (default 60)
 *   - Already-expired balances excluded (we cannot un-expire them)
 *   - Free users excluded (Pro+ only per D-T06 #1)
 *
 * @param now milliseconds since epoch — injected for testability
 */
export function findUsersToAlert(
  balances: Balance[],
  settings: UserSettings[],
  subscriptions: UserSubscription[],
  now: number,
): AlertCandidate[] {
  const settingsByUser = new Map(settings.map((s) => [s.user_id, s.alert_antecipation_days ?? 60]));
  const proSet = new Set(subscriptions.filter((s) => s.plan === 'pro' || s.plan === 'vip').map((s) => s.user_id));

  const DAY_MS = 24 * 60 * 60 * 1000;
  const result: AlertCandidate[] = [];

  for (const b of balances) {
    if (!proSet.has(b.user_id)) continue;

    const expiresMs = Date.parse(b.expires_at);
    if (Number.isNaN(expiresMs)) continue;
    if (expiresMs <= now) continue;

    const antecipationDays = settingsByUser.get(b.user_id) ?? 60;
    const antecipationThreshold = expiresMs - antecipationDays * DAY_MS;
    const urgentThreshold = expiresMs - 13 * DAY_MS;

    let event_type: 'expiry_60d' | 'expiry_13d' | null = null;
    if (urgentThreshold <= now) {
      event_type = 'expiry_13d';
    } else if (antecipationThreshold <= now) {
      event_type = 'expiry_60d';
    }
    if (!event_type) continue;

    result.push({
      user_id: b.user_id,
      event_type,
      balance_id: b.id,
      program_id: b.program_id,
      program_name: b.program_name ?? '',
      points_expiring: b.points,
      expires_at: b.expires_at,
    });
  }
  return result;
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return createCorsErrorResponse('Method not allowed', req, 405);

  // 1. Auth (cron-only invocation)
  const PUSH_VENCIMENTO_AUTH_TOKEN = Deno.env.get('PUSH_VENCIMENTO_AUTH_TOKEN') ?? '';
  if (!PUSH_VENCIMENTO_AUTH_TOKEN) {
    return createCorsErrorResponse('PUSH_VENCIMENTO_AUTH_TOKEN not set', req, 500);
  }
  const authHeader = req.headers.get('Authorization') ?? '';
  const provided = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!timingSafeEq(provided, PUSH_VENCIMENTO_AUTH_TOKEN)) {
    return createCorsErrorResponse('Unauthorized', req, 401);
  }

  // 2. Service-role client (system query bypasses RLS)
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return createCorsErrorResponse('Server misconfigured', req, 500);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 3. Fetch joined data — limit scope to future-expiring balances only
  const nowIso = new Date().toISOString();
  const [balancesResp, settingsResp, subsResp] = await Promise.all([
    supabase
      .from('balances')
      .select('id, user_id, program_id, points, expires_at, programs(name)')
      .not('expires_at', 'is', null)
      .gt('expires_at', nowIso),
    supabase
      .from('user_settings')
      .select('user_id, alert_antecipation_days'),
    supabase
      .from('user_subscriptions')
      .select('user_id, plan'),
  ]);

  if (balancesResp.error || settingsResp.error || subsResp.error) {
    const err = balancesResp.error?.message ?? settingsResp.error?.message ?? subsResp.error?.message;
    return createCorsErrorResponse(`Data fetch failed: ${err}`, req, 500);
  }

  const balances: Balance[] = (balancesResp.data ?? []).map((b: { id: string; user_id: string; program_id: string; points: number; expires_at: string; programs?: { name: string } | null }) => ({
    id: b.id,
    user_id: b.user_id,
    program_id: b.program_id,
    program_name: b.programs?.name,
    points: b.points,
    expires_at: b.expires_at,
  }));

  // 4. Pure fn
  const candidates = findUsersToAlert(balances, settingsResp.data ?? [], subsResp.data ?? [], Date.now());

  // 5. Fan-out
  const PUSH_ENQUEUE_AUTH_TOKEN = Deno.env.get('PUSH_ENQUEUE_AUTH_TOKEN') ?? '';
  if (!PUSH_ENQUEUE_AUTH_TOKEN) {
    return createCorsErrorResponse('PUSH_ENQUEUE_AUTH_TOKEN not set', req, 500);
  }
  const enqueueUrl = `${SUPABASE_URL}/functions/v1/enqueue-push`;

  let queued = 0;
  let errors = 0;
  for (const c of candidates) {
    const isUrgent = c.event_type === 'expiry_13d';
    const titleHead = isUrgent ? 'Suas milhas vencem em 13 dias' : 'Suas milhas estão perto de vencer';
    try {
      const resp = await fetch(enqueueUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PUSH_ENQUEUE_AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type: c.event_type,
          user_id: c.user_id,
          payload: {
            title: titleHead,
            body: `${c.program_name || 'Suas milhas'}: ${c.points_expiring.toLocaleString('pt-BR')} pontos vencem em ${c.expires_at.slice(0, 10)}.`,
            deep_link_path: `/programa/${c.program_id}`,
            balance_id: c.balance_id,
            points_expiring: c.points_expiring,
            expires_at: c.expires_at,
          },
        }),
      });
      if (resp.ok) queued++;
      else errors++;
    } catch (_err) {
      errors++;
    }
  }

  return createCorsResponse({
    scanned: balances.length,
    candidates: candidates.length,
    queued,
    errors,
  }, req);
}

Deno.serve(handler);
```

**4.2 — Create `supabase/functions/send-vencimento-alert/index.test.ts`:**

5 Deno test cases (4 cover the pure fn, 1 covers the HTTP handler auth):

```typescript
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { findUsersToAlert, type AlertCandidate } from './index.ts';

const PRO_USER = 'aaaaaaaa-0000-0000-0000-000000000001';
const FREE_USER = 'bbbbbbbb-0000-0000-0000-000000000002';
const BALANCE_PRO = 'bal-pro-0000';
const BALANCE_FREE = 'bal-free-0000';
const PROGRAM = 'prog-0000';

const NOW = new Date('2026-05-14T00:00:00Z').getTime();
const DAY = 24 * 60 * 60 * 1000;

Deno.test('findUsersToAlert — Free user is filtered out (Pro+ only per D-T06 #1)', () => {
  const result = findUsersToAlert(
    [{ id: BALANCE_FREE, user_id: FREE_USER, program_id: PROGRAM, points: 50000, expires_at: new Date(NOW + 30 * DAY).toISOString() }],
    [{ user_id: FREE_USER, alert_antecipation_days: 60 }],
    [{ user_id: FREE_USER, plan: 'free' }],
    NOW,
  );
  assertEquals(result.length, 0);
});

Deno.test('findUsersToAlert — Pro user with NULL alert_antecipation_days defaults to 60', () => {
  const result = findUsersToAlert(
    [{ id: BALANCE_PRO, user_id: PRO_USER, program_id: PROGRAM, program_name: 'Smiles', points: 50000, expires_at: new Date(NOW + 50 * DAY).toISOString() }],
    [],
    [{ user_id: PRO_USER, plan: 'pro' }],
    NOW,
  );
  assertEquals(result.length, 1);
  assertEquals(result[0].event_type, 'expiry_60d');
});

Deno.test('findUsersToAlert — balance expiring in 60 days → event_type=expiry_60d', () => {
  const result = findUsersToAlert(
    [{ id: BALANCE_PRO, user_id: PRO_USER, program_id: PROGRAM, program_name: 'Smiles', points: 50000, expires_at: new Date(NOW + 50 * DAY).toISOString() }],
    [{ user_id: PRO_USER, alert_antecipation_days: 60 }],
    [{ user_id: PRO_USER, plan: 'pro' }],
    NOW,
  );
  assertEquals(result.length, 1);
  assertEquals(result[0].event_type, 'expiry_60d');
  assertEquals(result[0].balance_id, BALANCE_PRO);
});

Deno.test('findUsersToAlert — balance expiring in 10 days → event_type=expiry_13d (urgent overrides antecipation)', () => {
  const result = findUsersToAlert(
    [{ id: BALANCE_PRO, user_id: PRO_USER, program_id: PROGRAM, program_name: 'Smiles', points: 50000, expires_at: new Date(NOW + 10 * DAY).toISOString() }],
    [{ user_id: PRO_USER, alert_antecipation_days: 60 }],
    [{ user_id: PRO_USER, plan: 'pro' }],
    NOW,
  );
  assertEquals(result.length, 1);
  assertEquals(result[0].event_type, 'expiry_13d');
});

Deno.test('findUsersToAlert — already-expired balance is excluded', () => {
  const result = findUsersToAlert(
    [{ id: BALANCE_PRO, user_id: PRO_USER, program_id: PROGRAM, program_name: 'Smiles', points: 50000, expires_at: new Date(NOW - 5 * DAY).toISOString() }],
    [{ user_id: PRO_USER, alert_antecipation_days: 60 }],
    [{ user_id: PRO_USER, plan: 'pro' }],
    NOW,
  );
  assertEquals(result.length, 0);
});

Deno.test('send-vencimento-alert handler — rejects missing auth → 401', async () => {
  Deno.env.set('PUSH_VENCIMENTO_AUTH_TOKEN', 'token-test-aaaaaaaaaaaaaaaaaaaa');
  Deno.env.set('SUPABASE_URL', 'http://localhost:54321');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-srk');
  Deno.env.set('PUSH_ENQUEUE_AUTH_TOKEN', 'enq-test-aaaaaaaaaaaaaaaa');

  const { handler } = await import('./index.ts');
  const resp = await handler(new Request('http://localhost/functions/v1/send-vencimento-alert', {
    method: 'POST',
    body: '{}',
  }));
  assertEquals(resp.status, 401);
});
```

**4.3 — Convention enforcement:**
- TypeScript strict; pure fn separated from HTTP handler for testability
- Service-role client bypasses RLS for system join
- pt-BR notification copy ("Suas milhas vencem em 13 dias")
- deep_link_path = `/programa/${program_id}` (must be in AASA from 03-03 — that plan registered `/promocoes*` + `/auth/callback*` + `/lgpd/confirm-delete*` but NOT `/programa/*`. ⚠️ **Note for 03-03 follow-up:** AASA components may need extending to cover `/programa/*` if the deep-link is to land back in the iOS app; if AASA does NOT cover `/programa/*`, the link still works on Android via Browser fallback AND on iOS as a web URL — confirm during 03-VALIDATION manual test)
- 13-day urgent window OVERRIDES the antecipation window (closer = higher urgency)
- Free users excluded at the pure-fn level
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const s=fs.readFileSync('supabase/functions/send-vencimento-alert/index.ts','utf8'); const t=fs.readFileSync('supabase/functions/send-vencimento-alert/index.test.ts','utf8'); const req_s=[['findUsersToAlert','pure fn export'],['expiry_13d','urgent event type'],['expiry_60d','antecipation event type'],['alert_antecipation_days','user_settings col'],['has_plan','Pro+ filter via subscriptions join'],['/programa/','deep link path pattern'],['PUSH_VENCIMENTO_AUTH_TOKEN','cron auth secret'],['timingSafeEq','auth check'],['program_id','program_id field']]; const req_t=[['Free user is filtered out','test 1'],['NULL alert_antecipation_days','test 2'],['expiring in 60 days','test 3'],['expiring in 10 days','test 4 urgent'],['already-expired','test 5'],['401','handler auth test']]; let fail=false; for (const [n,w] of req_s){if(!s.includes(n)){console.error('FAIL: send-vencimento-alert missing —',w);fail=true;}} for (const [n,w] of req_t){if(!t.includes(n)){console.error('FAIL: test missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: send-vencimento-alert + tests (ROADMAP SC#4 CLOSED)');"</automated>
  </verify>
  <done>
    send-vencimento-alert/index.ts implements daily cron pure-fn `findUsersToAlert` + HTTP handler that fetches data + fans out to enqueue-push. 6 Deno tests (5 pure-fn + 1 handler auth). ROADMAP SC#4 + D-T06 #1 CLOSED.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 5: Cron migration — weekly cleanup-push-subscriptions sweep (20260514120002)</name>
  <files>supabase/migrations/20260514120002_schedule_cleanup_push_cron.sql</files>
  <read_first>
    - supabase/migrations/20260515120004_schedule_compute_personalized_promos_cron.sql (analog pg_cron + net.http_post + Vault decrypted secret)
    - .planning/phases/03-mobile-distribution-launch/03-PATTERNS.md §"schedule_cleanup_push_cron.sql"
  </read_first>
  <action>
**5.1 — Create `supabase/migrations/20260514120002_schedule_cleanup_push_cron.sql`:**

```sql
-- Phase 3 W2 — MOBILE-04 push cleanup weekly sweep
-- Defense-in-depth: the asaas-webhook downgrade path is the primary cleanup
-- trigger (per-user, immediate). This weekly sweep catches:
--   (a) users whose downgrade webhook was missed
--   (b) tokens not seen in 60+ days (stale uninstalls)
-- Runs Sunday 05:00 UTC — low-load window, no conflict with other crons.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'push_cleanup_auth_token') THEN
    RAISE WARNING 'push_cleanup_auth_token missing in vault.secrets — run: '
      'SELECT vault.create_secret(''<hex-token>'', ''push_cleanup_auth_token'') '
      'before the cron job will succeed';
  END IF;
END $$;

SELECT cron.schedule(
  'cleanup-push-subscriptions-weekly',
  '0 5 * * 0',  -- Sunday 05:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://opusftqbbaozucmbuuug.supabase.co/functions/v1/cleanup-push-subscriptions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'push_cleanup_auth_token')
    ),
    body := jsonb_build_object('mode', 'sweep')
  );
  $$
);

COMMIT;
```

**5.2 — Convention enforcement:**
- `cron.schedule(jobname, cron_expr, sql)` — same pattern as Plan 02-06's compute-personalized-promos cron
- `SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ...` — Vault read pattern
- jsonb_build_object for body
- Sunday 05:00 UTC — chosen to avoid conflict with 02:00 promos cron and 03:00 reconcile cron
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const m=fs.readFileSync('supabase/migrations/20260514120002_schedule_cleanup_push_cron.sql','utf8'); const req=[[\"cron.schedule('cleanup-push-subscriptions-weekly'\",'jobname'],[\"'0 5 * * 0'\",'sunday 05:00 cron'],['cleanup-push-subscriptions','target fn'],['push_cleanup_auth_token','vault secret name'],['mode','sweep'],['vault.decrypted_secrets','vault read']]; let fail=false; for (const [n,w] of req){if(!m.includes(n)){console.error('FAIL: cron migration missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: cleanup-push weekly cron');"</automated>
  </verify>
  <done>
    20260514120002 schedules cleanup-push-subscriptions weekly sweep at Sunday 05:00 UTC with Vault-decrypted auth token + body {mode: 'sweep'}.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 6: Cron migration — daily send-vencimento-alert (20260514120004 — ROADMAP SC#4)</name>
  <files>supabase/migrations/20260514120004_schedule_send_vencimento_alert_cron.sql</files>
  <read_first>
    - supabase/migrations/20260515120004_schedule_compute_personalized_promos_cron.sql (analog)
    - supabase/migrations/20260514120002_schedule_cleanup_push_cron.sql (Task 5 — pattern to mirror)
  </read_first>
  <action>
**6.1 — Create `supabase/migrations/20260514120004_schedule_send_vencimento_alert_cron.sql`:**

```sql
-- Phase 3 W2 — MOBILE-04 + ROADMAP SC#4 send-vencimento-alert daily cron
-- Closes the gap surfaced by plan-checker iter 1 (2026-05-14): the original
-- single-plan 03-04 lacked this cron despite ROADMAP SC#4 + D-T06 #1 requiring it.
--
-- Daily 08:00 UTC scan of balances for Pro+ users approaching expiry.
-- See supabase/functions/send-vencimento-alert/index.ts for the scan logic.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'push_vencimento_auth_token') THEN
    RAISE WARNING 'push_vencimento_auth_token missing in vault.secrets — run: '
      'SELECT vault.create_secret(''<hex-token>'', ''push_vencimento_auth_token'') '
      'before the cron job will succeed';
  END IF;
END $$;

SELECT cron.schedule(
  'send-vencimento-alert-daily',
  '0 8 * * *',  -- Daily 08:00 UTC (matches Phase 2 pattern, e.g., compute-personalized-promos @ 02:00 UTC, reconcile @ 03:00 UTC)
  $$
  SELECT net.http_post(
    url := 'https://opusftqbbaozucmbuuug.supabase.co/functions/v1/send-vencimento-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'push_vencimento_auth_token')
    ),
    body := jsonb_build_object()
  );
  $$
);

COMMIT;
```

**6.2 — Convention enforcement:**
- Job name `send-vencimento-alert-daily` (lowercase-kebab matches Plan 02-06)
- 08:00 UTC = 05:00 BRT — early-morning notification window for BR users
- Vault secret `push_vencimento_auth_token` (separate from push_cleanup_auth_token so they can be rotated independently)
- Empty body (`jsonb_build_object()`) — the cron doesn't need params; the edge fn fetches all data internally
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const m=fs.readFileSync('supabase/migrations/20260514120004_schedule_send_vencimento_alert_cron.sql','utf8'); const req=[[\"cron.schedule('send-vencimento-alert-daily'\",'jobname'],[\"'0 8 * * *'\",'daily 08:00 cron'],['send-vencimento-alert','target fn'],['push_vencimento_auth_token','vault secret name'],['vault.decrypted_secrets','vault read'],['ROADMAP SC#4','rationale comment']]; let fail=false; for (const [n,w] of req){if(!m.includes(n)){console.error('FAIL: vencimento cron migration missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: send-vencimento-alert daily cron (ROADMAP SC#4 CLOSED)');"</automated>
  </verify>
  <done>
    20260514120004 schedules send-vencimento-alert daily at 08:00 UTC. ROADMAP SC#4 cron gap closed.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 7: Extend asaas-webhook with push fan-outs (downgrade cleanup + payment_event push)</name>
  <files>supabase/functions/asaas-webhook/index.ts</files>
  <read_first>
    - supabase/functions/asaas-webhook/index.ts (state-machine switch at lines 296-339; already has `from '../_shared/timingSafeEq.ts'` import from Plan 03-04a Task 2)
    - .planning/phases/03-mobile-distribution-launch/03-PATTERNS.md §"asaas-webhook/index.ts MODIFICATIONS"
  </read_first>
  <action>
**7.1 — Add helpers at top of file (after existing imports):**

```typescript
async function fireCleanupPush(userId: string): Promise<void> {
  const token = Deno.env.get('PUSH_CLEANUP_AUTH_TOKEN') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  if (!token || !supabaseUrl) return;
  try {
    await fetch(`${supabaseUrl}/functions/v1/cleanup-push-subscriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, mode: 'single' }),
    });
  } catch (err) {
    console.error('[asaas-webhook][cleanup-push fan-out failed]', err);
  }
}

async function fireEnqueuePush(userId: string, eventType: 'payment_event', payload: { title: string; body: string; deep_link_path: string }): Promise<void> {
  const token = Deno.env.get('PUSH_ENQUEUE_AUTH_TOKEN') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  if (!token || !supabaseUrl) return;
  try {
    await fetch(`${supabaseUrl}/functions/v1/enqueue-push`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: eventType, user_id: userId, payload }),
    });
  } catch (err) {
    console.error('[asaas-webhook][enqueue-push fan-out failed]', err);
  }
}
```

**7.2 — In `handleRefund`, `handleSubscriptionCanceled`, `handlePaymentOverdue` handlers, AFTER the user_subscriptions UPDATE:**

```typescript
if (subscription?.user_id) {
  await fireCleanupPush(subscription.user_id);
}
```

**7.3 — In `handlePaymentSuccess` (PAYMENT_CONFIRMED + PAYMENT_RECEIVED) and `handlePaymentOverdue`, AFTER state mutation:**

```typescript
if (subscription?.user_id) {
  await fireEnqueuePush(subscription.user_id, 'payment_event', {
    title: <event-appropriate pt-BR title>,
    body: <event-appropriate pt-BR body>,
    deep_link_path: '/dashboard',  // Path C — NEVER /assinatura on iOS
  });
}
```

Titles + bodies (pt-BR):
- PAYMENT_CONFIRMED → title: "Pagamento confirmado", body: "Recebemos seu pagamento. Sua assinatura está ativa."
- PAYMENT_RECEIVED → title: "Pagamento recebido", body: "Tudo certo! Seu pagamento foi confirmado e a assinatura está ativa."
- PAYMENT_OVERDUE → title: "Pagamento em atraso", body: "Sua assinatura está com pagamento em atraso. Toque para regularizar."

**7.4 — Convention enforcement:**
- All fan-outs are best-effort (try/catch + console.error; do NOT throw)
- pt-BR notification copy
- deep_link_path = '/dashboard' for payment_event (Path C — no link to checkout from notification)
- Preserve all existing webhook contract behavior (CRIT-04 idempotency NOT touched)
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const s=fs.readFileSync('supabase/functions/asaas-webhook/index.ts','utf8'); const req=[['fireCleanupPush','helper added'],['fireEnqueuePush','helper added'],['PUSH_CLEANUP_AUTH_TOKEN','cleanup token used'],['PUSH_ENQUEUE_AUTH_TOKEN','enqueue token used'],[\"event_type: eventType\",'fan-out body'],[\"deep_link_path: '/dashboard'\",'Path C-safe deep link'],['Pagamento confirmado','pt-BR copy']]; let fail=false; for (const [n,w] of req){if(!s.includes(n)){console.error('FAIL: asaas-webhook extension missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: asaas-webhook extended with push fan-outs');"</automated>
  </verify>
  <done>
    asaas-webhook has fireCleanupPush + fireEnqueuePush helpers; downgrade paths fan-out cleanup; payment success + overdue paths fan-out enqueue with payment_event + pt-BR titles + deep_link_path='/dashboard'.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 8: Extend compute-personalized-promos with promo_alert push fan-out (D-T06 #2)</name>
  <files>supabase/functions/compute-personalized-promos/index.ts</files>
  <read_first>
    - supabase/functions/compute-personalized-promos/index.ts (insert loop at lines 163-182; already has `from '../_shared/timingSafeEq.ts'` import from Plan 03-04a Task 2)
    - .planning/phases/03-mobile-distribution-launch/03-PATTERNS.md §"compute-personalized-promos MODIFICATIONS"
    - .planning/phases/03-mobile-distribution-launch/03-CONTEXT.md D-T06 #2
  </read_first>
  <action>
**8.1 — Add helper at the top of the file (after existing imports):**

```typescript
async function fireEnqueuePushForPromo(userId: string, promo: {
  from_program: string;
  to_program: string;
  bonus_pct: number;
  balance_id?: string;
}): Promise<void> {
  const token = Deno.env.get('PUSH_ENQUEUE_AUTH_TOKEN') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  if (!token || !supabaseUrl) return;
  try {
    await fetch(`${supabaseUrl}/functions/v1/enqueue-push`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'promo_alert',
        user_id: userId,
        payload: {
          title: `Bônus de ${promo.bonus_pct}% em transferências`,
          body: `${promo.from_program} → ${promo.to_program}: aproveite antes que acabe.`,
          deep_link_path: '/promocoes',
          from_program: promo.from_program,
          to_program: promo.to_program,
          bonus_pct: promo.bonus_pct,
          ...(promo.balance_id ? { balance_id: promo.balance_id } : {}),
        },
      }),
    });
  } catch (err) {
    console.error('[compute-promos][enqueue-push fan-out failed]', err);
  }
}
```

**8.2 — Inside the existing insert loop (around line 163-182), AFTER `inserted++`:**

```typescript
await fireEnqueuePushForPromo(match.user_id, {
  from_program: match.from_program,
  to_program: match.to_program,
  bonus_pct: match.bonus_pct,
  // balance_id: optional — if compute-personalized-promos has the balance_id in scope, pass it for thread-id grouping
});
```

**8.3 — Convention enforcement:**
- Best-effort: failure does not roll back the insert
- pt-BR notification copy
- deep_link_path = '/promocoes' (matches AASA from Plan 03-03)
- Pro+ gating delegated to enqueue-push (no premature filtering)
- console.error for fan-out failure logging
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const s=fs.readFileSync('supabase/functions/compute-personalized-promos/index.ts','utf8'); const req=[['fireEnqueuePushForPromo','helper added'],[\"event_type: 'promo_alert'\",'promo event type'],[\"deep_link_path: '/promocoes'\",'deep link route'],['Bônus de','pt-BR copy'],['PUSH_ENQUEUE_AUTH_TOKEN','env var'],['await fireEnqueuePushForPromo','call site after insert']]; let fail=false; for (const [n,w] of req){if(!s.includes(n)){console.error('FAIL: compute-personalized-promos extension missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: compute-personalized-promos extended');"</automated>
  </verify>
  <done>
    compute-personalized-promos has fireEnqueuePushForPromo helper; insert loop fan-outs promo_alert push with pt-BR copy + deep_link_path='/promocoes' after each successful insert.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 9: Create push.adversarial.test.ts (Vitest integration — RLS proof for push_subscriptions)</name>
  <files>src/test/integration/push.adversarial.test.ts</files>
  <read_first>
    - src/test/integration/vip.adversarial.test.ts (Plan 02-06 — canonical adversarial-RLS template)
    - src/test/integration/fixtures.ts (FREE_USER, PRO_USER, VIP_USER fixtures)
    - .planning/phases/03-mobile-distribution-launch/03-PATTERNS.md §"push.adversarial.test.ts"
  </read_first>
  <action>
**9.1 — Create `src/test/integration/push.adversarial.test.ts`:**

Mirror the structure of `vip.adversarial.test.ts` exactly. Coverage:
1. Free user INSERT own push_subscriptions row → succeeds (no has_plan gate at table level per D-T08)
2. Free user INSERT cross-user row → SQLSTATE 42501
3. Free user SELECT another user's tokens → returns empty array (RLS denies, NOT 42501)
4. Pro user UPDATE own last_seen_at → succeeds
5. Pro user UPDATE another user's row → SQLSTATE 42501
6. Same user INSERT duplicate device_token → SQLSTATE 23505 unique violation (partial UNIQUE index)

(Use `clientAs(FREE_USER)`, `clientAs(PRO_USER)` helpers from existing fixtures.)

**9.2 — Convention enforcement:**
- Vitest `describe` + `it` blocks
- `clientAs(<FIXTURE>)` helper for authed Supabase client
- Assertion shape `expect(error?.code).toBe('42501')` (matches vip.adversarial.test.ts)
- pt-BR not needed (test infra)
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const t=fs.readFileSync('src/test/integration/push.adversarial.test.ts','utf8'); const req=[['push_subscriptions','table tested'],['42501','RLS denial code'],['23505','unique violation code'],['FREE_USER','free fixture'],['PRO_USER','pro fixture'],['cross-user','cross-user scenario tested']]; let fail=false; for (const [n,w] of req){if(!t.includes(n)){console.error('FAIL: push.adversarial.test.ts missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: push.adversarial.test.ts');"</automated>
  </verify>
  <done>
    src/test/integration/push.adversarial.test.ts exists with 6 RLS scenarios covering own-row + cross-user + duplicate-token cases.
  </done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 10: [BLOCKING] Lovable Cloud deploy — 4 new edge fns + 2 modified fns + 2 cron migrations + 4 secrets</name>
  <files>.planning/phases/03-mobile-distribution-launch/03-04b-LOVABLE-CLOUD-DEPLOY-RUNBOOK.md</files>
  <read_first>
    - .planning/phases/03-mobile-distribution-launch/03-04a-LOVABLE-CLOUD-DEPLOY-RUNBOOK.md (Plan 03-04a deploy runbook — pattern)
    - All 4 new edge fns (Tasks 1, 2, 3, 4)
    - Both cron migrations (Tasks 5, 6)
  </read_first>
  <what-built>
    Operator-driven Lovable Cloud chat actions. Claude cannot deploy directly.
  </what-built>
  <how-to-verify>
    1. Create `.planning/phases/03-mobile-distribution-launch/03-04b-LOVABLE-CLOUD-DEPLOY-RUNBOOK.md`:

       **Step 1 — Apply 2 cron migrations:**
       - `Aplicar a migration 20260514120002_schedule_cleanup_push_cron.sql em produção`
       - `Aplicar a migration 20260514120004_schedule_send_vencimento_alert_cron.sql em produção`

       **Step 2 — Set 4 edge fn secrets in Lovable Cloud (Edge Function Secrets panel):**
       - `PUSH_ENQUEUE_AUTH_TOKEN` (64-char hex; generate with `openssl rand -hex 32`)
       - `PUSH_SEND_AUTH_TOKEN` (64-char hex)
       - `PUSH_CLEANUP_AUTH_TOKEN` (64-char hex)
       - `PUSH_VENCIMENTO_AUTH_TOKEN` (64-char hex)
       - `PUSH_FCM_SERVICE_ACCOUNT_JSON` (full contents of the service-account JSON from Plan 03-00)

       **Step 3 — Create 2 Vault secrets (for cron job decryption):**
       In Lovable Cloud chat:
       - `SELECT vault.create_secret('<same hex as PUSH_CLEANUP_AUTH_TOKEN>', 'push_cleanup_auth_token')`
       - `SELECT vault.create_secret('<same hex as PUSH_VENCIMENTO_AUTH_TOKEN>', 'push_vencimento_auth_token')`

       The cron jobs read these via `vault.decrypted_secrets`. The hex values MUST match the edge fn secrets (Step 2).

       **Step 4 — Deploy 4 new edge fns:**
       - `Deployar nova edge function enqueue-push`
       - `Deployar nova edge function send-push-notification`
       - `Deployar nova edge function cleanup-push-subscriptions`
       - `Deployar nova edge function send-vencimento-alert`

       **Step 5 — Redeploy 2 modified existing fns (they now have push fan-out helpers):**
       - `Redeployar a edge function asaas-webhook`
       - `Redeployar a edge function compute-personalized-promos`

       **Step 6 — Verify cron jobs scheduled:**
       In Lovable Cloud chat:
       ```sql
       SELECT jobname, schedule, command FROM cron.job
        WHERE jobname IN ('cleanup-push-subscriptions-weekly', 'send-vencimento-alert-daily');
       ```
       Expected: 2 rows.

       **Step 7 — Smoke test each new fn (Vault-secret Bearer auth):**
       - `curl -X POST <enqueue-push-url> -H "Authorization: Bearer <PUSH_ENQUEUE_AUTH_TOKEN>" -d '{"event_type":"onboarding","user_id":"<your-uuid>","payload":{"title":"t","body":"b","deep_link_path":"/dashboard"}}'` → expect 200 with `{sent: 0, devices: 0, noop: true}` (no tokens registered yet)
       - `curl -X POST <cleanup-push-subscriptions-url> -H "Authorization: Bearer <PUSH_CLEANUP_AUTH_TOKEN>" -d '{"user_id":"<your-uuid>","mode":"single"}'` → expect 200 with `{deleted: 0, mode: "single"}`
       - `curl -X POST <send-vencimento-alert-url> -H "Authorization: Bearer <PUSH_VENCIMENTO_AUTH_TOKEN>" -d '{}'` → expect 200 with `{scanned: <n>, candidates: 0, queued: 0}` (no Pro users with expiring balances in sandbox)

       **Step 8 — Capture in runbook:**
       Timestamped log of all 8 steps + curl output snippets.
  </how-to-verify>
  <resume-signal>
    Reply: "03-04b deploy complete: 2 migrations aplicadas, 4 secrets set + 2 vault entries, 4 new edge fns deployadas, 2 redeploys OK, 2 cron jobs verificados, 3 curl smokes 200 OK."
  </resume-signal>
  <acceptance_criteria>
    - `.planning/phases/03-mobile-distribution-launch/03-04b-LOVABLE-CLOUD-DEPLOY-RUNBOOK.md` exists
    - Contains literal `Aplicar a migration 20260514120001` (referenced from 03-04a)
    - Contains literal `Aplicar a migration 20260514120002` (cleanup cron)
    - Contains literal `Aplicar a migration 20260514120004` (vencimento cron)
    - Has 4 edge fn deploy entries + 2 redeploy entries
    - 3 curl smoke results captured (200 OK from each new fn)
    - 2 cron jobs verified via `SELECT cron.job WHERE jobname LIKE '...'`
  </acceptance_criteria>
  <done>
    All push edge fns deployed, both cron jobs scheduled, all 4 fns smoke-tested 200 OK. Plan 03-05 (client integration) can now proceed.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Client app ↔ enqueue-push (JWT path) | Caller user_id MUST match body.user_id (prevents enqueue-for-other) |
| Cron / edge-fn ↔ enqueue-push (Vault secret path) | Vault secret bypasses user_id match (system caller) |
| enqueue-push ↔ send-push-notification | Vault-secret-only; no JWT path on send-push-notification |
| Asaas webhook downgrade ↔ cleanup-push-subscriptions | Best-effort fan-out; never blocks idempotency of webhook |
| AuthProvider SIGNED_OUT ↔ cleanup-push-subscriptions (mode='signed_out') | Authed client call via supabase.functions.invoke; user can only cleanup own row via mode='signed_out' |
| pg_cron ↔ vault.decrypted_secrets | Cron reads decrypted secrets at execution time; access scoped via pg_cron's own role |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-3-12 | Spoofing | Client JWT impersonation of another user via enqueue-push | mitigate | Task 1 — JWT path verifies `callerUserId === body.user_id`; mismatch returns 403 |
| T-3-13 | Information Disclosure | FCM service-account JSON leak in edge fn logs | mitigate | _shared/fcmSignJWT.ts (03-04a) signs internally; only short-lived access_token surfaces; Task 10 deploy runbook reminds operator to NEVER commit the JSON to repo |
| T-3-14 | Tampering | Cron uses wrong Vault secret due to misnaming | mitigate | Tasks 5 + 6 cron migrations explicitly name the Vault secret (`push_cleanup_auth_token`, `push_vencimento_auth_token`); Task 10 runbook step 3 enforces value parity with edge fn secrets |
| T-3-15 | Denial of Service | enqueue-push fanning to thousands of stale tokens per user | accept (low risk at 10-user scale) | At 10 pagantes, even with 5 devices each that's 50 tokens max; FCM rate limit is 600k tokens/sec for free tier. Re-evaluate if user count grows past ~10k |
| T-3-16 | Spoofing | send-vencimento-alert called by external attacker with guessed Vault secret | mitigate | Vault secret is 64-char hex (256 bits entropy); timingSafeEq prevents timing-attack guess; Task 6 cron uses Vault-decrypted secret (not env var leak risk) |
| T-3-17 | Information Disclosure | Vencimento alert payload reveals user balance details to attacker who has stolen device token | accept | Payload contains program_name + points_expiring + expires_at. A stolen device token is already a security failure (device compromise); the additional disclosure is bounded by what the user could see in-app anyway |
</threat_model>

<verification>
After all 10 tasks complete:

```bash
# 1. 4 new edge fns exist
test -f supabase/functions/enqueue-push/index.ts
test -f supabase/functions/send-push-notification/index.ts
test -f supabase/functions/cleanup-push-subscriptions/index.ts
test -f supabase/functions/send-vencimento-alert/index.ts

# 2. 4 test files exist
test -f supabase/functions/enqueue-push/index.test.ts
test -f supabase/functions/send-push-notification/index.test.ts
test -f supabase/functions/cleanup-push-subscriptions/index.test.ts
test -f supabase/functions/send-vencimento-alert/index.test.ts

# 3. 2 cron migrations exist
test -f supabase/migrations/20260514120002_schedule_cleanup_push_cron.sql
test -f supabase/migrations/20260514120004_schedule_send_vencimento_alert_cron.sql

# 4. 2 existing edge fns extended
grep -q 'fireCleanupPush' supabase/functions/asaas-webhook/index.ts
grep -q 'fireEnqueuePushForPromo' supabase/functions/compute-personalized-promos/index.ts

# 5. push.adversarial.test.ts exists
test -f src/test/integration/push.adversarial.test.ts

# 6. Q2/Q4 wiring verified
grep -q 'signed_out' supabase/functions/cleanup-push-subscriptions/index.ts
grep -q 'group_key' supabase/functions/send-push-notification/index.ts
grep -q "thread-id" supabase/functions/send-push-notification/index.ts

# 7. ROADMAP SC#4 vencimento cron exists
grep -F 'send-vencimento-alert-daily' supabase/migrations/20260514120004_schedule_send_vencimento_alert_cron.sql

# 8. Deno tests pass
deno test supabase/functions/enqueue-push/
deno test supabase/functions/send-push-notification/
deno test supabase/functions/cleanup-push-subscriptions/
deno test supabase/functions/send-vencimento-alert/

# 9. Integration adversarial test
npm run test:integration -- src/test/integration/push.adversarial.test.ts

# 10. Lovable Cloud runbook
grep -F 'Aplicar a migration 20260514120004' .planning/phases/03-mobile-distribution-launch/03-04b-LOVABLE-CLOUD-DEPLOY-RUNBOOK.md
```
</verification>

<success_criteria>
- 4 new edge functions (enqueue-push, send-push-notification, cleanup-push-subscriptions, send-vencimento-alert) deployed
- enqueue-push fans out to ALL user tokens (multi-device per Q4 RESOLVED); group_key passed through
- send-push-notification sets apns thread-id + android tag = group_key (Q4 RESOLVED)
- cleanup-push-subscriptions supports 3 modes including 'signed_out' for AuthProvider SIGNED_OUT (Q2 RESOLVED)
- send-vencimento-alert exports pure findUsersToAlert + HTTP handler; daily 08:00 UTC cron via 20260514120004 (ROADMAP SC#4 + D-T06 #1 CLOSED)
- asaas-webhook fans out cleanup-push on downgrade + enqueue-push on payment events (Path C deep_link_path='/dashboard')
- compute-personalized-promos fans out enqueue-push on user_promo_alerts insert (deep_link_path='/promocoes')
- 2 cron migrations (cleanup-sweep weekly + vencimento daily) scheduled with Vault-decrypted secrets
- push.adversarial.test.ts (6 RLS scenarios) green
- Lovable Cloud deploy runbook captures all 8 steps with timestamps + curl smoke output
- Plan 03-05 can proceed (depends_on includes "04b")
</success_criteria>

<output>
After completion, create `.planning/phases/03-mobile-distribution-launch/03-04b-SUMMARY.md` documenting:
- Lovable Cloud deploy timestamps (2 cron migrations + 4 secrets + 4 new edge fns + 2 redeploys)
- Deno test counts (6 enqueue + 4 send + 5 cleanup + 6 vencimento = 21 new tests)
- Adversarial test results (6 RLS scenarios)
- cron.job verification SQL output
- 3 curl smoke results from Task 10
- Q2 RESOLVED (signed_out mode) + Q4 RESOLVED (multi-device fan-out + thread-id/tag) explicitly noted
- ROADMAP SC#4 explicit closure note: "send-vencimento-alert daily cron LIVE at 08:00 UTC"
- Reminder for Plan 03-05: AuthProvider SIGNED_OUT event must invoke cleanup-push-subscriptions with mode='signed_out' per Q2 RESOLVED
</output>
