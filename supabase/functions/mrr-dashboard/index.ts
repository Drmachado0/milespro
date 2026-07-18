/**
 * mrr-dashboard — Phase 2 W1b rewrite (TEL-02 / D-14).
 *
 * Reads Asaas as the source of truth for MRR (per D-08 — Asaas is SoT;
 * user_subscriptions is a read-cache). Computes MRR as
 *
 *     MRR = sum(subscription.value / CYCLE_MONTHS[subscription.cycle])
 *
 * for every Asaas subscription with status=ACTIVE. Paginates the
 * /v3/subscriptions endpoint (limit=100, offset bumped until response
 * .hasMore === false).
 *
 * Replaces the legacy hard-coded price table + DB-only count that lived
 * here pre-Phase-2 (which referenced enum values from the 5-tier era
 * that no longer exist post Phase-1 enum collapse).
 *
 * Auth + admin gate:
 *   1. Bearer JWT validates via supabase.auth.getUser(jwt) — 401 if missing
 *      or invalid.
 *   2. profile.is_admin = true required — 403 if not (defense in depth;
 *      AdminMetrics.tsx also checks client-side).
 *
 * Graceful degrade: when ASAAS_API_KEY is unset (pre-W2a state), returns
 * { mrr_total: 0, active_subscriptions: 0, ... } instead of erroring,
 * so the dashboard can render even before Asaas onboarding is complete.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  getCorsHeaders,
  handleCorsPreflight,
} from '../_shared/cors.ts';

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
const ASAAS_ENV = Deno.env.get('ASAAS_ENV') ?? 'sandbox';
const ASAAS_BASE =
  ASAAS_ENV === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://api-sandbox.asaas.com/v3';

if (!ASAAS_API_KEY) {
  console.warn(
    '[mrr-dashboard] ASAAS_API_KEY unset — dashboard will return empty payload',
  );
}

const CYCLE_MONTHS = {
  WEEKLY: 0.25,
  BIWEEKLY: 0.5,
  MONTHLY: 1,
  QUARTERLY: 3,
  SEMIANNUALLY: 6,
  YEARLY: 12,
} as const;

type AsaasSubscription = {
  id: string;
  value: number;
  cycle: keyof typeof CYCLE_MONTHS;
  externalReference?: string;
  status?: string;
};

type AsaasPage = {
  data: AsaasSubscription[];
  hasMore?: boolean;
  totalCount?: number;
};

/**
 * Compute MRR + per-plan breakdown from a flat list of Asaas
 * subscriptions. Pure function — exported for unit testing.
 *
 * Per-plan classification uses Asaas externalReference. Convention:
 * `externalReference` is set to `user_subscriptions.id` (UUID) on
 * subscription creation (Plan 02-05 W2a will wire this). The function
 * accepts a pre-resolved `planByExternalRef` map so the math stays
 * Asaas-only (the Supabase lookup is the caller's responsibility).
 */
export function computeMrrFromAsaasSubs(
  subs: AsaasSubscription[],
  planByExternalRef: Record<string, 'pro' | 'vip'> = {},
): {
  mrr_total: number;
  mrr_by_plan: { pro: number; vip: number };
  active_subscriptions: number;
} {
  let mrr = 0;
  const byPlan: Record<'pro' | 'vip', number> = { pro: 0, vip: 0 };

  for (const sub of subs) {
    const months =
      (CYCLE_MONTHS as Record<string, number>)[sub.cycle] ?? 1;
    const monthly = sub.value / months;
    mrr += monthly;

    if (sub.externalReference) {
      const plan = planByExternalRef[sub.externalReference];
      if (plan === 'pro') byPlan.pro += monthly;
      else if (plan === 'vip') byPlan.vip += monthly;
    }
  }

  return {
    mrr_total: Number(mrr.toFixed(2)),
    mrr_by_plan: {
      pro: Number(byPlan.pro.toFixed(2)),
      vip: Number(byPlan.vip.toFixed(2)),
    },
    active_subscriptions: subs.length,
  };
}

async function fetchActiveSubscriptions(): Promise<AsaasSubscription[]> {
  if (!ASAAS_API_KEY) return [];

  const all: AsaasSubscription[] = [];
  let offset = 0;
  const limit = 100;

  // Hard cap to prevent runaway loops on a misbehaving Asaas response.
  // 100 pages × 100 = 10 000 active subscriptions — well above MVP scale.
  const MAX_PAGES = 100;
  let pages = 0;

  while (pages < MAX_PAGES) {
    const url = `${ASAAS_BASE}/subscriptions?status=ACTIVE&limit=${limit}&offset=${offset}`;
    const res = await fetch(url, {
      headers: { access_token: ASAAS_API_KEY },
    });
    if (!res.ok) {
      console.warn(
        '[mrr-dashboard] Asaas error',
        res.status,
        await res.text().catch(() => ''),
      );
      break;
    }
    const page = (await res.json()) as AsaasPage;
    all.push(...(page.data ?? []));
    if (!page.hasMore) break;
    offset += limit;
    pages += 1;
  }

  return all;
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return handleCorsPreflight(req);

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // 1. Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const jwt = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser(jwt);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Admin gate (defense in depth; client also checks)
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Page all active Asaas subscriptions
    const subs = await fetchActiveSubscriptions();

    // 4. Resolve plan-by-externalReference (per D-08 user_subscriptions
    // is the local mirror; we look up `plan` keyed by externalReference
    // which we set to user_subscriptions.id on Asaas create).
    const planByExternalRef: Record<string, 'pro' | 'vip'> = {};
    if (subs.length > 0) {
      const externalRefs = subs
        .map((s) => s.externalReference)
        .filter((x): x is string => Boolean(x));

      if (externalRefs.length > 0) {
        const { data: dbSubs } = await supabase
          .from('user_subscriptions')
          .select('id, plan')
          .in('id', externalRefs);

        if (dbSubs) {
          for (const row of dbSubs as Array<{ id: string; plan: string }>) {
            if (row.plan === 'pro' || row.plan === 'vip') {
              planByExternalRef[row.id] = row.plan;
            }
          }
        }
      }
    }

    // 5. Compute
    const computed = computeMrrFromAsaasSubs(subs, planByExternalRef);

    const body = {
      ...computed,
      asaas_env: ASAAS_ENV,
      generated_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[mrr-dashboard] unhandled error', err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
