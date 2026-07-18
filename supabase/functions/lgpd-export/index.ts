/**
 * lgpd-export — DSR data-export endpoint (COMPL-01 / LGPD Art. 18 II + V).
 *
 * Authenticated user calls this endpoint and receives a JSON bundle of all
 * personal data MilesPro holds about them. Synchronous target: <5s response;
 * legal hard deadline: 15 days (LGPD Art. 18 §1). Rate-limited 1/hour/user
 * via lgpd_export_log table (HTTP 429 on the second call within the window).
 *
 * Reuses Phase 1 _shared/cors.ts; auth pattern from google-calendar-auth.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

const RATE_LIMIT_WINDOW_MS = 3_600_000; // 1 hour

// All travel_* table names — keep in sync with Phase 1 SECURITY scope.
const TRAVEL_TABLES = [
  'travel_tickets',
  'travel_cruises',
  'travel_hotels',
  'travel_cars',
  'travel_insurances',
  'travel_attractions',
  'travel_transfers',
  'travel_quotes',
  'travel_clients',
] as const;

interface BundleData {
  profile: unknown;
  subscription: unknown;
  operations: unknown;
  user_programs: unknown;
  travel: Record<string, unknown>;
  consent_log: unknown;
}

interface ExportBundle {
  export_timestamp: string;
  user_id: string;
  email: string | undefined;
  legal_basis: string;
  rate_limit: {
    window_seconds: number;
    next_export_allowed_at: string;
  };
  data: BundleData;
  row_counts: Record<string, number>;
}

export const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[lgpd-export] missing SUPABASE_URL or service role key');
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Authenticate via Bearer JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const jwt = authHeader.replace(/^Bearer\s+/i, '');

    // Use an anon client to verify the JWT; switch to service role for
    // bypass-RLS reads below (we trust the user check, not RLS for the export
    // surface — RLS does cover us if we use the user-scoped client too, but
    // this gives consistent <5s response time across travel_* tables).
    const supabaseAuth = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY ?? SUPABASE_SERVICE_ROLE_KEY,
    );
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      console.warn('[lgpd-export] auth failure', userErr?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const user = userData.user;

    // Service-role client — bypasses RLS for the bundle queries + rate-limit
    // table writes (lgpd_export_log has no INSERT policy for `authenticated`).
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Rate limit: 1 export per hour per user
    const { data: lastLog, error: rateErr } = await supabase
      .from('lgpd_export_log')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (rateErr) {
      console.warn('[lgpd-export] rate-limit lookup error', rateErr.message);
    }

    if (lastLog?.created_at) {
      const elapsed = Date.now() - new Date(lastLog.created_at).getTime();
      if (elapsed < RATE_LIMIT_WINDOW_MS) {
        const retry = Math.ceil((RATE_LIMIT_WINDOW_MS - elapsed) / 1000);
        return new Response(
          JSON.stringify({
            error: 'rate_limited',
            retry_after_seconds: retry,
            legal_basis: 'LGPD Art. 18 II/V — uma exportação por hora',
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Retry-After': String(retry),
            },
          },
        );
      }
    }

    // Bundle data — parallel queries
    const [profile, subscription, operations, programs, consents] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('user_subscriptions').select('*').eq('user_id', user.id),
      supabase.from('operations').select('*').eq('user_id', user.id),
      supabase.from('user_programs').select('*').eq('user_id', user.id),
      supabase.from('user_consents').select('*').eq('user_id', user.id),
    ]);

    // travel_* tables — best-effort per table; missing tables silently skipped
    const travelResults = await Promise.all(
      TRAVEL_TABLES.map(async (table) => {
        try {
          const { data } = await supabase.from(table).select('*').eq('user_id', user.id);
          return { table, data: data ?? [] };
        } catch (err) {
          console.warn(`[lgpd-export] travel table ${table} read failed`, err);
          return { table, data: [] };
        }
      }),
    );

    const travel: Record<string, unknown> = {};
    const rowCounts: Record<string, number> = {
      profile: profile.data ? 1 : 0,
      subscription: subscription.data?.length ?? 0,
      operations: operations.data?.length ?? 0,
      user_programs: programs.data?.length ?? 0,
      consents: consents.data?.length ?? 0,
    };
    for (const { table, data } of travelResults) {
      travel[table] = data;
      rowCounts[table] = Array.isArray(data) ? data.length : 0;
    }

    const bundle: ExportBundle = {
      export_timestamp: new Date().toISOString(),
      user_id: user.id,
      email: user.email,
      legal_basis: 'LGPD Art. 18 II/V — direito de acesso e portabilidade',
      rate_limit: {
        window_seconds: RATE_LIMIT_WINDOW_MS / 1000,
        next_export_allowed_at: new Date(Date.now() + RATE_LIMIT_WINDOW_MS).toISOString(),
      },
      data: {
        profile: profile.data,
        subscription: subscription.data,
        operations: operations.data,
        user_programs: programs.data,
        travel,
        consent_log: consents.data,
      },
      row_counts: rowCounts,
    };

    // Log + audit (also serves as the rate-limit anchor for the next call).
    const { error: logErr } = await supabase.from('lgpd_export_log').insert({
      user_id: user.id,
      row_counts: rowCounts,
    });
    if (logErr) {
      // Non-fatal: the user gets their bundle even if the audit insert fails,
      // but we surface it loudly in Sentry once plan 02-03 wires it up.
      console.warn('[lgpd-export] audit insert failed', logErr.message);
    }

    return new Response(JSON.stringify(bundle, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="milespro-export-${user.id}.json"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[lgpd-export] unexpected error', err);
    // Sentry hook (plan 02-03 wires real init; until then this is a no-op block).
    // Using globalThis lookup avoids a TS reference error before Sentry exists.
    try {
      const sentry = (globalThis as { Sentry?: { captureException?: (e: unknown) => void } }).Sentry;
      sentry?.captureException?.(err);
    } catch {
      /* no-op */
    }
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

export default handler;

if (import.meta.main) {
  Deno.serve(handler);
}
