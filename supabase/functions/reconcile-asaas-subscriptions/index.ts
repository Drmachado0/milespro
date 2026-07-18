/**
 * reconcile-asaas-subscriptions — Phase 2 W2a (Plan 02-05) — D-09 / PAY-03.
 *
 * Nightly cron-driven drift detector between Asaas (source of truth per D-08)
 * and the local user_subscriptions read-cache. Invoked by pg_cron at 03:00
 * UTC via net.http_post + Vault-stored bearer token (mirrors the W1a
 * lgpd-delete-cleanup pattern).
 *
 * Algorithm (RESEARCH §2.8):
 *   1. Page GET /v3/subscriptions?status=ACTIVE until hasMore=false (50-100/pg).
 *   2. Pull DB rows where is_active = true.
 *   3. Compute set diff:
 *      - onlyInAsaas: subscriptions Asaas considers ACTIVE but DB does not
 *        (webhook delivery may have failed). Operator-replays via curl.
 *      - onlyInDB: subscriptions DB considers active but Asaas does not
 *        (cancellation we missed). Same operator-replay path.
 *   4. Alert Sentry if drift_pct > 5%.
 *
 * Self-heal is NOT automated in v1 (RESEARCH §2.8 calls it out as
 * "operator-driven for MVP"). Future enhancement: synthesize a
 * webhook_events row per orphan and trigger replay.
 *
 * Auth: verify_jwt = false in supabase/config.toml. The `Authorization:
 * Bearer <ASAAS_RECONCILE_AUTH_TOKEN>` header is compared constant-time.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
const ASAAS_ENV = Deno.env.get('ASAAS_ENV') ?? 'sandbox';
const ASAAS_BASE =
  ASAAS_ENV === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://api-sandbox.asaas.com/v3';
const RECONCILE_AUTH_TOKEN = Deno.env.get('ASAAS_RECONCILE_AUTH_TOKEN');

// Constant-time string equality — defends against timing-attack leakage of
// the bearer token through response-time differential analysis. Canonical
// implementation in `_shared/timingSafeEq.ts` (Plan 03-04a extraction). Re-
// exporting the legacy `constantTimeEq` name preserves the import shape used
// by index.test.ts and matches the pattern in `asaas-webhook/index.ts`.
import { timingSafeEq as constantTimeEq } from '../_shared/timingSafeEq.ts';
// Re-export para preservar a shape de import usada por index.test.ts.
export { constantTimeEq };

type AsaasSubscription = {
  id: string;
  externalReference?: string;
  status?: string;
  value?: number;
  cycle?: string;
};

type AsaasPage = {
  data: AsaasSubscription[];
  hasMore?: boolean;
};

type DbSubscriptionRow = {
  id: string;
  user_id: string;
  asaas_subscription_id: string | null;
  status: string | null;
  plan: string | null;
};

/**
 * Compute drift statistics from the two source-of-truth sets. Pure
 * function — exported for unit testing.
 */
export function computeDrift(
  asaasSubs: AsaasSubscription[],
  dbActive: DbSubscriptionRow[],
): {
  asaas_count: number;
  db_count: number;
  drift_count: number;
  drift_pct: number;
  only_in_asaas: string[];
  only_in_db: string[];
} {
  const asaasIds = new Set(asaasSubs.map((s) => s.id));
  const dbIds = new Set(
    dbActive.map((s) => s.asaas_subscription_id).filter(Boolean) as string[],
  );

  const onlyInAsaas = asaasSubs.filter((s) => !dbIds.has(s.id));
  const onlyInDB = dbActive.filter(
    (s) => s.asaas_subscription_id && !asaasIds.has(s.asaas_subscription_id),
  );

  const driftCount = onlyInAsaas.length + onlyInDB.length;
  const totalAsaas = asaasSubs.length;
  const driftPct = totalAsaas > 0 ? (driftCount / totalAsaas) * 100 : 0;

  return {
    asaas_count: totalAsaas,
    db_count: dbActive.length,
    drift_count: driftCount,
    drift_pct: Number(driftPct.toFixed(2)),
    only_in_asaas: onlyInAsaas.map((s) => s.id),
    only_in_db: onlyInDB
      .map((s) => s.asaas_subscription_id)
      .filter(Boolean) as string[],
  };
}

async function pageAsaasActiveSubscriptions(
  apiKey: string,
): Promise<AsaasSubscription[]> {
  const all: AsaasSubscription[] = [];
  let offset = 0;
  const limit = 100;

  // Hard cap on pages to prevent runaway loops on a misbehaving Asaas
  // response (matches mrr-dashboard pattern).
  const MAX_PAGES = 100;
  let pages = 0;

  while (pages < MAX_PAGES) {
    const url = `${ASAAS_BASE}/subscriptions?status=ACTIVE&limit=${limit}&offset=${offset}`;
    const res = await fetch(url, {
      headers: { access_token: apiKey },
    });
    if (!res.ok) {
      console.warn(
        '[reconcile] Asaas error',
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
  // 1. Bearer auth (called by pg_cron with Vault-stored token)
  const authHeader = req.headers.get('Authorization') ?? '';
  const provided = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : '';
  if (!RECONCILE_AUTH_TOKEN || !constantTimeEq(provided, RECONCILE_AUTH_TOKEN)) {
    return new Response('Forbidden', { status: 403 });
  }

  if (!ASAAS_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'ASAAS_API_KEY unset' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: 'Server misconfigured' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
  // Service-role client — disable autoRefreshToken+persistSession so
  // Deno strict tests don't flag supabase-js's default setInterval as
  // an interval leak. Service-role tokens don't refresh on their own.
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 2. Page Asaas active subscriptions
  const asaasSubs = await pageAsaasActiveSubscriptions(ASAAS_API_KEY);

  // 3. Pull DB active subscriptions
  const { data: dbActiveRaw } = await supabase
    .from('user_subscriptions')
    .select('id, user_id, asaas_subscription_id, status, plan')
    .eq('is_active', true);
  const dbActive = (dbActiveRaw ?? []) as DbSubscriptionRow[];

  // 4. Compute drift
  const drift = computeDrift(asaasSubs, dbActive);

  // 5. Sentry alert if drift > 5% (RESEARCH §2.8)
  if (drift.drift_pct > 5) {
    console.warn(
      `[reconcile] DRIFT ALERT: ${drift.drift_count}/${drift.asaas_count} rows ` +
        `out of sync (${drift.drift_pct}%)`,
    );
    // Best-effort Sentry capture — graceful no-op if SDK not installed.
    // Wrapped in try/catch so a Sentry outage does not break reconcile.
    try {
      const SentryModule = await import('https://esm.sh/@sentry/deno@7');
      const Sentry = SentryModule as unknown as {
        captureMessage?: (msg: string, level?: string) => void;
      };
      Sentry.captureMessage?.(
        `Asaas reconcile drift: ${drift.drift_count}/${drift.asaas_count} rows`,
        'warning',
      );
    } catch {
      // Sentry Deno SDK not installed yet — warn-only path
    }
  }

  // 6. Self-heal stub — in v1 we just report; operator replays via curl
  // against asaas-webhook with synthesized event_id. Backlog: automate.

  return new Response(
    JSON.stringify({
      ...drift,
      asaas_env: ASAAS_ENV,
      generated_at: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

if (import.meta.main) {
  Deno.serve(handler);
}

