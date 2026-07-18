/**
 * send-vencimento-alert — Phase 3 W2 (Plan 03-04b) — MOBILE-04 / ROADMAP SC#4 / D-T06 #1.
 *
 * Daily cron edge function (08:00 UTC ≈ 05:00 BRT — see migration
 * supabase/migrations/20260515120006_schedule_send_vencimento_alert_cron.sql).
 * Scans balances for Pro+ users whose miles are inside the alert window
 * (user_settings.alert_antecipation_days, default 60) and queues a push
 * notification via enqueue-push.
 *
 * Event taxonomy (D-T06):
 *   expiry_13d — urgent window (always 13 days, regardless of preference)
 *   expiry_60d — antecipation window (user_settings.alert_antecipation_days)
 *
 * Pure function `findUsersToAlert(...)` is exported separately so it can be
 * unit-tested without a Supabase stack. The HTTP handler is a thin wrapper.
 *
 * Auth: Bearer PUSH_VENCIMENTO_AUTH_TOKEN (Vault-stored shared secret).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

import { createCorsResponse, createCorsErrorResponse, getCorsHeaders } from '../_shared/cors.ts';
import { timingSafeEq } from '../_shared/timingSafeEq.ts';

export interface Balance {
  id: string;
  user_id: string;
  program_id: string;
  program_name?: string;
  points: number;
  expires_at: string; // ISO timestamp
}

export interface UserSettings {
  user_id: string;
  alert_antecipation_days: number | null;
}

export interface UserSubscription {
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
 * Pure function — no DB, no fetch. Determines which users to alert based on:
 *   (a) Pro+ status (Pro or VIP),
 *   (b) user_settings.alert_antecipation_days threshold (default 60),
 *   (c) 13-day urgent window (always honored, even for users with shorter
 *       antecipation preferences — closer-to-expiry wins).
 *
 * Excluded:
 *   - Free users (D-T06 #1 — Pro+ only)
 *   - Balances already expired (cannot un-expire)
 *   - Balances outside both alerting windows
 *
 * @param now milliseconds since epoch — injected for testability
 */
export function findUsersToAlert(
  balances: Balance[],
  settings: UserSettings[],
  subscriptions: UserSubscription[],
  now: number,
): AlertCandidate[] {
  const settingsByUser = new Map<string, number>(
    settings.map((s) => [s.user_id, s.alert_antecipation_days ?? 60]),
  );
  const proSet = new Set(
    subscriptions
      .filter((s) => s.plan === 'pro' || s.plan === 'vip')
      .map((s) => s.user_id),
  );

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

interface BalanceRow {
  id: string;
  user_id: string;
  program: string;
  balance: number;
  expiry_date: string;
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(req) });
  }
  if (req.method !== 'POST') {
    return createCorsErrorResponse('Method not allowed', req, 405);
  }

  // 1. Auth — Bearer PUSH_VENCIMENTO_AUTH_TOKEN (constant-time).
  const PUSH_VENCIMENTO_AUTH_TOKEN = Deno.env.get('PUSH_VENCIMENTO_AUTH_TOKEN') ?? '';
  if (!PUSH_VENCIMENTO_AUTH_TOKEN) {
    return createCorsErrorResponse('PUSH_VENCIMENTO_AUTH_TOKEN not set', req, 500);
  }
  const authHeader = req.headers.get('Authorization') ?? '';
  const provided = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!timingSafeEq(provided, PUSH_VENCIMENTO_AUTH_TOKEN)) {
    return createCorsErrorResponse('Unauthorized', req, 401);
  }

  // 2. Service-role client (system query bypasses RLS).
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return createCorsErrorResponse('Server misconfigured', req, 500);
  }
  // Disable auth-refresh interval on the service-role client (Deno strict
  // test-resource tracker flags supabase-js's default setInterval as an
  // unfinished interval leak). Service-role tokens don't refresh and have
  // no end-user session to persist.
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 3. Fetch joined data — limit scope to future-expiring balances only.
  // Schema: program_balances has columns (id, user_id, program TEXT, balance NUMERIC,
  // expiry_date TIMESTAMPTZ). The `program` column is the program name itself (e.g.
  // "Smiles", "Latam Pass") — there is no programs FK to join against.
  const nowIso = new Date().toISOString();
  const [balancesResp, settingsResp, subsResp] = await Promise.all([
    supabase
      .from('program_balances')
      .select('id, user_id, program, balance, expiry_date')
      .not('expiry_date', 'is', null)
      .gt('expiry_date', nowIso),
    supabase
      .from('user_settings')
      .select('user_id, alert_antecipation_days'),
    supabase
      .from('user_subscriptions')
      .select('user_id, plan'),
  ]);

  if (balancesResp.error || settingsResp.error || subsResp.error) {
    const err =
      balancesResp.error?.message ??
      settingsResp.error?.message ??
      subsResp.error?.message ??
      'unknown';
    return createCorsErrorResponse(`Data fetch failed: ${err}`, req, 500);
  }

  const balances: Balance[] = ((balancesResp.data ?? []) as BalanceRow[]).map((b) => ({
    id: b.id,
    user_id: b.user_id,
    // program column is the program name string — use as both program_id (for deep link
    // path segment) and program_name (for notification body). Internal Balance
    // interface keeps logical names so the pure findUsersToAlert(...) and its 7 Deno
    // tests do not need to be touched.
    program_id: b.program,
    program_name: b.program,
    points: b.balance,
    expires_at: b.expiry_date,
  }));

  // 4. Pure fn — find users to alert.
  const candidates = findUsersToAlert(
    balances,
    (settingsResp.data ?? []) as UserSettings[],
    (subsResp.data ?? []) as UserSubscription[],
    Date.now(),
  );

  // 5. Fan-out — POST enqueue-push per candidate.
  const PUSH_ENQUEUE_AUTH_TOKEN = Deno.env.get('PUSH_ENQUEUE_AUTH_TOKEN') ?? '';
  if (!PUSH_ENQUEUE_AUTH_TOKEN) {
    return createCorsErrorResponse('PUSH_ENQUEUE_AUTH_TOKEN not set', req, 500);
  }
  const enqueueUrl = `${SUPABASE_URL}/functions/v1/enqueue-push`;

  // Idempotency log key — "today" in UTC. UTC is fine because the cron itself
  // runs once per UTC day (08:00 UTC), so the date boundary aligns with the
  // schedule. The DATE column is timezone-agnostic on the DB side.
  const sentOn = new Date().toISOString().slice(0, 10);

  let queued = 0;
  let errors = 0;
  let deduped = 0;
  for (const c of candidates) {
    // INSERT-first dedupe (mirrors Plan 02-05 CRIT-04 pattern for webhook_events).
    // 23505 = unique_violation means we already enqueued this push today and
    // can short-circuit — no duplicate spam to the user.
    const { error: dedupeErr } = await supabase
      .from('push_alert_dedupe')
      .insert({
        user_id: c.user_id,
        balance_id: c.balance_id,
        event_type: c.event_type,
        sent_on: sentOn,
      });
    if (dedupeErr) {
      if ((dedupeErr as { code?: string }).code === '23505') {
        deduped++;
        continue;
      }
      console.error('[send-vencimento-alert] dedupe insert failed', dedupeErr);
      errors++;
      continue;
    }

    const isUrgent = c.event_type === 'expiry_13d';
    const title = isUrgent
      ? 'Suas milhas vencem em 13 dias'
      : 'Suas milhas estão perto de vencer';
    const body =
      `${c.program_name || 'Suas milhas'}: ${c.points_expiring.toLocaleString('pt-BR')} pontos vencem em ${c.expires_at.slice(0, 10)}.`;

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
            title,
            body,
            // Deep link target: /programa/<program-name>. Route is defined in
            // src/App.tsx as `/programa/:program` and the program name (e.g.
            // "Smiles", "Latam Pass") is the path segment. encodeURIComponent
            // mirrors how Analises.tsx already constructs this URL.
            // Note for 03-03 follow-up: AASA currently registers /promocoes*,
            // /auth/callback*, /lgpd/confirm-delete* — /programa/* may need to
            // be added if we want the link to land back inside the iOS app
            // instead of the web fallback. Android handles this via Browser
            // fallback.
            deep_link_path: `/programa/${encodeURIComponent(c.program_id)}`,
            balance_id: c.balance_id,
            points_expiring: c.points_expiring,
            expires_at: c.expires_at,
          },
        }),
      });
      if (resp.ok) queued++;
      else errors++;
    } catch (err) {
      console.error('[send-vencimento-alert] enqueue-push fan-out failed', err);
      errors++;
    }
  }

  return createCorsResponse(
    {
      scanned: balances.length,
      candidates: candidates.length,
      queued,
      deduped,
      errors,
    },
    req,
  );
}

if (import.meta.main) {
  Deno.serve(handler);
}
