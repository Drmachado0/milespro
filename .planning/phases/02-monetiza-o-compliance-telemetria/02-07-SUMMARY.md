---
phase: 02-monetiza-o-compliance-telemetria
plan: 07
subsystem: asaas-production-cutover + nfse + portal-link
tags: [production-cutover, asaas-live, nfse, pj-blocker, pay-05, pay-08, launch-readiness, code-ready-cnpj-pending]
dependency_graph:
  requires:
    - 02-05 (create-checkout-session + asaas-webhook + reconcile cron — verified live in prod 2026-05-16)
    - 02-06 (handlePlanCta + iOS Path C + Assinatura.tsx contract — verified live in prod)
  provides:
    - "ASAAS_INVOICE_ENABLED operator kill-switch (env-driven, default ON)"
    - "PAY-05 'Gerenciar assinatura' UI panel on /assinatura for active subscribers"
    - "02-07-CUTOVER-RUNBOOK.md — self-contained operator runbook for the production flip"
    - "02-07-NFSE-MUNICIPAL-SETUP.md — contador conversation guide + Asaas municipalSettings template"
    - ".env.example documentation that Asaas secrets are server-side only"
  affects:
    - "supabase/functions/create-checkout-session/index.ts — flipped invoice.enabled to env-gated default-ON"
    - "src/pages/Assinatura.tsx — new active-subscription management panel"
    - ".env.example — Asaas server-side block + VITE_ENABLE_SUBSCRIPTION_LEADS shadow log note"
tech_stack:
  added:
    - "Env-gated conditional spread (`...(INVOICE_ENABLED ? { invoice: { enabled: true } } : {})`) — operator kill-switch idiom for Asaas-side optional features"
  patterns:
    - "shadcn `Button asChild` + external `<a target=_blank rel=noopener noreferrer>` for portal hand-offs (security-safe external link)"
    - "Runbook structure: pre-flight schema sanity → secret smoke on paste (early-fail cheap) → idempotency re-verification → smoke transaction → refund roundtrip → reconcile gate → rollback ladder"
key_files:
  created:
    - ".planning/phases/02-monetiza-o-compliance-telemetria/02-07-CUTOVER-RUNBOOK.md"
    - ".planning/phases/02-monetiza-o-compliance-telemetria/02-07-NFSE-MUNICIPAL-SETUP.md"
    - ".planning/phases/02-monetiza-o-compliance-telemetria/02-07-SUMMARY.md"
  modified:
    - "supabase/functions/create-checkout-session/index.ts"
    - "src/pages/Assinatura.tsx"
    - ".env.example"
decisions:
  - "INVOICE_ENABLED default ON in production via `Deno.env.get('ASAAS_INVOICE_ENABLED') !== 'false'` — kill-switch is explicit-opt-out not explicit-opt-in (cheaper for the founder ops flow; safer because Asaas itself rejects the block when municipalSettings is absent)"
  - "PAY-05 button uses Asaas public /customer-area URL (CPF + email login) instead of a per-customer signed deep link — Asaas does not expose signed deep links in the public API as of W3 research; revisit if/when they ship one"
  - "subscription_leads pipeline confirmed as shadow log only (D-11): VITE_ENABLE_SUBSCRIPTION_LEADS unset by default in .env.example, callers (Assinatura.tsx + AnimatedSections.tsx) only invoke from create-checkout-session asaas_failure path — no production write path"
  - "Tasks 1+2+6 deferred to CNPJ unblock — code+runbooks ready, operator runs the cutover when Asaas production account is approved"
  - "Account-default-via-Asaas-support is the preferred NFS-e propagation strategy (Option b); backend automation in create-checkout-session is the fallback (Option a — 5 lines + 1 test if needed)"
metrics:
  duration_min: 18
  completed_date: 2026-05-16
  tasks_total: 6
  tasks_completed_now: 3
  tasks_deferred_cnpj: 3
  files_created: 3
  files_modified: 3
  commits: 3
  tests_passed: 137
  tests_files: 28
  typecheck_errors: 0
  lint_errors: 0
  lint_warnings_pre_existing: 3
---

# Phase 02 Plan 07: W3 Production Cutover (Code+Runbooks) Summary

One-liner: code changes (invoice kill-switch + PAY-05 portal link) and operational runbooks (cutover + NFS-e setup) ready; operational tasks deferred to CNPJ unblock per founder strategic decision (web-first revenue, CNPJ in progress with accountant).

## Scope executed in this session

This session was explicitly scoped to the **code and documentation** subset of plan 02-07 — the bulk of the plan (CNPJ onboarding, Asaas Dashboard config, real-money smoke, refund roundtrip, production G-CRIT-04 re-verification) is gated by Asaas production account approval which itself is gated by the founder's CNPJ constitution (in progress with accountant, ETA weeks).

The decision to ship code+runbooks now is sound:
- Reduces critical-path work the founder must do once CNPJ lands (just follow the runbook)
- Catches integration regressions early (typecheck + 137 vitest tests verify nothing else broke)
- Provides a tangible checkpoint artifact future agents can resume from with full context

## Tasks completed (this session)

| Task | Type | Commit | Status |
|------|------|--------|--------|
| 3. Flip `invoice.enabled` flag in create-checkout-session (PAY-08) | auto | `e926e4c` | done |
| 4. Add PAY-05 "Gerenciar assinatura" button to Assinatura.tsx | auto | `cb0a317` | done |
| 5. Write CUTOVER + NFS-e runbooks + .env.example doc | auto | `60300e3` | done |

## Tasks deferred to CNPJ unblock

These three tasks are `checkpoint:human-action` / `checkpoint:human-verify` per the plan's frontmatter `autonomous: false`. None can be executed by Claude — they require real money, a real CNPJ-approved Asaas production account, and a real conversation with the contador.

| Task | Type | Why deferred | Unblocked by |
|------|------|--------------|--------------|
| 1. [Operator] CNPJ + Asaas onboarding | checkpoint:human-action | Asaas approval needs PJ docs (contrato social, comprovante de endereço, dados bancários PJ); 2-7 business days after submission | CNPJ ativo + PJ docs submitted |
| 2. [Operator] NFS-e municipal setup (PAY-08) | checkpoint:human-action | Requires contador conversation (off-platform); requires founder customer existing in production Asaas | Contador call + Task 1 done |
| 6. [Verify] Production smoke — G-CRIT-04 re-run + founder payment + refund | checkpoint:human-verify | Requires real R$ 37,90 charge against production Asaas; double-fire curl with production `ASAAS_WEBHOOK_TOKEN` | Task 1 + Task 2 done |

When CNPJ lands, founder follows `02-07-CUTOVER-RUNBOOK.md` end-to-end — Claude can be re-invoked to triage curl output / SQL output / Sentry logs but the click-through is the founder's. The runbook is self-contained for that purpose.

## Files

### Created

- `.planning/phases/02-monetiza-o-compliance-telemetria/02-07-CUTOVER-RUNBOOK.md` — 10-section operator runbook (pre-flight checklist → schema sanity → set secrets → secret smoke → Asaas Dashboard webhook config → G-CRIT-04 re-verify → founder smoke → NFS-e verify → refund roundtrip → reconcile cron → admin metrics → final hardening → 3-level rollback ladder → 72h post-cutover monitoring → appendices)
- `.planning/phases/02-monetiza-o-compliance-telemetria/02-07-NFSE-MUNICIPAL-SETUP.md` — contador conversation checklist (5 required values), Asaas /municipalServices lookup template, /municipalSettings POST template, decision matrix for backend-automation vs account-default propagation, webhook event names ([ASSUMED] per RESEARCH §2.7), v2 deferral plan
- `.planning/phases/02-monetiza-o-compliance-telemetria/02-07-SUMMARY.md` — this file

### Modified

- `supabase/functions/create-checkout-session/index.ts`:
  - Added `INVOICE_ENABLED` constant (reads `ASAAS_INVOICE_ENABLED` env var; default ON)
  - Replaced hard-coded `invoice: { enabled: false }` with `...(INVOICE_ENABLED ? { invoice: { enabled: true } } : {})` in subscription create body
  - Added two comment blocks explaining the kill-switch semantics and the Asaas server-side prerequisite (municipalSettings)
- `src/pages/Assinatura.tsx`:
  - Pulled `isActive` from `useSubscription()` (already exposed by the hook — no hook change needed)
  - Added `hasActiveSubscription = (isPro || isVip) && isActive` boolean
  - New `<Card>` panel rendered conditionally before the pricing cards, using `Button asChild` + `<a target=_blank rel=noopener noreferrer>` pointing at `https://www.asaas.com/customer-area`
  - iOS Path C: pre-existing early-return at the top of the component already short-circuits before this panel; verified with `grep -n "if (isIOS)" src/pages/Assinatura.tsx` shows the iOS branch is line ~181, well before our new render at the body section
- `.env.example`:
  - Added new section "Asaas (gateway de pagamento)" with explicit "Asaas secrets are server-side ONLY" warning and full list of canonical secret names (`ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `ASAAS_ENV`, `ASAAS_RECONCILE_AUTH_TOKEN`, `ASAAS_INVOICE_ENABLED`) plus cross-refs to both runbooks
  - Documented `VITE_ENABLE_SUBSCRIPTION_LEADS` as shadow log (D-11), disabled by default — sets explicit expectation that the lead-capture pipeline is fallback-only

## Verification status

- `npm run typecheck` — **0 errors** (clean)
- `npm run lint` — **0 errors, 3 warnings** (all 3 pre-existing in unrelated files: `OrcamentoFormDialog.tsx`, `program-logo.tsx`, `ManagedAccountContext.tsx` — deferred, not in scope)
- `npm test -- --project=unit --run` — **28 files, 137 tests passing** (including `src/pages/__tests__/Assinatura.test.tsx` — confirms PAY-05 panel addition did not regress existing rendering tests)
- Integration tests (`--project=integration`) — 3 files fail with `Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY`; this is **pre-existing** infrastructure (requires local `supabase start` + `supabase status -o env`), NOT caused by this plan's changes. Same baseline as the pre-edit state.
- Plan automated verifies — all green: Task 3 `OK: invoice flag flipped`, Task 4 `OK: PAY-05 portal button`, Task 5 `OK: runbooks` + `OK: .env.example`.

### Self-Check

Files claimed to be created:
- `02-07-CUTOVER-RUNBOOK.md` → FOUND
- `02-07-NFSE-MUNICIPAL-SETUP.md` → FOUND
- `02-07-SUMMARY.md` → FOUND (this file)

Commits claimed:
- `e926e4c` → FOUND in `git log`
- `cb0a317` → FOUND
- `60300e3` → FOUND

Self-Check: PASSED.

## must_haves.truths — observable state

The plan declares 13 truths. Status of each AFTER this session:

| # | Truth | Status |
|---|-------|--------|
| 1 | `ASAAS_ENV='production'` in Lovable secrets | DEFERRED — runbook step §2 |
| 2 | Production `ASAAS_API_KEY` set | DEFERRED — runbook §2 |
| 3 | `create-checkout-session` points at `api.asaas.com/v3` when `ASAAS_ENV='production'` | CODE READY (ternary unchanged from W2a; still correct) |
| 4 | Webhook URL registered in Asaas Dashboard with prod token | DEFERRED — runbook §3 |
| 5 | All 11 events subscribed | DEFERRED — runbook §3.4 (events enumerated) |
| 6 | Founder's `profiles.asaas_customer_id` set in prod | DEFERRED — happens automatically on first checkout (runbook §5) |
| 7 | Test subscription with founder CPF flows through to `user_subscriptions.status='active'` in 60s | DEFERRED — runbook §5 |
| 8 | PAY-05 "Gerenciar assinatura" button on /assinatura | **OBSERVABLE NOW** — Task 4 shipped (Assinatura.tsx; iOS-suppressed by pre-existing early-return) |
| 9 | `invoice: { enabled: true }` AFTER municipal setup | CODE READY — Task 3 shipped with kill-switch; activates by default in production where municipal setup is done |
| 10 | Refund roundtrip flips `is_active=false` in 60s | DEFERRED — runbook §7 (W2a handler already implements this; just needs real refund to verify) |
| 11 | Reconcile cron `drift_count = 0` post-cutover | DEFERRED — runbook §8 (cron deployed in W2a, verified live 2026-05-16) |
| 12 | G-CRIT-04 re-verified with prod token | DEFERRED — runbook §4 |
| 13 | `subscription_leads` pipeline disabled (shadow log only) | **OBSERVABLE NOW** — `.env.example` documents the env var as unset/default-false; `subscriptionLeads.ts` returns early if `import.meta.env.VITE_ENABLE_SUBSCRIPTION_LEADS !== 'true'`; callers (Assinatura.tsx + AnimatedSections.tsx) call only on `asaas_failure` path |

3 truths observable now; 10 are CNPJ-gated and become observable once founder runs the runbook.

## must_haves.artifacts — coverage

| Path | Required `contains` | Present? |
|------|---------------------|----------|
| `supabase/functions/create-checkout-session/index.ts` | `invoice: { enabled: true }` | YES (inside the conditional spread) |
| `src/pages/Assinatura.tsx` | `Gerenciar assinatura` | YES (new Card panel) |
| `src/lib/subscriptionLeads.ts` | `createSubscriptionLead` | YES (pre-existing; no edit needed — function is already there, the `VITE_ENABLE_SUBSCRIPTION_LEADS` guard short-circuits it in prod) |
| `.env.example` | `Asaas secrets are server-side` | YES (new Asaas block) |
| `02-07-CUTOVER-RUNBOOK.md` | `Rollback` | YES (dedicated section with 3-level ladder) |
| `02-07-NFSE-MUNICIPAL-SETUP.md` | `municipalServiceCode` | YES (in checklist + curl template) |

All 6 artifacts present with declared content. ✓

## Deviations from Plan

### None requiring user permission

- The plan body for Task 4 suggested wrapping the panel in `<div className="container mx-auto py-8 mb-8 text-center">`. I rendered it as a shadcn `<Card>` with `border-primary/30 bg-primary/5` instead, matching the existing visual language of the rest of `/assinatura` (Support CTA at the bottom uses the same pattern). Functionally identical; rationale: design consistency. The `must_haves` `contains: "Gerenciar assinatura"` + `hasActiveSubscription` + `target="_blank"` + `rel="noopener noreferrer"` + `customer-area` are all preserved.

### Out-of-scope items NOT touched (per execution_protocol §4)

- 3 pre-existing lint warnings in `OrcamentoFormDialog.tsx`, `program-logo.tsx`, `ManagedAccountContext.tsx` — unrelated to this plan; logged here for visibility but not fixed.
- Integration test failures (`Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY`) require local Supabase running, which is a developer-environment concern not a Phase 2 concern.

## Cross-phase handoff

Once founder completes Tasks 1+2+6 (CNPJ unblock) via the runbook:
- Phase 2 success criteria #1 (end-to-end Asaas checkout works) is empirically verified
- Phase 2 success criteria #2 (webhook idempotency proven by replay) is empirically verified (G-CRIT-04 re-run)
- Phase 2 success criteria #5 (production web live + instrumented) is fully closed
- Phase 3 (mobile distribution) is fully unblocked — Universal Links can register against `app.milespro.net.br` and the app can rely on real subscriptions existing in production

## Cross-references

- `02-07-PLAN.md` — full plan with task definitions
- `02-07-CUTOVER-RUNBOOK.md` — operator step-by-step for CNPJ unblock window
- `02-07-NFSE-MUNICIPAL-SETUP.md` — contador conversation + Asaas API template
- `02-05-SUMMARY.md` — Asaas scaffold (W2a, verified live in prod)
- `02-06-SUMMARY.md` — TIER UI + Path C + multi-CPF (verified live in prod)
- `02-CONTEXT.md` — D-21 (PJ wave decoupling — cutover is W3) + D-22 (NFS-e bundle Asaas)
- `02-RESEARCH.md §2.7` — NFS-e prerequisites + Asaas mechanics

## Worktree / branch

- Worktree path: `C:\Users\Machado\Milespro\miles-pro-hub\.claude\worktrees\agent-ab4b1577c383b212f`
- Branch: `worktree-agent-ab4b1577c383b212f`
- Base commit: `d550abc61953c858ef7264436b0a85a9435f0d44` (main HEAD at session start)
- New commits (3): `e926e4c`, `cb0a317`, `60300e3`
