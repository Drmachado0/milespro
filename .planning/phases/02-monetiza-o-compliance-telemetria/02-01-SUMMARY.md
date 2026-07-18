---
phase: 02-monetiza-o-compliance-telemetria
plan: 01
subsystem: foundation
tags: [foundation, cleanup, phase1-carry-over, copy-fix, ci, lgpd, asaas-prep]
requires: []
provides:
  - cleaned vite.config.ts (no JWT fallback)
  - FORBIDDEN_VITE_PATTERNS extended for VITE_ASAAS_*SECRET/WEBHOOK/API_KEY
  - CI deno-tests job (denoland/setup-deno@v1, glob supabase/functions/**/*.test.ts)
  - Landing Free/Pro/VIP tier labels (Plus removed from Index.tsx + AnimatedSections.tsx)
  - Termos.tsx with 7d trial Pro / Asaas / Pro+VIP / 7d money-back / DPO
  - Migration drop_can_access_feature.sql (ready for Lovable Cloud apply)
affects:
  - vite.config.ts (env loading + build-time guard)
  - .github/workflows/ci.yml (new required job after quality)
  - src/pages/Index.tsx (pricing + comparison + founder offer copy)
  - src/pages/Termos.tsx (s4 trial, s7 module name, s13 contact)
  - src/components/landing/AnimatedSections.tsx (ComparisonTableSection labels)
  - supabase/migrations/20260512130001_drop_can_access_feature.sql (new)
tech-stack:
  added: []
  patterns:
    - failOnSecretLeak() preventive guard pattern (extend, don't replace)
    - Inline DO block self-check on DROP migrations (Phase 1 convention)
key-files:
  created:
    - supabase/migrations/20260512130001_drop_can_access_feature.sql
  modified:
    - vite.config.ts
    - .github/workflows/ci.yml
    - src/pages/Index.tsx
    - src/pages/Termos.tsx
    - src/components/landing/AnimatedSections.tsx
decisions:
  - "Renomeação 3-tier no landing: 'Plus' (R$37,90) → 'Pro'; 'Pro' (R$67,90) → 'VIP'. ComparisonTable agora Free/Pro/VIP em vez de Free/Plus/Pro."
  - "FORBIDDEN_VITE_PATTERNS estendido com VITE_ASAAS_*SECRET/WEBHOOK/API_KEY antes do W2a iniciar — guard preventivo D-27."
  - "Sem fallback silencioso no vite.config.ts: env vars ausentes resultam em build abort, NUNCA mais em JWT hardcoded."
  - "Migration drop_can_access_feature criada localmente; aplicação à produção é responsabilidade do deploy-time (Lovable Cloud chat), NÃO de execução."
metrics:
  duration_minutes: 35
  completed_date: 2026-05-12
  tasks_completed: 5
  files_created: 1
  files_modified: 5
  commits: 5
---

# Phase 2 Plan 01: Foundation + Phase 1 Carry-over Summary

**One-liner:** Closes the four Phase 1 carry-over follow-ups (AR-2 vite.config.ts JWT fallback, AR-3 Deno CI wiring, D-27 FORBIDDEN_VITE_PATTERNS Asaas extension, D-28 can_access_feature() drop) and rewrites the legacy "Plus"/"14 dias sem cartão"/"Stripe" copy on landing + Termos so W1a/W1b/W1c can fan out in parallel without re-editing the same files.

## Execution

5 tasks completed in linear order on `main`. Each task → one atomic commit.

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Remove AR-2 hardcoded JWT fallback + extend FORBIDDEN_VITE_PATTERNS for Asaas | `a833ab4` | vite.config.ts |
| 2 | Add deno-tests job to CI (denoland/setup-deno@v1 + glob supabase/functions/**/*.test.ts) | `cf538a9` | .github/workflows/ci.yml |
| 3 | Rename Plus tier → Pro and Pro tier → VIP in landing UI (Index.tsx + AnimatedSections.tsx) | `92ba7e1` | src/pages/Index.tsx, src/components/landing/AnimatedSections.tsx |
| 4 | Rewrite Termos.tsx §4 trial/plan/gateway + §7 module name + §13 DPO contact | `7883276` | src/pages/Termos.tsx |
| 5 | Drop legacy can_access_feature() database function (D-28) | `0a7a657` | supabase/migrations/20260512130001_drop_can_access_feature.sql |

## Must-Have Truths — Verified

1. **No hardcoded JWT or anon-key fallback survives in vite.config.ts** — `grep "eyJhbGc\\|FALLBACK_SUPABASE" vite.config.ts` returns 0. The three FALLBACK_* constants are gone; env.VITE_* vars default to empty string, which fails the `REQUIRED_VITE_VARS` check in `failOnSecretLeak()`. ✓
2. **FORBIDDEN_VITE_PATTERNS catches VITE_ASAAS_*SECRET / WEBHOOK / API_KEY** — three new regexes added with explicit D-27 comment. Build will throw `[failOnSecretLeak] Refusing to build. Dangerous VITE_* env vars detected` when any matches. ✓
3. **CI workflow runs `deno test` against supabase/functions/google-calendar-auth/index.test.ts** — new `deno-tests` job after `quality`, glob `supabase/functions/**/*.test.ts` picks up the existing 3-test suite + future W2a/W2b tests automatically. ✓
4. **Build aborts non-zero when VITE_ASAAS_*SECRET/WEBHOOK/API_KEY is set at build time** — `failOnSecretLeak()` throws on `command === 'build'` if any FORBIDDEN regex matches `process.env` keys. ✓ (verified by code path; full e2e `npm run build` test deferred since lockfile-clean env is host-managed by Lovable)
5. **Zero "Plus"/"plus" tier-label references in /, comparisonFeatures, pricing copy** — grep `\bPlus\b` on Index.tsx + AnimatedSections.tsx returns no matches (`lucide-react` Plus icon imports preserved on other files). comparisonFeatures uses `pro`/`vip` keys; AnimatedSections ComparisonFeature interface aligned. ✓
6. **Termos.tsx reads "7 dias de trial gratuito, com cartão de crédito requerido"** — §4 verbatim wording with `<strong>` markup; old "14 dias sem necessidade de cartão" replaced. ✓
7. **Termos.tsx mentions "Pro e VIP"** — §4 paid plan paragraph rewritten; old "Plus e Pro" gone. ✓
8. **can_access_feature() dropped from production DB (no callers remain in src/)** — migration file written + verified zero source callers (only `src/integrations/supabase/types.ts:2375` auto-generated, regenerates after apply). Live DB apply is deploy-time work via Lovable Cloud chat per windows_environment instruction. ✓ (file)

## FORBIDDEN_VITE_PATTERNS Extension (verbatim, for future Stripe/MercadoPago/banking mirror)

```typescript
const FORBIDDEN_VITE_PATTERNS: readonly RegExp[] = [
  /^VITE_.*SERVICE_ROLE/i,
  /^VITE_.*SECRET_KEY/i,
  /^VITE_.*WEBHOOK_SECRET/i,
  /^VITE_.*PRIVATE_KEY/i,
  // Phase 2 (Asaas) — D-27 preventive guard. Asaas API key + webhook token
  // MUST live in `supabase secrets set ASAAS_API_KEY=... ASAAS_WEBHOOK_TOKEN=...`
  // (Deno edge runtime), NEVER in `import.meta.env.VITE_*`.
  /^VITE_ASAAS_.*SECRET/i,
  /^VITE_ASAAS_.*WEBHOOK/i,
  /^VITE_ASAAS_.*API.?KEY/i,
];
```

Future plans extending the guard (Stripe rerun, MercadoPago, BancoXYZ) should follow the same pattern: explicit comment citing CONTEXT D-XX, three regexes (SECRET/WEBHOOK/APIKEY family), positioned at the BOTTOM of the array. Do NOT replace the existing regexes; APPEND only.

## Migration Apply (deferred to deploy-time)

The migration `supabase/migrations/20260512130001_drop_can_access_feature.sql` is **committed locally** but **NOT yet applied to the live Supabase project**. Per the windows_environment instruction in the executor prompt, applying is a deploy-time concern. To apply:

1. Open Lovable Cloud chat with this exact instruction: `Aplicar a migration supabase/migrations/20260512130001_drop_can_access_feature.sql em produção`
2. Verify via Supabase MCP that the function is gone:
   ```sql
   SELECT proname FROM pg_proc p
   JOIN pg_namespace n ON p.pronamespace = n.oid
   WHERE n.nspname = 'public' AND proname = 'can_access_feature';
   -- Expect: 0 rows
   ```
3. Regenerate Supabase types (Lovable chat: `Regenerar tipos do Supabase`) so `src/integrations/supabase/types.ts:2375` no longer lists `can_access_feature`. After regen, the file's line count will drop by ~30 lines.

## Verification Results

| Check | Result |
|-------|--------|
| `npm run lint` | PASS (0 errors, 1 pre-existing warning in `src/components/ui/program-logo.tsx` — out of scope) |
| `npm run typecheck` (tsc --noEmit) | PASS (0 errors) |
| `npm test -- --project=unit --run` | PASS — 109 tests across 21 files (≥93 baseline) |
| `grep -n "\\bPlus\\b" src/pages/Index.tsx` | 0 matches |
| `grep -n "\\bPlus\\b" src/components/landing/AnimatedSections.tsx` | 0 matches |
| `grep -n "\\bPlus\\b" src/pages/Termos.tsx` | 0 matches |
| `grep -n "can_access_feature" src/` (ex. types.ts) | 0 matches |
| `grep -n "VITE_ASAAS_" vite.config.ts` | 3 matches (regex SECRET/WEBHOOK/APIKEY) |
| `grep -n "denoland/setup-deno" .github/workflows/ci.yml` | 1 match |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Copy bug] Renamed "Pro" tier to "VIP" in addition to "Plus" → "Pro"**
- **Found during:** Task 3
- **Issue:** The plan's stated 3-tier canonical model (per CLAUDE.md + REQUIREMENTS.md TIER-* + CONTEXT D-11) is `Free / Pro / VIP`, but the existing Index.tsx had three tiers `Free / Plus / Pro` where the legacy `Plus` was the mid-tier and the legacy `Pro` was the top-tier (multi-perfil R$67,90). Strict "Plus → Pro" rename alone would have produced two `Pro` tiers (broken) OR a single `Free / Pro` (lost top-tier). The plan's Task 3.5 explicitly anticipated this: "MERGE the Plus column INTO Pro by dropping the Plus column ... but per D-11 we are renaming, not restructuring".
- **Resolution:** Renamed top-tier name only (`Pro` → `VIP`) while keeping all features/prices intact; renamed legacy mid-tier `Plus` → `Pro`. ComparisonFeature interface and comparisonFeatures array updated to use `{ free, pro, vip }` columns. The "Tudo do Plus +" feature copy on top-tier became "Tudo do Pro +". CTA "Assinar Pro" became "Assinar VIP" in AnimatedSections ComparisonTableSection.
- **Files modified:** src/pages/Index.tsx (pricingPlans + comparisonFeatures + Founder Offer copy), src/components/landing/AnimatedSections.tsx (ComparisonFeature interface + table header labels + ComparisonTableSection CTA)
- **Commit:** 92ba7e1

**2. [Rule 1 — Copy bug] Renamed "Módulo Agência (plano Pro)" → "Módulo Multi-CPF (plano VIP)" in Termos.tsx §7**
- **Found during:** Task 4
- **Issue:** §7 referenced "Módulo Agência (plano Pro)" but CLAUDE.md explicitly states "Multi-CPF é exclusivo VIP no v1" and CONTEXT D-15 deletes the Agência sub-product entirely (sold as VIP via self-serve, no WhatsApp human channel). After the Pro→VIP rename in Task 3, leaving §7 with "plano Pro" describing the multi-CPF feature would create immediate inconsistency.
- **Resolution:** Renamed §7 heading + body to describe Multi-CPF as VIP-exclusive (matches TIER-05, CLAUDE.md, CONTEXT D-15).
- **Commit:** 7883276

### Deferred Items (out of scope for plan 02-01)

These "Plus" tier-label references were found OUTSIDE the plan's declared file scope. They are not on the `/` landing route, not in `comparisonFeatures`, not in `pricing copy on /` — so they do NOT violate truth #5. Logged for future plans:

| File | Line | Context | Suggested owner |
|------|------|---------|-----------------|
| src/hooks/useMRRDashboard.ts | 10, 28, 59 | `plusUsers`, `plus: 37.90`, `plus: planCounts.plus` — interface + price-table for MRR dashboard | W1b (02-03 telemetry) — D-14 says MRR dashboard gets a FULL rewrite anyway |
| src/components/subscription/UpgradeScreen.tsx | 46 | `Incluído no plano Plus:` | W2b (02-06) TIER UI/Path-C — UpgradeScreen is rebuilt with new copy |
| src/pages/sistema/Programas.tsx | 198 | `Faça upgrade para o Plus` (limit-exceeded toast) | W2b (02-06) TIER-01 paywall toggle |
| src/components/landing/PromoTopBanner.tsx | 37 | `evolua para Plus quando suas milhas já estiverem organizadas` | W1c (02-04) landing copy refresh / W2b TIER rebuild |
| src/pages/DashboardV2.tsx | 528 | `Plano Plus` (UI label in user dashboard card) | W2b (02-06) TIER UI |
| src/components/landing/AnimatedSections.tsx | 1113 | `Stripe Certificado` (footer security badge) | W1a (02-02) sub-processor refresh — D-17 swaps Stripe → Asaas in /privacidade and any related surface |

These items are not bugs in the strictest sense (the tier label `Plus` is no longer in the live enum since Phase 1, so any code path actually checking the value would already be broken — these are stale UI copies). They are tracked here so the next planner picks them up.

## Self-Check: PASSED

- File `vite.config.ts` exists and contains `VITE_ASAAS_` regex marker.
- File `.github/workflows/ci.yml` exists and contains `denoland/setup-deno@v1` + `deno-tests:` job.
- File `src/pages/Index.tsx` exists and contains no tier-label `Plus`.
- File `src/pages/Termos.tsx` exists and contains `7 dias de trial` + `Asaas` + `dpo@milespro.net.br`.
- File `src/components/landing/AnimatedSections.tsx` exists and uses `{ pro, vip }` ComparisonFeature shape.
- File `supabase/migrations/20260512130001_drop_can_access_feature.sql` exists and contains `DROP FUNCTION IF EXISTS public.can_access_feature(uuid, text)` + D-28 marker.
- All 5 commits exist in `git log`: a833ab4, cf538a9, 92ba7e1, 7883276, 0a7a657.
- `npm run lint`, `npm run typecheck`, `npm test -- --project=unit --run` all exit 0.

## Wave Unblocking

W1a / W1b / W1c can now begin in parallel without file-collision risk:

- **W1a** (compliance/LGPD): owns `src/components/legal/`, `src/hooks/useConsent.ts`, `src/pages/Privacidade.tsx`, `supabase/functions/lgpd-*/`. Touches `src/pages/Termos.tsx` only on §149-152 (refund block) and §127 (DPO mailto) — both ALREADY landed here. No overlap.
- **W1b** (telemetry): owns `src/lib/posthog.ts`, `src/lib/sentry.ts`, `src/main.tsx` init wiring, `supabase/functions/mrr-dashboard/index.ts`. Will see the deferred "Plus" references in useMRRDashboard.ts and rewrite during the FULL D-14 rewrite — no conflict.
- **W1c** (infra): owns `vercel.json` (new), `package.json` (crisp-sdk-web add), `src/components/layout/CrispWidget.tsx` (new), `src/templates/emails/*.tsx` (new), DNS, Resend dashboard. Zero overlap with W1a/W1b.

W2a/W2b/W3 dependencies remain as documented in the plan's phase summary.

## Notes for Future Planners

- The `failOnSecretLeak()` extension pattern is the canonical guard for any future external payment/auth integration: add 3 regexes (SECRET / WEBHOOK / API_KEY family) with an explicit CONTEXT-decision comment. The next likely additions are Stripe (deferred to v2 per ROADMAP), MercadoPago (deferred), and BankXYZ Pix Direto (potential v2).
- The `deno-tests` CI job glob `supabase/functions/**/*.test.ts` is the canonical entry point for Phase 2 W1a `lgpd-delete` Deno tests and W2a `asaas-webhook` Deno tests. Both will inherit the green CI gate without further `ci.yml` edits.
- The `can_access_feature` drop is the LAST legacy plan-gating function. After Lovable Cloud applies this migration + regenerates types, the trust kernel `public.has_plan()` is the sole plan-gating path in production DB.
