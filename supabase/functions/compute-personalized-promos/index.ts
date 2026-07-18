/**
 * compute-personalized-promos — Phase 2 W2b (Plan 02-06) / TIER-03 / D-13.
 *
 * Nightly job (registered by pg_cron at 02:00 UTC; see the cron migration that
 * lands alongside this function) that pages through Pro+ users, correlates the
 * active promotions catalog with each user's user_programs balances, and
 * inserts a row into public.user_promo_alerts for every actionable match
 * (user has balance > 0 in the promotion's source program).
 *
 * Caller authentication: Bearer-token shared secret (PROMO_COMPUTE_AUTH_TOKEN)
 * matched in constant time. Same pattern as
 * reconcile-asaas-subscriptions / lgpd-delete-cleanup (Phase 2 W1a + W2a).
 * Future ticket: extract constantTimeEq to _shared/timingSafeEq.ts once a 5th
 * consumer lands (currently 4 — google-calendar-auth, lgpd-delete-cleanup,
 * asaas-webhook, reconcile-asaas-subscriptions).
 *
 * Data sources:
 *   - public.promotions: existing table populated by the legacy fetch-promotions
 *     edge function. Filter: is_active = true.
 *   - public.user_subscriptions: Pro+ users (plan IN ('pro','vip') AND
 *     is_active = true).
 *   - public.user_programs: per-user enabled programs (program_name column).
 *
 * Output: { inserted, pro_users, promotions, errors, generated_at }.
 *
 * Idempotency: re-runs may produce duplicate rows; the consuming UI filters
 * by dismissed_at IS NULL and de-dupes visually by promo_id.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { timingSafeEq as constantTimeEq } from '../_shared/timingSafeEq.ts';

// === Push fan-out helper (Plan 03-04b — D-T06 #2 promo_alert) =================
// Best-effort: failures are logged but never abort the insert loop. enqueue-push
// applies the Pro+ gate server-side, so no premature filtering here.
async function fireEnqueuePushForPromo(
  userId: string,
  promo: {
    from_program: string;
    to_program: string;
    bonus_pct: number;
    balance_id?: string;
  },
): Promise<void> {
  const token = Deno.env.get('PUSH_ENQUEUE_AUTH_TOKEN') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  if (!token || !supabaseUrl) return;
  try {
    await fetch(`${supabaseUrl}/functions/v1/enqueue-push`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
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
// === END push fan-out helper ==================================================

export interface PromotionRow {
  id: string;
  from_program?: string | null;
  to_program?: string | null;
  program?: string | null;
  bonus_target?: string | null;
  bonus_pct?: number | null;
  title?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active?: boolean | null;
}

export interface UserProgramRow {
  program_name: string;
  is_active?: boolean | null;
}

export interface ProUserRow {
  user_id: string;
}

/**
 * Pure matcher: given a user's enabled program set and the active promotion
 * catalog, return the list of (user_id, promo) pairs that should produce a
 * user_promo_alerts row. Exported for unit testing.
 */
export function matchPromosForUser(
  userId: string,
  userPrograms: UserProgramRow[],
  promotions: PromotionRow[],
): Array<{
  user_id: string;
  promo_id: string;
  from_program: string;
  to_program: string;
  bonus_pct: number;
  starts_at: string | null;
  ends_at: string | null;
}> {
  const set = new Set(
    userPrograms.map((p) => String(p.program_name ?? '').toLowerCase()),
  );
  const out: Array<ReturnType<typeof matchPromosForUser>[number]> = [];
  for (const promo of promotions) {
    const fromProgram = String(promo.from_program ?? promo.program ?? '').toLowerCase();
    const toProgram = String(promo.to_program ?? promo.bonus_target ?? '').toLowerCase();
    if (!fromProgram) continue;
    if (!set.has(fromProgram)) continue;
    const bonusPct = Number(promo.bonus_pct ?? 0);
    out.push({
      user_id: userId,
      promo_id: promo.id,
      from_program: fromProgram,
      to_program: toProgram || 'desconhecido',
      bonus_pct: isFinite(bonusPct) && bonusPct > 0 ? bonusPct : 0,
      starts_at: promo.starts_at ?? null,
      ends_at: promo.ends_at ?? null,
    });
  }
  return out;
}

export async function handler(req: Request): Promise<Response> {
  const PROMO_COMPUTE_AUTH_TOKEN = Deno.env.get('PROMO_COMPUTE_AUTH_TOKEN');

  // 1. Bearer auth (Vault-stored secret).
  const auth = req.headers.get('Authorization') ?? '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!PROMO_COMPUTE_AUTH_TOKEN || !constantTimeEq(provided, PROMO_COMPUTE_AUTH_TOKEN)) {
    return new Response('Forbidden', { status: 403 });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('Server misconfigured', { status: 500 });
  }
  // Service-role client — disable autoRefreshToken+persistSession so
  // Deno strict tests don't flag supabase-js's default setInterval as
  // an interval leak. Service-role tokens don't refresh on their own.
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 2. Active promotions (D-13 source).
  const { data: promotionsRaw, error: promoErr } = await supabase
    .from('promotions')
    .select('*')
    .eq('is_active', true);

  if (promoErr) {
    return new Response(
      JSON.stringify({ error: 'Failed to read promotions', detail: promoErr.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
  const promotions = (promotionsRaw ?? []) as PromotionRow[];

  // 3. Pro+ users (RESEARCH §6.3).
  const { data: proUsersRaw, error: userErr } = await supabase
    .from('user_subscriptions')
    .select('user_id')
    .in('plan', ['pro', 'vip'])
    .eq('is_active', true);

  if (userErr) {
    return new Response(
      JSON.stringify({ error: 'Failed to read user_subscriptions', detail: userErr.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
  const proUsers = (proUsersRaw ?? []) as ProUserRow[];

  let inserted = 0;
  let deduped = 0;
  const errors: string[] = [];

  for (const u of proUsers) {
    const { data: userProgsRaw } = await supabase
      .from('user_programs')
      .select('program_name')
      .eq('user_id', u.user_id)
      .eq('is_active', true);

    const userPrograms = (userProgsRaw ?? []) as UserProgramRow[];
    if (userPrograms.length === 0) continue;

    const matches = matchPromosForUser(u.user_id, userPrograms, promotions);
    for (const match of matches) {
      const { error: insErr } = await supabase
        .from('user_promo_alerts')
        .insert({
          user_id: match.user_id,
          promo_id: match.promo_id,
          from_program: match.from_program,
          to_program: match.to_program,
          bonus_pct: match.bonus_pct,
          balance_in_from: null,
          starts_at: match.starts_at,
          ends_at: match.ends_at,
        });
      if (insErr) {
        // P1-7 idempotency: partial UNIQUE (user_id, promo_id) WHERE dismissed_at IS NULL
        // raises 23505 on the second nightly pass. That is the dedupe signal — skip the
        // fan-out so the user does not get the same promo push every night.
        if ((insErr as { code?: string }).code === '23505') {
          deduped++;
          continue;
        }
        errors.push(`user=${u.user_id} promo=${match.promo_id}: ${insErr.message}`);
        continue;
      }
      inserted++;
      // Plan 03-04b — fan out promo_alert push (D-T06 #2). Pro+ gate applied
      // server-side by enqueue-push via has_plan(user_id, 'pro'). Best-effort:
      // a failed fan-out does NOT roll back the insert.
      await fireEnqueuePushForPromo(match.user_id, {
        from_program: match.from_program,
        to_program: match.to_program,
        bonus_pct: match.bonus_pct,
        // balance_id intentionally omitted — compute-personalized-promos does not
        // track which balance row triggered the match; downstream group_key uses
        // 'global' suffix when balance_id is absent.
      });
    }
  }

  return new Response(
    JSON.stringify({
      inserted,
      deduped,
      pro_users: proUsers.length,
      promotions: promotions.length,
      errors: errors.slice(0, 10),
      generated_at: new Date().toISOString(),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

if (import.meta.main) {
  Deno.serve(handler);
}
