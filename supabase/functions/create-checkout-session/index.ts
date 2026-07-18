/**
 * create-checkout-session — Phase 2 W2a (Plan 02-05) — PAY-02 + PAY-06 + PAY-07.
 *
 * Builds an Asaas subscription against the sandbox API for the authenticated
 * user. Returns the hosted-checkout URL the user redirects to so they can
 * select billing method (Pix / Cartão / Boleto) and complete payment.
 *
 * Trial mechanics (D-03, PAY-06): nextDueDate = today + 7 days. Card is
 * tokenized at hosted-checkout time, the first charge fires on day 8
 * unless the user cancels in the meantime. Asaas's customer.cpfCnpj
 * dedupe blocks the same CPF from creating a second trial (HIGH-01
 * primary defense — DB profiles.cpf UNIQUE is belt-and-suspenders).
 *
 * Three billing cycles (D-02, PAY-07): monthly / semiannual / annual,
 * mapped to Asaas MONTHLY / SEMIANNUALLY / YEARLY. Six (plan x cycle)
 * combinations all hard-coded in PRICE_TABLE.
 *
 * verify_jwt=false in supabase/config.toml — we manually read
 * Authorization header inside the handler so we control the 401 envelope
 * shape (Supabase's default unauthenticated 401 wrapper would clobber
 * our JSON error body).
 *
 * Idempotency: same user clicking checkout twice spawns a new provisional
 * user_subscriptions row + a new Asaas subscription. Asaas-side dedupe
 * (customer.cpfCnpj UNIQUE) blocks the *trial* dupe but not duplicate
 * subscriptions on the same customer — backlog item to revisit when
 * conversion telemetry shows it matters.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  getCorsHeaders,
  handleCorsPreflight,
} from '../_shared/cors.ts';
import { parseAndValidate, z } from '../_shared/validate.ts';

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
const ASAAS_ENV = Deno.env.get('ASAAS_ENV') ?? 'sandbox';
const ASAAS_BASE =
  ASAAS_ENV === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://api-sandbox.asaas.com/v3';

// PAY-08 (W3 Task 3 / D-22) — NFS-e auto-issuance.
// Gated by ASAAS_ENV=production: sandbox checkouts must NOT send
// `invoice.enabled=true` because Asaas-sandbox rejects without a configured
// municipal setting, breaking the entire sandbox checkout flow. In production,
// operator can still kill-switch via `ASAAS_INVOICE_ENABLED=false` if the
// municipal API breaks or PJ/municipal setup is incomplete.
// W3 cutover runbook: `02-07-NFSE-MUNICIPAL-SETUP.md`.
const INVOICE_ENABLED =
  ASAAS_ENV === 'production' && Deno.env.get('ASAAS_INVOICE_ENABLED') !== 'false';

// PRICE_TABLE — D-01 + D-02. Locked in CONTEXT.md.
// Pro: 37.90 / 203.46 / 363.84
// VIP: 67.90 / 365.10 / 652.32
//
// Asaas value semantics: per-period charge (not per-month-normalized).
// MRR math in mrr-dashboard divides by CYCLE_MONTHS to get monthly figure.
const PRICE_TABLE = {
  pro: {
    monthly: 37.90,
    semiannual: 203.46,
    annual: 363.84,
  },
  vip: {
    monthly: 67.90,
    semiannual: 365.10,
    annual: 652.32,
  },
} as const;

const CYCLE_MAP = {
  monthly: 'MONTHLY',
  semiannual: 'SEMIANNUALLY',
  annual: 'YEARLY',
} as const;

const requestSchema = z.object({
  plan: z.enum(['pro', 'vip']),
  cycle: z.enum(['monthly', 'semiannual', 'annual']),
  // CPF is optional here — flow A: user already filled it during signup
  // (read from profiles row). Flow B: user didn't, frontend sends it.
  cpf: z.string().regex(/^\d{11}$/).optional(),
});

type AsaasCustomer = {
  id: string;
  name?: string;
  email?: string;
  cpfCnpj?: string;
};

/**
 * Sanitize raw Asaas error responses before propagating to the client.
 *
 * Asaas echoes back submitted fields in validation errors — CPF, email, full
 * name. Passing those payloads unchanged into the JSON response would feed
 * them into the browser's console and any client-side telemetry (PostHog
 * breadcrumb, Sentry beforeSend), violating HIGH-03 and LGPD principle 8.
 *
 * The shape `{ errors: [{ code, description }] }` is documented in the Asaas
 * v3 API; we surface only the first error's `code` (for client-side mapping)
 * and a regex-scrubbed `description` (truncated to 500 chars to bound size).
 * Falls back to a generic message when the payload does not parse.
 */
function sanitizeAsaasError(raw: unknown): { code?: string; message: string } {
  const scrub = (s: string): string =>
    s
      // CPF/CNPJ as 11-or-14 contiguous digits
      .replace(/\b\d{11}(?:\d{3})?\b/g, '[REDACTED]')
      // Formatted CPF (xxx.xxx.xxx-xx) and CNPJ (xx.xxx.xxx/xxxx-xx)
      .replace(/\b\d{2,3}[.\-/]\d{3}[.\-/]\d{3}[-/]?\d{2,4}\b/g, '[REDACTED]')
      // Email
      .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[REDACTED]');

  if (typeof raw === 'string') {
    try {
      return sanitizeAsaasError(JSON.parse(raw));
    } catch {
      return { message: scrub(raw).slice(0, 500) };
    }
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as { errors?: Array<{ code?: string; description?: string }> };
    const first = obj.errors?.[0];
    if (first) {
      return {
        code: first.code,
        message: scrub(first.description ?? 'Erro no processamento').slice(0, 500),
      };
    }
  }
  return { message: 'Erro no processamento do pagamento' };
}

type AsaasSubscription = {
  id: string;
  customer: string;
  value: number;
  cycle: string;
  nextDueDate: string;
  status?: string;
  externalReference?: string;
};

type AsaasPayment = {
  id: string;
  subscription: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
};

type AsaasPaymentPage = {
  data: AsaasPayment[];
};

/**
 * Get-or-create Asaas customer. Tries the cached profiles.asaas_customer_id
 * first, then falls back to GET /customers?cpfCnpj= (Asaas-side dedupe),
 * then finally POST /customers if neither hit.
 *
 * preferredLocale='pt-BR' (MED-01) on customer create only — Asaas does
 * not let you update it on existing customers.
 */
async function getOrCreateAsaasCustomer(params: {
  asaasApiKey: string;
  cachedCustomerId: string | null;
  email: string;
  name: string;
  cpf: string;
}): Promise<AsaasCustomer | { error: string; status: number; details?: unknown }> {
  const { asaasApiKey, cachedCustomerId, email, name, cpf } = params;

  // 1. Cached id wins
  if (cachedCustomerId) {
    return { id: cachedCustomerId };
  }

  // 2. Asaas-side dedupe via cpfCnpj
  const lookupRes = await fetch(
    `${ASAAS_BASE}/customers?cpfCnpj=${encodeURIComponent(cpf)}`,
    { headers: { access_token: asaasApiKey } },
  );
  if (lookupRes.ok) {
    const page = (await lookupRes.json()) as { data?: AsaasCustomer[] };
    if (page.data && page.data.length > 0) {
      return page.data[0];
    }
  }

  // 3. Create
  const createRes = await fetch(`${ASAAS_BASE}/customers`, {
    method: 'POST',
    headers: {
      access_token: asaasApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      email,
      cpfCnpj: cpf,
      preferredLocale: 'pt-BR', // MED-01
      notificationDisabled: false,
    }),
  });
  if (!createRes.ok) {
    const details = await createRes.text().catch(() => '');
    return {
      error: 'Failed to create Asaas customer',
      status: 502,
      details,
    };
  }
  return (await createRes.json()) as AsaasCustomer;
}

/**
 * Compute nextDueDate = today + 7 days, formatted YYYY-MM-DD (Asaas wants
 * date-only, not ISO timestamp).
 *
 * Exported for unit testing — D-03 trial-window math must stay locked at
 * exactly 7 days. Tests assert the offset numerically.
 */
export function computeNextDueDate(now: Date = new Date()): string {
  const d = new Date(now.getTime() + 7 * 86400000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return handleCorsPreflight(req);

  const corsHeaders = getCorsHeaders(req);

  if (!ASAAS_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'ASAAS_API_KEY unset — checkout disabled' }),
      {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  // 1. Auth — manual JWT read (verify_jwt=false in config.toml)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: 'Server misconfigured' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

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

  // 2. Validate body
  const validated = await parseAndValidate(req, requestSchema);
  if (!validated.ok) {
    return new Response(JSON.stringify({ error: validated.error }), {
      status: validated.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const { plan, cycle, cpf: bodyCpf } = validated.data;
  const value = PRICE_TABLE[plan][cycle];
  const asaasCycle = CYCLE_MAP[cycle];

  // 3. Load profile (cached customer id + cpf + name)
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('asaas_customer_id, cpf, full_name')
    .eq('id', user.id)
    .single();
  if (profileErr || !profile) {
    return new Response(
      JSON.stringify({ error: 'Profile not found' }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  type ProfileRow = {
    asaas_customer_id: string | null;
    cpf: string | null;
    full_name: string | null;
  };
  const typedProfile = profile as ProfileRow;
  const cpf = (bodyCpf ?? typedProfile.cpf ?? '').replace(/\D/g, '');
  if (cpf.length !== 11) {
    return new Response(
      JSON.stringify({ error: 'CPF required (11 digits)' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  // 4. Get-or-create Asaas customer
  const customerOrErr = await getOrCreateAsaasCustomer({
    asaasApiKey: ASAAS_API_KEY,
    cachedCustomerId: typedProfile.asaas_customer_id,
    email: user.email ?? '',
    name: typedProfile.full_name ?? user.email ?? 'MilesPro User',
    cpf,
  });
  if ('error' in customerOrErr) {
    console.error(
      '[create-checkout-session] customer create failed status=',
      customerOrErr.status,
    );
    const sanitized = sanitizeAsaasError(customerOrErr.details);
    return new Response(
      JSON.stringify({
        error: customerOrErr.error,
        code: sanitized.code,
        details: sanitized.message,
      }),
      {
        status: customerOrErr.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
  const customer = customerOrErr;

  // 4b. Cache customer id + cpf in profile for next time
  await supabase
    .from('profiles')
    .update({
      asaas_customer_id: customer.id,
      cpf,
    })
    .eq('id', user.id);

  // 5. Insert provisional row in user_subscriptions BEFORE Asaas call
  //    so externalReference points to a real row even if Asaas webhook
  //    races the create response.
  const provisionalId = crypto.randomUUID();
  const nextDueDate = computeNextDueDate();

  // Pick a per-cycle billing_period label that survives the existing schema.
  // user_subscriptions in Phase 1 had a TEXT billing_period column with values
  // like 'monthly' / 'yearly'. Keep the lowercase shape consumers expect.
  const { error: insertErr } = await supabase
    .from('user_subscriptions')
    .insert({
      id: provisionalId,
      user_id: user.id,
      plan,
      status: 'pending_first_charge',
      is_active: false,
      asaas_customer_id: customer.id,
      // billing_period existing column (if present); harmless if not (we use
      // the column-not-exists check Postgres gives back via insertErr).
      billing_period: cycle === 'annual' ? 'yearly' : cycle,
      price: value,
    });
  if (insertErr) {
    console.warn(
      '[create-checkout-session] provisional insert failed (may be billing_period column missing)',
      insertErr,
    );
    // Retry without billing_period/price columns if they do not exist on this
    // schema. Tolerant fallback — Phase 2 may evolve the columns.
    const { error: retryErr } = await supabase
      .from('user_subscriptions')
      .insert({
        id: provisionalId,
        user_id: user.id,
        plan,
        status: 'pending_first_charge',
        is_active: false,
        asaas_customer_id: customer.id,
      });
    if (retryErr) {
      return new Response(
        JSON.stringify({
          error: 'Failed to write provisional subscription',
          details: retryErr.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
  }

  // 6. Create Asaas subscription
  const subRes = await fetch(`${ASAAS_BASE}/subscriptions`, {
    method: 'POST',
    headers: {
      access_token: ASAAS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customer: customer.id,
      billingType: 'UNDEFINED', // user picks at hosted checkout
      value,
      nextDueDate, // PAY-06 — D-03 trial-card-on-file = today + 7d
      cycle: asaasCycle,
      description: `MilesPro — Plano ${plan} (${cycle})`,
      externalReference: provisionalId,
      // PAY-08 — invoice (NFS-e) auto-issuance. Default ON; operator can
      // disable per-deploy via `ASAAS_INVOICE_ENABLED=false` (e.g. while
      // municipal setup is incomplete or the municipal API is down). The
      // Asaas server itself rejects this block unless the customer has
      // municipalSettings configured — see 02-07-NFSE-MUNICIPAL-SETUP.md.
      ...(INVOICE_ENABLED ? { invoice: { enabled: true } } : {}),
    }),
  });

  if (!subRes.ok) {
    const rawDetails = await subRes.text().catch(() => '');
    console.error(
      '[create-checkout-session] Asaas subscription create failed status=',
      subRes.status,
    );
    // Roll back the provisional row so we do not leak orphans into the DB.
    await supabase
      .from('user_subscriptions')
      .delete()
      .eq('id', provisionalId);
    const sanitized = sanitizeAsaasError(rawDetails);
    return new Response(
      JSON.stringify({
        error: 'Failed to create Asaas subscription',
        code: sanitized.code,
        details: sanitized.message,
      }),
      {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  const subscription = (await subRes.json()) as AsaasSubscription;

  // 7. Backfill asaas_subscription_id on the provisional row.
  //
  // P1-2 (pre-launch audit): if this UPDATE silently fails (network blip,
  // PostgREST 5xx, RLS edge case), the user has a live Asaas subscription
  // billing them with no link to our DB row. The PAYMENT_RECEIVED webhook
  // can still correlate via externalReference (see handlePaymentSuccess in
  // asaas-webhook), but downstream consumers that match by
  // asaas_subscription_id only (reconcile-asaas-subscriptions, mrr-dashboard)
  // would miss the row indefinitely. So we now:
  //   1. Check the UPDATE error explicitly.
  //   2. On failure, attempt a best-effort DELETE of the Asaas subscription
  //      to avoid charging a customer we cannot track.
  //   3. Surface a 502 so the client retries on a clean slate.
  const { error: backfillErr } = await supabase
    .from('user_subscriptions')
    .update({ asaas_subscription_id: subscription.id })
    .eq('id', provisionalId);
  if (backfillErr) {
    console.error(
      '[create-checkout-session] CRITICAL: backfill asaas_subscription_id failed; attempting Asaas rollback',
      JSON.stringify({
        provisional_id: provisionalId,
        asaas_subscription_id: subscription.id,
        db_error: backfillErr.message,
      }),
    );
    // Best-effort rollback. If this DELETE also fails, ops will see two
    // loud log lines and can clean up manually using subscription.id.
    try {
      await fetch(`${ASAAS_BASE}/subscriptions/${subscription.id}`, {
        method: 'DELETE',
        headers: { access_token: ASAAS_API_KEY },
      });
    } catch (rollbackErr) {
      console.error(
        '[create-checkout-session] CRITICAL: Asaas rollback ALSO failed; orphan subscription',
        subscription.id,
        rollbackErr,
      );
    }
    // Clean up provisional row too — without the Asaas id it is junk.
    await supabase.from('user_subscriptions').delete().eq('id', provisionalId);
    return new Response(
      JSON.stringify({
        error: 'Failed to link subscription',
        details: 'Tente novamente em alguns minutos.',
      }),
      {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  // 8. Fetch the first charge to get the hosted checkout URL
  let checkoutUrl: string | null = null;
  try {
    const paymentsRes = await fetch(
      `${ASAAS_BASE}/subscriptions/${subscription.id}/payments`,
      { headers: { access_token: ASAAS_API_KEY } },
    );
    if (paymentsRes.ok) {
      const payments = (await paymentsRes.json()) as AsaasPaymentPage;
      const firstCharge = payments.data?.[0];
      checkoutUrl = firstCharge?.invoiceUrl ?? firstCharge?.bankSlipUrl ?? null;
    }
  } catch (err) {
    console.warn(
      '[create-checkout-session] failed to fetch first charge URL',
      err,
    );
  }

  return new Response(
    JSON.stringify({
      subscriptionId: provisionalId, // our UUID — useful for client telemetry
      asaasSubscriptionId: subscription.id,
      checkoutUrl,
      nextDueDate,
      plan,
      cycle,
      value,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
}

if (import.meta.main) {
  Deno.serve(handler);
}
