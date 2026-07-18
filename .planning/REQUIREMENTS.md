# MilesPro Requirements

**Cycle:** "Pronto pra escala" — primeiros 10 pagantes recorrentes
**Source:** Sintetizado de `PROJECT.md` (Active list) + research em `.planning/research/SUMMARY.md`
**Last updated:** 2026-05-11

---

## V1 Requirements (este ciclo)

### Segurança & Foundation Hardening (`SEC-*`)

> Maior risco priorizado pelo PO. Tudo aqui é pré-requisito de qualquer cobrança.

- [ ] **SEC-01**: Plan gating server-side via RLS — usuário Free não consegue ler/escrever em colunas/tabelas pagas mesmo via REST direto. Adversarial test: `curl` autenticado como Free retorna 403 em endpoints Pro/VIP.
- [ ] **SEC-02**: Auditoria + reescrita de RLS em todas as tabelas `travel_*` e `vip_*` — toda policy combina `auth.uid() = user_id` com `has_plan(...)` e (onde aplicável) `can_access_account(...)`. Tanto `USING` quanto `WITH CHECK` em UPDATEs.
- [ ] **SEC-03**: Remover `import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY` e export `supabaseAdmin` de `src/integrations/supabase/client.ts:7,22-29`. Vite plugin `failOnSecretLeak()` falha o build se qualquer `VITE_*(SERVICE_ROLE|SECRET_KEY|WEBHOOK_SECRET|PRIVATE_KEY)` for setado. CI grep guard adicional em `dist/`. Rotação de service-role key (assumir leaked).
- [ ] **SEC-04**: Remover JWT anon hardcoded em `vite.config.ts:14`. Build deve falhar (não silenciosamente cair em fallback) se variável de ambiente estiver ausente.
- [ ] **SEC-05**: Consolidar enum `subscription_plan` (5 valores DB → 3 valores: `free|pro|vip`). Migration reverse-safe; backfill validado; collapse logic em `useSubscription.ts:242-245` deletado.
- [ ] **SEC-06**: Trust kernel deployado: funções `public.has_plan(uid, required_plan)` e `public.can_access_account(viewer_uid, target_uid)` (`STABLE SECURITY DEFINER`). Cobertura de testes adversariais (pgTAP ou Vitest contra Supabase local).
- [ ] **SEC-07**: Cobertura de testes em paths críticos hoje sem teste: `AuthProvider`, `PlanProtectedRoute`, `useSubscription`, `ErrorBoundary`, 14 hooks de travel, edge function `google-calendar-auth`. Meta: cada um com pelo menos happy-path + 1 caso adversarial.

### Monetização (`PAY-*`)

> Bloqueado por SEC-* (trust kernel) e por entidade jurídica PJ constituída.

- [~] **PAY-01**: Edge function `create-checkout-session` que cria cobrança/assinatura no Asaas e retorna URL de checkout (Pix + Cartão + Boleto). Pré-requisito: conta Asaas em CNPJ ativo. *(Plan 02-05 W2a — sandbox edge function shipped 2026-05-13; live cutover blocked on CNPJ + Asaas production keys, handled in plan 02-07 W3)*
- [x] **PAY-02**: Edge function `asaas-webhook` (`verify_jwt = false`, HMAC signature-verified) com idempotência via `webhook_events(provider TEXT, event_id TEXT) UNIQUE`. Mark-as-processed antes de side effects não-idempotentes. *(Plan 02-05 W2a — shipped 2026-05-13. Note: Asaas uses static `asaas-access-token` header, not HMAC of body; constant-time compare. CRIT-04 contract verified in code via index.test.ts + empirical runtime smoke deferred to 02-05-CRIT-04-SMOKE-RUNBOOK.md post-deploy)*
- [x] **PAY-03**: Sincronização `subscription_plan` no DB a partir do Asaas. Asaas é source-of-truth; tabela `user_subscriptions` é read-replica. Cron de reconciliação diária pra detectar drift. *(Plan 02-05 W2a — asaas-webhook state machine + reconcile-asaas-subscriptions cron @ 03:00 UTC shipped 2026-05-13; subscription_status enum, 5 new columns on user_subscriptions, drift threshold 5%)*
- [x] **PAY-04**: Tela `/planos` com toggle mensal/anual, comparativo Free vs Pro vs VIP, CTA de upgrade que abre `create-checkout-session`. Web only — iOS NÃO mostra essa tela (Path C). *(Plan 02-06 W2b — Assinatura.tsx handlePlanCta rewrite + Index.tsx PricingSection invoke create-checkout-session; iOS Path C hide via useIsIOSCapacitor() in Assinatura.tsx (full-page) + Index.tsx (PricingSection skipped) + AnimatedSections.tsx (PricingSection returns null). useTelemetry.trackStartedCheckout fires BEFORE the redirect. subscription_leads remains as shadow log on Asaas failure (D-11). VITE_SALES_WHATSAPP + wa.me deleted from codebase (D-15))*
- [ ] **PAY-05**: Portal de gerenciamento de assinatura — link pra portal Asaas (cancelar, atualizar cartão, ver fatura, pagar Pix em aberto). Self-serve.
- [x] **PAY-06**: Trial 7 dias do Pro com cartão on file. Cobrança automática se não cancelar. Período de graça 3-7 dias em falha de pagamento (estado `past_due` mantém acesso, daí downgrade soft). *(Plan 02-05 W2a — design + scaffold shipped 2026-05-13: create-checkout-session computes nextDueDate = today + 7d (D-03); asaas-webhook PAYMENT_OVERDUE handler sets grace_period_ends_at = now() + 7d (D-04); state machine has trial → active → past_due transitions wired)*
- [x] **PAY-07**: Suporte a planos anuais (~17% desconto vs mensal × 12). Pro mensal + Pro anual + VIP mensal + VIP anual = 4 produtos no Asaas. *(Plan 02-05 W2a — D-02 expanded to 3 cycles × 2 plans = 6 products: PRICE_TABLE in create-checkout-session/index.ts has pro {monthly 37.90, semiannual 203.46, annual 363.84} + vip {monthly 67.90, semiannual 365.10, annual 652.32}; CYCLE_MAP wires to Asaas MONTHLY/SEMIANNUALLY/YEARLY)*
- [ ] **PAY-08**: NFS-e emitida automaticamente via Asaas para cada cobrança paga (usar bundle Asaas; não integrar eNotas no v1).

### Tier Differentiation (`TIER-*`)

> Matriz de features baseada no `FEATURES.md`. Implementação depende de SEC-* (gating server-side).

- [x] **TIER-01**: Free limitado a 3 programas / 5 contas; bloqueio gracioso ao tentar adicionar mais (modal "upgrade pra Pro"). Limites checados server-side via RLS. *(Plan 02-06 W2b — migration 20260515120001_tier_rls_free_limits.sql replaces user_programs INSERT policy with WITH CHECK (auth.uid()=user_id AND (has_plan('pro') OR COUNT(*)<3)) and same shape for program_accounts (<5). useSubscription PLAN_DEFAULTS.free bumped maxPrograms 1→3 + maxAccounts:5; SubscriptionLimits interface extended. RLS = source of truth)*
- [x] **TIER-02**: Free mantém alerta in-app de vencimento >30d (NÃO paywall — anti-pattern de produto). Pro adiciona push + email + antecipação configurável (60/90/180d). *(Plan 02-06 W2b — migration 20260515120002 creates user_settings skeleton + alert_antecipation_days column with CHECK (IN (30,60,90,180)); INSERT and UPDATE policies require has_plan('pro') for any value > 30; default 30 stays open to all)*
- [x] **TIER-03**: Killer feature Pro: alerta de promoção de transferência personalizado (Livelo→Smiles bonus tied to user's actual balance) + Transfer Optimizer. *(Plan 02-06 W2b — migration 20260515120003 creates user_promo_alerts table + partial index + Pro+ RLS gate; compute-personalized-promos edge function (Bearer auth, pure matchPromosForUser exported for tests, 5 Deno tests); fetch-promotions extended with ?personalized=true branch; pg_cron @ 02:00 UTC; src/pages/Promocoes.tsx renders alerts with useTelemetry.trackPromotionAlertShown/Clicked; Free redirected to /assinatura. v1 ships skeleton — balance_in_from = null until operations rollup lands post-v1)*
- [x] **TIER-04**: Pro libera: cadastro ilimitado, histórico de movimentação, cartões + clubes, sugestão automática de uso, gráfico evolução 12m, comparador venda vs resgate, PDF detalhado + Excel/CSV + email mensal, 2FA TOTP. *(Plan 02-06 W2b — useSubscription PRO_FEATURES (Phase 1) covers historical features; the Free RLS limits in 20260515120001 are the gate side. 2FA TOTP deferred to backlog v2)*
- [x] **TIER-05**: VIP libera multi-CPF ilimitado (sem upcharge por CPF), switcher de conta, visão consolidada, tags + notas por cliente, relatório consolidado familiar, relatório fiscal, área de afiliados (cupom MVP). *(Plan 02-06 W2b — create-managed-account edge function: JWT auth + has_plan('vip') rpc check + zod {label, cpf 11 digits, full_name} + profile CPF uniqueness check + auth.admin.createUser with headless-<uuid>@managed.milespro.invalid + managed_accounts INSERT + auto-cleanup on link failure. 4 Deno tests. v1: VIP cap 5 perfis per CLAUDE.md / D-12 (not unlimited — re-evaluate post-launch))*
- [x] **TIER-06**: Tabela `managed_accounts(owner_user_id, managed_user_id, label, ...)` criada com RLS multi-CPF-aware. Edge function `create-managed-account` cria headless `auth.users` row via service-role com email sintético `headless-{uuid}@managed.milespro.invalid`. CPF encrypted at rest via pgsodium. *(Plan 02-06 W2b — table + RLS shipped in Phase 1 (20260512120004); this plan adds ManagedAccountProvider (activeUserId + switchTo + managedAccounts + isOwnAccount), ManagedAccountSwitcher (shadcn DropdownMenu, VIP-only), CreateManagedAccountDialog (shadcn Dialog with CPF mask), App.tsx mount. vip.adversarial.test.ts proves RLS rejects Free/Pro INSERT + cross-owner VIP INSERT. CPF pgsodium encryption deferred — current profiles.cpf is plaintext per Phase 1 schema; partial UNIQUE index from W2a is the dedupe guard)*

### Telemetria & Observability (`TEL-*`)

> Bloqueia validação do ciclo (sem dados, não sabe se chegou nos 10 pagantes ou se o produto resolve dor).

- [x] **TEL-01**: PostHog Cloud EU integrado de verdade (não mais mock). Eventos de funil: `signup`, `first_balance_added`, `viewed_pricing`, `started_checkout`, `paid_first_invoice`, `cancelled`. Só roda após COMPL-03 opt-in. *(plan 02-03: src/lib/posthog.ts rewrite com posthog-js — host eu.i.posthog.com, person_profiles='identified_only', property_denylist=['cpf','email','phone','$ip'], autocapture=false, disable_session_recording=true, opt_out_capturing_by_default=true + ph.opt_out_capturing() em loaded; ConsentWatcher.tsx faz bridge useConsent().analyticsOptedIn → enableAnalytics()/disableAnalytics(); useTelemetry hook expõe 12 helpers tipados — trackSignup, trackFirstBalanceAdded, trackViewedPricing, trackStartedCheckout, trackPaidFirstInvoice, trackRenewed, trackCancelled + D-13 trackPromotionAlertShown/Clicked + trackConsentGiven + trackLgpdExportRequested/DeleteRequested; Gate G-HIGH-03 verificado por inspeção de código — smoke live deferred para deploy-time com VITE_POSTHOG_KEY setado)*
- [x] **TEL-02**: Dashboard interno em `/admin/metrics` (visível só pra DPO/founder) com MRR, conversão free→pago, conversão de trial, retenção D7/D30, churn mensal. *(plan 02-03: supabase/functions/mrr-dashboard rewrite usando Asaas como SoT (D-08/D-14) — paginated /v3/subscriptions?status=ACTIVE, MRR = sum(value/cycle_months), CYCLE_MONTHS WEEKLY..YEARLY, classifica Pro vs VIP via externalReference → user_subscriptions.plan lookup; auth gate Bearer JWT + admin gate profiles.is_admin = true (403 caso contrário, defense in depth com client check em AdminMetrics.tsx); graceful degrade ASAAS_API_KEY unset → mrr_total=0; migration 20260513120004_add_is_admin_to_profiles.sql adiciona BOOLEAN NOT NULL DEFAULT false + partial index; 8 Deno tests cobrindo MRR math; conversão funnel/retenção deferred para PostHog cohort dashboards backlog v2)*
- [x] **TEL-03**: Sentry integrado em client (`@sentry/react`) + Capacitor (`@sentry/capacitor` v4) + edge functions (Sentry Deno). PII scrubbing obrigatório (CPF, email, balances). *(plan 02-03: src/lib/sentry.ts — @sentry/react com browserTracingIntegration, tracesSampleRate=0.1, sendDefaultPii=false, replayIntegration NOT enabled; beforeSend roda scrubPII em event.message (CPF 3 patterns + email) + event.request.url (?cpf= + ?email= query strings) + event.breadcrumbs[].message + event.user (delete email + username, mantém id); beforeBreadcrumb dropa console.log breadcrumbs (T-2-18 mitigation); 6 Vitest cases provam regexes; initSentry() roda unconditional em main.tsx (LGPD Art. 7 IX legitimate interest). Capacitor Sentry SDK deferred para Phase 3; Deno edge fn Sentry deferred para backlog v2 — current lgpd-* edge fns usam globalThis.Sentry stub do 02-02)*

### Compliance / LGPD (`COMPL-*`)

> Bloqueia primeiro pagante. ANPD fine de até 2% da receita BR ou R$50M.

- [x] **COMPL-01**: Edge function `lgpd-export` que devolve dados pessoais do usuário em JSON dentro do prazo legal de 15 dias (idealmente sob demanda imediata via dashboard). *(plan 02-02: lgpd-export edge function returns JSON bundle (profile + subscription + operations + user_programs + 9 travel_* tables + user_consents) with <5s response target, rate-limited 1/hr/user via lgpd_export_log table → HTTP 429 with retry_after_seconds on duplicate within window; 4 Deno tests; ready for Lovable Cloud deploy)*
- [x] **COMPL-02**: Edge function `lgpd-delete` que executa exclusão completa (incluindo backups lógicos, registros em managed_accounts, webhook_events relacionados) com confirmação por email e janela de cancelamento de 7 dias. *(plan 02-02: lgpd-delete edge function with ?action=request|confirm; HMAC-signed token bound to user.id (24h TTL) emailed via Resend; soft-delete columns on profiles + deletion_audit table; lgpd-delete-cleanup edge function invoked daily via pg_cron @ 04:00 UTC purges auth.users + cascade after 7d window; 5 Deno tests for HMAC roundtrip + 401 + cross-user rejection; ready for Lovable Cloud deploy with LGPD_DELETE_TOKEN_SECRET + LGPD_CLEANUP_AUTH_TOKEN provisioning)*
- [x] **COMPL-03**: Banner de consentimento de cookies/analytics com opt-in granular (essential sempre on; analytics requer aceite explícito). PostHog só inicializa após consent. *(plan 02-02: user_consents table (append-only RLS — no UPDATE/DELETE policies); useConsent hook with CURRENT_CONSENT_VERSION='2026-05-12'; ConsentBanner with 4 separate Checkbox/Label pairs (Termos + Privacidade required; Analytics + Marketing optional, default OFF — LGPD Art. 8 §4 anti-dark-pattern); App.tsx mount; PostHog opt-in actual wiring handed off to plan 02-03 via useConsent().analyticsOptedIn contract)*
- [x] **COMPL-04**: Política de privacidade publicada em `/privacidade` listando: dados coletados, finalidade, base legal, sub-processadores (Supabase US/SA, Asaas BR, PostHog EU, Sentry, Resend), prazo de retenção, contato DPO. *(plan 02-02: Privacidade.tsx rewrite — §2 dados de pagamento Asaas (PCI DSS BR), §5 7 sub-processadores (Lovable Cloud us-east-1, Asaas, PostHog Cloud EU, Sentry com PII scrub, Resend, Crisp EU, Google Calendar opt-in), §7 DSR + 1/hr rate limit, §8 4-step deletion flow + 7d window, §9 LGPD Art. 8 §4 granular consent, §10 SCC clause "Cláusulas Contratuais Padrão" for BR→US, §12 + §13 dpo@milespro.net.br with URGENTE flag; LAST_UPDATED 13/05/2026)*
- [x] **COMPL-05**: Termos de uso publicados em `/termos` com cláusulas de assinatura, cancelamento, refund, e disclaimers sobre informações de programas de fidelidade. *(plan 02-01: §4 assinatura (Pro/VIP) + trial 7d cartão-on-file, §5 cancelamento, §4 refund garantia incondicional 7 dias, §9 disclaimers, §10 LGPD link, §13 contato suporte@ + dpo@)*
- [x] **COMPL-06**: DPO designado (founder) com email `dpo@milespro.net.br` provisionado e visível em privacy policy + footer + página de contato. *(plan 02-01 Termos.tsx §13 contato + plan 02-02 Privacidade.tsx §7 + §8 + §12 + §13 — 4 mailto:dpo@milespro.net.br instances; lgpd-delete email body references dpo@ for cancellation; LgpdConfirmDelete page error state surfaces dpo@; SLA 15 dias úteis declared per LGPD Art. 18 §1)*

### Mobile Distribution (`MOBILE-*`)

> Path C (sem IAP) escolhido. Bloqueia LAUNCH-02/03.

- [ ] **MOBILE-01**: iOS build seguindo Path C — código condicionalmente esconde rotas `/planos`, `/checkout`, e qualquer menção de pricing dentro do app. Apenas sign-in + free-tier UI. Substituir botões "Upgrade" por "Gerencie sua assinatura em milespro.net.br" sem link clicável (evitar 4.10/3.1.3 issues).
- [ ] **MOBILE-02**: Android build com `targetSdk = 35` (requisito Play Store 2026), `minSdk` revisado, ícones e splash screen atualizados.
- [ ] **MOBILE-03**: Universal Links (iOS) + App Links (Android) configurados pra: callbacks de OAuth, deep linking de email transacional, retorno de checkout web pro app.
- [ ] **MOBILE-04**: Push notifications configuradas (iOS APNs + Android FCM via Capacitor). Feature de Pro/VIP. Permissão solicitada contextualmente, não no signup.
- [ ] **MOBILE-05**: Notes de submissão pra App Review explicando exemption Multiplatform Services 3.1.3(b), demo de fluxo (sign-in + free-tier), credenciais de teste, e link pra checkout web.

### Launch & Aquisição (`LAUNCH-*`)

> Marco final do ciclo: 10 pagantes recorrentes.

- [ ] **LAUNCH-01**: Build de produção web em `app.milespro.net.br` (Vercel ou Cloudflare Pages — escolher na phase). HTTPS, redirects, sitemap, robots.txt.
- [ ] **LAUNCH-02**: Build iOS submetido à App Store e aprovado.
- [ ] **LAUNCH-03**: Build Android submetido à Play Store e aprovado.
- [x] **LAUNCH-04**: Página de marketing (landing) com proposta de valor, comparativo de planos, social proof (mesmo que mínimo), e CTA pra signup → checkout web. *(Plans 02-01 + 02-04 W1c (copy refresh, Mais escolhido badge, annual default, 7-day guarantee link, Pix/boleto delay) + Plan 02-06 W2b (CTA wired to create-checkout-session; multi-CPF FAQ entry added; iOS Path C hide via useIsIOSCapacitor() so the iOS bundle ships zero pricing strings))*
- [ ] **LAUNCH-05**: Helpdesk operacional (Crisp/Front + WhatsApp Business) com SLA mínimo, política de reembolso publicada, templates de defesa contra dispute (chargeback) prontos.
- [ ] **LAUNCH-06**: Primeiros 10 usuários pagantes recorrentes (mensal ou anual). Marco de fechamento do ciclo. Validação de willingness-to-pay.

---

## V2 / Deferred Requirements

> Fora do ciclo "10 pagantes". Re-avaliar após validação.

### Features deferidas (do FEATURES.md)
- Importação OFX/CSV de extratos de cartão
- Integração Belvo/Pluggy (open banking BR) pra pulling automático de saldos
- Recomendação de destino com preço real (vs apenas "vale a pena")
- View-only para clientes do consultor (acesso pelo cliente final ao próprio saldo dentro do MilesPro)
- Painel de comissão completo de afiliados (v1 entrega cupom MVP)
- Widget mobile home (iOS/Android nativo)
- Alerta WhatsApp Business (vs apenas push + email)
- Suporte a programas além dos 4 core (LATAM Pass, Iberia Plus, etc) — adicionar conforme demanda

### Infra/Compliance v2
- eNotas como provider dedicado de NFS-e (substitui bundle Asaas) quando MRR > R$10K/mo
- Stripe Tax / sales tax automation
- CMP de terceiros (OneTrust/Cookiebot) quando time crescer
- SOC 2 Type 1 / ISO 27001 (necessário pra B2B / enterprise)

### Tier features v2
- 2FA TOTP estendido pra todos os tiers
- API pública (developer access) pra power users
- Webhooks pro consultor receber eventos de cliente managed

---

## Out of Scope (decisões explícitas — não re-adicionar sem reabrir discussão)

- **Troca de stack** — Decidido manter Supabase + React + shadcn + Capacitor. Mudar agora multiplicaria custo sem ganho de valor pro ciclo.
- **Stripe BR (e MercadoPago, Pagar.me)** — Decidido usar Asaas. Stripe BR ainda imaturo em Pix Automático; MercadoPago/Pagar.me não bundleam NFS-e.
- **iOS IAP nativo (Path A)** — Decidido Path C. Apple cobra 15-30%; complexidade técnica significativa via RevenueCat; revisitar em 6-12mo se exemption for revogada.
- **Apple External Link Entitlement (Path B)** — Mais paperwork, ainda paga Apple fee de 27% em 1ª parte das vendas. Path C é dominante economicamente.
- **Marketplace de viagens (busca/compra de passagens)** — Fora do core value. MilesPro é gestão de milhas, não comparador de preços.
- **Programa de loyalty próprio do MilesPro** — Não somos um programa de fidelidade; somos meta-camada sobre os existentes.
- **White-label / multi-tenant para empresas** — Foco é PF + consultor individual. Empresas viraria pivô de modelo.
- **Importação automática via scraping dos programas** — Risco legal e técnico alto (programas não tem API pública estável). Entrada manual + integrações oficiais quando existirem.
- **Sistema próprio de transações financeiras** — Toda cobrança via Asaas. MilesPro não custodia dinheiro.
- **Versão desktop nativa (Electron etc)** — Web responsivo + mobile nativo atende.
- **Features de "social"** (compartilhar viagens, feed) — Diluiria foco em utilidade individual.
- **Suporte a moedas que não BRL/USD** — Mercado-alvo BR.
- **Multi-CPF / afiliados em tier Free ou Pro** — Decidido: exclusivos VIP no v1.
- **Concierge humano para VIP** — Self-serve mantém margem; revisitar se conversão VIP for muito baixa.
- **WhatsApp humano pra vendas VIP** — Self-serve via Asaas no v1.
- **Mock de PostHog** (status atual) — Será substituído por integração real (TEL-01).
- **3 lockfiles commitados** (bun + pnpm + npm) — Cleanup: manter só `package-lock.json` (CI usa npm) na phase de seguraana / setup.

---

## Traceability

> Preenchido pelo `gsd-roadmapper` em 2026-05-11. 41 requirements mapeados, 100% de cobertura, zero órfãos.

| REQ-ID | Phase |
|---|---|
| SEC-01 | Phase 1 — Security & Foundation Hardening |
| SEC-02 | Phase 1 — Security & Foundation Hardening |
| SEC-03 | Phase 1 — Security & Foundation Hardening |
| SEC-04 | Phase 1 — Security & Foundation Hardening |
| SEC-05 | Phase 1 — Security & Foundation Hardening |
| SEC-06 | Phase 1 — Security & Foundation Hardening |
| SEC-07 | Phase 1 — Security & Foundation Hardening |
| PAY-01 | Phase 2 — Monetização, Compliance & Telemetria |
| PAY-02 | Phase 2 — Monetização, Compliance & Telemetria |
| PAY-03 | Phase 2 — Monetização, Compliance & Telemetria |
| PAY-04 | Phase 2 — Monetização, Compliance & Telemetria |
| PAY-05 | Phase 2 — Monetização, Compliance & Telemetria |
| PAY-06 | Phase 2 — Monetização, Compliance & Telemetria |
| PAY-07 | Phase 2 — Monetização, Compliance & Telemetria |
| PAY-08 | Phase 2 — Monetização, Compliance & Telemetria |
| TIER-01 | Phase 2 — Monetização, Compliance & Telemetria |
| TIER-02 | Phase 2 — Monetização, Compliance & Telemetria |
| TIER-03 | Phase 2 — Monetização, Compliance & Telemetria |
| TIER-04 | Phase 2 — Monetização, Compliance & Telemetria |
| TIER-05 | Phase 2 — Monetização, Compliance & Telemetria |
| TIER-06 | Phase 2 — Monetização, Compliance & Telemetria |
| TEL-01 | Phase 2 — Monetização, Compliance & Telemetria |
| TEL-02 | Phase 2 — Monetização, Compliance & Telemetria |
| TEL-03 | Phase 2 — Monetização, Compliance & Telemetria |
| COMPL-01 | Phase 2 — Monetização, Compliance & Telemetria |
| COMPL-02 | Phase 2 — Monetização, Compliance & Telemetria |
| COMPL-03 | Phase 2 — Monetização, Compliance & Telemetria |
| COMPL-04 | Phase 2 — Monetização, Compliance & Telemetria |
| COMPL-05 | Phase 2 — Monetização, Compliance & Telemetria |
| COMPL-06 | Phase 2 — Monetização, Compliance & Telemetria |
| LAUNCH-01 | Phase 2 — Monetização, Compliance & Telemetria |
| LAUNCH-04 | Phase 2 — Monetização, Compliance & Telemetria |
| LAUNCH-05 | Phase 2 — Monetização, Compliance & Telemetria |
| MOBILE-01 | Phase 3 — Mobile Distribution & Launch |
| MOBILE-02 | Phase 3 — Mobile Distribution & Launch |
| MOBILE-03 | Phase 3 — Mobile Distribution & Launch |
| MOBILE-04 | Phase 3 — Mobile Distribution & Launch |
| MOBILE-05 | Phase 3 — Mobile Distribution & Launch |
| LAUNCH-02 | Phase 3 — Mobile Distribution & Launch |
| LAUNCH-03 | Phase 3 — Mobile Distribution & Launch |
| LAUNCH-06 | Phase 3 — Mobile Distribution & Launch |

**Coverage summary:**
- Phase 1: 7 reqs (SEC-01..SEC-07)
- Phase 2: 26 reqs (PAY-01..PAY-08, TIER-01..TIER-06, TEL-01..TEL-03, COMPL-01..COMPL-06, LAUNCH-01, LAUNCH-04, LAUNCH-05)
- Phase 3: 8 reqs (MOBILE-01..MOBILE-05, LAUNCH-02, LAUNCH-03, LAUNCH-06)
- **Total: 41 / 41 mapped, 0 duplicates, 0 orphans**

---

## Acceptance Criteria — Cycle Completion

Considera-se este ciclo completo quando **todos** os critérios abaixo estão verdes:

1. ✅ Todos os requirements `SEC-*`, `PAY-*`, `TIER-*`, `TEL-*`, `COMPL-*`, `MOBILE-*`, `LAUNCH-*` marcados como Done
2. ✅ Adversarial test de RLS passando (Free user não consegue acessar travel_*/vip_* via curl direto)
3. ✅ App iOS aprovado na App Store
4. ✅ App Android aprovado na Play Store
5. ✅ Web deployed em `app.milespro.net.br` com HTTPS
6. ✅ 10 cobranças PAGAS (não em trial; primeira fatura quitada) registradas via Asaas
7. ✅ Zero CRITICAL findings em `.planning/research/PITFALLS.md` em estado "open"
8. ✅ LGPD: política de privacidade + termos publicados, DSR endpoints (export/delete) testados end-to-end com 1 usuário interno

Daí o ciclo fecha. Próximo ciclo (post-MVP) usa sinal real dos 10 pagantes pra priorizar.
