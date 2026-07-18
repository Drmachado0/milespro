---
phase: 01-security-foundation-hardening
plan: 02
subsystem: trust-kernel / enum-consolidation
tags: [supabase, migration, enum, typescript, refactor, SEC-05]
requires:
  - 01-01-test-foundation (Wave 0 — already complete; baseline vitest infra)
provides:
  - canonical subscription_plan enum {free, pro, vip} in DB
  - canonical SubscriptionPlan TS union 'free' | 'pro' | 'vip'
  - VALID_PLANS runtime validation guard in useSubscription.ts (B-2 Option A)
  - free/pro/vip recreated trust-kernel SQL functions (get_user_plan,
    can_access_feature, can_create_operation, count_monthly_operations,
    handle_new_user) — recreated with canonical enum signatures
  - aligned subscription_leads.plan_interest CHECK constraint
affects:
  - 01-04-trust-kernel-functions (next wave — has_plan() will reference this enum)
  - 01-05-rls-rewrites          (Wave 3 — RLS policies will reference has_plan())
  - 01-06-deploy-and-prod-validation (Wave 4 — owns the supabase db push gate)
tech-stack:
  added: []
  patterns:
    - "Postgres recreate-type pattern (RENAME old / CREATE new / ALTER COLUMN ... USING / DROP old)"
    - "Single-transaction enum reduction with CASE-based USING expression"
    - "VALID_PLANS runtime validation guard for collapse-logic regression protection"
    - "Migration comment block convention (Forward + Reverse + Pre-check)"
key-files:
  created:
    - supabase/migrations/20260512120001_consolidate_subscription_plan_enum.sql
    - supabase/migrations/20260512120002_align_subscription_leads_plan_check.sql
  modified:
    - src/hooks/useSubscription.ts
    - src/components/PlanProtectedRoute.tsx
    - src/components/UpgradeBanner.tsx
    - src/components/UpgradePrompt.tsx
    - src/components/landing/AnimatedSections.tsx
    - src/components/layout/Sidebar.tsx
    - src/components/layout/sidebar/SidebarNavGroup.tsx
    - src/components/layout/sidebar/SidebarUserInfo.tsx
    - src/config/sidebarNavigation.ts
    - src/lib/subscriptionLeads.ts
    - src/pages/Analises.tsx
    - src/pages/Assinatura.tsx
    - src/pages/Relatorios.tsx
    - src/pages/Simulador.tsx
    - src/pages/sistema/Programas.tsx
    - src/App.tsx
    - src/integrations/supabase/types.ts
decisions:
  - "Recreate-type pattern (not ADD VALUE) per RESEARCH Pitfall 2"
  - "Big-bang refactor in single PR per CONTEXT D-02"
  - "VALID_PLANS runtime guard replaces deleted collapse logic (B-2 Option A)"
  - "Sidebar 6 legacy-mid-tier nav items all re-tiered to 'pro' (W-3 preflight)"
  - "subscription_leads CHECK constraint migrated as Rule 1/2 deviation auto-fix"
metrics:
  duration: "~45min author + verify"
  completed_date: "2026-05-12"
  tasks_completed: 3
  files_changed: 19 (2 created + 17 modified)
---

# Phase 01 Plan 02: subscription_plan Enum Consolidation Summary

One-liner: Collapsed the 5-value Postgres `subscription_plan` enum (`free`, `pro`,
`agency`, `basic`, `pro_familia`) down to 3 canonical values (`free`, `pro`, `vip`)
in a single-transaction recreate-type migration AND atomically refactored every
TypeScript consumer to match — eliminating the "works by accident" 5-vs-3 mismatch
called out in CONCERNS.md HIGH-04.

## Objective Achieved

Eliminated the 5-vs-3 plan-enum mismatch (CONCERNS HIGH-04) by consolidating both
the Postgres `subscription_plan` enum AND the TypeScript representation in a single
coordinated Plan 02 PR. After this plan:

- DB enum is exactly `{free, pro, vip}`
- TypeScript type is exactly `'free' | 'pro' | 'vip'`
- Zero `'plus'` literals, `isPlus`, or `canAccessPlus` identifiers exist anywhere
  in `src/`
- The `useSubscription.ts:240-245` collapse logic that mapped `basic|plus → pro`
  is deleted and replaced with the **VALID_PLANS runtime validation guard**
  (Plan 02 B-2 Option A) that defaults any non-canonical DB value to `'free'`

This unblocks Plan 04 (trust kernel `has_plan()`) and Plan 05 (RLS rewrites) which
require the canonical 3-value enum to express `has_plan(uid, 'pro')` correctly.

## Semantic Mapping (CONTEXT D-01)

Captured in the migration comment block at the top of
`supabase/migrations/20260512120001_consolidate_subscription_plan_enum.sql`:

| Old value | New value | Notes |
|-----------|-----------|-------|
| `free` | `free` | no-op |
| `pro` | `pro` | no-op (legacy `pro` from initial migration; was conflated with `basic` by 20260206223931) |
| `agency` | `vip` | direct CASE mapping in step 5 |
| `pro_familia` | `vip` | backfilled to `agency` in step 0, then mapped to `vip` in step 5 |
| `basic` | `pro` | backfilled to `pro` in step 0 (before type change) |

The migration includes a commented rollback block at the bottom for emergency
revert. Reverse mapping (lossy): `vip → agency`, `pro → pro`, everything else
defaults to `free`.

## Pattern Used (vs Forbidden ADD VALUE)

This migration uses the **recreate-type pattern** (RESEARCH §Pattern 5, lines
500-581). The forbidden additive pattern (`ALTER TYPE subscription_plan ADD VALUE`)
used in legacy migration `20260206223914_*.sql` cannot be used in the same
transaction as an `UPDATE` of the new value (RESEARCH Pitfall 2 — Postgres
limitation, [postgresql.org/docs/current/sql-altertype.html]).

Sequence in `20260512120001_*.sql`:

1. **Backfill** legacy values BEFORE type change so the CASE in step 5 only sees mappable values
2. **DROP FUNCTION CASCADE** for all 5 enum-dependent functions (get_user_plan, can_access_feature, can_create_operation, count_monthly_operations, handle_new_user)
3. **DROP DEFAULT** on `user_subscriptions.plan` (cannot ALTER TYPE while default uses old type)
4. **RENAME old type** to `subscription_plan_old`
5. **CREATE TYPE** the new canonical enum `('free', 'pro', 'vip')`
6. **ALTER COLUMN ... USING (CASE ...)** to convert rows
7. **RESTORE DEFAULT** with the new type
8. **DROP TYPE** `subscription_plan_old`
9. **Recreate** the 5 dropped functions against the new enum
10. **Re-attach** the `on_auth_user_created` trigger to `auth.users`

All wrapped in a single `BEGIN; ... COMMIT;`. Postgres DDL is fully transactional
for these operations.

## Per-File 'plus' → 'pro'/'vip' Rewrites

Diff stat for Task 3 commit `57cf305`:

```
 18 files changed, 261 insertions(+), 171 deletions(-)
```

Per-file summary:

| File | Rewrite |
|------|---------|
| `src/hooks/useSubscription.ts` | type collapsed; collapse CASE deleted; VALID_PLANS guard added; PLUS_FEATURES → PRO_FEATURES; new VIP_FEATURES block; isPlus/canAccessPlus → isVip/canAccessVip |
| `src/components/PlanProtectedRoute.tsx` | gate logic switches 'plus' branch to 'pro'/'vip'; destructure uses canAccessPro and canAccessVip |
| `src/App.tsx` | `/lancamentos/sala-vip` requiredPlans={['plus','pro']} → ['pro','vip'] |
| `src/components/UpgradeBanner.tsx` | targetPlan prop type 'plus'\|'pro' → 'pro'\|'vip'; planName label 'Plus' → 'VIP' |
| `src/components/UpgradePrompt.tsx` | targetPlan prop type collapsed; recommended-plan inference updated to use 'vip' when user is already 'pro' |
| `src/components/layout/sidebar/SidebarUserInfo.tsx` | switch cases relabel — old 'pro' label preserves 'Pro'; old 'plus' relabels to 'Pro'; new 'vip' case shows 'VIP' label with crown icon |
| `src/components/layout/Sidebar.tsx` | destructure `canAccessPlus` → `canAccessVip`; props passed to SidebarNavGroup updated (Rule 3 deviation — required for typecheck) |
| `src/components/layout/sidebar/SidebarNavGroup.tsx` | prop interface + destructure + isItemLocked call signature swap canAccessPlus → canAccessVip |
| `src/config/sidebarNavigation.ts` | PlanType type collapsed; 6 nav items re-tiered (see W-3 section below); filterNavGroupsByPlan + isItemLocked helper signatures swap canAccessPlus → canAccessVip |
| `src/components/landing/AnimatedSections.tsx` | normalizedPlan detection adds 'vip' first, drops 'plus' branch |
| `src/lib/subscriptionLeads.ts` | SubscriptionLeadPlan type collapsed |
| `src/pages/Analises.tsx` | PLAN_LABELS keyed by canonical free/pro/vip only (legacy keys dropped) |
| `src/pages/Assinatura.tsx` | features array (object keys), plans array (id+name), 'isPlus' destructure, CurrentIcon, getPlanRank, casts at lines 248+265, CSS conditionals at 532+537, table headers, FAQ copy — all migrated |
| `src/pages/sistema/Programas.tsx` | UpgradePrompt targetPlan="plus" → "pro" + copy update |
| `src/pages/Relatorios.tsx` | targetPlan="plus" → "pro" + copy update; unused canAccessPlus destructure removed |
| `src/pages/Simulador.tsx` | unused canAccessPlus destructure removed; upgrade copy "Plus" → "Pro" |
| `src/integrations/supabase/types.ts` | Database['public']['Enums']['subscription_plan'] union + Constants array regenerated to ['free', 'pro', 'vip'] |

## Supabase Types Regeneration

**Decision:** Hand-applied to `src/integrations/supabase/types.ts` (Rule 3
deviation — Docker Desktop is NOT running in this parallel-executor worktree, so
`supabase gen types typescript --local > src/integrations/supabase/types.ts`
cannot be run from this session).

**What was done:** Two surgical edits to lines 2329 and 2470 of `types.ts`:

```diff
- subscription_plan: "free" | "pro" | "agency" | "basic" | "pro_familia"
+ subscription_plan: "free" | "pro" | "vip"

- subscription_plan: ["free", "pro", "agency", "basic", "pro_familia"],
+ subscription_plan: ["free", "pro", "vip"],
```

**Why this is safe:** The CLI-generated output for a Postgres enum with values
`('free', 'pro', 'vip')` is mechanical — these are exactly the two literal arrays
the CLI would emit. The diff against a future `supabase gen types --local` run on
a freshly-applied DB should be empty for these two lines.

**Plan 06 follow-up:** After Plan 06 runs `supabase db push` against prod, the
deployer SHOULD regenerate `types.ts` from the live DB via:

```bash
supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/integrations/supabase/types.ts
```

and verify the diff is empty (sanity check). W-4 note in PLAN.md anticipates a
second regen in Plan 04 after `managed_accounts` table lands — that diff should
show ONLY additive `managed_accounts` shape.

## Migration NOT Applied to Production (Plan 06 Owns Deploy)

Per CONTEXT D-04, the migration is authored in this Plan 02 but **NOT EXECUTED**
in this session:

- ❌ `supabase db reset --no-seed` — Docker Desktop not running in worktree
  environment (deviation Rule 3); cannot exercise the migration locally from
  this parallel executor
- ❌ `supabase db push` — owned by Plan 06's BLOCKING task, gated by the
  pre-deploy test (D-04: prod dump → local restore → apply migrations →
  adversarial tests pass → push)
- ❌ `supabase functions deploy` — no edge function code changes in Plan 02

What is enforceable from this session:

- ✅ Structural verification of the migration SQL (node script in PLAN.md
  §verify): all required tokens present, ADD VALUE pattern absent
- ✅ `npm run typecheck`: exits 0
- ✅ `npm run lint`: exits 0
- ✅ `npm test -- --run`: 93/93 tests green (no regression in collapse-related
  logic; the deleted `rawPlan === 'agency' ? 'pro' :` etc collapse CASE is
  replaced by VALID_PLANS guard)
- ✅ All 6 final greps return 0 matches (`'plus'`, `isPlus`, `canAccessPlus`)
- ✅ VALID_PLANS guard present in `useSubscription.ts` (B-2 Option A)
- ✅ `isVip` and `canAccessVip` exposed in `useSubscription.ts`

## VALID_PLANS Runtime Validation Guard (B-2 Option A)

```typescript
// src/hooks/useSubscription.ts lines 6-15
const VALID_PLANS = ['free', 'pro', 'vip'] as const;
// ...
// src/hooks/useSubscription.ts lines 256-262
const rawPlan = subscription?.plan as string | undefined;
const plan: SubscriptionPlan = VALID_PLANS.includes(rawPlan as SubscriptionPlan)
  ? (rawPlan as SubscriptionPlan)
  : 'free';
```

**What it protects against:**

1. **Collapse-logic regression** — if a developer accidentally re-introduces the
   deleted `useSubscription.ts:240-245` CASE block, the VALID_PLANS guard ensures
   any legacy DB value (`basic`, `agency`, `pro_familia`) still defaults to
   `'free'` instead of breaking downstream `canAccessPro/canAccessVip` checks.
2. **Future enum drift** — if a future migration adds a new value to the DB
   enum without updating the TS type, the guard sees the new value as
   non-canonical and falls back to `'free'`.
3. **SQL injection of an out-of-canonical value** — if RLS or admin tooling
   somehow inserts an unexpected `plan` value, the UI degrades gracefully
   instead of crashing or granting unexpected access.

**Asserted by Plan 06 Task 2 §2.3 Test 4** (adversarial test will set
`plan = 'basic'` directly via the admin client and assert the user sees `'free'`
in `useSubscription` return).

## Per-Nav-Item Re-Tiering Decisions (W-3)

Documented in `/tmp/phase1-preflight-sidebar-requiredplan.txt` (Task 1 §1.6
preflight) — explicit per-nav-item decisions instead of a "when in doubt, prefer
pro" heuristic:

| Nav item | Line | Legacy requiredPlan | New requiredPlan | Rationale |
|----------|------|---------------------|------------------|-----------|
| `management.vipLounge` (`/lancamentos/sala-vip`) | 86 | `'plus'` | `'pro'` | VIP Lounge tracking is mid-tier (own VIP lounge airport visits); NOT the multi-CPF/agency product VIP tier |
| `nav.simulators` (`/simulador`) | 98 | `'plus'` | `'pro'` | Simulators are Pro-tier capabilities (multiplication strategies, miles calculator, points projection) |
| `reports.savings` (`/relatorios/economia`) | 117 | `'plus'` | `'pro'` | Reports were mid-tier; not VIP-exclusive in v1 |
| `reports.issuedTickets` (`/relatorios/passagens`) | 118 | `'plus'` | `'pro'` | (same) |
| `reports.cardReport` (`/relatorios/cartoes`) | 119 | `'plus'` | `'pro'` | (same) |
| `nav.generalReports` (`/relatorios`) | 120 | `'plus'` | `'pro'` | (same) |
| Group `reservations` | 159 | `'pro'` (already) | `'pro'` (unchanged) | Travel agency module; tied to PRO_FEATURES set in v1 |

**Outcome:** Every legacy `'plus'` nav item maps to `'pro'`. No nav item maps
to `'vip'` in Plan 02 — multi-CPF (the only true VIP-only feature in v1) lives
behind admin/system pages that don't currently have `requiredPlan` gates. Phase 2
TIER-04 will add VIP-only nav items.

The logic helpers `filterNavGroupsByPlan` and `isItemLocked` are extended to
support a `'vip'` branch (for forward compatibility with TIER-04) but no
`'plus'` branch survives.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1/2 - Bug + Critical Functionality] `subscription_leads.plan_interest` CHECK constraint misaligned**

- **Found during:** Task 3 §3.2 (edit on `src/lib/subscriptionLeads.ts:4`)
- **Issue:** `supabase/migrations/20260510220500_create_subscription_leads.sql:8`
  has `CHECK (plan_interest IN ('free', 'plus', 'pro'))`. After Plan 02 collapses
  the TS type to `'free' | 'pro' | 'vip'`, any landing-page lead INSERT with
  `plan = 'vip'` would violate this CHECK and fail. Existing `'plus'` rows would
  remain but no new ones could be inserted (TS type rejects `'plus'`).
- **Fix:** Added companion migration
  `supabase/migrations/20260512120002_align_subscription_leads_plan_check.sql`
  that (1) backfills `'plus' → 'pro'` in `subscription_leads.plan_interest`,
  (2) drops the old CHECK, (3) adds a new CHECK
  `IN ('free', 'pro', 'vip')`.
- **Files modified:** `supabase/migrations/20260512120002_align_subscription_leads_plan_check.sql` (new)
- **Commit:** `57cf305`

**2. [Rule 3 - Blocking Issue Workaround] Pre-flight live DB capture skipped (Docker not running)**

- **Found during:** Task 1 §1.1
- **Issue:** Docker Desktop is not running in this parallel-executor worktree
  environment, so the `psql "$LOCAL_DB_URL" -c "SELECT plan, COUNT(*) FROM
  user_subscriptions GROUP BY plan;"` cannot be executed from this session.
- **Workaround:** Captured 6 preflight files at `/tmp/phase1-preflight-*.txt` with
  static analysis (grep + Read of migration files + grep for generated columns /
  functional indexes). The live `SELECT plan, COUNT(*)` snapshot is reassigned
  to Plan 06's BLOCKING task (per CONTEXT D-04: prod dump → local restore →
  apply migrations → capture row counts → push prod). Plan 06 owns the deploy
  gate; the live snapshot belongs THERE in front of the push, not in this
  parallel-executor session.
- **Safety:** The migration's CASE in step 5 has an `ELSE 'free'::public.subscription_plan`
  fallback that guarantees any legacy value (even un-backfilled) maps to a valid
  canonical value. Step 0 backfills the two known legacy values BEFORE the type
  change.
- **Files modified:** none (preflight outputs are environment-specific snapshots
  stored under `/tmp`, not committed to repo per PLAN.md §1)
- **Commit:** n/a (diagnostic-only)

**3. [Rule 3 - Required for Typecheck] Sidebar caller files updated outside PLAN.md `files_modified`**

- **Found during:** Task 3 §3.3 — changing the signatures of
  `filterNavGroupsByPlan(canAccessPlus → canAccessVip)` and
  `isItemLocked(canAccessPlus, canAccessPro → canAccessPro, canAccessVip)` in
  `sidebarNavigation.ts` broke typecheck for the consumers.
- **Issue:** `src/components/layout/Sidebar.tsx` and
  `src/components/layout/sidebar/SidebarNavGroup.tsx` destructured
  `canAccessPlus` from `useSubscription()` and passed it to the helpers, but
  `canAccessPlus` no longer exists on the hook return.
- **Fix:** Edited both files to destructure `canAccessVip` instead and pass
  it through. PlanProtectedRoute's gate logic is identical to what the original
  Plan 02 PATTERNS §B4 prescribed.
- **Files modified:** `src/components/layout/Sidebar.tsx`,
  `src/components/layout/sidebar/SidebarNavGroup.tsx`
- **Commit:** `57cf305`

**4. [Rule 3 - Required for Typecheck] Unused `canAccessPlus` destructures removed**

- **Found during:** Task 3 final lint pass
- **Issue:** `src/pages/Relatorios.tsx:98` and `src/pages/Simulador.tsx:19`
  destructured `canAccessPlus` but never referenced it. After renaming to
  `canAccessPro` they remained unused — ESLint would flag.
- **Fix:** Removed both unused destructures (kept `isFree`). The Simulador and
  Relatorios pages don't actually need the canAccess* check at the page level
  because `PlanProtectedRoute` already gates the routes upstream.
- **Files modified:** `src/pages/Relatorios.tsx`, `src/pages/Simulador.tsx`
- **Commit:** `57cf305`

### Authentication Gates

None. Plan 02 is migration + refactor work; no external auth required.

## Self-Check: PASSED

Verification commands run after authoring:

```bash
# Files exist on disk:
✓ supabase/migrations/20260512120001_consolidate_subscription_plan_enum.sql
✓ supabase/migrations/20260512120002_align_subscription_leads_plan_check.sql

# Commits exist in git log:
✓ ac74b47  feat(01-02): add subscription_plan enum consolidation migration (5 -> 3)
✓ 57cf305  refactor(01-02): consolidate SubscriptionPlan TS to canonical free/pro/vip (D-01)

# Final gates:
✓ npm run typecheck   →  exit 0
✓ npm run lint        →  exit 0
✓ npm test --run      →  93/93 tests pass
✓ grep -rE "['\"]plus['\"]" src/         →  0 matches
✓ grep -rn 'isPlus\b' src/               →  0 matches
✓ grep -rn 'canAccessPlus' src/          →  0 matches
✓ VALID_PLANS.includes in useSubscription.ts (1 match)
✓ src/App.tsx requiredPlans={['pro', 'vip']} (Sala VIP route gate)
✓ types.ts subscription_plan: "free" | "pro" | "vip" (single canonical union)
```

Migration runtime verification (`supabase db reset --no-seed` + `psql -c "SELECT
enum_range(NULL::public.subscription_plan);"` expecting `{free,pro,vip}`) is
deferred to Plan 06 BLOCKING task per CONTEXT D-04. See Deviation 2 above.
