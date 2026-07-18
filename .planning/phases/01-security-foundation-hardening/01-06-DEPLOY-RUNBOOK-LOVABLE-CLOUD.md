# Phase 1 Plan 06 — Deploy Runbook (Lovable Cloud variant)

> **Use this runbook** when the production backend is Lovable Cloud (managed
> Supabase provisioned and operated by Lovable). The companion
> `01-06-DEPLOY-RUNBOOK.md` covers the alternative path (Supabase próprio
> with direct CLI access) and applies only after a future migration off
> Lovable Cloud.
>
> **Why two runbooks:** Lovable Cloud does not expose a direct Postgres
> connection string. `supabase db push --linked`, `supabase db dump --linked`,
> and `psql` against prod are unavailable. Migrations and edge function
> deployments happen through the Lovable IDE chat, which calls Lovable's
> internal `supabase--migration` tool with human approval per step.
>
> **MilesPro project reference:** `opusftqbbaozucmbuuug`
> (host: `opusftqbbaozucmbuuug.supabase.co`)
>
> ---
>
> ## Status of code-side work
> All Plan 06 code (Tasks 1, 2, 3) is committed on branch
> `phase-1-security-hardening` (PR #1). Operator-driven tasks (4–6) move
> through this runbook **after PR #1 is merged into `main`**.

---

## Preflight — confirm before you start

1. **PR #1 is mergeable and CI is green.**
   ```bash
   gh pr view 1 --json mergeable,mergeStateStatus,statusCheckRollup
   # Expected: mergeable: MERGEABLE, mergeStateStatus: CLEAN, all checks SUCCESS
   ```

2. **You are logged into Lovable IDE** with chat access to the MilesPro
   project (URL `https://lovable.dev/projects/e39f4ef4-c00a-4d6e-8e5c-8722bb465399`
   or similar).

3. **GitHub secrets are pointing at the correct project**
   (`opusftqbbaozucmbuuug`, not the orphan `ebyruchdswmkuynthiqi`):
   ```bash
   gh secret list
   # Should list VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY,
   # VITE_SUPABASE_PROJECT_ID — values are obscured but the rotation
   # date should be recent.
   ```

4. **`.mcp.json` is pointing at the correct project**
   (`opusftqbbaozucmbuuug`). Already corrected on this branch.

5. **Plan 03's dual-read deploy was applied to Lovable Cloud more than
   11 minutes ago** (so all in-flight OAuth state tokens have validated
   or expired). If unsure, wait 11 minutes from the last Lovable IDE
   change to `google-calendar-auth/index.ts` before proceeding to step 3
   below.

---

## Step 1 — Merge PR #1 into `main` (1 min)

```bash
gh pr merge 1 --merge --delete-branch=false
```

Choose **merge** (not squash) so the 33+ atomic Phase 1 commits remain
visible in `main` history for forensic traceability.

`--delete-branch=false` keeps `phase-1-security-hardening` available for a
few days in case of rollback. Delete manually later.

**Verify the merge:**
```bash
git fetch origin main
git log --oneline origin/main -10
# Expected: see the merge commit + Phase 1 commits in main
```

**What this triggers in Lovable Cloud:**
- Lovable IDE syncs `main` into its workspace. The 6 new migration files
  in `supabase/migrations/` appear in the Lovable project but **are NOT
  automatically applied to the live database**. The trigger is the
  migration tool (next step), not the commit.

---

## Step 2 — Apply the 6 Phase 1 migrations via Lovable chat (~15 min)

**Order matters.** Apply one at a time, wait for Lovable to confirm
success before requesting the next. Each migration has inline
`RAISE EXCEPTION` self-checks — if any fails, **stop and consult** before
retrying.

**Prompt template for Lovable chat:**

> Please apply migration `<filename>` from `supabase/migrations/`. Show me
> the SQL diff and the result. If a `RAISE EXCEPTION` triggers, paste the
> error message verbatim — do not retry automatically.

**Order:**

1. `20260512120001_consolidate_subscription_plan_enum.sql`
   *(SEC-05 — collapses 5-value enum to 3, backfills legacy rows)*

2. `20260512120002_align_subscription_leads_plan_check.sql`
   *(SEC-05 companion — updates CHECK constraint on subscription_leads)*

3. `20260512120003_create_has_plan_function.sql`
   *(SEC-06 — trust kernel `has_plan(uid, plan)`)*

4. `20260512120004_create_managed_accounts_and_can_access_account.sql`
   *(SEC-06 — VIP multi-CPF read kernel + managed_accounts table)*

5. `20260512120005_rewrite_travel_rls_with_has_plan.sql`
   *(SEC-01 — 40 RLS policies across 10 travel_* tables, wrapped in
   `has_plan(_, 'pro')`)*

6. `20260512120006_rewrite_vip_rls_with_has_plan.sql`
   *(SEC-02 — 4 RLS policies on vip_entries, wrapped in
   `has_plan(_, 'vip')`)*

**After each migration applies successfully**, ask Lovable to run a quick
sanity SELECT:

After migration 1 (enum consolidation):
> `SELECT enum_range(NULL::public.subscription_plan);`
> Expected: `{free,pro,vip}`

> `SELECT plan, COUNT(*) FROM public.user_subscriptions GROUP BY plan;`
> Expected: only `free`/`pro`/`vip` rows; no `basic`/`agency`/`pro_familia`.

After migrations 3 + 4 (trust kernel):
> `SELECT public.has_plan(gen_random_uuid(), 'pro');`
> Expected: `f` (unknown user is not pro).

> `SELECT proname, prosecdef FROM pg_proc WHERE proname IN ('has_plan', 'can_access_account');`
> Expected: 2 rows, both `prosecdef = t` (SECURITY DEFINER).

After migrations 5 + 6 (RLS rewrite):
> `SELECT COUNT(*) FROM pg_policy WHERE polname ~ '^travel_';`
> Expected: 40 (10 tables × 4 actions).

> `SELECT COUNT(*) FROM pg_policy WHERE polname ~ '^vip_';`
> Expected: 4 (vip_entries × 4 actions, assuming Case A from Plan 05).

---

## Step 3 — Cutover OAUTH_STATE_SECRET (Plan 06 Task 3 final step)

**Prerequisite:** Plan 03's dual-read deploy is ≥11 min old (preflight #5).

The dual-read code that Plan 03 added reads `OAUTH_STATE_SECRET` first and
falls back to `SUPABASE_SERVICE_ROLE_KEY`. Plan 06 Task 3 (commit `e7330d8`,
already on the branch) **removed the fallback**. Once you set the secret
and redeploy, the function refuses to start without it — which is the
desired hard-fail behaviour.

1. **Generate the secret value:**
   ```bash
   openssl rand -hex 32
   # Copy the 64-char hex string to your clipboard.
   ```

2. **Set the secret in Lovable Cloud** via chat:
   > Please set the edge function secret `OAUTH_STATE_SECRET` to the
   > following value: `<paste your hex string>`. After it is set, redeploy
   > the `google-calendar-auth` edge function and confirm it starts
   > without the `OAUTH_STATE_SECRET is required` error.

3. **Verify** in the Lovable Cloud secrets UI that `OAUTH_STATE_SECRET`
   appears in the list (with the value masked). If you ever lose the
   value: rotating it invalidates every in-flight OAuth state token
   (10-min TTL impact), nothing more.

---

## Step 4 — Rotate the service-role key (CRIT-02 mitigation)

**Important:** In Lovable Cloud, the service-role key is managed by
Lovable — it is **not** exposed to the user-facing app bundle the way it
would be in a self-hosted Supabase. Phase 1's CRIT-02 mitigation was
defensive even in Lovable Cloud (deleted `supabaseAdmin` export from
`src/integrations/supabase/client.ts`, deleted `VITE_*SERVICE_ROLE` fallback
from `vite.config.ts`), and remains valuable.

**Recommended action:** Ask Lovable directly:

> The service-role JWT for this project was briefly exposed in a chat
> transcript when I was setting up GitHub secrets. Can you rotate the
> service-role key for `opusftqbbaozucmbuuug`? If Lovable Cloud doesn't
> expose that rotation to me, what's the process — does Lovable rotate
> these on a schedule, or do I need to open a support request?

**Document the answer** in a follow-up note here (whether rotation is
operator-driven, schedule-driven by Lovable, or requires support). If
rotation is not available, mitigation is "key is not bundled into client
artifacts, so blast radius is limited to chat-transcript exposure." That
is acceptable for Phase 1 close.

---

## Step 5 — Production smoke probes (SC #1–#5 from PLAN.md)

These curl probes prove that the trust kernel is enforced at the REST
boundary. Run from your local machine; **no Supabase CLI needed**.

**Setup:**
```bash
# Set vars from your client bundle (.env, or Lovable Cloud Secrets UI).
export PUB_KEY="<VITE_SUPABASE_PUBLISHABLE_KEY value>"
export PROD_URL="https://opusftqbbaozucmbuuug.supabase.co"

# Create three throwaway test users via Lovable IDE chat:
#   "Please create three test users with these emails and the password
#    `phase1-smoke-not-a-real-password-12345`:
#      free@phase1-smoke.invalid
#      pro@phase1-smoke.invalid
#      vip@phase1-smoke.invalid
#    Then mark pro@ as plan=pro and vip@ as plan=vip in user_subscriptions."
# Ask Lovable for the three JWTs after signin so you can curl with them.
export FREE_JWT="<paste>"
export PRO_JWT="<paste>"
export VIP_JWT="<paste>"
```

### SC #1 — Free user INSERT into `travel_cruises` returns 401/403

```bash
curl -i -X POST "$PROD_URL/rest/v1/travel_cruises" \
  -H "Authorization: Bearer $FREE_JWT" \
  -H "apikey: $PUB_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"<free-user-uid>","name":"smoke","price":0,"client_id":"<any>"}'
# Expected: HTTP/2 401 or 403; body contains "code":"42501"
```

Repeat for `travel_tickets`, `travel_hotels`, `travel_cars`,
`travel_insurances`, `travel_attractions`, `travel_transfers`,
`travel_quotes`. All must return 401/403 with code `42501`.

### SC #2 — Free user SELECT against `vip_entries` returns no rows

```bash
curl -s -H "Authorization: Bearer $FREE_JWT" -H "apikey: $PUB_KEY" \
  "$PROD_URL/rest/v1/vip_entries?select=*"
# Expected: [] (empty array — RLS hides VIP-only rows).
```

### SC #3 — `has_plan` direct call returns expected values

```bash
curl -s -X POST "$PROD_URL/rest/v1/rpc/has_plan" \
  -H "Authorization: Bearer $FREE_JWT" -H "apikey: $PUB_KEY" \
  -H "Content-Type: application/json" \
  -d '{"_user_id":"<free-uid>","_required_plan":"pro"}'
# Expected: false
```

### SC #4 — Bundle is secret-free

```bash
npm run build > /dev/null 2>&1
grep -rE 'service_role|sk_live|sk_test|eyJhbGciOiJIUzI1NiIs' dist/ | wc -l
# Expected: 0
```
*(Already validated in CI build step. Re-run locally before celebrating.)*

### SC #5 — Adversarial test suite passes against production-equivalent state

The CI integration job already proves this against a fresh Supabase local
that applies all 70 migrations including the new 6. No prod re-run needed.
If you want to manually verify, ask Lovable to run a single adversarial
probe in chat:

> Run this SQL as a free user (signed in as free@phase1-smoke.invalid):
> `INSERT INTO travel_cruises (user_id, name, price, client_id) VALUES (auth.uid(), 'test', 0, gen_random_uuid());`
> Expected: error `42501 / new row violates row-level security policy`.

---

## Step 6 — Close-out

1. **Capture baseline counts post-deploy** (compare with the pre-deploy
   numbers Lovable gave us):
   ```
   auth.users         — <N>
   user_subscriptions — <N>
   travel_clients     — <N>
   travel_tickets     — <N>
   profiles           — <N>
   ```
   Same numbers ± expected churn ⇒ no data loss. Significant drop ⇒
   investigate before declaring success.

2. **Update `.planning/STATE.md`** to `status: deployed_and_verified` for
   Phase 1.

3. **Update `.planning/ROADMAP.md`** — Phase 1 success criteria checkbox
   in the "Goal-backward" section becomes ✓ across the board.

4. **Run** `/gsd-verify-work 1` for a conversational UAT pass against
   the 5 success criteria.

5. **Run** `/gsd-secure-phase 1` to verify the threat-model mitigations
   (CRIT-01, CRIT-02, HIGH-04, HIGH-05) actually landed in production.

6. **Open** `/gsd-discuss-phase 2` to start the next cycle (Monetization +
   Compliance + Telemetria), with the LGPD-region question carried as
   the top open decision (Lovable Cloud region is "tipicamente us-east-1"
   per Lovable — needs SCC for BR user data residency or migration to
   Supabase próprio in `sa-east-1`).

---

## Rollback

The migrations are NOT trivially reversible at the data level (legacy
enum values cannot be re-added once dropped without a full type recreate
and column rewrite). However:

- **If Step 2 migration N fails** *before* migration 5 starts: Lovable can
  reverse the partial application. The trust kernel functions and the
  enum consolidation are safe to undo because no policy depends on them
  yet.

- **If Step 2 migration 5 or 6 fails partway:** the rewritten RLS
  policies need to be dropped and the legacy ones re-created. Each Phase
  1 migration ships with a commented-out rollback block at the bottom —
  copy that into Lovable chat and ask Lovable to apply it.

- **If smoke probes (Step 5) reveal RLS is too restrictive** (e.g.,
  legitimate paid users hitting 42501 unexpectedly): inspect with
  `EXPLAIN (ANALYZE, VERBOSE) <query>` via Lovable chat, then either fix
  forward (add missing INSERT in `managed_accounts` for the VIP owner)
  or roll back migration 5/6 specifically.

Never roll back migration 1 (enum consolidation) in production without
extreme care — re-introducing legacy values requires the inverse 5-step
recreate pattern and risks breaking trust-kernel callers (Plans 04/05).
If that recovery is needed, treat as a forensic incident, not a routine
rollback.

---

## Why this runbook is shorter than the companion

The `01-06-DEPLOY-RUNBOOK.md` (Supabase-própio variant) walks through
`supabase link`, `supabase db dump --linked`, local rehearsal with `psql`
against a restored prod dump, and direct `supabase db push --linked`.
None of those operate against Lovable Cloud — Lovable manages the
database lifecycle on your behalf, so the human steps collapse from
"author + apply + verify" (4–6 hours, full control, full risk) to
"author + ask Lovable to apply + verify" (~30 minutes, Lovable in the
loop, Lovable shoulders some operational risk).

The trade-off is the one the founder accepted in
`.planning/PROJECT.md` Key Decisions: speed of iteration > full control
during the pre-revenue phase. Revisit when triggers fire:
- First enterprise contract demanding self-hosted Postgres / explicit DPA
- Lovable Cloud cost > Supabase Pro ($25/mo) with comfortable margin
- Need for unsupported Postgres extension (pgvector, postgis, etc.)
- Need for direct `pg_dump`, logical replication, or external BI tooling
