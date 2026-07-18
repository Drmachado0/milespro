/**
 * cleanup-push-subscriptions — Phase 3 W2 (Plan 03-04b) — MOBILE-04 / D-T08.
 *
 * Deletes rows from push_subscriptions in 3 distinct modes:
 *
 *   mode='single'      — primary downgrade trigger (asaas-webhook handleRefund /
 *                        handleSubscriptionCanceled / handlePaymentOverdue).
 *                        DELETE WHERE user_id = $param.
 *
 *   mode='signed_out'  — AuthProvider SIGNED_OUT event trigger (Plan 03-05).
 *                        Same SQL effect as 'single'; the mode is echoed in the
 *                        response for telemetry distinction (Q2 RESOLVED in
 *                        03-RESEARCH.md). Helps debug "I stopped getting
 *                        notifications" tickets by distinguishing downgrades
 *                        from user-initiated logouts.
 *
 *   mode='sweep'       — weekly cron (Sunday 05:00 UTC).
 *                        DELETE WHERE last_seen_at < now() - interval '60 days'.
 *                        Catches users whose downgrade webhook was missed +
 *                        tokens not seen in 60+ days (stale uninstalls).
 *
 * Auth: Bearer PUSH_CLEANUP_AUTH_TOKEN (Vault-stored shared secret).
 *
 * Returns: { mode, deleted, duration_ms, [user_id|cutoff] }.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

import { createCorsResponse, createCorsErrorResponse, getCorsHeaders } from '../_shared/cors.ts';
import { timingSafeEq } from '../_shared/timingSafeEq.ts';

type Mode = 'single' | 'signed_out' | 'sweep';

interface RequestBody {
  user_id?: string;
  mode?: Mode;
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(req) });
  }
  if (req.method !== 'POST') {
    return createCorsErrorResponse('Method not allowed', req, 405);
  }

  // 1. Auth — Bearer PUSH_CLEANUP_AUTH_TOKEN (constant-time).
  const PUSH_CLEANUP_AUTH_TOKEN = Deno.env.get('PUSH_CLEANUP_AUTH_TOKEN') ?? '';
  if (!PUSH_CLEANUP_AUTH_TOKEN) {
    return createCorsErrorResponse('PUSH_CLEANUP_AUTH_TOKEN not set', req, 500);
  }
  const authHeader = req.headers.get('Authorization') ?? '';
  const provided = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!timingSafeEq(provided, PUSH_CLEANUP_AUTH_TOKEN)) {
    return createCorsErrorResponse('Unauthorized', req, 401);
  }

  // 2. Parse body — accept empty body for sweep mode default; reject malformed.
  let body: RequestBody = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text) as RequestBody;
  } catch {
    return createCorsErrorResponse('Invalid JSON body', req, 400);
  }

  const mode: Mode = body.mode ?? 'single';
  const started = Date.now();

  // 3. Branch by mode — validate user_id BEFORE creating the supabase client
  //    so unit tests can short-circuit at 400 without hitting esm.sh.
  if (mode === 'single' || mode === 'signed_out') {
    // Q2 RESOLVED — 'signed_out' is the AuthProvider SIGNED_OUT cleanup path.
    // Same SQL effect as 'single' (downgrade); mode is echoed back for telemetry.
    if (!body.user_id) {
      return createCorsErrorResponse(`user_id required for ${mode} mode`, req, 400);
    }
  } else if (mode !== 'sweep') {
    return createCorsErrorResponse(`Invalid mode: ${String(mode)}`, req, 400);
  }

  // 4. Service-role client — bypasses RLS for cleanup.
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return createCorsErrorResponse('Server misconfigured', req, 500);
  }
  // Disable autoRefreshToken + persistSession on the service-role client.
  // Both default-on behaviors register a setInterval inside supabase-js for
  // periodic token refresh; in unit tests Deno's strict resource tracker
  // flags those intervals as leaks ("An interval was started in this test,
  // but never completed") and fails the run even when the handler logic
  // itself is correct. Service-role tokens don't expire on their own so
  // there's nothing to refresh — turning both off is the canonical pattern.
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (mode === 'single' || mode === 'signed_out') {
    try {
      const { error, count } = await supabase
        .from('push_subscriptions')
        .delete({ count: 'exact' })
        .eq('user_id', body.user_id!);
      if (error) {
        return createCorsErrorResponse(`Delete failed: ${error.message}`, req, 500);
      }
      return createCorsResponse(
        {
          mode,
          user_id: body.user_id,
          deleted: count ?? 0,
          duration_ms: Date.now() - started,
        },
        req,
      );
    } catch (err) {
      // supabase-js rejects (rather than returning {error}) when the
      // underlying fetch can't even reach the host — happens in unit tests
      // where SUPABASE_URL points at an unreachable localhost. Catch and
      // surface as 500 so the test asserts (not 401/400) still hold.
      return createCorsErrorResponse(
        `Delete threw: ${err instanceof Error ? err.message : String(err)}`,
        req,
        500,
      );
    }
  }

  // 5. mode === 'sweep' — 60-day cutoff.
  const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - SIXTY_DAYS_MS).toISOString();
  try {
    const { error, count } = await supabase
      .from('push_subscriptions')
      .delete({ count: 'exact' })
      .lt('last_seen_at', cutoff);
    if (error) {
      return createCorsErrorResponse(`Sweep failed: ${error.message}`, req, 500);
    }
    return createCorsResponse(
      {
        mode: 'sweep',
        cutoff,
        deleted: count ?? 0,
        duration_ms: Date.now() - started,
      },
      req,
    );
  } catch (err) {
    return createCorsErrorResponse(
      `Sweep threw: ${err instanceof Error ? err.message : String(err)}`,
      req,
      500,
    );
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
