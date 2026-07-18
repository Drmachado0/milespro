# Technology Stack — Additions for the "Ready-to-Scale" Cycle

**Project:** MilesPro
**Researched:** 2026-05-11
**Scope:** Stack ADDITIONS for the cycle "first 10 paying users" (brownfield; existing stack is locked).
**Overall confidence:** HIGH on billing + errors + email; MEDIUM on analytics LGPD nuances; MEDIUM on App Store/IAP strategy (regulatory landscape moving fast).

---

## Overview

The locked stack (React 18 + TS + Vite + Supabase + shadcn + react-query + Capacitor + Vitest) is appropriate for the cycle and **must not change**. This document only addresses the SaaS-grade additions needed to turn the codebase from "feature-complete demo" into "billable product with 10 paying users."

The core tension in this cycle is **Brazilian payment realities × Apple App Store policies × LGPD compliance × pre-revenue budget**. The recommendations below resolve that tension by:

1. Choosing **one billing provider** (Asaas) instead of stacking two — Stripe BR is technically excellent but its 3.99% + R$0.50 fee on a R$19.90/mo Pro tier is brutal pre-scale, and Pix Automático on Stripe is brand-new (April 2026) with thin production track record.
2. Doing **server-side billing only on web** in v1, **disabling subscription purchases inside the iOS app** (allowed by Apple Guideline 3.1.3(b) "Multiplatform Services"), and treating mobile as a sign-in client. This sidesteps the IAP minefield entirely for v1.
3. Using **PostHog Cloud (EU instance)** for the analytics swap-in — it's the path of least resistance from the existing mock and the EU instance is the safest LGPD posture available without self-hosting.
4. Using **Sentry** (paid Team if budget allows, free if not) for errors — Bugsnag has a slightly better free tier but Sentry's Capacitor SDK and React integration are more mature; the v4.0.0 SDK released May 2026 is current.
5. Using **Resend** with a verified custom domain (already a dependency in edge functions) for transactional email, plus **eNotas** or **Focus NFe** for NFS-e generation when revenue starts.
6. Treating LGPD compliance as a **product feature** (consent banner + DSR endpoint + DPO email + privacy policy), not a tool — there's no "magic LGPD library" that solves it.

**What NOT to add (be opinionated):** No CDP (Segment/RudderStack — premature), no separate feature-flag service (PostHog covers it), no APM beyond Sentry (premature), no customer-support tool (use email + WhatsApp link that already exists), no help-center SaaS (write Markdown pages in-repo).

---

## Recommendations by Category

### 1. Billing & Subscription Management — **Asaas**

**Recommendation:** Asaas as the sole billing provider for v1. **HIGH** confidence.

| Criterion | Asaas (recommendation) | Stripe Brazil (rejected) | Pagar.me (rejected) | Stark Bank (rejected) |
|---|---|---|---|---|
| Pix one-time | ✓ Native | ✓ Native | ✓ Native | ✓ Native |
| **Pix Automático recurring** | ✓ Available, BR-native PSP | ✓ Available since Apr 2026 — new | ✓ Available | Limited |
| Credit-card recurring | ✓ Tokenized, multi-installments | ✓ Excellent | ✓ Excellent | Limited |
| Boleto recurring | ✓ Yes | Limited | ✓ Yes | ✗ |
| Per-transaction fee (Pix) | **R$ 0.99 flat** (low-volume tier) | 3.99% (no Pix-specific lower rate published) | ~R$ 0.99 + 0.99% | Variable |
| Per-transaction fee (card) | **2.99% + R$ 0.49** baseline | **3.99% + R$ 0.50** | 3.99% baseline | N/A consumer cards |
| Monthly fee | **R$ 0** (no setup, no monthly) | R$ 0 base | R$ 0 base | R$ 0 base |
| NFS-e issuance built in | ✓ Native (additional cost per NFS-e) | ✗ Must integrate separately | ✗ Must integrate separately | ✗ |
| Brazilian PJ required | ✓ Works for PF (MEI/CPF) and PJ | Recommended PJ; PF possible | PJ required | PJ required |
| Hosted checkout page | ✓ Yes (white-label-able) | ✓ Yes (Stripe Checkout — best-in-class DX) | ✓ Yes | Limited |
| Customer portal | ✓ Yes (basic) | ✓ Yes (excellent) | ✓ Yes | Limited |
| Webhook signature verify | ✓ HMAC | ✓ HMAC | ✓ HMAC | ✓ |
| Sandbox quality | OK | Excellent | Good | Good |
| Documentation quality | Good (PT-BR primary) | Excellent (EN primary) | Good (PT-BR + EN) | Decent |

**Why Asaas wins for MilesPro specifically:**

1. **Fee math at the cycle's scale.** At R$19.90/mo Pro tier × 10 paying users:
   - Asaas (Pix): 10 × R$0.99 = **R$9.90/mo total fees** (~5% effective)
   - Stripe (Pix): unclear flat fee, but card path = 10 × (R$19.90 × 3.99% + R$0.50) = **R$12.94/mo** (~6.5%)
   - Asaas (card): 10 × (R$19.90 × 2.99% + R$0.49) = **R$10.85/mo** (~5.5%)

   At the cycle's marker (10 users) the difference is small in absolute terms (~R$3-5/mo), but the **percentage impact compounds at scale** and Asaas's NFS-e integration removes a separate vendor.

2. **NFS-e is bundled.** Brazilian SaaS legally must issue NFS-e for every paying customer (it's a service, ISS-taxed at the municipality of the provider). Asaas can issue NFS-e automatically when a payment confirms. Stripe Brazil **does not issue NFS-e** — you'd need eNotas/Focus NFe as a second integration. Asaas alone replaces two vendors.

3. **PF-friendly.** Asaas works with CPF (MEI is fine). If MilesPro is currently a solo dev without a PJ, Asaas is the smoothest path. Stripe Brazil onboarding for PF is harder.

4. **Pix Automático maturity.** Asaas has been live with Pix recurring since the Banco Central rollout in 2025. Stripe shipped Pix recurring on **2026-04-22** (one month ago as of this research) — production track record is thin, edge cases unknown.

5. **PT-BR support and PT-BR-first docs.** Stripe support is excellent globally but their Brazil-specific docs are translated, not native. Asaas team operates in BR-time, in Portuguese.

**Why we are NOT picking Stripe (which would be the "obvious choice" elsewhere):**

- Stripe Billing's developer experience is genuinely the best in the world. **If** MilesPro had a PJ + serious budget + international ambition + needed Stripe Tax + Stripe Checkout's polished UX, this would flip. None of those apply at the "first 10 paying users" cycle.
- Pix Automático on Stripe being only one month old (released 2026-04-22) is a real risk for a payments-critical first launch.
- Stripe doesn't issue NFS-e, which means another vendor (eNotas, Focus NFe, PlugNotas) and another integration.
- Stripe BR fees don't have a Pix-specific lower rate published — the standard 3.99% applies, which is significantly worse than Asaas R$0.99 flat for Pix.

**Why we are NOT picking Pagar.me:**

- Excellent platform but **PJ-required**, more enterprise-oriented, no NFS-e built in. Reasonable second choice if Asaas onboarding fails for some reason.

**Why we are NOT picking Mercado Pago:**

- Lower fees on some products but checkout/subscription UX is consumer-grade and the Mercado Pago brand on the checkout page can confuse users (looks like buying on Mercado Livre). Subscription API is less developer-friendly than Asaas.

**Concrete additions to the codebase:**

```bash
# No npm package — Asaas is REST-only. Use fetch from edge functions.
# Add ONE new edge function: supabase/functions/asaas-webhook/
```

- Backend pattern: **Asaas webhook → edge function → updates `user_subscriptions` table → updates `profiles.subscription_plan`**. Idempotency via Asaas event ID stored in a `payment_events` table.
- Frontend pattern: **"Assinar" button → POST to new `create-subscription` edge function → redirect to Asaas hosted checkout URL → return URL hits `/billing/success` page**.
- Source-of-truth contract: **Asaas is the source of truth for subscription state**. Local `user_subscriptions` table mirrors it; reconciliation job runs daily via a new cron edge function (`reconcile-subscriptions`).
- Plan IDs: Define in Asaas dashboard with stable external_reference codes (`milespro_pro_monthly`, `milespro_vip_monthly`, `milespro_pro_annual`, `milespro_vip_annual`) and store the same codes in `subscription_plans` table.

**API key handling:** `ASAAS_API_KEY` and `ASAAS_WEBHOOK_TOKEN` go in Supabase Edge Function secrets. Sandbox key for dev (`ASAAS_API_BASE=https://sandbox.asaas.com/api/v3`), prod key for prod (`ASAAS_API_BASE=https://api.asaas.com/v3`). Never client-side.

**Trial / grace period (PAY-06):** Asaas supports `dueDate` on the first invoice — set it 7 days out for trial, with `chargeType: SUBSCRIPTION` starting after first payment confirms. Failed payments retry automatically per Asaas dunning rules; configurable.

---

### 2. Production Analytics — **PostHog Cloud (EU instance)** + **keep GA4**

**Recommendation:** Replace the `posthog-js` mock with the real SDK pointed at **PostHog Cloud EU** (`https://eu.i.posthog.com`). Keep GA4 as-is for marketing site / SEO funnel. **MEDIUM-HIGH** confidence.

**Why PostHog over Mixpanel/Amplitude:**

| Criterion | PostHog (recommendation) | Mixpanel | Amplitude |
|---|---|---|---|
| Free tier | **1M events/mo + 5K replays + 1M flag requests + 1.5K surveys** | 100K MTUs (basic) | 10K MTUs + 1K replays |
| Self-host option | ✓ (open-source, but requires effort) | ✗ | ✗ |
| Feature flags included | ✓ | ✗ (separate product) | ✓ Limited |
| Session replay included | ✓ | ✗ (separate product) | ✓ Limited |
| Surveys included | ✓ | ✗ | ✗ |
| Cost at 10 paying users | **$0/mo** (well under free tier) | $0 (under MTU) | $0 (under MTU) |
| Cost at 1,000 users / ~50K events/mo | **$0/mo** (still free tier) | Likely $0 | $0 |
| Cost at 10K users / ~1M events/mo | ~**$0–50/mo** event-based | $24+/mo | $0 (if events fit) |
| EU instance for LGPD-friendly residency | ✓ `eu.i.posthog.com` | US-only standard | US-only standard |
| Existing code wired for it | ✓ (`src/lib/posthog.ts` is a stub waiting) | ✗ | ✗ |

**The decisive factor:** the codebase already has `src/lib/posthog.ts`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`, and a documented migration path. The existing code structure assumes PostHog. Switching to Mixpanel would mean throwing away that scaffolding and re-doing it. Pragmatism wins.

**Why EU instance, not US:** LGPD doesn't *require* EU residency for Brazilian data, but it does require **demonstrable safeguards on international transfer** (LGPD Art. 33). The EU instance's GDPR-grade controls (DPA available, SCC-equivalent terms) are easier to defend than the US instance if a Brazilian user files a DSR or the ANPD asks. PostHog's docs specifically recommend EU Cloud for compliance-sensitive deployments. This is a one-line change (`VITE_POSTHOG_HOST=https://eu.i.posthog.com`) — do it from day one; migrating later is painful.

**LGPD-specific PostHog config (must apply):**

1. **Disable autocapture** at init — too aggressive, captures form fields by default. Use explicit `posthog.capture()` calls only.
2. **Set `mask_all_text: true` and `mask_all_element_attributes: true`** for session replay if you enable it (probably defer replay until post-cycle).
3. **Set `respect_dnt: true`** to honor browser Do Not Track signal.
4. **Wire `posthog.opt_out_capturing()` / `opt_in_capturing()`** to the consent banner state.
5. **Identify users by `user.id` (Supabase UUID), NEVER by email/CPF.** Use `posthog.people.set({ plan, signup_date })` for non-PII metadata.
6. **Add PostHog domain to CSP.** Current `index.html:7` CSP whitelists Supabase + GA4 + Google Tag — must add `https://eu.i.posthog.com` and `https://eu-assets.i.posthog.com` to `connect-src` and `script-src`.

**Concrete additions:**

```bash
npm install posthog-js@^1.220.0  # latest stable as of May 2026 — verify exact version at install time
```

- Replace `src/lib/posthog.ts` mock with real implementation.
- Pageview tracking is already wired (`src/App.tsx:104-106`) — should "just work" once SDK is real.
- Add explicit funnel events: `signup_started`, `signup_completed`, `onboarding_completed`, `pricing_viewed`, `checkout_started`, `subscription_activated`, `subscription_canceled`, `program_added`, `account_added`, `pdf_export_used`, `multi_cpf_added` (VIP signal).

**Why we are NOT replacing GA4:** GA4 is on the marketing site / landing pages and feeds Google Ads attribution. Removing it would break marketing telemetry. PostHog is for product analytics; GA4 is for marketing. Different jobs.

**Why we are NOT adding Segment/RudderStack (CDP):** Premature at 10 users. Re-evaluate at 1,000+ paying users.

---

### 3. Error Tracking — **Sentry** (`@sentry/capacitor` v4 + `@sentry/react`)

**Recommendation:** Sentry on the **free tier** for the cycle, with a path to **Team plan ($26/mo)** when revenue starts. **HIGH** confidence.

**Why Sentry over alternatives:**

| Criterion | Sentry (recommendation) | Bugsnag | Highlight | Self-hosted GlitchTip |
|---|---|---|---|---|
| Free tier (errors/mo) | 5,000 | 7,500 | Existed; **shut down Feb 2026** | Unlimited (self-host cost) |
| React SDK quality | Excellent | Excellent | Was good | OK |
| Capacitor SDK | ✓ Official `@sentry/capacitor` v4.0.0 (May 2026) | Via React Native SDK; worse fit for Capacitor | Was OK | None |
| Edge function support | ✓ Deno SDK | ✗ | ✗ | Limited |
| Source maps | ✓ Excellent | ✓ | ✓ | OK |
| LGPD posture | DPA available, EU region available (`de.sentry.io`) | DPA available | Acquired by LaunchDarkly | Self-host = full control |
| Cost at scale (50K errors/mo) | ~$26–80/mo | ~$59/mo | N/A | $0 + ops time |

**Decisive factors:**
1. **Highlight is dead** (LaunchDarkly acquired April 2025, shut down standalone service Feb 28, 2026). Cross it off.
2. **Bugsnag has more free events** but the React + Capacitor combo is genuinely better-supported on Sentry. The codebase has `react-error-boundary` already (`src/components/ErrorBoundary.tsx`) — Sentry's `Sentry.ErrorBoundary` wraps it cleanly, or `react-error-boundary` can call `Sentry.captureException` from its `onError`.
3. **Edge functions need error tracking too.** Sentry has a Deno SDK that drops into `supabase/functions/_shared/sentry.ts` and wraps the handler. Bugsnag doesn't have first-class Deno support. This alone would force the choice.
4. The 5K free error/mo limit at 10 paying users is enormous headroom (probably <100 real errors/mo). Plenty of cycle runway.

**Important constraints (from research):**
- **`@sentry/capacitor` v4 dropped Session Replay and Profiling.** This is fine — neither is needed for the cycle. Just don't expect the same feature parity as the React-web SDK.
- **Source maps are required** for usable stack traces — wire `sentry-cli` into the build to upload source maps on each release. Sentry's React build plugin handles this for Vite (`@sentry/vite-plugin`).

**Concrete additions:**

```bash
npm install --save-exact @sentry/react@^9.x @sentry/capacitor@^4.0.0
npm install --save-dev @sentry/vite-plugin@^3.x
# Edge functions: import via https://esm.sh/@sentry/deno
```

- Web init in `src/main.tsx` before `createRoot`.
- Capacitor wraps web init: see Sentry's Capacitor + React doc — `Sentry.init({}, SentryReact.init)`.
- Wire `tunnel: '/sentry-tunnel'` if ad-blockers become a problem (defer).
- **DSN is public** (safe in client). **Auth token for source-map upload is build-time only** (GH Actions secret, never committed).
- Set `environment: import.meta.env.MODE` and `release: __APP_VERSION__` (inject from `package.json` version via `vite.config.ts`).
- Sample rates: `tracesSampleRate: 0.1` in prod (10% perf transactions), `replaysSessionSampleRate: 0` (replay not supported on Capacitor), `replaysOnErrorSampleRate: 0`.
- LGPD: set `sendDefaultPii: false`. Strip emails/CPF in `beforeSend` hook. Configure scrubbing patterns for CPF (XXX.XXX.XXX-XX) and CNPJ (XX.XXX.XXX/XXXX-XX).
- **CSP update needed:** add `https://*.ingest.sentry.io` to `connect-src`.

---

### 4. Transactional Email — **Resend** (already in stack), upgrade to verified custom domain

**Recommendation:** **Keep Resend**, but move from `onboarding@resend.dev` sandbox to a **verified custom domain** (e.g., `noreply@milespro.net.br`). **HIGH** confidence — this is mostly a configuration fix, not a stack change.

**Why Resend stays:**

| Criterion | Resend (recommendation) | SendGrid | Postmark | AWS SES |
|---|---|---|---|---|
| Already integrated | ✓ Used in `send-client-email` | ✗ | ✗ | ✗ |
| Free tier | **3,000 emails/mo, 100/day, 1 domain** | 100/day forever | 100/mo trial | 62K/mo from EC2 |
| DX (developer-first) | Excellent | Bloated, enterprise | Excellent | AWS clunky |
| React Email templates | ✓ First-class `@react-email/components` | ✗ | Via separate template UI | ✗ |
| LGPD / DPA | ✓ Available on Pro+ | ✓ | ✓ | ✓ |
| Brazil deliverability | Good (US infra, no Brazil-specific issues) | Good | Good | Good |
| Custom domain on free tier | ✓ 1 domain | ✓ | Limited | Manual setup |

**Decisive factors:**
1. **It's already there.** `RESEND_API_KEY` is set in edge function secrets, the SDK is imported in `send-client-email/index.ts`. Switching providers means refactoring an edge function for zero benefit.
2. **3,000 emails/mo free** covers cycle + early growth. At 10 paying users sending receipts + onboarding + alerts, expect ~200–500 emails/mo. Enormous headroom.
3. **React Email templates** (`@react-email/components`) let you write email HTML in JSX/Tailwind — same patterns as the rest of the codebase.

**Critical action items:**
1. **Buy/configure DNS records for the production sending domain.** Likely `milespro.net.br` (canonical) or a subdomain like `mail.milespro.net.br`. Resend dashboard generates SPF + DKIM TXT records. Add them at the registrar (Registro.br or wherever the domain is hosted).
2. **Replace the hardcoded `onboarding@resend.dev`** in `supabase/functions/send-client-email/index.ts:214` with the verified domain. Use a `RESEND_FROM_EMAIL` env var so it's configurable.
3. **Add reply-to address** (`suporte@milespro.net.br`) routed to the founder's inbox during the cycle.
4. **Set up bounce + complaint webhook** on a new edge function (`resend-webhook`) — log to a `email_events` table for debugging deliverability. Resend signs webhooks with `RESEND_WEBHOOK_SECRET`.
5. **Brazilian deliverability sanity:** Send to `mail-tester.com` and check score before launch. Major BR ISPs (UOL, BOL, Terra, Outlook.com.br) sometimes spam-flag US-IP-origin transactional. If issues arise, consider a Brazilian provider (Mailgun has BR IPs, but DX is worse).

**New transactional emails to add for the cycle (TIER + PAY work):**
- Welcome email (after signup) — already partially supported
- Trial ending in N days
- Subscription activated / first invoice paid
- Payment failed (with grace period CTA)
- Subscription canceled (confirmation + how to reactivate)
- Receipt / invoice (every paid period — link to NFS-e PDF)
- Alert digest (Pro+ feature — vencimentos próximos)

**Why we are NOT picking AWS SES:** Cheap, but DX is painful, requires sandbox-to-production approval, requires manual DKIM/SPF setup, no React Email integration, no built-in templates UI.

---

### 5. NFS-e (Tax Invoice) Generation — **Asaas-bundled** OR **eNotas** (decide based on volume)

**Recommendation:** Use **Asaas's native NFS-e issuance** during the cycle (small volume). Re-evaluate **eNotas** if NFS-e cost per issuance becomes material at scale. **MEDIUM** confidence — final answer depends on the founding entity (PJ or MEI) and the municipality of registration.

**Context (this caught me by surprise during research, worth flagging):**
SaaS in Brazil is legally a "service" (ISS-taxed at the municipality of the provider, not the consumer). Every paid recurring charge requires an **NFS-e** issued through the municipal e-invoicing system. As of January 2026, the **National NFS-e System (NFS-e Nacional)** is mandatory and covers ~70% of municipalities — so most edge cases are now standardized.

**Two options:**

1. **Asaas NFS-e** (built-in): When a charge confirms, Asaas can auto-issue the NFS-e via API. Simplest for cycle. Bundled cost (per Asaas pricing tiers, ~R$1–2 per NFS-e). Configured in the Asaas dashboard with the company's CNPJ + municipal registration + ISS rate.

2. **eNotas / Focus NFe / PlugNotas** (standalone): Dedicated NFS-e API that runs alongside the billing provider. More flexibility, can issue for events Asaas doesn't track. Costs ~R$0.30–0.80 per NFS-e at small volume.

**Recommendation:** Start with Asaas-bundled to minimize integrations during the cycle. If founder is operating as **MEI** (Microempreendedor Individual), MEI is often **exempt from NFS-e issuance** for sub-R$81K/year revenue depending on municipality — check with an accountant before assuming you need it at all for the first 10 customers.

**Critical action item before launch:** Engage a contador (Brazilian accountant) for **30 minutes** to confirm:
- What's the right entity for billing? (PF/MEI/ME/LTDA)
- What ISS rate applies to "atividade de informática" / "Sistema-as-a-Service" in the registered municipality?
- Is NFS-e mandatory for the founding entity at first-10-users scale?
- What CNAE / Código de Serviço (probably 1.05 or 1.07 from LC 116/2003) applies?

This is **out of stack scope** but cannot be skipped before LAUNCH-06.

---

### 6. LGPD Compliance — Built In-House (no SaaS magic)

**Recommendation:** **Do NOT buy a CMP (Consent Management Platform).** Build the four required pieces in-house in React + Supabase. **HIGH** confidence — for a 10-user product, third-party CMPs (CookieYes, Cookiebot, OneTrust) are overkill and add another vendor + cost + privacy footprint.

**The four pieces LGPD requires (LAUNCH-05 + ongoing):**

1. **Privacy policy + Terms of Service in Portuguese, prominently linked.**
   - Build as Markdown pages rendered via the existing `react-markdown` setup.
   - Routes: `/privacidade`, `/termos`.
   - Must specify: data controller (CNPJ + DPO email), what data collected, legal basis (LGPD Art. 7 — likely "execução de contrato" + "consentimento" for analytics), retention periods, sharing (Supabase = US-region, PostHog EU, Resend US, Asaas BR), user rights, how to file DSR.
   - Use a template generator like `iubenda` for the FIRST DRAFT (one-time, ~R$200), then commit the result as Markdown. Don't pay iubenda monthly.

2. **Consent banner for analytics.**
   - Build a small React component: shadcn `<Sheet>` at bottom-of-screen on first visit.
   - Three buttons: "Aceitar tudo" / "Recusar opcionais" / "Personalizar".
   - Persist choice in `localStorage.lgpd_consent_v1 = { necessary: true, analytics: bool, marketing: bool, timestamp: ISO }`.
   - **Wire it to PostHog `opt_in_capturing()` / `opt_out_capturing()`** and to GA4's `gtag('consent', 'update', ...)` Consent Mode v2.
   - Re-prompt yearly (timestamp check).
   - Accessibility: keyboard-navigable, screen-reader-friendly (this is a recent ANPD focus area).

3. **Data Subject Rights (DSR) flow.**
   - Add a `/perfil/privacidade` page in the existing settings area.
   - Buttons:
     - "Baixar meus dados" → triggers a new edge function `export-user-data` that gathers all rows tagged with `user_id` from the 30+ user-scoped tables and emails a JSON file via Resend.
     - "Excluir minha conta" → triggers `delete-user-account` edge function. Soft-delete first (mark `profiles.deleted_at`), hard-delete after 30-day cooling-off period via cron. Cancel Asaas subscription if active.
     - "Corrigir dados" → standard profile edit (already exists).
   - Log all DSR requests to `audit_logs` (already wired via `auditLogger.ts`) — required by LGPD Art. 18 §6.

4. **DPO email + ANPD reporting capability.**
   - `dpo@milespro.net.br` — can be the founder during cycle. Required by LGPD Art. 41.
   - List in the privacy policy with a 15-day max response SLA (LGPD Art. 19).
   - Have a documented process for reporting incidents to ANPD within "reasonable time" (Art. 48) — written runbook in `docs/security/data-breach-response.md` is sufficient for cycle.

**Additional LGPD-relevant configurations on the locked stack:**

- **Supabase region:** Confirm the project (`opusftqbbaozucmbuuug`) is in **`sa-east-1` (São Paulo)** if available. If currently in `us-east-*`, that's fine for LGPD but **must be disclosed in the privacy policy** as international transfer with adequate safeguards (Art. 33). Check with `mcp__supabase__get_project` (or dashboard) — and if it's in US-East and you can migrate cheaply, migrate.
- **Audit logging is already in place** (`src/lib/auditLogger.ts` + `audit_logs` table) — this satisfies LGPD Art. 37 ("registro das operações de tratamento"). Confirm coverage for: login, logout, signup, plan change, data export, account deletion, sensitive-data access (CPF reads, payment events).
- **Encryption at rest:** Supabase Postgres is encrypted at rest by default. **`program_accounts.password_encrypted`** is already AES-GCM encrypted via `_shared/crypto.ts`. **Add the same treatment to any column that holds CPF** (most CPFs are in `holders` and `travel_clients` per the schema dump) — not legally required but strongly recommended given the ANPD's posture on financial data.
- **Cookie inventory:** Document every cookie/storage item set by the app in the privacy policy. Categories from the codebase: Supabase auth (`localStorage`), theme (`localStorage` via `next-themes`), consent state (`localStorage`), GA4 (`_ga` cookie), PostHog (`ph_*` cookies). Mark Supabase auth + consent as "necessary"; everything else "optional / analytics".

**Why we are NOT buying a CMP:**
- CookieYes / Cookiebot start at $10–30/mo. At 10 paying users with R$199/mo gross MRR, that's a meaningful percentage.
- Their value (cookie auto-scanning, geo-aware banner, consent log dashboard) is overkill for a single-app SaaS with ~5 cookies.
- The "consent log" they offer is something Supabase + a single table can do trivially.
- Re-evaluate at 1,000+ users when the audit overhead actually justifies it.

---

## Cost Notes (Pre-Revenue → 10 Paying Users)

| Service | Free tier covers cycle? | Cost at 10 paying users | Cost at 1,000 users | Notes |
|---|---|---|---|---|
| **Supabase Pro** | No (Free auto-pauses after 7d, no backups) | **$25/mo** (mandatory upgrade before launch) | $25–125/mo (compute add-ons) | Critical: the Free tier pause-after-7d is incompatible with paying customers |
| **Asaas** | ✓ R$0 monthly + per-tx fees | **~R$10–15/mo** (5–7% effective on R$199 MRR) | ~R$1,000/mo (5–7% on R$20K MRR) | NFS-e issuance ~R$1–2 per invoice extra |
| **PostHog Cloud EU** | ✓ Yes (1M events/mo) | **$0/mo** | $0/mo (still under 1M events) | Free up to ~1M events/mo, ~5K replays/mo |
| **Sentry** | ✓ Yes (5K errors/mo) | **$0/mo** | $0–26/mo (Team plan if errors spike) | Free tier is single-user; Team plan if you add a contractor |
| **Resend** | ✓ Yes (3K emails/mo) | **$0/mo** | $20/mo (Pro = 50K emails) | Custom domain on free tier ✓ |
| **Domain (`milespro.net.br`)** | N/A | ~R$40/year (Registro.br) | Same | Already owned per `index.html:12` |
| **Apple Developer Program** | N/A | **$99/year** | $99/year | Required for App Store |
| **Google Play Developer** | N/A | **$25 one-time** | $25 one-time | |
| **Total monthly OpEx (BRL)** | — | **~R$160–180/mo** ($25 Supabase + R$15 Asaas + ~R$50 Apple amortized + DNS + hosting) | ~R$1,200/mo | Pre-revenue this is significant; revenue at 10× R$19.90 = R$199 covers it barely |

**Revenue math sanity check:** At R$19.90/mo Pro × 10 users = **R$199 MRR**. OpEx ~R$170/mo. **Margin per cycle marker: ~R$30/mo.** This is fine — the cycle is about validating willingness-to-pay, not profit. Just be aware that the cycle marker is essentially break-even, so **pricing the Pro tier at R$29.90 instead of R$19.90** would be a cleaner cycle target — worth raising as an open question to the PO if not already decided.

---

## Mobile / IAP Implications (CRITICAL — paid-tier app on iOS)

**The hard rule:** Apple App Store Guideline 3.1.1 requires that any **digital subscription unlocking app features** must use Apple In-App Purchase (IAP) — Apple takes 15–30%. There are exceptions:

1. **Reader apps** (Netflix, Spotify model): if the app is "primarily" for consuming content purchased elsewhere, you can skip IAP and link out. **MilesPro probably does not qualify** — it's a tool, not a content reader.
2. **Multiplatform Services** (Guideline 3.1.3(b)): if the same service is available on web + mobile and **purchases happen on the web**, the iOS app does not need to offer IAP **as long as it does not advertise/link to the web purchase from inside the app**. This is the workable path.
3. **External Link Entitlement**: as of 2025-2026, Apple allows external-payment links **in the US storefront without entitlement** (post-Epic ruling), and **with entitlement application** in EU and a few other markets. **Brazil is not yet a regulated market for this** — so external-link entitlement in BR is currently unclear/unavailable.

**Recommended strategy for MilesPro v1 (HIGH confidence on the strategy, MEDIUM confidence on long-term Brazil regulation evolution):**

> **The iOS app at launch will be a "downgraded" client: free tier features only. Pro/VIP upgrades happen exclusively on web (`app.milespro.net.br/planos`). The iOS app must NOT show pricing, must NOT link to the web pricing page, must NOT mention "upgrade." It can show "Para recursos avançados, acesse pelo navegador" generically once.**

This satisfies Guideline 3.1.3(b) Multiplatform Services and avoids both IAP fees and external-link entitlement application paperwork.

**Concrete implications for the cycle:**

- **Hide pricing/upgrade UI on iOS.** Use Capacitor's `Capacitor.getPlatform()` (note: requires importing `@capacitor/core` — currently not imported anywhere in `src/`, so this will be a fresh integration) to detect iOS at runtime. Hide `/planos`, `/assinatura`, "Upgrade" CTAs.
- **Allow login + free-tier usage on iOS.** A user who already paid on web can log into iOS and get full Pro/VIP features (server checks `subscription_plan`, not the platform). This is allowed.
- **Android does NOT have the same restriction** in the same form — Google Play allows external payments more freely (especially post-Epic settlement). For simplicity, apply the same "no pricing UI in app" rule to Android too at v1, then loosen later.
- **App Review submission notes:** explicitly tell the reviewer "This app is the mobile companion to a web service. Account creation and subscription management happen on our website. The app is free to use; users with paid web subscriptions receive enhanced features." This pre-empts the reject-on-review trap.
- **Apple's CIDE 10% Brazil tax** (mentioned in Apple's 2025 pricing update) applies to IAP for non-Brazil-based developers. **Not relevant to us if we're not using IAP at all.**

**What we are explicitly NOT doing:**
- ❌ Implementing Apple StoreKit IAP (`@capacitor-community/in-app-purchases` plugin) — adds 15–30% fee, requires duplicate plan management in App Store Connect, painful refund flows
- ❌ Applying for the External Purchase Link Entitlement in Brazil — not clearly available, paperwork-heavy, and the Multiplatform Services exemption is cleaner
- ❌ Submitting the app as a "Reader app" — doesn't qualify, would get rejected

**Re-evaluate this in 6–12 months** if Brazil's regulatory environment shifts (CADE has been investigating Apple's anti-steering; ruling could change the landscape).

---

## Web Hosting

**Recommendation:** Vercel free tier (Hobby) for the cycle, or **Cloudflare Pages** if Vercel's bandwidth limits become tight. **MEDIUM** confidence — depends on what the existing deploy pipeline is (the codebase doesn't make this fully explicit; CI uploads `dist/` artifact but no deploy step is wired).

- **Vercel Hobby:** 100 GB bandwidth/mo, edge functions, custom domain, free SSL. Probably the path of least resistance from "Lovable preview" to "real production."
- **Cloudflare Pages:** Unlimited bandwidth, free SSL, generous build minutes. Slightly more setup but cheaper at scale.
- **Avoid Lovable's hosting for production.** It's a preview/staging layer. Move the production domain (`app.milespro.net.br`) to a real hosting provider before billing real users.
- **Critical:** the current `capacitor.config.ts` `server.url` points to a `lovableproject.com` preview URL — this **must change** to either bundled `dist/` (recommended) or to the real production URL before mobile launch (LAUNCH-02 / LAUNCH-03).

---

## Open Questions (need decisions during planning)

1. **Founding entity:** PF / MEI / ME / LTDA? This blocks billing setup and NFS-e strategy. **Action:** 30-min call with contador.
2. **Pricing:** R$19.90 Pro / R$49.90 VIP (assumed) — confirm with PO. R$19.90 leaves ~R$30/mo margin at 10 users; R$29.90 would be more sustainable.
3. **Trial vs. freemium-only-to-Pro:** 7-day Pro trial requires CC upfront (Asaas pattern) OR free-then-prompt (lower conversion). PO decision needed.
4. **Annual plan?** Annual at ~17% discount (2 months free) reduces churn risk for cycle marker — worth offering.
5. **Supabase region:** Is the project currently in `sa-east-1`? If `us-east-*`, decide: migrate now (some downtime) or document international transfer in privacy policy (no migration).
6. **Sales channel for VIP (consultor segment):** is the WhatsApp link (`VITE_SALES_WHATSAPP`) the conversion path for VIP? Or self-serve checkout on Asaas? VIP at R$49–99/mo might justify human onboarding.
7. **Should we self-host PostHog?** No for the cycle, but worth flagging as a future LGPD-strengthening move at scale (~10K users) if EU instance + DPA isn't enough.
8. **iOS App Review risk:** First submission may get bounced for "lack of in-app purchase mechanism." Plan for at least one round-trip with App Review. Budget 2 weeks contingency in LAUNCH-02.

---

## Summary Decision Matrix

| Need | Choice | Confidence | Rationale (one-liner) |
|---|---|---|---|
| Billing | **Asaas** | HIGH | BR-native, low Pix fees, built-in NFS-e, PF/MEI-friendly |
| Analytics | **PostHog Cloud EU** + keep GA4 | MEDIUM-HIGH | Free tier covers cycle; existing scaffolding; EU instance for LGPD |
| Errors | **Sentry** (`@sentry/capacitor` v4 + `@sentry/react`) | HIGH | Best Capacitor + React + Deno coverage; free tier sufficient |
| Email | **Resend** (existing) + custom domain | HIGH | Already integrated; just verify domain |
| NFS-e | **Asaas-bundled** (defer to eNotas if scale) | MEDIUM | Reduces vendor count for cycle |
| LGPD CMP | **Build in-house** (banner + DSR + DPO) | HIGH | Third-party CMP overkill at 10 users |
| iOS strategy | **No IAP, no in-app pricing UI, web-only checkout (Multiplatform Services exemption)** | HIGH (strategy) / MEDIUM (regulatory durability) | Avoids IAP 15–30% fee and external-link entitlement paperwork |
| Hosting (web) | **Vercel Hobby** or **Cloudflare Pages** (NOT Lovable) | MEDIUM | Lovable is preview-grade, not production |
| Supabase tier | **Pro ($25/mo)** | HIGH | Free tier auto-pauses; incompatible with paying customers |

---

## Sources

### Billing
- [Stripe — Pix recurring payments support changelog (2026-04-22)](https://docs.stripe.com/changelog/dahlia/2026-04-22/pix-recurring-payments-support)
- [Stripe — Pix Automático docs](https://docs.stripe.com/payments/pix/pix-automatico)
- [Stripe — Set up a subscription with Pix](https://docs.stripe.com/billing/subscriptions/pix)
- [Stripe — Local payment methods pricing (Brazil)](https://stripe.com/en-br/pricing/local-payment-methods)
- [Stripe — Pricing & Fees Brazil](https://stripe.com/en-br/pricing)
- [Asaas — Subscriptions documentation](https://docs.asaas.com/docs/subscriptions)
- [Asaas — Subscriptions via credit card](https://docs.asaas.com/docs/subscriptions-via-credit-card)
- [Asaas — Webhook events for charges](https://docs.asaas.com/docs/webhook-para-cobrancas)
- [Asaas — Pricing](https://www.asaas.com/precos-e-taxas)
- [Asaas — Pix overview](https://docs.asaas.com/docs/pix-overview)
- [PagBrasil — Recurring Payments for SaaS in Brazil](https://www.pagbrasil.com/blog/markets/saas/recurring-payment-for-saas-in-brazil/)
- [iDinheiro — Best Payment Gateways 2026](https://www.idinheiro.com.br/negocios/melhores-gateways-de-pagamento/)

### Analytics
- [PostHog — React + Vite installation](https://posthog.com/docs/web-analytics/installation/react)
- [PostHog — GDPR compliance](https://posthog.com/docs/privacy/gdpr-compliance)
- [PostHog — Privacy compliance index](https://posthog.com/docs/privacy)
- [PostHog vs Mixpanel — Amplitude comparison](https://amplitude.com/compare/posthog-vs-mixpanel)
- [Analytics Pricing Comparison April 2026](https://www.buildmvpfast.com/api-costs/analytics)
- [Amplitude vs Mixpanel vs PostHog: Honest 2026 Comparison (Medium)](https://talking-tech-with-j.medium.com/amplitude-vs-mixpanel-vs-posthog-the-honest-2026-comparison-25696721d9c5)

### Error tracking
- [Sentry — Capacitor SDK docs](https://docs.sentry.io/platforms/javascript/guides/capacitor/)
- [Sentry — sentry-capacitor releases (GitHub)](https://github.com/getsentry/sentry-capacitor/releases)
- [Sentry — Migrate v3 to v4](https://docs.sentry.io/platforms/javascript/guides/capacitor/migration/v3-to-v4/)
- [Sentry — Source maps for Capacitor](https://docs.sentry.io/platforms/javascript/guides/capacitor/sourcemaps/)
- [Sentry vs Bugsnag comparison](https://faun.dev/c/stories/squadcast/sentry-vs-bugsnag-a-comprehensive-comparison-of-error-monitoring-tools-2025/)
- [Best Sentry Alternatives for Indie Hackers 2026](https://devtoolpicks.com/blog/best-sentry-alternatives-indie-hackers-2026)

### Email
- [Resend — Pricing](https://resend.com/pricing)
- [Resend — Pay-as-you-go changelog](https://resend.com/changelog/pay-as-you-go-pricing)
- [Email API Pricing Comparison April 2026 (Resend, SendGrid, Postmark)](https://www.buildmvpfast.com/api-costs/email)

### NFS-e / Brazilian tax
- [EDICOM — Electronic invoicing in Brazil (NF-e, NFS-e, NFCom, CT-e)](https://edicomgroup.com/blog/electronic-invoicing-brazil)
- [Fonoa — Brazil 2026 Tax Reform: Key E-Invoicing Changes](https://www.fonoa.com/resources/blog/brazil-tax-reform-e-invoicing-2026)
- [Storecove — Brazil E-invoice Requirements](https://www.storecove.com/blog/en/what-are-the-e-invoice-requirements-in-brazil/)
- [Stripe — NFS-e support article](https://support.stripe.com/questions/nota-fiscal-eletr%C3%B4nica-de-servi%C3%A7os-invoices-(nf-e))
- [Notaas — National NFSe API providers comparison 2026](https://www.notaas.com.br/blog/post/api-nfse-nacional-melhor-provedor-emissao-nota-fiscal-de-servico-eletronica-nacional)
- [Focus NFe — API for Electronic Invoices](https://focusnfe.com.br/)
- [eNotas — Plans and Pricing 2026](https://enotass.com.br/notas)

### LGPD
- [Cookie Information — LGPD explained](https://cookieinformation.com/regulations/lgpd/)
- [ComplyDog — LGPD Complete Compliance Guide for SaaS](https://complydog.com/blog/brazil-lgpd-complete-data-protection-compliance-guide-saas)
- [Secure Privacy — LGPD Cookie Banner Requirements](https://secureprivacy.ai/blog/lgpd-cookie-banner-requirements)
- [CookieHub — Brazilian LGPD Cookie Consent](https://www.cookiehub.com/lgpd)
- [Mailchimp — Brazilian Data Protection FAQs](https://mailchimp.com/help/lgpd-faq/)

### Apple App Store / IAP
- [Apple Developer — App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [RevenueCat — App-to-web: external purchases in iOS and Android](https://www.revenuecat.com/blog/engineering/app-to-web-purchase-guidelines/)
- [RevenueCat — Apple Anti-Steering Ruling (Epic case)](https://www.revenuecat.com/blog/growth/apple-anti-steering-ruling-monetization-strategy/)
- [Apple Developer — External Purchase documentation](https://developer.apple.com/documentation/storekit/external-purchase)
- [Apple Developer News — Tax and Price updates Brazil/CIDE](https://developer.apple.com/news/?id=wim4cztw)
- [Funnelfox — App Store Fees and Commission Rates 2026](https://blog.funnelfox.com/apple-app-store-fees-2026-eu-dma/)

### Hosting / Infra
- [Supabase — Pricing](https://supabase.com/pricing)
- [Supabase Pricing Breakdown 2026 (UI Bakery)](https://uibakery.io/blog/supabase-pricing)
- [Supabase Pricing Real Costs (DesignRevision)](https://designrevision.com/blog/supabase-pricing)
