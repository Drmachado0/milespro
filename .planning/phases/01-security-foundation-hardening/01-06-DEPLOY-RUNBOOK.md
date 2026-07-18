# Phase 1 Plan 06 — Deploy Runbook (operator-driven)

> **Status:** All code-side work for Plan 06 is committed (Tasks 1, 2, 3).
> Tasks 4a/4b/4c/5/5.5/6 are operator-driven because they require
> Supabase CLI authentication against the production project, Docker Desktop
> to be running locally, or a click in the Supabase Dashboard. This runbook
> walks them through in the exact order the plan mandates.
>
> **Do NOT skip a step.** D-09 (service-role rotation sequence) and D-10
> (OAUTH_STATE_SECRET cutover) both require ordering. Skipping the rehearsal
> (Task 4a) or running the rotation (Task 5) before the migrations are pushed
> (Task 4c) will cause production data corruption or stale-secret outages.

---

## Preflight — what you need before you start

1. **Supabase CLI authenticated against production:**
   ```bash
   supabase --version            # >= 1.150 recommended
   supabase login                # opens browser; or set SUPABASE_ACCESS_TOKEN
   supabase link --project-ref <prod-project-ref>
   supabase status --linked      # confirm "Linked project: <prod-project-ref>"
   ```
   Get the access token from: <https://supabase.com/dashboard/account/tokens>
   Get the project ref from: <https://supabase.com/dashboard/project/_/settings/general>

2. **Docker Desktop running locally** (for the rehearsal in Task 4a):
   ```bash
   docker info                   # must NOT error out
   supabase start                # boots local Supabase stack
   supabase status               # API/DB URLs printed
   ```

3. **A scratch space for outputs** (the verification rolls them up into
   `01-06-SUMMARY.md`):
   ```bash
   mkdir -p /tmp/phase1-deploy
   cd /tmp/phase1-deploy
   ```

4. **Confirm Plan 03's dual-read deploy is more than 11 minutes old.**
   Plan 03 added `OAUTH_STATE_SECRET ?? SUPABASE_SERVICE_ROLE_KEY` to
   `google-calendar-auth/index.ts`. Plan 06 Task 3 (already committed,
   commit `e7330d8`) deletes that fallback. The 11-minute wait ensures
   every in-flight OAuth state token (TTL 10 min, plus 1 min buffer) has
   either been validated or expired. **If Plan 03 was deployed less than
   11 minutes ago, wait.** Otherwise Task 3's deploy will reject some
   in-flight states with HTTP 400 "Invalid state parameter".

---

## Task 4a — Pre-deploy rehearsal (autonomous, ~5 min)

```bash
# 1. Dump production data (data only, no schema).
supabase db dump --data-only --linked > /tmp/phase1-deploy/prod-dump.sql
grep -c "INSERT INTO" /tmp/phase1-deploy/prod-dump.sql   # expect: many

# 2. Restore against local Supabase (must already be running -- see preflight #2).
supabase db reset --no-seed
LOCAL_DB_URL=$(supabase status -o json | node -e "console.log(JSON.parse(require('fs').readFileSync(0)).db.url)")
psql "$LOCAL_DB_URL" < /tmp/phase1-deploy/prod-dump.sql

# 3. Apply the 6 Phase-1 migrations against the prod-shaped local DB.
supabase migration up

# 4. Run the full test suite (unit + integration).
npm test
npm run typecheck
npm run lint
npm run build         # implicitly verifies failOnSecretLeak plugin

# 5. Verify post-restore state (each query has a clear expected output).
psql "$LOCAL_DB_URL" -c "SELECT enum_range(NULL::public.subscription_plan);"
#   EXPECTED: {free,pro,vip}

psql "$LOCAL_DB_URL" -c "SELECT plan, COUNT(*) FROM public.user_subscriptions GROUP BY plan;"
#   EXPECTED: rows only for free / pro / vip; no 'basic', 'agency', 'pro_familia'

psql "$LOCAL_DB_URL" -c "SELECT COUNT(*) FROM pg_policy WHERE polname LIKE 'travel_%';"
#   EXPECTED: >= 32 (10 tables x 4 actions = 40, with possible deltas)

psql "$LOCAL_DB_URL" -c "SELECT public.has_plan(gen_random_uuid(), 'pro');"
#   EXPECTED: f (unknown user is not pro)

# 6. Capture for the checkpoint message in Task 4b.
{
  echo "# Phase 1 Plan 06 -- rehearsal results -- $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "## npm test"
  npm test 2>&1 | tail -10
  echo
  echo "## enum_range:"
  psql "$LOCAL_DB_URL" -c "SELECT enum_range(NULL::public.subscription_plan);"
  echo
  echo "## user_subscriptions plan distribution:"
  psql "$LOCAL_DB_URL" -c "SELECT plan, COUNT(*) FROM public.user_subscriptions GROUP BY plan;"
  echo
  echo "## travel_* policy count:"
  psql "$LOCAL_DB_URL" -c "SELECT COUNT(*) FROM pg_policy WHERE polname LIKE 'travel_%';"
  echo
  echo "## has_plan smoke:"
  psql "$LOCAL_DB_URL" -c "SELECT public.has_plan(gen_random_uuid(), 'pro');"
} | tee /tmp/phase1-deploy/rehearsal-output.txt
```

**STOP if any of the above fails.** Surface the failure as a planner question
before continuing -- it likely means prod data has rows the migration didn't
anticipate. Possible recovery: amend the migration to handle the unexpected
shape, re-run rehearsal, then proceed.

---

## Task 4b — Human-confirm checkpoint (you, the operator)

Run a dry-run + visually confirm the linked project is the PRODUCTION project:

```bash
# 1. Dry-run prints exactly which migrations will apply.
supabase db push --linked --dry-run | tee /tmp/phase1-deploy/dry-run.txt
#   EXPECTED to list:
#     20260512120001_consolidate_subscription_plan_enum.sql
#     20260512120002_align_subscription_leads_plan_check.sql
#     20260512120003_create_has_plan_function.sql
#     20260512120004_create_managed_accounts_and_can_access_account.sql
#     20260512120005_rewrite_travel_rls_with_has_plan.sql
#     20260512120006_rewrite_vip_rls_with_has_plan.sql

# 2. Print the rehearsal summary for visual comparison.
echo "===== REHEARSAL SUMMARY (Task 4a) ====="
cat /tmp/phase1-deploy/rehearsal-output.txt
echo
echo "===== DRY-RUN RESULT (above) ====="

# 3. Visually confirm the linked project ID matches MilesPro production.
supabase status --linked
#   The project ID in the output MUST be the production MilesPro project.
#   If unsure, STOP. Do NOT proceed.
```

**Decision point:**

- If rehearsal is green AND dry-run lists exactly the 6 migrations above
  AND the linked project is the production MilesPro project: proceed to
  Task 4c.
- If ANY of the above is off: STOP. Do not run `supabase db push --linked`.
  Open an issue / ping the team. The risk window is huge -- a wrong-project
  push will corrupt production data of whichever project you're linked to.

---

## Task 4c — Push 6 migrations to production (destructive, irreversible)

> **Precondition:** Task 4b decision was "proceed" and rehearsal was green.
> If either is false, STOP.

```bash
# 1. The destructive call.
supabase db push --linked 2>&1 | tee /tmp/phase1-deploy/push-output.txt
#   Each migration is wrapped in BEGIN/COMMIT, so a single-migration failure
#   leaves the previous migrations applied. A multi-migration push failure
#   in the middle is the WORST case; the rehearsal in Task 4a is meant to
#   eliminate that risk by replaying against current prod data shape.

# 2. Verify production state.
PROD_DB_URL=$(supabase status --linked -o json | node -e "console.log(JSON.parse(require('fs').readFileSync(0)).db.url)")

psql "$PROD_DB_URL" -c "SELECT enum_range(NULL::public.subscription_plan);"
#   EXPECTED: {free,pro,vip}

psql "$PROD_DB_URL" -c "SELECT COUNT(*) FROM pg_policy WHERE polname LIKE 'travel_%';"
#   EXPECTED: >= 32

supabase migration list --linked | tee -a /tmp/phase1-deploy/push-output.txt
#   EXPECTED: 6 timestamps shown as Applied:
#     20260512120001 ... 20260512120006
```

**IF the push fails partway:**

1. Read the error VERY carefully. Identify which migration failed.
2. Each migration file has a commented rollback block at the bottom -- run
   that against production AFTER confirming the failure point.
3. If rollback succeeds: investigate, fix the migration, restart from Task 4a
   (rehearsal must pass again before retry).
4. If rollback fails: STOP. Escalate. Do NOT attempt "fix forward" with another
   migration. A second concurrent migration on a partially-broken schema is
   how you destroy backups.

---

## Task 3 deploy (edge function — re-deploy after Task 4c)

> Now that the migrations are live, redeploy the edge function with the
> OAUTH_STATE_SECRET fallback removed (commit `e7330d8`).

```bash
supabase functions deploy google-calendar-auth

# Smoke (HTTP 200 == still callable; if OAUTH_STATE_SECRET unset, function
# crashes at module load with the throw from index.ts:18; you'll see 500):
TEST_USER_JWT="<a valid auth JWT for a real production user>"
curl -i "$(supabase status --linked -o json | node -e "console.log(JSON.parse(require('fs').readFileSync(0)).api.url)")/functions/v1/google-calendar-auth?action=status" \
  -H "Authorization: Bearer $TEST_USER_JWT"
#   EXPECTED: HTTP 200 with {"connected": false} (or true if already connected)
#   IF 500 with body containing "OAUTH_STATE_SECRET not configured":
#     supabase secrets list | grep OAUTH_STATE_SECRET   # verify it's set
#     supabase secrets set OAUTH_STATE_SECRET="<value from Plan 03's storage>"
#     supabase functions deploy google-calendar-auth   # retry
```

---

## Task 5 — Rotate service-role key in Supabase Dashboard (manual)

> Click sequence in the Supabase Dashboard. There is no CLI equivalent --
> the dashboard is the only place where the new key is shown post-reset.

1. Open <https://supabase.com/dashboard/project/_/settings/api> for the
   production MilesPro project.
2. Locate the **service_role** secret in the API keys table.
3. Click **"Reset service role key"**.
4. **COPY THE NEW KEY IMMEDIATELY** and store it in a password manager.
   It will not be shown again. Losing it requires another reset.
5. Update the edge function secret store (per Plan 03 §Pattern 6, no redeploy
   needed for secret-only changes):
   ```bash
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<NEW key from dashboard>"
   supabase secrets list | grep SUPABASE_SERVICE_ROLE_KEY   # verify
   ```
6. (Optional) Update any GitHub Actions / Vercel / external-CI secret stores
   that read the service-role key. The Phase-1 CI integration job does NOT
   need this; per Plan 01 it uses only locally-booted Supabase keys.

---

## Task 5.5 — Post-rotation smoke (auto-discover every edge function reading the rotated key)

> Catches stale-secret edge functions BEFORE Task 6 phase gate.
> 401 from any function = the new secret didn't propagate.

```bash
# 1. Auto-discover (no hardcoded function list).
mapfile -t FNS < <(
  grep -l "SUPABASE_SERVICE_ROLE_KEY" supabase/functions/*/index.ts 2>/dev/null \
    | xargs -n1 dirname | xargs -n1 basename
)
echo "Functions reading SUPABASE_SERVICE_ROLE_KEY: ${FNS[*]}"

PROD_SUPABASE_URL=$(supabase status --linked -o json | node -e "console.log(JSON.parse(require('fs').readFileSync(0)).api.url)")
: "${TEST_USER_JWT:?Set TEST_USER_JWT to a valid prod JWT before running}"

# 2. Smoke each.
FAIL=0
for fn in "${FNS[@]}"; do
  STATUS=$(curl -s -o "/tmp/phase1-deploy/fn-${fn}-body.txt" -w '%{http_code}' \
    "${PROD_SUPABASE_URL}/functions/v1/${fn}" \
    -H "Authorization: Bearer ${TEST_USER_JWT}")
  echo "  ${fn}: HTTP ${STATUS}"
  case "$STATUS" in
    200|403|404|405)
      # 200 = OK; 403 = app-level auth (NOT service-role auth); 404/405 =
      # method/path mismatch (function still reachable). All indicate the
      # function booted with a working service-role secret.
      ;;
    401)
      echo "    FAIL: 401 -> stale service-role secret on ${fn}"
      cat "/tmp/phase1-deploy/fn-${fn}-body.txt"
      FAIL=1
      ;;
    500)
      echo "    FAIL: 500 -> probably 'Invalid API key' at supabase-js init"
      cat "/tmp/phase1-deploy/fn-${fn}-body.txt"
      FAIL=1
      ;;
    *)
      echo "    UNKNOWN: HTTP ${STATUS} -- investigate"
      cat "/tmp/phase1-deploy/fn-${fn}-body.txt"
      FAIL=1
      ;;
  esac
done

# 3. Capture summary.
{
  echo "# Post-rotation smoke (B-4) -- $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "Discovered functions: ${FNS[*]}"
} > /tmp/phase1-deploy/post-rotation-smoke.txt

if [ "$FAIL" -ne 0 ]; then
  echo "B-4: smoke FAILED. Re-run supabase secrets set + retry."
  exit 1
fi
echo "B-4: all ${#FNS[@]} edge functions returned non-401/non-500. Rotation propagated cleanly."
```

---

## Task 6 — Final phase gate (production smoke + 5 ROADMAP SC)

```bash
PROD_SUPABASE_URL=$(supabase status --linked -o json | node -e "console.log(JSON.parse(require('fs').readFileSync(0)).api.url)")
PROD_DB_URL=$(supabase status --linked -o json | node -e "console.log(JSON.parse(require('fs').readFileSync(0)).db.url)")
PROD_ANON_KEY=$(supabase status --linked -o json | node -e "console.log(JSON.parse(require('fs').readFileSync(0)).anon_key)")
PROD_PROJECT_ID=$(supabase status --linked -o json | node -e "console.log(JSON.parse(require('fs').readFileSync(0)).project_ref)")
```

### SC #1 — Adversarial RLS curl against PROD

> Requires a FREE test user existing in production. If you don't have one,
> create one via dashboard (or skip this curl and rely on the Vitest
> integration suite from Task 1).

```bash
TEST_FREE_USER_JWT=$(curl -s -X POST "$PROD_SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $PROD_ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"<test-free-user@your-domain>","password":"<password>"}' \
  | node -e "console.log(JSON.parse(require('fs').readFileSync(0)).access_token)")
TEST_FREE_USER_UID=$(echo "$TEST_FREE_USER_JWT" | cut -d'.' -f2 | base64 -d 2>/dev/null \
  | node -e "console.log(JSON.parse(require('fs').readFileSync(0)).sub)")

curl -i -X POST "$PROD_SUPABASE_URL/rest/v1/travel_cruises" \
  -H "apikey: $PROD_ANON_KEY" \
  -H "Authorization: Bearer $TEST_FREE_USER_JWT" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$TEST_FREE_USER_UID\",\"client_id\":\"00000000-0000-0000-0000-000000000000\",\"cruise_line\":\"X\",\"ship_name\":\"Y\",\"cabin_type\":\"inside\",\"departure_port\":\"A\",\"arrival_port\":\"B\",\"departure_date\":\"2026-06-01\",\"return_date\":\"2026-06-08\"}"
# EXPECTED: HTTP 401/403 with body containing "code":"42501" or "row-level security"
```

### SC #2 — Trust kernel deployed

```bash
psql "$PROD_DB_URL" -c "SELECT public.has_plan('<free-uid>', 'pro');"    # f
psql "$PROD_DB_URL" -c "SELECT public.has_plan('<pro-uid>', 'pro');"     # t
psql "$PROD_DB_URL" -c "SELECT public.has_plan('<vip-uid>', 'vip');"     # t
psql "$PROD_DB_URL" -c "SELECT public.can_access_account('<vip-uid>', '<vip-uid>');"  # t (self)
```

### SC #3 — Bundle is secret-free

```bash
VITE_SUPABASE_URL="$PROD_SUPABASE_URL" \
VITE_SUPABASE_PUBLISHABLE_KEY="$PROD_ANON_KEY" \
VITE_SUPABASE_PROJECT_ID="$PROD_PROJECT_ID" \
npm run build

grep -rE 'service_role|sk_live|sk_test|SUPABASE_SERVICE_ROLE_KEY' dist/
# EXPECTED: zero matches

# Poisoned env should abort with failOnSecretLeak:
VITE_FAKE_SERVICE_ROLE=x \
VITE_SUPABASE_URL="$PROD_SUPABASE_URL" \
VITE_SUPABASE_PUBLISHABLE_KEY="$PROD_ANON_KEY" \
VITE_SUPABASE_PROJECT_ID="$PROD_PROJECT_ID" \
npm run build 2>&1 | grep -q 'failOnSecretLeak' && echo "OK: build aborted on poisoned env"

# Missing required env should also abort:
unset VITE_SUPABASE_PUBLISHABLE_KEY
npm run build 2>&1 | grep -q 'Required env vars missing' && echo "OK: build aborted on missing env"
```

### SC #4 — Plan enum canonical

```bash
psql "$PROD_DB_URL" -c "SELECT enum_range(NULL::public.subscription_plan);"
# EXPECTED: {free,pro,vip}

psql "$PROD_DB_URL" -c "SELECT plan, COUNT(*) FROM public.user_subscriptions GROUP BY plan;"
# EXPECTED: only free / pro / vip rows

# TS-side gates (these run AT BUILD TIME via the failOnSecretLeak harness path,
# but also explicit greps here for visibility):
grep -rE "['\"]plus['\"]" src/   # 0
grep -rn "isPlus\b" src/         # 0
grep -rn "canAccessPlus" src/    # 0
```

### SC #5 — Critical-path test coverage

```bash
npm test
# EXPECTED: 109+ unit + 36+ integration tests passing
```

---

## Capture for SUMMARY.md

After Tasks 4a-6 complete green, paste the contents of:

- `/tmp/phase1-deploy/rehearsal-output.txt`           (Task 4a)
- `/tmp/phase1-deploy/dry-run.txt`                    (Task 4b)
- `/tmp/phase1-deploy/push-output.txt`                (Task 4c)
- `/tmp/phase1-deploy/post-rotation-smoke.txt`        (Task 5.5)
- HTTP status / boolean / dist-grep / enum_range / test count from SC #1-5

into `01-06-SUMMARY.md` under "Deploy execution -- operator log". The
`01-06-SUMMARY.md` already has a "Deferred for user" section pointing at
this runbook; updating that section with actual timestamps and outputs
closes out Phase 1.

---

## Backout procedure (only if absolutely necessary)

Each migration has a `-- ROLLBACK:` comment block at the bottom with the
exact reverse SQL. If you ever need to roll back to pre-Plan-6 state:

1. Run rollbacks in REVERSE order (6 -> 5 -> 4 -> 3 -> 2 -> 1) so
   dependent objects are dropped first.
2. After rolling back schemas, redeploy the previous edge function code
   for `google-calendar-auth` (restore the dual-read fallback from
   commit `cec9554`).
3. The service-role key remains rotated; rotation is one-way. No backout.
4. The frontend bundle stays current (the dist/ artifacts ship without
   any plan-tier gating relying on RLS being correct; they only become
   correct again once the migrations are re-applied).

A backout means losing the trust kernel. The system is BACK to CRIT-01
risk. Treat as P0 incident.
