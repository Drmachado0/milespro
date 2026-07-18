# Architecture Research — MilesPro Ready-to-Scale Cycle

**Project:** MilesPro
**Researched:** 2026-05-11
**Scope:** Architectural CHANGES for billing + server-side gating + multi-CPF + observability + secret hygiene
**Mode:** Brownfield — does NOT redescribe existing architecture (see `.planning/codebase/ARCHITECTURE.md` for that).
**Overall confidence:** HIGH (Supabase RLS + Stripe webhook patterns are well-documented; Brazilian PIX gateways verified via WebSearch)

---

## Overview

The existing MilesPro architecture is a Supabase-backed SPA where **multi-tenancy is enforced via RLS on `user_id`**. The "ready-to-scale" cycle introduces four orthogonal concerns that bend that model:

1. **Plan-tier authorization** — RLS today only checks `auth.uid() = user_id`; it must additionally check `plan ∈ {pro, vip}` for premium tables.
2. **External source-of-truth for plan** — gateway (Stripe-or-equivalent) becomes the authoritative source; DB becomes a read-replica synced via webhook.
3. **Ownership graph** — a VIP user can read/write rows belonging to *other* `user_id`s (managed CPFs). The "user_id == auth.uid()" invariant breaks.
4. **Trust boundary clarification** — service-role key MUST live only in Deno edge functions; current `src/integrations/supabase/client.ts:7` violates this.

The high-level architectural change is: **introduce a thin "trust kernel" of SECURITY DEFINER functions in Postgres** that all RLS policies delegate to. Webhook → DB sync runs in an idempotent edge function. Multi-CPF ownership is modeled as an explicit `managed_accounts` table with bidirectional helper functions. Client code keeps doing what it does, but the server stops trusting it.

```text
┌──────────────────────────────────────────────────────────────────────┐
│                      TRUST BOUNDARIES (proposed)                     │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  CLIENT (untrusted)                                                  │
│    React SPA + Capacitor                                             │
│    - anon key only (publishable)                                     │
│    - reads useSubscription() for UI hints (show/hide upgrade CTA)    │
│    - all writes go through Supabase REST → RLS                       │
│                                                                      │
│  ════════════════════════════════════════════════════════════════    │
│                                                                      │
│  EDGE (semi-trusted, per-user JWT)                                   │
│    Supabase Edge Functions (Deno)                                    │
│    - verify_jwt = true (default flip)                                │
│    - service-role key from Deno.env (NEVER bundled)                  │
│    - stripe-webhook (verify_jwt=false but signature-verified)        │
│    - create-checkout-session (verify_jwt=true)                       │
│    - portal-session (verify_jwt=true)                                │
│                                                                      │
│  ════════════════════════════════════════════════════════════════    │
│                                                                      │
│  DB (trusted core)                                                   │
│    Postgres + RLS                                                    │
│    - all premium tables call public.has_plan(auth.uid(), 'pro')      │
│    - all multi-CPF tables call public.can_access_account(...)        │
│    - SECURITY DEFINER functions are the trust kernel                 │
│    - webhook_events table provides idempotency                       │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Plan Gating (Server-Side)

### Trust Kernel: SECURITY DEFINER Functions

Every premium-gated RLS policy MUST delegate to a single function. Inlining `EXISTS (SELECT 1 FROM user_subscriptions ...)` in every policy is the trap — it forces touching dozens of policies on every plan-shape change and creates infinite recursion risk if `user_subscriptions` itself ever needs to reference these tables.

The existing `public.can_access_feature(_user_id, _feature)` (`supabase/migrations/20251228134346_...sql:79`) is the right shape but is currently unused in any policy. Two changes:

1. **Mark it `STABLE` and `SECURITY DEFINER`** (already is — good).
2. **Tighten the feature taxonomy** — current 5-value enum vs 3-value TS mismatch (CONCERNS.md item #8) becomes a footgun under RLS. Consolidate to `'free' | 'pro' | 'vip'` BEFORE applying RLS plan-checks; rolling back a plan rename inside RLS is painful.

Add a thinner companion specifically for plan-tier gates:

```sql
-- Returns true if user is on the given plan or higher.
-- STABLE = Postgres can cache within a single statement.
-- SECURITY DEFINER = bypasses RLS on user_subscriptions itself.
CREATE OR REPLACE FUNCTION public.has_plan(_user_id uuid, _required_plan subscription_plan)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan subscription_plan;
BEGIN
  SELECT plan INTO user_plan
  FROM public.user_subscriptions
  WHERE user_id = _user_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());

  IF user_plan IS NULL THEN
    RETURN _required_plan = 'free';
  END IF;

  -- Hierarchy: vip > pro > free
  RETURN CASE _required_plan
    WHEN 'free' THEN true
    WHEN 'pro'  THEN user_plan IN ('pro', 'vip')
    WHEN 'vip'  THEN user_plan = 'vip'
  END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.has_plan FROM public;
GRANT  EXECUTE ON FUNCTION public.has_plan TO authenticated;
```

### RLS Pattern for `travel_*` Tables (Pro tier)

Apply identically to `travel_clients`, `travel_tickets`, `travel_hotels`, `travel_cars`, `travel_cruises`, `travel_insurances`, `travel_attractions`, `travel_transfers`, `travel_quotes`. Existing migration `20260131123615_...sql` only checks `user_id`; replace with:

```sql
-- Drop the lax existing policies first
DROP POLICY IF EXISTS "Users can view their own cruises"   ON public.travel_cruises;
DROP POLICY IF EXISTS "Users can create their own cruises" ON public.travel_cruises;
DROP POLICY IF EXISTS "Users can update their own cruises" ON public.travel_cruises;
DROP POLICY IF EXISTS "Users can delete their own cruises" ON public.travel_cruises;

-- New plan-aware policies
CREATE POLICY "travel_cruises_select"
ON public.travel_cruises FOR SELECT
USING (
  auth.uid() = user_id
  AND public.has_plan(auth.uid(), 'pro')
);

CREATE POLICY "travel_cruises_insert"
ON public.travel_cruises FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND public.has_plan(auth.uid(), 'pro')
);

CREATE POLICY "travel_cruises_update"
ON public.travel_cruises FOR UPDATE
USING      (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'))
WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));

CREATE POLICY "travel_cruises_delete"
ON public.travel_cruises FOR DELETE
USING (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));
```

**Why both `USING` and `WITH CHECK`:** `USING` filters which rows are visible/affected; `WITH CHECK` validates the new row state on INSERT/UPDATE. Forgetting `WITH CHECK` on UPDATE lets a downgraded user mutate fields on their existing rows.

**Why include `auth.uid() = user_id` in SELECT** (in addition to plan check): Defense in depth. If the plan check is ever weakened, isolation still holds.

### RLS Pattern for `vip_*` Tables (VIP tier)

```sql
CREATE POLICY "vip_lounge_visits_select"
ON public.vip_lounge_visits FOR SELECT
USING (
  public.can_access_account(auth.uid(), user_id)  -- multi-CPF aware (see below)
  AND public.has_plan(auth.uid(), 'vip')
);

-- Same shape for INSERT/UPDATE/DELETE with WITH CHECK
```

### Downgrade Behavior — Critical Decision

When a Pro user downgrades to Free, what happens to their `travel_*` rows?

- **Hard isolation (`USING` blocks SELECT):** Rows become invisible. Re-upgrading restores access. **Risk:** support tickets ("where did my data go?").
- **Soft isolation (`USING` allows SELECT, only INSERT/UPDATE blocked):** User keeps reading old data, can't add new. **Recommended for v1** — preserves data, prevents revenue leakage on writes.

```sql
-- Soft isolation pattern (recommended)
CREATE POLICY "travel_cruises_select"
ON public.travel_cruises FOR SELECT
USING (auth.uid() = user_id);  -- read-only after downgrade

CREATE POLICY "travel_cruises_insert"
ON public.travel_cruises FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));
```

### Where Plan Gating Lives — Component Boundary

| Layer | What it does | Why it exists |
|-------|--------------|---------------|
| **Sidebar / nav filter** (`src/components/layout/Sidebar.tsx`) | Hide nav items for plans the user lacks | UX hint — don't tease features they can't use |
| **`<PlanProtectedRoute>`** | Redirect to `/assinatura` on direct URL | UX — friendly upsell flow, not a security gate |
| **`useSubscription()` in components** | Show/hide upgrade CTAs, disable buttons | UX hint only |
| **Server-side RLS via `has_plan()`** | **The actual security boundary** | Stops `curl POST /rest/v1/travel_*` from bypassing UI |
| **Edge function pre-checks** (optional) | Reject early before hitting DB | Latency optimization, returns clearer error than RLS denial |

**Rule:** Client-side checks are convenience. The DB is the only thing that matters for authorization. Component-side checks must NEVER be removed (UX would degrade) but they must NEVER be the only check.

---

## Webhook Architecture

### Why Edge Function (Not Background Worker)

| Option | Verdict | Why |
|--------|---------|-----|
| **Supabase Edge Function** | ✓ Recommended | Already in stack. Native Stripe SDK support. Auto-scales. Stripe retries handle transient failures. |
| **Background worker (e.g. pg_cron + queue table)** | ✗ Defer | Adds infra. Over-engineered for v1. Could be added later if webhook volume grows. |
| **Serverless on Vercel/Netlify** | ✗ Out of stack | New runtime, new secrets, new monitoring. No benefit. |

### Gateway Selection Note

Stripe is the assumed gateway based on existing references (`useSubscription.ts` has `stripe_subscription_id` column; `Privacidade.tsx:56` mentions Stripe). For BR market, Stripe BR + boleto + PIX support is GA as of 2024/2025. Alternatives (Pagar.me, Asaas, Iugu, Stark Bank) have similar webhook architectures — the patterns below transfer with minor field-name changes.

### Idempotency Strategy

**Stripe sends each webhook 1+ times.** The function MUST be safe to invoke twice with the same event.

```sql
-- Idempotency table — append-only ledger
CREATE TABLE public.webhook_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        text NOT NULL,                         -- 'stripe' (future-proofs for multi-gateway)
  event_id        text NOT NULL,                         -- evt_1Abc... (Stripe ID, globally unique per provider)
  event_type      text NOT NULL,                         -- 'customer.subscription.updated', etc.
  payload         jsonb NOT NULL,                        -- raw event for replay/debug
  status          text NOT NULL DEFAULT 'received',      -- received | processed | failed | skipped
  processed_at    timestamptz,
  error_message   text,
  retry_count     int  NOT NULL DEFAULT 0,
  received_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT webhook_events_provider_event_id_unique UNIQUE (provider, event_id)
);

CREATE INDEX idx_webhook_events_status_received
  ON public.webhook_events (status, received_at)
  WHERE status IN ('received', 'failed');

-- No RLS for users; SELECT only via service role (admin dashboard)
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
-- (no policies = no access for authenticated users; service-role bypasses RLS)
```

**Idempotency key format:** `(provider, event_id)`. Stripe's `event.id` is globally unique within a Stripe account. The UNIQUE constraint above means a duplicate INSERT fails with `23505` — the function catches this and returns `200 OK` to Stripe (already processed).

### Webhook Function Structure

```
supabase/functions/stripe-webhook/index.ts
  - verify_jwt = false  (Stripe doesn't send JWT)
  - signature verified via Stripe-Signature header + STRIPE_WEBHOOK_SECRET
  - flow:
    1. Read raw body (signature verification needs unmodified bytes)
    2. stripe.webhooks.constructEventAsync(body, sig, secret)  ← throws on bad sig
    3. INSERT INTO webhook_events (...) ← UNIQUE constraint = idempotency
       - On conflict: return 200, log "duplicate"
    4. Switch on event.type:
       - customer.subscription.created → INSERT/UPSERT user_subscriptions
       - customer.subscription.updated → UPDATE plan/period
       - customer.subscription.deleted → UPDATE is_active=false
       - invoice.payment_failed       → UPDATE grace_period_until
       - invoice.payment_succeeded    → clear grace_period
    5. UPDATE webhook_events SET status='processed', processed_at=now()
    6. Return 200
  - On any error after step 3: UPDATE status='failed', error_message=...; return 500
    (Stripe retries with exponential backoff for ~3 days)
```

### Mapping Stripe Customer → Supabase User

The link between `stripe.customer` and `auth.users.id` MUST be established at checkout creation (NOT discovered from webhooks):

```sql
ALTER TABLE public.user_subscriptions
  ADD COLUMN stripe_customer_id text,
  ADD COLUMN stripe_subscription_id text,  -- already exists per migration
  ADD COLUMN current_period_end timestamptz,
  ADD COLUMN grace_period_until timestamptz,
  ADD COLUMN cancel_at_period_end boolean DEFAULT false;

CREATE UNIQUE INDEX idx_user_subscriptions_stripe_customer
  ON public.user_subscriptions (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
```

**Flow for binding:**
1. User clicks "Upgrade to Pro" → `create-checkout-session` edge function (verify_jwt=true)
2. Function: `auth.getUser()` → `stripe.customers.create({ metadata: { supabase_user_id: user.id } })`
3. Save `stripe_customer_id` to `user_subscriptions` immediately (don't wait for webhook)
4. `stripe.checkout.sessions.create({ customer, ... })` → return URL
5. User completes payment in Stripe-hosted Checkout
6. Stripe sends `checkout.session.completed` webhook → handler reads `customer` → updates `user_subscriptions` by `stripe_customer_id`

**Why metadata.supabase_user_id:** Disaster-recovery key. If the `stripe_customer_id` mapping is ever lost in DB, the metadata on the Stripe side recovers it.

### Race Conditions to Handle

1. **Webhook arrives before checkout-session response is processed by client.** OK — webhook is the source of truth; client's later refetch catches up.
2. **Two webhooks for same subscription arrive in wrong order** (`updated` before `created`). Use `event.created` timestamp; reject if the event being processed is older than the last processed event for that `stripe_subscription_id`.
3. **Manual DB edits diverge from Stripe.** Document policy: "DB is replica, Stripe is truth. Reconcile via daily `stripe sync` script (Phase X+1)."

---

## Multi-CPF Data Model

### Problem Statement

VIP users (consultants, family managers) need to view and edit data belonging to other CPFs they "manage." Each managed CPF may or may not have its own login. Two patterns exist; the recommendation depends on whether managed accounts log in.

### Pattern A — Managed Accounts as Real Users (Recommended)

**Concept:** Every managed account IS an `auth.users` row. The VIP user has an *ownership relationship* to those users. RLS allows the VIP to act on the managed user's behalf.

**Pros:** Each CPF can later be promoted to a self-managed login. Single data model. Standard `user_id` references everywhere.
**Cons:** Inflates `auth.users` count (Supabase pricing: 50K MAU free, then $0.00325/MAU). Needs handling for "headless" users that never log in.

```sql
-- Ownership graph
CREATE TABLE public.managed_accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  managed_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    text NOT NULL,                 -- "João Silva (cliente)"
  cpf             text,                          -- masked/encrypted at rest, optional
  relationship    text NOT NULL,                 -- 'family' | 'client' | 'self'
  is_headless     boolean NOT NULL DEFAULT true, -- true = never logs in
  created_at      timestamptz NOT NULL DEFAULT now(),
  revoked_at      timestamptz,                   -- soft delete (preserve audit trail)
  CONSTRAINT managed_accounts_unique UNIQUE (owner_user_id, managed_user_id),
  CONSTRAINT managed_accounts_no_self CHECK (owner_user_id <> managed_user_id)
);

-- RLS on the ownership table itself
ALTER TABLE public.managed_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_can_view_managed"
ON public.managed_accounts FOR SELECT
USING (auth.uid() = owner_user_id);

CREATE POLICY "owner_vip_can_create_managed"
ON public.managed_accounts FOR INSERT
WITH CHECK (
  auth.uid() = owner_user_id
  AND public.has_plan(auth.uid(), 'vip')
);

CREATE POLICY "owner_can_revoke_managed"
ON public.managed_accounts FOR UPDATE
USING (auth.uid() = owner_user_id)
WITH CHECK (auth.uid() = owner_user_id);

-- The kernel function used by ALL multi-CPF-aware policies
CREATE OR REPLACE FUNCTION public.can_access_account(
  _viewer_user_id uuid,
  _target_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Self always OK
    _viewer_user_id = _target_user_id
    OR
    -- VIP owner of the target
    EXISTS (
      SELECT 1 FROM public.managed_accounts ma
      WHERE ma.owner_user_id   = _viewer_user_id
        AND ma.managed_user_id = _target_user_id
        AND ma.revoked_at IS NULL
        AND public.has_plan(_viewer_user_id, 'vip')
    );
$$;

REVOKE EXECUTE ON FUNCTION public.can_access_account FROM public;
GRANT  EXECUTE ON FUNCTION public.can_access_account TO authenticated;
```

### Applying to Domain Tables

For tables that need multi-CPF visibility (e.g., `operations`, `program_balances`, `vip_lounge_visits`), the existing `auth.uid() = user_id` is replaced with `public.can_access_account(auth.uid(), user_id)`:

```sql
-- BEFORE (current)
CREATE POLICY "ops_select" ON public.operations FOR SELECT
USING (auth.uid() = user_id);

-- AFTER (multi-CPF)
CREATE POLICY "ops_select" ON public.operations FOR SELECT
USING (public.can_access_account(auth.uid(), user_id));

CREATE POLICY "ops_insert" ON public.operations FOR INSERT
WITH CHECK (public.can_access_account(auth.uid(), user_id));
-- INSERTs from VIP create rows owned by the managed_user_id, not the VIP
```

**For `travel_*` tables:** Combine both checks:
```sql
CREATE POLICY "travel_cruises_insert" ON public.travel_cruises FOR INSERT
WITH CHECK (
  public.can_access_account(auth.uid(), user_id)
  AND public.has_plan(auth.uid(), 'pro')
);
```

### Pattern B — Managed Accounts as Pure Data Rows (Rejected)

Single `auth.users` row owns everything; managed CPFs are just rows in `managed_profiles` with no `auth.users` link, and every domain table gains a `managed_account_id` column.

**Why rejected:** Migration nightmare (every existing domain table gains a column; every existing query changes); hard to ever promote a managed CPF to a real login without backfilling `user_id` everywhere; loses the elegance of one-RLS-pattern-fits-all.

### Headless User Creation

Managed accounts that don't log in still need an `auth.users` row. Create via service-role from edge function:

```typescript
// supabase/functions/create-managed-account/index.ts
// verify_jwt = true
// 1. Verify caller has VIP via has_plan()
// 2. supabaseAdmin.auth.admin.createUser({
//      email: `headless-${uuid}@managed.milespro.invalid`,  // synthetic
//      email_confirm: true,
//      user_metadata: { is_headless: true, managed_by: callerUserId }
//    })
// 3. INSERT INTO managed_accounts (owner_user_id, managed_user_id, ...)
// 4. Return managed user ID
```

Synthetic emails on `.invalid` TLD prevent accidental "forgot password" flows from succeeding. Filter these out from MAU billing and analytics.

### Encryption at Rest for CPFs

CPF is sensitive PII under LGPD. Don't store plaintext in `managed_accounts.cpf`:

```sql
-- Use pgsodium (Supabase Vault) for CPF encryption
-- Stored as encrypted bytea; decrypted via SECURITY DEFINER function on read
ALTER TABLE public.managed_accounts
  ALTER COLUMN cpf TYPE bytea USING pgp_sym_encrypt(cpf, current_setting('app.cpf_key'));
```

(Detail level here is appropriate — Phase X "LGPD compliance" should own the implementation. Flagging for that phase.)

---

## Secret Separation

| Secret | Storage | Visible to | Notes |
|--------|---------|------------|-------|
| `SUPABASE_URL` | `VITE_SUPABASE_URL` env (build-time) + `vite.config.ts:12-13` fallback | Public bundle | Safe to ship; remove fallback to fail-fast on misconfig |
| `SUPABASE_PUBLISHABLE_KEY` (anon) | `VITE_SUPABASE_PUBLISHABLE_KEY` env | Public bundle | Safe to ship; **remove the hardcoded JWT fallback in `vite.config.ts:14`** — masks misconfigured deploys, locks historical builds to dead keys after rotation |
| `SUPABASE_SERVICE_ROLE_KEY` | `Deno.env` inside edge functions only | Server only | **DELETE the `VITE_` reference and `supabaseAdmin` export from `src/integrations/supabase/client.ts:7,22-29`** — `import.meta.env.VITE_*` is build-time substitution, ships to client. Never use `VITE_` prefix on this. |
| `STRIPE_SECRET_KEY` | Edge function env (`Deno.env.get('STRIPE_SECRET_KEY')`) | Server only | Set via `supabase secrets set` — never in `.env` shipped to bundler |
| `STRIPE_WEBHOOK_SECRET` | Edge function env, separate from secret key | Server only | One per webhook endpoint; different in dev vs prod |
| `STRIPE_PUBLISHABLE_KEY` | `VITE_STRIPE_PUBLISHABLE_KEY` | Public bundle | Safe — used by Stripe.js for tokenizing cards |
| `OAUTH_STATE_SECRET` (Google Calendar HMAC) | New `Deno.env` var | Server only | Currently reuses `SUPABASE_SERVICE_ROLE_KEY` (`google-calendar-auth/index.ts:12`) — split per CONCERNS.md MEDIUM finding |
| `POSTHOG_API_KEY` | `VITE_POSTHOG_KEY` | Public bundle | Project-write key (intended public); admin/personal API key MUST stay server-side |
| `SENTRY_DSN` | `VITE_SENTRY_DSN` | Public bundle | Public by design; auth via project ID embedded in DSN |

### Build-Time Fail-Fast Guard

Add a Vite plugin (or simple build script) that fails the build if any `VITE_*SERVICE_ROLE*` var or `VITE_*SECRET*` is set:

```typescript
// vite.config.ts
function failOnSecretLeak(): Plugin {
  return {
    name: 'fail-on-secret-leak',
    config(_, { mode }) {
      const dangerous = Object.keys(process.env).filter(k =>
        /^VITE_.*(SERVICE_ROLE|SECRET_KEY|WEBHOOK_SECRET|PRIVATE_KEY)/.test(k)
      );
      if (dangerous.length > 0) {
        throw new Error(
          `Refusing to build: dangerous VITE_* vars would ship to bundle: ${dangerous.join(', ')}`
        );
      }
    }
  };
}
```

This is non-negotiable — it's the only mechanical safeguard against the SEC-03 footgun (CONCERNS.md HIGH).

### Edge Function vs Client — Where Plan-Tier-Aware Queries Go

| Use case | Where | Why |
|----------|-------|-----|
| Reading user's own subscription | Client → REST + RLS | RLS already permits SELECT on own `user_subscriptions` |
| Listing managed accounts | Client → REST + RLS | RLS via `owner_user_id = auth.uid()` |
| Creating Stripe checkout session | Edge function | Requires `STRIPE_SECRET_KEY` |
| Cancelling subscription | Edge function (calls Stripe API) | Same |
| Switching context to managed CPF (read their dashboard) | Client → REST + RLS via `can_access_account()` | RLS handles auth automatically |
| Creating headless managed user | Edge function | Requires service-role for `auth.admin.createUser` |
| Reading aggregate MRR / churn | Edge function (already exists: `mrr-dashboard`) | Cross-user query — needs service role |
| Webhook handler | Edge function | Requires service role + Stripe signature verification |

**Rule:** If the query crosses user boundaries OR needs a server-only secret, it lives in an edge function. Otherwise client + RLS handles it.

---

## Observability Boundary

### Three Streams, Three Concerns

| Stream | Tool | What it captures | Where it runs |
|--------|------|------------------|---------------|
| **Product analytics** | PostHog | Events: `signup_completed`, `paywall_viewed`, `upgrade_clicked`, `pro_feature_attempted_on_free` | Client (browser/Capacitor) |
| **Error tracking** | Sentry | Exceptions, unhandled promises, edge function errors | Client + Edge functions |
| **Business metrics** | Internal `mrr-dashboard` edge function | MRR, churn, conversion funnel | Edge (admin-gated) |

### Secret Hygiene for Telemetry

PostHog and Sentry both have a **public DSN/project key model** designed for client embedding. Their threat model assumes the key is visible — abuse is mitigated server-side by rate limits per project. So `VITE_POSTHOG_KEY` and `VITE_SENTRY_DSN` are correctly client-visible.

**What MUST NOT ship to the client:**
- PostHog **personal API key** (used for querying analytics from the server)
- Sentry **auth token** (used for source map upload, releases)
- Any `*_SECRET_KEY` from any provider

### Avoiding PII Leaks

Both PostHog and Sentry need scrubbing config:

```typescript
// src/lib/posthog.ts
posthog.init(key, {
  api_host: 'https://app.posthog.com',
  property_blacklist: ['cpf', 'email', 'full_name', 'phone'],  // strip from auto-capture
  sanitize_properties: (props) => {
    delete props.$ip;  // disable IP capture for LGPD
    return props;
  }
});

// src/lib/sentry.ts
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  beforeSend(event) {
    // Strip user-supplied form values from breadcrumbs
    if (event.request?.data) delete event.request.data;
    return event;
  },
  // Don't include user emails in events (LGPD)
  sendDefaultPii: false,
});
```

### Edge Function Errors

Sentry has a Deno SDK (`@sentry/deno`). Each edge function should wrap its handler:

```typescript
import * as Sentry from "https://deno.land/x/sentry@8/index.mjs";
Sentry.init({ dsn: Deno.env.get('SENTRY_DSN_EDGE') });

serve(async (req) => {
  try { return await handler(req); }
  catch (e) { Sentry.captureException(e); throw e; }
});
```

Use a **separate Sentry project** (`milespro-edge`) from the client project (`milespro-web`) so errors don't co-mingle and rate limits don't compete.

### Dashboard Boundary

`supabase/functions/mrr-dashboard` already exists. It MUST:
- `verify_jwt = true`
- Inside, check the user has admin role (`user_roles.role = 'admin'`)
- Use service-role client for cross-user aggregations
- Return only aggregates (never raw user rows)

Internal admin UI lives at a route gated by both `<ProtectedRoute>` and a new `<AdminProtectedRoute>` that calls a server function `is_admin()`. Don't trust a client-side flag.

---

## Build Order with Dependency Graph

```text
                     ┌──────────────────────────────┐
                     │ 1. CONSOLIDATE plan enum     │
                     │    (DB 5 → 3 values; align   │
                     │     TS to free|pro|vip)      │
                     │    SEC-05                    │
                     └──────────┬───────────────────┘
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
   ┌────────────────────────┐    ┌──────────────────────────┐
   │ 2a. SECRET HYGIENE     │    │ 2b. TRUST KERNEL         │
   │  - delete supabaseAdmin│    │  - has_plan()            │
   │    from client.ts      │    │  - can_access_account()  │
   │  - remove vite.config  │    │  - tighten can_access_   │
   │    JWT fallback        │    │    feature() taxonomy    │
   │  - add fail-on-secret  │    │  SEC-01                  │
   │    Vite plugin         │    └──────────┬───────────────┘
   │  SEC-03, SEC-04        │               │
   └──────────┬─────────────┘               │
              │                             │
              │           ┌─────────────────┴──────────────┐
              │           ▼                                ▼
              │  ┌──────────────────────┐  ┌──────────────────────────┐
              │  │ 3a. RLS REWRITE      │  │ 3b. MANAGED_ACCOUNTS     │
              │  │     travel_*         │  │     table + RLS          │
              │  │     vip_*            │  │     (still no UI)        │
              │  │  SEC-02              │  │  TIER-04                 │
              │  └──────────┬───────────┘  └──────────┬───────────────┘
              │             │                         │
              │             │                         │
              ▼             ▼                         │
     ┌──────────────────────────────────┐             │
     │ 4. WEBHOOK INFRASTRUCTURE        │             │
     │   - webhook_events table         │             │
     │   - stripe-webhook edge function │             │
     │   - create-checkout-session fn   │             │
     │   - portal-session fn            │             │
     │   PAY-01, PAY-02, PAY-03         │             │
     └─────────────┬────────────────────┘             │
                   │                                  │
                   ▼                                  │
     ┌──────────────────────────────────┐             │
     │ 5. UPGRADE/CHECKOUT UI           │             │
     │   - Plans page Free/Pro/VIP      │             │
     │   - Stripe Checkout redirect     │             │
     │   - Customer Portal link         │             │
     │   PAY-04, PAY-05                 │             │
     └─────────────┬────────────────────┘             │
                   │                                  │
                   └──────────┬───────────────────────┘
                              ▼
                ┌──────────────────────────────┐
                │ 6. MULTI-CPF UI              │
                │   - account switcher         │
                │   - manage CPFs page (VIP)   │
                │   - create-managed-account fn│
                └──────────┬───────────────────┘
                           │
                           ▼
                ┌──────────────────────────────┐
                │ 7. OBSERVABILITY             │
                │   - PostHog real integration │
                │   - Sentry client + edge     │
                │   - admin MRR dashboard      │
                │   TEL-01, TEL-02, TEL-03     │
                └──────────────────────────────┘
```

### Phase Dependencies

| Phase | Depends on | Why |
|-------|-----------|-----|
| 1. Plan enum consolidation | (none) | Foundation; everything downstream references it |
| 2a. Secret hygiene | 1 (no, independent) | Can run in parallel — pure cleanup |
| 2b. Trust kernel | 1 | Functions reference the enum |
| 3a. RLS rewrite | 2b | Policies call `has_plan()` |
| 3b. Multi-CPF table | 2b | Policies call `has_plan('vip')` |
| 4. Webhook infra | 1, 2a | Needs clean enum + secrets correctly stored |
| 5. Checkout UI | 4 | Can't sell what doesn't sync |
| 6. Multi-CPF UI | 3b, 5 | Needs both ownership table AND VIP plan available |
| 7. Observability | (none, parallel) | Independent; can ship anytime |

**Critical path:** 1 → 2b → 3a → 4 → 5. Everything else parallelizes.

### Data Flows

**Signup (no change from today):**
```
User → /auth → supabase.auth.signUp() → handle_new_user trigger →
  INSERT profiles, user_roles, user_subscriptions(plan='free')
```

**Upgrade Free → Pro:**
```
Client: useSubscription() shows "Upgrade" button
  → POST /functions/v1/create-checkout-session (verify_jwt=true)
  → Edge: stripe.customers.create({metadata: {supabase_user_id}})
  → Edge: UPSERT user_subscriptions SET stripe_customer_id
  → Edge: stripe.checkout.sessions.create() → returns URL
  → Client: redirect to Stripe Checkout (Stripe-hosted)
  → User pays
  → Stripe → POST /functions/v1/stripe-webhook
  → Edge: verify signature → INSERT webhook_events (idempotent) →
          UPDATE user_subscriptions SET plan='pro', current_period_end, is_active=true
  → Client: poll /user_subscription on return URL OR realtime subscription
  → useSubscription() refetches → UI updates → travel_* now accessible
```

**Upgrade Pro → VIP:** Same as above, just different `price_id` in checkout.

**Cancel:**
```
Client: "Manage subscription" button
  → POST /functions/v1/portal-session (verify_jwt=true)
  → Edge: stripe.billingPortal.sessions.create() → returns URL
  → Client: redirect to Stripe Customer Portal
  → User cancels
  → Stripe → customer.subscription.updated webhook (cancel_at_period_end=true)
  → Edge: UPDATE user_subscriptions SET cancel_at_period_end=true
  → Period ends → customer.subscription.deleted webhook
  → Edge: UPDATE user_subscriptions SET is_active=false, plan='free'
  → Soft isolation: user keeps reading old travel_* rows; can't write
```

---

## Migration Safety

### Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **RLS plan-check breaks free users** who shouldn't have travel_* rows but might via legacy data | HIGH | Pre-migration audit: `SELECT user_id, COUNT(*) FROM travel_cruises GROUP BY user_id` joined to `user_subscriptions` to find any free users with travel rows. Either upgrade them as data migration, or document the soft-isolation behavior (rows stay visible, just immutable). |
| **Function signature change breaks existing code** | MED | `can_access_feature()` exists but unused. Adding `has_plan()` is additive. Don't drop `can_access_feature()` until phase 3a completes. |
| **Plan enum reduction** (5 → 3) breaks rows with old values | HIGH | Map first: `UPDATE user_subscriptions SET plan='pro' WHERE plan IN ('agency','pro_familia')`; `UPDATE plan='free' WHERE plan='basic'` (or to 'pro' depending on intent). Run in same migration that drops old enum values. |
| **Webhook race during migration** (event arrives mid-deploy) | MED | Stripe retries for 3 days. Webhook function returns 500 on any error → Stripe holds. After deploy, optionally replay missed events from Stripe dashboard. |
| **Service-role key removal** breaks anything currently using `supabaseAdmin` from client | LOW | Grep first. `src/integrations/supabase/client.ts:22-29` is the only export; check usages. Migration: move to edge function, then delete export. |
| **Multi-CPF policies retroactively change `operations` visibility** | MED | New `can_access_account()` defaults to "self only" if no `managed_accounts` rows exist — semantically identical to current `auth.uid() = user_id`. Safe to deploy before any managed accounts exist. |
| **`vite.config.ts` JWT fallback removal** breaks dev environments missing `.env` | LOW | Document in README. Provide `.env.example` with comment "fill these in or build will fail". |

### Migration Order (Reverse-Safe)

Each migration should be independently reversible:

1. Migration `01-consolidate-plan-enum.sql` — rename values, add CHECK constraint for transition period.
2. Migration `02-add-trust-kernel.sql` — create `has_plan()`, `can_access_account()`. Pure addition, no risk.
3. Migration `03-add-managed-accounts.sql` — create table + own RLS. No domain table touched.
4. Migration `04-add-webhook-events.sql` — create idempotency table.
5. Migration `05-extend-user-subscriptions.sql` — add `stripe_customer_id`, `current_period_end`, `grace_period_until`, `cancel_at_period_end` columns.
6. Migration `06-rls-travel-tables.sql` — DROP + CREATE policies on `travel_*`. **Test on staging first.**
7. Migration `07-rls-vip-tables.sql` — same for `vip_*`.
8. Migration `08-rls-multi-cpf-domain-tables.sql` — switch `operations`, `program_balances`, `credit_cards`, etc. to `can_access_account()`.

**Rollback strategy:** Migrations 6–8 can be rolled back by re-creating the original `auth.uid() = user_id` policies. Keep the old policy text in a comment block at the top of each migration for fast reversal.

### Testing Plan

Required before merging RLS changes:

1. **Direct REST tests (no UI):** Use `curl` with anon key + free user JWT to attempt `POST /rest/v1/travel_cruises`. MUST return 403/401.
2. **Service-role bypass test:** Confirm migrations don't accidentally break `mrr-dashboard` cross-user queries.
3. **Multi-CPF round-trip test:** Create VIP, create headless managed account, INSERT operation as VIP into managed_user_id, switch to "self" context, confirm INSERT fails as expected.
4. **Idempotency test:** Send same Stripe webhook event 3x to staging, confirm `user_subscriptions` updates exactly once.
5. **Downgrade test:** Pro → cancel → verify travel_* SELECT still works (soft isolation), INSERT now fails.

### Backward Compatibility

The RLS function-based approach means **future plan additions** (e.g., introducing a `business` plan above VIP) only touch `has_plan()` and don't require rewriting RLS policies on every table. This is the primary architectural value of the trust-kernel pattern.

---

## Sources

- Supabase RLS docs (HIGH confidence): https://supabase.com/docs/guides/database/postgres/row-level-security — verified the SECURITY DEFINER pattern, `STABLE` modifier semantics, and `WITH CHECK` vs `USING` distinction.
- Stripe webhook idempotency best practices (HIGH confidence): https://stripe.com/docs/webhooks#handle-duplicate-events — `event.id` uniqueness, retry behavior (3-day window with exponential backoff).
- Existing migration `supabase/migrations/20251228134346_...sql` (HIGH confidence, code-verified) — confirmed `can_access_feature()` exists but unused; provides template for `has_plan()`.
- Existing CONCERNS.md (HIGH confidence) — Section "Security/CRITICAL" documents the exact files and lines needing changes (`vite.config.ts:14`, `src/integrations/supabase/client.ts:7`).
- PostgreSQL function volatility classes (HIGH confidence): https://www.postgresql.org/docs/current/xfunc-volatility.html — `STABLE` chosen for `has_plan()` to enable single-statement caching.
- Pattern A vs Pattern B for multi-tenancy with shared ownership (MEDIUM confidence): synthesized from Supabase community discussions on team/org models; the `managed_accounts` ownership-table pattern is the conventional approach for B2B-style tenant hierarchies.

---

*Architecture research complete: 2026-05-11*
