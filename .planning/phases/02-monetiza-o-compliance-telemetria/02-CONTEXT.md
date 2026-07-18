# Phase 2: Monetização, Compliance & Telemetria — Context

**Gathered:** 2026-05-12
**Status:** Ready for planning
**Discuss mode:** Focused (3 pricing decisions explicitly discussed; 21 other gray areas accepted at recommended default per `02-ASSUMPTIONS.md`)

<domain>
## Phase Boundary

An authenticated user can complete checkout for Pro or VIP via Asaas (Pix/Cartão/Boleto); their `user_subscriptions.plan` flips to the purchased tier within seconds of webhook (idempotent under duplicate delivery); Free/Pro/VIP feature matrix is enforced in UI hints AND in RLS; all LGPD obligations live BEFORE any paid signup is possible (DSR endpoints, granular consent, privacy/terms, DPO email); real telemetry flows (consent-gated PostHog funnel + Sentry with PII scrubbing); production web reachable at `app.milespro.net.br` with landing + helpdesk channel staffed.

**Out of scope:** mobile builds (Phase 3), full BR tax automation (deferred to v2), full subscription state machine for trial+overlap edge cases (Phase 2 PAY-* may revisit).

**Requirements (26 total):** PAY-01..PAY-08, TIER-01..TIER-06, TEL-01..TEL-03, COMPL-01..COMPL-06, LAUNCH-01, LAUNCH-04, LAUNCH-05.

**PJ-blocker:** Live PAY-01 cutover requires founder CNPJ. Until then, design + scaffold of PAY-* (edge functions, migrations) can proceed; everything else (TIER-*, TEL-*, COMPL-*, LAUNCH-01/04/05) is unblocked.

</domain>

<decisions>
## Implementation Decisions

### Pricing (explicitly discussed)

- **D-01 (PRICE-01) — Pro mensal = R$37,90/mês.** Maintain current price already published in `src/pages/Assinatura.tsx:74` and `src/pages/Index.tsx:182`. Rationale: users in current sessions have already seen this price; changing post-launch would trigger Termos §4 30-day notice obligation. Defines `Asaas.Subscription.value`, MRR baseline, LAUNCH-04 landing copy. VIP follows R$67,90/mês (Key Decision, locked separately).

- **D-02 (PRICE-02) — Three billing cycles: monthly + semestral (-10% off) + annual (-20% off).** Maintain current UI implementation. 6 Asaas products total (Pro × 3 cycles + VIP × 3 cycles). Annual prepay supports cash flow; semestral acts as psychological buffer between monthly and annual.

- **D-03 (PRICE-03) — Trial = 7 days Pro with card-on-file.** Card tokenized at trial start via Asaas; first charge fires on day 8 unless user cancels. Mitigates HIGH-01 (trial multi-account abuse) — Asaas refuses second trial on same `customer.id`. NOTE: `src/pages/Termos.tsx` currently says "14 days no card" — that is a **bug** to fix in Phase 2 W0 (sub-task of `SCOPE-01`).

### Infrastructure (recommended defaults accepted)

- **D-04 (INFRA-01) — Stay on Lovable Cloud's default region (us-east-1 typical) + document SCC for international transfer in privacy policy.** Migration to sa-east-1 is a 1-3-day project deferred until enterprise trigger fires (research recommendation: pre-revenue migration is over-investment). Privacy policy must list each sub-processor and reference the standard SCC clauses for BR→US data transfer (LGPD-compatible per ANPD).

- **D-05 (INFRA-02) — Production web hosted on Vercel (Hobby tier).** Connects via GitHub integration to `main`, auto-deploys, SSL automatic via Let's Encrypt. Cloudflare Pages and Lovable's own publishing are alternatives but Vercel has the cleanest DX with Vite + edge functions through Supabase (not via Vercel functions). Cost: $0 at MVP scale.

- **D-06 (INFRA-03) — Primary domain on subdomain `app.milespro.net.br`, redirect `milespro.net.br` → landing.** Subdomain pattern enables iOS Universal Links / Android App Links registration (Phase 3 prerequisite). DNS will be configured via Cloudflare DNS pointing to Vercel.

### Technical (recommended defaults accepted)

- **D-07 (TECH-01) — Asaas Subscriptions API** (not raw Charges API). Use `POST /v3/subscriptions` to create recurrence; Asaas auto-issues each cycle's Cobrança. Webhook on `PAYMENT_CONFIRMED` + `PAYMENT_RECEIVED` (HIGH-02 boleto next-business-day handling) drives `user_subscriptions.plan` transitions.

- **D-08 (TECH-02) — Asaas is the source of truth; DB `user_subscriptions` is a denormalized read cache.** Webhook handler `asaas-webhook` upserts `user_subscriptions` from Asaas events. Periodic reconciliation (D-09) catches missed webhooks.

- **D-09 (TECH-03) — Reconciliation cron via Supabase `pg_cron` + edge function.** `pg_cron` is built-in to Supabase Cloud, runs nightly job that calls `reconcile-asaas-subscriptions` edge function — paginates `GET /v3/subscriptions?status=ACTIVE` and reconciles DB. GitHub Actions cron is alternative but introduces external coupling.

- **D-10 (TECH-04) — iOS Path C UI hiding via runtime detection** (Capacitor `Capacitor.getPlatform()`), not build-time env. Single bundle deploys to web + iOS; on iOS, pricing/checkout UI swaps to neutral "gerencie sua assinatura em milespro.net.br" copy without clickable links to checkout (Apple Guideline 3.1.3(b) — Multiplatform Services exemption).

### Scope (recommended defaults accepted)

- **D-11 (SCOPE-01) — Keep Assinatura.tsx + Index.tsx shells; replace only the CTA handler.** Don't rewrite the pricing UI from scratch. Replace `handlePlanCta` in `src/pages/Assinatura.tsx:226-302` with call to new `create-checkout-session` edge function. Same in `AnimatedSections.tsx` PricingSection. Keep `subscription_leads` table as a **shadow log** for failure cases (`VITE_ENABLE_SUBSCRIPTION_LEADS` flag goes false but table stays).
  - **Sub-task W0:** Rename "Plus" → "Pro" in `Index.tsx:181-232` and `comparisonFeatures` array (Phase 1 enum consolidation missed this).
  - **Sub-task W0:** Fix `Termos.tsx:69` "Plus e Pro" → "Pro e VIP".
  - **Sub-task W0:** Fix `Termos.tsx` "14 dias trial sem cartão" → "7 dias Pro com cartão (PRICE-03)".

- **D-12 (SCOPE-02) — Free tier limits: 3 programas + 5 contas.** `useSubscription.ts:131-137` currently has `maxPrograms: 1` — bump to 3. Research §3 argues 1 is dolefully limited and triggers immediate 1-star reviews. Going from 1 → 3 is loosening (all existing Free users remain compatible — no grandfather needed). RLS policy on `user_programs` enforces `count < max_programs` via new policy in Phase 2 W1.

- **D-13 (SCOPE-03) — Pro killer feature INCLUDED: personalized transfer-promotion alerts** (Livelo→Smiles bonus tied to user's program balances). Without this, R$37,90 vs Free is "porque sim". Implementation extends existing `fetch-promotions` edge function to correlate `promotion.programs` with `user_programs.balance`. New PostHog events `promotion_alert_shown` / `promotion_alert_clicked` (TEL-01). New UI surface: section on Dashboard or `/promocoes` route.

- **D-14 (SCOPE-04) — MRR dashboard: rewrite, do not refactor.** Existing `supabase/functions/mrr-dashboard/index.ts` has `PLAN_PRICES` const with legacy values (`basic`, `plus`, `pro_familia`) that no longer exist in production enum. Rewrite uses Asaas API `GET /v3/subscriptions?status=ACTIVE` (paginated) as truth source; calculates real MRR as `sum(value / cycle_months)`; surfaces cohort funnel (signup → trial_start → paid → cancelled) via PostHog query API. Admin-gated by `is_admin` boolean on `profiles` (new column) or separate `admin_users` table.

- **D-15 (SCOPE-05) — VIP sold via self-serve Asaas, same flow as Pro.** No WhatsApp human channel. Delete `VITE_SALES_WHATSAPP` env var and `wa.me/...` fallback in `Assinatura.tsx:249`. `subscription_leads` table continues as shadow log only.

### Compliance (recommended defaults accepted)

- **D-16 (COMPL-A) — Consent banner built in-house.** ~200 LOC React + `public.user_consents` table + `useConsent()` hook. Separate checkboxes for ToS, Privacy, Marketing email, Analytics (LGPD Art. 8 §4 — single-checkbox consent is invalid). No third-party CMP (OneTrust/Cookiebot) — overkill at 10-user scale.

- **D-17 (COMPL-B) — Update sub-processor list in `/privacidade`:** swap Stripe (currently in `Privacidade.tsx:56, 94`) → Asaas; add PostHog (EU region), Sentry, Resend, Supabase (Lovable Cloud). Add SCC clause referencing BR→US transfer per D-04.

- **D-18 (COMPL-C) — LGPD delete: soft delete + 7-day window + cron hard-delete.** User clicks "Excluir minha conta" → email confirmation → row marked `deletion_requested_at` → after 7 days, daily cron purges. Cascade: `auth.users` row → all `user_id`-keyed rows (Phase 1 FK CASCADE handles `user_subscriptions`) → Asaas customer (via API) → PostHog person (via API) → Sentry user (via API). `deletion_audit` row remains. 7-day window allows reversal if user changes mind.

- **D-19 (COMPL-D) — 7-day money-back guarantee, unconditional.** Published in ToS + reinforced on pricing page. Process: user emails `dpo@milespro.net.br` within 7 days of first charge → manual refund via Asaas dashboard → subscription canceled. Future: automated refund button (deferred).

- **D-20 (COMPL-E) — DPO email = `dpo@milespro.net.br`** (dedicated, not aliased to suporte@). `Privacidade.tsx:127` currently says `suporte@` — fix in Phase 2 W0. Configure Resend or simple `dpo@` forwarder to founder's inbox until volume justifies separation.

### Sequencing (recommended defaults accepted)

- **D-21 (SEQ-01) — PJ-blocker handled by wave decoupling.** Waves 0-2 (foundation, consent/LGPD, webhook scaffold) advance without CNPJ. Wave 3 (production cutover, Asaas live keys, NFS-e issuance) waits for CNPJ. Allows ~80% of Phase 2 work to advance in parallel with founder's PJ paperwork.

- **D-22 (SEQ-02) — NFS-e in Phase 2 v1, bundled via Asaas.** Asaas issues NFS-e automatically for subscriptions; ISS handled at issuance. No dedicated tax automation needed at this scale. Revisit when MRR > R$10K/mo (deferred to v2 per MED-08).

- **D-23 (SEQ-03) — Helpdesk via Crisp free tier + WhatsApp Business.** Crisp free supports unlimited 2-agent inboxes — enough for 10 pagantes. WhatsApp Business as secondary channel for high-urgency. Both integrate into landing page. Front and Intercom are upgrades for post-revenue.

- **D-24 (SEQ-04) — Resend custom domain `noreply@milespro.net.br`.** SPF + DKIM + DMARC configured BEFORE first send. Warmup period: 1 week sending only to founder/dev addresses before opening to real users. Sender: `noreply@milespro.net.br` (not `onboarding@resend.dev` default).

### Phase 1 carry-over (must close in Phase 2 W0)

- **D-25 (AR-2 from SECURITY.md) — Remove dead JWT fallback from `vite.config.ts:71-74`.** Currently hardcoded JWT is the legacy anon key (revoked 2026-05-12T21:47:41Z). Either swap for current `sb_publishable_*` key OR remove fallback entirely once Lovable Cloud injects `VITE_*` envs reliably. Reactivate strict `failOnSecretLeak` for those 3 vars.

- **D-26 (AR-3) — Wire Deno test job into CI.** `supabase/functions/google-calendar-auth/index.test.ts` (3 Deno tests) currently has no CI runner. Add `denoland/setup-deno@v1` + `deno test` step to `.github/workflows/ci.yml`.

- **D-27 — Extend `FORBIDDEN_VITE_PATTERNS`** in `vite.config.ts` to catch `VITE_ASAAS_API_KEY` / `VITE_ASAAS_WEBHOOK_SECRET` BEFORE PAY-01 — preventive guard.

- **D-28 — Cleanup or drop deprecated `can_access_feature()` function** (Phase 1 SECURITY.md follow-up). Functions marked DEPRECATED in Phase 1 should be removed or audit-noted.

### Claude's Discretion

- Exact `<ConsentBanner>` visual design (placement, colors, copy variants)
- Exact `webhook_events` table schema beyond `(provider, event_id)` UNIQUE constraint — planner can specify columns
- Exact wave-to-plan decomposition (7-8 plans estimated, 4 waves estimated per ASSUMPTIONS.md)
- PostHog event taxonomy (event names, property structure) — TEL-01 has examples, planner expands
- Sentry sample rates and `beforeSend` regex patterns
- Specific Resend email template HTML/copy

</decisions>

<specifics>
## Specific Ideas

- "Path C exemption for iOS must be clean — `strings | grep` must return zero pricing references when Phase 3 ships the build." Apple reviewer will run this.
- "Webhook idempotency must be provable by `curl` double-fire returning HTTP 200 with no side effects." Cycle-level kill-switch (Success Criterion #2).
- "Bundle continues to be secret-free — `failOnSecretLeak()` plugin from Phase 1 must be extended, not weakened, when Asaas keys arrive."
- "Anchor messaging on landing: 'uma emissão paga vários meses de Pro' — anchor R$37,90/m against the value of saving on a single milhas transaction."
- "Sub-processor list is part of LGPD compliance; missing one is a compliance violation. List must be exhaustive and reviewed by lawyer before public launch."

</specifics>

<canonical_refs>
## Canonical References

Downstream agents (`gsd-phase-researcher`, `gsd-planner`) MUST read these before investigating or planning.

### Project framing
- `.planning/PROJECT.md` — Key Decisions table (locked items: Asaas chosen, iOS Path C, trial 7d card-on-file, PJ requirement, Free+Pro+VIP tiers, multi-CPF VIP-only)
- `.planning/REQUIREMENTS.md` — All 26 Phase 2 requirements with acceptance criteria (PAY-01..08, TIER-01..06, TEL-01..03, COMPL-01..06, LAUNCH-01/04/05)
- `.planning/ROADMAP.md` §Phase 2 — Phase boundary, Pitfall guardrails (CRIT-04 webhook idempotency, CRIT-05 LGPD 15-day clock, CRIT-03 Apple IAP design, HIGH-01 trial abuse, HIGH-02 Asaas BR specifics, HIGH-03 PII analytics, HIGH-06 pricing-page conversion, MED-01 locale, MED-02 email deliverability, MED-08 BR tax)
- `.planning/research/SUMMARY.md` §2-3 — Strategic decisions (Asaas-vs-Stripe-BR rationale, pricing research, killer Pro feature analysis, LGPD CMP build-vs-buy)

### Phase 1 outputs (depended on)
- `.planning/phases/01-security-foundation-hardening/SECURITY.md` — Threat closures + 4 accepted risks (AR-1..AR-4); read AR-2/AR-3/AR-4 carefully (active follow-ups)
- `.planning/phases/01-security-foundation-hardening/01-CONTEXT.md` — D-01 enum, D-04 region, D-05 RLS soft-isolation, D-09 service-role rotation, D-10 OAUTH_STATE_SECRET — all locked and depended on
- `supabase/migrations/20260512120003_create_has_plan_function.sql` — Trust kernel `has_plan(uuid, subscription_plan)` signature used by Phase 2 RLS
- `supabase/migrations/20260512120004_create_managed_accounts_and_can_access_account.sql` — Multi-CPF kernel signature used by TIER-05/TIER-06

### Phase 2 internal
- `.planning/phases/02-monetiza-o-compliance-telemetria/02-ASSUMPTIONS.md` — Full 794-line gray-areas map; cross-reference any decision here against the rationale captured there

### Asaas integration (research targets — planner must verify before locking)
- Asaas API docs §Subscriptions (https://docs.asaas.com/reference/criar-nova-assinatura) — request/response shapes, webhook event types, idempotency semantics
- Asaas API docs §Webhook signature validation — HMAC verification pattern
- Asaas dashboard checkout customization (`pt-BR` locale flag, brand colors)

### LGPD compliance (research targets)
- ANPD guidelines on consent (LGPD Art. 8 §4) — granular consent requirement
- LGPD Art. 18 (DSR rights) — 15-day legal limit, recommended SLA <24h
- PostHog data residency options (Cloud EU region) — for sub-processor compliance

### Codebase entry points planner will touch
- `src/pages/Assinatura.tsx` — pricing UI (D-11 keep shell, replace CTA)
- `src/pages/Index.tsx` — landing page pricing section (D-11 rename Plus→Pro)
- `src/pages/Termos.tsx` — ToS (D-03 fix trial copy, D-11 fix Plus→Pro)
- `src/pages/Privacidade.tsx` — Privacy policy (D-17 sub-processors, D-20 DPO email)
- `src/lib/posthog.ts` — Currently mock; D-16 makes consent-gated wrapper
- `src/lib/subscriptionLeads.ts` — Stays as shadow log only (D-11)
- `src/hooks/useSubscription.ts` — D-12 Free limits bump
- `supabase/functions/mrr-dashboard/index.ts` — D-14 full rewrite target
- `supabase/functions/fetch-promotions/index.ts` — D-13 extension target
- `vite.config.ts:71-74` — D-25 fallback cleanup
- `.github/workflows/ci.yml` — D-26 Deno test job + D-27 forbidden patterns extension
- `.env.example` — D-15 delete `VITE_SALES_WHATSAPP` + `VITE_ENABLE_SUBSCRIPTION_LEADS`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **Trust kernel (Phase 1)**: `public.has_plan(uuid, subscription_plan)` + `public.can_access_account(uuid, uuid)` — all new TIER-* RLS policies wrap these. Single source of truth for plan gating.
- **`managed_accounts` table (Phase 1)**: Used by TIER-05 (VIP multi-CPF add managed account) + TIER-06 (VIP switch active managed view).
- **`failOnSecretLeak()` Vite plugin (Phase 1)**: Build-time guard. D-27 extends `FORBIDDEN_VITE_PATTERNS` to include `VITE_ASAAS_*`.
- **`subscription_leads` table (Phase 1 bootstrap)**: Now a shadow log of intent + Asaas failures (D-11). Existing RLS policies remain valid.
- **`google-calendar-auth` edge function**: Pattern reference for HMAC-signed callbacks (Asaas webhook will use similar HMAC verification).
- **`mrr-dashboard` edge function**: Replace, don't keep (D-14).
- **`fetch-promotions` edge function**: Extend (D-13) for Pro killer feature.

### Established Patterns

- **Edge function naming**: kebab-case verb-noun (`create-checkout-session`, `asaas-webhook`, `lgpd-export`, `lgpd-delete`, `reconcile-asaas-subscriptions`).
- **RLS policy naming**: `<table>_select / _insert / _update / _delete` snake_case — enforced by Phase 1 W-5 DO blocks. New TIER-* policies follow same convention.
- **Migration naming**: `<timestamp>_<verb_phrase>.sql` with inline `RAISE EXCEPTION` self-checks.
- **TS type system**: `SubscriptionPlan = 'free' | 'pro' | 'vip'` is canonical. Never `'plus'` again.
- **Trust kernel access pattern**: every plan-gated write policy ends with `... AND public.has_plan(auth.uid(), '<tier>')` in `WITH CHECK`. Reads use soft-isolation (D-05 from Phase 1: `auth.uid() = user_id`).

### Integration Points

- **`asaas-webhook` edge function** ↔ `user_subscriptions` table: webhook handler upserts via Asaas SoT pattern (D-08). Idempotency via `webhook_events(provider, event_id) UNIQUE`.
- **`<ConsentBanner>`** ↔ `posthog.init()`: PostHog blocked until consent state is `analytics_opted_in = true` (D-16). Sentry init has no consent gate (legitimate interest).
- **Trust kernel (Phase 1)** ↔ new TIER-* RLS (Phase 2): all new policies wrap `has_plan()` calls; zero duplication of plan-lookup logic.
- **Resend** ↔ `auth.users`: signup welcome email; trial-ending reminder (3 days before charge); receipt after first charge. Templates in `src/templates/emails/` (new directory).

</code_context>

<deferred>
## Deferred Ideas

These came up in discussion but belong elsewhere — captured here to avoid losing them.

- **Soft delete UNIQUE INDEX on `user_subscriptions(user_id) WHERE is_active`** — agent recommended in Phase 1 cleanup; deferred to Phase 2 PAY-* because business-logic rules around trial+paid overlap will define what "one active sub" means precisely.
- **Full BR tax automation** (ICMS/ISS dedicated processor) — deferred to v2 per MED-08. Asaas-bundled NFS-e is sufficient at <R$10K MRR.
- **Automated refund button** (vs manual via Asaas dashboard for D-19) — operator-driven for MVP; automate when refund volume justifies engineering time.
- **Face detection / advanced photo features** — not a MilesPro thing, but illustrating: scope creep belongs in `999-backlog.md`, not Phase 2.
- **Phase 1 `can_access_feature()` cleanup** (D-28) — included as W0 sub-task; if it grows in scope, can move to dedicated plan.
- **PostHog cohort dashboards beyond basic funnel** — TEL-02 covers signup → first_balance_added → viewed_pricing → started_checkout → paid_first_invoice; advanced cohort analysis post-launch.

</deferred>

---

*Phase: 02-monetiza-o-compliance-telemetria*
*Context gathered: 2026-05-12*
*Discuss-phase mode: focused (3 pricing decisions explicit, 21 defaults accepted via `02-ASSUMPTIONS.md`)*
