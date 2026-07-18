# Phase 1: Security & Foundation Hardening — Pattern Map

**Mapped:** 2026-05-11
**Files analyzed:** ~32 files (6 NEW SQL migrations, 14 MODIFY TS source files, 4 MODIFY config files, 6 NEW test files, 2 NEW shell/test scripts, 1 MODIFY edge function, 1 MODIFY CI workflow)
**Analogs found:** 28 / 32 (4 greenfield: Vite plugin, integration test setup, CI integration job, secret-guard shell script)

**Key project conventions to enforce in every new file:**
- TypeScript strict; no `any` outside boundaries; `@/` path alias for `src/`
- `logger.*` (from `@/lib/logger`) NOT `console.*` — recent migration; verify in PR
- Hooks `useFooBar`, components `FooBar`, files match identifier
- Edge functions: Deno + `_shared/` helpers + Zod via `parseAndValidate`
- Migrations: timestamped SQL in `supabase/migrations/<UTC>_<uuid>.sql`; comment block at top documents forward + reverse mapping
- Tests: Vitest 4.1.4 + `@testing-library/react` (already in devDeps); pattern `src/**/*.test.{ts,tsx}`; cleanup in `src/test/setup.ts`

---

## File Classification

### Group A — NEW SQL Migrations (`supabase/migrations/20260512XXXX_*.sql`)

| New File (purpose) | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|----------------|---------------|
| `20260512XXXX01_consolidate_subscription_plan_enum.sql` | DDL migration (enum recreate + function recreate) | transactional DDL | `supabase/migrations/20260206223914_*.sql` (legacy ALTER TYPE ADD VALUE) **+** `supabase/migrations/20251228134346_*.sql:1-58` (original CREATE TYPE + handle_new_user) | role-match (no analog uses recreate-type pattern; legacy uses the ADD-VALUE pattern we MUST NOT copy) |
| `20260512XXXX02_create_has_plan_function.sql` | DDL migration (SECURITY DEFINER function) | function create | `supabase/migrations/20251228134346_*.sql:79-104` (`can_access_feature` SECURITY DEFINER template) | exact (template structure identical) |
| `20260512XXXX03_create_managed_accounts.sql` | DDL migration (table + RLS + function) | DDL | `supabase/migrations/20260131123615_*.sql:1-120` (table + ENABLE RLS + 4 policies) | exact |
| `20260512XXXX04_rewrite_travel_rls_with_has_plan.sql` | DDL migration (DROP + CREATE policies) | RLS rewrite | `supabase/migrations/20260131123615_*.sql:101-120` (current `auth.uid() = user_id` policies) | exact (replaces target file's policies) |
| `20260512XXXX05_rewrite_vip_rls_with_has_plan.sql` | DDL migration (DROP + CREATE policies) | RLS rewrite | same as above (vip_* tables follow identical pattern) | role-match |
| `20260512XXXX06_update_handle_new_user_for_canonical_enum.sql` | DDL migration (function recreate) | function update | `supabase/migrations/20260206223931_*.sql:12-63` (`handle_new_user` recreate after enum change) | exact |

### Group B — MODIFY existing TS source (SEC-03 secret cleanup + SEC-05 enum collapse)

| Modified File | Role | Data Flow | Closest Analog (for new shape) | Match Quality |
|---------------|------|-----------|--------------------------------|---------------|
| `vite.config.ts` (lines 7-22 + plugins array) | Vite config | build-time | RESEARCH §Pattern 2 + RESEARCH §Example 2; existing plugin `componentTagger`/`VitePWA` integration in `vite.config.ts:36-209` | partial (no in-repo Vite plugin exists; conditional plugin at line 38 shows the array idiom) |
| `src/integrations/supabase/client.ts` (lines 7, 22-29) | Supabase client factory | runtime config | RESEARCH §Example 2 (target shape); current file lines 1-18 is the keep-pattern | exact |
| `src/hooks/useSubscription.ts` (lines 5, 240-245, 264, 99-114, 124-129, 142-143, 268-269, 301-302) | hook | server state (react-query) | self (lines 1-4, 6-58, 263, 265 stay; surrounding shape unchanged) | exact (in-place rewrite) |
| `src/components/PlanProtectedRoute.tsx` (lines 14, 17, 28-32) | route guard component | render-time | self (current file structure stays; only literals + helper names change) | exact |
| `src/components/UpgradeBanner.tsx` (lines 11, 17, 46) | UI component | render-time | self | exact |
| `src/components/UpgradePrompt.tsx` (lines 12, 20, 39, 48) | UI component | render-time | self | exact |
| `src/components/layout/sidebar/SidebarUserInfo.tsx` (lines 15, 38) | UI component | render-time | self | exact |
| `src/components/landing/AnimatedSections.tsx:402-403` | UI component (marketing) | render-time | self | exact |
| `src/config/sidebarNavigation.ts` (lines 47, 86, 98, 117-120, 159, 182, 204, 207) | config module | static | self | exact |
| `src/lib/subscriptionLeads.ts:4` | type module | static | self | exact |
| `src/pages/Assinatura.tsx` (lines 69, 248, 265, 532, 537) | page | render-time | self | exact |
| `src/pages/sistema/Programas.tsx:372` | page | render-time | self | exact |
| `src/pages/Relatorios.tsx:354` | page | render-time | self | exact |
| `src/pages/Analises.tsx:80` | page | render-time | self | exact |
| `src/App.tsx:143` | router | render-time | self | exact |

### Group C — MODIFY existing edge function (SEC-03 OAuth state secret split)

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------|------|-----------|----------------|---------------|
| `supabase/functions/google-calendar-auth/index.ts` (line 12; later remove fallback) | edge function (Deno) | request-response + signed token | self (lines 1-12 = the only edit point in step 1; full file is reference) | exact |

### Group D — MODIFY config

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------|------|-----------|----------------|---------------|
| `vitest.config.ts` (split into multi-project) | test config | build-time | RESEARCH §Pattern 1; existing file lines 1-28 = unit-only baseline | exact (in-place rewrite) |
| `package.json` scripts (lines 6-18) — add `test:unit` and `test:integration` shortcuts (optional) | manifest | static | self (line 13-15 already define `test`/`test:watch`/`test:ui`) | exact |
| `.github/workflows/ci.yml` — add `integration` job after `audit` (line 81) | CI workflow | pipeline | RESEARCH §Example 3 + existing `quality` job (lines 17-59) | role-match (no analog uses Supabase CLI or `supabase start` in this repo) |

### Group E — NEW test files

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `src/test/integration/setup.ts` | integration test bootstrap | beforeAll/afterAll | RESEARCH §Pattern 3 (verbatim template); existing `src/test/setup.ts` (cleanup-only baseline) | role-match (no in-repo integration setup yet) |
| `src/test/integration/adminClient.ts` | service-role Supabase client factory | client construction | `src/integrations/supabase/client.ts:12-18` (createClient idiom) | role-match |
| `src/test/integration/fixtures.ts` | test user fixtures + helpers | data seeding | RESEARCH §Pattern 3 (`clientAs`, FREE_USER, PRO_USER, VIP_USER) | greenfield (no analog) |
| `src/hooks/travel/travel.adversarial.test.ts` | integration test (table-driven RLS) | DB round-trip | RESEARCH §Pattern 4 (verbatim template); for vitest mechanics: `src/hooks/useFormValidation.test.ts:1-56` | role-match (mechanics from hook test; data flow is brand new) |
| `src/contexts/AuthProvider.test.tsx` | component test (first in repo) | render + assertion | `src/hooks/useFormValidation.test.ts:1-56` (renderHook + act); shape: `src/lib/subscriptionLeads.test.ts:1-46` (vi.mock supabase) | role-match (component-level testing is new; pieces exist) |
| `src/components/PlanProtectedRoute.test.tsx` | component test | render + Navigate assertion | `src/hooks/useFormValidation.test.ts` for renderHook; for mocking `useSubscription`: `src/lib/subscriptionLeads.test.ts:1-16` (vi.mock pattern) | role-match |
| `src/hooks/useSubscription.test.ts` | hook test | render + assertion | `src/lib/subscriptionLeads.test.ts:1-46` (vi.mock supabase) + `src/hooks/useFormValidation.test.ts` (renderHook) | exact (combination of two existing patterns) |
| `src/components/ErrorBoundary.test.tsx` | component test | render + throw assertion | `src/hooks/useFormValidation.test.ts:1-56` for harness shape; new territory for "throw inside child" | role-match |

### Group F — NEW scripts

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `scripts/test-secret-guard.sh` | shell smoke test | exec + assert exit code | existing `scripts/*.py` files (Python audit scripts; shell convention is new but `scripts/` dir exists) | role-match |

---

## Pattern Assignments

### A1. NEW migration `20260512XXXX01_consolidate_subscription_plan_enum.sql` (DDL, transactional)

**Analog (template structure for SECURITY DEFINER + comment block + handle_new_user):** `supabase/migrations/20251228134346_09ff8933-fdd7-4006-b6b0-051e339f9f12.sql:1-58`

**Anti-analog (DO NOT copy — uses forbidden ADD VALUE pattern):** `supabase/migrations/20260206223914_3afbad61-a11d-4a02-aa23-f50ee801d380.sql:1-3`
```sql
-- DO NOT copy: ALTER TYPE ADD VALUE conflicts with same-transaction UPDATE (see Pitfall 2).
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'basic';
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'pro_familia';
```

**Comment block convention (CONTEXT specific idea; not yet present in repo — pioneer):**
```sql
-- Migration 01: Consolidate subscription_plan enum 5 -> 3
-- Forward:  agency -> vip, pro_familia -> vip, basic -> pro, free -> free, pro -> pro
-- Reverse:  see commented rollback at bottom of file + companion 01-rollback.sql
-- Pre-check: SELECT plan, COUNT(*) FROM user_subscriptions GROUP BY plan;
--   (committed in PR description before this migration runs)
```

**Reuse-this template (analog `20251228134346_*.sql:60-76` for `get_user_plan`):**
```sql
CREATE OR REPLACE FUNCTION public.get_user_plan(_user_id uuid)
RETURNS subscription_plan
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT plan FROM public.user_subscriptions
     WHERE user_id = _user_id
     AND is_active = true
     AND (expires_at IS NULL OR expires_at > now())
    ),
    'free'::subscription_plan
  )
$$;
```

**Full enum-recreate body:** RESEARCH.md §Pattern 5, lines 500-581 (verbatim ready-to-use). Wrap in `BEGIN; ... COMMIT;`.

**handle_new_user idiom to update (analog `20260206223931_*.sql:12-63`):**
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  initial_plan subscription_plan;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'standard');
  initial_plan := COALESCE(
    (NEW.raw_user_meta_data->>'initial_plan')::subscription_plan,
    'free'::subscription_plan
  );
  -- (recreate INSERT with collapsed enum values: free, pro, vip)
  RETURN NEW;
END;
$function$;
```

---

### A2. NEW migration `20260512XXXX02_create_has_plan_function.sql`

**Analog (SECURITY DEFINER hierarchical check):** `supabase/migrations/20251228134346_*.sql:79-104` (`can_access_feature`)

**Reuse-this template — copy structure, swap body to RESEARCH §Example 1 (lines 800-836):**
```sql
CREATE OR REPLACE FUNCTION public.has_plan(_user_id uuid, _required_plan public.subscription_plan)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan public.subscription_plan;
BEGIN
  SELECT plan INTO user_plan
  FROM public.user_subscriptions
  WHERE user_id = _user_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());

  IF user_plan IS NULL THEN
    RETURN _required_plan = 'free';
  END IF;

  RETURN CASE _required_plan
    WHEN 'free' THEN true
    WHEN 'pro'  THEN user_plan IN ('pro', 'vip')
    WHEN 'vip'  THEN user_plan = 'vip'
  END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.has_plan FROM public;
GRANT  EXECUTE ON FUNCTION public.has_plan TO authenticated;
```

**Convention note:** All three legacy functions (`get_user_plan`, `can_access_feature`, `count_monthly_operations`) use `SECURITY DEFINER SET search_path = public`. Replicate identically.

---

### A3. NEW migration `20260512XXXX03_create_managed_accounts.sql`

**Analog (table + RLS + 4 policies):** `supabase/migrations/20260131123615_*.sql:1-120` (travel_cruises full setup)

**Table+RLS template** (lines 1-25, 94-104):
```sql
CREATE TABLE public.travel_cruises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.travel_clients(id) ON DELETE CASCADE,
  -- ... domain columns ...
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.travel_cruises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cruises" ON public.travel_cruises
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own cruises" ON public.travel_cruises
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- (UPDATE, DELETE)
```

**For `managed_accounts` schema body:** see `.planning/research/ARCHITECTURE.md §Multi-CPF Data Model` (canonical_refs). For the `can_access_account()` SECURITY DEFINER function, follow the same template as `has_plan` above (A2).

**Naming convention to set:** RESEARCH suggests `travel_cruises_select` snake_case grep-able naming (CONTEXT D-claude's-discretion §4). The legacy analog uses `"Users can view their own cruises"`. Recommend the planner pick ONE and apply to ALL Phase 1 new policies.

---

### A4 + A5. RLS rewrites for `travel_*` and `vip_*`

**Analog (current state — to be REPLACED):** `supabase/migrations/20260131123615_*.sql:101-120`
```sql
-- Current (auth.uid() only — to be replaced):
CREATE POLICY "Users can view their own cruises" ON public.travel_cruises FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own cruises" ON public.travel_cruises FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cruises" ON public.travel_cruises FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own cruises" ON public.travel_cruises FOR DELETE USING (auth.uid() = user_id);
```

**New shape (CONTEXT D-05 soft isolation — `has_plan` ONLY in WITH CHECK, not USING):**
```sql
-- Drop old (named per legacy convention):
DROP POLICY IF EXISTS "Users can view their own cruises" ON public.travel_cruises;
DROP POLICY IF EXISTS "Users can create their own cruises" ON public.travel_cruises;
DROP POLICY IF EXISTS "Users can update their own cruises" ON public.travel_cruises;
DROP POLICY IF EXISTS "Users can delete their own cruises" ON public.travel_cruises;

-- Recreate with trust kernel (soft-isolation: SELECT keeps USING-only; mutations add has_plan):
CREATE POLICY travel_cruises_select ON public.travel_cruises
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY travel_cruises_insert ON public.travel_cruises
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));
CREATE POLICY travel_cruises_update ON public.travel_cruises
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));
CREATE POLICY travel_cruises_delete ON public.travel_cruises
  FOR DELETE USING (auth.uid() = user_id);
```

**Planner action:** enumerate every `travel_*` and `vip_*` table via `\dt travel_* vip_*` (RESEARCH flag at line 995 — count is likely 10-12, not 14). Apply the same DROP+CREATE block for each. The table-name list seeds the `travel.adversarial.test.ts` `TRAVEL_TABLES` array.

---

### B1. MODIFY `vite.config.ts` — add `failOnSecretLeak()` plugin + delete fallback

**Analog (current file structure to surgically edit):** `vite.config.ts:1-22, 36-39, 209`

**Lines to DELETE (current):**
```typescript
// Line 7-15:
const SUPABASE_URL_FALLBACK = "https://opusftqbbaozucmbuuug.supabase.co";
const SUPABASE_PUBLISHABLE_KEY_FALLBACK =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wdXNmdHFiYmFvenVjbWJ1dXVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc1MjIsImV4cCI6MjA3OTgyMzUyMn0.hQhI7a7I30mokvqduYq4K1KOvJitFcvIs4VkOfGC5qk";
const SUPABASE_PROJECT_ID_FALLBACK = "opusftqbbaozucmbuuug";

// Lines 18-22:
const supabaseUrl = process.env.VITE_SUPABASE_URL || SUPABASE_URL_FALLBACK;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY_FALLBACK;
const supabaseProjectId = process.env.VITE_SUPABASE_PROJECT_ID || SUPABASE_PROJECT_ID_FALLBACK;
```

**Lines to KEEP and replace fallback expressions with direct env reads:**
```typescript
// Replace lines 18-22 with:
const supabaseUrl       = process.env.VITE_SUPABASE_URL!;
const supabaseKey       = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const supabaseProjectId = process.env.VITE_SUPABASE_PROJECT_ID!;
// (Build will fail in failOnSecretLeak() if missing; runtime define block then injects them.)
```

**Plugin idiom (analog: existing conditional plugin at vite.config.ts:38):**
```typescript
plugins: [
  failOnSecretLeak(),                                 // FIRST per Anti-Pattern note
  react(),
  mode === 'development' && componentTagger(),
  VitePWA({ /* ... unchanged ... */ }),
].filter(Boolean),
```

**Plugin body:** RESEARCH §Pattern 2 (lines 295-347 — verbatim ready-to-use). Place above the `defineConfig` call or inline at top of the file. CONTEXT discretion item #2 lets the planner extend the regex list.

**Pitfall reminder (RESEARCH Pitfall 4):** plugin uses `process.env`, NOT `import.meta.env`.

---

### B2. MODIFY `src/integrations/supabase/client.ts` — delete `supabaseAdmin`

**Analog (target shape, RESEARCH §Example 2 lines 838-861):**
```typescript
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
```

**Lines to DELETE from current file (`src/integrations/supabase/client.ts:7, 22-29`):**
```typescript
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY; // line 7
// ...
export const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY                              // lines 22-29
  ? createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { storage: localStorage, persistSession: false }
    })
  : null;
```

**Pre-check verification (RESEARCH line 990):** `grep -rn "supabaseAdmin" src/` returns 0 importers — deletion is safe.

---

### B3. MODIFY `src/hooks/useSubscription.ts` — collapse types and delete dual-read

**Analog (file unchanged structure-wise, surgical edits only):** `src/hooks/useSubscription.ts:1-317`

**KEEP these (no edits needed):** lines 1-4 (imports), 6-58 (interfaces), 60-115 (FEATURES const blocks — but rename `PLUS_FEATURES` → drop or repurpose), 116-136 (PLAN_DEFAULTS — drop `plus` key, keep `free`+`pro`, add `vip`), 138-220 (helpers + queries), 263, 265 (already-canonical `isFree`, `isPro`).

**EDIT lines 5, 240-245, 264, 268-269, 301-302** per CONTEXT D-02:
```typescript
// Line 5 — type:
export type SubscriptionPlan = 'free' | 'pro' | 'vip';

// Lines 240-245 — DELETE the collapse logic; replace with direct cast:
const plan: SubscriptionPlan = (subscription?.plan as SubscriptionPlan | undefined) ?? 'free';

// Line 264 — DELETE isPlus, keep isFree/isPro, add isVip:
const isVip = plan === 'vip';

// Lines 268-269 — collapse helpers:
const canAccessPro = isPro || isVip;
const canAccessVip = isVip;
// (delete canAccessPlus; rename consumers — see Group B downstream files)
```

**Surrounding pattern that stays unchanged (analog lines 178-220):**
```typescript
const { data: subscription, isLoading: subscriptionLoading } = useQuery({
  queryKey: ['user_subscription', user?.id],
  queryFn: async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('user_subscriptions').select('*')
      .eq('user_id', user.id).eq('is_active', true).maybeSingle();
    if (error) throw error;
    return data;
  },
  enabled: !!user,
});
```

**Convention enforcement:** Interface `SubscriptionData` (lines 33-58) already has `isPlus`, `canAccessPlus` — DELETE both, rename to `isVip`, `canAccessVip`.

---

### B4. MODIFY `src/components/PlanProtectedRoute.tsx`

**Analog (self):** `src/components/PlanProtectedRoute.tsx:1-40` (full file)

**Surgical edits:**
```typescript
// Line 14 — default plan:
requiredPlans = ['pro'],   // unchanged literal value but semantics shift; consider ['pro', 'vip']

// Line 17 — destructure:
const { plan, isLoading, canAccessPro, canAccessVip } = useSubscription();
//                                      ^^^^^^^^^^^ replaces canAccessPlus

// Lines 28-32 — gate check:
const hasAccess = requiredPlans.some(requiredPlan => {
  if (requiredPlan === 'free') return true;
  if (requiredPlan === 'pro')  return canAccessPro;
  if (requiredPlan === 'vip')  return canAccessVip;
  return false;
});
```

**Convention reminder:** Loader pattern (lines 19-24 — `Loader2 animate-spin`) stays.

---

### B5-B14. MODIFY remaining `'plus'` references (RESEARCH "NEW REFERENCES" table, lines 1001-1018)

These are mechanical grep-and-replace edits. Pattern is identical for each: change literal `'plus'` → `'pro'` (because old `plus` semantics == new `pro` per CONTEXT D-02), and change literal `'pro'` → `'vip'` ONLY where the legacy code meant the highest tier.

**Analog for marketing literal handling:** `src/components/UpgradeBanner.tsx:46`
```typescript
const planName = targetPlan === 'plus' ? 'Plus' : 'Pro';   // becomes:
const planName = targetPlan === 'vip'  ? 'VIP'  : 'Pro';
```

**Per-file action map** (use the verified table at RESEARCH §998-1018 — quoted in §Pattern Assignments §B5..B14 implicitly).

**Convention enforcement (across all 14 files):**
- Use `logger.*` not `console.*` if any logging is added
- Keep `@/` import paths
- After all edits: `grep -rE "['\"]plus['\"]" src/` MUST return 0 — this is the gate per RESEARCH §1060.

---

### C1. MODIFY `supabase/functions/google-calendar-auth/index.ts`

**Analog (self):** `supabase/functions/google-calendar-auth/index.ts:1-12, 41-77` (HMAC infra)

**Step 1 edit (line 12 — dual-read fallback):**
```typescript
// Current line 12:
const STATE_SIGNING_SECRET = SUPABASE_SERVICE_ROLE_KEY ?? '';

// New (per RESEARCH §Pattern 7):
const OAUTH_STATE_SECRET = Deno.env.get('OAUTH_STATE_SECRET');
const STATE_SIGNING_SECRET = OAUTH_STATE_SECRET ?? SUPABASE_SERVICE_ROLE_KEY ?? '';
```

**Step 2 edit (final commit of PR — remove fallback per CONTEXT D-10):**
```typescript
const STATE_SIGNING_SECRET = Deno.env.get('OAUTH_STATE_SECRET');
if (!STATE_SIGNING_SECRET) {
  throw new Error('OAUTH_STATE_SECRET not configured');
}
```

**Surrounding HMAC infra (KEEP unchanged):** `signState`/`verifyState`/`hmacSign`/`timingSafeEq` at lines 41-77 — no edits, only the secret source changes.

**Convention reminder:** edge functions use `Deno.env.get(...)` (NOT `import.meta.env`); `_shared/validate.ts` already in use at line 3 (Zod via `parseAndValidate`).

**TTL note (RESEARCH §665-668):** state TTL is 10 min (hardcoded in handler at line 147); CONTEXT's 1h wait is conservative — 11 min sufficient between Step 1 and Step 2.

---

### D1. MODIFY `vitest.config.ts` — multi-project split

**Analog (self, baseline):** `vitest.config.ts:1-28`

**New shape (RESEARCH §Pattern 1 lines 240-283 — verbatim ready):**
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    environment: 'jsdom',
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/**/*.adversarial.test.{ts,tsx}', 'src/test/integration/**'],
          setupFiles: ['./src/test/setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['src/**/*.adversarial.test.{ts,tsx}'],
          setupFiles: ['./src/test/integration/setup.ts'],
          fileParallelism: false,
          testTimeout: 15000,
          hookTimeout: 60000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['src/main.tsx', 'src/**/*.d.ts', 'src/test/**', 'src/integrations/**'],
    },
  },
});
```

---

### D2. MODIFY `.github/workflows/ci.yml` — add `integration` job

**Analog (existing `quality` job):** `.github/workflows/ci.yml:17-59`
```yaml
  quality:
    name: Lint, Typecheck & Build
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v5
      - name: Setup Node.js
        uses: actions/setup-node@v5
        with: { node-version: '22', cache: 'npm' }
      - name: Install dependencies
        run: npm ci
      - name: Lint
        run: npm run lint
      - name: Typecheck
        run: npm run typecheck
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_PROJECT_ID:    ${{ secrets.VITE_SUPABASE_PROJECT_ID }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
          VITE_SUPABASE_URL:           ${{ secrets.VITE_SUPABASE_URL }}
```

**New job to ADD after `audit` (line 81 — concat to bottom):** RESEARCH §Example 3 lines 866-919 (verbatim ready).

**Conventions to honor:**
- `actions/checkout@v5` and `actions/setup-node@v5` (matches existing job)
- `node-version: '22'` (matches existing job + CLAUDE.md)
- Job name `integration:` in lowercase (matches existing `quality:`/`audit:`)
- `cache: 'npm'` (matches)
- `concurrency:` block at top (lines 9-11) already covers the new job — no edit needed
- Add `needs: quality` per RESEARCH §871 to skip when lint already broken

**Greenfield element:** Supabase CLI usage (`supabase/setup-cli@v2`, `supabase start`, `supabase db reset`, `supabase status -o env`) — no analog in repo. RESEARCH §Pattern 7 + §Pitfall 7 provide the canonical sequence.

---

### E1. NEW `src/test/integration/setup.ts`

**Analog (existing `src/test/setup.ts:1-7` — minimal cleanup baseline):**
```typescript
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(() => { cleanup(); });
```

**New file body:** RESEARCH §Pattern 3 lines 360-421 (verbatim ready). Key requirements per Pitfall 1:
- `persistSession: false` on BOTH admin and user clients
- Fixed UUIDs `00000000-0000-0000-0000-00000000000{1,2,3}` for free/pro/vip
- `email_confirm: true` on `auth.admin.createUser` to skip confirmation flow
- `beforeAll` hook timeout = 60_000 (DB reset + 3 user creates)

**Convention enforcement:** uses `process.env.SUPABASE_*` (Node), NOT `import.meta.env.VITE_SUPABASE_*` (Vite client) — RESEARCH §Pitfall 4.

---

### E2. NEW `src/test/integration/adminClient.ts`

**Analog (createClient idiom):** `src/integrations/supabase/client.ts:12-18`
```typescript
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

**New shape (extracted from RESEARCH §Pattern 3 lines 372-374 — for reuse across multiple integration test files):**
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// CRITICAL: persistSession: false avoids jsdom session collision with user clients (Pitfall 1)
export const adminClient = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
```

**Convention:** import `Database` type via `@/` alias (matches `src/integrations/supabase/client.ts:3`).

---

### E3. NEW `src/test/integration/fixtures.ts`

**Analog:** RESEARCH §Pattern 3 `clientAs` helper (lines 410-420) — greenfield in this repo.

**Required exports:**
- `FREE_USER`, `PRO_USER`, `VIP_USER` constants (UUID + email + password)
- `clientAs(user)` async helper — creates per-test anon-key client with `persistSession: false`, signs in, returns client
- (optional) `seedTravelClient(userId)` helper for the `client_id` FK requirement noted in RESEARCH §Wave 0 Gaps line 1082

**Convention:** every fresh client gets `persistSession: false` (Pitfall 1).

---

### E4. NEW `src/hooks/travel/travel.adversarial.test.ts`

**Mechanics analog:** `src/hooks/useFormValidation.test.ts:1-56`
```typescript
import { describe, it, expect } from 'vitest';
// ...
describe('useFormValidation', () => {
  it('marks form valid when all fields pass', () => {
    const { result } = renderHook(() => useFormValidation({ ... }, config));
    expect(result.current.isFormValid).toBe(true);
  });
});
```

**Data-flow analog (greenfield in repo):** RESEARCH §Pattern 4 lines 429-484 (verbatim ready, `describe.each` table-driven). Per CONTEXT D-08 the `TRAVEL_TABLES` array is the single source of truth.

**Critical assertion shape per Pitfall 5:**
- INSERT denied → `expect(error?.code).toBe('42501')`
- SELECT denied (soft) → `expect(data?.length).toBe(0)` (NOT error)
- SELECT allowed after downgrade (D-05) → `expect(data?.length).toBeGreaterThan(0)`

**Plan-change re-signin requirement (Pitfall 6):** every test that changes plan via admin MUST re-call `clientAs(user)` to refresh the JWT.

**FK seeding requirement (RESEARCH §1082):** every `travel_*.client_id` references `travel_clients(id)` — `beforeAll` must insert a `travel_clients` row owned by each test user, OR use a `seedTravelClient` fixture from E3.

---

### E5. NEW `src/contexts/AuthProvider.test.tsx`

**Mechanics analog (renderHook + act):** `src/hooks/useFormValidation.test.ts:1-56`

**vi.mock pattern analog:** `src/lib/subscriptionLeads.test.ts:1-16`
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null })),
        })),
      })),
    })),
    functions: { invoke: vi.fn() },
    auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: null } })) },
  },
}));
```

**Target component shape (`src/contexts/AuthProvider.tsx:1-122`):** must mock `supabase.auth.getSession`, `supabase.auth.onAuthStateChange`, `supabase.auth.signUp`, `supabase.auth.signInWithPassword`, `supabase.auth.signOut`, `supabase.from('profiles').upsert`. Must mock `@/lib/auditLogger` (`auditAuth.signup`/`loginSuccess`/`loginFailed`/`logout`) and `@/lib/queryClient` (`queryClient.clear`).

**Coverage targets per CONTEXT (line 109):** signup, signin, signout, profile creation. Each is one `it()`.

**Convention reminders:**
- Use `logger.*` mock pattern (already a recent migration; mock the module if it's noisy in tests)
- Suite name `describe('AuthProvider')` to match file's component name

---

### E6. NEW `src/components/PlanProtectedRoute.test.tsx`

**Mechanics analog:** `src/hooks/useFormValidation.test.ts` for renderHook; `src/lib/subscriptionLeads.test.ts:1-16` for `vi.mock`.

**Target shape (`src/components/PlanProtectedRoute.tsx:1-40`):**
- Mock `@/hooks/useSubscription` to return controlled `{ plan, isLoading, canAccessPro, canAccessVip }`
- Mock `react-router-dom`'s `Navigate` to capture redirect target
- Render `<PlanProtectedRoute requiredPlans={[...]}>{children}</PlanProtectedRoute>`
- Assert children rendered OR Navigate-mock invoked with `redirectTo`

**Test cases to cover:**
- isLoading → loader visible
- requiredPlans=['pro'], plan='free' → redirect
- requiredPlans=['pro'], plan='pro' → children rendered
- requiredPlans=['vip'], plan='pro' → redirect
- requiredPlans=['vip'], plan='vip' → children rendered

---

### E7. NEW `src/hooks/useSubscription.test.ts`

**Combination of two existing patterns:**

**Pattern A — vi.mock supabase (`src/lib/subscriptionLeads.test.ts:4-16`):**
```typescript
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(/* ... */) },
}));
```

**Pattern B — renderHook (`src/hooks/useFormValidation.test.ts:11-13`):**
```typescript
const { result } = renderHook(() => useSubscription());
expect(result.current.plan).toBe('free');
```

**Required mocks:** `useAuth` (returns `{ user: { id: '...' } }`), `supabase.from('user_subscriptions').select(...).eq(...).eq(...).maybeSingle()` returning each plan.

**Test cases:** 1 happy-path per plan (free/pro/vip), 1 case verifying the deleted collapse logic stays deleted (e.g., DB returning legacy `'basic'` should NOT collapse to `'pro'` — should default to `'free'` per the new direct-cast).

---

### E8. NEW `src/components/ErrorBoundary.test.tsx`

**Mechanics analog:** `src/hooks/useFormValidation.test.ts` (renderHook idiom doesn't quite apply — use `render` from `@testing-library/react`).

**Target component shape (`src/components/ErrorBoundary.tsx:1-60`):**
- Wrap a child that throws → assert ErrorFallback UI ("Algo deu errado", "Tentar novamente" button) renders
- Click "Tentar novamente" → assert `resetErrorBoundary` invoked
- Mock `react-router-dom`'s `useNavigate` to verify "Voltar para home" navigates to `/dashboard`
- Mock `@/lib/errorSanitizer` (`sanitizeError`) and `@/lib/logger` (`logger.error`)

**Convention:** suite name matches file (`describe('ErrorBoundary')`).

---

### F1. NEW `scripts/test-secret-guard.sh`

**Analog:** `scripts/` directory exists with Python audit scripts (`audit-production-routes.py`, `production-functional-smoke.py`) — no shell precedent. Make it portable (bash + git bash on Windows).

**Required behavior (RESEARCH §1058):**
```bash
#!/usr/bin/env bash
set -e

# Test 1: build with forbidden VITE_*SERVICE_ROLE* MUST exit non-zero
echo "Testing failOnSecretLeak (should reject service-role)..."
if VITE_FAKE_SERVICE_ROLE_KEY=x npm run build 2>&1 | grep -q 'failOnSecretLeak'; then
  echo "  PASS — build rejected as expected"
else
  echo "  FAIL — build did not reject the dangerous env var"
  exit 1
fi

# Test 2: build without VITE_SUPABASE_PUBLISHABLE_KEY MUST exit non-zero
unset VITE_SUPABASE_PUBLISHABLE_KEY
echo "Testing failOnSecretLeak (should reject missing required vars)..."
if ! npm run build 2>&1 | grep -q 'Required env vars missing'; then
  echo "  FAIL — build did not reject missing required vars"
  exit 1
fi

echo "All secret-guard checks passed."
```

**Convention:** lives in `scripts/` (existing dir); shebang `#!/usr/bin/env bash`; exit code 0 = success, 1 = failure.

---

## Shared Patterns

### S1. Logger usage (CLAUDE.md core convention)

**Source:** `src/lib/logger.ts` (existing); usage example `src/contexts/AuthProvider.tsx:6, 37, 69-71`
```typescript
import { logger } from '@/lib/logger';
logger.log('[Module]', 'Action description', { context });
logger.error('[Module]', 'Error description', err);
```

**Apply to:** ALL new and modified TS source files (Group B, C, E). NO `console.*` allowed except in `vite.config.ts` plugin error throws (which run at Node build time, before logger module is loaded).

---

### S2. Path alias `@/` for src/

**Source:** `vite.config.ts:210-213` + `vitest.config.ts:7-10`
```typescript
resolve: { alias: { '@': path.resolve(__dirname, './src') } }
```

**Apply to:** ALL new TS files in Group E. `import { adminClient } from '@/test/integration/adminClient'` — never relative paths across folders.

---

### S3. Supabase client import idiom

**Source:** `src/integrations/supabase/client.ts:9-10` (comment block) + every consumer (e.g., `src/hooks/travel/useTravelCruises.ts:2`)
```typescript
import { supabase } from '@/integrations/supabase/client';
```

**Apply to:** All TS source files that hit DB at runtime. NEVER import `supabaseAdmin` (deleted).

---

### S4. SECURITY DEFINER SQL function template

**Source:** `supabase/migrations/20251228134346_*.sql:60-104` (`get_user_plan`, `can_access_feature`)
```sql
CREATE OR REPLACE FUNCTION public.<name>(<args>)
RETURNS <type>
LANGUAGE plpgsql           -- or sql for one-liner
STABLE                     -- or VOLATILE if mutating
SECURITY DEFINER
SET search_path = public
AS $$
  -- body
$$;

REVOKE EXECUTE ON FUNCTION public.<name> FROM public;
GRANT  EXECUTE ON FUNCTION public.<name> TO authenticated;
```

**Apply to:** `has_plan` (A2), `can_access_account` (A3), recreated `handle_new_user` (A1/A6), recreated `get_user_plan`/`can_access_feature`/`can_create_operation`/`count_monthly_operations` (A1).

---

### S5. RLS soft-isolation policy template (CONTEXT D-05)

**Source:** new pattern this phase (no analog uses it yet); template from §A4-A5 above.

**Apply to:** every `travel_*` and `vip_*` table; every `managed_accounts` policy where `can_access_account()` replaces `auth.uid() = user_id`.

**Idiom:**
```sql
-- USING for SELECT/UPDATE/DELETE — no has_plan() check (soft isolation)
CREATE POLICY <table>_select ON public.<table>
  FOR SELECT USING (auth.uid() = user_id);
-- WITH CHECK for INSERT/UPDATE — adds has_plan() (hard write boundary)
CREATE POLICY <table>_insert ON public.<table>
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), 'pro'));
```

---

### S6. vi.mock idiom for component/hook tests

**Source:** `src/lib/subscriptionLeads.test.ts:4-16`

**Apply to:** E5, E6, E7 (any unit test that consumes `@/integrations/supabase/client`, `@/hooks/useAuth`, `@/hooks/useSubscription`, `@/lib/auditLogger`, `@/lib/queryClient`).

---

### S7. Migration comment-block convention (CONTEXT specifics — pioneer)

**Source:** No prior migration in repo uses a structured forward/reverse comment block. CONTEXT line 156-162 + RESEARCH §Pattern 5 line 500-504 establish the standard.

**Apply to:** all 6 migrations in Group A. Required header:
```sql
-- Migration NN: <one-line summary>
-- Forward:  <semantic mapping or no-op note>
-- Reverse:  <reference to companion rollback file or inline comment>
-- Pre-check: <SQL snippet committed in PR description>
```

---

## No Analog Found (Greenfield)

| New File | Why no analog | Reference to use instead |
|----------|---------------|--------------------------|
| `vite.config.ts` `failOnSecretLeak()` plugin | No custom Vite plugins exist in repo (only third-party: `react`, `componentTagger`, `VitePWA`) | RESEARCH §Pattern 2 (verbatim) |
| `src/test/integration/*` (entire dir) | No integration testing exists; current `src/test/setup.ts` is unit-only | RESEARCH §Pattern 3 (verbatim) |
| `src/hooks/travel/travel.adversarial.test.ts` table-driven against real Supabase | No real-DB tests in repo (all 17 existing tests are pure-unit with mocks) | RESEARCH §Pattern 4 (verbatim) + Pitfalls 1, 5, 6 |
| `.github/workflows/ci.yml` `integration:` job (Supabase CLI + Docker) | No Supabase CLI usage in CI yet | RESEARCH §Example 3 (verbatim) + Pitfall 7 (parallel-with-npm-ci optimization) |
| `scripts/test-secret-guard.sh` | `scripts/` dir is Python-only today; first bash script | Sketch in §F1 above |
| Migration comment-block convention (forward/reverse mapping) | No migration in repo has structured rollback documentation | CONTEXT §Specifics line 156-162 |

---

## Pre-flight Checks (per RESEARCH §Pitfall 3)

Before applying migration A1, the planner's plan MUST include these `psql` verification commands run against a freshly-restored prod dump:

```sql
-- 1. Verify no generated columns / functional indexes depend on the to-be-dropped functions:
\d+ public.user_subscriptions
\d+ public.user_roles

-- 2. Snapshot current plan distribution (commit output to PR description):
SELECT plan, COUNT(*) FROM public.user_subscriptions GROUP BY plan ORDER BY plan;

-- 3. Confirm no auth.jwt() ->> 'plan' usage anywhere (Pitfall 6):
-- (run from shell, not psql)
grep -rE "auth\.jwt\(\) ->> 'plan'" supabase/migrations/    # MUST return 0

-- 4. Confirm supabaseAdmin has 0 importers (RESEARCH §990):
grep -rn "supabaseAdmin" src/                                 # MUST return 0
```

---

## Metadata

**Analog search scope:**
- `vite.config.ts`, `vitest.config.ts`, `package.json`, `.github/workflows/ci.yml` (full reads)
- `src/integrations/supabase/client.ts`, `src/hooks/useSubscription.ts`, `src/components/PlanProtectedRoute.tsx`, `src/components/UpgradeBanner.tsx`, `src/components/UpgradePrompt.tsx`, `src/components/ErrorBoundary.tsx` (full reads)
- `src/contexts/AuthProvider.tsx` (lines 1-122)
- `src/hooks/travel/useTravelCruises.ts` (representative travel hook)
- `src/hooks/useFormValidation.test.ts`, `src/hooks/useRateLimit.test.ts`, `src/lib/subscriptionLeads.test.ts`, `src/test/setup.ts` (existing test conventions)
- `supabase/migrations/20251228134346_*.sql` (original CREATE TYPE + SECURITY DEFINER template)
- `supabase/migrations/20260131123615_*.sql` (current travel RLS — replacement target)
- `supabase/migrations/20260206223914_*.sql` (anti-analog: ALTER TYPE ADD VALUE)
- `supabase/migrations/20260206223931_*.sql` (handle_new_user recreate template)
- `supabase/functions/google-calendar-auth/index.ts`, `supabase/functions/_shared/validate.ts` (edge function conventions)
- `Glob: src/hooks/travel/*.ts`, `src/**/*.test.{ts,tsx}`, `supabase/migrations/*.sql`, `.github/workflows/*.yml`

**Files scanned:** ~25 source/migration/config files

**Pattern extraction date:** 2026-05-11
