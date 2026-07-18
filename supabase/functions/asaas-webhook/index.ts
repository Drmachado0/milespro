/**
 * asaas-webhook — Phase 2 W2a (Plan 02-05) — PAY-03 + CRIT-04.
 *
 * Receives Asaas subscription/payment events and drives the user_subscriptions
 * state machine (RESEARCH §3). Idempotent under duplicate delivery via the
 * (provider, event_id) UNIQUE constraint on webhook_events — Gate G-CRIT-04
 * is proven empirically by Task 7 (curl double-fire smoke).
 *
 * verify_jwt = false in supabase/config.toml. Asaas calls this endpoint
 * without a Supabase JWT; instead we validate the static `asaas-access-token`
 * header (operator-chosen secret, configured in both Deno env and the Asaas
 * Dashboard Webhooks settings) via constant-time compare.
 *
 * Event types handled (RESEARCH §2.5 + §3):
 *   PAYMENT_CONFIRMED, PAYMENT_RECEIVED  -> status='active', last_paid_at=now
 *   PAYMENT_CREATED                      -> status='trial' on first charge
 *   PAYMENT_OVERDUE                      -> status='past_due', +7d grace (D-04)
 *   PAYMENT_REFUNDED / PARTIALLY_REFUNDED -> status='canceled', plan='free'
 *   PAYMENT_CHARGEBACK_REQUESTED         -> status='disputed'
 *   PAYMENT_AWAITING_CHARGEBACK_REVERSAL -> status='active'
 *   PAYMENT_CHARGEBACK_DISPUTE           -> logged only
 *   SUBSCRIPTION_DELETED, SUBSCRIPTION_INACTIVATED -> status='canceled'
 *
 * Unknown events are logged in webhook_events with status='processed' so they
 * can be replayed manually if a new handler ships later.
 *
 * Resilience: handler errors are caught, the webhook_events row is marked
 * 'failed' with error_message, and we STILL return HTTP 200 — Asaas retries
 * forever on non-200 and we already captured the event for manual replay.
 * (Returning 5xx would cause Asaas to redeliver the same event repeatedly,
 * not what we want once webhook_events has the row.)
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { timingSafeEq as constantTimeEq } from '../_shared/timingSafeEq.ts';

// Re-export constantTimeEq so existing index.test.ts keeps working without rewrite.
export { constantTimeEq };

// === Push fan-out helpers (Plan 03-04b — MOBILE-04) ============================
// Best-effort: failures are logged but never abort the webhook state machine
// (CRIT-04 idempotency MUST be preserved — we already committed the row to
// webhook_events; the user's subscription state must reach 'canceled' /
// 'active' even if a downstream push fan-out fails).

/**
 * Fan out to cleanup-push-subscriptions on downgrade events
 * (refund / subscription canceled / payment overdue).
 * Mode 'single' wipes every push_subscriptions row for the user.
 */
async function fireCleanupPush(userId: string): Promise<void> {
  const token = Deno.env.get('PUSH_CLEANUP_AUTH_TOKEN') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  if (!token || !supabaseUrl) return;
  try {
    await fetch(`${supabaseUrl}/functions/v1/cleanup-push-subscriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId, mode: 'single' }),
    });
  } catch (err) {
    console.error('[asaas-webhook][cleanup-push fan-out failed]', err);
  }
}

/**
 * Fan out to enqueue-push for payment events (confirmed / received / overdue).
 * deep_link_path is always '/dashboard' — Path C: NEVER /assinatura on iOS.
 */
async function fireEnqueuePush(
  userId: string,
  eventType: 'payment_event',
  payload: { title: string; body: string; deep_link_path: string },
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
        event_type: eventType,
        user_id: userId,
        payload,
      }),
    });
  } catch (err) {
    console.error('[asaas-webhook][enqueue-push fan-out failed]', err);
  }
}
// === END push fan-out helpers =================================================

// Loose client alias — the generated database typings are not bundled with
// the edge function, so we deliberately keep the schema generic. Using
// ReturnType<typeof createClient> narrowed to <unknown, never, ...> which
// the runtime instance (returned by createClient(url, key), inferred as
// <any, "public", any>) was NOT assignable to — hence the 7x TS2345 from
// `deno test`. A dedicated alias centralises the variance fix.
type DbClient = SupabaseClient<any, 'public', any>;

const ASAAS_WEBHOOK_TOKEN = Deno.env.get('ASAAS_WEBHOOK_TOKEN');
if (!ASAAS_WEBHOOK_TOKEN) {
  console.warn(
    '[asaas-webhook] ASAAS_WEBHOOK_TOKEN not configured — every request will 403',
  );
}

type AsaasPayment = {
  id?: string;
  subscription?: string;
  externalReference?: string;
  paymentDate?: string;
  value?: number;
};

type AsaasSubscriptionRef = {
  id?: string;
};

type AsaasWebhookPayload = {
  id?: string;
  event?: string;
  payment?: AsaasPayment;
  subscription?: AsaasSubscriptionRef;
};

// Row shape returned by the .select() in handlePaymentSuccess — typed
// explicitly so .eq('id', sub.id) does not flow through as `unknown`
// (TS2345 at line 113 of the previous deno-test failure).
type UserSubscriptionRow = {
  id: string;
  user_id: string;
  plan: string | null;
  status: string | null;
};

// === Handlers ===

async function handlePaymentSuccess(
  supabase: DbClient,
  payment: AsaasPayment,
): Promise<void> {
  const subId = payment?.subscription;
  if (!subId) return;

  // Match by Asaas subscription id OR by externalReference (our UUID set
  // on create-checkout-session). The OR lets the very-first webhook win
  // even if asaas_subscription_id has not been written yet by the
  // create-checkout-session response handler (race window is small but
  // non-zero on a hot trial flow).
  const externalRef = payment.externalReference ?? '00000000-0000-0000-0000-000000000000';
  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('id, user_id, plan, status')
    .or(`asaas_subscription_id.eq.${subId},id.eq.${externalRef}`)
    .maybeSingle<UserSubscriptionRow>();

  if (!sub) {
    console.warn(
      '[asaas-webhook] PAYMENT_RECEIVED for unknown subscription',
      subId,
      'externalReference',
      externalRef,
    );
    return;
  }

  await supabase
    .from('user_subscriptions')
    .update({
      is_active: true,
      status: 'active',
      last_paid_at: payment.paymentDate ?? new Date().toISOString(),
      asaas_subscription_id: subId, // backfill if missing
      grace_period_ends_at: null, // clear grace period when payment lands
    })
    .eq('id', sub.id);

  // Plan 03-04b — fan out enqueue-push for payment_event (All tiers, no Pro+ gate).
  // pt-BR copy; deep_link_path='/dashboard' per Path C (NEVER /assinatura on iOS).
  if (sub.user_id) {
    await fireEnqueuePush(sub.user_id, 'payment_event', {
      title: 'Pagamento confirmado',
      body: 'Recebemos seu pagamento. Sua assinatura está ativa.',
      deep_link_path: '/dashboard',
    });
  }
}

async function handlePaymentCreated(
  supabase: DbClient,
  payment: AsaasPayment,
): Promise<void> {
  // Trial day-0 PAYMENT_CREATED -> flip pending_first_charge -> trial.
  const subId = payment?.subscription;
  if (!subId) return;

  // P1-1 (pre-launch audit): match by Asaas subscription id OR by
  // externalReference (our provisional UUID). Two reasons to OR:
  //   (a) Backfill race — if create-checkout-session's UPDATE
  //       asaas_subscription_id has not yet committed when this webhook
  //       fires, the row's asaas_subscription_id is NULL and the WHERE
  //       clause filters it out, so `started_at` would never be written.
  //   (b) Out-of-order webhooks — if PAYMENT_CONFIRMED already flipped
  //       status to 'active', `status='pending_first_charge'` no longer
  //       matches and the started_at write is silently dropped.
  // The targeted UPDATE below uses asaas_subscription_id IS NULL as a
  // signal to also backfill it in the same statement.
  const externalRef = payment.externalReference ?? '00000000-0000-0000-0000-000000000000';

  // First try the strict pending_first_charge path (trial day 0).
  const { data: pendingRows } = await supabase
    .from('user_subscriptions')
    .update({
      status: 'trial',
      asaas_subscription_id: subId,
      started_at: new Date().toISOString(),
    })
    .or(`asaas_subscription_id.eq.${subId},id.eq.${externalRef}`)
    .eq('status', 'pending_first_charge')
    .select('id');

  if (pendingRows && pendingRows.length > 0) return;

  // Defensive: if status already advanced (PAYMENT_CONFIRMED arrived first),
  // still ensure started_at is populated and asaas_subscription_id is linked
  // — without trampling the status. We only write started_at if it is null
  // so a later PAYMENT_CREATED replay cannot reset it.
  await supabase
    .from('user_subscriptions')
    .update({
      asaas_subscription_id: subId,
      started_at: new Date().toISOString(),
    })
    .or(`asaas_subscription_id.eq.${subId},id.eq.${externalRef}`)
    .is('started_at', null);
}

async function handlePaymentOverdue(
  supabase: DbClient,
  payment: AsaasPayment,
): Promise<void> {
  const subId = payment?.subscription;
  if (!subId) return;

  const gracePeriodEnd = new Date(Date.now() + 7 * 86400000).toISOString();
  // Fetch the user_id BEFORE the update so we can fan out both push notifications.
  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('user_id')
    .eq('asaas_subscription_id', subId)
    .maybeSingle<{ user_id: string }>();

  await supabase
    .from('user_subscriptions')
    .update({
      status: 'past_due',
      grace_period_ends_at: gracePeriodEnd,
    })
    .eq('asaas_subscription_id', subId);

  // Plan 03-04b — fan-outs:
  //   1) cleanup-push (defensive: user is in grace period, may not be Pro anymore)
  //   2) enqueue-push payment_event ("em atraso") so the user knows to regularize
  if (sub?.user_id) {
    await fireCleanupPush(sub.user_id);
    await fireEnqueuePush(sub.user_id, 'payment_event', {
      title: 'Pagamento em atraso',
      body: 'Sua assinatura está com pagamento em atraso. Toque para regularizar.',
      deep_link_path: '/dashboard',
    });
  }

  // Future: trigger send-client-email with PaymentFailedEmail template.
  // Plan 02-04 ships the template; wire-in is deferred to a backlog item
  // because send-client-email needs auth-friendly signature work.
}

async function handleRefund(
  supabase: DbClient,
  payment: AsaasPayment,
): Promise<void> {
  const subId = payment?.subscription;
  if (!subId) return;

  // Fetch user_id BEFORE plan changes — once plan='free', the row is still
  // there but the user has been downgraded; we use the captured id for cleanup.
  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('user_id')
    .eq('asaas_subscription_id', subId)
    .maybeSingle<{ user_id: string }>();

  await supabase
    .from('user_subscriptions')
    .update({
      status: 'canceled',
      is_active: false,
      plan: 'free',
    })
    .eq('asaas_subscription_id', subId);

  // Plan 03-04b — fan out cleanup-push on downgrade. Full refunds downgrade
  // (plan='free') so removing push subscriptions is correct UX (Pro+ events
  // would now be rejected by has_plan and waste FCM quota).
  if (sub?.user_id) {
    await fireCleanupPush(sub.user_id);
  }
}

/**
 * Partial refund handler — distinct from `handleRefund`.
 *
 * Asaas semantics: `PAYMENT_PARTIALLY_REFUNDED` means part of a payment was
 * refunded but the subscription itself remains ACTIVE. The user keeps their
 * Pro/VIP access; collapsing the row to plan='free'+is_active=false would
 * incorrectly cancel a paying customer just because they got a goodwill
 * refund on one cycle.
 *
 * For now we log loudly so operations can spot any case where Asaas combines
 * partial refunds with subscription cancellation (manual reconciliation
 * via reconcile-asaas-subscriptions cron is the safety net).
 */
async function handlePartialRefund(
  _supabase: DbClient,
  payment: AsaasPayment,
): Promise<void> {
  const subId = payment?.subscription;
  if (!subId) return;
  console.warn(
    '[asaas-webhook] Partial refund — subscription remains active',
    JSON.stringify({
      subscription_id: subId,
      payment_id: payment.id ?? 'unknown',
    }),
  );
  // No status mutation. No cleanup-push fan-out. The user keeps their access.
}

async function handleChargebackRequested(
  supabase: DbClient,
  payment: AsaasPayment,
): Promise<void> {
  const subId = payment?.subscription;
  if (!subId) return;

  await supabase
    .from('user_subscriptions')
    .update({ status: 'disputed' })
    .eq('asaas_subscription_id', subId);

  console.warn(
    '[asaas-webhook] Chargeback requested — manual review needed for',
    subId,
  );
}

async function handleChargebackReversed(
  supabase: DbClient,
  payment: AsaasPayment,
): Promise<void> {
  const subId = payment?.subscription;
  if (!subId) return;

  await supabase
    .from('user_subscriptions')
    .update({ status: 'active' })
    .eq('asaas_subscription_id', subId);
}

async function handleSubscriptionCanceled(
  supabase: DbClient,
  subscription: AsaasSubscriptionRef,
): Promise<void> {
  const subId = subscription?.id;
  if (!subId) return;

  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('user_id')
    .eq('asaas_subscription_id', subId)
    .maybeSingle<{ user_id: string }>();

  await supabase
    .from('user_subscriptions')
    .update({
      status: 'canceled',
      is_active: false,
      plan: 'free',
    })
    .eq('asaas_subscription_id', subId);

  // Plan 03-04b — fan out cleanup-push on subscription cancellation.
  if (sub?.user_id) {
    await fireCleanupPush(sub.user_id);
  }
}

// === Main handler (exported for tests) ===

export async function handler(req: Request): Promise<Response> {
  // 1. AuthN — constant-time compare on asaas-access-token header
  const incoming = req.headers.get('asaas-access-token') ?? '';
  if (!ASAAS_WEBHOOK_TOKEN || !constantTimeEq(incoming, ASAAS_WEBHOOK_TOKEN)) {
    return new Response('Forbidden', { status: 403 });
  }

  // 2. Parse body
  let body: AsaasWebhookPayload;
  try {
    body = (await req.json()) as AsaasWebhookPayload;
  } catch {
    return new Response('Bad request: invalid JSON', { status: 400 });
  }

  const eventId = body.id;
  const eventType = body.event;
  const payment = body.payment;
  const subscription = body.subscription;

  if (!eventId || !eventType) {
    return new Response('Bad request: missing id or event', { status: 400 });
  }

  // 3. Idempotency — INSERT first, side effects after (CRIT-04 primitive)
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      '[asaas-webhook] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY unset',
    );
    return new Response('Server misconfigured', { status: 500 });
  }
  // See reference_deno_supabase_client_leak: service-role clients must
  // disable autoRefreshToken+persistSession or Deno strict tests flag the
  // default setInterval as an unfinished interval leak.
  const supabase: DbClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: insertErr } = await supabase
    .from('webhook_events')
    .insert({
      provider: 'asaas',
      event_id: eventId,
      event_type: eventType,
      payload: body,
      status: 'processing',
    });

  if (insertErr) {
    // 23505 = unique_violation — duplicate (provider, event_id). This IS the
    // idempotency mechanism: short-circuit with 200 and zero side effects.
    if ((insertErr as { code?: string }).code === '23505') {
      return new Response('OK (duplicate ignored)', { status: 200 });
    }
    console.error('[asaas-webhook] webhook_events insert failed', insertErr);
    return new Response(insertErr.message ?? 'Insert failed', { status: 500 });
  }

  // 4. Dispatch on event type (RESEARCH §3 state machine)
  try {
    switch (eventType) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        await handlePaymentSuccess(supabase, payment ?? {});
        break;
      case 'PAYMENT_CREATED':
        await handlePaymentCreated(supabase, payment ?? {});
        break;
      case 'PAYMENT_OVERDUE':
        await handlePaymentOverdue(supabase, payment ?? {});
        break;
      case 'PAYMENT_REFUNDED':
        await handleRefund(supabase, payment ?? {});
        break;
      case 'PAYMENT_PARTIALLY_REFUNDED':
        await handlePartialRefund(supabase, payment ?? {});
        break;
      case 'PAYMENT_CHARGEBACK_REQUESTED':
        await handleChargebackRequested(supabase, payment ?? {});
        break;
      case 'PAYMENT_CHARGEBACK_DISPUTE':
        // log only — disposition handled separately
        break;
      case 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL':
        await handleChargebackReversed(supabase, payment ?? {});
        break;
      case 'SUBSCRIPTION_DELETED':
      case 'SUBSCRIPTION_INACTIVATED':
        await handleSubscriptionCanceled(supabase, subscription ?? {});
        break;
      default:
        // Unknown event type — logged in webhook_events for replay.
        // No action needed; status moves to 'processed' below so it does not
        // appear as a stuck 'processing' row in ops dashboards.
        break;
    }

    await supabase
      .from('webhook_events')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('provider', 'asaas')
      .eq('event_id', eventId);

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('[asaas-webhook] handler error', err);
    await supabase
      .from('webhook_events')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : String(err),
      })
      .eq('provider', 'asaas')
      .eq('event_id', eventId);

    // Return 200 — Asaas retries on non-200 indefinitely. We already logged
    // the event for manual replay; the reconcile cron also catches drift
    // nightly.
    return new Response('OK (logged for retry)', { status: 200 });
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}

