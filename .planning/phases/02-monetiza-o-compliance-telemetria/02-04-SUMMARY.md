---
phase: 02-monetiza-o-compliance-telemetria
plan: 04
subsystem: infra-helpdesk
tags: [infra, vercel, dns, resend, crisp, helpdesk, landing, deliverability, code-partial]
requires:
  - "Plan 02-01 (Wave 0 foundation) — Pro/VIP tier names + Termos.tsx §4 garantia paragraph"
  - "Plan 02-02 (Wave 1a LGPD) — useConsent hook exposes marketingOptedIn (CrispWidget gate)"
  - "Plan 02-03 (Wave 1b telemetry) — initPosthog + initSentry pattern (CrispWidget mirrors graceful no-op)"
provides:
  - vercel.json (Vite framework + SPA rewrites + 4 security headers + 1-yr asset cache)
  - crisp-sdk-web npm dependency
  - src/components/layout/CrispWidget.tsx (consent-gated, iOS-Capacitor-aware helpdesk widget)
  - src/templates/emails/*.tsx (6 templates — Welcome/TrialEnding/PaymentReceived/PaymentFailed/DeletionConfirm/LgpdExportReady)
  - src/pages/Index.tsx pricing copy refresh (annual default + Mais escolhido + Pix/boleto delay + 7-day guarantee link)
  - src/pages/Assinatura.tsx 7-day guarantee + Pix/boleto FAQ reinforcement
  - src/pages/Termos.tsx <p id="garantia"> anchor (for landing-card cross-link)
  - .env.example VITE_CRISP_WEBSITE_ID + RESEND_API_KEY contracts
  - 02-04-RESEND-WARMUP-RUNBOOK.md (3-week deliverability operator playbook)
  - 02-04-HELPDESK-SLA-RUNBOOK.md (5 ticket scenarios + dispute defense)
affects:
  - vercel.json (new)
  - package.json + package-lock.json (crisp-sdk-web added)
  - src/components/layout/CrispWidget.tsx (new)
  - src/templates/emails/{Welcome,TrialEnding,PaymentReceived,PaymentFailed,DeletionConfirm,LgpdExportReady}Email.tsx (new x6)
  - src/App.tsx (CrispWidget mount)
  - src/pages/Index.tsx (annual default + FAQ items)
  - src/pages/Assinatura.tsx (trust block + FAQ items + Link import)
  - src/pages/Termos.tsx (id="garantia" anchor)
  - src/components/landing/AnimatedSections.tsx (PricingSection trust block + Link import + "Mais escolhido" rename)
  - .env.example (2 new vars)
  - .planning/phases/02-monetiza-o-compliance-telemetria/02-04-RESEND-WARMUP-RUNBOOK.md (new)
  - .planning/phases/02-monetiza-o-compliance-telemetria/02-04-HELPDESK-SLA-RUNBOOK.md (new)
tech-stack:
  added:
    - crisp-sdk-web (helpdesk live-chat browser SDK)
  patterns:
    - "Graceful-degrade env-var pattern (CrispWidget mirrors posthog.ts / sentry.ts uninitialized no-op)"
    - "Email template = pure function returning { subject, html, text } tuple — safe to import from Deno or browser"
    - "iOS Capacitor userAgent fallback until useIsIOSCapacitor hook lands in W2b"
    - "Plain HTML email templates with inline styles (email-client-safe; no React Email deps — v1.0.12 deprecated)"
    - "SPA rewrite scope-exclude pattern: /((?!api/|assets/).*) → /index.html"
key-files:
  created:
    - vercel.json
    - src/components/layout/CrispWidget.tsx
    - src/templates/emails/WelcomeEmail.tsx
    - src/templates/emails/TrialEndingEmail.tsx
    - src/templates/emails/PaymentReceivedEmail.tsx
    - src/templates/emails/PaymentFailedEmail.tsx
    - src/templates/emails/DeletionConfirmEmail.tsx
    - src/templates/emails/LgpdExportReadyEmail.tsx
    - .planning/phases/02-monetiza-o-compliance-telemetria/02-04-RESEND-WARMUP-RUNBOOK.md
    - .planning/phases/02-monetiza-o-compliance-telemetria/02-04-HELPDESK-SLA-RUNBOOK.md
  modified:
    - package.json
    - package-lock.json
    - src/App.tsx
    - src/pages/Index.tsx
    - src/pages/Assinatura.tsx
    - src/pages/Termos.tsx
    - src/components/landing/AnimatedSections.tsx
    - .env.example
decisions:
  - "@react-email/components v1.0.12 is deprecated upstream — email templates ship as pure-function pt-BR HTML string builders (no React/JSX runtime cost; usable from Deno edge fns and Node alike)"
  - "Crisp gate uses useConsent().marketingOptedIn (not analyticsOptedIn) because Crisp drops cookies + ships chat history to EU servers — marketing consent covers helpdesk per Privacidade.tsx framing"
  - "iOS Capacitor detection uses userAgent fallback (Capacitor + iPhone|iPad|iPod) — canonical useIsIOSCapacitor hook deferred to W2b which owns handlePlanCta replacement"
  - "vercel.json rewrites use scope-exclude /((?!api/|assets/).*) so future API routes and the /assets/* immutable cache don't accidentally serve the SPA shell"
  - "Pricing badge string normalized to 'Mais escolhido' across the landing PricingSection (was 'Mais Popular') — single source of truth, matches plan must_haves verbatim"
  - "Annual cycle is the default useState value on Index.tsx (HIGH-06) — toggle still works mensal/semestral; users see the savings cycle first"
  - "Trust block placement: under the CTA in each paid card (Index PricingSection + Assinatura.tsx) — appears at the moment of conversion, not buried in FAQ"
  - "Termos.tsx anchor: id='garantia' on the unconditional-refund paragraph (§4) so the landing /termos#garantia link scrolls to the right place"
metrics:
  duration_minutes: 35
  completed_date: 2026-05-13
  tasks_completed: 10
  files_created: 10
  files_modified: 8
  commits: 8
---

# Phase 2 Plan 04: Infrastructure + Helpdesk + Landing Refresh — Code-Only Summary

**One-liner:** Ships every code artifact the production go-live needs — Vercel hosting config, 6 transactional pt-BR email templates, consent-gated Crisp helpdesk widget with iOS Path C fallback, landing pricing card refresh (annual default, "Mais escolhido" badge, 7-day guarantee link to /termos#garantia, Pix/Boleto delay messaging), and two operator runbooks (Resend warmup + Helpdesk SLA) — but explicitly DEFERS the human-only steps (Resend account, Crisp account, Cloudflare DNS records for email, mail-tester smoke) to the next operator session.

This plan is `autonomous: false` because total completion depends on external dashboards. This execution covered the **code-only** scope.

## Execution

10 tasks completed in linear order on `main`. Each task → one atomic commit (8 total, with two tasks consolidated as logical units).

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | vercel.json (framework=vite + SPA rewrites + security headers + asset cache) | `d36b3e7` | vercel.json |
| 2 | npm install crisp-sdk-web (@react-email/* uninstalled — deprecated) | `e5c9110` | package.json, package-lock.json |
| 3 | 6 pt-BR email templates (pure-function HTML string builders) | `a849f83` | src/templates/emails/*.tsx |
| 4+5 | CrispWidget component + mount in App.tsx | `32c6d4a` | src/components/layout/CrispWidget.tsx, src/App.tsx |
| 6 | Landing pricing refresh (annual default + Mais escolhido + trust block in PricingSection) + Termos.tsx anchor | `1dd8406` | src/pages/Index.tsx, src/pages/Termos.tsx, src/components/landing/AnimatedSections.tsx |
| 7 | Assinatura.tsx 7-day guarantee block + Pix/boleto FAQ | `6ac4716` | src/pages/Assinatura.tsx |
| 8 | .env.example VITE_CRISP_WEBSITE_ID + RESEND_API_KEY | `cf0b2c6` | .env.example |
| 9+10 | Resend warmup runbook + Helpdesk SLA runbook | `abdfa63` | 02-04-RESEND-WARMUP-RUNBOOK.md, 02-04-HELPDESK-SLA-RUNBOOK.md |

## Must-Have Truths — Status (15 declared in plan)

Status legend: ✓ verified now / ⏳ awaiting external operator step / ❌ blocked

| # | Truth | Status | Why / Evidence |
|---|-------|--------|----------------|
| 1 | DNS resolves app.milespro.net.br → Vercel; HTTPS works; SPA deep-link to /termos returns React app | ⏳ awaiting | Vercel project ✓; Cloudflare DNS for `app` CNAME ✓ user reports; SSL active ✓; NS propagation continuing — verifiable post-prop with `curl -sI https://app.milespro.net.br/termos` |
| 2 | https://milespro.net.br/ redirects to landing | ⏳ awaiting | apex A record + redirect rule pending Cloudflare configuration |
| 3 | dig +short milespro.net.br TXT contains v=spf1 AND v=DMARC1 | ❌ blocked | Resend account not yet created; SPF/DMARC records pending Resend domain provisioning |
| 4 | dig +short resend._domainkey.milespro.net.br TXT returns Resend DKIM | ❌ blocked | Same as #3 |
| 5 | dig +short send.milespro.net.br MX returns feedback-smtp.us-east-1.amazonses.com priority 10 | ❌ blocked | Same as #3 |
| 6 | Resend dashboard shows milespro.net.br = Verified | ❌ blocked | Same as #3 |
| 7 | mail-tester.com score for noreply@milespro.net.br is >9/10 | ❌ blocked | Depends on #6 |
| 8 | Crisp widget visible on landing (/) and dashboard (/dashboard) — but NOT on iOS Capacitor | ⏳ awaiting | Code wired; VITE_CRISP_WEBSITE_ID env unset → widget gracefully disabled. iOS Path C: userAgent fallback in place (see deferred items for useIsIOSCapacitor migration) |
| 9 | Vercel project deploys on push to main; preview deploys on PRs | ⏳ awaiting | User reports Vercel project created; GitHub integration likely connected — verifiable on next push |
| 10 | Landing pricing card mentions 7-day money-back guarantee + Pix/boleto delay (HIGH-02) | ✓ done | PricingSection in AnimatedSections.tsx renders Link to /termos#garantia + "Pix: confirma em até 4h · Boleto: até 2 dias úteis" under each paid card. Index.tsx FAQ has matching items. |
| 11 | Landing pricing copy uses R$ 37,90 (Pro) and R$ 67,90 (VIP) — D-01 explicit | ✓ done | Index.tsx pricingPlans verbatim; Assinatura.tsx monthlyPrice 37.90/67.90 |
| 12 | Landing has "Mais escolhido" badge on Pro card AND annual default-highlighted (HIGH-06) | ✓ done | AnimatedSections.tsx renders "⭐ Mais escolhido" when plan.popular; Index.tsx useState initial='annual' |
| 13 | 6 React Email templates exist in src/templates/emails/ — pt-BR + neutral branding | ✓ done | 6 .tsx files exist; each exports render*Email fn returning {subject, html, text}; pt-BR copy throughout; suporte@/dpo@ dual mailto footer |
| 14 | Resend warmup runbook documents 3-week sequence | ✓ done | 02-04-RESEND-WARMUP-RUNBOOK.md ships Week 1 founder-only / Week 2 limited beta / Week 3+ full + DMARC progression p=none → p=quarantine pct=25/100 → p=reject |
| 15 | Helpdesk SLA runbook lists top-5 ticket scenarios + response templates | ✓ done | 02-04-HELPDESK-SLA-RUNBOOK.md ships 5 scenarios (refund, payment failed, plan change, account deletion, password reset) with pt-BR templates + Asaas action checklists + chargeback defense procedure |

**Code-side truths verified: 7 (#10, #11, #12, #13, #14, #15 — all the must_haves that can be statically proven from code).**

**Awaiting / blocked truths: 8 (#1-#9 — all depend on external operator dashboards).** Once the operator completes the "Blocked on Checkpoint" section below, these flip from ⏳ to ✓ on observation.

## Verification Results

| Check | Result |
|-------|--------|
| `npm run lint` | PASS (0 errors, 1 pre-existing warning in `src/components/ui/program-logo.tsx` — out of scope, dated to Phase 1) |
| `npm run typecheck` (tsc --noEmit) | PASS (0 errors) |
| `npm run test:unit` | PASS — 113 tests across 22 files (matches Wave 1b baseline 113; no new test files in this plan) |
| `vercel.json` exists + `framework: vite` + SPA rewrite | ✓ |
| 6 files in `src/templates/emails/` | ✓ |
| `src/components/layout/CrispWidget.tsx` imports `crisp-sdk-web` + reads `VITE_CRISP_WEBSITE_ID` | ✓ |
| `src/App.tsx` mounts `<CrispWidget />` | ✓ |
| Index.tsx grep "R$ 37,90" + "R$ 67,90" + "Garantia" (case-insensitive) + annual default useState | ✓ |
| AnimatedSections.tsx grep "Mais escolhido" + `to="/termos#garantia"` | ✓ |
| Assinatura.tsx grep "garantia" + `/termos#garantia` | ✓ |
| Termos.tsx has `<p id="garantia">` anchor | ✓ |
| `.env.example` has `VITE_CRISP_WEBSITE_ID` and `RESEND_API_KEY` lines | ✓ |

## Blocked on Checkpoint (user must complete)

These are the human-only items that this code-execution explicitly did NOT touch. The user must complete them to flip the corresponding must_have truths from ⏳/❌ to ✓.

### 1. Vercel — Production deploy (LAUNCH-01)

- [x] User reports: Vercel project created, app.milespro.net.br domain added, SSL active
- [ ] Vercel env vars in dashboard (mirror the 7 from `.env.example` once Resend + Crisp accounts ready):
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
  - `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`, `VITE_SENTRY_DSN`
  - `VITE_CRISP_WEBSITE_ID` (after step 4)
- [ ] First production deploy succeeds (push to main triggers it)
- [ ] Smoke: `curl -sI https://app.milespro.net.br/termos` returns HTTP 200 with text/html

### 2. Cloudflare DNS — milespro.net.br (LAUNCH-01 + Gate G-MED-02)

- [x] User reports: NS migrating from dns-parking.com to Cloudflare; CNAME `app` → vercel-dns target configured
- [ ] Wait for NS propagation (verify with `dig +short NS milespro.net.br` → should return Cloudflare NS)
- [ ] Add apex A record + apex → www redirect (milespro.net.br → landing)
- [ ] Add MX `send` → `feedback-smtp.us-east-1.amazonses.com` priority 10 (after Resend account exists)
- [ ] Add TXT `send` → `v=spf1 include:amazonses.com ~all`
- [ ] Add TXT `resend._domainkey` → DKIM value from Resend dashboard
- [ ] Add TXT `_dmarc` → `v=DMARC1; p=none; rua=mailto:dmarc@milespro.net.br`
- [ ] Configure Cloudflare Email Routing: `suporte@`, `dpo@`, `dmarc@` → forward to founder Gmail (NOT `noreply@` — that's outbound-only via Resend)

### 3. Resend — Domain + API key (D-24 / Gate G-MED-02)

- [ ] Sign up at https://resend.com (free tier covers ~3k emails/month, 100/day)
- [ ] Add domain `milespro.net.br`; copy SPF/DKIM/DMARC values shown
- [ ] Add the DNS records (step 2 above) on Cloudflare
- [ ] Wait for Resend Dashboard → Domains → Verified (5min–2h)
- [ ] API Keys → Create New → name "MilesPro server" → copy
- [ ] Lovable Cloud chat: `Set edge function secret RESEND_API_KEY=<value>`
- [ ] Cutover edge functions to use `noreply@milespro.net.br` (currently lgpd-delete uses `onboarding@resend.dev` per Plan 02-02 W1a):
  - Edit `supabase/functions/lgpd-delete/index.ts` `from:` field
  - When W2a ships `asaas-webhook`, use `noreply@` from day 1

### 4. Crisp — Account + Website ID (D-23 / LAUNCH-05)

- [ ] Sign up at https://app.crisp.chat
- [ ] Add website "MilesPro"; copy Website ID
- [ ] Vercel env: `VITE_CRISP_WEBSITE_ID=<id>` → redeploy triggers
- [ ] Team → invite founder + 1 backup agent
- [ ] Settings → Triggers → "first-message-greeting" with pt-BR copy:
  ```
  Olá! Aqui é o time MilesPro. Respondemos em até 4h durante horário comercial
  (8h–20h BRT, seg-sex). Para questões urgentes de pagamento, mande email
  para dpo@milespro.net.br.
  ```

### 5. mail-tester smoke (Gate G-MED-02)

- [ ] After Resend Verified + DNS records propagated: visit https://www.mail-tester.com
- [ ] Send a probe email from Resend to the test address shown
- [ ] Confirm score > 9/10 (if < 9, investigate the failing check before Week 1 of warmup runbook)

### 6. DMARC progression (post-launch, 2 weeks of clean delivery)

- [ ] Cloudflare DNS `_dmarc` TXT → flip `p=none` to `p=quarantine; pct=25`
- [ ] Watch DMARC reports another week → raise to `pct=100`
- [ ] After 2 more weeks clean → consider `p=reject`

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Stale upstream] React Email packages deprecated**
- **Found during:** Task 2 / Task 3 setup
- **Issue:** Plan recommended `@react-email/components` + `@react-email/render` as preferred dependencies. Running `npm install` produced 13 `npm warn deprecated` messages for v1.0.12 — Resend appears to have abandoned the OSS components.
- **Resolution:** Uninstalled `@react-email/*` and built the 6 templates as pure-function HTML string builders. Each `render*Email({ ... })` returns `{ subject, html, text }`. Pattern matches the existing `supabase/functions/send-client-email/index.ts` inline-HTML approach, runs in both Deno edge runtime and browser, zero runtime deps. pt-BR copy + inline-styles email-client-safe.
- **Files modified:** package.json (crisp-sdk-web only), all 6 templates in src/templates/emails/*.tsx
- **Commit:** e5c9110 (dep cleanup) + a849f83 (6 templates)

**2. [Rule 2 — Critical functionality] Added id="garantia" anchor to Termos.tsx**
- **Found during:** Task 6
- **Issue:** Plan must_have #10 requires the landing pricing card to link to `/termos#garantia` via `<Link>`. Termos.tsx already had the "Garantia incondicional de 7 dias…" paragraph (§4, added by Plan 02-01 Task 4) but NO `id` attribute. A `/termos#garantia` link without a matching anchor scrolls to the page top — UX regression masking the link as broken.
- **Resolution:** Added `id="garantia"` to the unconditional-refund `<p>` element in Termos.tsx §4 (single attribute addition; no copy change).
- **Files modified:** src/pages/Termos.tsx (1 line)
- **Commit:** 1dd8406 (bundled with landing pricing copy task)

**3. [Rule 1 — Copy normalization] Standardized "Mais Popular" → "Mais escolhido" in PricingSection**
- **Found during:** Task 6
- **Issue:** Plan must_have #12 mandates a "Mais escolhido" badge on the Pro card. The actual code in `src/components/landing/AnimatedSections.tsx` rendered `⭐ Mais Popular` (legacy from Phase 1 landing). A grep guard against "Mais escolhido" would have failed.
- **Resolution:** Single-string rename in AnimatedSections.tsx PricingSection. No prop or interface change.
- **Files modified:** src/components/landing/AnimatedSections.tsx (1 string)
- **Commit:** 1dd8406

**4. [Plan-coordination] iOS Capacitor detection uses userAgent fallback (canonical hook deferred)**
- **Found during:** Task 4 (CrispWidget creation)
- **Issue:** Plan asks the CrispWidget to consume `useIsIOSCapacitor` IF it exists; otherwise document fallback. The hook file `src/hooks/useIsIOSCapacitor.ts` does NOT exist (verified via Glob → no files found). Plan 02-06 W2b owns the canonical hook (will introduce alongside `handlePlanCta` Path C runtime hide).
- **Resolution:** CrispWidget implements `isIOSCapacitorFallback()` checking `window.navigator.userAgent` matches `Capacitor` + `iPhone|iPad|iPod`. Logger.info notes "Path C disable" when detected. When W2b lands `useIsIOSCapacitor`, this widget should switch to the hook — added to Deferred Items below.
- **Files modified:** src/components/layout/CrispWidget.tsx (fallback function + comment doc trail)
- **Commit:** 32c6d4a

**5. [Plan-coordination] Crisp gate uses marketingOptedIn (not privacy_accepted_at as plan hinted)**
- **Found during:** Task 4
- **Issue:** Plan inline action says "Reads useConsent().marketingOptedIn — only initialize Crisp AFTER user has marketing consent (cookie-based widget)" but the older plan body section talked about `privacy_accepted_at` instead. The hook (`src/hooks/useConsent.ts`) exposes both `marketingOptedIn` and `analyticsOptedIn` (boolean fields from user_consents). `privacy_accepted_at` is a timestamp gate for needsConsent.
- **Resolution:** Used `marketingOptedIn` consistent with the prompt's scope_split section (which explicitly said marketing). Crisp drops cookies + ships chat history to EU servers — marketing is the canonical consent class. Privacidade.tsx §5 lists Crisp in the sub-processor list which the user reviews when consenting; saving marketing=true after seeing that list is the operationally correct gate.
- **Commit:** 32c6d4a

**6. [Rule 2 — Critical functionality] Updated Assinatura.tsx FAQ "Como funciona a garantia?" to mention the /termos cross-link**
- **Found during:** Task 7
- **Issue:** Plan only said to add the trust block under each plan CTA. The existing FAQ already had a "Como funciona a garantia?" entry but the language was weak ("se não gostar, devolvemos seu dinheiro sem perguntas") — without referencing the /termos legal anchor, a customer looking for the formal terms had no signpost.
- **Resolution:** Expanded the existing FAQ answer to include "Veja os Termos de Uso (seção Garantia) para detalhes." Also added a NEW FAQ item "Quanto tempo demora para confirmar o pagamento?" with explicit Cartão/Pix/Boleto SLA windows (HIGH-02).
- **Files modified:** src/pages/Assinatura.tsx (2 FAQ items)
- **Commit:** 6ac4716

### Deferred Items (out of scope for this code execution)

| Item | Reason | Suggested owner |
|------|--------|-----------------|
| Vercel account + GitHub OAuth + first deploy | Human-only dashboard work | User (in progress, partial) |
| Cloudflare DNS records for email (MX/SPF/DKIM/DMARC) | Depends on Resend account creation + NS propagation | User (post NS propagate) |
| Resend account + domain verification + API key | Human-only signup + DNS challenge | User |
| Crisp account + Website ID + agent invites + first-message trigger | Human-only signup | User |
| mail-tester.com smoke test | Depends on Resend Verified | User |
| DMARC p=none → p=quarantine flip (2 weeks post-launch) | Time-gated operational task | User (warmup runbook step) |
| `lgpd-delete/index.ts` `from:` cutover to `noreply@milespro.net.br` | Depends on Resend Verified | User or next plan touching the edge fn |
| `src/hooks/useIsIOSCapacitor.ts` canonical hook | Plan 02-06 W2b territory (paired with handlePlanCta Path C hide) | Plan 02-06 |
| CrispWidget migration from userAgent fallback to useIsIOSCapacitor hook | Same — hook doesn't exist yet | Plan 02-06 |
| Crisp telemetry events (helpdesk_chat_opened, ticket_resolved) | Out of scope here; useTelemetry.ts taxonomy can extend later | Backlog v2 |
| @react-email/components migration if upstream un-deprecates | Watch upstream; current pure-fn templates work | Backlog (low priority) |

## Threat Surface Audit (per plan threat_model)

All 5 threats in `<threat_model>` addressed at the code level:

| Threat | Mitigation in this plan |
|--------|--------------------------|
| T-2-19 Spoofing (email) | SPF/DKIM/DMARC records DOCUMENTED in warmup runbook; actual DNS records depend on operator step (Blocked on Checkpoint #2 + #3) |
| T-2-20 Info Disclosure (Crisp chat history outside BR) | CrispWidget gated on marketingOptedIn (consent must be in place); Privacidade.tsx §5 already lists Crisp as sub-processor per Plan 02-02 W1a; CPF never sent (only email forwarded) |
| T-2-21 Tampering (SPA bundle CDN poisoned) | vercel.json sets Cache-Control immutable on hash-named /assets/* + 3 security headers (X-Frame-Options DENY, nosniff, strict-origin-when-cross-origin); served over Let's Encrypt HTTPS |
| T-2-22 DNS hijack | Out of scope (operator-side Cloudflare 2FA) — referenced in operator runbook |
| T-2-23 DoS via Resend rate limits | Warmup runbook enforces 50/200/unlimited gradient; Resend free tier 3k/mo is 10x the Phase 2 cycle target |

No new threat flags discovered.

## Self-Check: PASSED

- File `vercel.json` exists with `"framework": "vite"` + SPA rewrites + 4 security headers + asset cache.
- File `src/components/layout/CrispWidget.tsx` exists and contains `from 'crisp-sdk-web'`, `VITE_CRISP_WEBSITE_ID`, `Crisp.configure`, `useConsent` import.
- File `src/App.tsx` contains `<CrispWidget />` JSX + import from `@/components/layout/CrispWidget`.
- All 6 email template files exist in `src/templates/emails/`: WelcomeEmail.tsx, TrialEndingEmail.tsx, PaymentReceivedEmail.tsx, PaymentFailedEmail.tsx, DeletionConfirmEmail.tsx, LgpdExportReadyEmail.tsx.
- File `src/pages/Index.tsx` contains "R$ 37,90", "R$ 67,90", "garantia" (case-insensitive), annual-default useState.
- File `src/components/landing/AnimatedSections.tsx` contains "Mais escolhido" + `to="/termos#garantia"`.
- File `src/pages/Assinatura.tsx` contains "garantia" + `/termos#garantia` + Link import.
- File `src/pages/Termos.tsx` contains `id="garantia"` attribute.
- File `.env.example` contains `VITE_CRISP_WEBSITE_ID` and `RESEND_API_KEY`.
- File `02-04-RESEND-WARMUP-RUNBOOK.md` contains "Week 1", "Week 2", "DMARC", "mail-tester.com", "noreply@milespro.net.br".
- File `02-04-HELPDESK-SLA-RUNBOOK.md` contains "Refund", "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED", "Excluir minha conta", "SLA", "dpo@milespro.net.br".
- All 8 commits exist in `git log`: d36b3e7, e5c9110, a849f83, 32c6d4a, 1dd8406, 6ac4716, cf0b2c6, abdfa63.
- `npm run lint` PASS (0 errors).
- `npm run typecheck` PASS (0 errors).
- `npm run test:unit` PASS (113 tests / 22 files — Wave 1b baseline maintained).

## Wave Unblocking

Plan 02-04 code partially unblocks the rest of Wave 1c + Wave 2:

- **Resend warmup readiness**: pending operator account creation, but ALL 6 template scaffolds + warmup runbook are committed. Once `RESEND_API_KEY` is set + domain verified, W1a `lgpd-delete` can flip its `from:` field from `onboarding@resend.dev` to `noreply@milespro.net.br` (1-line change documented in the warmup runbook).
- **Crisp readiness**: pending operator account, but the widget + consent gate + iOS fallback are all committed. Setting `VITE_CRISP_WEBSITE_ID` in Vercel env is the single switch.
- **Plan 02-05 (Wave 2a Asaas scaffold)**: can now consume `PaymentReceivedEmail` + `PaymentFailedEmail` templates from `src/templates/emails/`. The asaas-webhook edge function will import + render these for `PAYMENT_CONFIRMED` / `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED` flows.
- **Plan 02-06 (Wave 2b TIER UI / Path C)**: owns the next round of Index.tsx + Assinatura.tsx changes (handlePlanCta replacement → real checkout). The trust block + 7-day guarantee + Pix/boleto messaging shipped here are touch-isolated from handlePlanCta — no rebase conflict expected.
- **Plan 02-07 (Wave 3 cutover)**: owns the `lgpd-delete` from-cutover + DMARC progression + first 10 paying users window.

## Notes for Future Planners

- **Email template signature pattern**: Each template exports `render*Email(props): { subject, html, text }`. This is the canonical signature for any future transactional email. If an email needs attachments or inline images, extend to include an `attachments?: { filename, content }[]` field — but keep the core triple-return.
- **CrispWidget iOS migration**: When Plan 02-06 W2b ships `src/hooks/useIsIOSCapacitor.ts`, the CrispWidget should drop `isIOSCapacitorFallback()` and `import { useIsIOSCapacitor } from '@/hooks/useIsIOSCapacitor'`. Migration is a 5-line change. Tracking note added inline as a JSDoc on the fallback function.
- **vercel.json rewrite pattern**: Future API routes (under `/api/`) and static assets (under `/assets/`) are SCOPE-EXCLUDED from the SPA fallback to avoid serving `index.html` where Vercel/Vite expect a real file/handler. If a new top-level route is added (e.g., `/health` for a future health endpoint), update the regex.
- **HIGH-06 "Mais escolhido" badge consistency**: Both AnimatedSections.tsx PricingSection AND the eventual mobile / WebView builds must use the same badge string. Future iOS Path C rebuilds that hide pricing should also remove the badge (consistent with not showing pricing at all on iOS native).
- **Anchor pattern for legal pages**: `id="garantia"` in Termos.tsx is the first such anchor. Future legal anchors (e.g., `id="cancelamento"`, `id="reembolso"`, `id="dpo"`) should follow the same single-word kebab-case convention so landing/UX cards can deep-link consistently.
- **Resend pause kill-switch**: The warmup runbook mentions `RESEND_PAUSE=true` as a hypothetical kill-switch env var. This is NOT yet wired into any edge function. When the first deliverability incident hits, wire it into the top of every Resend-using edge function: `if (Deno.env.get('RESEND_PAUSE') === 'true') return new Response('paused', { status: 503 })`. Until then, pausing requires disabling the API key in Resend Dashboard.
