/**
 * enqueue-push — Phase 3 W2 (Plan 03-04b) — MOBILE-04.
 *
 * Pro+-gated push dispatcher. Accepts a small typed body, validates the caller
 * (Vault-secret OR client JWT), enforces a server-side has_plan check for
 * Pro+ event types, then fans out to send-push-notification once per device
 * token registered for the user (Q4 RESOLVED — multi-device delivery with
 * thread-id/tag keyed by (event_type, balance_id)).
 *
 * Event types (D-T06):
 *   expiry_60d, expiry_13d, promo_alert  → Pro+ only (gated via has_plan)
 *   payment_event, onboarding            → all tiers
 *
 * Auth:
 *   Authorization: Bearer <JWT>                          → client invocation
 *     - body.user_id MUST match caller.id (anti-impersonation)
 *   Authorization: Bearer <PUSH_ENQUEUE_AUTH_TOKEN>       → cron/edge-fn caller
 *     - Vault-stored shared secret; constant-time compared
 *
 * Fan-out contract (Q4 RESOLVED — RESEARCH.md):
 *   SELECT device_token, platform FROM push_subscriptions
 *    WHERE user_id = $1 AND device_token IS NOT NULL;
 *   For each row → POST send-push-notification with shared group_key
 *     group_key := `${event_type}:${payload.balance_id ?? 'global'}`
 *   send-push-notification uses group_key as iOS apns thread-id and
 *   Android notification tag so duplicate deliveries collapse into one
 *   visual notification per user.
 *
 * Why a single shared group_key per call (not per-device): on iOS the
 * thread-id is a user-facing grouping key — the user should NOT see one
 * notification thread per device, the same alert should appear under one
 * thread on every device they own.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { z } from 'https://esm.sh/zod@3.22.4';

import { createCorsResponse, createCorsErrorResponse, getCorsHeaders } from '../_shared/cors.ts';
import { timingSafeEq } from '../_shared/timingSafeEq.ts';

// PRO_PLUS_EVENTS: event types that require server-side has_plan('pro') check.
const PRO_PLUS_EVENTS = ['expiry_60d', 'expiry_13d', 'promo_alert'] as const;
// ALL_TIER_EVENTS: event types that skip the Pro+ gate (free users may receive).
const ALL_TIER_EVENTS = ['payment_event', 'onboarding'] as const;

type EventType =
  | typeof PRO_PLUS_EVENTS[number]
  | typeof ALL_TIER_EVENTS[number];

const requestBodySchema = z.object({
  event_type: z.enum(
    [...PRO_PLUS_EVENTS, ...ALL_TIER_EVENTS] as [EventType, ...EventType[]],
  ),
  user_id: z.string().uuid(),
  payload: z
    .object({
      title: z.string().min(1),
      body: z.string().min(1),
      deep_link_path: z.string().startsWith('/'),
      balance_id: z.string().uuid().optional(),
    })
    .passthrough(),
});

type RequestBody = z.infer<typeof requestBodySchema>;

/**
 * Main HTTP handler. Exported for Deno tests.
 */
export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(req) });
  }
  if (req.method !== 'POST') {
    return createCorsErrorResponse('Method not allowed', req, 405);
  }

  // 1. Parse + validate body BEFORE auth so malformed payloads always return 400.
  //    Auth comes second so we never hint at secret-validity via 401 vs 400.
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
  const providedToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : '';

  if (!providedToken) {
    return createCorsErrorResponse('Authentication required', req, 401);
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return createCorsErrorResponse('Server misconfigured', req, 500);
  }
  // Disable auth-refresh interval on the service-role client. supabase-js
  // schedules a setInterval for autoRefreshToken by default; Deno's strict
  // test-resource tracker flags that as a leak ("An interval was started in
  // this test, but never completed") and fails the suite even when the
  // handler logic itself is correct. Service-role keys don't expire on
  // their own, so neither auto-refresh nor session persistence are needed.
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let viaVaultSecret = false;
  let callerUserId: string | null = null;

  if (PUSH_ENQUEUE_AUTH_TOKEN && timingSafeEq(providedToken, PUSH_ENQUEUE_AUTH_TOKEN)) {
    viaVaultSecret = true;
  } else {
    // JWT path — verify with Supabase Auth.
    const { data: userData, error: userErr } = await supabase.auth.getUser(providedToken);
    if (userErr || !userData?.user) {
      return createCorsErrorResponse('Invalid or expired token', req, 401);
    }
    callerUserId = userData.user.id;
    if (callerUserId !== body.user_id) {
      return createCorsErrorResponse('Cannot enqueue push for another user', req, 403);
    }
  }

  // 3. Pro+ gate via has_plan trust kernel (Phase 1).
  const isProEvent = (PRO_PLUS_EVENTS as readonly string[]).includes(body.event_type);
  if (isProEvent) {
    const { data: hasPro, error: planErr } = await supabase.rpc('has_plan', {
      _user_id: body.user_id,
      _required_plan: 'pro',
    });
    if (planErr) {
      return createCorsErrorResponse(`has_plan check failed: ${planErr.message}`, req, 500);
    }
    if (!hasPro) {
      return createCorsErrorResponse('plan_required', req, 403);
    }
  }

  // 4. Fetch ALL device tokens for this user (multi-device per Q4 RESOLVED).
  const { data: tokens, error: selErr } = await supabase
    .from('push_subscriptions')
    .select('device_token, platform')
    .eq('user_id', body.user_id)
    .not('device_token', 'is', null);

  if (selErr) {
    return createCorsErrorResponse(`Failed to fetch tokens: ${selErr.message}`, req, 500);
  }
  if (!tokens || tokens.length === 0) {
    return createCorsResponse(
      { sent: 0, failed: 0, gated: false, devices: 0, noop: true, viaVaultSecret },
      req,
    );
  }

  // 5. Fan-out — multi-device delivery with shared group_key (Q4 RESOLVED).
  //    group_key pattern: `<event_type>:<balance_id or 'global'>` — drives
  //    iOS apns thread-id + Android notification tag so duplicate deliveries
  //    collapse into one visual notification per user.
  const PUSH_SEND_AUTH_TOKEN = Deno.env.get('PUSH_SEND_AUTH_TOKEN') ?? '';
  if (!PUSH_SEND_AUTH_TOKEN) {
    return createCorsErrorResponse('PUSH_SEND_AUTH_TOKEN not set', req, 500);
  }
  const sendUrl = `${SUPABASE_URL}/functions/v1/send-push-notification`;
  const groupKey = `${body.event_type}:${body.payload.balance_id ?? 'global'}`;

  // P2 — Parallel fan-out via Promise.allSettled. Previously sequential
  // (`for ... await`), so 3 devices = 3 round-trips serialized — ~600-900ms
  // vs ~200ms when run in parallel. Important for multi-device VIP users
  // and bounds the wall-clock impact on synchronous callers like the asaas
  // webhook handler (which fans out for every PAYMENT_CONFIRMED).
  const results = await Promise.allSettled(
    tokens.map((row) =>
      fetch(sendUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PUSH_SEND_AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_token: row.device_token,
          platform: row.platform,
          payload: body.payload,
          event_type: body.event_type,
          group_key: groupKey,
        }),
      }),
    ),
  );

  let sent = 0;
  let failed = 0;
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.ok) {
      sent++;
    } else {
      failed++;
      if (r.status === 'rejected') {
        console.error('[enqueue-push] fan-out fetch rejected');
      }
    }
  }

  return createCorsResponse(
    {
      sent,
      failed,
      gated: false,
      devices: tokens.length,
      viaVaultSecret,
      group_key: groupKey,
    },
    req,
  );
}

if (import.meta.main) {
  Deno.serve(handler);
}
