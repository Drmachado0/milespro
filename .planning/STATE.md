---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: technical_100_percent_done_pending_cnpj_for_w3_cutover
stopped_at: "Phase 3 Wave 2 fully done in code (03-04a + 03-04b deployed; 03-05 code complete + 9 atomic commits + worktree merged to main). Plan 03-05 (client push integration) shipped: (1) src/lib/pushHandler.ts — Capacitor PushNotifications chokepoint with 3 listeners (registration/received/actionPerformed), web no-op via Capacitor.isNativePlatform(), 7 vitest cases; (2) src/hooks/usePushPermission.ts — D-T07 contextual gate (userProgramsCount ≥ 1 AND !pushPrePromptSeenAt AND permission==='prompt'), 6 vitest cases; (3) src/components/push/PushPermissionPrompt.tsx — shadcn Dialog with D-T07 verbatim pt-BR copy ('Avisamos quando suas milhas estiverem perto de vencer ou quando aparecer uma promo de transferência'); (4) src/hooks/useTelemetry.ts — +5 push lifecycle helpers (trackPushPromptShown / PermissionGranted / PermissionDenied / Received / Opened); (5) src/components/ProtectedProviders.tsx — mounts handler + prompt inside auth tree (NOT App.tsx root, per truth #6); (6) src/contexts/AuthProvider.tsx — SIGNED_OUT branch best-effort invokes cleanup-push-subscriptions (mode=signed_out, Q2 RESOLVED), 3 new tests; (7) migration 20260516120000_user_settings_push_pre_prompt.sql — adds user_settings.push_pre_prompt_seen_at TIMESTAMPTZ NULL (renamed from planned 20260514120003 to avoid Phase 2 W2a collision — Rule-1 deviation, same pattern as 03-04b). 137/137 unit tests PASS (+16 delta: +7 pushHandler, +6 usePushPermission, +3 AuthProvider); typecheck + lint clean (3 pre-existing warnings unrelated). push.adversarial.test.ts NOT re-created — already shipped by 03-04b with 6/6 scenarios satisfying must_have. [BLOCKING] migration apply pending: founder runs 'Aplicar a migration 20260516120000_user_settings_push_pre_prompt.sql em produção' + 'Regenerar tipos do Supabase' in Lovable Cloud chat (entry appended to 03-04b-LOVABLE-CLOUD-DEPLOY-RUNBOOK.md §Plan 03-05 Migration Apply). After apply, types.ts gains user_settings.push_pre_prompt_seen_at and the `as unknown as UserSettingsPushSlice` cast in usePushPermission.ts can be removed (deferred to next plan touching that file, same convention as AdminMetrics.tsx is_admin from Plan 02-03). Phase 3 plans remaining: 03-03 (deep links, blocked on Apple Team ID via 03-00), 03-06 (Android submission), 03-07 (iOS submission), 03-08 (helpdesk + outreach + LAUNCH-06 closeout) — all 4 gated on 03-00 founder action (Apple Developer 3-7d + Play Console ~24h + Firebase ~10min). PRIOR: 03-02 done, 03-04a + 03-04b deployed; Phase 1 done; Phase 2 5/7+1 partial (CNPJ-blocked)."
last_updated: "2026-05-16T12:30:00.000Z"
last_activity: 2026-05-16 -- Plan 02-07 (W3 cutover) code+runbooks complete: invoice.enabled flag flipped in create-checkout-session (NFS-e auto-issuance gated by ASAAS_ENV=production), PAY-05 "Gerenciar assinatura" panel added on Assinatura.tsx (Asaas customer-area portal link), .env.example doc cleanup, 02-07-CUTOVER-RUNBOOK.md (352 lines, full operator runbook with rollback + smoke-each-Bearer-secret pattern from 03-04b D-DEPLOY-2 lesson), 02-07-NFSE-MUNICIPAL-SETUP.md (208 lines, contador conversation guide + Asaas municipalSettings API template). 4 atomic commits + SUMMARY.md. 137/137 unit tests PASS; typecheck + lint clean (3 pre-existing warnings). 3 tasks deferred to CNPJ unblock (Asaas onboarding + NFS-e municipal config + production smoke/refund roundtrip). TECHNICAL 100% DONE.
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 23
  completed_plans: 17
  partial_plans: 0
  percent: 74
  technical_100_percent_done: true
  remaining_blockers:
    - "CNPJ constitution (founder business action, in progress with accountant)"
    - "Founder runs 02-07-CUTOVER-RUNBOOK.md after CNPJ + Asaas approval (~30min operational)"
    - "Founder runs 02-07-NFSE-MUNICIPAL-SETUP.md with contador (~1h conversation)"
    - "Acquisition strategy for first 10 paying users (non-code, founder action)"
  defered_by_founder:
    - "Phase 3 mobile distribution (03-03/06/07/08) — web-first revenue strategy chosen 2026-05-16"
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-11)

**Core value:** Tirar o usuário da planilha e dos apps espalhados — visão única e confiável das milhas/pontos com decisões claras sobre quando e como usar.
**Current focus:** Phase 03 — mobile-distribution-launch

## Current Position

**TECHNICAL 100% DONE.** Only CNPJ + founder runbook execution + acquisition strategy stand between current state and first paying customer. Code-wise, the project is finished pending only the deferred mobile plans (03-03/06/07/08, founder strategic call — post-launch).

Phase: 03 (mobile-distribution-launch) — Wave 2 FULLY DONE; Wave 3 mobile defered (founder strategic decision 2026-05-16: web-first revenue, mobile depois)
Plan: 16/23 plans done. Remaining 7 plans split into: (a) 4 mobile plans (03-03/06/07/08) all gated on 03-00 founder action — DEFERRED by founder strategic call; (b) 3 Phase 2 plans actually deployed and verified (W1a/W1b/W1c/W2a/W2b live in prod — STATE was conservative; verified 2026-05-16 via curl + SQL); (c) W3 cutover 02-07 — CNPJ-blocked.

What's live in production (verified 2026-05-16):
- `app.milespro.net.br` (Vercel deploy + Crisp widget injected)
- `milespro.net.br` + `www.milespro.net.br` → 301 redirect → `app.` (Cloudflare CNAME flattening + Redirect Rule covering both hostnames; 4/4 validation scenarios PASS preserving path+query)
- 13 edge fns deployed: send-client-email, lgpd-export/delete/cleanup, mrr-dashboard, create-checkout-session, asaas-webhook, reconcile-asaas-subscriptions, create-managed-account, compute-personalized-promos, fetch-promotions, enqueue-push, send-push-notification, cleanup-push-subscriptions, send-vencimento-alert, google-calendar-auth
- 4 cron jobs active: fetch-promotions-hourly, cleanup-old-promotions-daily, asaas-reconcile-nightly (jobid=5), compute-personalized-promos-nightly (jobid=6), cleanup-push-subscriptions-weekly (jobid=7), send-vencimento-alert-daily (jobid=8), lgpd-delete-cleanup-daily
- All Phase 2 + Phase 3 W2 schema migrations applied (user_consents, deletion_audit, profiles soft-delete + is_admin + asaas_customer_id, webhook_events, managed_accounts, user_promo_alerts, user_settings.alert_antecipation_days + push_pre_prompt_seen_at, push_subscriptions)
- Vercel env vars: VITE_CRISP_WEBSITE_ID confirmed (Crisp injected in HTML); VITE_POSTHOG_KEY + VITE_SENTRY_DSN status not directly verified but init is consent-gated so no public proof either way

What's NOT live yet:
- 02-07 W3 production cutover (Asaas live keys + NFS-e + portal cliente) — CNPJ-blocked
- 4 mobile plans 03-03/06/07/08 — defered by founder (web-first strategy)

Last activity: 2026-05-16 -- Production discovery via curl/SQL probes + Cloudflare apex/www fix (CNAME flattening + Redirect Rule; 4/4 scenarios PASS); STATE.md realigned with actual prod state

Progress: [██████████] 95% of technical work done (excluding deferred mobile + W3 cutover gated externally)

## Performance Metrics

**Velocity:**

- Total plans completed: 13 + 1 code-partial (Phase 1: 6, Phase 2: 5 done + 1 code-partial, Phase 3: 4 done — 03-00 scaffold, 03-01, 03-02, 03-04a, 03-04b)
- Average duration: ~50min per plan (Phase 2 ~52min/plan; Phase 3 03-04b ~13min via worktree subagent — fastest yet)
- Total execution time: in progress

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Security & Foundation | 6/6 | done | — |
| 2. Monetização + Compliance + Telemetria | 5/7 + 1 code-partial | ~310min | ~52min |
| 3. Mobile Distribution & Launch | 4/10 + 1 scaffold-partial | ~108min | ~27min |

**Recent Trend:** Plan 03-04b code-only execution completed via worktree subagent in 13min (fastest yet — clean fast-forward merge, 11 atomic commits). 3 documented deviations: 2× Rule-1 (migration timestamps renamed 20260514120002/04 → 20260515120006/07 to avoid Phase 2 W2a collision; verify gate string-match split-tolerance) + 1× Rule-2 critical (added SELECT user_id BEFORE UPDATE in handlePaymentOverdue/handleRefund/handleSubscriptionCanceled so fan-outs to cleanup-push-subscriptions have the correct user_id — CRIT-04 idempotency preserved). 22 new Deno tests written (6 enqueue + 4 send + 5 cleanup + 7 vencimento). 121 unit tests PASS; typecheck + lint clean. Integration tests for push.adversarial require `supabase start` local — same pattern as vip/travel adversarial suites; CI validates. Closure flags hit: ROADMAP SC#4 (vencimento cron) + Q2 RESOLVED (signed_out mode) + Q4 RESOLVED (multi-device group_key) + D-T06 #1 + D-T06 #2. Plan 03-05 (client push integration) cannot start until founder completes 03-04a + 03-04b Lovable Cloud deploys.

*Updated after each plan completion.*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table. Recent strategic decisions affecting the cycle:

- **Gateway = Asaas** (not Stripe BR) — BR-native fees, NFS-e bundled, Pix Automático maduro
- **iOS Path C** — no IAP, no in-app pricing UI; checkout web-only via Multiplatform Services exemption (3.1.3b)
- **Trial 7 dias Pro com cartão on file** — better conversion + blocks multi-account abuse
- **Entidade jurídica = PJ (ME / LTDA / SLU)** — prerequisite for live PAY-* cutover in Phase 2
- **Phase count = 3 (coarse)** — honoring research recommendation; LGPD endpoints must ship together with checkout, so Monetization + Compliance cannot be split
- **3-tier canonical names = Free / Pro / VIP** — landing copy now reflects this (plan 02-01 W0). Legacy "Plus" tier-label gone from `/` route, comparisonFeatures and pricing copy. Multi-CPF is VIP-exclusive.
- **FORBIDDEN_VITE_PATTERNS extension pattern** — for any new payment gateway add 3 regexes (SECRET / WEBHOOK / API_KEY) with explicit CONTEXT D-XX comment. Applied to Asaas in plan 02-01; pattern reusable for future Stripe / MercadoPago / banking integration.
- **CURRENT_CONSENT_VERSION bump rule (Plan 02-02)** — any material change to Termos.tsx or Privacidade.tsx triggers a CURRENT_CONSENT_VERSION bump in src/hooks/useConsent.ts AND a LAST_UPDATED bump in Privacidade.tsx in the same commit; banner re-appears for every active user asking to re-consent.
- **HMAC token shape (Plan 02-02)** — `<hex-hmac>:<unix-millis-expires>:<hex-nonce>` bound to user.id via the HMAC payload; secret in Deno.env (LGPD_DELETE_TOKEN_SECRET). Canonical reusable pattern for any future email-confirm flow (team invite, password reset). Move to `_shared/hmac.ts` when a second use case lands.
- **PostHog opt-in contract (Plan 02-02 → 02-03 handoff)** — useConsent().analyticsOptedIn is the canonical signal; Plan 02-03 wires PostHogConsentBridge useEffect → posthog.opt_in_capturing() / opt_out_capturing(). Initial PostHog init must use `opt_out_capturing_by_default: true`.
- **useTelemetry chokepoint (Plan 02-03)** — 12 typed event helpers in src/hooks/useTelemetry.ts is the SINGLE entry point for PostHog `track()` calls. Direct calls outside this hook are discouraged. Adding a new event = adding a typed helper here. Plan / BillingCycle / SignupSource unions catch taxonomy drift at compile time.
- **MRR math = sum(value / cycle_months) (Plan 02-03 / D-14)** — Asaas is source-of-truth; user_subscriptions is a read-cache. mrr-dashboard pages /v3/subscriptions?status=ACTIVE; classifies revenue Pro vs VIP via Asaas externalReference = user_subscriptions.id (W2a must set this). Unknown cycle falls back to 1-month (over-report, not under-report).
- **is_admin bootstrap pattern (Plan 02-03)** — migration adds BOOLEAN NOT NULL DEFAULT false column; founder UUID UPDATE is OUT of the migration (separate Lovable chat statement). Canonical "single privileged user must exist post-migration" pattern; reusable for any single-bootstrap-row situation (e.g., default workspace).
- **Sentry beforeBreadcrumb console-log drop (Plan 02-03 — Rule 2 defense-in-depth)** — beforeBreadcrumb returns null for `category==='console' && level==='log'`; only warn+error breadcrumbs survive (and those go through beforeSend regex scrub). Mitigates T-2-18 (Sentry breadcrumb leaks CPF via console.log).
- **Email templates = pure-function HTML string builders (Plan 02-04)** — @react-email/components v1.0.12 deprecated; templates ship as `render*Email(props): { subject, html, text }` plain TypeScript functions in src/templates/emails/*.tsx, zero runtime deps, runnable from Deno edge fns and browser. Pattern matches existing send-client-email/index.ts inline-HTML approach. Future consumers (W2a asaas-webhook, W3 signup confirmation, W1a lgpd-delete cutover) import + render directly.
- **CrispWidget marketing-consent gate (Plan 02-04)** — uses `useConsent().marketingOptedIn` (not analyticsOptedIn or privacy_accepted_at) because Crisp drops cookies + ships chat history to EU servers (Privacidade.tsx §5 sub-processor list). Marketing is the canonical consent class covering helpdesk widgets. iOS Capacitor detection uses userAgent fallback (Capacitor + iPhone|iPad|iPod) until canonical useIsIOSCapacitor hook lands in Plan 02-06 W2b.
- **vercel.json SPA rewrite scope-exclude (Plan 02-04)** — pattern `/((?!api/|assets/).*)` → `/index.html`. Future API routes (e.g., Vercel edge fns under /api/) and Vite's hash-named immutable assets under /assets/* are excluded from the SPA fallback so they serve real files/handlers, not the React shell.
- **Landing pricing copy badge string normalized (Plan 02-04)** — "Mais escolhido" is the canonical badge string on PricingSection Pro card across Index.tsx + AnimatedSections.tsx. Previously was "Mais Popular" (legacy Phase 1). Future iOS Path C rebuilds that hide pricing should also remove the badge (consistent with "no pricing UI on iOS native").
- **INSERT-first webhook idempotency primitive (Plan 02-05)** — (provider, event_id) UNIQUE constraint + Postgres SQLSTATE 23505 inspection in handler = canonical pattern for ALL future external-webhook integrations in this codebase. Don't re-invent for MercadoPago / Pix-Direto / bank-API direct-debit; copy the asaas-webhook shape. Empirical proof via curl double-fire returning 200 "duplicate ignored" + SELECT COUNT(*) = 1.
- **externalReference = our UUID, not user.id (Plan 02-05)** — Asaas subscription create sets `externalReference: <user_subscriptions.id (UUID)>`. webhook + mrr-dashboard + reconcile all match against this UUID, not auth.uid. Race-free even when asaas_subscription_id has not been backfilled yet (the very-first webhook can correlate via externalReference). Don't change this contract — mrr-dashboard already consumes it (plan 02-03).
- **No CREATE EXTENSION in Supabase-managed cron migrations (Plan 02-02 + Plan 02-05)** — pg_cron and pg_net are pre-provisioned. Adding `CREATE EXTENSION IF NOT EXISTS pg_cron` triggers SQLSTATE 2BP01 dependent-privileges error because the cron schema already has GRANTs assigned to supabase_admin/postgres. Pattern documented inline in both 20260513120003 (LGPD) and 20260514120004 (Asaas reconcile) cron migrations.
- **Constant-time string compare helper duplication threshold reached (Plan 02-05)** — `constantTimeEq` (or `timingSafeEq`) now lives inline in 4 edge functions: google-calendar-auth, lgpd-delete-cleanup, asaas-webhook, reconcile-asaas-subscriptions. Next consumer (plan 02-07 or backlog) should extract to `supabase/functions/_shared/timingSafeEq.ts`. Don't pre-extract now — current copies are 4 lines each, premature DRY adds dependency surface without benefit.
- **_shared/timingSafeEq.ts extraction complete (Plan 03-04a)** — Extracted to `supabase/functions/_shared/timingSafeEq.ts` with canonical name `timingSafeEq` + re-export alias `constantTimeEq` for backward compat. 5 edge fns migrated. `asaas-webhook/index.ts` re-exports `constantTimeEq` so its `index.test.ts` (which imports it from the module) passes without rewrite. 9 total consumers after Plan 03-04b.
- **push_subscriptions table — NO has_plan gate at table level (Plan 03-04a D-T08)** — Free users can register device tokens for payment_event + onboarding_milestone pushes. The Pro+ event-type gate lives in enqueue-push edge function (Plan 03-04b has_plan RPC check). Adversarial test in Plan 03-05 proves cross-user RLS empirically.
- **Asaas auth header is static asaas-access-token, NOT HMAC of body (Plan 02-05)** — RESEARCH §2.1 confirmed: Asaas signs webhooks by setting an operator-configured static value in a dedicated header, NOT by HMAC over body. Different from google-calendar-auth pattern (which uses HMAC). Constant-time compare still applies.
- **useIsIOSCapacitor is the single chokepoint for Path C (Plan 02-06)** — Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios' is the canonical iOS-runtime gate. Anywhere pricing/checkout UI renders, wrap with `if (useIsIOSCapacitor()) return <neutral panel without anchor>` or `return null`. The W1c userAgent fallback in CrispWidget is gone. Phase 3's `strings | grep` gate (G-CRIT-03) verifies the iOS bundle ships no pricing strings — that gate passes only because every pricing surface consumes this hook.
- **Path C neutral panel has NO clickable link (Plan 02-06)** — When useIsIOSCapacitor() is true, Assinatura.tsx renders 'Gerencie sua assinatura em milespro.net.br pelo navegador web' as PLAIN TEXT, not an `<a href="https://milespro.net.br/assinatura">` link. Apple Multiplatform Services exemption 3.1.3(b) explicitly prohibits any link from the iOS app to the web checkout. The user types the URL manually (or arrives via email/marketing). Re-evaluating this could trigger an App Store rejection.
- **handlePlanCta → create-checkout-session is the canonical revenue path (Plan 02-06)** — Both Assinatura.tsx and Index.tsx PricingSection (anonymous fallback notwithstanding) invoke supabase.functions.invoke('create-checkout-session', {body: {plan, cycle}}) and redirect to data.checkoutUrl. subscription_leads is the SHADOW LOG on Asaas failure (not the primary path) — D-11 schema includes failureKind='asaas_failure' for triage. VITE_SALES_WHATSAPP env + wa.me/<n> URL pattern are DELETED everywhere (D-15: VIP self-serve via Asaas — no human-in-the-loop).
- **Trust kernel arg shape for rpc client calls (Plan 02-06)** — supabase.rpc('has_plan', { _user_id, _required_plan }) is the canonical shape. Note the `_` prefix — has_plan() and can_access_account() both declare PG argument names with leading underscore, and supabase-js requires the JS object keys to match exactly. create-managed-account uses this shape; future server-side has_plan() checks should copy it.
- **Free RLS limits use a sub-SELECT against the same table (Plan 02-06)** — WITH CHECK clauses on user_programs and program_accounts run `(SELECT COUNT(*) FROM <same_table> WHERE user_id = auth.uid()) < N`. RLS executes the inner SELECT under the caller's identity (SECURITY INVOKER), so the count includes only the caller's own rows — no information leak. Embedded the literal 'free_plan_limit_exceeded' in the policy COMMENT so future error-introspection helpers can pattern-match. Policy name is the only signal a 42501 client gets (PostgREST doesn't surface custom errors from RLS denials).
- **Managed account headless email domain (Plan 02-06)** — All headless auth.users created by create-managed-account use `headless-<uuid>@managed.milespro.invalid`. RFC 6761 reserves `.invalid` for guaranteed-never-routable addresses — prevents accidental email delivery to a real domain. user_metadata includes `headless: true` + `owner_user_id` so downstream tooling can filter headless users out of normal email blasts.

### Pending Todos

None yet.

### Blockers/Concerns

- **PJ-blocker (Phase 2):** Asaas live cutover requires CNPJ. Founder must constitute PJ entity in parallel; design + scaffold of PAY-* and COMPL-* can proceed in sandbox until then.
- **Three CRITICAL findings already manifest in code** (CRIT-01, CRIT-02, HIGH-05 per PITFALLS.md cross-referenced with codebase/CONCERNS.md) — all owned by Phase 1, none can ship to a paying user. (Phase 1 closed — CRIT-01/02 mitigated by trust kernel + RLS rewrite + service-role removal; pending deploy of Phase 1 follow-up to live Supabase.)
- **Open product decisions** (surface in Phase 2 planning): Pro pricing R$19,90 vs R$29,90; Supabase region sa-east-1 vs us-east-* (international transfer SCC implication for LGPD — resolved in plan 02-02 Privacidade.tsx §10 with SCC clause for us-east-1).

## Deferred Items

Items acknowledged and carried forward:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| UI | "Excluir minha conta" + "Exportar meus dados" buttons in Configurações | deferred to 02-06 (TIER UI / Path C) | 2026-05-12 plan 02-02 |
| UI | Settings page granular re-consent toggle (post-signup opt-in/out) | deferred to backlog v2 | 2026-05-12 plan 02-02 |
| Admin | DPO admin tooling to read deletion_audit + lgpd_export_log | deferred to backlog v2 (founder reads via Supabase Studio for v1) | 2026-05-12 plan 02-02 |
| Asaas | Asaas customer DELETE in cleanup uses sandbox URL until 02-05 flips live | deferred to 02-05 (PAY cutover) | 2026-05-12 plan 02-02 |
| Telemetry | PostHog opt-in actual wiring | DONE in plan 02-03 (ConsentWatcher + opt_out_capturing_by_default) | 2026-05-12 plan 02-02 |
| Infra | Resend domain warmup (SPF/DKIM/DMARC) | deferred to 02-04 (DNS work) | 2026-05-12 plan 02-02 |
| Sentry | @sentry/vite-plugin source-map upload | deferred to 02-07 (W3 cutover) | 2026-05-13 plan 02-03 |
| Sentry | Deno edge fn Sentry SDK integration | deferred to backlog v2 | 2026-05-13 plan 02-03 |
| Sentry | Capacitor Sentry SDK (mobile) | deferred to Phase 3 | 2026-05-13 plan 02-03 |
| UI | "Métricas internas" admin-only nav menu link in Configurações | deferred to 02-06 (TIER UI / Path C) | 2026-05-13 plan 02-03 |
| TS | Drop `as unknown as { is_admin: boolean }` cast in AdminMetrics.tsx after types.ts regen | deferred to next plan touching the file | 2026-05-13 plan 02-03 |
| Telemetry | ConsentBanner.tsx onSubmit → trackConsentGiven wire (taxonomy ready in useTelemetry, call site pending) | DONE in plan 02-06 (Task 8 close-out — wired alongside saveConsent mutate) | 2026-05-13 plan 02-03 |
| UI | "Excluir minha conta" + "Exportar meus dados" buttons in Configurações | still deferred (backlog v2 — Configuracoes page edit was out of scope for 02-06) | 2026-05-12 plan 02-02 |
| UI | "Métricas internas" admin-only nav menu link in Configurações | still deferred (backlog v2 — same scope decision) | 2026-05-13 plan 02-03 |
| Schema | profiles.cpf pgsodium encryption (TIER-06 originally listed encrypted-at-rest) | deferred to backlog v2 — partial UNIQUE index from W2a is the dedupe guard; encryption can be added without migrating existing data later | 2026-05-13 plan 02-06 |
| TIER | VIP cap of 5 perfis (TIER-05 originally read "ilimitado") | scoped to 5 per CLAUDE.md / D-12; revisit post-launch if v1 demand pushes higher | 2026-05-13 plan 02-06 |
| Data | balance_in_from in user_promo_alerts (D-13 wants balance-correlated message) | deferred — compute-personalized-promos writes null for v1; operations rollup view + balance JOIN is post-v1 | 2026-05-13 plan 02-06 |
| Feature | Transfer Optimizer (TIER-03 originally bundled with personalized alerts) | deferred to backlog v2 — current Promocoes.tsx ships the alerts skeleton; full optimizer wireframe is post-launch | 2026-05-13 plan 02-06 |
| Test | matchPromosForUser pure-function tests run under Deno not Vitest (no @capacitor stub in Deno) | acceptable — CI deno-tests job covers; node host can skip the Deno tests safely | 2026-05-13 plan 02-06 |

## Session Continuity

Last session: 2026-05-13
Stopped at: Phase 3 CONTEXT.md gathered (4 areas discussed, 16 decisions D-T01..D-T16, CONTEXT.md + DISCUSSION-LOG.md written to .planning/phases/03-mobile-distribution-launch/). Hard-blocker surfaced: Apple Developer Program + Play Console both pending — Task #0 of plan must open them in parallel (Apple: $99/ano via PJ + DUNS, ~3-7 days; Play: $25 one-time + ~24h). Suggested next: /clear then /gsd-plan-phase 3. Prior context: Plan 02-06 CODE-ONLY portion executed and committed (8 atomic commits + SUMMARY.md). Phase 2 now 6/7 done. All 12 must_have truths verified ✓ from code (Free RLS limits, Pro+ alert antecipation gate, user_promo_alerts table + Pro+ RLS, useSubscription Free maxPrograms=3 + maxAccounts=5, useIsIOSCapacitor canonical hook, Path C wrapper on Assinatura/Index/AnimatedSections/CrispWidget, handlePlanCta → create-checkout-session redirect, vip.adversarial.test.ts 7 scenarios, VITE_SALES_WHATSAPP removal, ConsentBanner trackConsentGiven wire). 02-06-SUMMARY.md §Pending Apply has the operator checklist.
Resume file: .planning/phases/02-monetiza-o-compliance-telemetria/02-06-SUMMARY.md §Pending Apply — Lovable Cloud commands (apply 4 new migrations + deploy 3 new edge fns + set PROMO_COMPUTE_AUTH_TOKEN secret (both edge-fn env + Vault as promo_compute_auth_token)). Can run in parallel with 02-04 + 02-05 deploys that are also queued.
Next action: Three parallel tracks — (A) USER catch up on 02-04 external setup (Resend/Crisp/DNS); (B) USER apply 02-05 to Lovable Cloud (4 migrations + 3 edge fns + 4 secrets + Asaas sandbox account + webhook registration + curl smoke per 02-05-CRIT-04-SMOKE-RUNBOOK.md); (C) USER apply 02-06 to Lovable Cloud (4 migrations + 3 edge fns + 1 secret + 1 Vault secret). Once all deploys land, run UAT to confirm: Free direct REST INSERT on 4th user_programs row → 42501; Pro user toggles alert_antecipation_days to 60 → succeeds; Free user UPDATE same → 42501; VIP user adds managed CPF via dialog → success; Pro user direct REST INSERT managed_accounts → 42501; click 'Assinar Pro' on Assinatura.tsx → redirects to Asaas hosted checkout. 02-07 W3 production cutover remains hard-blocked on (a) PJ approval, (b) Asaas production API key, (c) NFS-e municipal setup, (d) contador onboarding.

## Pending Apply (deploy-time, not executor-time)

### From Plan 02-01

- `supabase/migrations/20260512130001_drop_can_access_feature.sql` — apply via Lovable Cloud chat → regenerate types.

### From Plan 02-02 (NEW)

**Migrations (apply in order):**

1. `supabase/migrations/20260513120001_create_user_consents.sql` — creates user_consents + lgpd_export_log
2. `supabase/migrations/20260513120002_soft_delete_columns_and_audit.sql` — adds 3 columns to profiles + deletion_audit + new profiles_select RLS
3. `supabase/migrations/20260513120003_schedule_lgpd_delete_cron.sql` — registers daily 04:00 UTC cron job
4. Regenerate Supabase types after #1 + #2 (new tables/columns must surface in types.ts)

**Edge functions to deploy:**

- `supabase functions deploy lgpd-export`
- `supabase functions deploy lgpd-delete`
- `supabase functions deploy lgpd-delete-cleanup`

**Secrets to provision (both edge-function env AND Vault for the cron):**

- `LGPD_DELETE_TOKEN_SECRET` (hex 32-byte; edge function env)
- `LGPD_CLEANUP_AUTH_TOKEN` (hex 32-byte; same value in BOTH edge-function env + Vault named `lgpd_cleanup_auth_token`)
- `RESEND_API_KEY` (already provisioned for send-client-email; reused by lgpd-delete)
- Optional (best-effort cascade in lgpd-delete-cleanup; safe to defer): `POSTHOG_API_KEY` + `POSTHOG_PROJECT_ID` (plan 02-03), `SENTRY_API_KEY` + `SENTRY_ORG_SLUG` (plan 02-03), `ASAAS_API_KEY` (plan 02-05)

See `.planning/phases/02-monetiza-o-compliance-telemetria/02-02-SUMMARY.md` §"Pending Apply" for full step-by-step deploy commands.

### From Plan 02-03 (NEW)

**Migration to apply:**

1. `supabase/migrations/20260513120004_add_is_admin_to_profiles.sql` — Lovable chat: `Aplicar a migration 20260513120004_add_is_admin_to_profiles.sql em produção`
2. Regenerate Supabase types: `Regenerar tipos do Supabase` (so `profiles.is_admin` lands in types.ts and AdminMetrics.tsx can drop its `as unknown` cast in a future cleanup)

**Founder bootstrap (one-time, AFTER migration applies):**

```sql
UPDATE public.profiles SET is_admin = true
WHERE id = (SELECT id FROM auth.users
            WHERE email = 'julianosmachado@gmail.com' LIMIT 1);
```

**Edge function to deploy:**

- `supabase functions deploy mrr-dashboard` (replace the existing legacy version)

**Vercel env vars (optional — telemetry is no-op without them, but app still works):**

- `VITE_POSTHOG_KEY` — PostHog Cloud EU project key (phc_xxx)
- `VITE_SENTRY_DSN` — Sentry DSN (https://...@xxx.ingest.sentry.io/...)
- `VITE_POSTHOG_HOST` — optional override (default https://eu.i.posthog.com)

See `.planning/phases/02-monetiza-o-compliance-telemetria/02-03-SUMMARY.md` §"Pending Apply" for full step-by-step deploy commands + post-deploy smoke tests.

### From Plan 02-05 (NEW)

**Migrations to apply (in order via Lovable Cloud chat):**

```
Aplicar a migration 20260514120001_create_webhook_events.sql
Aplicar a migration 20260514120002_extend_user_subscriptions_for_asaas.sql
Aplicar a migration 20260514120003_profiles_asaas_customer_id_and_cpf_unique.sql
Aplicar a migration 20260514120004_schedule_asaas_reconcile_cron.sql
Regenerar tipos do Supabase
```

**Edge functions to deploy via Lovable Cloud chat:**

```
Deploy edge function asaas-webhook
Deploy edge function create-checkout-session
Deploy edge function reconcile-asaas-subscriptions
```

**Secrets to set (Lovable Cloud `supabase secrets set`):**

- `ASAAS_API_KEY` — sandbox key from Asaas Dashboard → Sandbox → Integrations
- `ASAAS_WEBHOOK_TOKEN` — `openssl rand -hex 32`; operator-chosen static token
- `ASAAS_ENV` — `sandbox` (flip to `production` in plan 02-07 W3)
- `ASAAS_RECONCILE_AUTH_TOKEN` — `openssl rand -hex 32` (different from webhook token)

**Vault secret (Lovable Cloud chat):**

```sql
SELECT vault.create_secret('<same-hex-as-edge-fn-ASAAS_RECONCILE_AUTH_TOKEN>', 'asaas_reconcile_auth_token');
```

**Asaas Dashboard webhook URL registration:**

- URL: `https://opusftqbbaozucmbuuug.supabase.co/functions/v1/asaas-webhook`
- Auth header name: `asaas-access-token`
- Auth header value: same as `ASAAS_WEBHOOK_TOKEN` secret
- Events: PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_CREATED, PAYMENT_OVERDUE, PAYMENT_REFUNDED, PAYMENT_PARTIALLY_REFUNDED, PAYMENT_CHARGEBACK_REQUESTED, PAYMENT_AWAITING_CHARGEBACK_REVERSAL, SUBSCRIPTION_DELETED, SUBSCRIPTION_INACTIVATED

**Gate G-CRIT-04 smoke (runbook):**

After deploy + secrets, run the curl double-fire from `.planning/phases/02-monetiza-o-compliance-telemetria/02-05-CRIT-04-SMOKE-RUNBOOK.md` and paste verbatim output into 02-05-SUMMARY.md. Cycle-level kill switch closes only after this is recorded.

See `.planning/phases/02-monetiza-o-compliance-telemetria/02-05-SUMMARY.md` §"Pending Apply" for full step-by-step deploy commands + cross-plan handoff notes for 02-06 / 02-07.

### From Plan 02-06 (NEW)

**Migrations to apply (in order via Lovable Cloud chat):**

```
Aplicar a migration 20260515120001_tier_rls_free_limits.sql
Aplicar a migration 20260515120002_user_settings_alert_antecipation.sql
Aplicar a migration 20260515120003_user_promo_alerts.sql
Aplicar a migration 20260515120004_schedule_compute_personalized_promos_cron.sql
Regenerar tipos do Supabase
```

**Edge functions to deploy via Lovable Cloud chat:**

```
Deploy edge function create-managed-account
Deploy edge function compute-personalized-promos
Deploy edge function fetch-promotions   (updated with ?personalized=true branch)
```

**Secret to set (Lovable Cloud `supabase secrets set`):**

- `PROMO_COMPUTE_AUTH_TOKEN` — `openssl rand -hex 32`; same value goes in BOTH the edge-function env AND Vault (under the name `promo_compute_auth_token`)

**Vault secret (Lovable Cloud chat):**

```sql
SELECT vault.create_secret('<same-hex-as-edge-fn-PROMO_COMPUTE_AUTH_TOKEN>', 'promo_compute_auth_token');
```

**Post-deploy UAT smoke (manual):**

1. As Free user via Supabase Studio JWT: `INSERT INTO user_programs (user_id, program_name) VALUES (auth.uid(), 'fourth-program');` after having 3 — expect SQLSTATE 42501.
2. As Free user: `UPDATE user_settings SET alert_antecipation_days = 60 WHERE user_id = auth.uid();` — expect 42501.
3. As Pro user: same UPDATE — expect success.
4. As VIP user via the dashboard: open Switcher → "Adicionar conta gerenciada" → fill {label, full_name, cpf 11 digits} → expect success toast.
5. As Pro user via Supabase Studio JWT: `INSERT INTO managed_accounts (owner_user_id, managed_user_id, label) VALUES (auth.uid(), 'any-uuid', 'test');` — expect 42501.
6. Open Promocoes page as Pro user — expect empty state (cron has not populated yet); as Free user — expect redirect to /assinatura.
7. Click "Assinar Pro" on Assinatura.tsx as authenticated Pro-intending user — expect window.location to Asaas hosted checkout URL.

See `.planning/phases/02-monetiza-o-compliance-telemetria/02-06-SUMMARY.md` §"Pending Apply" for full step-by-step deploy commands + cross-plan handoff notes for 02-07.

### From UX walkthrough 2026-05-16 (commit `9bfe180`) — ✅ APPLIED 2026-05-16

**Status:** Applied to production 2026-05-16 via Lovable Cloud chat. Lovable-side duplicate `20260516203816_857d93c0-…sql` was auto-created and removed in the same session (Lovable commit `fb75996`); the canonical `20260516150000_operations_free_monthly_limit.sql` is the only artifact on `main`. Smoke confirmed: `operations_insert` policy is the sole INSERT policy on `public.operations` with the expected `WITH CHECK` (`auth.uid() = user_id AND (has_plan(auth.uid(),'pro') OR (SELECT count(*) … created_at in current UTC month) < 20)`), and `idx_operations_user_created_at` index is in place.

**Original apply command (preserved for audit):**

```
Aplicar a migration 20260516150000_operations_free_monthly_limit.sql em produção
```

**What it does:** TIER-02 enforcement — rewrites `operations` INSERT RLS policy to enforce 20 ops/UTC-calendar-month for Free users (Pro/VIP unlimited via `has_plan('pro')`). Backs up the existing client-side check in `src/hooks/useOperations.ts:checkOperationLimit` against direct REST bypass. Also adds `idx_operations_user_created_at` for the COUNT subquery. Same pattern as TIER-01 (migration `20260515120001`).

**Until applied:** the limit is still enforced ONLY client-side (same as before the commit). A Free user calling PostgREST directly can still bypass.

**Post-deploy UAT smoke (manual):**

1. As Free user via Supabase Studio JWT, after having 20 confirmed operations this UTC month: `INSERT INTO operations (user_id, type, program, quantity, total_cost, cost_per_thousand, date) VALUES (auth.uid(), 'compra', 'Smiles', 1000, 30, 30, CURRENT_DATE);` — expect SQLSTATE 42501.
2. As Pro/VIP user with ≥20 ops this month: same INSERT — expect success (unlimited).
3. Confirm via `SELECT polname, polcmd FROM pg_policies WHERE schemaname='public' AND tablename='operations' AND polcmd='a';` that `operations_insert` is the only INSERT policy.
