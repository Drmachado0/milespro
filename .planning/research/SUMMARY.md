# Research Synthesis — MilesPro "First 10 Paying Users"

**Synthesized:** 2026-05-11
**Source docs:** `STACK.md` (460 lines), `FEATURES.md` (342 lines), `ARCHITECTURE.md` (755 lines), `PITFALLS.md` (647 lines)
**Overall confidence:** HIGH on what to build and how; MEDIUM on regulatory durability (Apple/ANPD landscape moves) and on price-point validation (no real users yet)
**Bottom line:** Stack is right; the cycle is mostly **closing security gaps + adding billing infra + building one defensible Pro feature + getting iOS submitted under the Multiplatform Services exemption**. Top risk is operational (LGPD 15-day clock, webhook idempotency, RLS rewrite) — not technical novelty.

---

## 1. TL;DR — The Opinionated Calls

1. **Pick Asaas, NOT Stripe** for billing. BR-native fees (R$0.99 flat Pix), NFS-e bundled, MEI-friendly, Pix Automático live since 2025 (Stripe shipped it April 2026 — too new for first launch). See `STACK.md §1`.
2. **No iOS IAP. No upgrade UI inside the iOS app at all.** Use Apple Guideline 3.1.3(b) "Multiplatform Services" exemption — checkout only on web (`app.milespro.net.br/planos`); iOS app is sign-in + free-tier UI only. Avoids 15-30% Apple tax and external-link entitlement paperwork. See `STACK.md §Mobile/IAP` + `PITFALLS.md CRIT-03`.
3. **The architectural core is a 4-piece "trust kernel"** in Postgres: `has_plan(uid, plan)`, `can_access_account(viewer, target)`, `webhook_events` idempotency table, `managed_accounts` ownership table. Every premium RLS policy delegates to these. See `ARCHITECTURE.md §3` + `§5`.
4. **Consolidate the plan enum (5→3 values: `free|pro|vip`) BEFORE writing any new RLS or any pricing UI.** Today `agency`, `pro_familia`, `basic`, `plus` are landmines. See `PITFALLS.md HIGH-05` + `ARCHITECTURE.md §Migration Order`.
5. **Soft isolation on downgrade** — Pro→Free keeps reading paid data (read-only), blocks new writes. Prevents "where did my data go?" support tickets while plugging revenue leak. See `ARCHITECTURE.md §Downgrade Behavior`.
6. **Pro tier killer feature: alerta de promoção de transferência personalizado** (Livelo→Smiles bonus alerts tied to user's actual balance) + Transfer Optimizer. Without this, R$19,90 is "porque sim". See `FEATURES.md §3`.
7. **VIP must offer multi-CPF UNLIMITED with no per-account upcharge** — that's how SisMilhas/GeMilhas position; charging per CPF = instantly losing the consultor segment. See `FEATURES.md §5`.
8. **Free tier MUST keep basic vencimento alerts** (in-app, >30d). Paywalling this generates 1-star reviews and weakens LGPD posture. Pro adds: multi-channel (push+email), configurable antecipation, transfer-promo alerts. See `FEATURES.md §3`.
9. **LGPD has a hard 15-day clock from any DSR.** Build `/api/lgpd/export` + `/api/lgpd/delete` edge functions BEFORE the first paid signup. See `PITFALLS.md CRIT-05`.
10. **Three CRIT-level gaps already in code** (`CONCERNS.md`-confirmed): client-side plan gating, `VITE_*SERVICE_ROLE*` reference in client bundle, plan-enum mismatch. None can ship to a paying user.

---

## 2. Stack Additions — Decided

| Need | Choice | Confidence | One-line rationale |
|---|---|---|---|
| Billing gateway | **Asaas** | HIGH | BR-native, R$0.99 Pix flat, NFS-e bundled, PF/MEI-friendly |
| Tax invoice (NFS-e) | **Asaas-bundled** (defer eNotas) | MEDIUM | Reduces vendor count for cycle; revisit at scale |
| Product analytics | **PostHog Cloud EU** + keep GA4 | MEDIUM-HIGH | Existing scaffolding; EU instance for LGPD; free tier covers cycle |
| Error tracking | **Sentry** (`@sentry/react` + `@sentry/capacitor` v4) | HIGH | Best Capacitor + React + Deno coverage; 5K errors/mo free |
| Transactional email | **Resend** + verified custom domain | HIGH | Already integrated; just replace `onboarding@resend.dev` with `noreply@milespro.net.br` |
| LGPD CMP | **Build in-house** (banner + DSR endpoints + DPO email) | HIGH | Third-party CMP overkill at 10 users |
| iOS payment strategy | **Multiplatform Services exemption — no IAP, no in-app pricing** | HIGH (strategy) / MEDIUM (regulatory durability) | Avoids 15-30% Apple fee; revisit in 6-12mo |
| Hosting (web) | **Vercel Hobby** or **Cloudflare Pages** | MEDIUM | Move off Lovable preview before mobile launch |
| Supabase tier | **Pro ($25/mo)** | HIGH | Free tier auto-pauses after 7d — incompatible with paying customers |

**Concrete `package.json` additions:** `posthog-js@^1.220.0`, `@sentry/react@^9.x`, `@sentry/capacitor@^4.0.0`, `@sentry/vite-plugin@^3.x` (devDep). Asaas is REST-only (no npm package — call from edge functions).

**NOT adding (opinionated):** Segment/RudderStack (CDP), separate feature-flag service, APM beyond Sentry, customer-support SaaS, help-center SaaS, CMP, Stripe BR, MercadoPago, Pagar.me, AWS SES.

**Conflict between docs (resolved):** `STACK.md` recommends Asaas. `ARCHITECTURE.md §Webhook` and `PITFALLS.md CRIT-04 / HIGH-02` were drafted assuming Stripe (legacy code reference: `useSubscription.ts` has `stripe_subscription_id` column; `Privacidade.tsx:56` mentions Stripe). **Resolution:** Asaas wins per STACK.md analysis — patterns transfer with field renames (`stripe_customer_id` → `asaas_customer_id`, `STRIPE_WEBHOOK_SECRET` → `ASAAS_WEBHOOK_TOKEN`). Idempotency, signature verification, race-condition handling — identical patterns.

---

## 3. Feature Scope by Tier

| Capability | Free | Pro | VIP |
|---|:-:|:-:|:-:|
| **Entrada de dados** |
| Cadastro manual saldo (4 programas core + extras) | ✓ (cap 3 prog / 5 contas) | ✓ ilimitado | ✓ ilimitado |
| Histórico de movimentação | — | ✓ | ✓ |
| Cadastro cartões + clubes | — | ✓ | ✓ |
| **Saldos & Decision Tools** |
| Dashboard + conversão R$ (CPM mercado) | ✓ | ✓ | ✓ |
| Calculadora "vale a pena" pública | ✓ | ✓ | ✓ |
| Gráfico evolução 12m + comparador venda/resgate | — | ✓ | ✓ |
| **Transfer Optimizer + alerta promoção transferência personalizado** ⭐ | — | ✓ | ✓ |
| Sugestão automática de uso | — | ✓ | ✓ |
| CPM de aquisição (custo médio milheiro) | — | — | ✓ |
| **Vencimentos** |
| Alerta in-app vencimento >30d | ✓ | ✓ | ✓ |
| Push + email + antecipação configurável (60/90/180d) | — | ✓ | ✓ |
| Integração Google Calendar (já existe) | — | ✓ | ✓ |
| **Multi-CPF (defining VIP feature)** |
| Múltiplos CPFs ilimitados + switcher + visão consolidada | — | — | ✓ |
| Tags + notas por cliente | — | — | ✓ |
| Relatório consolidado familiar + relatório fiscal | — | — | ✓ |
| Área de afiliados (cupom MVP) | — | — | ✓ |
| **Reports** |
| PDF saldo atual | ✓ | ✓ | ✓ |
| PDF detalhado + Excel/CSV + email mensal | — | ✓ | ✓ |
| **Mobile** |
| Login biométrico + modo offline | ✓ | ✓ | ✓ |
| Push notifications (vencimento + promo) | — | ✓ | ✓ |
| **Hygiene** |
| Email + Google + Apple OAuth + Dark mode | ✓ | ✓ | ✓ |
| 2FA TOTP | — | ✓ | ✓ |

⭐ = killer feature that justifies Pro pricing.

**Pricing benchmark:** Free R$0 (cap 3 prog / 5 contas) · Pro **R$19,90/mo or R$199/yr** · VIP **R$49,90/mo or R$499/yr** · 7-day Pro trial requires card-on-file. **Note:** at R$19,90 × 10 = R$199 MRR vs ~R$170 OpEx → break-even; **R$29,90 Pro** would be more sustainable (open question for PO).

**Anti-features (not v1, decided):** scraping/login delegado, marketplace de venda de milhas, busca/compra de passagens, programa de loyalty próprio, white-label total, social feed, multi-moeda, cobrança por CPF no VIP, concierge humano, WhatsApp Business alerts, Apple Wallet. See `FEATURES.md §Anti-Features`.

**Deferred:** OFX/CSV import, Belvo/Pluggy, recomendação de destino com preço real, view-only para cliente, painel de comissão, widget mobile home, alerta WhatsApp. See `FEATURES.md §Deferred` for re-eval triggers.

---

## 4. Architecture Must-Haves

### 4.1 Trust Kernel + RLS Rewrite (core of the cycle)

Existing RLS only checks `auth.uid() = user_id` — a free user with their JWT can `POST /rest/v1/travel_*` and bypass every paywall. Fix: **two `STABLE SECURITY DEFINER` functions** that all premium policies delegate to:

- `public.has_plan(uid, required_plan)` — true if user is on `required_plan` or higher (`vip > pro > free`)
- `public.can_access_account(viewer_uid, target_uid)` — multi-CPF aware; true if viewer is target OR is a VIP owner of target

Every `travel_*` and `vip_*` policy gets rewritten combining `auth.uid() = user_id`, `has_plan(...)`, and (where applicable) `can_access_account(...)`. Both `USING` AND `WITH CHECK` mandatory on UPDATE — `USING`-only lets downgraded users mutate fields. **Downgrade behavior chosen:** soft isolation. SELECT permitted on existing rows; INSERT/UPDATE require `has_plan('pro')`. See `ARCHITECTURE.md §3` for full SQL.

### 4.2 Webhook Idempotency (Asaas)

Single edge function (`asaas-webhook`, `verify_jwt = false`, HMAC signature-verified) writes to `webhook_events` table with `UNIQUE (provider, event_id)`. The unique constraint IS the idempotency mechanism — duplicate INSERT fails with `23505` → return 200 to Asaas. **Critical ordering:** mark-as-processed BEFORE non-idempotent side effects (email sends, PostHog events) — otherwise crash mid-handler replays them on retry. Asaas is source of truth; local `user_subscriptions` is read-replica + daily reconciliation cron. See `ARCHITECTURE.md §4` (note: written assuming Stripe; pattern transfers 1:1 to Asaas).

### 4.3 Multi-CPF via `managed_accounts` Ownership Graph

Pattern A chosen: every managed CPF IS an `auth.users` row, with `managed_accounts(owner_user_id, managed_user_id, ...)` ownership table. Headless users (no login) created via service-role from `create-managed-account` edge function with synthetic `headless-{uuid}@managed.milespro.invalid` emails. The `can_access_account()` kernel makes RLS multi-CPF-aware with one-line policy changes. CPF columns encrypted at rest via pgsodium. See `ARCHITECTURE.md §5`.

### 4.4 Secret Separation (kill SEC-03/SEC-04 footguns)

- DELETE `import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY` reference and `supabaseAdmin` export from `src/integrations/supabase/client.ts:7,22-29` — `VITE_*` ships to bundle.
- DELETE hardcoded JWT fallback at `vite.config.ts:14`.
- ADD Vite plugin `failOnSecretLeak()` that throws if any `VITE_.*(SERVICE_ROLE|SECRET_KEY|WEBHOOK_SECRET|PRIVATE_KEY)` is set at build time.
- ROTATE current service-role key (assume leaked).
- ADD CI grep guard: `grep -r 'service_role\|sk_' dist/` must return zero matches.

See `ARCHITECTURE.md §6` + `PITFALLS.md CRIT-02`.

### 4.5 Build Order (critical path)

`1 Plan enum consolidation → 2b Trust kernel → 3a RLS rewrite travel_*/vip_* → 4 Webhook infra → 5 Checkout UI`. Parallelizable: 2a Secret hygiene, 3b managed_accounts table (no UI yet), 7 Observability. See `ARCHITECTURE.md §Build Order`.

---

## 5. Critical Pitfalls — Wire Into Roadmap

| # | Pitfall | Sev | Phase | Why it kills the cycle |
|---|---|---|---|---|
| **CRIT-01** | Plan gating client-side only (already in code) | CRITICAL | **Phase 1 (Security)** | Free users get paid features via direct REST. Refund disputes + class-action exposure on CPF/financial data. |
| **CRIT-02** | Service-role key in client bundle (`VITE_*SERVICE_ROLE*` already in code) | CRITICAL | **Phase 1 (Security)** | Every visitor gets a key that bypasses RLS. Fold-the-company tier. |
| **CRIT-03** | Apple IAP rule 3.1.1 — direct gateway checkout in iOS = rejection | CRITICAL | **Phase 2 design / Phase 3 launch** | iOS app rejected. ~7-day re-submission cycle; multiple rejections flag account. |
| **CRIT-04** | Webhook handler without idempotency = double-billing | CRITICAL | **Phase 2 (Monetization)** | Duplicate emails, inflated metrics, race that flips canceled users back to active. |
| **CRIT-05** | LGPD 15-day DSR clock, no extension allowed | CRITICAL | **Phase 1/2 (Compliance)** | ANPD fine up to 2% of BR revenue or R$50M; reputational kill. |
| **HIGH-05** | Plan enum migration disasters (already manifest: 5 DB vs 3 TS) | HIGH | **Phase 1 (must precede PAY-*)** | Webhooks would overwrite collapsed values; mass churn before users notice. |
| **HIGH-02** | Asaas/Stripe BR — Pix 4h expiration, boleto next-business-day | HIGH | **Phase 2 (Monetization)** | "Paguei e nada aconteceu" support storm in week 1. |
| **HIGH-04** | RLS that *looks* secure but isn't (views without `security_invoker`, `USING` without `WITH CHECK`, JWT plan claims) | HIGH | **Phase 1 (Security)** | Silent leaks pass code review; need adversarial pgTAP/Vitest tests + Supabase advisors run pre-release. |

**Phase ownership:** Phase 1 owns CRIT-01, CRIT-02, HIGH-04, HIGH-05, MED-03/04/05/06. Phase 2 owns CRIT-04, HIGH-01/02/03/06, MED-01/02/08, plus design decision for CRIT-03. Phase 3 owns CRIT-03 implementation, HIGH-07, HIGH-08, MED-07, plus LAUNCH-* flag for CRIT-05.

---

## 6. Open Questions for the User

These need a human decision before the roadmapper can lock phase scope.

1. **Founding entity (PF / MEI / ME / LTDA?)** — Blocks Asaas onboarding, NFS-e strategy (MEI may be exempt below R$81K/yr), ISS rate. 30-min call with contador. Source: `STACK.md §Open Questions #1`.
2. **Final pricing** — Pro **R$19,90 vs R$29,90**. R$19,90 leaves ~R$30/mo margin at 10 users (break-even). R$29,90 more sustainable. VIP at R$49,90 is 40-60% of SisMilhas/GeMilhas. Source: `STACK.md` cost math.
3. **Trial vs freemium-only-to-Pro** — 7-day Pro trial WITH card-on-file (blocks abuse via HIGH-01) vs free-then-prompt. Source: `STACK.md §Open Questions #3` + `PITFALLS.md HIGH-01`.
4. **Annual plan?** — 17% discount (10 months for 12) reduces churn risk. `FEATURES.md` recommends yes.
5. **Supabase region** — Project `opusftqbbaozucmbuuug` in `sa-east-1` or `us-east-*`? If US, decide: migrate now OR document international transfer with SCC clauses. Source: `STACK.md §6` + `PITFALLS.md CRIT-05`.
6. **iOS strategy: Path A/B/C/D?** — Research strongly recommends **Path C (no IAP, no in-app pricing UI, web-only checkout under Multiplatform Services exemption)**. Confirm; shapes `Assinatura.tsx` iOS branch and App Review submission notes. Source: `STACK.md §Mobile/IAP` + `PITFALLS.md CRIT-03`.
7. **Sales channel for VIP** — Self-serve checkout on Asaas, OR WhatsApp link (`VITE_SALES_WHATSAPP`) for human-onboarded VIP at R$49-99/mo?
8. **Production domain** — Confirm `app.milespro.net.br` (or other?). Required for Resend domain verification, Asaas webhook URL, App Store listing, OAuth callbacks.
9. **DPO during cycle** — Founder names self as DPO with `dpo@milespro.net.br`? LGPD allows this for small operations.
10. **Capacitor target SDK / iOS minimum** — Confirm Android `targetSdk = 35` (Play Store 2026 requirement) and iOS deployment target. Source: `PITFALLS.md HIGH-07`.

---

## 7. Recommended Phase Ordering (high-level)

### Phase 1 — Security & Foundation Hardening
**Owns:** SEC-01 through SEC-06, plus enum consolidation and cleanup.
**Why first:** CRIT-01, CRIT-02, HIGH-04, HIGH-05 all already manifest in code. None can ship to a paying user. Trust kernel + RLS rewrite is the dependency for everything.
**Delivers:** Server-side plan gating that survives `curl` adversarial test; secret hygiene; consolidated `free|pro|vip` enum; trust kernel functions deployed; managed_accounts table created (no UI yet); critical-path test coverage on AuthProvider/PlanProtectedRoute/useSubscription/ErrorBoundary; cleanup.

### Phase 2 — Monetization & Compliance
**Owns:** PAY-01 through PAY-06, TEL-01 through TEL-03, LAUNCH-04, LAUNCH-05.
**Why second:** Trust kernel must exist before checkout UI. LGPD endpoints must exist before first paid signup. Telemetry must be real before pricing can be validated.
**Delivers:** Asaas integration (`create-checkout-session`, `asaas-webhook` with idempotency, `portal-session`); Free/Pro/VIP plans page with annual toggle; LGPD `/api/lgpd/export` + `/api/lgpd/delete` edge functions; consent banner wired to PostHog opt-in; Sentry client + edge with PII scrubbing; PostHog real integration with funnel events; admin MRR dashboard; landing page; privacy policy + ToS; iOS strategy locked.

### Phase 3 — Mobile Distribution & Launch
**Owns:** LAUNCH-01 through LAUNCH-03, LAUNCH-06, plus support/ops readiness.
**Why third:** Web-first to validate stack before adding mobile. iOS strategy designed in Phase 2 ships in Phase 3.
**Delivers:** Production web deploy on `app.milespro.net.br` (Vercel or Cloudflare Pages); `capacitor.config.ts` `server.url` repointed; iOS build with Multiplatform Services compliance + App Review submission notes; Android build with `targetSdk = 35`; Universal Links / App Links for OAuth callbacks; helpdesk; refund policy; status page; dispute defense templates; first-10-pagantes outreach runbook; **LAUNCH-06 marker.**

### Phase 4 (post-cycle) — Validation & Iteration
**Not in cycle scope per PROJECT.md.** Flag: scaling-limit work (MED-04 indexes), feature-flag strategy, deferred features (alerta WhatsApp, widget mobile, view-only para clientes), Stripe Tax / NFS-e re-eval when MRR > R$10K/mo.

---

## Confidence Assessment

| Area | Confidence | Notes / Gaps |
|---|---|---|
| **Stack additions** | HIGH on billing/errors/email; MEDIUM on analytics LGPD nuance and iOS regulation durability | Asaas event taxonomy needs hands-on verification |
| **Feature scope** | MEDIUM-HIGH | Competitor signal consistent; pricing benchmark partial; transfer-optimizer as killer feature is fundamented hypothesis, not validated |
| **Architecture** | HIGH | RLS + webhook + multi-CPF patterns well-documented; one note: webhook research drafted assuming Stripe — Asaas patterns transfer with field renames |
| **Pitfalls** | HIGH on Apple/Google/LGPD/payment specifics; MEDIUM on conversion/support pitfalls | Three critical pitfalls already manifest in code per `CONCERNS.md` |
| **Overall roadmap shape** | HIGH | Phase dependencies clean; critical path is 1→2→3 with parallelizable side-work |

---

*Synthesis complete: 2026-05-11. Ready for requirements gathering and roadmap planning.*
