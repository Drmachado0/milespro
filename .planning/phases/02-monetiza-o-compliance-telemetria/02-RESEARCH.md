# Phase 2: Monetização, Compliance & Telemetria — Research

**Researched:** 2026-05-12
**Domain:** Billing integration (Asaas) + LGPD compliance + product telemetry + production launch infra
**Confidence:** HIGH on Asaas patterns / PostHog config / pg_cron + edge function wiring; MEDIUM on Apple 3.1.3(b) durability + Asaas NFS-e municipal nuances
**Scope:** 26 requirements (PAY-01..08 + TIER-01..06 + TEL-01..03 + COMPL-01..06 + LAUNCH-01/04/05) governed by 28 locked decisions in `02-CONTEXT.md`

---

<user_constraints>
## User Constraints (from 02-CONTEXT.md)

### Locked Decisions (28 — D-01..D-28)

**Pricing (3 locked):**
- **D-01** Pro mensal = R$37,90/mês; VIP R$67,90/mês. Maintain existing prices in `src/pages/Assinatura.tsx:74` and `src/pages/Index.tsx:182`. Defines `Asaas.Subscription.value`, MRR baseline, LAUNCH-04 copy.
- **D-02** Três ciclos: mensal + semestral (-10%) + anual (-20%). 6 produtos no Asaas (Pro × 3 + VIP × 3).
- **D-03** Trial 7d Pro com card-on-file. Card tokenizado no início do trial via Asaas; primeira cobrança no dia 8 a menos que o usuário cancele. `Termos.tsx:69-72` diz "14 dias sem cartão" — **bug a corrigir em W0**.

**Infrastructure (3):**
- **D-04** Lovable Cloud default region (us-east-1) + documentar SCC para transferência BR→US. Migração para sa-east-1 adiada.
- **D-05** Vercel Hobby como hosting de produção; GitHub integration → `main`; SSL via Let's Encrypt.
- **D-06** Domínio: `app.milespro.net.br` (SPA + auth); redirect `milespro.net.br` → landing. DNS via Cloudflare apontando para Vercel.

**Technical (4):**
- **D-07** Asaas Subscriptions API (não Charges). `POST /v3/subscriptions`. Webhook em `PAYMENT_CONFIRMED` + `PAYMENT_RECEIVED`.
- **D-08** Asaas = source of truth; DB `user_subscriptions` é read cache atualizado por webhook.
- **D-09** Reconciliation cron via `pg_cron` + edge function `reconcile-asaas-subscriptions` (não GitHub Actions).
- **D-10** iOS Path C runtime detection via `Capacitor.getPlatform()`, single bundle.

**Scope (5):**
- **D-11** Manter shells de `Assinatura.tsx` e `Index.tsx`; substituir só o `handlePlanCta`. `subscription_leads` permanece como shadow log; `VITE_ENABLE_SUBSCRIPTION_LEADS` vai pra false.
  - W0 sub-tasks: rename "Plus" → "Pro" em `Index.tsx:181-232`; fix `Termos.tsx:69` ("Plus e Pro" → "Pro e VIP"); fix `Termos.tsx` "14 dias trial sem cartão" → "7 dias Pro com cartão".
- **D-12** Free limits: 3 programas + 5 contas. `useSubscription.ts:131-137` precisa subir `maxPrograms: 1 → 3`. RLS policy nova em `user_programs`.
- **D-13** Pro killer feature INCLUSO: alerta de promoção de transferência personalizado (Livelo→Smiles bônus + saldos do usuário). Estende `fetch-promotions` edge function. Novos eventos PostHog.
- **D-14** MRR dashboard: **rewrite**, não refactor. Drop `PLAN_PRICES` legacy em `supabase/functions/mrr-dashboard/index.ts:5-11`. Asaas API como fonte de verdade.
- **D-15** VIP vendido via Asaas self-serve. Deletar `VITE_SALES_WHATSAPP` env var e `wa.me/...` fallback de `Assinatura.tsx:249`.

**Compliance (5):**
- **D-16** Consent banner in-house (~200 LOC + tabela `user_consents` + hook `useConsent()`). Checkboxes separados pra ToS, Privacy, Marketing, Analytics (LGPD Art. 8 §4 — single-checkbox inválido).
- **D-17** `/privacidade` atualizar sub-processadores: Stripe → Asaas; adicionar PostHog (EU), Sentry, Resend, Supabase (Lovable Cloud). Cláusula SCC BR→US.
- **D-18** LGPD delete: **soft delete + 7-day window + cron hard-delete**. Email confirmation → `deletion_requested_at` → 7 dias depois → daily cron purga. Cascade: `auth.users` → `user_id`-keyed rows → Asaas customer → PostHog person → Sentry user. `deletion_audit` row permanece.
- **D-19** 7-day money-back guarantee, incondicional. Publicado em ToS + pricing page. Manual via `dpo@milespro.net.br` no Asaas dashboard.
- **D-20** DPO email = `dpo@milespro.net.br` dedicado, não aliased. `Privacidade.tsx:127,165` precisa fix.

**Sequencing (4):**
- **D-21** PJ-blocker: wave decoupling. W0-W2 avançam sem CNPJ; W3 (Asaas live keys, NFS-e issuance) aguarda CNPJ. ~80% de Phase 2 paralelizável.
- **D-22** NFS-e em v1, bundled via Asaas (`invoice: { enabled: true }`).
- **D-23** Helpdesk: Crisp free tier + WhatsApp Business. Crisp SDK Web suporta React via `crisp-sdk-web`.
- **D-24** Resend custom domain `noreply@milespro.net.br`. SPF + DKIM + DMARC ANTES do primeiro send. Warmup 1 semana com founder/dev addresses. Inboxes adicionais: `suporte@`, `dpo@` (Cloudflare Email Routing).

**Phase 1 carry-over (4):**
- **D-25 (AR-2)** — Limpar dead JWT fallback em `vite.config.ts:71-74`. Chave anon legacy desabilitada em 2026-05-12T21:47:41Z. Reativar `failOnSecretLeak` strict para essas 3 vars OU swap por `sb_publishable_*` key atual.
- **D-26 (AR-3)** — Wire Deno test job em `.github/workflows/ci.yml`. Add `denoland/setup-deno@v1` + `deno test --allow-env --allow-net supabase/functions/google-calendar-auth/index.test.ts`.
- **D-27** — Estender `FORBIDDEN_VITE_PATTERNS` em `vite.config.ts` para capturar `VITE_ASAAS_*SECRET` / `VITE_ASAAS_*WEBHOOK` BEFORE PAY-01. Linha 22 do `vite.config.ts` já tem TODO comment.
- **D-28** — Drop `can_access_feature()` (legacy Phase 1 DEPRECATED).

### Claude's Discretion

- `<ConsentBanner>` visual design (placement, colors, copy variants)
- Exact `webhook_events` schema beyond `(provider, event_id) UNIQUE`
- Exact wave-to-plan decomposition (7-8 plans estimated em 4 waves)
- PostHog event taxonomy (event names, property structure) — exemplos em TEL-01, planner expande
- Sentry sample rates e `beforeSend` regex patterns
- Resend email template HTML/copy

### Deferred Ideas (OUT OF SCOPE)

- Soft-delete UNIQUE INDEX on `user_subscriptions(user_id) WHERE is_active` — PAY-* define semantics primeiro
- Full BR tax automation (ICMS/ISS dedicated processor) — v2 quando MRR > R$10K/mo
- Automated refund button — operator-driven no MVP
- PostHog cohort dashboards avançados — pós-launch
- `can_access_feature()` cleanup — pode mover pra plan dedicado se crescer

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PAY-01 | Asaas product/plan setup (6 products: Pro × 3 cycles + VIP × 3 cycles) | §2.2 Subscription create payload + cycle mapping |
| PAY-02 | `create-checkout-session` edge function returning Asaas hosted checkout URL | §2.3 Edge function pattern + JWT auth + customer create-or-fetch |
| PAY-03 | `asaas-webhook` edge function — idempotent, HMAC-validated | §2.4 Webhook handler + idempotency via `webhook_events(provider, event_id) UNIQUE` + asaas-access-token header |
| PAY-04 | UI pricing → checkout flow (web only, iOS Path C hidden) | §2.5 + §7.3 useIsIOSCapacitor hook + handlePlanCta replacement |
| PAY-05 | Subscription state machine: trial → paid → renew → cancel → grace | §3 full state machine + event mapping |
| PAY-06 | Trial 7d card-on-file | §2.6 nextDueDate + creditCard + creditCardHolderInfo in Asaas |
| PAY-07 | 3-cycle billing (monthly/semestral/annual) | §2.2 cycle enum MONTHLY/SEMIANNUALLY/YEARLY |
| PAY-08 | NFS-e bundled via Asaas | §2.7 invoice config + municipal setup pre-req |
| TIER-01 | Free 3 programas / 5 contas limit | §6.1 RLS policy + useSubscription bump |
| TIER-02 | Pro alert antecipação | §6.2 user_settings.alert_antecipation_days + RLS gating |
| TIER-03 | Pro killer feature (personalized promotion alerts) | §6.3 fetch-promotions extension + PostHog events |
| TIER-04 | VIP multi-CPF write via managed_accounts | §4.1 RLS pattern using can_access_account() |
| TIER-05 | VIP add managed CPF | §4.2 create-managed-account edge function + headless email |
| TIER-06 | VIP switch active managed view | §4.3 ManagedAccountContext + UI switcher |
| TEL-01 | PostHog consent-gated funnel | §5.2 + §6.4 init pattern + event taxonomy |
| TEL-02 | MRR dashboard rewrite | §6.5 Asaas API SoT + admin role gate |
| TEL-03 | Sentry PII-scrubbed | §5.3 beforeSend regex CPF/email + Capacitor SDK note |
| COMPL-01 | lgpd-export edge function (JSON+CSV bundle within 5 min target) | §5.1 export bundle structure + zip stream + Resend delivery |
| COMPL-02 | lgpd-delete (soft + 7d + cron) | §5.4 soft-delete columns + pg_cron cleanup + cascade order |
| COMPL-03 | Granular consent banner + user_consents | §5.2 schema + useConsent hook + PostHog gate |
| COMPL-04 | Privacy policy update (sub-processors + SCC) | §5.5 Privacidade.tsx rewrite plan |
| COMPL-05 | Termos.tsx fix + refund policy | §5.6 7d money-back + trial 7d correction |
| COMPL-06 | DPO email dpo@ | §5.7 Resend domain setup + 3 inboxes |
| LAUNCH-01 | Vercel production deploy app.milespro.net.br | §7.1 Vite-on-Vercel + DNS + redirect |
| LAUNCH-04 | Landing + pricing | §7.2 Index.tsx CTA replacement |
| LAUNCH-05 | Crisp helpdesk + Resend warmup | §7.4 crisp-sdk-web embed + warmup runbook |

</phase_requirements>

---

## §1 Executive Summary

**What is settled (HIGH confidence):**

1. **Asaas Subscriptions API has a clean, narrow shape** — 6 fields required (`customer`, `billingType`, `value`, `nextDueDate`, `cycle`, plus optional `description`). Trial is implemented as "set `nextDueDate` 7 days out + send `creditCard` + `creditCardHolderInfo` — Asaas validates the card NOW but only charges on `nextDueDate`". This is exactly D-03 (trial 7d card-on-file) without any extra plumbing.
2. **Webhook idempotency is one-line** — Asaas sends the event `id` in the payload; an `INSERT INTO webhook_events(provider, event_id) ... ON CONFLICT (provider, event_id) DO NOTHING` returning the inserted count IS the idempotency check. Reply 200 either way. Authentication via `asaas-access-token` header (NOT HMAC of body — Asaas uses a static token comparison, simpler than Stripe's HMAC scheme).
3. **PostHog EU + consent-gating** has a documented config recipe: `api_host: 'https://eu.i.posthog.com'`, `person_profiles: 'identified_only'`, `property_denylist: ['cpf','email','phone']` (note: `property_blacklist` is the legacy name, current is `property_denylist`), `autocapture: false`, `opt_out_capturing_by_default: true`, then `posthog.opt_in_capturing()` once the user accepts.
4. **pg_cron + net.http_post** is the canonical Supabase pattern for invoking edge functions on a schedule. Auth flows via Vault-stored service_role key OR a custom `secret_key` checked inside the edge function.
5. **Apple 3.1.3(b) Multiplatform Services exemption is still in force in 2026** — guideline text unchanged since May 2025 Epic anti-steering update. iOS app can offer free-tier sign-in + account management without IAP as long as ZERO purchase encouragement happens in-app.

**What is risky (MEDIUM confidence):**

1. **Lovable Cloud SQL gate for migrations** — Phase 1 deployed 8 migrations via Lovable chat conversations. Phase 2 will need ≥4 more (webhook_events, user_consents, user_subscriptions extensions, deletion_audit). Process must remain: write SQL → Lovable chat applies it. This is documented in `01-06-DEPLOY-RUNBOOK-LOVABLE-CLOUD.md`. NO `supabase db push` from local CLI directly to prod.
2. **NFS-e municipal_inscription pre-requisite** — Asaas-bundled NFS-e requires: (1) PJ with municipal inscription registered, (2) one-time POST to `/v3/customers/{id}/municipalSettings`, (3) per-municipality service code (varies by city). PAY-08 W3 task can't go live without these 3 steps coordinated with contador.
3. **Trial abuse via Asaas customer reuse** — Asaas refuses second trial on same `customer.id` (HIGH-01 mitigation). But a determined user can create a new email + new `customer` in Asaas. CPF UNIQUE on `profiles.cpf` is the actual defense — not yet enforced in DB (verify in Phase 2 W0).

**Primary recommendation:**

Decompose into 4 waves (W0..W3) as outlined in 02-ASSUMPTIONS.md SEQ-01, with W2 (Asaas scaffold) and W1 (compliance + telemetry + infra) advancing in parallel. **Critical path: W0 → W1 + W2 (parallel) → W3 (cutover after CNPJ + Asaas approval).** Estimated 7-8 plans, parallelizable.

---

## §2 Asaas Integration Patterns

### 2.1 Authentication & Environment

**API base URLs:**
- Sandbox: `https://api-sandbox.asaas.com/v3` (use throughout W0-W2 development)
- Production: `https://api.asaas.com/v3` (only after PJ + Asaas approval in W3)

**Authentication header (all REST calls):**
```
access_token: $aact_YourApiKeyHere
```

**Secrets required (Supabase Vault — `supabase secrets set`):**
- `ASAAS_API_KEY` — REST auth, set via Lovable secrets pane
- `ASAAS_WEBHOOK_TOKEN` — string compared against `asaas-access-token` header in webhook (PAY-02)
- `ASAAS_ENV` — "sandbox" | "production" (drives base URL)

**Phase 1 carry-over D-27 enforcement:** before W2 work begins, extend `vite.config.ts:16-22` `FORBIDDEN_VITE_PATTERNS`:
```ts
const FORBIDDEN_VITE_PATTERNS: readonly RegExp[] = [
  /^VITE_.*SERVICE_ROLE/i,
  /^VITE_.*SECRET_KEY/i,
  /^VITE_.*WEBHOOK_SECRET/i,
  /^VITE_.*PRIVATE_KEY/i,
  // Phase 2 D-27 — Asaas keys must never reach client bundle:
  /^VITE_ASAAS_.*SECRET/i,
  /^VITE_ASAAS_.*WEBHOOK/i,
  /^VITE_ASAAS_.*API.?KEY/i,
];
```

### 2.2 Create Subscription Request

**Endpoint:** `POST /v3/subscriptions` [CITED: docs.asaas.com/reference/criar-nova-assinatura]

**Required fields (verified):**
| Field | Type | Values / Example |
|-------|------|-------------------|
| `customer` | string | `cus_xxx` — id from earlier `POST /v3/customers` |
| `billingType` | enum | `UNDEFINED` (user picks at checkout) / `BOLETO` / `CREDIT_CARD` / `PIX` |
| `value` | number | `37.90` (Pro mensal) / `203.46` (Pro semestral) / `363.84` (Pro anual) / `67.90` (VIP mensal) / `366.06` (VIP semestral) / `651.84` (VIP anual) — verbatim from D-01 + `Assinatura.tsx:74-100` |
| `nextDueDate` | date | `YYYY-MM-DD` — for trial, set 7 days ahead of subscription creation |
| `cycle` | enum | `MONTHLY` / `SEMIANNUALLY` / `YEARLY` (D-02 — Asaas also supports WEEKLY/BIWEEKLY/BIMONTHLY/QUARTERLY but we don't use them) |

**Optional fields used by MilesPro:**
| Field | Type | Why |
|-------|------|-----|
| `description` | string max 500 | Surfaces in customer's invoice — "MilesPro — Plano Pro (Mensal)" |
| `externalReference` | string | We use `user_subscriptions.id` (UUID) so webhook handler can correlate without an extra Asaas lookup |
| `creditCard` | object | For trial card-on-file (§2.6) |
| `creditCardHolderInfo` | object | For trial card-on-file (§2.6) — Asaas validates name/CPF/address match |
| `invoice` | object | `{ enabled: true }` for NFS-e (PAY-08) — but requires municipal setup first (§2.7) |
| `discount` / `interest` / `fine` | object | Not used in MVP — keep `undefined` |

**Cycle → price → product mapping (6 products, D-02):**

| Product ID (logical) | Plan | Cycle | Value | Value/mo equiv |
|----------------------|------|-------|-------|----------------|
| `pro_monthly` | pro | MONTHLY | R$ 37,90 | R$ 37,90 |
| `pro_semiannual` | pro | SEMIANNUALLY | R$ 203,46 | R$ 33,91 |
| `pro_annual` | pro | YEARLY | R$ 363,84 | R$ 30,32 |
| `vip_monthly` | vip | MONTHLY | R$ 67,90 | R$ 67,90 |
| `vip_semiannual` | vip | SEMIANNUALLY | R$ 366,06 | R$ 61,01 |
| `vip_annual` | vip | YEARLY | R$ 651,84 | R$ 54,32 |

*Note: Asaas doesn't have a "product" concept at the API level — each subscription has its own (value, cycle) tuple. We track the logical product via `externalReference` and an internal `billing_plan_id` enum.*

**Full example request:**
```http
POST /v3/subscriptions HTTP/1.1
Host: api.asaas.com
access_token: $aact_xxx
Content-Type: application/json

{
  "customer": "cus_000005678901",
  "billingType": "UNDEFINED",
  "value": 37.90,
  "nextDueDate": "2026-05-19",
  "cycle": "MONTHLY",
  "description": "MilesPro — Plano Pro (Mensal)",
  "externalReference": "0bafc6a4-9a52-4d3c-b3e1-21d6c2f3e7f1",
  "creditCard": {
    "holderName": "JOAO DA SILVA",
    "number": "5162306219378829",
    "expiryMonth": "12",
    "expiryYear": "2028",
    "ccv": "123"
  },
  "creditCardHolderInfo": {
    "name": "JOAO DA SILVA",
    "email": "joao@example.com",
    "cpfCnpj": "24971563792",
    "postalCode": "01310-100",
    "addressNumber": "1578",
    "phone": "11987654321"
  }
}
```

[ASSUMED] Response body shape (response schema not visible in Asaas docs WebFetch; pattern inferred from Asaas SDKs):
```json
{
  "object": "subscription",
  "id": "sub_000123",
  "customer": "cus_000005678901",
  "status": "ACTIVE",
  "billingType": "UNDEFINED",
  "value": 37.90,
  "nextDueDate": "2026-05-19",
  "cycle": "MONTHLY",
  "externalReference": "0bafc6a4-...",
  "dateCreated": "2026-05-12"
}
```
**Verification action for planner:** PAY-01 W2 plan MUST include a "smoke test in sandbox: create subscription, capture response body verbatim, document field names" step before PAY-02 is written.

### 2.3 Edge Function `create-checkout-session` (PAY-02)

**Trigger:** Authenticated user clicks "Assinar Pro Mensal" in `/planos` → frontend POSTs to this edge function with JWT in Authorization header.

**Responsibilities:**
1. Verify Supabase JWT (`auth.getUser(token)`)
2. Look up or create Asaas customer for this user (idempotent: store `asaas_customer_id` on `profiles`)
3. Create Asaas subscription via `POST /v3/subscriptions`
4. Store provisional row in `user_subscriptions` with status `pending_first_charge`
5. Return Asaas hosted checkout URL OR (preferred) the subscription's `id` + invoice URL for first charge

**Skeleton (Deno, mirrors `supabase/functions/google-calendar-auth/index.ts` pattern):**

```ts
// supabase/functions/create-checkout-session/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { parseAndValidate, z } from '../_shared/validate.ts';

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
const ASAAS_ENV = Deno.env.get('ASAAS_ENV') ?? 'sandbox';
const ASAAS_BASE = ASAAS_ENV === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://api-sandbox.asaas.com/v3';

if (!ASAAS_API_KEY) {
  throw new Error('ASAAS_API_KEY not configured. Set via: supabase secrets set ASAAS_API_KEY=...');
}

const bodySchema = z.object({
  plan: z.enum(['pro', 'vip']),
  cycle: z.enum(['monthly', 'semiannual', 'annual']),
  // creditCard fields collected via Asaas Checkout-hosted page (preferred)
  // OR sent directly here if we tokenize client-side (more PCI burden — defer to v2).
});

const PRICE_TABLE = {
  pro: { monthly: 37.90, semiannual: 203.46, annual: 363.84 },
  vip: { monthly: 67.90, semiannual: 366.06, annual: 651.84 },
} as const;

const CYCLE_MAP = {
  monthly: 'MONTHLY',
  semiannual: 'SEMIANNUALLY',
  annual: 'YEARLY',
} as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsPreflight(req);

  // 1. Auth
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401 });
  const jwt = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
  if (authErr || !user) return new Response('Invalid token', { status: 401 });

  // 2. Validate body
  const v = await parseAndValidate(req, bodySchema);
  if (!v.ok) return new Response(v.error, { status: v.status });
  const { plan, cycle } = v.data;
  const value = PRICE_TABLE[plan][cycle];
  const asaasCycle = CYCLE_MAP[cycle];

  // 3. Get-or-create Asaas customer
  const { data: profile } = await supabase
    .from('profiles')
    .select('asaas_customer_id, full_name, cpf')
    .eq('id', user.id)
    .single();

  let asaasCustomerId = profile?.asaas_customer_id;
  if (!asaasCustomerId) {
    const customerRes = await fetch(`${ASAAS_BASE}/customers`, {
      method: 'POST',
      headers: {
        'access_token': ASAAS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: profile?.full_name ?? user.email,
        email: user.email,
        cpfCnpj: profile?.cpf,
        notificationDisabled: false,
        preferredLocale: 'pt-BR', // MED-01 mitigation
      }),
    });
    const customer = await customerRes.json();
    asaasCustomerId = customer.id;
    await supabase.from('profiles').update({ asaas_customer_id: asaasCustomerId }).eq('id', user.id);
  }

  // 4. Compute nextDueDate (7 days from now for trial; today otherwise)
  const trialDays = 7; // D-03
  const nextDueDate = new Date(Date.now() + trialDays * 86400000)
    .toISOString().slice(0, 10);

  // 5. Insert provisional subscription row (idempotency: externalReference = our UUID)
  const provisionalId = crypto.randomUUID();
  await supabase.from('user_subscriptions').insert({
    id: provisionalId,
    user_id: user.id,
    plan,
    billing_period: cycle,
    price: value,
    is_active: false,
    status: 'pending_first_charge',
    asaas_subscription_id: null, // filled below
  });

  // 6. Create Asaas subscription
  const subRes = await fetch(`${ASAAS_BASE}/subscriptions`, {
    method: 'POST',
    headers: {
      'access_token': ASAAS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customer: asaasCustomerId,
      billingType: 'UNDEFINED', // user picks at hosted checkout
      value,
      nextDueDate,
      cycle: asaasCycle,
      description: `MilesPro — Plano ${plan === 'pro' ? 'Pro' : 'VIP'} (${cycle})`,
      externalReference: provisionalId,
      // invoice: { enabled: true }, // PAY-08 — uncomment AFTER municipal setup
    }),
  });

  if (!subRes.ok) {
    // Log to subscription_leads as failure fallback (D-11)
    const err = await subRes.text();
    console.error('Asaas subscription create failed:', err);
    await supabase.from('user_subscriptions').delete().eq('id', provisionalId);
    return new Response(JSON.stringify({ error: 'asaas_subscription_failed', details: err }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const subscription = await subRes.json();

  // 7. Update provisional row with real Asaas ID
  await supabase.from('user_subscriptions')
    .update({ asaas_subscription_id: subscription.id })
    .eq('id', provisionalId);

  // 8. Fetch first charge to get hosted invoice URL
  const chargesRes = await fetch(
    `${ASAAS_BASE}/subscriptions/${subscription.id}/payments`,
    { headers: { 'access_token': ASAAS_API_KEY } },
  );
  const charges = await chargesRes.json();
  const firstCharge = charges.data?.[0];

  return new Response(JSON.stringify({
    subscriptionId: subscription.id,
    checkoutUrl: firstCharge?.invoiceUrl, // hosted-checkout URL pt-BR
    nextDueDate,
  }), {
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
});
```

### 2.4 Edge Function `asaas-webhook` (PAY-03) — Idempotent

**Critical config:** `supabase/functions/asaas-webhook/index.ts` MUST be deployed with `verify_jwt = false` (Asaas can't send Supabase JWT). Add to `supabase/config.toml`:
```toml
[functions.asaas-webhook]
verify_jwt = false
```

**Authentication is via `asaas-access-token` header** (not HMAC-of-body). Asaas sends the static token configured in their webhook UI [CITED: docs.asaas.com/docs/webhooks-3]. This is **simpler than Stripe** — no HMAC computation needed; just `constant_time_eq(req.headers.get('asaas-access-token'), ASAAS_WEBHOOK_TOKEN)`.

**Idempotency contract (CRIT-04 mitigation):**
- Asaas guarantees "at least once" delivery; events sent more than once have the same `id` [CITED: docs.asaas.com/docs/how-to-implement-idempotence-in-webhooks]
- Strategy: insert into `webhook_events(provider='asaas', event_id=payload.id)` UNIQUE constraint; if violation → already processed, return 200 immediately
- **Mark-as-processed BEFORE non-idempotent side effects** (Resend email, PostHog event) — if we crash mid-handler, the retry won't double-send

**webhook_events schema (planner discretion area — recommended):**

```sql
CREATE TABLE public.webhook_events (
  id              UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider        TEXT         NOT NULL CHECK (provider IN ('asaas')),
  event_id        TEXT         NOT NULL,
  event_type      TEXT         NOT NULL,                    -- 'PAYMENT_RECEIVED' etc
  payload         JSONB        NOT NULL,
  status          TEXT         NOT NULL DEFAULT 'received' CHECK (status IN ('received','processing','processed','failed')),
  processed_at    TIMESTAMPTZ,
  error_message   TEXT,
  retries         INTEGER      NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT webhook_events_unique UNIQUE (provider, event_id)
);

-- Index by event_type for replay/reconciliation queries
CREATE INDEX webhook_events_type_idx ON public.webhook_events (event_type, created_at DESC);

-- No RLS — this table is only written by service_role from edge function.
-- The CONSTRAINT itself IS the security boundary.
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
-- Deny-by-default: no policies = no rows visible to authenticated/anon.
```

**Handler skeleton:**

```ts
// supabase/functions/asaas-webhook/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ASAAS_WEBHOOK_TOKEN = Deno.env.get('ASAAS_WEBHOOK_TOKEN');
if (!ASAAS_WEBHOOK_TOKEN) {
  throw new Error('ASAAS_WEBHOOK_TOKEN not configured.');
}

function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  // 1. AuthN — constant-time compare
  const incoming = req.headers.get('asaas-access-token') ?? '';
  if (!constantTimeEq(incoming, ASAAS_WEBHOOK_TOKEN)) {
    return new Response('Forbidden', { status: 403 });
  }

  // 2. Parse body
  const body = await req.json();
  const eventId = body.id as string;
  const eventType = body.event as string; // e.g. 'PAYMENT_RECEIVED'
  const payment = body.payment;

  // 3. Idempotency — INSERT first, side effects after
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

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
    // 23505 = unique_violation → already processed → return 200 NO-OP
    if (insertErr.code === '23505') {
      return new Response('OK (duplicate ignored)', { status: 200 });
    }
    // Real error — return 500 so Asaas retries
    return new Response(insertErr.message, { status: 500 });
  }

  // 4. Dispatch on event type
  try {
    switch (eventType) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        await handlePaymentSuccess(supabase, payment);
        break;
      case 'PAYMENT_OVERDUE':
        await handlePaymentOverdue(supabase, payment);
        break;
      case 'PAYMENT_REFUNDED':
      case 'PAYMENT_PARTIALLY_REFUNDED':
        await handleRefund(supabase, payment);
        break;
      case 'SUBSCRIPTION_DELETED':
        await handleSubscriptionCanceled(supabase, body.subscription);
        break;
      case 'SUBSCRIPTION_INACTIVATED':
        await handleSubscriptionInactivated(supabase, body.subscription);
        break;
      // Other events logged but not actioned in v1 (PAYMENT_CREATED, _UPDATED,
      // _BANK_SLIP_VIEWED, _CHECKOUT_VIEWED, etc — useful for funnel analytics)
      default:
        // No-op — already persisted in webhook_events for future replay
        break;
    }

    // 5. Mark processed
    await supabase.from('webhook_events')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('provider', 'asaas').eq('event_id', eventId);

    return new Response('OK', { status: 200 });
  } catch (err) {
    await supabase.from('webhook_events')
      .update({ status: 'failed', error_message: String(err) })
      .eq('provider', 'asaas').eq('event_id', eventId);
    // Return 200 so Asaas doesn't retry forever — manual replay via cron
    return new Response('OK (logged for retry)', { status: 200 });
  }
});

async function handlePaymentSuccess(supabase: any, payment: any) {
  // payment.subscription = sub_xxx
  // payment.value = paid amount
  // payment.dueDate = due date
  // payment.paymentDate = actual payment date
  const subId = payment.subscription;
  if (!subId) return; // one-off charge, not subscription

  // Update user_subscriptions to active
  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('id, user_id, plan')
    .eq('asaas_subscription_id', subId)
    .single();

  if (!sub) return;

  await supabase.from('user_subscriptions').update({
    is_active: true,
    status: 'active',
    last_paid_at: payment.paymentDate ?? new Date().toISOString(),
    // expires_at: computed by Asaas next cycle — keep as cache
  }).eq('id', sub.id);

  // Side effects ordered: Resend → PostHog (idempotency guard already passed)
  await sendWelcomeEmail(sub.user_id, sub.plan); // Resend
  await trackPaidFirstInvoice(sub.user_id, sub.plan, payment.value); // PostHog
}

// ... handlePaymentOverdue / handleRefund / handleSubscriptionCanceled etc.
```

### 2.5 Asaas Webhook Event Taxonomy (verified)

**Payment events** [CITED: docs.asaas.com/docs/payment-events]:

| Event | What it means | MilesPro action |
|-------|---------------|------------------|
| `PAYMENT_CREATED` | New charge generated | Log only |
| `PAYMENT_AWAITING_RISK_ANALYSIS` | Card payment awaiting manual review | Log + Sentry breadcrumb |
| `PAYMENT_APPROVED_BY_RISK_ANALYSIS` | Card approved manually | No-op (PAYMENT_RECEIVED follows) |
| `PAYMENT_REPROVED_BY_RISK_ANALYSIS` | Card rejected | Notify user via Resend |
| `PAYMENT_AUTHORIZED` | Card authorized, awaiting capture | Log |
| `PAYMENT_UPDATED` | Due date or amount changed | Update `user_subscriptions.price` |
| **`PAYMENT_CONFIRMED`** | Paid but funds not yet available | **Flip `is_active=true`, plan=pro/vip** |
| **`PAYMENT_RECEIVED`** | Funds available in Asaas | **Confirm `last_paid_at`** |
| `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED` | Card declined | Notify user; set `status='past_due'` |
| `PAYMENT_ANTICIPATED` | Charge anticipated | Log |
| `PAYMENT_OVERDUE` | Past due | Set `status='past_due'`; start 3-7d grace; notify user |
| `PAYMENT_DELETED` | Charge removed | Log only |
| `PAYMENT_REFUNDED` / `PAYMENT_PARTIALLY_REFUNDED` | Refund processed | Downgrade plan if full; log if partial |
| `PAYMENT_CHARGEBACK_REQUESTED` | Chargeback initiated | **Set `status='disputed'`; notify ops via Sentry + Resend** |
| `PAYMENT_CHARGEBACK_DISPUTE` | We submitted defense | Log |
| `PAYMENT_AWAITING_CHARGEBACK_REVERSAL` | Dispute won | Reset `status='active'` |
| `PAYMENT_BANK_SLIP_VIEWED` / `PAYMENT_CHECKOUT_VIEWED` | Funnel signals | PostHog `boleto_viewed` / `checkout_viewed` events |

**Subscription events** [CITED: docs.asaas.com/docs/subscription-events]:

| Event | MilesPro action |
|-------|------------------|
| `SUBSCRIPTION_CREATED` | Log only (we created it) |
| `SUBSCRIPTION_UPDATED` | Reconcile fields with Asaas |
| `SUBSCRIPTION_INACTIVATED` | Plan downgraded; soft-isolation read still works |
| `SUBSCRIPTION_DELETED` | Hard cancel; flip `is_active=false`, `plan='free'` after grace |

**Event sequencing for typical lifecycles** [CITED: Asaas docs lifecycle examples]:
- **Pix paid on-time:** `PAYMENT_CREATED` → `PAYMENT_CONFIRMED` → `PAYMENT_RECEIVED`
- **Boleto paid on-time:** `PAYMENT_CREATED` → `PAYMENT_CONFIRMED` → `PAYMENT_RECEIVED`
- **Boleto paid late (HIGH-02):** `PAYMENT_CREATED` → `PAYMENT_OVERDUE` → `PAYMENT_CONFIRMED` → `PAYMENT_RECEIVED`
- **Trial → first charge:** `SUBSCRIPTION_CREATED` (day 0) → `PAYMENT_CREATED` (day 7, automatically by Asaas) → `PAYMENT_CONFIRMED` → `PAYMENT_RECEIVED`

### 2.6 Trial 7d Card-on-File Mechanics (PAY-06)

**The mechanism** [CITED: docs.asaas.com/docs/subscriptions-via-credit-card]:

> "In the case of a subscription, the card is validated at the moment of creation, but the payment is only made on the due date of the first installment."

This means D-03 (7d trial card-on-file) is implemented as:
1. User completes checkout providing card details
2. We POST subscription with `nextDueDate` = today + 7 days, AND `creditCard` + `creditCardHolderInfo`
3. Asaas validates the card NOW (auth-only, no charge)
4. Asaas auto-charges on day 7
5. Webhook `PAYMENT_CONFIRMED` fires → flip plan
6. If user cancels (`DELETE /v3/subscriptions/{id}`) before day 7, no charge happens

**[ASSUMED]** Asaas refuses second trial on same `customer.id`. **Planner action:** PAY-06 W3 plan must include a sandbox smoke test: (a) create sub with trial, cancel before day 7, try to create second sub with trial — does Asaas reject? Document outcome.

**Defense-in-depth against trial abuse (HIGH-01):**
- `profiles.cpf` UNIQUE constraint (verify exists, add migration if not)
- Rate-limit signups by IP via Supabase auth hooks (out of phase — backlog)
- `customer.cpfCnpj` ALWAYS sent in `POST /v3/customers` — Asaas dedupes customers by CPF/CNPJ

### 2.7 NFS-e via Asaas Bundle (PAY-08)

**Prerequisites** [CITED: docs.asaas.com/docs/issuing-service-invoices]:

1. PJ active with municipal inscription registered (founder workstream — gates W3)
2. One-time API setup sequence:
   - `GET /v3/customers/{id}/municipalSettings` — list what municipality requires
   - `POST /v3/customers/{id}/municipalSettings` — supply `municipalServiceId`, `municipalServiceCode`, `municipalServiceName`, ISS rate (decided with contador)
3. Per subscription: include `"invoice": { "enabled": true }` in create payload

**Issuance timing:** "If the current date is used, within 15 minutes after the request the invoice will be issued and you will receive the update through the webhook (if enabled)" [CITED: docs.asaas.com/docs/issuing-service-invoices].

**Invoice webhook events (not documented in detail):**
- [ASSUMED] `INVOICE_AUTHORIZED` (NFS-e successfully issued)
- [ASSUMED] `INVOICE_ERROR` (issuance failed — municipal API down etc)

**Planner action:** PAY-08 W3 plan must include a "configure municipal settings" task that explicitly blocks on contador input (`municipalServiceCode` for the founder's PJ city). Pre-W3 work can scaffold `invoice: { enabled: true }` behind a feature flag (env: `ASAAS_INVOICE_ENABLED=false`).

### 2.8 Reconciliation Cron (D-09)

**Endpoint to paginate:** `GET /v3/subscriptions?status=ACTIVE&limit=100&offset=0`

[ASSUMED] Asaas paginates with `limit` + `offset`; response has `hasMore: boolean` and `totalCount`. **Planner action:** verify response shape during W2 sandbox smoke test.

**pg_cron + net.http_post pattern** [CITED: supabase.com/docs/guides/functions/schedule-functions]:

```sql
-- Migration: schedule daily reconciliation
SELECT cron.schedule(
  'asaas-reconcile-nightly',          -- job name
  '0 3 * * *',                         -- 03:00 UTC daily (00:00 BRT)
  $$
  SELECT net.http_post(
    url := 'https://opusftqbbaozucmbuuug.supabase.co/functions/v1/reconcile-asaas-subscriptions',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || vault.decrypted_secret('reconcile_auth_token'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('source', 'pg_cron')
  );
  $$
);
```

**Auth pattern:** store a dedicated `reconcile_auth_token` in Supabase Vault (NOT the service_role key — separation of concerns). Edge function verifies the token via header comparison. This mirrors the OAUTH_STATE_SECRET pattern from Phase 1 D-10.

**Sentry alert if drift > 5% rows** — pseudo-code in the edge function:
```ts
if (driftPercent > 5) {
  await Sentry.captureMessage(
    `Asaas reconcile drift: ${driftCount}/${totalCount} rows out of sync`,
    'warning',
  );
}
```

---

## §3 Subscription State Machine

**Columns required on `user_subscriptions`** (extend existing table — most fields already exist per Phase 1):

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK (exists) |
| `user_id` | UUID | FK auth.users (exists, FK added in 120007) |
| `plan` | subscription_plan | exists; canonical {free,pro,vip} |
| `is_active` | boolean | exists |
| **`status`** | TEXT | NEW — state machine state |
| **`asaas_customer_id`** | TEXT | NEW — set in profiles, also denormalize here |
| **`asaas_subscription_id`** | TEXT | NEW — Asaas sub_xxx |
| **`billing_period`** | TEXT | exists — monthly/semiannual/annual |
| **`price`** | NUMERIC(10,2) | exists |
| **`started_at`** | TIMESTAMPTZ | exists |
| **`expires_at`** | TIMESTAMPTZ | exists |
| **`last_paid_at`** | TIMESTAMPTZ | NEW |
| **`grace_period_ends_at`** | TIMESTAMPTZ | NEW — for past_due → canceled transition |

**`status` enum values:**

```sql
CREATE TYPE subscription_status AS ENUM (
  'pending_first_charge',  -- created via create-checkout-session, no payment yet
  'trial',                  -- card validated, waiting for day-7 charge
  'active',                 -- paid, fully working
  'past_due',               -- payment failed, in grace period (3-7 days)
  'canceled',               -- explicitly canceled OR grace period expired
  'disputed'                -- chargeback in progress
);
```

**State machine diagram:**

```
                  [create-checkout-session]
                            │
                            ▼
              ┌─────────────────────────┐
              │  pending_first_charge   │
              └────────────┬────────────┘
                           │ PAYMENT_CREATED (trial day 0)
                           ▼
                    ┌──────────────┐
                    │    trial     │ (7 days, no plan yet)
                    └──────┬───────┘
                           │ PAYMENT_RECEIVED (day 7)        │ user cancels
                           ▼                                  ▼
                    ┌──────────────┐                  ┌─────────────┐
                    │   active     │◄────────────────►│  canceled   │
                    │ (plan=pro/   │   user cancels   │  (plan=free)│
                    │  vip live)   │                  └─────────────┘
                    └──┬───────────┘                          ▲
                       │ PAYMENT_OVERDUE                       │
                       ▼                                       │
                ┌──────────────┐                                │
                │   past_due   ├── grace expires (7d) ─────────┘
                │ (soft access)│
                └──┬───────────┘
                   │ PAYMENT_RECEIVED (retry)
                   ▼
                ┌──────────────┐
                │    active    │
                └──────────────┘

[disputed] can branch from any state via PAYMENT_CHARGEBACK_REQUESTED
```

**Webhook → state transition table:**

| Current state | Webhook event | Next state | Action |
|---------------|---------------|------------|--------|
| `pending_first_charge` | `PAYMENT_CREATED` | `trial` | set `started_at` = now |
| `trial` | `PAYMENT_CONFIRMED` or `_RECEIVED` | `active` | flip plan, `last_paid_at` = now |
| `trial` | `SUBSCRIPTION_DELETED` | `canceled` | revert plan='free' |
| `active` | `PAYMENT_OVERDUE` | `past_due` | set `grace_period_ends_at` = now+7d; SOFT keep plan |
| `past_due` | `PAYMENT_CONFIRMED` or `_RECEIVED` | `active` | clear `grace_period_ends_at` |
| `past_due` | (grace expires) — via cron | `canceled` | revert plan='free' |
| `active` | `SUBSCRIPTION_DELETED` | `canceled` | revert plan='free' (NO grace — user-initiated) |
| any | `PAYMENT_CHARGEBACK_REQUESTED` | `disputed` | freeze plan, alert ops |

**RLS on `user_subscriptions`** (Phase 1 only added SELECT for own row + service_role bypass for webhook):
- Maintain Phase 1 policy: `SELECT WHERE auth.uid() = user_id`
- NO write policies for authenticated users — webhook + reconcile cron are the ONLY writers (D-08)

---

## §4 Multi-CPF VIP Architecture (TIER-04..06)

### 4.1 Reuse of Phase 1 Trust Kernel

The `managed_accounts` table and `can_access_account()` function are already deployed in production (migration `20260512120004`). Phase 2 TIER-* only needs:

1. **`create-managed-account` edge function** (TIER-05) — creates headless `auth.users` row + `managed_accounts` row in one transaction
2. **Frontend UI** for VIP user to add/list/switch/remove managed CPFs (TIER-05 + TIER-06)
3. **RLS pattern propagation** — any new `*_select / *_update / *_delete` policy on tables that should be reachable by VIP-as-owner must use `can_access_account(auth.uid(), user_id)` instead of `auth.uid() = user_id`

### 4.2 `create-managed-account` Edge Function (TIER-05)

**Why edge function (not frontend INSERT):** the row `managed_user_id` must point at a real `auth.users` row. Creating an `auth.users` row requires service_role privilege (admin API). Service role must NEVER reach the client (Phase 1 CRIT-02).

**Skeleton:**

```ts
// supabase/functions/create-managed-account/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { parseAndValidate, z } from '../_shared/validate.ts';

const bodySchema = z.object({
  label: z.string().min(1).max(100),
  cpf: z.string().regex(/^\d{11}$/),
  full_name: z.string().min(1).max(200),
});

Deno.serve(async (req) => {
  // 1. Auth owner
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401 });
  const { data: { user }, error } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );
  if (error || !user) return new Response('Invalid token', { status: 401 });

  // 2. Server-side plan check (defense-in-depth — RLS also enforces)
  const { data: hasVip } = await supabase.rpc('has_plan', {
    _user_id: user.id,
    _required_plan: 'vip',
  });
  if (!hasVip) return new Response('VIP plan required', { status: 403 });

  // 3. Validate body
  const v = await parseAndValidate(req, bodySchema);
  if (!v.ok) return new Response(v.error, { status: v.status });
  const { label, cpf, full_name } = v.data;

  // 4. Create headless auth user (service_role privilege required)
  const headlessEmail = `headless-${crypto.randomUUID()}@managed.milespro.invalid`;
  const { data: headless, error: createErr } = await supabase.auth.admin.createUser({
    email: headlessEmail,
    email_confirm: true,                   // skip email verification
    password: crypto.randomUUID(),         // unguessable, never used
    user_metadata: { managed_by: user.id, label, cpf_partial: cpf.slice(-4) },
  });

  if (createErr) return new Response(createErr.message, { status: 500 });

  // 5. Insert profiles row for the headless user
  await supabase.from('profiles').insert({
    id: headless.user.id,
    full_name,
    cpf,                          // TODO: encrypt at rest via pgsodium (deferred)
  });

  // 6. Link via managed_accounts (RLS enforces owner=VIP — checked above)
  const { data: link, error: linkErr } = await supabase
    .from('managed_accounts')
    .insert({
      owner_user_id: user.id,
      managed_user_id: headless.user.id,
      label,
    })
    .select()
    .single();

  if (linkErr) {
    // Cleanup: delete headless auth user to avoid orphan
    await supabase.auth.admin.deleteUser(headless.user.id);
    return new Response(linkErr.message, { status: 500 });
  }

  return new Response(JSON.stringify(link), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

**Adversarial test required (AR-4 carry-over):** as soon as Phase 2 adds any new `vip_*` table OR `managed_accounts`-aware RLS, expand `src/hooks/travel/travel.adversarial.test.ts` pattern to cover:
- Pro user attempts `INSERT INTO managed_accounts` → 403
- VIP user attempts `INSERT INTO managed_accounts WITH owner_user_id != self` → 403 (RLS WITH CHECK)
- Free user attempts SELECT on managed user's data → empty

### 4.3 ManagedAccountContext (TIER-06)

**UI need:** VIP user has 1..N managed CPFs. Need a "switcher" that selects which user_id is "active" — Dashboard then reads data as if it were that user.

**React Context pattern:**

```tsx
// src/contexts/ManagedAccountContext.tsx
import { createContext, useContext, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

interface ManagedAccount {
  id: string;
  managed_user_id: string;
  label: string;
}

interface Context {
  activeUserId: string;          // either owner's id or a managed user's id
  switchTo: (managedUserId: string) => void;
  managedAccounts: ManagedAccount[];
  isOwnAccount: boolean;
}

const ctx = createContext<Context | null>(null);

export function ManagedAccountProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isVip } = useSubscription();
  const [activeUserId, setActiveUserId] = useState(user?.id ?? '');

  const { data: managedAccounts = [] } = useQuery({
    queryKey: ['managed_accounts', user?.id],
    queryFn: async () => {
      if (!isVip) return [];
      const { data } = await supabase
        .from('managed_accounts')
        .select('id, managed_user_id, label')
        .is('revoked_at', null);
      return data ?? [];
    },
    enabled: !!user && isVip,
  });

  const value = useMemo(() => ({
    activeUserId,
    switchTo: setActiveUserId,
    managedAccounts,
    isOwnAccount: activeUserId === user?.id,
  }), [activeUserId, managedAccounts, user?.id]);

  return <ctx.Provider value={value}>{children}</ctx.Provider>;
}

export const useManagedAccount = () => {
  const v = useContext(ctx);
  if (!v) throw new Error('useManagedAccount must be used inside ManagedAccountProvider');
  return v;
};
```

**Every existing data-fetching hook then uses `activeUserId` instead of `user.id`** — backend RLS via `can_access_account()` already permits the lookup (Phase 1 §4.3).

---

## §5 Compliance, Consent & LGPD (COMPL-01..06)

### 5.1 lgpd-export Edge Function (COMPL-01)

**Legal obligation:** LGPD Art. 18 — 15-day hard deadline [CITED: pge.es.gov.br + iclg.com 2025-2026 Brazil DP report]. We target **<24h SLA** but technically <5 min synchronous.

**Bundle format** — JSON + CSV in a single response (zip stream in Deno is complex; simpler is JSON for structured data + CSV for "transactional" tables, served as multipart or sequential downloads):

```ts
// supabase/functions/lgpd-export/index.ts
Deno.serve(async (req) => {
  // 1. Auth user (only the data subject themselves OR DPO via separate flow)
  const { user } = await getAuthUser(req);

  // 2. Rate limit: 1/hour/user
  const { data: lastExport } = await supabase
    .from('lgpd_export_log')
    .select('created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastExport && Date.now() - new Date(lastExport.created_at).getTime() < 3600_000) {
    return new Response('Rate limited — wait 1h between exports', { status: 429 });
  }

  // 3. Collect data
  const [profile, subscription, operations, programs, travelData, consents] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('user_subscriptions').select('*').eq('user_id', user.id),
    supabase.from('operations').select('*').eq('user_id', user.id),
    supabase.from('user_programs').select('*').eq('user_id', user.id),
    supabase.from('travel_tickets').select('*').eq('user_id', user.id), // + other travel_*
    supabase.from('user_consents').select('*').eq('user_id', user.id),
  ]);

  // 4. Bundle as JSON
  const bundle = {
    export_timestamp: new Date().toISOString(),
    user_id: user.id,
    email: user.email,
    legal_basis: 'LGPD Art. 18 II/V — direito de acesso e portabilidade',
    data: {
      profile: profile.data,
      subscription: subscription.data,
      operations: operations.data,
      user_programs: programs.data,
      travel: travelData.data,
      consent_log: consents.data,
    },
  };

  // 5. Log + audit trail
  await supabase.from('lgpd_export_log').insert({
    user_id: user.id,
    delivered_at: new Date().toISOString(),
    row_counts: {
      operations: operations.data?.length ?? 0,
      // ...
    },
  });

  // 6. Return inline JSON OR email link via Resend (preferred for >5MB)
  return new Response(JSON.stringify(bundle, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="milespro-export-${user.id}.json"`,
    },
  });
});
```

**Recommended UI:** button "Exportar meus dados" in `/configuracoes/privacidade`; modal "Será enviado por email em até 5 minutos para $user.email".

### 5.2 Consent Banner + user_consents (COMPL-03 + D-16)

**Schema:**

```sql
-- Migration: create user_consents
CREATE TABLE public.user_consents (
  id                   UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_version      TEXT         NOT NULL,        -- e.g. '2026-05-12'
  terms_accepted_at    TIMESTAMPTZ,
  privacy_accepted_at  TIMESTAMPTZ,
  analytics_opted_in   BOOLEAN      NOT NULL DEFAULT false,
  marketing_opted_in   BOOLEAN      NOT NULL DEFAULT false,
  ip_address           INET,
  user_agent           TEXT,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX user_consents_user_idx ON public.user_consents (user_id, created_at DESC);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_consents_select ON public.user_consents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_consents_insert ON public.user_consents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- No UPDATE / DELETE — consent log is append-only by design (audit trail per LGPD Art. 8)
```

**`useConsent()` hook:**

```ts
// src/hooks/useConsent.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Consent {
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
  analytics_opted_in: boolean;
  marketing_opted_in: boolean;
  consent_version: string;
}

const CURRENT_CONSENT_VERSION = '2026-05-12';

export function useConsent() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: consent, isLoading } = useQuery({
    queryKey: ['user_consent', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('user_consents')
        .select('*')
        .eq('user_id', user.id)
        .eq('consent_version', CURRENT_CONSENT_VERSION)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const saveConsent = useMutation({
    mutationFn: async (input: Partial<Consent>) => {
      if (!user) throw new Error('not authenticated');
      const { error } = await supabase.from('user_consents').insert({
        user_id: user.id,
        consent_version: CURRENT_CONSENT_VERSION,
        terms_accepted_at: input.terms_accepted_at ?? null,
        privacy_accepted_at: input.privacy_accepted_at ?? null,
        analytics_opted_in: input.analytics_opted_in ?? false,
        marketing_opted_in: input.marketing_opted_in ?? false,
        // ip_address + user_agent ideally captured server-side via edge fn
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_consent'] }),
  });

  return {
    consent,
    isLoading,
    needsConsent: !consent || !consent.terms_accepted_at || !consent.privacy_accepted_at,
    saveConsent: saveConsent.mutate,
    analyticsOptedIn: consent?.analytics_opted_in ?? false,
  };
}
```

**`<ConsentBanner>` component (anti-dark-pattern, LGPD Art. 8 §4 compliant — separate checkboxes):**

```tsx
// src/components/legal/ConsentBanner.tsx (claude discretion)
export function ConsentBanner() {
  const { needsConsent, saveConsent } = useConsent();
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [analytics, setAnalytics] = useState(false);  // default OFF — LGPD opt-in
  const [marketing, setMarketing] = useState(false);  // default OFF

  if (!needsConsent) return null;

  const canSubmit = terms && privacy; // analytics+marketing genuinely optional

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-lg p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-3">
        <h3 className="font-semibold">Antes de continuar, precisamos do seu consentimento</h3>
        <div className="space-y-2">
          <CheckboxLine checked={terms} onChange={setTerms} required>
            Li e aceito os <Link to="/termos">Termos de Uso</Link>
          </CheckboxLine>
          <CheckboxLine checked={privacy} onChange={setPrivacy} required>
            Li e aceito a <Link to="/privacidade">Política de Privacidade</Link>
          </CheckboxLine>
          <CheckboxLine checked={analytics} onChange={setAnalytics}>
            (Opcional) Permito uso de analytics agregado para melhorar o produto
          </CheckboxLine>
          <CheckboxLine checked={marketing} onChange={setMarketing}>
            (Opcional) Quero receber emails de novidades e dicas de uso
          </CheckboxLine>
        </div>
        <Button
          disabled={!canSubmit}
          onClick={() => saveConsent({
            terms_accepted_at: terms ? new Date().toISOString() : null,
            privacy_accepted_at: privacy ? new Date().toISOString() : null,
            analytics_opted_in: analytics,
            marketing_opted_in: marketing,
          })}
        >
          Confirmar e continuar
        </Button>
      </div>
    </div>
  );
}
```

### 5.3 PostHog Consent-Gated Init (TEL-01)

**Replace existing `src/lib/posthog.ts` mock** with the real wrapper. Key insight: **PostHog must NOT init until `analytics_opted_in === true`** (per HIGH-03 + D-16).

```ts
// src/lib/posthog.ts (rewrite — TEL-01)
import posthog from 'posthog-js';
import { logger } from './logger';

let initialized = false;

const API_KEY = import.meta.env.VITE_POSTHOG_KEY;
const API_HOST = import.meta.env.VITE_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

export function initPosthog() {
  if (initialized) return;
  if (!API_KEY) {
    logger.warn('[Posthog] No API key — analytics disabled');
    return;
  }

  posthog.init(API_KEY, {
    api_host: API_HOST,                            // EU region for LGPD residency
    ui_host: 'https://eu.posthog.com',
    person_profiles: 'identified_only',            // anonymous events don't create person rows
    property_denylist: ['cpf', 'email', 'phone', '$ip'],  // HIGH-03 — never send PII
    autocapture: false,                            // explicit events only — no DOM scraping
    capture_pageview: false,                       // explicit pageview() calls
    capture_pageleave: false,
    disable_session_recording: true,               // session replay would capture CPFs in inputs
    opt_out_capturing_by_default: true,            // default OFF — flip via opt_in
    loaded: (ph) => {
      // Will be flipped via opt_in_capturing() once consent is granted
      ph.opt_out_capturing();
    },
  });

  initialized = true;
  logger.info('[Posthog] Initialized (opt-out by default)');
}

// Called by ConsentBanner after analytics_opted_in = true
export function enableAnalytics() {
  if (!initialized) initPosthog();
  posthog.opt_in_capturing();
  logger.info('[Posthog] Opted in to capturing');
}

export function disableAnalytics() {
  if (!initialized) return;
  posthog.opt_out_capturing();
  logger.info('[Posthog] Opted out of capturing');
}

export function identify(userId: string, properties?: Record<string, unknown>) {
  if (!initialized) return;
  // ONLY identify by UUID — never by CPF/email
  const safeProperties = { ...properties };
  delete safeProperties.email;
  delete safeProperties.cpf;
  delete safeProperties.phone;
  posthog.identify(userId, safeProperties);
}

export function track(eventName: string, properties?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.capture(eventName, properties);
}

export function pageview(path: string, properties?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.capture('$pageview', { $current_url: path, ...properties });
}

export function reset() {
  if (!initialized) return;
  posthog.reset();
}
```

**Event taxonomy (TEL-01 + D-13 — planner expands):**

| Event | When fired | Required properties | Optional |
|-------|------------|---------------------|----------|
| `signup` | After email confirmed | `signup_source` ('organic'/'landing') | `referrer_domain` |
| `first_balance_added` | First INSERT to `operations` | `program_code` (livelo/smiles/etc) | — |
| `viewed_pricing` | Pageview on `/planos` or `/assinatura` | `from_path` | — |
| `started_checkout` | `create-checkout-session` succeeded | `plan` (pro/vip), `cycle` (monthly/etc), `value` | — |
| `paid_first_invoice` | `PAYMENT_RECEIVED` for first cycle | `plan`, `cycle`, `value`, `subscription_id` | — |
| `renewed` | `PAYMENT_RECEIVED` for subsequent cycle | `plan`, `cycle`, `cycle_number` | — |
| `cancelled` | `SUBSCRIPTION_DELETED` | `plan`, `tenure_days` | `cancel_reason` (future survey) |
| `promotion_alert_shown` | D-13 killer feature | `from_program`, `to_program`, `bonus_pct` | — |
| `promotion_alert_clicked` | D-13 killer feature | same | — |
| `consent_given` | ConsentBanner submit | `analytics`, `marketing`, `version` | — |
| `lgpd_export_requested` | COMPL-01 button | — | — |
| `lgpd_delete_requested` | COMPL-02 button | — | — |

### 5.4 Sentry with PII Scrubbing (TEL-03)

**Install:**
```bash
npm install @sentry/react @sentry/vite-plugin
```

**Init (web client):**

```ts
// src/lib/sentry.ts
import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN;

const CPF_REGEX = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const EMAIL_REGEX = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g;

export function initSentry() {
  if (!DSN) return;

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      // NOTE: replayIntegration is OFF — session replay would capture CPF in inputs
    ],
    tracesSampleRate: 0.1,         // 10% trace sampling at MVP — adjust post-launch
    sendDefaultPii: false,          // HIGH-03 — explicit opt-out
    beforeSend(event) {
      // Strip CPF + email from message + breadcrumbs + URLs
      if (event.message) {
        event.message = event.message
          .replace(CPF_REGEX, '[CPF_REDACTED]')
          .replace(EMAIL_REGEX, '[EMAIL_REDACTED]');
      }
      if (event.request?.url) {
        event.request.url = event.request.url
          .replace(/[?&]cpf=[^&]+/gi, '&cpf=[REDACTED]')
          .replace(/[?&]email=[^&]+/gi, '&email=[REDACTED]');
      }
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((b) => ({
          ...b,
          message: b.message
            ?.replace(CPF_REGEX, '[CPF_REDACTED]')
            ?.replace(EMAIL_REGEX, '[EMAIL_REDACTED]'),
        }));
      }
      // Never send user.email
      if (event.user) {
        delete event.user.email;
        delete event.user.username;
        // user.id (UUID) is acceptable — opaque to Sentry
      }
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      // Drop verbose console.log breadcrumbs — too noisy + PII risk
      if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
        return null;
      }
      return breadcrumb;
    },
  });
}

export function identifyUser(userId: string) {
  Sentry.setUser({ id: userId });  // UUID only — NEVER cpf/email
}
```

**Edge function Sentry (Deno):** Sentry has a Deno SDK (`@sentry/deno` via esm.sh) — pattern same as client, applied to `asaas-webhook` and `create-checkout-session`.

**Phase 3 note:** Capacitor SDK (`@sentry/capacitor` v4) wraps native iOS/Android crashes — install in Phase 3, not Phase 2.

### 5.5 lgpd-delete (COMPL-02 + D-18 soft-delete)

**Migration: extend `profiles`:**

```sql
-- Migration: soft delete columns
ALTER TABLE public.profiles
  ADD COLUMN deletion_requested_at  TIMESTAMPTZ,
  ADD COLUMN deletion_confirmed_at  TIMESTAMPTZ,
  ADD COLUMN deletion_token         TEXT;       -- one-time HMAC-signed link

CREATE INDEX profiles_deletion_pending_idx
  ON public.profiles (deletion_requested_at)
  WHERE deletion_requested_at IS NOT NULL AND deletion_confirmed_at IS NULL;

-- Audit table (survives the user's data)
CREATE TABLE public.deletion_audit (
  id                    UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deleted_user_id       UUID         NOT NULL,             -- NO FK — auth.users will be gone
  requested_at          TIMESTAMPTZ  NOT NULL,
  confirmed_at          TIMESTAMPTZ  NOT NULL,
  hard_deleted_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  asaas_customer_deleted_at  TIMESTAMPTZ,
  posthog_person_deleted_at  TIMESTAMPTZ,
  sentry_user_deleted_at     TIMESTAMPTZ,
  row_counts_deleted    JSONB        NOT NULL,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.deletion_audit ENABLE ROW LEVEL SECURITY;
-- No policies — only service_role from edge function inserts/reads (e.g. admin DPO)
```

**Cascade order (critical for D-18):**

1. User clicks "Excluir minha conta" → `lgpd-delete?action=request` edge function
2. Edge function: generates token (HMAC-signed UUID), stores `deletion_token` + `deletion_requested_at = now()`
3. Resend sends email: "Confirme exclusão clicando aqui: https://app.milespro.net.br/lgpd/confirm?token=..." (link valid 24h)
4. User clicks → frontend POSTs to `lgpd-delete?action=confirm` → edge fn verifies token, sets `deletion_confirmed_at = now()`
5. 7 days later, `pg_cron` daily job `lgpd-delete-cleanup` finds rows where `deletion_confirmed_at < now() - interval '7 days'` and processes hard-delete:
   - DELETE Asaas customer (`DELETE /v3/customers/{id}`) → store ts in audit
   - DELETE PostHog person (Cloud EU API) → store ts in audit
   - DELETE Sentry user (Sentry API) → store ts in audit
   - DELETE from `auth.users` → cascade via FK to all `user_id`-keyed rows (Phase 1 added FK CASCADE on `user_subscriptions`; verify others)
   - INSERT into `deletion_audit` with row counts BEFORE deletion

**RLS hide pattern for soft-deleted users:**

```sql
-- profiles SELECT must filter out users in deletion window from showing data
-- to OTHER users (the user themselves still sees their data until hard-delete)
-- This affects managed_accounts shown to VIP owners.
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id  -- self always allowed
    OR (
      deletion_requested_at IS NULL  -- not in deletion window
      AND public.can_access_account(auth.uid(), id)  -- VIP multi-CPF
    )
  );
```

### 5.6 Privacidade.tsx Rewrite (COMPL-04 + D-17)

**Required edits to `src/pages/Privacidade.tsx`:**

| Line | Current | Replace with |
|------|---------|--------------|
| 56 | "processados diretamente pela Stripe" | "processados diretamente pela Asaas (gateway brasileiro certificado PCI DSS)" |
| 59 | "via Google Analytics 4" | Remove if not in use OR clarify "agregado e anonimizado via PostHog Cloud EU, opt-in via banner de consentimento" |
| 94 | "Stripe — processamento de pagamentos" | "Asaas — processamento de pagamentos e emissão de NFS-e" |
| 96 | "Google Analytics 4 — analytics anonimizado" | "PostHog Cloud EU — product analytics (opt-in via banner)" |
| (add new) | — | "Sentry — error tracking (PII scrubbed antes do envio)" |
| (add new) | — | "Resend — email transacional" |
| (add new) | — | "Lovable Cloud (Supabase managed) — banco de dados + edge functions (região: us-east-1 — vide §10 transferência internacional)" |
| 127 | `mailto:suporte@milespro.net.br` | `mailto:dpo@milespro.net.br` |
| 152 | "Stripe, Google" | "Asaas (BR), Google (US), PostHog (EU), Sentry (US), Resend (US)" |
| (after 154) | — | **New SCC clause:** "Para transferências BR→US (Supabase, Sentry, Resend), aplicamos as **Cláusulas Contratuais Padrão (Standard Contractual Clauses — SCC)** conforme orientação da ANPD para transferências internacionais sob LGPD Art. 33. O nível de proteção das suas informações é equivalente ao garantido pela LGPD." |
| 165 | `mailto:suporte@milespro.net.br` | `mailto:dpo@milespro.net.br` |
| (add §13) | — | "DPO designado: founder, contato `dpo@milespro.net.br`. Responde em até 15 dias úteis a solicitações de direitos do titular (LGPD Art. 18)." |

### 5.7 Termos.tsx Fixes (COMPL-05 + D-03 + D-11)

**Required edits to `src/pages/Termos.tsx`:**

| Line | Current | Replace with |
|------|---------|--------------|
| 69 | "planos pagos (Plus e Pro)" | "planos pagos (Pro e VIP)" |
| 69-72 | "Todos os planos pagos iniciam com **14 dias de trial gratuito**, sem necessidade de cartão de crédito" | "O plano Pro oferece **7 dias de trial gratuito com cartão de crédito requerido** (a cobrança é feita automaticamente ao fim do 7º dia, com possibilidade de cancelamento a qualquer momento antes disso pela área de assinatura)." |
| 76 | "via Stripe (parceiro certificado PCI DSS)" | "via Asaas (gateway brasileiro certificado PCI DSS), com opções de Pix, Cartão de Crédito e Boleto" |
| 101-107 | "Módulo Agência (plano Pro)" | "Módulo Multi-CPF (plano VIP)" — atualizar texto correspondente |
| 149-150 | "7 dias de garantia nos planos pagos" | "**Garantia incondicional de 7 dias após primeira cobrança** — peça reembolso por email a `dpo@milespro.net.br` (D-19)." |
| 153 | `mailto:suporte@milespro.net.br` | Keep as `suporte@` for general support, but ADD `dpo@milespro.net.br` linha explicita |

### 5.8 DPO Email (COMPL-06 + D-20)

Setup steps for Phase 2 W1:
1. Configure Resend custom domain `milespro.net.br` (D-24)
2. Cloudflare Email Routing creates 3 forwarders:
   - `noreply@milespro.net.br` — outbound only via Resend
   - `suporte@milespro.net.br` → founder's Gmail (Crisp can also receive here)
   - `dpo@milespro.net.br` → founder's Gmail with `+dpo` label for triage
3. Update all `mailto:` references (search/replace: `suporte@milespro.net.br` → `dpo@milespro.net.br` ONLY in privacy/LGPD contexts; keep `suporte@` for general support questions)
4. Add DPO footer block visible on every page (privacy policy footer at minimum)

---

## §6 Tier Differentiation Implementation (TIER-01..06)

### 6.1 Free Limits (TIER-01 + D-12)

**`useSubscription.ts` change:**

```ts
// src/hooks/useSubscription.ts:131-137
const PLAN_DEFAULTS = {
  free: {
    maxPrograms: 3,                  // D-12: bump from 1 to 3
    historyDays: 30,
    maxOperationsPerMonth: 20,
    maxUsers: 1,
    maxAccounts: 5,                  // NEW field — D-12: 5 contas
  },
  // pro / vip unchanged
};
```

**RLS policy on `user_programs` (NEW):**

```sql
-- Free users can only INSERT/UPDATE if their current count < 3
CREATE POLICY user_programs_insert_free_limit ON public.user_programs
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      public.has_plan(auth.uid(), 'pro')          -- Pro/VIP unlimited
      OR (
        -- Free: enforce count < 3
        (SELECT COUNT(*) FROM public.user_programs
         WHERE user_id = auth.uid() AND is_custom = true) < 3
      )
    )
  );
```

**[ASSUMED]** the table name for "contas" is `program_accounts` — planner verifies during W1.

### 6.2 Pro Alert Antecipação (TIER-02)

**Schema:** add column to `user_settings` (or wherever alert prefs live):

```sql
ALTER TABLE public.user_settings
  ADD COLUMN alert_antecipation_days INTEGER NOT NULL DEFAULT 30
  CHECK (alert_antecipation_days IN (30, 60, 90, 180));
```

**RLS gating** (only Pro+ can set > 30):

```sql
CREATE POLICY user_settings_update_alert_antecipation ON public.user_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      alert_antecipation_days = 30                       -- everyone can keep default
      OR public.has_plan(auth.uid(), 'pro')              -- only Pro/VIP can extend
    )
  );
```

### 6.3 Pro Killer Feature: Personalized Promotion Alerts (TIER-03 + D-13)

**Architecture:**

1. Extend `supabase/functions/fetch-promotions/index.ts` to correlate `promotion.programs[*]` (from-program/to-program/bonus_pct) with the **caller's** `user_programs` rows (balance > 0).
2. Add a new edge function `compute-personalized-promos` that runs nightly via pg_cron — for each Pro+ user, write to a new table `user_promo_alerts(user_id, promo_id, from_program, to_program, bonus_pct, balance_in_from, created_at, dismissed_at)`.
3. Frontend: new route `/promocoes` OR section on Dashboard — reads `user_promo_alerts` filtered by `dismissed_at IS NULL`.
4. PostHog events fire from UI: `promotion_alert_shown` on render, `promotion_alert_clicked` on CTA click, `promotion_alert_dismissed` on X.

**RLS on `user_promo_alerts`:**

```sql
CREATE POLICY user_promo_alerts_select ON public.user_promo_alerts
  FOR SELECT
  USING (
    auth.uid() = user_id
    AND public.has_plan(auth.uid(), 'pro')   -- Free sees nothing
  );

CREATE POLICY user_promo_alerts_update ON public.user_promo_alerts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND public.has_plan(auth.uid(), 'pro')
  );

-- No INSERT policy — only service_role from edge function writes
```

### 6.4 PostHog Event Coverage (TEL-01 + D-13)

See §5.3 event taxonomy table — TIER-03 adds `promotion_alert_*` events.

### 6.5 MRR Dashboard Rewrite (TEL-02 + D-14)

**Drop existing `supabase/functions/mrr-dashboard/index.ts`** — `PLAN_PRICES` const has legacy `basic`/`plus`/`pro_familia` values that no longer exist in production.

**New approach:**

```ts
// supabase/functions/mrr-dashboard/index.ts (rewrite)
Deno.serve(async (req) => {
  // 1. Auth — admin only
  const supabase = createClient(/* service_role */);
  const { user } = await getAuthUser(req, supabase);
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_admin) return new Response('Forbidden', { status: 403 });

  // 2. Fetch all active subs from Asaas (source of truth — D-08)
  const all: any[] = [];
  let offset = 0;
  while (true) {
    const res = await fetch(
      `${ASAAS_BASE}/subscriptions?status=ACTIVE&limit=100&offset=${offset}`,
      { headers: { 'access_token': ASAAS_API_KEY } },
    );
    const page = await res.json();
    all.push(...(page.data ?? []));
    if (!page.hasMore) break;
    offset += 100;
  }

  // 3. Compute MRR = sum(value / cycle_months_normalized)
  const CYCLE_MONTHS = {
    MONTHLY: 1,
    SEMIANNUALLY: 6,
    YEARLY: 12,
  };

  let mrr = 0;
  const cohorts: Record<string, number> = { pro: 0, vip: 0 };
  for (const sub of all) {
    const months = CYCLE_MONTHS[sub.cycle as keyof typeof CYCLE_MONTHS] ?? 1;
    const monthly = sub.value / months;
    mrr += monthly;
    // Map externalReference back to our plan
    const { data: dbSub } = await supabase
      .from('user_subscriptions')
      .select('plan')
      .eq('asaas_subscription_id', sub.id)
      .single();
    if (dbSub?.plan === 'pro') cohorts.pro += monthly;
    if (dbSub?.plan === 'vip') cohorts.vip += monthly;
  }

  // 4. Fetch funnel from PostHog query API (last 30d)
  // ... [planner expands — PostHog HogQL queries]

  return new Response(JSON.stringify({
    mrr_total: mrr,
    mrr_by_plan: cohorts,
    active_subscriptions: all.length,
    // funnel: { signup, first_balance, viewed_pricing, started_checkout, paid_first_invoice }
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

**`is_admin` column** (add to `profiles`):

```sql
ALTER TABLE public.profiles
  ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

-- Bootstrapping: UPDATE profiles SET is_admin = true WHERE id = '<founder-uid>';
```

---

## §7 LAUNCH Infra (LAUNCH-01/04/05)

### 7.1 Vercel Production Deploy (LAUNCH-01 + D-05/D-06)

**`vercel.json` for Vite SPA deep linking** [CITED: vercel.com/docs/frameworks/frontend/vite]:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**DNS records (Cloudflare DNS pointing to Vercel)** [CITED: vercel.com/docs/domains/managing-dns-records]:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | `app` | `cname.vercel-dns.com` | Auto |
| A | `@` (apex `milespro.net.br`) | `76.76.21.21` (Vercel apex) | Auto |
| TXT | `_vercel` | Vercel-provided verification token | Auto |

**Apex redirect** (`milespro.net.br` → landing on `milespro.net.br` itself, NOT `app.*`):
- Configure in Cloudflare Page Rules: `https://www.milespro.net.br/*` → `https://milespro.net.br/$1` (301)
- Vercel handles SSL automatically via Let's Encrypt

**GitHub integration:**
- Connect repo via Vercel dashboard → auto-deploy on push to `main`
- Preview deployments on every PR
- Env vars in Vercel dashboard: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`, `VITE_SENTRY_DSN`, `VITE_CRISP_WEBSITE_ID`

**Critical:** **Phase 2 production deploy via Vercel does NOT replace the Lovable Cloud database**. Vercel hosts the SPA bundle; Supabase/Lovable still hosts edge functions + DB. The SPA at `app.milespro.net.br` hits `https://opusftqbbaozucmbuuug.supabase.co/rest/v1/*` and `/functions/v1/*`.

**Asaas webhook URL:** `https://opusftqbbaozucmbuuug.supabase.co/functions/v1/asaas-webhook` (registered in Asaas dashboard).

### 7.2 Landing + Pricing CTA Replacement (LAUNCH-04 + D-11)

**`Assinatura.tsx:226-302` `handlePlanCta` rewrite:**

```tsx
// Replace WhatsApp/lead logic with direct Asaas checkout call
const handlePlanCta = async (plan: typeof plans[0]) => {
  if (isPlanCtaDisabled(plan)) return;

  if (plan.monthlyPrice === 0) {
    // Free already available — just confirm
    toast.success('Plano gratuito já disponível.');
    return;
  }

  // iOS Path C: if Capacitor + iOS, show neutral copy (D-10)
  if (isIOSCapacitor()) {
    toast.info('Gerencie sua assinatura em milespro.net.br no navegador.');
    return;
  }

  track('started_checkout', { plan: plan.id, cycle: billingPeriod, value: getDisplayPrice(plan) });

  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { plan: plan.id as 'pro' | 'vip', cycle: billingPeriod },
  });

  if (error) {
    // Fallback: log to subscription_leads as shadow record (D-11)
    await createSubscriptionLead({
      plan: plan.id as 'pro' | 'vip',
      billingPeriod,
      source: 'asaas_failure',
      email: user?.email || null,
      userId: user?.id || null,
      priceLabel: `${price}/mês`,
      totalLabel: total,
      whatsappSent: false,
      metadata: { error: String(error), via: 'create-checkout-session' },
    });
    toast.error('Erro ao iniciar checkout. Tente novamente em alguns minutos.');
    return;
  }

  // Redirect to Asaas hosted checkout
  window.location.href = data.checkoutUrl;
};
```

**`Index.tsx` PricingSection (D-11 rename "Plus" → "Pro"):** find/replace within `Index.tsx:181-232` and `comparisonFeatures` array. Plan-checker can verify via grep `'Plus'\|isPlus\|canAccessPlus` returning zero matches in `src/` (same guard as Phase 1 Plan 02 §B-2).

### 7.3 iOS Path C Runtime Hiding (D-10)

**Hook:**

```ts
// src/hooks/useIsIOSCapacitor.ts
import { Capacitor } from '@capacitor/core';

export function useIsIOSCapacitor(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}
```

**Application points:**
- `Assinatura.tsx`: return neutral copy panel instead of pricing cards
- `Index.tsx` PricingSection: same
- `UpgradeBanner.tsx`: hide entirely
- Any "Upgrade para Pro" button: replace with `<p>Gerencie sua assinatura em milespro.net.br</p>` (no clickable link)

**Phase 3 verification gate** (designed in Phase 2 — see §8 below): `strings MilesPro.app | grep -E 'planos|checkout|R\$|Upgrade'` must return zero matches.

### 7.4 Crisp Helpdesk Embed (LAUNCH-05 + D-23)

**Install:**
```bash
npm install crisp-sdk-web
```

**Embed in landing + dashboard:**

```tsx
// src/components/layout/CrispWidget.tsx
import { useEffect } from 'react';
import { Crisp } from 'crisp-sdk-web';
import { useAuth } from '@/hooks/useAuth';

const WEBSITE_ID = import.meta.env.VITE_CRISP_WEBSITE_ID;

export function CrispWidget() {
  const { user } = useAuth();

  useEffect(() => {
    if (!WEBSITE_ID) return;
    Crisp.configure(WEBSITE_ID, {
      autoload: true,
      tokenId: user?.id ?? undefined,   // pseudo-anon identification
    });
    if (user) {
      Crisp.user.setEmail(user.email ?? '');
      // Don't set CPF — Crisp stores chat history outside BR per LGPD declaration
    }
  }, [user?.id, user?.email]);

  return null;
}
```

**Mount in `App.tsx` after consent check** — Crisp loads after user passes ConsentBanner (privacy_accepted_at).

**LGPD declaration** (added to Privacidade.tsx per §5.6): "Crisp — provedor de helpdesk live-chat; armazena histórico de chat em servidores na União Europeia".

### 7.5 Resend Domain Setup (D-24)

**DNS records on `milespro.net.br` (Cloudflare DNS)** [CITED: resend.com/docs/dashboard/domains/dmarc + dmarcdkim.com Resend guide]:

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| MX | `send` | `feedback-smtp.us-east-1.amazonses.com` (priority 10) | SES routing |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | SPF |
| TXT | `resend._domainkey` | Resend-provided DKIM key | DKIM |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@milespro.net.br` | DMARC monitoring (later `p=quarantine` after 2 weeks) |

**Warmup runbook:**
- Week 1 (W1): send ONLY to founder's `@gmail.com` + 2-3 dev addresses. 5-10 emails/day max.
- Week 2 (W2): allow real users; cap at 30/day. Monitor Resend bounce rate.
- Week 3+: full volume. Switch DMARC `p=none` → `p=quarantine` if bounce rate <5%.

**Email templates** (React Email — `src/templates/emails/`):
- `WelcomeEmail.tsx` — after signup
- `TrialEndingEmail.tsx` — 3 days before first charge
- `PaymentReceivedEmail.tsx` — confirmation after `PAYMENT_RECEIVED` webhook
- `PaymentFailedEmail.tsx` — after `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED`
- `DeletionConfirmEmail.tsx` — for D-18 confirm link
- `LgpdExportReadyEmail.tsx` — for COMPL-01 when async

---

## §8 Pitfall Guardrails — Verification Gates

Each guardrail from ROADMAP.md §Phase 2 must appear in plan acceptance criteria as a **concrete, runnable check** (SQL / curl / test). The planner converts these into BLOCKERs the plan-checker can verify.

### Gate G-CRIT-04 — Webhook Idempotency Proven by Replay

**Check:** Double-fire the same event and verify exactly one side effect.

```bash
# Sandbox test in W2
EVENT_ID="evt_$(uuidgen)"
PAYLOAD='{"id":"'$EVENT_ID'","event":"PAYMENT_RECEIVED","payment":{"subscription":"sub_test","value":37.90,"paymentDate":"2026-05-19"}}'

# First call — should process normally
curl -i -X POST https://opusftqbbaozucmbuuug.supabase.co/functions/v1/asaas-webhook \
  -H "asaas-access-token: $ASAAS_WEBHOOK_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"
# Expect: HTTP 200, message "OK"

# Second call — same event_id, should be idempotent
curl -i -X POST https://opusftqbbaozucmbuuug.supabase.co/functions/v1/asaas-webhook \
  -H "asaas-access-token: $ASAAS_WEBHOOK_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"
# Expect: HTTP 200, message "OK (duplicate ignored)"

# Verify in DB: exactly ONE row in webhook_events
psql "$DB_URL" -c "SELECT COUNT(*) FROM webhook_events WHERE event_id = '$EVENT_ID'"
# Expect: 1

# Verify in DB: exactly ONE row in user_subscriptions changed to plan='pro'
# (specific to test data setup)
```

**Plan acceptance criterion:** PAY-03 plan must include this exact test as a numbered acceptance criterion, runnable post-deploy.

### Gate G-CRIT-05 — LGPD 15-Day DSR Clock

**Check:** End-to-end DSR export + delete on a real test account within minutes.

```bash
# 1. Create test user via Supabase dashboard
# 2. Add data: insert 1 row each into operations, user_programs, travel_tickets
# 3. As that user, call lgpd-export
curl -i -X GET https://opusftqbbaozucmbuuug.supabase.co/functions/v1/lgpd-export \
  -H "Authorization: Bearer $USER_JWT"
# Expect: HTTP 200, JSON bundle contains all user data, response time <5s

# 4. Call lgpd-delete request
curl -i -X POST "https://opusftqbbaozucmbuuug.supabase.co/functions/v1/lgpd-delete?action=request" \
  -H "Authorization: Bearer $USER_JWT"
# Expect: HTTP 200, deletion_token issued, email sent via Resend

# 5. Click confirm link — check email
# 6. After 7 days (or manual cron trigger), verify:
psql "$DB_URL" -c "SELECT * FROM auth.users WHERE id = '$TEST_USER_ID'"
# Expect: 0 rows
psql "$DB_URL" -c "SELECT * FROM deletion_audit WHERE deleted_user_id = '$TEST_USER_ID'"
# Expect: 1 row with hard_deleted_at set
```

**Plan acceptance criterion:** COMPL-02 plan must include UAT walkthrough with screenshots from a real test account.

### Gate G-CRIT-03 — Apple Path C Design Verification

**Check:** No pricing/checkout strings reachable from iOS code path.

```bash
# Design-time check (Phase 2): grep source for iOS branch
grep -rE "Upgrade|R\\\$|/planos|/checkout|stripe|asaas" src/ --include="*.tsx" --include="*.ts" \
  | grep -v "useIsIOSCapacitor\|//.*ios" \
  | head -20
# Visually inspect: every match should be either (a) inside a !useIsIOSCapacitor() branch
# or (b) a clearly server-side / backend file.

# Implementation-time check (Phase 3): strings on built .ipa
# strings MilesPro.app/MilesPro | grep -E 'planos|checkout|R\$|Upgrade|Asaas|Stripe'
# Expect: zero matches (Phase 3 gate)
```

**Plan acceptance criterion:** TIER-* / PAY-04 plans must include a code review checklist item: "Every component rendering pricing/checkout UI is wrapped in `if (!useIsIOSCapacitor())`". A grep-based test in CI is encouraged.

### Gate G-HIGH-01 — Trial Abuse Prevention

**Check:** Same CPF cannot create two trials.

```bash
# In Asaas sandbox:
# 1. Create customer A with CPF 12345678901
# 2. Create subscription with creditCard + trial (nextDueDate +7d)
# 3. DELETE that subscription
# 4. Create another subscription for customer A — Asaas behavior?

# Expected (per HIGH-01 hypothesis): rejection OR immediate charge
# DOCUMENT actual behavior in PAY-06 plan, adjust defense-in-depth as needed
```

**Defense-in-depth check:**

```sql
-- Verify profiles.cpf has UNIQUE constraint
SELECT conname FROM pg_constraint WHERE conrelid = 'public.profiles'::regclass AND contype = 'u';
-- Expect: contains 'profiles_cpf_unique' or equivalent
-- If missing, ADD migration: ALTER TABLE profiles ADD CONSTRAINT profiles_cpf_unique UNIQUE (cpf);
```

**Plan acceptance criterion:** PAY-06 plan must include both the Asaas sandbox smoke test result AND the SQL constraint verification.

### Gate G-HIGH-02 — Asaas BR Specifics (Pix 4h, Boleto 2d)

**Check:** UI surfaces correct messaging.

```bash
# Grep for hardcoded "Pix" / "boleto" copy in pricing UI
grep -rE "Pix|boleto|Boleto" src/pages/Assinatura.tsx src/pages/Index.tsx
# Verify each occurrence has accompanying messaging:
# - "Pix: confirmação em até 4 horas"
# - "Boleto: confirmação em até 2 dias úteis"
```

**Webhook handler check:** Verify `PAYMENT_RECEIVED` is the trigger for plan flip, NOT `PAYMENT_CREATED` (PAYMENT_CREATED fires immediately even for unpaid boletos).

```sql
-- Check: how many user_subscriptions rows have status='active' WITHOUT a PAYMENT_RECEIVED row?
SELECT us.id, us.user_id, us.status, COUNT(we.id) AS payment_received_count
FROM user_subscriptions us
LEFT JOIN webhook_events we
  ON we.payload->>'subscription' = us.asaas_subscription_id
  AND we.event_type = 'PAYMENT_RECEIVED'
WHERE us.status = 'active'
GROUP BY us.id, us.user_id, us.status
HAVING COUNT(we.id) = 0;
-- Expect: 0 rows (every active sub has at least one PAYMENT_RECEIVED)
```

**Plan acceptance criterion:** PAY-03 plan must include this SQL check post-deploy + a UI screenshot of pricing page showing the Pix/Boleto delay messaging.

### Gate G-HIGH-03 — Analytics PII Leakage

**Check:** PostHog and Sentry payloads never contain CPF/email.

```bash
# 1. Network tab check: load /planos with consent given, perform actions
#    Watch Network for app.posthog.com (or eu.i.posthog.com) requests
#    Inspect request body — verify NO 'cpf', 'email', 'phone' keys in $set or properties

# 2. Code-level check
grep -rE "posthog.identify\(|Sentry\.setUser\(|Sentry\.captureException" src/ \
  | grep -v "user\.id\|userId" \
  | head
# Every match should reference user.id (UUID), never cpf/email
```

**Sentry beforeSend regex unit test:**

```ts
// src/lib/sentry.test.ts
import { describe, it, expect } from 'vitest';

describe('Sentry beforeSend PII scrubbing', () => {
  it('redacts CPF from message', () => {
    const event = { message: 'User 12345678901 had error' };
    const scrubbed = beforeSend(event);
    expect(scrubbed.message).not.toContain('12345678901');
    expect(scrubbed.message).toContain('[CPF_REDACTED]');
  });
  it('redacts email from URL', () => {
    const event = { request: { url: 'https://app.milespro.net.br?email=joao@example.com' } };
    const scrubbed = beforeSend(event);
    expect(scrubbed.request.url).not.toContain('joao@example.com');
  });
  it('strips email from user object', () => {
    const event = { user: { id: 'abc', email: 'joao@example.com' } };
    const scrubbed = beforeSend(event);
    expect(scrubbed.user.email).toBeUndefined();
    expect(scrubbed.user.id).toBe('abc');
  });
});
```

**Plan acceptance criterion:** TEL-01 and TEL-03 plans must each include their respective unit test + network tab manual verification step.

### Gate G-HIGH-06 — Pricing Page Conversion

**Check:** Pricing page has the conversion-critical elements [CITED: ROADMAP.md §Phase 2 HIGH-06].

- Monthly/annual toggle (already present in Assinatura.tsx + Index.tsx)
- Annual default-highlighted with "Economize R$ X/ano" badge
- "Mais escolhido" badge on Pro (already present per `popular: true` flag in `Assinatura.tsx:93`)
- Comparison table below cards (already present)
- BRL formatting (`R$ XX,XX/mês`) via `useLocalization().formatCurrency`
- 7-day money-back guarantee published in ToS AND reinforced on pricing page (NEW — currently only in ToS line 149)

**Code-level check:**

```bash
grep -E "7 dias|7-day|garantia" src/pages/Assinatura.tsx src/pages/Index.tsx
# Expect: at least 1 prominent occurrence in BOTH files (post-D-19 update)
```

**Plan acceptance criterion:** LAUNCH-04 / PAY-04 plans must include screenshot of pricing page + ToS link + reinforcement message.

### Gate G-MED-02 — Email Deliverability

**Check:** SPF + DKIM + DMARC verified before first user-facing send.

```bash
# Verify DNS records via dig (post-DNS-setup)
dig +short milespro.net.br TXT | grep -E 'v=spf1|v=DMARC1'
dig +short resend._domainkey.milespro.net.br TXT
dig +short send.milespro.net.br MX

# Verify with Resend dashboard: domain status = "Verified"
# Verify with mail-tester.com: score >9/10
```

**Plan acceptance criterion:** LAUNCH-05 / COMPL-06 plans include the dig output + mail-tester score as artifact.

### Gate G-AR-2 — Vite JWT Fallback Cleanup (Phase 1 carry-over)

**Check:** No hardcoded JWT in `vite.config.ts`.

```bash
grep -E "eyJ[A-Za-z0-9_-]{20,}" vite.config.ts
# Expect: zero matches
```

If Lovable Cloud STILL doesn't inject `VITE_*` vars reliably, replace the dead JWT with `''` (empty string) so `failOnSecretLeak()` REQUIRED_VITE_VARS guard fails fast.

**Plan acceptance criterion:** W0 plan includes this grep check.

### Gate G-AR-3 — Deno Test CI Wiring (Phase 1 carry-over)

**Check:** `deno test` runs in CI.

```yaml
# Verify .github/workflows/ci.yml has a job step like:
# - uses: denoland/setup-deno@v1
#   with: { deno-version: v1.x }
# - run: deno test --allow-env --allow-net supabase/functions/google-calendar-auth/index.test.ts
```

**Plan acceptance criterion:** W0 plan includes the test job step + a green CI run.

### Gate G-AR-4 — vip_* Adversarial Coverage (Phase 1 carry-over)

**Check:** Any new `vip_*` table OR `managed_accounts`-aware RLS has adversarial Vitest coverage.

```bash
ls src/hooks/travel/travel.adversarial.test.ts  # exists from Phase 1
# Phase 2 must add: src/hooks/vip/vip.adversarial.test.ts (or equivalent)
# covering: managed_accounts policies + any new vip_* table
```

**Plan acceptance criterion:** TIER-04/05/06 plan includes adversarial test file path + 4-scenario coverage (Free SELECT empty, Free INSERT 403, Pro INSERT 403, VIP INSERT success).

---

## §9 Wave Decomposition Recommendation

Aligned with 02-ASSUMPTIONS.md SEQ-01 and the wave decoupling for the CNPJ blocker (D-21).

### Wave 0 (NO CNPJ DEPENDENCY) — Foundation & Phase 1 Carry-Over

**Goal:** Close Phase 1 follow-ups + add preventive guards before any Asaas code lands.

| Plan slot | Scope | Requirements | Gates |
|-----------|-------|--------------|-------|
| **02-01-PLAN** W0 | (a) Delete dead JWT fallback in `vite.config.ts:71-74` (D-25); (b) extend `FORBIDDEN_VITE_PATTERNS` with `VITE_ASAAS_*` (D-27); (c) wire Deno test CI step (D-26); (d) rename "Plus" → "Pro" in `Index.tsx:181-232` + comparisonFeatures (D-11 sub); (e) fix Termos.tsx trial copy + Plus→Pro (D-11 sub + D-03 + D-19); (f) DPO email replace (D-20 + D-25); (g) drop `can_access_feature()` (D-28) | (foundation) | G-AR-2, G-AR-3, G-HIGH-06 (partial — trial copy fix), G-CRIT-05 (Termos fix is part of consent compliance) |

### Wave 1 (NO CNPJ DEPENDENCY) — Compliance + Telemetry + Infra (PARALLEL)

**Goal:** Ship everything that must exist BEFORE first paid signup. All 3 plans run in parallel.

| Plan slot | Scope | Requirements | Gates |
|-----------|-------|--------------|-------|
| **02-02-PLAN** W1a (Compliance) | (a) user_consents migration + ConsentBanner + useConsent hook (COMPL-03 + D-16); (b) lgpd-export edge fn + log table (COMPL-01); (c) lgpd-delete edge fn + soft-delete columns + deletion_audit + cron cleanup (COMPL-02 + D-18); (d) Privacidade.tsx rewrite (sub-processors + SCC + DPO) (COMPL-04 + D-17 + D-20); (e) Termos.tsx 7d refund + Pro/VIP fix (COMPL-05 + D-19) | COMPL-01..06 | G-CRIT-05 |
| **02-03-PLAN** W1b (Telemetry) | (a) PostHog real install + consent-gated init (TEL-01 + D-16); (b) Sentry React install + beforeSend PII scrubbing + unit test (TEL-03 + HIGH-03); (c) event taxonomy wiring in critical paths (signup, first_balance_added, viewed_pricing); (d) MRR dashboard rewrite (TEL-02 + D-14) — admin gate, Asaas-API-based | TEL-01..03 | G-HIGH-03 |
| **02-04-PLAN** W1c (Infra) | (a) Vercel project setup + GitHub integration + env vars + vercel.json rewrites (LAUNCH-01 + D-05); (b) DNS Cloudflare for app.milespro.net.br + apex redirect (D-06); (c) Resend custom domain + SPF/DKIM/DMARC + warmup runbook (LAUNCH-05 + D-24); (d) Crisp embed in landing + dashboard (LAUNCH-05 + D-23); (e) helpdesk SLA runbook + WhatsApp Business setup | LAUNCH-01, LAUNCH-05 | G-MED-02 |

### Wave 2 (NO CNPJ DEPENDENCY) — Asaas Scaffold + TIER Gating (PARALLEL with W1)

**Goal:** Build everything Asaas-related against sandbox API. CNPJ unblocks the flip to production keys.

| Plan slot | Scope | Requirements | Gates |
|-----------|-------|--------------|-------|
| **02-05-PLAN** W2a (Asaas scaffold) | (a) webhook_events table migration (CRIT-04 idempotency); (b) user_subscriptions extensions (asaas_*, status enum, last_paid_at, grace_period_ends_at); (c) profiles.asaas_customer_id + cpf UNIQUE (HIGH-01); (d) create-checkout-session edge fn (PAY-02); (e) asaas-webhook edge fn (PAY-03 + CRIT-04); (f) reconcile-asaas-subscriptions edge fn + pg_cron migration (D-09); (g) sandbox smoke tests: create sub, replay webhook, trial expiry | PAY-01 (design), PAY-02, PAY-03, PAY-06 (design), PAY-07 | G-CRIT-04, G-HIGH-01, G-HIGH-02 |
| **02-06-PLAN** W2b (TIER UI + RLS) | (a) Free limits RLS on user_programs (TIER-01 + D-12); (b) useSubscription maxPrograms 1→3 + maxAccounts 5; (c) Pro alert antecipação migration + RLS + UI (TIER-02); (d) personalized promotion alerts — extend fetch-promotions + user_promo_alerts table + UI + PostHog events (TIER-03 + D-13); (e) Multi-CPF VIP UI: create-managed-account edge fn (TIER-05); (f) ManagedAccountContext + switcher UI (TIER-06); (g) vip.adversarial.test.ts coverage (AR-4); (h) handlePlanCta replacement in Assinatura.tsx (D-11 + PAY-04 web); (i) useIsIOSCapacitor hook + iOS Path C hiding everywhere (D-10 + CRIT-03 design); (j) LAUNCH-04 landing CTA replacement | TIER-01..06, PAY-04, LAUNCH-04 | G-AR-4, G-CRIT-03 (design), G-HIGH-06 |

### Wave 3 (CNPJ-BLOCKED) — Production Cutover

**Goal:** Flip from sandbox to production. Founder workstream gates this entire wave.

| Plan slot | Scope | Requirements | Gates |
|-----------|-------|--------------|-------|
| **02-07-PLAN** W3 (PAY cutover) | (a) Asaas account setup with CNPJ; (b) create 6 product IDs (Pro × 3 cycles + VIP × 3 cycles, D-02); (c) configure municipal settings for NFS-e per contador (D-22); (d) flip `ASAAS_ENV` → 'production'; (e) enable `invoice: { enabled: true }` in create-checkout-session (PAY-08); (f) PAY-05 portal link UI; (g) end-to-end smoke test in production with founder's own CPF and a refund test; (h) LAUNCH-04 final pricing copy review | PAY-01 (cutover), PAY-05, PAY-08 | G-CRIT-04 (re-run in prod), G-HIGH-02 |

**Total estimated plans: 7** (W0 = 1, W1 = 3, W2 = 2, W3 = 1). 02-ASSUMPTIONS.md mentioned an 8th plan for LAUNCH-05 standalone — that's folded into W1c here for sequence efficiency.

**Critical-path dependency graph:**

```
                    ┌─────────────┐
                    │  W0 (02-01) │
                    └──────┬──────┘
                           │
                ┌──────────┼──────────┐
                ▼          ▼          ▼
            ┌─────────┐ ┌─────────┐ ┌─────────┐
            │W1a 02-02│ │W1b 02-03│ │W1c 02-04│
            │compl    │ │telemetry│ │infra    │
            └────┬────┘ └────┬────┘ └────┬────┘
                 │           │           │
                 │   ┌───────┘           │
                 │   │                   │
                 ▼   ▼                   │
          ┌───────────────┐              │
          │  W2a 02-05    │              │
          │  asaas scaffold│              │
          └───────┬───────┘              │
                  │                       │
                  └──────────┬────────────┘
                             ▼
                     ┌──────────────┐
                     │  W2b 02-06   │
                     │  TIER + UI   │
                     └──────┬───────┘
                            │
                            ▼ (after CNPJ + Asaas approval)
                     ┌──────────────┐
                     │  W3 02-07    │
                     │  cutover     │
                     └──────────────┘
```

W1a/W1b/W1c are mutually independent (different files/tables/services) → 3-way parallel.
W2a depends on W1c (Vercel/DNS up so webhook URL stable) and partially on W1b (Sentry init for webhook error reporting).
W2b depends on W1a (consent banner) for PostHog event firing AND on W2a (subscription state) for paywall logic.
W3 depends on W2a + W2b + external CNPJ readiness.

---

## §10 Known Gaps / Unresolved Questions

These items need user/operator input or sandbox validation before plans can hard-commit. Document as planner risks.

| # | Gap | Why it matters | Resolution path |
|---|-----|----------------|-----------------|
| 1 | Asaas response body schema for `POST /v3/subscriptions` not fully visible in docs | PAY-02 edge function expects specific field names (`id`, `status`, `dateCreated`) | **Action:** sandbox smoke test in W2a — log response verbatim, document fields, adjust edge function |
| 2 | Asaas pagination semantics for `GET /v3/subscriptions` (`hasMore` vs `totalCount` vs cursor) | Reconcile cron depends on correct pagination | **Action:** sandbox test in W2a |
| 3 | Asaas trialDays parameter — does it exist as a first-class field, or is it always implicit via `nextDueDate`? | PAY-06 mechanism | **Action:** sandbox smoke test; current research strongly suggests `nextDueDate` is the mechanism |
| 4 | Asaas refusal of second trial on same customer (HIGH-01) | Trial abuse defense | **Action:** sandbox test — create trial sub, cancel, retry; document Asaas behavior |
| 5 | Asaas invoice (NFS-e) webhook event names | PAY-08 ops monitoring | **Action:** sandbox test once municipal setup is done (W3 prerequisite) |
| 6 | Lovable Cloud `VITE_*` env var injection mystery (AR-2 root cause) | If Lovable still doesn't inject vars, fallback cleanup is moot | **Action:** Phase 2 W0 — contact Lovable support to ensure dashboard env vars propagate to SPA build; if not, document workaround |
| 7 | Asaas dispute defense endpoint (refund initiation API) | COMPL-D D-19 + LAUNCH-05 helpdesk runbook | **Action:** read docs.asaas.com/reference/refund-payment in W3 plan; for v1, manual via Asaas dashboard is acceptable (D-19) |
| 8 | PostHog Cloud EU DPA — is signed contract required, or is automatic acceptance via Privacy Policy listing sufficient? | LGPD sub-processor compliance | **Action:** verify with PostHog account setup — may need to accept DPA in admin console |
| 9 | Apple 3.1.3(b) "Multiplatform Services" durability through Phase 3 review | CRIT-03 implementation gate | **Action:** Phase 2 design is verified by absence of pricing strings; Phase 3 owns App Review submission |
| 10 | Whether `subscription_leads` shadow log is RLS-readable by admin (founder) | Operational: need to inspect failed checkouts | **Action:** verify existing RLS in W1c; add admin-only policy if needed |
| 11 | Phase 1 D-28 `can_access_feature()` removal — does anything still call it? | Cleanup safety | **Action:** grep `can_access_feature` in `supabase/` before dropping; if zero callers, drop in W0 |
| 12 | `profiles.cpf` UNIQUE constraint existence | HIGH-01 trial abuse defense | **Action:** SQL check `SELECT conname FROM pg_constraint WHERE conrelid='profiles'::regclass AND contype='u'` in W0; add migration if missing |
| 13 | `program_accounts` table name verification | D-12 "5 contas" limit RLS | **Action:** confirm table name in W1 / W2b by checking migrations |

---

## §11 Assumptions Log

Claims tagged `[ASSUMED]` that need user confirmation or sandbox verification:

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Asaas response body for `POST /v3/subscriptions` returns `id`, `status: 'ACTIVE'`, `customer`, `value`, `nextDueDate`, `cycle`, `externalReference` | §2.2 | LOW — edge function code adapts to actual fields; smoke test catches |
| A2 | Asaas refuses second trial on same `customer.id` (HIGH-01 mitigation) | §2.6 | MEDIUM — if Asaas allows reuse, defense becomes purely DB-side via `profiles.cpf` UNIQUE; doesn't break design |
| A3 | Asaas pagination uses `limit`/`offset` with `hasMore` boolean | §2.8 + §6.5 | LOW — adapt code post smoke test |
| A4 | Asaas fires `INVOICE_AUTHORIZED` / `INVOICE_ERROR` webhook events for NFS-e | §2.7 | LOW — event names verifiable in W3 once municipal setup done; ops impact only |
| A5 | `program_accounts` is the table name for accounts within a program (D-12 "5 contas") | §6.1 | LOW — table name verifiable via migration listing in W1 |
| A6 | Phase 1 `can_access_feature()` is unused — can be dropped safely | §1 / §9 W0 | LOW — grep verifiable |
| A7 | Lovable Cloud secrets pane propagates to edge function `Deno.env.get()` for Asaas keys | §2.1 | MEDIUM — if Lovable doesn't propagate, we need a different secret injection path (likely manual `supabase secrets set` if we have CLI access via Lovable chat) |
| A8 | Vercel apex IP `76.76.21.21` and CNAME `cname.vercel-dns.com` are stable | §7.1 | LOW — Vercel docs current; verify at deploy time |
| A9 | Resend SES MX `feedback-smtp.us-east-1.amazonses.com` is correct for current Resend region | §7.5 | LOW — Resend dashboard provides exact records at domain add time |
| A10 | Crisp free tier supports the React SDK + 2 agents indefinitely | §7.4 | LOW — confirm with Crisp pricing page during W1c setup |
| A11 | PostHog property name change `property_blacklist` → `property_denylist` happened in posthog-js >=v1.220.0 | §5.3 | LOW — current docs use `property_denylist`; install latest |
| A12 | Apple 3.1.3(b) exemption text unchanged in 2026 from May 2025 Epic anti-steering update | §1 + §8 G-CRIT-03 | MEDIUM — verify within 30d of Phase 3 submission |

**If any A2/A7/A12 turns out wrong, planner must replan affected wave.** For A1/A3/A4/A5/A6/A8/A9/A10/A11 — sandbox/dashboard verification during plan execution suffices.

---

## §12 Project Constraints (from CLAUDE.md)

From `./CLAUDE.md` — directives the planner MUST honor:

- **TypeScript estrito; sem `any` exceto em boundaries documentados** — all new edge functions + components follow
- **Components em PascalCase, hooks em camelCase com prefixo `use`** — `ConsentBanner`, `useConsent`, `useIsIOSCapacitor`
- **Path alias `@/` aponta pra `src/`** — keep
- **shadcn/ui pra componentes base; Tailwind pra estilo** — ConsentBanner uses shadcn Button/Checkbox
- **react-query pra server state** — all data hooks via `useQuery` / `useMutation`
- **`logger.*` (não `console.*`)** — all new edge-function-side and client-side logs
- **Sonner para toasts** — checkout flow uses `toast.success/error`
- **Idioma de respostas usuário = pt-BR; código em inglês** — emails Resend em pt-BR; nomes de funções/variáveis em inglês
- **Stack travada (não trocar Supabase/React/shadcn/Capacitor)** — research stays inside this stack
- **Gateway = Asaas (NÃO Stripe BR / MercadoPago)** — all PAY-* via Asaas
- **iOS = Path C (sem IAP, sem UI de pricing no app)** — D-10 enforces
- **Modelo = Free + Pro + VIP (3 tiers)** — enum frozen at Phase 1
- **Multi-CPF é exclusivo VIP no v1** — TIER-04..06 RLS enforces

---

## §13 Sources

### Primary (HIGH confidence)
- [docs.asaas.com/reference/criar-nova-assinatura](https://docs.asaas.com/reference/criar-nova-assinatura) — Subscription create schema (§2.2)
- [docs.asaas.com/docs/webhooks-3](https://docs.asaas.com/docs/webhooks-3) — Webhook authentication via asaas-access-token header (§2.4)
- [docs.asaas.com/docs/how-to-implement-idempotence-in-webhooks](https://docs.asaas.com/docs/how-to-implement-idempotence-in-webhooks) — Idempotency via event `id` UNIQUE (§2.4)
- [docs.asaas.com/docs/payment-events](https://docs.asaas.com/docs/payment-events) — Full payment event taxonomy (§2.5)
- [docs.asaas.com/docs/subscription-events](https://docs.asaas.com/docs/subscription-events) — Subscription event taxonomy (§2.5)
- [docs.asaas.com/docs/subscriptions-via-credit-card](https://docs.asaas.com/docs/subscriptions-via-credit-card) — Card validation at create, charge at nextDueDate (§2.6)
- [docs.asaas.com/docs/issuing-service-invoices](https://docs.asaas.com/docs/issuing-service-invoices) — NFS-e municipal setup sequence (§2.7)
- [posthog.com/docs/libraries/js/config](https://posthog.com/docs/libraries/js/config) — Init options for PostHog JS (§5.3)
- [supabase.com/docs/guides/functions/schedule-functions](https://supabase.com/docs/guides/functions/schedule-functions) — pg_cron + net.http_post (§2.8)
- [supabase.com/docs/guides/database/extensions/pg_net](https://supabase.com/docs/guides/database/extensions/pg_net) — pg_net async HTTP (§2.8)
- [docs.sentry.io/platforms/javascript/guides/react/configuration/options/](https://docs.sentry.io/platforms/javascript/guides/react/configuration/options/) — Sentry React init + beforeSend (§5.4)
- [vercel.com/docs/frameworks/frontend/vite](https://vercel.com/docs/frameworks/frontend/vite) — Vite-on-Vercel SPA config (§7.1)
- [resend.com/docs/dashboard/domains/dmarc](https://resend.com/docs/dashboard/domains/dmarc) — DMARC setup (§7.5)
- [developer.apple.com/app-store/review/guidelines/](https://developer.apple.com/app-store/review/guidelines/) — Guideline 3.1.3(b) Multiplatform Services exemption (§1)

### Secondary (MEDIUM confidence)
- [iclg.com/practice-areas/data-protection-laws-and-regulations/brazil](https://iclg.com/practice-areas/data-protection-laws-and-regulations/brazil) — LGPD Art. 18 15-day deadline (§5.1, §8)
- [pge.es.gov.br/dos-direitos-dos-titulares-de-dados-conferidos-pela-lgpd](https://pge.es.gov.br/dos-direitos-dos-titulares-de-dados-conferidos-pela-lgpd) — LGPD Art. 18 9 rights overview
- [github.com/crisp-im/crisp-sdk-web](https://github.com/crisp-im/crisp-sdk-web) — Crisp React SDK (§7.4)
- [dmarcdkim.com/setup/how-to-setup-resend-spf-dkim-and-dmarc-records](https://dmarcdkim.com/setup/how-to-setup-resend-spf-dkim-and-dmarc-records) — Resend SPF/DKIM/DMARC step-by-step (§7.5)

### Tertiary (verified during plan execution required)
- Asaas response body shapes (A1, A3, A4) — verify via sandbox smoke test in W2a
- Trial reuse refusal (A2) — verify via sandbox test in W2a
- `program_accounts` table name (A5) — verify via migration listing
- Lovable Cloud env var propagation (A7) — verify by deploying a test edge function and checking `Deno.env.get('ASAAS_API_KEY')` reads correctly

### Phase 1 prior art (cited verbatim)
- `.planning/phases/01-security-foundation-hardening/SECURITY.md` — AR-2/AR-3/AR-4 carry-over (§1 + §8)
- `supabase/migrations/20260512120003_create_has_plan_function.sql` — trust kernel signature (§4)
- `supabase/migrations/20260512120004_create_managed_accounts_and_can_access_account.sql` — managed_accounts + can_access_account (§4)
- `vite.config.ts:16-29` — FORBIDDEN_VITE_PATTERNS / REQUIRED_VITE_VARS pattern extended in §2.1
- `supabase/functions/google-calendar-auth/index.ts:50-86` — HMAC + edge function pattern reused for asaas-webhook + reconcile-asaas-subscriptions

---

## §14 Metadata

**Confidence breakdown:**
- Asaas integration patterns (Subscriptions, webhooks, idempotency): HIGH — multiple official sources confirm field names, event taxonomy, idempotency mechanism. Response body shapes need sandbox confirmation.
- LGPD compliance (consent + DSR + sub-processors): HIGH on legal requirements + structural patterns; MEDIUM on PostHog DPA specifics.
- PostHog init + Sentry beforeSend: HIGH — current docs verified.
- pg_cron + net.http_post: HIGH — pattern is Supabase-canonical.
- Apple 3.1.3(b) Multiplatform Services exemption: MEDIUM — text unchanged since May 2025 but Apple guidelines move quarterly; verify within 30d of Phase 3 submission.
- Trial abuse refusal (A2): MEDIUM — strongly hinted in HIGH-01 prior research but not confirmed via Asaas docs.
- NFS-e municipal nuances: MEDIUM — high-level flow clear, per-city specifics require contador.
- Subscription state machine: HIGH on transition logic; MEDIUM on grace period exact duration (Asaas docs don't specify — 7d is our choice).

**Research date:** 2026-05-12
**Valid until:** 2026-06-12 (30 days for stable items: Asaas API, PostHog config, pg_cron pattern). Asaas pricing decisions (D-01) reviewed continuously. Apple 3.1.3(b) re-verify within 30d of Phase 3 submission.

---

*Phase: 02-monetiza-o-compliance-telemetria*
*Researched by: gsd-phase-researcher (Claude Opus 4.7, 1M context)*
*Trust kernel: validated against `supabase/migrations/20260512120003` + `20260512120004`*
*Consumed by: gsd-planner — `/gsd-plan-phase 2`*
