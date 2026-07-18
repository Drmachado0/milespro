# Phase 01 — Deferred Items

Items discovered during execution that are out of scope for the current plan but should be addressed later.

## From Plan 03 execution (2026-05-12)

### Pre-existing build failure: case-collision on PromotionsContext

**File:** `src/components/ProtectedProviders.tsx:2`
**Issue:** Repo has TWO tracked files differing only by casing — `src/contexts/PromotionsContext.tsx` AND `src/contexts/promotionsContext.ts` (introduced by 62e7a57 "isolate context hooks for fast refresh"). On case-insensitive filesystems (Windows/macOS-default) Vite/Rollup resolves the import `@/contexts/PromotionsContext` to the `.ts` file (which only exports the hook, not the provider), causing `"PromotionsProvider" is not exported by "src/contexts/promotionsContext.ts"` and aborting `npm run build`.
**Pre-existing:** Confirmed via `git stash` test against the Plan 03 worktree base (0cfb268) — build fails identically without any of this plan's edits.
**Why deferred:** Scope boundary — not caused by Plan 03's changes. Either rename the `.ts` file to a distinct casing/name (e.g., `usePromotionsContext.ts`), or remove the duplicate, or update consumers to point at the `.tsx` file explicitly. The fix touches files outside Plan 03's allowed scope (`vite.config.ts`, `src/integrations/supabase/client.ts`, `supabase/functions/google-calendar-auth/index.ts`).
**Suggested owner:** A standalone fix-up commit, or fold into Plan 04/05/06 if any of those plans already touches `src/contexts/` or `src/components/ProtectedProviders.tsx`.
**Verification of guard plugin:** The `failOnSecretLeak()` plugin's `config()` hook runs BEFORE rollup begins resolving imports, so the secret-guard tests (test-secret-guard.sh) still exercise the plugin correctly even with this pre-existing bug — the plugin's throw happens first when forbidden env is present, and when env is missing the same plugin throws before rollup runs. Smoke test of success path (all env valid → build proceeds) is blocked by this pre-existing issue but the plugin code itself is verified by the typecheck + secret-guard harness.
