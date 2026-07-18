---
phase: 01-security-foundation-hardening
plan: 04
subsystem: security-trust-kernel
tags: [supabase, migration, rls, trust-kernel, security-definer, sec-06, multi-cpf]
requirements: [SEC-06]
dependency_graph:
  requires:
    - "Plan 02 (canonical subscription_plan enum free|pro|vip — has_plan parameter type)"
  provides:
    - "public.has_plan(uuid, subscription_plan) SECURITY DEFINER function (the single chokepoint Plan 05 RLS will reference)"
    - "public.managed_accounts table with 7 cols, 2 FK constraints, 2 partial indexes, RLS enabled, 4 snake_case policies"
    - "public.can_access_account(uuid, uuid) SECURITY DEFINER function (multi-CPF cross-user authorization with hard revoke isolation)"
  affects:
    - "Plan 05 (consumes has_plan in every travel_*/vip_* WITH CHECK clause; consumes can_access_account in vip_* SELECT/UPDATE)"
    - "Plan 06 (adversarial tests that prove the trust kernel actually blocks free/pro users from VIP writes + verify downgrade soft-isolation)"
tech_stack:
  added: []
  patterns:
    - "SECURITY DEFINER SET search_path = public + STABLE + REVOKE FROM public + GRANT TO authenticated (least-privilege function template)"
    - "Soft-isolation RLS pattern (USING uses auth.uid() only; WITH CHECK adds has_plan) — preserves SELECT access after plan downgrade per D-05"
    - "Hard-isolation inside SECURITY DEFINER function (revoked_at IS NULL check inside can_access_account) — revoke is immediate per D-06"
    - "Inline DO self-check block at end of migration — raises EXCEPTION on incorrect output, fails the migration as cheap insurance"
    - "Partial index pattern (WHERE revoked_at IS NULL) — only indexes active relationships, smaller index, faster lookups"
key_files:
  created:
    - supabase/migrations/20260512120003_create_has_plan_function.sql
    - supabase/migrations/20260512120004_create_managed_accounts_and_can_access_account.sql
    - .planning/phases/01-security-foundation-hardening/01-04-SUMMARY.md
  modified: []
decisions:
  - "Renumbered migrations from ..120002/..120003 to ..120003/..120004 to avoid collision with Plan 02's companion migration (..120002 was already taken by align_subscription_leads_plan_check)"
  - "Deferred supabase gen types regen to Plan 06 — this worktree has no local Supabase running; Plan 06 owns the deploy gate + types regen sequence"
  - "Hard revoke isolation lives INSIDE can_access_account (revoked_at IS NULL), NOT in managed_accounts SELECT policy — preserves audit trail for owner (D-06)"
  - "INSERT/UPDATE/DELETE WITH CHECK require has_plan(auth.uid(), 'vip') — multi-CPF write boundary is hard; SELECT USING is soft (owner keeps audit visibility after downgrade per D-05)"
  - "Two separate migration files instead of one — has_plan ships independently of managed_accounts so a potential Plan 05 revert doesn't take the trust function down with it"
metrics:
  duration_minutes: ~15
  tasks_completed: 2
  files_modified: 0
  files_created: 3
  commits: 2
  completed_date: 2026-05-12
---

# Phase 1 Plan 04: Trust Kernel Summary

## One-liner

Two SECURITY DEFINER functions (`has_plan`, `can_access_account`) plus the `managed_accounts` table land as Postgres-level chokepoints — Plan 05's RLS rewrites and Plan 06's adversarial tests can now reference a single canonical authorization entry point from inside every WITH CHECK clause.

## What was built

1. **`supabase/migrations/20260512120003_create_has_plan_function.sql`** — The trust kernel's plan-tier check. Function `public.has_plan(_user_id uuid, _required_plan public.subscription_plan)` declared `LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public` (locked search_path defeats session-level path injection per T-1-XX search_path attack). Reads `public.user_subscriptions` directly — never trusts `auth.jwt() ->> 'plan'` per Pitfall 6, so plan downgrade is immediately reflected on the next call. Hierarchy:
   - `has_plan(uid, 'free') = true` ALWAYS (free floor)
   - `has_plan(uid, 'pro')  = true` when `user_plan IN ('pro', 'vip')`
   - `has_plan(uid, 'vip')  = true` when `user_plan = 'vip'`
   - `REVOKE EXECUTE FROM public; GRANT EXECUTE TO authenticated;` (least privilege)
   - Inline `DO $$ ... self-check $$` validates the free-floor and unknown-user-pro=false cases before COMMIT.

2. **`supabase/migrations/20260512120004_create_managed_accounts_and_can_access_account.sql`** — The multi-CPF foundation. Three artifacts in one file (tightly coupled — the function reads the table):
   - **Table `public.managed_accounts`**: 7 columns (`id`, `owner_user_id`, `managed_user_id`, `label`, `revoked_at`, `created_at`, `updated_at`), 2 FK constraints to `auth.users(id) ON DELETE CASCADE` (orphan rows impossible per T-1-XX orphan-managed-rows), `CHECK (owner_user_id <> managed_user_id)` (self-ref guard per T-1-XX self-ref), `UNIQUE (owner_user_id, managed_user_id)` (duplicate pair guard per T-1-XX duplicate-relationships), 2 partial indexes `WHERE revoked_at IS NULL` for query perf on active relationships only.
   - **RLS policies (4, snake_case)**: `managed_accounts_select` USING `auth.uid() = owner_user_id` (soft — owner sees audit trail even after downgrade); `managed_accounts_insert`/`_update`/`_delete` WITH CHECK adds `public.has_plan(auth.uid(), 'vip')` (hard write boundary per D-05).
   - **Function `public.can_access_account(_viewer_id uuid, _target_id uuid)`**: `STABLE SECURITY DEFINER SET search_path = public`. Cheap self-access short-circuit (viewer = target → true). Cross-user requires viewer has VIP plan AND an unrevoked `managed_accounts` row links viewer→target. `revoked_at IS NULL` check lives INSIDE the function (D-06 hard isolation — owner cannot reach the managed user's data the moment they revoke, but the audit row itself remains visible via the `_select` policy).
   - `updated_at` trigger via fresh `set_managed_accounts_updated_at()` (no naming collision with other tables).
   - Inline `DO $$ ... self-check $$` validates self-access (true) and cross-user denial without managed row (false).

## Hierarchy quick reference

| `has_plan(_, X)` | user_plan = NULL (free) | user_plan = 'pro' | user_plan = 'vip' |
|------------------|-------------------------|-------------------|-------------------|
| `X = 'free'`     | true (free floor)       | true              | true              |
| `X = 'pro'`      | false                   | true              | true              |
| `X = 'vip'`      | false                   | false             | true              |

## `can_access_account` semantics

| Scenario | Result |
|----------|--------|
| `viewer = target` (self-access, any plan) | true |
| `viewer != target`, viewer not VIP | false (short-circuit before managed_accounts lookup) |
| `viewer != target`, viewer VIP, no managed_accounts row | false |
| `viewer != target`, viewer VIP, managed_accounts row exists, `revoked_at IS NULL` | true |
| `viewer != target`, viewer VIP, managed_accounts row exists, `revoked_at IS NOT NULL` (revoked) | false (HARD isolation per D-06) |

## Deviations from Plan

### Deviation 1 — Migration timestamp collision (filenames renumbered)

- **Found:** At execution start, via orchestrator note in prompt context.
- **Issue:** Plan 04 frontmatter specified `..120002_create_has_plan_function.sql` and `..120003_create_managed_accounts_and_can_access_account.sql`, but Plan 02 (already merged in Wave 1) had shipped a companion deviation migration `..120002_align_subscription_leads_plan_check.sql` — `..120002` was taken.
- **Fix:** Renumbered to `..120003_create_has_plan_function.sql` and `..120004_create_managed_accounts_and_can_access_account.sql`. Updated frontmatter Forward/Depends-on comments in both files to reference the actual prior migration (`..120001_consolidate_subscription_plan_enum.sql`) and noted the renumber in the file header.
- **Tag:** `deviation: timestamp-collision-with-plan-02-companion-migration`
- **Files modified:** the two migration filenames + their internal `Depends on:` comment.
- **Plan 05/06 implication:** Plan 05 will use `..120005`/`..120006` (next wave numbers). Plan 06 deploy script must include both ..120003 AND ..120004 in the apply order.
- **Commits:** `51a026b`, `f2c952f`

### Deviation 2 — `supabase gen types typescript --local` regen deferred to Plan 06

- **Found:** During Task 2 execution.
- **Issue:** Plan 04 Task 2 prescribed `supabase gen types typescript --local > src/integrations/supabase/types.ts` immediately after authoring the migration, to give Plan 06 tests typed access to `managed_accounts`. However, the execution context is a Windows worktree that does NOT have a running local Supabase stack or Docker — running `supabase db reset --no-seed` requires local Supabase, and `supabase gen types --local` requires that DB to be running.
- **Fix:** Migration authored to spec (passes structural check including 16/16 expected literals). Regen explicitly deferred to Plan 06, which already owns the deploy gate (`supabase db push` to prod) AND the adversarial test suite that needs the new types. Plan 06 execution will run: (1) `supabase start`, (2) `supabase db reset --no-seed`, (3) `supabase gen types typescript --local > src/integrations/supabase/types.ts`, (4) verify `git diff` shows only additive `managed_accounts` shape (W-4 idempotency check), (5) `npm run typecheck`, (6) adversarial tests, (7) `supabase db push` to prod.
- **Tag:** `deviation: types-regen-deferred-to-plan-06-deploy-gate`
- **Files modified:** none (this is a deferred-action note, not an in-file change).
- **Justification:** Author-only-no-apply is consistent with the orchestrator's explicit directive in the execution prompt: "Do NOT execute the migration yourself; just author it correctly. Plan 06 owns the deploy gate." It is also consistent with `CONTEXT D-04` (pre-deploy local-restore-then-prod-push happens at the end of the cycle, not per-plan).

## Must-haves verification

| Must-have truth | Status |
|-----------------|--------|
| `public.has_plan(uid, 'pro')` returns false for free user, true for pro/vip user | Authored — verified by structural check + inline DO self-check at COMMIT time (in Plan 06's `supabase db reset`) |
| `public.has_plan(uid, 'vip')` returns false for pro user, true for vip user | Authored — `WHEN 'vip' THEN user_plan = 'vip'` clause (exact match) |
| `public.can_access_account(viewer, target)` returns true for self always, true for VIP owner→managed pair with revoked_at IS NULL, false otherwise | Authored — `IF _viewer_id = _target_id THEN RETURN true; IF NOT has_plan(_, 'vip') THEN RETURN false; RETURN EXISTS (... revoked_at IS NULL)` |
| `managed_accounts` table exists with RLS enabled and 4 policies (SELECT/INSERT/UPDATE/DELETE) | Authored — `ENABLE ROW LEVEL SECURITY` + 4 `CREATE POLICY managed_accounts_*` lines verified structurally |
| Both functions are STABLE SECURITY DEFINER with search_path = public | Authored — both function bodies contain literal `STABLE`, `SECURITY DEFINER`, `SET search_path = public` |
| EXECUTE on both functions GRANTED to authenticated, REVOKED from public | Authored — both `REVOKE EXECUTE ... FROM public` + `GRANT EXECUTE ... TO authenticated` pairs present |

## Threat model coverage

| Threat ID | Disposition | Mitigation |
|-----------|-------------|------------|
| T-1-01 EoP via has_plan | mitigate (foundation) | Single canonical function shipped — Plan 05 wires into RLS, Plan 06 proves with adversarial test |
| T-1-03 Stale auth (JWT plan claim) | mitigate | Function body queries `user_subscriptions` on every invocation; no `auth.jwt() ->> 'plan'` anywhere in body |
| T-1-XX search_path injection | mitigate | `SET search_path = public` on both functions (Tampering — hostile session-level SET cannot redirect lookups) |
| T-1-XX managed_accounts revoke | mitigate | `revoked_at IS NULL` inside can_access_account (D-06 hard isolation) |
| T-1-XX self-ref managed row | mitigate | `CHECK (owner_user_id <> managed_user_id)` |
| T-1-XX duplicate relationships | mitigate | `UNIQUE (owner_user_id, managed_user_id)` |
| T-1-XX orphan managed rows | mitigate | `ON DELETE CASCADE` on both FK columns |

All 7 threats mapped to this plan's surface are mitigated by the authored artifacts. The block-on-high threats T-1-01 and T-1-03 require Plan 05 (wiring) and Plan 06 (adversarial proof) to be fully closed end-to-end.

## What Plan 05 can now do

Plan 05's RLS rewrites can replace every `auth.uid() = user_id` in `travel_*` and `vip_*` policies with:

```sql
-- INSERT/UPDATE WITH CHECK
WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'))

-- vip_* SELECT (multi-CPF aware)
USING (public.can_access_account(auth.uid(), user_id))
```

Both function signatures, types, attributes (STABLE, SECURITY DEFINER, search_path), and grant scope (`authenticated` only) are already locked in by these migrations. Plan 05 only references; it does not modify these functions.

## What Plan 06 must do (deploy-gate handoff)

1. `supabase start` (boot local stack with Docker)
2. `supabase db reset --no-seed` — applies all migrations including ..120003 and ..120004 cleanly; the inline DO self-checks will RAISE EXCEPTION on incorrect output so a broken migration fails the reset.
3. `supabase gen types typescript --local > src/integrations/supabase/types.ts`
4. `git diff src/integrations/supabase/types.ts` — verify diff vs Plan 02's regen is purely additive (only `managed_accounts` table type added; no enum re-shape, no unrelated drift). If diff shows anything else, STOP and surface deviation.
5. `npm run typecheck` — must exit 0.
6. Run adversarial Vitest suite (Plan 06's deliverable) against the local stack — proves Free user INSERT to travel_* returns 42501, Pro user INSERT succeeds, downgrade Pro→Free preserves SELECT but blocks INSERT.
7. `supabase db push` to prod (only after steps 1-6 are green per CONTEXT D-04).

## Deferred to Phase 2

- `managed_accounts` UI (account switcher, "manage CPFs" page) per CONTEXT §deferred-3.
- `create-managed-account` edge function (headless `auth.users` creation flow).
- Phase 1 only ships the TABLE + RLS + function — no user-facing surface.

## Known Stubs

None. Both functions and the table are fully wired against `user_subscriptions` and `auth.users` (no hardcoded mock data, no placeholder bodies).

## Commits

| Hash | Type | Message |
|------|------|---------|
| `51a026b` | feat | feat(01-04): add has_plan(uuid, subscription_plan) trust kernel function |
| `f2c952f` | feat | feat(01-04): add managed_accounts table + can_access_account function |

## Self-Check: PASSED

- File `supabase/migrations/20260512120003_create_has_plan_function.sql` exists — FOUND
- File `supabase/migrations/20260512120004_create_managed_accounts_and_can_access_account.sql` exists — FOUND
- Commit `51a026b` in git log — FOUND (`feat(01-04): add has_plan...`)
- Commit `f2c952f` in git log — FOUND (`feat(01-04): add managed_accounts...`)
- has_plan structural check: 12/12 expected literals present (CREATE OR REPLACE FUNCTION, SECURITY DEFINER, SET search_path = public, STABLE, REVOKE EXECUTE, GRANT EXECUTE, _required_plan, pro hierarchy, vip exact match, self-check, Forward/Reverse comments) — PASSED
- managed_accounts structural check: 16/16 expected literals present (CREATE TABLE, FK CASCADE x2, no_self CHECK, unique_pair UNIQUE, ENABLE RLS, 4 policies, vip plan check, can_access_account function, search_path, SECURITY DEFINER, revoked_at IS NULL, REVOKE/GRANT) — PASSED
- No `auth.jwt() ->> 'plan'` usage in function bodies (only in Pitfall 6 reminder comment) — VERIFIED
- No modifications to STATE.md or ROADMAP.md (orchestrator owns those) — VERIFIED via `git status` showing only the two new SQL files staged across this plan's commits
