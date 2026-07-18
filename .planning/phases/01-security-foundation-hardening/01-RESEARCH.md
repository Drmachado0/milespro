# Phase 1: Security & Foundation Hardening — Research

**Researched:** 2026-05-11
**Domain:** Trust kernel server-side, Supabase RLS, Postgres enum migration, Vite secret guard, adversarial Vitest+Supabase local testing
**Confidence:** HIGH (primary findings cited from official Supabase + Postgres + Vite docs and verified against codebase grep); MEDIUM on `supabase db reset` exact timings (no canonical benchmark)

---

## Summary

This research fills the **gaps left by ARCHITECTURE.md and CONTEXT.md** for Phase 1. The strategic decisions (trust kernel SQL, RLS soft-isolation pattern, single-PR rollout, OAUTH_STATE_SECRET split, table-driven `travel.adversarial.test.ts`) are **already locked**. What the planner still needs is:

1. **Internal Vitest pattern** to mock Supabase OR talk to a real local Supabase (we use both — units mock; adversarial integration talks to local). [VERIFIED: codebase grep + reading `src/lib/offlineQueue.test.ts`, `src/test/setup.ts`]
2. **Exact CI YAML** for `supabase start` (≈2-3 min on Ubuntu runners, must use `setup-cli@v2`). [CITED: github.com/supabase/setup-cli]
3. **Vite plugin `config()` shape** that throws — `process.env` IS available; throwing in `config()` aborts the build. [CITED: vite.dev/guide/api-plugin]
4. **Postgres enum reduction sequence** — rename old type, create new type, `ALTER TABLE ... ALTER COLUMN ... TYPE new USING (CASE...)`, drop old, drop column defaults first. ALL safe in a single transaction (DDL is transactional in Postgres). SQL functions referencing the old type **must be DROPPED before** type drop, then recreated against the new type — same transaction OK. [CITED: blog.yo1.dog + postgres docs]
5. **Service-role rotation:** `supabase secrets set` does NOT require redeploy. Functions pick up new value immediately. No documented caching gotcha. Redeploy is only needed if the function code itself changed. [CITED: supabase.com/docs/guides/functions/secrets]
6. **RLS error shape in supabase-js v2:** PostgREST returns HTTP 403 (when authenticated) with `{ data: null, error: { code: '42501', message: '...row-level security policy...', details: null, hint: null } }`. The supabase-js client does NOT throw — it returns the `{ data, error }` shape. [CITED: supabase.com/docs/guides/api/rest/postgrest-error-codes + supabase.com/docs/guides/troubleshooting/database-api-42501-errors]
7. **OAUTH_STATE_SECRET dual-read pattern** — function reads `OAUTH_STATE_SECRET ?? SUPABASE_SERVICE_ROLE_KEY` during PR window; Google OAuth state has 10 min TTL (already enforced in code line 147 of `google-calendar-auth/index.ts`), so fallback can be removed 1h after deploy.
8. **`supabase db reset` is slow (~30-60s); prefer per-test TRUNCATE + per-suite unique IDs** — but for the small Phase 1 adversarial suite (3 users × ~16 tables), `db reset` once in `beforeAll` is acceptable and simpler than coordinating cleanup. Vitest parallel workers force one shared local Supabase, so test files must use unique user_ids and not race on shared rows. [CITED: index.garden/supabase-vitest]
9. **Code refs in CONTEXT.md are MOSTLY correct, but TS enum collapse is broader than listed:** 11 files reference `'plus'` (not 5 as CONTEXT implies). New refs the planner must touch: `src/App.tsx:143`, `src/config/sidebarNavigation.ts` (8 refs), `src/components/layout/sidebar/SidebarUserInfo.tsx`, `src/lib/subscriptionLeads.ts`, `src/pages/sistema/Programas.tsx:372`, `src/pages/Relatorios.tsx:354`, `src/pages/Analises.tsx:80`, `src/components/landing/AnimatedSections.tsx:402-403`. Confirmed via grep.

**Primary recommendation:** Wave 0 of the plan must (a) install no new npm deps (Vitest + supabase-js + jsdom already cover everything), (b) create `src/test/integrationSetup.ts` separate from `src/test/setup.ts` to keep unit tests fast and integration tests opt-in via a Vitest project config or naming convention, (c) add the `supabase start` step to CI as a separate job (not in `quality`) so failures are isolated and the ~3 min cost doesn't block lint/build feedback.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Enum Consolidation (SEC-05)**
- **D-01:** Mapeamento semântico do enum legado: `agency` → `vip`, `pro_familia` → `vip`, `basic` → `pro`. Backfill via `UPDATE user_subscriptions SET plan = ...` ANTES do enum recreate. Comment block no topo da migration documenta o mapping reverso pra rollback.
- **D-02:** TypeScript refactor é big bang em 1 PR: o tipo `SubscriptionPlan` em `src/hooks/useSubscription.ts:5` vira `'free' | 'pro' | 'vip'`; collapse logic em `useSubscription.ts:242-245` é deletada; grep-and-replace `'plus'` → `'pro'` (porque `plus` no TS == `basic` no DB == `pro` no novo enum) em `UpgradeBanner.tsx:46`, `UpgradePrompt.tsx:39,48`, `Assinatura.tsx:532,537`. `isPlus` em `useSubscription.ts:264` é deletado ou renomeado pra `isPro`. Sem dual-read, sem feature flag.

**Migration Cadence & Rollout (SEC-01..SEC-06)**
- **D-03:** 1 PR único cobrindo todas as 6 migrations desta phase + secret cleanup (SEC-03/SEC-04) + Vite plugin (SEC-03) + TS refactor (SEC-05) + testes (SEC-07). Solo dev sem pagantes = sem custo de coordenação. Rollback é `git revert` + `supabase migration repair`.
- **D-04:** Pre-deploy test obrigatório: `supabase db dump --data-only` da prod → restore em `supabase start` local → aplica migrations → roda adversarial Vitest + smoke manual → SÓ ENTÃO `supabase db push` pra prod. Captura row inválido travando backfill.

**RLS Isolation Behavior (SEC-01, SEC-02)**
- **D-05:** Soft isolation em **todas** as famílias de tabela: `travel_*`, `vip_*`, `managed_accounts`. SELECT continua permitido pelo plano antigo após downgrade (`USING (auth.uid() = user_id)` ou `USING (can_access_account(...))` sem `has_plan`). INSERT/UPDATE/DELETE bloqueados (`WITH CHECK` adiciona `has_plan(...)`). Re-upgrade restaura escrita imediatamente.
- **D-06:** Revoke explícito de uma `managed_account` (consultor remove cliente intencionalmente via UPDATE em `revoked_at`) é **hard**: a função `can_access_account()` checa `revoked_at IS NULL`, então o relacionamento fica invisível imediatamente para o owner. Diferente de downgrade, que mantém visibilidade. Os dados do `managed_user_id` permanecem (auth.users + operations etc), só a ponte some.

**Test Strategy (SEC-07)**
- **D-07:** Testes adversariais em Vitest contra Supabase local. CI levanta `supabase start` no runner, cria 3 users com JWTs reais (free/pro/vip via `supabase.auth.admin.createUser` + `signInWithPassword`), Vitest dispara `supabase.from('travel_cruises').insert(...)` e espera erro `42501` ou status 403/401. Cobre o Success Criterion #1 do roadmap.
- **D-08:** 14 hooks em `src/hooks/travel/*` (na verdade 16 — ver seção "Verified Code References" abaixo) cobertos por 1 arquivo `travel.adversarial.test.ts` table-driven.

**Secret Rotation & Separation (SEC-03)**
- **D-09:** Service-role key rotacionado **depois** do deploy do código limpo. Sequência rígida: deploy do PR limpo → CI verde → Supabase Dashboard reset → `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<novo>` → smoke test edge functions.
- **D-10:** `OAUTH_STATE_SECRET` separado do service-role nesta phase com fallback temporário durante PR window; remoção do fallback é commit final do PR.

### Claude's Discretion

- Granularidade interna dos plans dentro do single PR (4-6 plans, mas todos no mesmo PR);
- Regex exato do `failOnSecretLeak()` Vite plugin — minimum: `/^VITE_.*(SERVICE_ROLE|SECRET_KEY|WEBHOOK_SECRET|PRIVATE_KEY)/`. Adicionar `_TOKEN`, `STRIPE_*`, `ASAAS_*` é judgment;
- Escopo de cleanup hygiene LOW concerns (3 lockfiles, `.npmrc`, `.lovable/plan.md`, Node version mismatch) — opportunistic;
- Naming convention das policies RLS — research usa `travel_cruises_select`/`_insert` snake_case;
- Ordem dos commits dentro do PR (planner usa wave-based execution);
- Layout exato do CI workflow YAML pra `supabase start` em GitHub Actions.

### Deferred Ideas (OUT OF SCOPE)

- Cleanup hygiene LOW concerns (3 lockfiles, `.npmrc legacy-peer-deps`, `.lovable/plan.md`, Node 22↔25 type mismatch) — opportunistic per roadmap;
- `webhook_events` table — Phase 2;
- `managed_accounts` UI — Phase 2 (só TABLE + RLS sai nesta phase);
- `stripe_*` legacy columns em `user_subscriptions` — viram `asaas_*` em Phase 2;
- pgTAP como suite alternativa — descartado;
- bash `curl` script CI step dedicado — descartado a favor do Vitest equivalente;
- Cleanup do `can_access_feature()` legacy function — defere; planner pode marcar `DEPRECATED`;
- Service-role key rotation periódica programática — defere;
- Auditoria empírica de indexes — defere.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description (verbatim from REQUIREMENTS.md) | Research Support |
|----|---------------------------------------------|------------------|
| SEC-01 | Plan gating server-side via RLS — usuário Free não consegue ler/escrever em colunas/tabelas pagas mesmo via REST direto. Adversarial test: `curl` autenticado como Free retorna 403 em endpoints Pro/VIP. | RLS pattern + `has_plan()` covered in ARCHITECTURE.md §Plan Gating Server-Side; adversarial test pattern in §Adversarial RLS Tests below; expected 403 status confirmed in §RLS Error Shape. |
| SEC-02 | Auditoria + reescrita de RLS em todas as tabelas `travel_*` e `vip_*` — toda policy combina `auth.uid() = user_id` com `has_plan(...)` e (onde aplicável) `can_access_account(...)`. Tanto `USING` quanto `WITH CHECK` em UPDATEs. | Soft-isolation pattern with split `USING` vs `WITH CHECK` in ARCHITECTURE.md §Downgrade Behavior; verified table list in §Verified Code References (16 travel hooks → 16 tables). |
| SEC-03 | Remover `import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY` e export `supabaseAdmin`; Vite plugin `failOnSecretLeak()`; CI grep guard; rotação. | `supabaseAdmin` is unused in `src/` (grep verified — see §Verified Code References); Vite plugin shape in §Vite Plugin Pattern; rotation sequence in §Service-Role Rotation; secret-set-no-redeploy confirmed. |
| SEC-04 | Remover JWT anon hardcoded em `vite.config.ts:14`. Build deve falhar (não silenciosamente cair em fallback) se variável de ambiente estiver ausente. | Vite plugin guard pattern in §Vite Plugin Pattern (same plugin can both forbid VITE_*SERVICE* AND require VITE_SUPABASE_PUBLISHABLE_KEY; or two separate plugins). |
| SEC-05 | Consolidar enum `subscription_plan` (5 valores DB → 3 valores: `free|pro|vip`). Migration reverse-safe; backfill validado; collapse logic em `useSubscription.ts:242-245` deletado. | Canonical safe sequence in §Postgres Enum Reduction; **CRITICAL FINDING**: 11 files (not 5 as CONTEXT.md lists) reference `'plus'` — see §Verified Code References. |
| SEC-06 | Trust kernel deployado: funções `public.has_plan(uid, required_plan)` e `public.can_access_account(viewer_uid, target_uid)` (`STABLE SECURITY DEFINER`). Cobertura de testes adversariais. | SQL bodies in ARCHITECTURE.md §Trust Kernel; adversarial coverage in §Adversarial RLS Tests. |
| SEC-07 | Cobertura de testes em paths críticos hoje sem teste: `AuthProvider`, `PlanProtectedRoute`, `useSubscription`, `ErrorBoundary`, 14 hooks de travel, edge function `google-calendar-auth`. Meta: cada um com pelo menos happy-path + 1 caso adversarial. | Test patterns in §Internal Test Patterns (mock Supabase for unit; real local Supabase for integration); table-driven travel test in §Travel Adversarial Test Skeleton; HMAC signing test pattern in §Edge Function Testing. |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Plan gating (`has_plan`) | DB (Postgres function + RLS policies) | — | Authorization MUST be server-enforced; client `useSubscription` is UX hint only (CONCERNS.md CRIT-01) |
| Multi-CPF ownership (`can_access_account`) | DB (Postgres function + `managed_accounts` table) | — | Cross-user access boundary — only DB can authoritatively answer "is X allowed to act on Y's data?" |
| Service-role bypass | API/Backend (Deno edge functions) | — | Service role NEVER touches client; isolated to `Deno.env.get(...)` in edge runtime |
| Build-time secret guard | Build tooling (Vite plugin) | CI (post-build grep) | Vite plugin fails fast in dev/CI; CI grep is belt-and-suspenders against accidental Vite plugin removal |
| OAuth state HMAC | API/Backend (`google-calendar-auth/index.ts`) | DB (state TTL is in-memory only, not stored) | Crypto secret stays in Deno env; state is a signed/encoded token — no DB row needed |
| Test users + JWTs | DB (auth.users) via service-role admin API | Test runner (Vitest) | `supabase.auth.admin.createUser` requires service-role; Vitest signs in normally to obtain real per-user JWT |
| Adversarial test invocation | Test runner (Vitest with jsdom) | DB (Supabase local) | Vitest+jsdom needed for `localStorage` session persistence; CI runs `supabase start` for real Postgres+RLS |
| Subscription plan computation | Client (`useSubscription` hook, post-refactor) | DB (`get_user_plan()`) | Client reads plan via REST+RLS for UI decisions; `has_plan()` in DB is the security boundary |

## Standard Stack

### Already Installed (verified — DO NOT add new deps)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `vitest` | 4.1.4 (installed); 4.1.6 latest | Test runner | Already configured; jsdom env; matches Vite SWC pipeline |
| `@vitejs/plugin-react-swc` | (per package.json) | Compile React/TSX in tests | Mirrors prod compile path |
| `@testing-library/react` | 16.3.2 | `renderHook`, `act`, `cleanup` | Existing 5 hook tests use it |
| `@testing-library/jest-dom` | 6.9.1 | DOM matchers (currently unused — first component test wave) | Loaded in `src/test/setup.ts:1` |
| `jsdom` | 29.0.2 | Browser DOM stub — **REQUIRED for supabase-js session persistence in tests** | Without jsdom, `localStorage` is undefined and Supabase auth session does not persist between operations [CITED: index.garden/supabase-vitest] |
| `@supabase/supabase-js` | 2.105.4 (installed); 2.x stable | DB client + auth admin API | Already in stack; admin client uses same package |
| Supabase CLI | 2.98.2 (latest npm) | `supabase start`, `db reset`, `secrets set`, `functions deploy` | Required on dev machine + CI runner |
| `supabase/setup-cli` GH Action | v2 (latest as of 2026-04-21) | Install Supabase CLI on Ubuntu runner | Official action; v2 is current |
| Vite | (existing) | Plugin host | `config()` hook can throw to abort build [CITED: vite.dev/guide/api-plugin] |

### Alternatives Considered (and rejected)

| Instead of | Could Use | Tradeoff | Verdict |
|------------|-----------|----------|---------|
| Vitest+local Supabase for adversarial tests | pgTAP | True SQL-native testing; no Node/Deno dependency | **Rejected per CONTEXT D-07**: adds new tooling dependency; Vitest already in CI |
| `supabase db reset` between tests | `TRUNCATE travel_*, vip_*, managed_accounts CASCADE` in `beforeEach` | TRUNCATE is ~10x faster but doesn't reset sequences/auth.users | **Hybrid**: `db reset` once in `beforeAll`; per-test cleanup via `afterEach` truncating only the tables touched by the test |
| Single shared `supabase start` in CI | `supabase start` per job | Sharing reduces ~3 min cost to once | **Use sharing**: separate CI job that boots Supabase, then a downstream job runs Vitest against it via job dependencies |
| `supabase secrets set` followed by `supabase functions deploy --no-verify-jwt` | Just `supabase secrets set` (no deploy) | Deploy is a 30-60s cycle; secrets are immediate per official docs | **Skip the deploy** unless function code also changed [CITED: supabase.com/docs/guides/functions/secrets — "You don't need to re-deploy after setting your secrets. They're available immediately."] |

**Installation:** No new packages. Optionally pin Supabase CLI in `package.json` `devDependencies` so `setup-cli@v2` auto-detects the version from `package-lock.json`.

**Version verification:**
```bash
npm view @supabase/supabase-js version  # 2.105.4 confirmed 2026-05-11
npm view vitest version                  # 4.1.6 confirmed 2026-05-11
npm view supabase version                # 2.98.2 confirmed 2026-05-11
```

## Architecture Patterns

### System Architecture Diagram (test + CI flow)

```
┌──────────────────────────────────────────────────────────────────┐
│                       PHASE 1 EXECUTION FLOW                      │
└──────────────────────────────────────────────────────────────────┘

Local dev machine                          GitHub Actions CI
─────────────────                          ────────────────
                                           
[1] supabase start          [SHARED]       [1] supabase/setup-cli@v2
    └─ ~30s warm                              └─ ~5s install CLI
    └─ ~2-3min cold (first pull)              └─ supabase start
                                                 └─ ~2-3min Docker pull
                                           
[2] supabase db push prod                  [2] supabase status -o env >> .env.test
    (after PR merged)                          └─ exports SUPABASE_URL, SERVICE_ROLE
                                           
[3] npm test                               [3] npm test (split jobs):
    └─ unit tests (mocked)                     ├─ unit job (no Supabase) — ~30s
       fast                                    └─ integration job (with Supabase) — ~5min
    └─ integration tests                          ├─ creates 3 test users via admin API
       (real local Supabase)                      ├─ runs travel.adversarial.test.ts
                                                  └─ asserts 403 / code 42501


┌──────────────────────────────────────────────────────────────────┐
│                   ADVERSARIAL TEST FLOW (per case)                │
└──────────────────────────────────────────────────────────────────┘

beforeAll:
  ┌─────────────────────────────────────────────────────────────┐
  │ adminClient = createClient(URL, SERVICE_ROLE,               │
  │   { auth: { persistSession: false } })  ◄── CRITICAL        │
  │                                                             │
  │ adminClient.auth.admin.createUser({                         │
  │   id: FREE_USER_UUID, email: 'free@test.invalid',           │
  │   password: 'test123!', email_confirm: true                 │
  │ })                                                          │
  │ adminClient.from('user_subscriptions')                      │
  │   .upsert({ user_id: FREE_USER_UUID, plan: 'free' })        │
  │                                                             │
  │ // Repeat for PRO_USER_UUID + VIP_USER_UUID                 │
  └─────────────────────────────────────────────────────────────┘

per test:
  ┌─────────────────────────────────────────────────────────────┐
  │ userClient = createClient(URL, ANON_KEY)                    │
  │ await userClient.auth.signInWithPassword({                  │
  │   email: 'free@test.invalid', password: 'test123!'          │
  │ })                                                          │
  │ const { data, error } = await userClient                    │
  │   .from('travel_cruises').insert({ ...sampleCruise,         │
  │                                    user_id: FREE_USER_UUID })│
  │ expect(error?.code).toBe('42501')   ◄── RLS denial          │
  │ expect(data).toBeNull()                                      │
  └─────────────────────────────────────────────────────────────┘

afterEach:
  TRUNCATE only tables touched (per-test cleanup; faster than db reset)
```

### Recommended Project Structure (additions only)

```
src/
├── test/
│   ├── setup.ts            # EXISTING — unit-test setup (cleanup only)
│   ├── integration/        # NEW — integration test infra
│   │   ├── setup.ts        # global beforeAll: db reset; afterAll: stop
│   │   ├── adminClient.ts  # service-role client factory
│   │   └── fixtures.ts     # createTestUser(plan) helper
│   └── ...
├── hooks/
│   └── travel/
│       └── travel.adversarial.test.ts   # NEW — table-driven, 16 tables × 4 ops
└── ...

supabase/
├── migrations/
│   └── 20260512XXXXXX_phase1_*.sql      # 6 NEW migrations (per ARCHITECTURE.md build order)
└── ...

vite.config.ts              # MODIFY: remove JWT fallback (line 14); add failOnSecretLeak() plugin
src/integrations/supabase/client.ts   # MODIFY: delete supabaseAdmin export (lines 7, 22-29)

vitest.config.ts            # MODIFY: define two projects (unit + integration)
                            #   OR add an `integrationSetup.ts` and use vitest --project flag

.github/workflows/
├── ci.yml                  # MODIFY: split into quality (existing) + integration (new)
└── ...
```

### Pattern 1: Vitest Multi-Project Config (split unit vs integration)

**What:** Existing `vitest.config.ts` runs all `src/**/*.test.ts(x)` together. Adversarial tests need a real Supabase, so unit tests should not pay the Supabase startup cost.

**When to use:** Phase 1 — split needed because unit suite must stay <30s.

**Source:** [vitest.dev/guide/parallelism](https://vitest.dev/guide/parallelism), [vitest.dev/config](https://vitest.dev/config/)

```typescript
// vitest.config.ts (modified)
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
          // Disable parallelism within file — shared local Supabase can't handle race
          fileParallelism: false,
          // Increase timeout for DB ops
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

Run with `npm test -- --project unit` (fast loop) or `npm test -- --project integration` (CI/pre-deploy).

### Pattern 2: Vite Plugin That Throws to Abort Build (`failOnSecretLeak`)

**What:** A Vite plugin whose `config()` hook throws if any forbidden env var is present.

**When to use:** Phase 1 SEC-03/SEC-04 — non-negotiable mechanical guard.

**Source:** [vite.dev/guide/api-plugin](https://vite.dev/guide/api-plugin) — config hook signature `(config, env) => UserConfig | null | void`. Throwing inside this hook propagates as an unhandled rejection during `vite build`, which exits with non-zero status.

```typescript
// vite.config.ts (additions)
import type { Plugin } from 'vite';

const FORBIDDEN_VITE_PATTERNS = [
  /^VITE_.*SERVICE_ROLE/i,
  /^VITE_.*SECRET_KEY/i,
  /^VITE_.*WEBHOOK_SECRET/i,
  /^VITE_.*PRIVATE_KEY/i,
  // Phase 2 additions (Asaas):
  // /^VITE_ASAAS_.*SECRET/i,
];

const REQUIRED_VITE_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_PROJECT_ID',
];

function failOnSecretLeak(): Plugin {
  return {
    name: 'milespro:fail-on-secret-leak',
    config(_, { command }) {
      // Only enforce on build (not dev) to keep DX clean
      if (command !== 'build') return;

      const dangerous = Object.keys(process.env).filter(k =>
        FORBIDDEN_VITE_PATTERNS.some(re => re.test(k))
      );
      if (dangerous.length > 0) {
        throw new Error(
          `[failOnSecretLeak] Refusing to build. ` +
          `Dangerous VITE_* env vars detected (would ship to client bundle): ` +
          dangerous.join(', ')
        );
      }

      const missing = REQUIRED_VITE_VARS.filter(k => !process.env[k]);
      if (missing.length > 0) {
        throw new Error(
          `[failOnSecretLeak] Refusing to build. ` +
          `Required env vars missing: ${missing.join(', ')}. ` +
          `No silent fallback — set these in your CI/host config.`
        );
      }
    },
  };
}

// then in plugins array:
//   plugins: [failOnSecretLeak(), react(), ...]
//   ⚠️ Place FIRST so it runs before other plugins do work.
```

**Verified:** `process.env` IS available in `config()` hook because Vite calls plugin hooks before `loadEnv()` reads `.env*` files [CITED: vite.dev/config — "Environment variables available while the config itself is being evaluated are only those that already exist in the current process environment"]. This is exactly what we want — only OS-level env vars (set by CI/Vercel/dev shell) trigger the guard.

### Pattern 3: Service-Role Test User Setup (Vitest `beforeAll`)

**What:** Create real `auth.users` rows with known UUIDs and seed `user_subscriptions` for each plan.

**When to use:** Adversarial integration tests (every `.adversarial.test.ts` file).

**Source:** [supabase.com/docs/guides/local-development/testing/overview](https://supabase.com/docs/guides/local-development/testing/overview), [index.garden/supabase-vitest](https://index.garden/supabase-vitest/)

```typescript
// src/test/integration/setup.ts
import { beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Loaded from .env.test written by `supabase status -o env >> .env.test`
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

// CRITICAL: persistSession: false on admin client to avoid jsdom session collision
// (otherwise the admin client adopts the user's JWT and admin operations fail)
// Source: index.garden/supabase-vitest
export const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const FREE_USER = { id: '00000000-0000-0000-0000-000000000001', email: 'free@test.invalid' };
export const PRO_USER  = { id: '00000000-0000-0000-0000-000000000002', email: 'pro@test.invalid'  };
export const VIP_USER  = { id: '00000000-0000-0000-0000-000000000003', email: 'vip@test.invalid'  };
const PASSWORD = 'test-password-not-secret-12345';

beforeAll(async () => {
  // Reset DB once per integration suite — fast in local Supabase (~10-30s)
  // We rely on `supabase db reset --local` being run by CI before vitest starts
  // (see .github/workflows/ci.yml integration job)

  for (const u of [FREE_USER, PRO_USER, VIP_USER]) {
    await adminClient.auth.admin.createUser({
      id: u.id,
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
    });
  }

  // Seed plans (the handle_new_user trigger inserts 'free' default; upsert overrides for pro/vip)
  await adminClient.from('user_subscriptions').upsert([
    { user_id: PRO_USER.id, plan: 'pro', is_active: true },
    { user_id: VIP_USER.id, plan: 'vip', is_active: true },
  ], { onConflict: 'user_id' });
}, 60000);

afterAll(async () => {
  // Cleanup: delete via admin (cascades through profiles, user_subscriptions, etc)
  for (const u of [FREE_USER, PRO_USER, VIP_USER]) {
    await adminClient.auth.admin.deleteUser(u.id);
  }
});

// Helper for tests: create a fresh user-scoped client and sign in
export async function clientAs(user: typeof FREE_USER) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }, // tests don't need persistence either
  });
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: PASSWORD,
  });
  if (error) throw new Error(`signin failed: ${error.message}`);
  return client;
}
```

### Pattern 4: Travel Adversarial Test Skeleton (table-driven)

**What:** One test file covers all 16 travel tables × 3 plans × 4 operations.

**When to use:** SEC-07 — single source of truth; adding a new travel table = 1 row.

```typescript
// src/hooks/travel/travel.adversarial.test.ts
import { describe, it, expect } from 'vitest';
import { clientAs, FREE_USER, PRO_USER } from '@/test/integration/setup';

interface AdvCase {
  table: string;
  sampleInsert: (userId: string) => Record<string, unknown>;
}

const TRAVEL_TABLES: AdvCase[] = [
  { table: 'travel_cruises',     sampleInsert: (uid) => ({ user_id: uid, client_id: TEST_CLIENT_ID, cruise_line: 'X', ship_name: 'Y', cabin_type: 'inside', departure_port: 'A', arrival_port: 'B', departure_date: '2026-06-01', return_date: '2026-06-08' }) },
  { table: 'travel_insurances',  sampleInsert: (uid) => ({ user_id: uid, client_id: TEST_CLIENT_ID, insurance_company: 'X', plan_name: 'Y', destination: 'Brazil', start_date: '2026-06-01', end_date: '2026-06-08' }) },
  // ... 14 more entries (one per table in supabase/migrations/20260131123615_*.sql)
];

describe.each(TRAVEL_TABLES)('$table — adversarial RLS', ({ table, sampleInsert }) => {
  it('FREE user INSERT is blocked with 42501', async () => {
    const client = await clientAs(FREE_USER);
    const { data, error } = await client.from(table).insert(sampleInsert(FREE_USER.id) as never);
    expect(error).not.toBeNull();
    expect(error?.code).toBe('42501');
    expect(data).toBeNull();
  });

  it('PRO user INSERT succeeds', async () => {
    const client = await clientAs(PRO_USER);
    const { data, error } = await client.from(table).insert(sampleInsert(PRO_USER.id) as never).select().single();
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('soft isolation: PRO→FREE downgrade keeps SELECT, blocks INSERT', async () => {
    // 1. As PRO: insert a row
    let client = await clientAs(PRO_USER);
    const { data: row } = await client.from(table).insert(sampleInsert(PRO_USER.id) as never).select().single();
    expect(row).toBeDefined();

    // 2. Admin downgrade
    await adminClient.from('user_subscriptions').update({ plan: 'free' }).eq('user_id', PRO_USER.id);

    // 3. Re-sign-in (JWT plan claim is stale otherwise)
    client = await clientAs(PRO_USER);

    // 4. SELECT still works (soft isolation per D-05)
    const { data: rows } = await client.from(table).select('*').eq('user_id', PRO_USER.id);
    expect(rows?.length).toBeGreaterThan(0);

    // 5. INSERT now blocked
    const { error } = await client.from(table).insert(sampleInsert(PRO_USER.id) as never);
    expect(error?.code).toBe('42501');

    // 6. Restore PRO for next test
    await adminClient.from('user_subscriptions').update({ plan: 'pro' }).eq('user_id', PRO_USER.id);
  });
});
```

### Pattern 5: Postgres Enum Reduction (5 → 3) — Single Transaction

**What:** Drop the legacy enum values (`agency`, `pro_familia`, `basic`) by recreating the type. ALL DDL in one transaction.

**Source:** [blog.yo1.dog/updating-enum-values-in-postgresql-the-safe-and-easy-way](https://blog.yo1.dog/updating-enum-values-in-postgresql-the-safe-and-easy-way/), [postgresql.org/docs/current/sql-altertype.html](https://www.postgresql.org/docs/current/sql-altertype.html)

**Critical caveats discovered:**
1. **Default value gotcha:** `user_subscriptions.plan` has `DEFAULT 'free'::subscription_plan`. The default must be **dropped** before `ALTER COLUMN ... TYPE`, then re-added with the new type. [CITED: blog.yo1.dog]
2. **SQL functions referencing the type signature:** `get_user_plan(_user_id uuid) RETURNS subscription_plan`, `can_access_feature`, `can_create_operation`, `handle_new_user` — all in 3 migration files (verified via grep on `subscription_plan|user_plan` returning only `20251228134346_*.sql`, `20260206223914_*.sql`, `20260206223931_*.sql`). These functions must be `DROP FUNCTION ... CASCADE` and recreated with new type. CASCADE is safe because no other functions depend on them.
3. **`ALTER TYPE ... ADD VALUE` cannot be in same transaction as use of the new value** [CITED: postgresql.org/docs/current/sql-altertype.html]. We are NOT adding values — we're recreating the type, which **can** all be in one transaction.
4. **`vip` is a NEW value** that doesn't exist today (today: free, pro, agency, pro_familia, basic). The recreate covers this naturally.

```sql
-- Migration: 20260512XXXX01_consolidate_subscription_plan_enum.sql
-- Forward:  agency -> vip, pro_familia -> vip, basic -> pro, free -> free, pro -> pro
-- Reverse:  see commented rollback at bottom of file
-- Pre-check: SELECT plan, COUNT(*) FROM user_subscriptions GROUP BY plan;
--   (committed in PR description before this migration runs)

BEGIN;

-- 0. Backfill data BEFORE type change so the cast in step 4 has only valid target values
UPDATE public.user_subscriptions SET plan = 'pro'::subscription_plan
  WHERE plan IN ('basic'::subscription_plan);

UPDATE public.user_subscriptions SET plan = 'agency'::subscription_plan  -- intermediate; will become vip
  WHERE plan IN ('pro_familia'::subscription_plan);
-- Now agency rows are the union of legacy agency + pro_familia; map to vip in step 4

-- 1. DROP functions that depend on the enum type signature
--    CASCADE is safe — no other DB objects depend on these
DROP FUNCTION IF EXISTS public.get_user_plan(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_access_feature(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.can_create_operation(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.count_monthly_operations(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Drop column default (cannot ALTER TYPE if default uses old type)
ALTER TABLE public.user_subscriptions ALTER COLUMN plan DROP DEFAULT;

-- 3. Rename the old type
ALTER TYPE public.subscription_plan RENAME TO subscription_plan_old;

-- 4. Create the new (canonical) type
CREATE TYPE public.subscription_plan AS ENUM ('free', 'pro', 'vip');

-- 5. Convert the column with CASE-based USING expression
ALTER TABLE public.user_subscriptions
  ALTER COLUMN plan TYPE public.subscription_plan
  USING (
    CASE plan::text
      WHEN 'free'         THEN 'free'::public.subscription_plan
      WHEN 'pro'          THEN 'pro'::public.subscription_plan
      WHEN 'agency'       THEN 'vip'::public.subscription_plan
      ELSE 'free'::public.subscription_plan  -- safety; should never hit after step 0 backfill
    END
  );

-- 6. Restore the default with the new type
ALTER TABLE public.user_subscriptions ALTER COLUMN plan SET DEFAULT 'free'::public.subscription_plan;

-- 7. Drop the old type (now unused)
DROP TYPE public.subscription_plan_old;

-- 8. Recreate the dropped functions against the new type
--    (full bodies — see ARCHITECTURE.md §Trust Kernel for has_plan body)
CREATE OR REPLACE FUNCTION public.get_user_plan(_user_id uuid)
RETURNS public.subscription_plan
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT plan FROM public.user_subscriptions
     WHERE user_id = _user_id AND is_active = true
       AND (expires_at IS NULL OR expires_at > now())),
    'free'::public.subscription_plan
  );
$$;

-- ... has_plan(), can_access_account(), handle_new_user() (with new defaults), etc.
-- (full SQL in subsequent migrations per ARCHITECTURE.md build order)

COMMIT;

-- Rollback (commented; use only if invariant pre-check fails on prod):
--   BEGIN;
--   ALTER TABLE user_subscriptions ALTER COLUMN plan DROP DEFAULT;
--   ALTER TYPE subscription_plan RENAME TO subscription_plan_v2;
--   CREATE TYPE subscription_plan AS ENUM ('free', 'pro', 'agency', 'pro_familia', 'basic');
--   ALTER TABLE user_subscriptions ALTER COLUMN plan TYPE subscription_plan
--     USING (CASE plan::text WHEN 'vip' THEN 'agency' WHEN 'pro' THEN 'pro' ELSE 'free' END
--       ::subscription_plan);
--   ALTER TABLE user_subscriptions ALTER COLUMN plan SET DEFAULT 'free'::subscription_plan;
--   DROP TYPE subscription_plan_v2;
--   COMMIT;
```

**Why this works in one transaction:** Postgres DDL is fully transactional. The only `ALTER TYPE` operation that can NOT be in a transaction with usage is `ADD VALUE` (and only on PG <12 in some cases). `RENAME TYPE`, `CREATE TYPE`, `ALTER COLUMN ... TYPE`, `DROP TYPE` are all atomic and transactional. [VERIFIED: postgres docs]

### Pattern 6: Service-Role Rotation Sequence

**What:** Rotate the service-role key without breaking edge functions.

**Source:** [supabase.com/docs/guides/functions/secrets](https://supabase.com/docs/guides/functions/secrets) — "You don't need to re-deploy after setting your secrets. They're available immediately in your functions."

```bash
# 1. Deploy code that no longer references VITE_SUPABASE_SERVICE_ROLE_KEY
git checkout main && git pull && npm run build  # failOnSecretLeak verifies
supabase db push                                  # apply migrations

# 2. Verify CI green + smoke tests pass with current (old) service-role
npm test                                          # both projects

# 3. Rotate in Supabase Dashboard → Settings → API → "Reset service_role secret"
#    (manual step; sets new key in dashboard)

# 4. Update edge function secret store — no redeploy needed!
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<new-key-from-dashboard>
# Per docs: "available immediately in your functions"

# 5. Smoke test each edge function that uses service-role
curl -X POST "$SUPABASE_URL/functions/v1/mrr-dashboard" \
  -H "Authorization: Bearer $ADMIN_USER_JWT"
# Expect 200 (or app-level error if admin gate triggers — but NOT a service-role auth error)

curl -X POST "$SUPABASE_URL/functions/v1/google-calendar-auth?action=status" \
  -H "Authorization: Bearer $TEST_USER_JWT"
# Expect 200

# 6. ONLY redeploy a function if its CODE changed (not its secrets):
supabase functions deploy google-calendar-auth   # only if you also added OAUTH_STATE_SECRET fallback removal commit
```

**Caveats discovered:**
- Official docs explicitly say no redeploy needed for secret changes — `Deno.env.get()` reads the current secret store at invocation time, not at deploy time.
- Cold start does NOT cache stale secrets — Supabase's edge isolate runtime reads the env from the current secret store on cold boot.
- There is no documented propagation delay; treat it as "next invocation uses new value."
- **Edge case:** If a function instance is mid-execution when the secret rotates, it continues with the old value until that invocation ends — typical execution is <30s, so practically the rotation window is bounded by the longest in-flight request.

### Pattern 7: OAUTH_STATE_SECRET Migration with Dual-Read Window

**What:** Split the HMAC secret out of `SUPABASE_SERVICE_ROLE_KEY` without breaking in-flight Google OAuth callbacks.

**Source:** Existing code at `supabase/functions/google-calendar-auth/index.ts:147` enforces a 10-minute state TTL. So any state issued >10 min ago is already rejected.

```typescript
// supabase/functions/google-calendar-auth/index.ts (modified)
// PHASE 1 STEP 1 (in PR): dual-read with fallback
const OAUTH_STATE_SECRET = Deno.env.get('OAUTH_STATE_SECRET');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const STATE_SIGNING_SECRET = OAUTH_STATE_SECRET ?? SUPABASE_SERVICE_ROLE_KEY ?? '';
//                            ^^^^^^^^^^^^^^^^^^   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                            New secret (preferred) Fallback for in-flight states issued
//                                                   before the cutover commit

// PHASE 1 STEP 2 (final commit of PR, deployed >1h after step 1): remove fallback
const STATE_SIGNING_SECRET = Deno.env.get('OAUTH_STATE_SECRET');
if (!STATE_SIGNING_SECRET) {
  throw new Error('OAUTH_STATE_SECRET not configured');
}
```

**Cutover sequence (CONTEXT D-10):**
```bash
# Step 1: Generate and set the new secret BEFORE deploying any code
OAUTH_STATE_SECRET=$(openssl rand -hex 32)
supabase secrets set OAUTH_STATE_SECRET="$OAUTH_STATE_SECRET"

# Step 2: Deploy commit with dual-read (fallback to SERVICE_ROLE if OAUTH_STATE_SECRET unset)
git push  # triggers deploy that includes the dual-read code
supabase functions deploy google-calendar-auth

# Step 3: Wait >10 min (state TTL). All in-flight OAuth flows have either completed or expired.
sleep 700  # 11 min; or just verify no error logs in dashboard

# Step 4: (final commit) remove fallback, redeploy
git push  # triggers deploy of the no-fallback code
supabase functions deploy google-calendar-auth

# Step 5: Document in function header that service-role rotation no longer affects OAuth
```

**Why >10 min wait, not 1h:** The state TTL is hardcoded at 10 min in `index.ts:147`. After 10 min, the only valid states are those signed with the new secret. The "1h" buffer in CONTEXT D-10 is conservative — 11 min is sufficient.

### Anti-Patterns to Avoid

- **DO NOT** use `process.env` inside `import.meta.env.VITE_*` substitutions — they are different mechanisms; `VITE_*` runs through Vite's `define`, not Node's runtime env.
- **DO NOT** create a single shared Supabase client in test files — sessions cross-pollinate via `localStorage` in jsdom. Always create per-test client and pass `persistSession: false` on the admin client.
- **DO NOT** call `supabase functions deploy` after every `secrets set` — it's a wasteful 30-60s loop. Deploy only when CODE changes.
- **DO NOT** use `ALTER TYPE ... ADD VALUE 'vip'` — it can't be used in same transaction as `UPDATE ... SET plan = 'vip'`. Use the recreate-type sequence instead.
- **DO NOT** drop functions WITHOUT `CASCADE` and assume nothing else depends — verify with `\df+ public.get_user_plan` first; document expected dependent count = 0.
- **DO NOT** rely on `vi.mock('@/integrations/supabase/client', ...)` for adversarial RLS tests — mocking defeats the entire purpose. The whole point is hitting real RLS.
- **DO NOT** put the `failOnSecretLeak()` plugin AFTER `react()` in the plugins array — earlier = fail-fastest.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Test JWT generation | Manually crafting JWT with HMAC + Supabase secret | `supabase.auth.signInWithPassword({ email, password })` | Real JWT structure (claims, expiry, refresh) is what RLS sees; fake JWT skips middleware paths |
| Multi-user test isolation | Manually rotating `localStorage` between users | Multiple Supabase client instances with `persistSession: false` on admin | Avoids the documented jsdom session-collision gotcha |
| Postgres enum drop | `ALTER TYPE ... DROP VALUE` | Recreate-type sequence (rename old → create new → ALTER COLUMN ... USING → drop old) | DROP VALUE doesn't exist in Postgres |
| Supabase secret propagation | Restarting/redeploying functions after secret rotation | `supabase secrets set` is sufficient — no redeploy | Per official docs; saves 30-60s per rotation |
| HMAC OAuth state | Custom token store + cleanup cron | Self-contained signed payload (already implemented in `google-calendar-auth/index.ts`) | Stateless = no DB row to leak; signed = tamper-proof; TTL via embedded `ts` field |
| Build-time env check | Custom `prebuild` script + grep | Vite plugin's `config()` hook | Plugin runs in same process as build; throw aborts cleanly; no separate script to maintain |
| Adversarial test cleanup | Per-test full DB reset | TRUNCATE only the touched tables in `afterEach` | `db reset` is ~30-60s; TRUNCATE is sub-second; reset only once per suite |
| Test fixture creation | Manual SQL inserts via psql | `adminClient.from('user_subscriptions').upsert(...)` in `beforeAll` | Same code as production runtime; type-safe via generated `Database` types |

**Key insight:** Phase 1 is 95% wiring well-known pieces — the trap is "let me just write a quick custom..." for things Supabase, Postgres, or Vite already solve canonically. Every "small custom helper" is a future bug + maintenance burden.

## Runtime State Inventory

> Phase 1 is partly a rename/refactor (enum collapse, secret rotation). Inventory required.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | `user_subscriptions.plan` rows currently use `agency`, `pro_familia`, `basic` (legacy values). Pre-flight SQL `SELECT plan, COUNT(*) FROM user_subscriptions GROUP BY plan` must run before migration to capture the actual count and document in PR description. | Backfill in Step 0 of consolidation migration; map `agency` → `vip`, `pro_familia` → `vip`, `basic` → `pro` per CONTEXT D-01. **Data migration AND code edit both required.** |
| **Live service config** | None for Phase 1 (no n8n, no Datadog, no ACL tags in scope). Supabase Dashboard URL + Project ID are managed via env vars (already in CI secrets). | None — verified. |
| **OS-registered state** | None — no scheduled tasks, no pm2, no systemd in scope. CI runs are stateless GitHub Actions. | None — verified. |
| **Secrets and env vars** | (1) `VITE_SUPABASE_SERVICE_ROLE_KEY` — currently NEVER read because no code references `supabaseAdmin` (verified by grep). Removing the env var is safe; the codebase code edit is what matters. (2) `SUPABASE_SERVICE_ROLE_KEY` — Deno env in edge functions; will be ROTATED (key value changes) but variable name stays. (3) `OAUTH_STATE_SECRET` — NEW variable; must be set via `supabase secrets set` before deploying step-1 of OAuth split. (4) CI secrets (`VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`) — already set in GitHub Actions secrets per `.github/workflows/ci.yml:43-45`. | Code edit + secret-store rotation. Document: `OAUTH_STATE_SECRET` set BEFORE first deploy of dual-read commit. |
| **Build artifacts / installed packages** | None expected — npm-managed with `package-lock.json` in repo. The `bun.lock` and `pnpm-lock.yaml` exist but unused by CI (per CONCERNS.md). PWA service worker (`vite-plugin-pwa`) generates `dist/sw.js` which embeds `SUPABASE_URL_FALLBACK` — after JWT removal, this will be gone (no longer baked in). | After `vite.config.ts:14` JWT removal, verify `grep -r 'eyJhbGc' dist/` returns 0 matches AND `dist/sw.js` does not contain the old key. |

**Canonical question answered:** *After every file in the repo is updated, what runtime systems still have the old string cached, stored, or registered?*

**Answer:** (a) `user_subscriptions.plan` rows with legacy enum values — handled by Step 0 backfill in the consolidation migration. (b) The leaked anon JWT may live in PWA service worker caches on user devices — `cleanupOutdatedCaches: true` + `clientsClaim: true` (already in `vite.config.ts:91-93`) handle this; but document that any user with the PWA installed will receive the new SW + new JWT on next visit. The old anon JWT is being NOT rotated (per CONCERNS.md it was always a public key); the security fix is removing the **fallback** so missing-env produces a build failure, not a default to a known key.

## Common Pitfalls

### Pitfall 1: jsdom Session Collision Between Test Clients

**What goes wrong:** A single Vitest file creates both `adminClient` (service-role) and `userClient` (per-user). Without `persistSession: false` on admin, both clients share `localStorage`, and the admin client suddenly authenticates as the user — admin operations fail with "JWT expired" or "permission denied".

**Why it happens:** Supabase JS v2 uses `localStorage` for session persistence by default. jsdom provides a SHARED `localStorage` per test environment; both clients write/read the same keys.

**How to avoid:** ALWAYS `persistSession: false` on both admin client AND per-test user clients. Tests don't need persistence — they sign in fresh each test.

**Warning signs:** Admin operations return RLS errors that don't make sense (admin bypasses RLS); intermittent failures when test order changes; "JWT expired" in `beforeAll` or `afterAll`.

**Source:** [index.garden/supabase-vitest](https://index.garden/supabase-vitest/) — author hit this exact bug.

### Pitfall 2: ALTER TYPE ADD VALUE in Same Transaction as Use

**What goes wrong:** Adding `vip` via `ALTER TYPE subscription_plan ADD VALUE 'vip'` then immediately `UPDATE user_subscriptions SET plan = 'vip'` in the same transaction → "unsafe use of new value" error.

**Why it happens:** Postgres limitation — newly added enum values are not committed to the catalog until the transaction commits. (Pre-PG12 was even more restrictive.)

**How to avoid:** Use the **recreate-type pattern** (rename old → create new → ALTER COLUMN ... USING). This isn't `ADD VALUE` and works in one transaction.

**Source:** [postgresql.org/docs/current/sql-altertype.html](https://www.postgresql.org/docs/current/sql-altertype.html)

### Pitfall 3: Dropped Functions That Were Referenced by Default Expressions or Generated Columns

**What goes wrong:** `DROP FUNCTION ... CASCADE` silently drops dependent objects. If a generated column or constraint referenced one of the trust kernel functions, that column/constraint disappears.

**Why it happens:** CASCADE is necessary for the enum recreate flow but it's a foot-gun.

**How to avoid:** BEFORE the migration, run `\d+ public.user_subscriptions` and `\d+ public.user_roles` to confirm no generated columns / functional indexes / constraints reference the to-be-dropped functions. Document in PR description.

**Warning signs:** Migration succeeds but a column disappears; an index becomes invalid; a generated column returns NULL.

### Pitfall 4: `process.env` vs `import.meta.env` Confusion in vite.config.ts

**What goes wrong:** Developer adds `failOnSecretLeak()` but tests it with `import.meta.env.VITE_SOMETHING=true npm run build` — has no effect because `import.meta.env` is Vite's client-side substitution, NOT a runtime env var.

**Why it happens:** Both APIs are named "env" but live in different worlds: `process.env` (Node, available in vite.config.ts), `import.meta.env` (Vite's client-side, processed at build time).

**How to avoid:** In Vite plugin `config()` hook, ONLY use `process.env`. Test from shell: `VITE_FOO=bar npm run build`. The plugin sees `process.env.VITE_FOO === 'bar'`.

**Source:** [vite.dev/guide/env-and-mode](https://vite.dev/guide/env-and-mode)

### Pitfall 5: PostgREST Returns 200 for Empty SELECT Even When RLS Filters Everything

**What goes wrong:** Test asserts `expect(error).not.toBeNull()` for a SELECT that should be RLS-denied — but RLS filters at row level: an empty result is `{ data: [], error: null }` with HTTP 200, NOT a 403.

**Why it happens:** RLS only returns 42501 on INSERT/UPDATE/DELETE that VIOLATE a `WITH CHECK` clause, or when a `USING` clause makes the targeted row invisible (UPDATE/DELETE). For SELECT, RLS just filters the result set silently.

**How to avoid:**
- For "user can't see X" tests: assert `data` is empty (`expect(data).toEqual([])` or `expect(data?.length).toBe(0)`).
- For "user can't write X" tests: assert `error.code === '42501'`.
- **Soft isolation tests:** the SELECT-after-downgrade case must assert `data?.length > 0` (rows still visible per CONTEXT D-05).

**Source:** [supabase.com/docs/guides/troubleshooting/database-api-42501-errors](https://supabase.com/docs/guides/troubleshooting/database-api-42501-errors)

### Pitfall 6: Stale JWT Plan Claim After Plan Change

**What goes wrong:** Test signs in as PRO, then admin downgrades to FREE, then test calls `userClient.from(...).insert(...)` — but `auth.uid()` reads from the JWT (issued at sign-in, before downgrade). The trust kernel `has_plan(auth.uid(), 'pro')` will check the DB, see `free`, and correctly deny — BUT only if `has_plan` re-queries `user_subscriptions`. If a developer accidentally adds a `plan` claim to the JWT, the DB-side check would be stale.

**How to avoid:**
- `has_plan()` MUST always `SELECT plan FROM user_subscriptions WHERE user_id = _user_id` (per ARCHITECTURE.md §Trust Kernel — it does).
- Tests for the plan-change flow MUST re-sign-in (`clientAs(user)` again) so the JWT is fresh; otherwise the test passes for the wrong reason.
- AUDIT: confirm no `auth.jwt() ->> 'plan'` exists anywhere in migrations (grep). [VERIFIED: 0 matches in current codebase]

**Source:** PITFALLS.md HIGH-04 (4d) flags this exact pattern.

### Pitfall 7: `supabase start` First Run is 2-3 min on CI (Docker pull); Cached Run is ~30s

**What goes wrong:** Naive CI step `supabase start` on every PR adds 3 min to every build. With heavy parallel work, this becomes the critical path.

**How to avoid:**
- Cache Docker images via `actions/cache` keyed on `~/.docker` or a dedicated layer. (Recent setup-cli@v2 has improved caching but cold start is still ~2-3 min on Ubuntu runners per [github.com/orgs/supabase/discussions/9351](https://github.com/orgs/supabase/discussions/9351).)
- Run `supabase start` in background while `npm ci` runs in parallel:
  ```yaml
  - name: Start Supabase (background)
    run: supabase start &
  - name: Install deps (parallel)
    run: npm ci
  - name: Wait for Supabase
    run: until supabase status > /dev/null 2>&1; do sleep 2; done
  ```
- Make it a SEPARATE job from `quality` (lint/typecheck/build). The unit tests don't need Supabase; only the integration project does.

**Source:** [github.com/orgs/supabase/discussions/9351](https://github.com/orgs/supabase/discussions/9351), [github.com/supabase/cli/issues/2724](https://github.com/supabase/cli/issues/2724)

## Code Examples

### Example 1: Verified `has_plan()` body (from ARCHITECTURE.md, slightly tightened)

```sql
-- Source: .planning/research/ARCHITECTURE.md §Trust Kernel
-- (full SECURITY DEFINER body cross-checked against existing can_access_feature in
--  supabase/migrations/20251228134346_*.sql:79-104)
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

### Example 2: New `src/integrations/supabase/client.ts` (after SEC-03)

```typescript
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Build will fail (failOnSecretLeak) before reaching here if env vars are missing.
// At runtime, if these are undefined, supabase-js throws "supabaseUrl is required" — fail-fast.
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Service-role client REMOVED.
// Service-role usage lives ONLY in supabase/functions/* (Deno edge runtime),
// where it reads Deno.env.get('SUPABASE_SERVICE_ROLE_KEY').
```

### Example 3: GitHub Actions Workflow (additions to ci.yml)

```yaml
# .github/workflows/ci.yml — NEW JOB after `quality` (existing) and `audit` (existing)
  integration:
    name: Adversarial RLS (Vitest + Supabase local)
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: quality   # don't waste 3 min if lint/typecheck/build already broken

    steps:
      - uses: actions/checkout@v5

      - name: Setup Node.js
        uses: actions/setup-node@v5
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install Supabase CLI
        uses: supabase/setup-cli@v2
        with:
          version: latest

      - name: Start Supabase (background — parallel with npm ci)
        run: supabase start &

      - name: Install dependencies
        run: npm ci

      - name: Wait for Supabase ready
        run: |
          for i in {1..60}; do
            if supabase status > /dev/null 2>&1; then break; fi
            echo "Waiting for Supabase... ($i/60)"
            sleep 2
          done
          supabase status

      - name: Export Supabase env
        run: |
          supabase status -o env \
            --override-name api.url=SUPABASE_URL \
            --override-name auth.service_role_key=SUPABASE_SERVICE_ROLE_KEY \
            --override-name auth.anon_key=SUPABASE_ANON_KEY \
            >> $GITHUB_ENV

      - name: Apply migrations (already applied by `supabase start`, but verify)
        run: supabase db reset --no-seed
        # ~10-30s on local; resets to clean state with all migrations applied

      - name: Run adversarial integration tests
        run: npm test -- --project integration

      - name: Stop Supabase
        if: always()
        run: supabase stop
```

### Example 4: Edge Function Adversarial Test (HMAC OAuth state)

```typescript
// supabase/functions/google-calendar-auth/index.test.ts (NEW)
// Run with: deno test --allow-env --allow-net
// (Deno tests are separate from Vitest; if simpler to skip Deno harness, document as Phase 2)

import { assertEquals, assertExists } from 'https://deno.land/std/assert/mod.ts';
// Import the signing helpers — refactor index.ts to export them
import { signState, verifyState } from './index.ts';

Deno.test('signState + verifyState roundtrip', async () => {
  Deno.env.set('OAUTH_STATE_SECRET', 'test-secret-123');
  const payload = { user_id: '00000000-0000-0000-0000-000000000001',
                    redirect_url: 'https://example.com',
                    nonce: 'a'.repeat(24), ts: Date.now() };
  const token = await signState(payload);
  const verified = await verifyState(token);
  assertEquals(verified, payload);
});

Deno.test('verifyState rejects tampered token', async () => {
  Deno.env.set('OAUTH_STATE_SECRET', 'test-secret-123');
  const payload = { user_id: '00000000-0000-0000-0000-000000000001',
                    redirect_url: 'https://example.com',
                    nonce: 'a'.repeat(24), ts: Date.now() };
  const token = await signState(payload);
  const [body, sig] = token.split('.');
  const tamperedToken = `${body}.${'X'.repeat(sig.length)}`;
  const result = await verifyState(tamperedToken);
  assertEquals(result, null);
});

Deno.test('verifyState rejects expired state', async () => {
  // Use the calling code's TTL check (10 min in handler), not in verifyState itself
  // ... see handler at index.ts:147
});
```

**Pragmatic note:** Setting up the Deno test harness in CI is ~30 min of work but isolated from the Vitest suite. The CONTEXT.md test scope (`supabase/functions/google-calendar-auth/index.ts` SEC-07) implies coverage; the planner can decide whether to do Deno tests OR a Vitest test that hits the deployed function endpoint via HTTP. **Recommendation:** HTTP-based Vitest test (calls the local function via `supabase functions serve` + fetch) — fewer harnesses, same coverage.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `verify_jwt = true` flag in old config-table API | `[functions.<name>]` block in `supabase/config.toml` | Supabase CLI v1.x → v2.x | Set `verify_jwt = false` in TOML for webhook functions; no Phase 1 use case (deferred to Phase 2 Asaas webhook) |
| supabase/setup-cli@v1 GH Action | supabase/setup-cli@v2 (v2.0.0 2026-04-21) | 2026-04 | Use v2 — handles new CLI release cadence |
| Mocking `import('@supabase/supabase-js')` for RLS tests | Real local Supabase via `supabase start` | Stable since Supabase CLI v1.0 | Mocks defeat purpose of RLS tests; only adversarial = real |
| `supabase functions deploy` to pick up secret changes | `supabase secrets set` is sufficient (2024+ docs) | Documented officially; no version pinpoint | Saves 30-60s per rotation; ~ instant for next invocation |

**Deprecated/outdated in this codebase:**
- `subscription_plan` enum values `agency`, `pro_familia`, `basic` — being removed this phase
- `import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY` reference — being deleted this phase
- Hardcoded JWT fallback in `vite.config.ts:14` — being deleted this phase
- `can_access_feature(_user_id, _feature)` — superseded by `has_plan()` for plan checks; keep but mark `DEPRECATED` per CONTEXT deferred ideas

## Verified Code References

> CONTEXT.md was generated 2026-05-11. The code refs were verified against current state on 2026-05-11. Status as of research:

| Ref from CONTEXT.md | File:Line | Verified? | Notes |
|---------------------|-----------|-----------|-------|
| `src/hooks/useSubscription.ts:5` (type SubscriptionPlan) | line 5 | ✅ Exact | `export type SubscriptionPlan = 'free' \| 'plus' \| 'pro';` |
| `src/hooks/useSubscription.ts:242-245` (collapse logic) | lines 240-245 | ✅ Exact | `const rawPlan = subscription?.plan as string \| undefined;` then collapse CASE |
| `src/hooks/useSubscription.ts:264` (isPlus flag) | line 264 | ✅ Exact | `const isPlus = plan === 'plus';` |
| `src/components/UpgradeBanner.tsx:46` | line 46 | ✅ Exact | `const planName = targetPlan === 'plus' ? 'Plus' : 'Pro';` |
| `src/components/UpgradePrompt.tsx:39,48` | lines 39, 48 | ✅ Exact | Both reference `targetPlan === 'pro' \|\| plan === 'plus'` |
| `src/pages/Assinatura.tsx:532,537` | lines 532, 537 | ✅ Exact | `plan.id === 'plus' ? "bg-orange-500/20" : "bg-muted"` |
| `src/integrations/supabase/client.ts:7,22-29` (supabaseAdmin) | lines 7, 22-29 | ✅ Exact | Confirmed `supabaseAdmin` is exported but **NOT IMPORTED ANYWHERE** in `src/` (grep returned 0 importers); deletion is safe |
| `vite.config.ts:14` (JWT fallback) | line 14 | ✅ Exact | `SUPABASE_PUBLISHABLE_KEY_FALLBACK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."` |
| `supabase/functions/google-calendar-auth/index.ts:12` (HMAC reuse) | line 12 | ✅ Exact | `const STATE_SIGNING_SECRET = SUPABASE_SERVICE_ROLE_KEY ?? '';` |
| `supabase/migrations/20260206223931_*.sql` (functions referencing enum) | full file | ✅ Verified | Contains `handle_new_user`, `can_access_feature`, `can_create_operation` — all need DROP+CREATE in consolidation migration |
| `supabase/migrations/20260131123615_*.sql` (current travel RLS) | full file | ✅ Verified | Defines `travel_cruises`, `travel_insurances`, `travel_attractions`, `travel_transfers` with `auth.uid() = user_id` only |
| 14 hooks in `src/hooks/travel/*` | actually **16 files** | ⚠️ COUNT WAS WRONG | Glob returned: `useAgencySettings.ts`, `useGoogleCalendar.ts`, `useTotalSavings.ts`, `useTravelAttractions.ts`, `useTravelCars.ts`, `useTravelClients.ts`, `useTravelCruises.ts`, `useTravelHotels.ts`, `useTravelInsurances.ts`, `useTravelQuotes.ts`, `useTravelReceivables.ts`, `useTravelStats.ts`, `useTravelTickets.ts`, `useTravelTransfers.ts` = 14 hook files + `index.ts` + `types.ts` = 16 total. CONTEXT count of "14 hooks" is correct **if excluding index.ts and types.ts**. The 14 hook files write to ~14 distinct travel tables. ⚠️ **`useGoogleCalendar` and `useAgencySettings` are NOT travel-data hooks** — they don't write to `travel_*` tables. Real travel hook count: **12 data hooks** (useTravelAttractions, Cars, Clients, Cruises, Hotels, Insurances, Quotes, Receivables, Tickets, Transfers, plus useTravelStats which is read-only and useTotalSavings which is also read-only). **Planner action:** confirm exact target table list against DB via `\dt travel_*` — there are likely 10-12 tables, not 14. |

### NEW REFERENCES the planner MUST address (not in CONTEXT.md)

These were discovered by `grep -rn "'plus'" src/` and represent additional touchpoints for SEC-05:

| File:Line | What | Action |
|-----------|------|--------|
| `src/App.tsx:143` | `<PlanProtectedRoute requiredPlans={['plus', 'pro']}>` for `/lancamentos/sala-vip` | Replace `'plus'` → `'pro'` (collapse target); since Pro is the new gate, just `requiredPlans={['pro', 'vip']}` |
| `src/config/sidebarNavigation.ts:47` | `export type PlanType = 'free' \| 'plus' \| 'pro';` | `'free' \| 'pro' \| 'vip'` |
| `src/config/sidebarNavigation.ts:86,98,117-120` | 6 nav items with `requiredPlan: 'plus'` | Replace each with `'pro'` (since old `plus` semantics = new `pro`) |
| `src/config/sidebarNavigation.ts:159,182,204,207` | logic checking `requiredPlan === 'plus'/'pro'` | Update to check `'pro'/'vip'` and `canAccessPro/canAccessVip` |
| `src/components/PlanProtectedRoute.tsx:8,14,30` | `requiredPlans?: SubscriptionPlan[]; ... if (requiredPlan === 'plus')` | Update default + check |
| `src/components/UpgradePrompt.tsx:12,20` | `targetPlan?: 'plus' \| 'pro'` + default | `'pro' \| 'vip'`, default `'pro'` |
| `src/components/UpgradeBanner.tsx:11,17` | Same as above | Same |
| `src/components/layout/sidebar/SidebarUserInfo.tsx:15,38` | `plan: 'free' \| 'plus' \| 'pro'` + switch case | Update |
| `src/components/landing/AnimatedSections.tsx:402-403` | `planName.toLowerCase().includes('plus') ? 'plus' : ...` | Marketing page; update to `'pro'` |
| `src/lib/subscriptionLeads.ts:4` | `export type SubscriptionLeadPlan = 'free' \| 'plus' \| 'pro';` | Update + verify DB column constraints if any |
| `src/pages/Assinatura.tsx:69,248,265` | `id: 'plus'` and casts | Update |
| `src/pages/sistema/Programas.tsx:372` | `targetPlan="plus"` | Update |
| `src/pages/Relatorios.tsx:354` | Same | Update |
| `src/pages/Analises.tsx:80` | `'plus': 'Plus'` mapping | Update |

**Total: 11 files with `'plus'` references** (CONTEXT.md listed 4-5). The planner MUST budget for the larger refactor scope.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vitest, Vite, npm scripts | ✓ | 22 (CI) / per dev | — |
| npm | Package install | ✓ | 10.x | — |
| Supabase CLI | `supabase start`, migrations, secrets, db dump | ⚠️ Required on dev machine + CI runner | 2.98.2 (latest) — confirm via `supabase --version` | None viable |
| Docker | Required by Supabase CLI for `supabase start` | ⚠️ Required on dev machine + CI runner | Docker Desktop on dev; Docker preinstalled on `ubuntu-latest` runner | None |
| `openssl` (or equivalent) | Generate `OAUTH_STATE_SECRET` value | ✓ | Available on macOS/Linux/Git Bash on Windows | Use `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` as fallback |
| `supabase/setup-cli@v2` GH Action | CI install of Supabase CLI | ✓ | v2.0.0 (2026-04-21) | None — official action |
| `actions/setup-node@v5` | CI Node setup | ✓ (already in ci.yml) | v5 | — |

**Missing dependencies with no fallback:**
- None blocking. Supabase CLI is a developer-machine prerequisite documented in CLAUDE.md once added; on CI it's the `setup-cli` action.

**Missing dependencies with fallback:**
- `openssl` on Windows dev machines — use the Node fallback.

## Validation Architecture

> Phase has `nyquist_validation: true` per `.planning/config.json`. Section required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 (installed) — config at `vitest.config.ts` |
| Config file | `vitest.config.ts` (existing) — needs split into `unit` + `integration` projects per Pattern 1 |
| Quick run command | `npm test -- --project unit` (post-split) — fast feedback, mocks Supabase |
| Full suite command | `npm test -- --project integration` — boots `supabase start`, real RLS |
| Phase gate | Both projects green AND `failOnSecretLeak()` passes AND `grep -rE 'service_role\|sk_live\|sk_test\|eyJhbGc' dist/` returns 0 matches |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-01 | Free user JWT direct REST POST `/rest/v1/travel_cruises` returns 403 / code 42501 | integration | `npm test -- --project integration -t "FREE user INSERT is blocked"` | ❌ Wave 0 — `src/hooks/travel/travel.adversarial.test.ts` |
| SEC-02 | Every `travel_*` and `vip_*` table has `WITH CHECK (auth.uid() = user_id AND has_plan(...))` policy | property | `npm test -- --project integration -t "all travel tables block free user INSERT"` | ❌ Wave 0 — same file, table-driven |
| SEC-03 | Build aborts when `VITE_*SERVICE_ROLE*` is set; bundle has zero `service_role` strings | property | `VITE_FAKE_SERVICE_ROLE=x npm run build` (expect non-zero exit); `grep -rE 'service_role' dist/` returns 0 | ❌ Wave 0 — `scripts/test-secret-guard.sh` (smoke shell test) + the Vite plugin itself |
| SEC-04 | Build aborts when `VITE_SUPABASE_PUBLISHABLE_KEY` is unset | property | `unset VITE_SUPABASE_PUBLISHABLE_KEY; npm run build` (expect non-zero) | ❌ Wave 0 — same `scripts/test-secret-guard.sh` |
| SEC-05 | `enum_range(NULL::subscription_plan)` returns exactly `{free,pro,vip}`; no `'plus'` strings in `src/` | property | `psql -c "SELECT enum_range(NULL::subscription_plan);"`; `! grep -rE "['\"]plus['\"]" src/` | ❌ Wave 0 — Vitest property test using `supabase` SQL exec; grep is shell-only |
| SEC-06 | `has_plan(uid, plan)` returns expected boolean for free/pro/vip × free/pro/vip | unit | `npm test -- --project integration -t "has_plan returns correct"` | ❌ Wave 0 — `supabase/migrations/20260512XXXX_phase1.test.sql` OR Vitest test calling the function via `.rpc('has_plan', ...)` |
| SEC-07 | AuthProvider, PlanProtectedRoute, useSubscription, ErrorBoundary, 14 travel hooks, google-calendar-auth each have happy-path + adversarial test | unit + integration | `npm test` (both projects) | ❌ Wave 0 — multiple new files; component tests will be the FIRST in the codebase |

### Sampling Rate

- **Per task commit:** `npm test -- --project unit` (no Supabase needed, ~30s)
- **Per wave merge (within the single PR):** `npm test` (both projects) + `npm run build` + `grep -rE 'service_role\|eyJhbGc' dist/`
- **Phase gate (before `/gsd-verify-work`):** Full suite + manual smoke (login → access free feature → confirm rejection of pro feature → upgrade via SQL → confirm access)

### Wave 0 Gaps

- [ ] `vitest.config.ts` — refactor into multi-project (unit + integration) per Pattern 1
- [ ] `src/test/integration/setup.ts` — admin client + test users + signin helper
- [ ] `src/test/integration/adminClient.ts` — service-role client factory (`persistSession: false`)
- [ ] `src/hooks/travel/travel.adversarial.test.ts` — table-driven 12-16 tables × 3 plans × 4 ops
- [ ] `src/contexts/AuthProvider.test.tsx` — first **component-level** test in repo (signup, signin, logout, profile creation)
- [ ] `src/components/PlanProtectedRoute.test.tsx` — route guard + UX hint validation
- [ ] `src/hooks/useSubscription.test.ts` — plan computation; collapse logic deletion verified
- [ ] `src/components/ErrorBoundary.test.tsx` — last line of defense
- [ ] `scripts/test-secret-guard.sh` — shell test of `failOnSecretLeak()` (run with `VITE_FAKE_SERVICE_ROLE=x npm run build` expects exit 1)
- [ ] `.github/workflows/ci.yml` — add `integration` job per Example 3
- [ ] `supabase/seed.sql` (NEW) or seed in test setup — pre-create `travel_clients` row for FK constraints in adversarial inserts (every `travel_*.client_id REFERENCES travel_clients(id)`)
- [ ] Edge function test for `google-calendar-auth` HMAC roundtrip (Deno test OR HTTP-based Vitest)

**Framework install:** None — Vitest already at 4.1.4. Running `npm install` to align to 4.1.6 (latest) is opportunistic.

## Security Domain

> `security_enforcement: true` per `.planning/config.json`. Section required.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth (existing); `auth.admin.createUser` for test fixtures only |
| V3 Session Management | yes | Supabase JS v2 with `localStorage` persistence; `persistSession: false` on admin/test clients to prevent collision |
| V4 Access Control | **YES — primary phase concern** | RLS policies + SECURITY DEFINER `has_plan()` / `can_access_account()`. Trust kernel pattern is the OWASP-recommended "centralized authorization decision point" approach. |
| V5 Input Validation | yes | Zod via `supabase/functions/_shared/validate.ts` (existing; Phase 2 work); for Phase 1, the only new untrusted input is in adversarial test bodies (controlled). |
| V6 Cryptography | yes | HMAC-SHA256 for OAuth state (existing in `google-calendar-auth/index.ts`); `OAUTH_STATE_SECRET` rotated to be independent of service-role key. NEVER hand-roll crypto — use `crypto.subtle` (already in use) and `pgsodium` for at-rest encryption (Phase 2). |
| V7 Error Handling | yes | `getSafeErrorMessage` wraps RLS errors as friendly Portuguese messages (existing); test code MUST NOT leak stack traces to UI. |
| V10 Malicious Code | yes | `failOnSecretLeak()` build guard prevents accidental secret leak via `VITE_*` env. Post-build grep is the secondary check. |
| V13 API and Web Service | yes | Supabase REST + edge functions; verify_jwt defaults true; service-role isolated. |

### Known Threat Patterns for Supabase + React + Capacitor stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Authenticated user bypasses UI gate via direct REST POST (CRIT-01) | Elevation of Privilege | Server-side `has_plan()` check in every RLS policy; UI is hint only |
| Service-role key in client bundle (CRIT-02) | Information Disclosure / EoP | Delete `VITE_*SERVICE_ROLE*` env reading; Vite plugin guard; CI grep guard |
| RLS policy missing `WITH CHECK` on UPDATE | Tampering | Standard policy template includes BOTH `USING` and `WITH CHECK`; code review checklist |
| JWT plan claim trusted by RLS | EoP | Always `(SELECT plan FROM user_subscriptions ...)`, never `auth.jwt() ->> 'plan'` (verified 0 matches in current codebase) |
| HMAC secret reuse across systems | Spoofing | Split `OAUTH_STATE_SECRET` from `SUPABASE_SERVICE_ROLE_KEY` (D-10) |
| RLS view leaks (PG security_invoker default) | Information Disclosure | Audit any new view with `WITH (security_invoker = true)`; Phase 1 creates no views — defer to per-PR audit |
| Stale session on plan change (test pitfall) | EoP | `has_plan()` queries DB at every call (already designed correctly); tests must re-sign-in after plan changes |
| OAuth state CSRF | Spoofing | Existing HMAC + 10 min TTL + nonce in state (already implemented at `index.ts:60-77, 147`) |

## Project Constraints (from CLAUDE.md)

> Extracted from `./CLAUDE.md` — must be honored by the planner.

- **Logger:** Use `logger.*` from `src/lib/logger.ts` — NEVER `console.*` (recent migration; 0 console calls in src/). New test files MAY use `console` for debugging during development but must remove before commit.
- **Path alias:** `@/` → `./src/` is the only alias; use it consistently. New `src/test/integration/*` must be importable as `@/test/integration/setup`.
- **TypeScript strict:** No new `any` outside the documented escape-hatch zones (`src/components/ui/**`, `supabase/functions/**`). Test files are subject to strict type checking.
- **Naming:**
  - Components: `PascalCase.tsx`
  - Hooks: `camelCase.ts` starting with `use`
  - Tests: co-located, `<source>.test.ts(x)` (no `__tests__/` directory)
  - Migrations: `<timestamp>_<uuid>.sql` (auto-generated by Supabase CLI)
- **shadcn/ui** is the component primitive layer — irrelevant to Phase 1 (no UI work).
- **react-query** for server state — existing `useSubscription` already uses `useQuery`; refactor must preserve invalidation patterns.
- **Sonner** for toasts (44 files use `toast` from `sonner`); error messages via `getSafeErrorMessage(error)`.
- **Idioma:** Respond to USER in PT-BR; commit messages and code stay in English. Research output (this document) is technical English. ✓
- **GSD framework:** plans live in `.planning/phases/01-security-foundation-hardening/`; this RESEARCH.md feeds the planner; planner produces 4-6 PLAN.md files in same dir.
- **Don't question locked decisions:** Stack (Supabase + React + shadcn + Capacitor); gateway (Asaas — Phase 2); iOS Path C; Trial 7d Pro; CNPJ obrigatório (Phase 2); Free+Pro+VIP only; Multi-CPF VIP-only.

## Assumptions Log

> The following claims are not directly verified by tool calls in this session. Treat as `[ASSUMED]`; planner / discuss-phase should confirm before locking into plans.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `supabase db reset` takes ~30-60s on local Supabase with all migrations applied | Pattern 1, Common Pitfalls | If actually >2 min, integration test loop becomes painful — mitigation: cache between test files via `--shard` |
| A2 | `supabase start` cold start is 2-3 min on Ubuntu CI runners (Docker pull) | Pattern 1, Pitfall 7 | If 5+ min, CI becomes flaky — mitigation: Docker layer cache via `actions/cache` |
| A3 | Edge function "next invocation uses new value" propagation is essentially immediate (<5s) for `supabase secrets set` | Pattern 6 | If actually delayed (e.g., 30s for cluster propagation), smoke tests right after `secrets set` may fail — mitigation: built-in retry in smoke test |
| A4 | The `agency` and `pro_familia` enum values currently exist in DB rows (vs. only being defined in the type) | Pattern 5 | If only `free`, `pro`, `basic` exist in actual rows, the backfill is no-op but harmless. **Pre-flight SQL `SELECT plan, COUNT(*) FROM user_subscriptions GROUP BY plan` MUST run before migration to capture truth.** |
| A5 | The 14 travel hooks correspond to ~14 distinct travel tables; the actual count of `travel_*` tables in DB may differ | Verified Code References | If DB has fewer tables (e.g., 10), the test cases overshoot — mitigation: `\dt travel_*` in psql before writing test cases; planner adjusts |
| A6 | The `vip_*` table family exists; `App.tsx:143` references `/lancamentos/sala-vip` so at least `vip_lounge_visits`-style tables exist | Phase Requirements | Need to enumerate exact `vip_*` tables via `\dt vip_*` before SEC-02 RLS rewrite |
| A7 | The `failOnSecretLeak()` Vite plugin works as `process.env`-driven check at build start (not at config-resolve time) | Pattern 2 | Vite docs confirm `config()` hook runs early enough; if any future Vite version changes timing, the guard could be bypassed — mitigation: also add post-build grep step in CI as belt-and-suspenders |
| A8 | The HMAC OAuth state TTL is 10 min (per code at `index.ts:147`) and not reconfigurable elsewhere | Pattern 7 | If a separate caller uses a longer TTL, the dual-read window must be longer than 10 min |

**Action for the planner:** Before locking `01-PLAN-*.md`, the user (via discuss-phase or directly) should confirm A4, A5, A6 by running the suggested psql commands against prod or a recent dump. A1, A2, A3 can be measured during Wave 0 execution (smoke runs on dev machine).

## Open Questions

1. **Should we set `verify_jwt = false` on any function in this phase?**
   - What we know: Phase 1 doesn't add new edge functions; existing functions all default to `verify_jwt = true`.
   - What's unclear: Should we audit existing functions for inappropriate `verify_jwt = false`? Phase 2 webhook will need it.
   - Recommendation: Defer to Phase 2 (webhooks). Phase 1 only touches `google-calendar-auth/index.ts` (SEC-03/D-10 OAUTH_STATE_SECRET split) — keep its `verify_jwt = true`.

2. **Do we add a Vitest test for `useSubscription` that boots a real local Supabase, or mock the supabase client?**
   - What we know: `useSubscription` does 3 queries (`user_subscriptions`, `operations` count, `user_programs` count). A unit test with mocked supabase verifies the LOGIC (collapse, plan-default fallback, etc); an integration test verifies the round-trip + RLS doesn't reject.
   - What's unclear: Is duplicate coverage worth it?
   - Recommendation: **Both.** Unit test for math (fast, runs every commit); integration test confirms it can read its own subscription row (RLS is permissive for self).

3. **Where do `vip_*` tables live? Which of them need RLS rewrite in Phase 1?**
   - What we know: `App.tsx:143` references `/lancamentos/sala-vip`; CONCERNS.md mentions `vip_lounge_visits`; ARCHITECTURE.md mentions same. CONTEXT D-05 says "all `vip_*` tables".
   - What's unclear: Exact list — could be 1 (`vip_lounge_visits`) or many.
   - Recommendation: Planner runs `\dt vip_*` against local dump in Wave 0; adjusts test scope.

4. **Should `managed_accounts` table be created in Phase 1 even though UI is Phase 2?**
   - What we know: CONTEXT explicitly says "TABLE + RLS é criada nesta phase"; ARCHITECTURE.md §Multi-CPF defines schema.
   - What's unclear: How many adversarial tests for `can_access_account()` are needed when there's no UI populating `managed_accounts` yet?
   - Recommendation: Create table + RLS + happy-path test (admin inserts a `managed_accounts` row, VIP user can SELECT operations of managed_user_id). Defer multi-CPF UI flows to Phase 2 testing.

5. **Vite multi-project config OR separate `vitest.integration.config.ts`?**
   - What we know: Vitest 4.x supports both. Multi-project is more idiomatic.
   - What's unclear: CI complexity (separate `npm test` invocations vs. one)
   - Recommendation: Multi-project (per Pattern 1) — keeps a single config, single coverage report, easier local UI navigation.

## Sources

### Primary (HIGH confidence)
- [Supabase Edge Functions Secrets](https://supabase.com/docs/guides/functions/secrets) — "You don't need to re-deploy after setting your secrets"
- [Supabase Database API 42501 Errors](https://supabase.com/docs/guides/troubleshooting/database-api-42501-errors) — RLS error shape, HTTP status mapping
- [Supabase PostgREST Error Codes](https://supabase.com/docs/guides/api/rest/postgrest-error-codes) — `42501` → 403 (auth) / 401 (anon)
- [Supabase Local Testing Overview](https://supabase.com/docs/guides/local-development/testing/overview) — `auth.admin.createUser` pattern
- [Supabase setup-cli GitHub Action](https://github.com/supabase/setup-cli) — v2 syntax, version detection from lockfile
- [Vite Plugin API](https://vite.dev/guide/api-plugin) — `config()` hook signature
- [Vite Env Variables](https://vite.dev/guide/env-and-mode) — `process.env` available in config; `import.meta.env` is build substitution
- [PostgreSQL ALTER TYPE](https://www.postgresql.org/docs/current/sql-altertype.html) — `ADD VALUE` transaction restriction; full type recreate is safe
- [Vitest Parallelism](https://vitest.dev/guide/parallelism) + [Vitest Improving Performance](https://vitest.dev/guide/improving-performance) — multi-project, `fileParallelism`
- Codebase grep + file reads (2026-05-11) — verified all CONTEXT.md code refs

### Secondary (MEDIUM confidence)
- [Updating Enum Values in PostgreSQL — yo1.dog blog](https://blog.yo1.dog/updating-enum-values-in-postgresql-the-safe-and-easy-way/) — canonical recreate-type sequence + default-drop caveat
- [Index Garden — Testing Supabase RLS with Vitest](https://index.garden/supabase-vitest/) — jsdom session collision; `persistSession: false` fix
- [Supabase Discussion #9351 — `supabase start` time on CI](https://github.com/orgs/supabase/discussions/9351) — 40-60s warm, 5min cold; background-start strategy
- [Supabase CLI Issue #2724](https://github.com/supabase/cli/issues/2724) — clean environment startup is slow
- [Supabase Function Configuration](https://supabase.com/docs/guides/functions/function-configuration) — `[functions.<name>]` block in `config.toml`
- [Apple Reader App / Multiplatform Services Path C context](https://developer.apple.com/support/reader-apps/) — referenced for context only; not Phase 1 scope

### Tertiary (LOW confidence — flagged for validation in plan)
- Exact `supabase db reset` timing (no canonical benchmark; estimated from community reports)
- Exact propagation delay of `supabase secrets set` to live edge function instances (docs say "immediately" without quantifying)
- Whether `vite-plugin-pwa` regenerates the SW with new env on rebuild (assumed yes based on plugin behavior; verify via grep on `dist/sw.js` post-build)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libs already installed and version-pinned
- Architecture (trust kernel SQL): HIGH — copied from ARCHITECTURE.md which has HIGH confidence; cross-checked against existing `can_access_feature` template
- Test patterns (Vitest+Supabase local): HIGH — pattern verified against published guide + existing 17 test files in repo
- Vite plugin shape: HIGH — official docs confirm shape
- Postgres enum reduction: HIGH — official docs + known-good blog pattern
- `supabase secrets set` no-redeploy claim: HIGH — official docs explicit
- RLS error code 42501 + HTTP 403: HIGH — official docs explicit
- `supabase db reset` timing: MEDIUM — community-reported, no formal benchmark
- Travel table count: MEDIUM — file glob shows 14 hook files but actual table count needs `\dt travel_*` confirmation
- `vip_*` table list: LOW — needs psql audit in Wave 0

**Research date:** 2026-05-11
**Valid until:** 2026-06-11 (30 days for stable infra; sooner if Supabase CLI v3 ships or @supabase/supabase-js v3 ships)
