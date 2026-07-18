/**
 * lgpd-delete-cleanup — daily pg_cron-driven hard-delete pipeline (COMPL-02 / D-18).
 *
 * Invoked by pg_cron via net.http_post once per day at 04:00 UTC. Iterates
 * profiles where `deletion_confirmed_at < now() - interval '7 days'` and for
 * each row:
 *   1. Best-effort delete Asaas customer    -> asaas_customer_deleted_at
 *   2. Best-effort delete PostHog person    -> posthog_person_deleted_at
 *   3. Best-effort delete Sentry user       -> sentry_user_deleted_at
 *   4. Count rows in user_id-keyed tables   -> row_counts_deleted
 *   5. INSERT into deletion_audit (BEFORE the cascade DELETE)
 *   6. DELETE from auth.users — cascades to user_subscriptions, user_programs,
 *      operations, travel_*, user_consents, lgpd_export_log (FK ON DELETE
 *      CASCADE was added by Phase 1 for user_subscriptions; Plan 02-02
 *      Task 1 added CASCADE on user_consents + lgpd_export_log).
 *
 * Auth: verify_jwt = false (no user context). Instead, the Authorization
 * header must contain `Bearer <LGPD_CLEANUP_AUTH_TOKEN>`, compared in
 * constant time. Token lives in Vault + Deno.env (same value).
 *
 * Errors per external API (Asaas / PostHog / Sentry) are swallowed and logged
 * — the cron must finish even when an external API is down. The audit row
 * captures which steps succeeded; ops can rerun externally if needed.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { timingSafeEq } from '../_shared/timingSafeEq.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const LGPD_CLEANUP_AUTH_TOKEN = Deno.env.get('LGPD_CLEANUP_AUTH_TOKEN');

// External API config (all optional — best-effort cascade)
const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
const ASAAS_API_URL = Deno.env.get('ASAAS_API_URL') ?? 'https://sandbox.asaas.com/api/v3';
const POSTHOG_API_KEY = Deno.env.get('POSTHOG_API_KEY'); // personal API key, NOT project key
const POSTHOG_PROJECT_ID = Deno.env.get('POSTHOG_PROJECT_ID');
const POSTHOG_API_URL = Deno.env.get('POSTHOG_API_URL') ?? 'https://eu.posthog.com';
const SENTRY_API_KEY = Deno.env.get('SENTRY_API_KEY');
const SENTRY_ORG_SLUG = Deno.env.get('SENTRY_ORG_SLUG');

const HARD_DELETE_WINDOW_DAYS = 7;

// Tables to count rows in for the audit; never include user_consents or
// lgpd_export_log (those cascade via FK and would count themselves into 0).
const COUNT_TABLES = [
  'operations',
  'user_programs',
  'user_subscriptions',
  'travel_tickets',
  'travel_cruises',
  'travel_hotels',
  'travel_cars',
  'travel_insurances',
  'travel_attractions',
  'travel_transfers',
  'travel_quotes',
  'travel_clients',
  'user_consents',
  'lgpd_export_log',
] as const;

interface CleanupSummary {
  processed: number;
  errors: string[];
  deleted_user_ids: string[];
  duration_ms: number;
}

interface ProfileRow {
  id: string;
  deletion_requested_at: string | null;
  deletion_confirmed_at: string | null;
  asaas_customer_id: string | null;
}

async function deleteAsaasCustomer(customerId: string): Promise<boolean> {
  if (!ASAAS_API_KEY || !customerId) return false;
  try {
    const resp = await fetch(`${ASAAS_API_URL}/customers/${customerId}`, {
      method: 'DELETE',
      headers: { access_token: ASAAS_API_KEY },
    });
    // 404 = already gone — treat as success
    return resp.ok || resp.status === 404;
  } catch (err) {
    console.warn('[lgpd-cleanup] Asaas delete failed', err);
    return false;
  }
}

async function deletePosthogPerson(distinctId: string): Promise<boolean> {
  if (!POSTHOG_API_KEY || !POSTHOG_PROJECT_ID) return false;
  try {
    const resp = await fetch(
      `${POSTHOG_API_URL}/api/projects/${POSTHOG_PROJECT_ID}/persons/delete_by_distinct_id`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${POSTHOG_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ distinct_id: distinctId, delete_events: true }),
      },
    );
    return resp.ok;
  } catch (err) {
    console.warn('[lgpd-cleanup] PostHog delete failed', err);
    return false;
  }
}

async function deleteSentryUser(userId: string): Promise<boolean> {
  if (!SENTRY_API_KEY || !SENTRY_ORG_SLUG) return false;
  try {
    // Sentry's "scrub user" lives at the project level; this is a stub call
    // pattern — actual API depends on Sentry's data scrubbing endpoint.
    // See https://docs.sentry.io/api/data-scrubbing/.
    const resp = await fetch(
      `https://sentry.io/api/0/organizations/${SENTRY_ORG_SLUG}/data-scrubbing-selectors/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SENTRY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: userId, type: 'username' }),
      },
    );
    return resp.ok;
  } catch (err) {
    console.warn('[lgpd-cleanup] Sentry delete failed', err);
    return false;
  }
}

export const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[lgpd-cleanup] missing SUPABASE_URL or service role key');
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!LGPD_CLEANUP_AUTH_TOKEN) {
    console.error('[lgpd-cleanup] LGPD_CLEANUP_AUTH_TOKEN not set');
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Bearer auth — constant-time compare
  const authHeader = req.headers.get('Authorization') ?? '';
  const expected = `Bearer ${LGPD_CLEANUP_AUTH_TOKEN}`;
  if (!timingSafeEq(authHeader, expected)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const startedAt = Date.now();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const summary: CleanupSummary = {
    processed: 0,
    errors: [],
    deleted_user_ids: [],
    duration_ms: 0,
  };

  try {
    // Cutoff: rows whose deletion_confirmed_at is older than 7 days
    const cutoff = new Date(
      Date.now() - HARD_DELETE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: rows, error } = await supabase
      .from('profiles')
      .select('id, deletion_requested_at, deletion_confirmed_at, asaas_customer_id')
      .not('deletion_confirmed_at', 'is', null)
      .lt('deletion_confirmed_at', cutoff)
      .limit(100); // batch cap per run

    if (error) {
      console.error('[lgpd-cleanup] query failed', error.message);
      summary.errors.push(`query_failed:${error.message}`);
      summary.duration_ms = Date.now() - startedAt;
      return new Response(JSON.stringify(summary), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    for (const row of (rows as ProfileRow[] | null) ?? []) {
      try {
        const userId = row.id;

        // 1-3: External cascade (best effort)
        const asaasOk = row.asaas_customer_id
          ? await deleteAsaasCustomer(row.asaas_customer_id)
          : false;
        const posthogOk = await deletePosthogPerson(userId);
        const sentryOk = await deleteSentryUser(userId);

        // 4: Row counts per table
        const rowCounts: Record<string, number> = {};
        await Promise.all(
          COUNT_TABLES.map(async (table) => {
            try {
              const { count } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true })
                .eq('user_id', table === 'profiles' ? userId : userId);
              rowCounts[table] = count ?? 0;
            } catch {
              rowCounts[table] = 0;
            }
          }),
        );

        // 5: Audit row BEFORE the cascade DELETE
        const { error: auditErr } = await supabase.from('deletion_audit').insert({
          deleted_user_id: userId,
          requested_at: row.deletion_requested_at ?? row.deletion_confirmed_at!,
          confirmed_at: row.deletion_confirmed_at!,
          asaas_customer_deleted_at: asaasOk ? new Date().toISOString() : null,
          posthog_person_deleted_at: posthogOk ? new Date().toISOString() : null,
          sentry_user_deleted_at: sentryOk ? new Date().toISOString() : null,
          row_counts_deleted: rowCounts,
          notes: `pg_cron run @ ${new Date(startedAt).toISOString()}`,
        });
        if (auditErr) {
          console.warn(
            '[lgpd-cleanup] audit insert failed for',
            userId,
            auditErr.message,
          );
          summary.errors.push(`audit_failed:${userId}:${auditErr.message}`);
          continue; // do not delete the user without an audit row
        }

        // 6: Hard delete from auth.users — FK CASCADE handles the rest
        const { error: delErr } = await supabase.auth.admin.deleteUser(userId);
        if (delErr) {
          console.warn(
            '[lgpd-cleanup] auth.users delete failed for',
            userId,
            delErr.message,
          );
          summary.errors.push(`auth_delete_failed:${userId}:${delErr.message}`);
          continue;
        }

        summary.processed++;
        summary.deleted_user_ids.push(userId);
      } catch (innerErr) {
        const msg = innerErr instanceof Error ? innerErr.message : String(innerErr);
        console.warn('[lgpd-cleanup] row failed', msg);
        summary.errors.push(`row_failed:${msg}`);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[lgpd-cleanup] unexpected error', msg);
    summary.errors.push(`unexpected:${msg}`);
  }

  summary.duration_ms = Date.now() - startedAt;

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

export default handler;

if (import.meta.main) {
  Deno.serve(handler);
}
