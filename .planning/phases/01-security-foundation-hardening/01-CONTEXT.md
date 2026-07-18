# Phase 1: Security & Foundation Hardening - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Trust kernel server-side: um usuário Free autenticado com seu próprio JWT não consegue ler/escrever em nenhuma tabela `travel_*` ou `vip_*` via REST direto. O bundle de produção ship zero secrets e o build falha (não silencia) quando expostos. O enum `subscription_plan` é canônico (`free|pro|vip`) consolidado em DB e TS. As 4 categorias mais sensíveis sem teste (AuthProvider, PlanProtectedRoute/useSubscription, 14 travel hooks, edge function `google-calendar-auth`) têm cobertura adversarial.

**Não inclui:** UI de planos (Phase 2), Asaas integration (Phase 2), `webhook_events` table (Phase 2), `managed_accounts` UI (Phase 2 — mas a TABLE + RLS é criada nesta phase).

</domain>

<decisions>
## Implementation Decisions

### Enum Consolidation (SEC-05)
- **D-01:** Mapeamento semântico do enum legado: `agency` → `vip`, `pro_familia` → `vip`, `basic` → `pro`. Backfill via `UPDATE user_subscriptions SET plan = ...` ANTES do enum recreate. Comment block no topo da migration documenta o mapping reverso pra rollback.
- **D-02:** TypeScript refactor é big bang em 1 PR: o tipo `SubscriptionPlan` em `src/hooks/useSubscription.ts:5` vira `'free' | 'pro' | 'vip'`; collapse logic em `useSubscription.ts:242-245` é deletada; grep-and-replace `'plus'` → `'pro'` (porque `plus` no TS == `basic` no DB == `pro` no novo enum) em `UpgradeBanner.tsx:46`, `UpgradePrompt.tsx:39,48`, `Assinatura.tsx:532,537`. `isPlus` em `useSubscription.ts:264` é deletado ou renomeado pra `isPro`. Sem dual-read, sem feature flag.

### Migration Cadence & Rollout (SEC-01..SEC-06)
- **D-03:** 1 PR único cobrindo todas as 6 migrations desta phase + secret cleanup (SEC-03/SEC-04) + Vite plugin (SEC-03) + TS refactor (SEC-05) + testes (SEC-07). Solo dev sem pagantes = sem custo de coordenação. Rollback é `git revert` + `supabase migration repair`.
- **D-04:** Pre-deploy test obrigatório: `supabase db dump --data-only` da prod → restore em `supabase start` local → aplica migrations → roda adversarial Vitest + smoke manual → SÓ ENTÃO `supabase db push` pra prod. Captura row inválido travando backfill.

### RLS Isolation Behavior (SEC-01, SEC-02)
- **D-05:** Soft isolation em **todas** as famílias de tabela: `travel_*`, `vip_*`, `managed_accounts`. SELECT continua permitido pelo plano antigo após downgrade (`USING (auth.uid() = user_id)` ou `USING (can_access_account(...))` sem `has_plan`). INSERT/UPDATE/DELETE bloqueados (`WITH CHECK` adiciona `has_plan(...)`). Re-upgrade restaura escrita imediatamente.
- **D-06:** Revoke explícito de uma `managed_account` (consultor remove cliente intencionalmente via UPDATE em `revoked_at`) é **hard**: a função `can_access_account()` checa `revoked_at IS NULL`, então o relacionamento fica invisível imediatamente para o owner. Diferente de downgrade, que mantém visibilidade. Os dados do `managed_user_id` permanecem (auth.users + operations etc), só a ponte some.

### Test Strategy (SEC-07)
- **D-07:** Testes adversariais em Vitest contra Supabase local. CI levanta `supabase start` no runner, cria 3 users com JWTs reais (free/pro/vip via `supabase.auth.admin.createUser` + `signInWithPassword`), Vitest dispara `supabase.from('travel_cruises').insert(...)` e espera erro `42501` ou status 403/401. Cobre o Success Criterion #1 do roadmap (HTTP request com JWT é exatamente o que o `curl` faria; mais portável e integrado à suite). Bash `curl` script opcional pode ser adicionado como smoke test pós-deploy.
- **D-08:** 14 hooks em `src/hooks/travel/*` cobertos por 1 arquivo `travel.adversarial.test.ts` table-driven. Estrutura:
  ```typescript
  const cases = [
    { hook: useTravelTickets, table: 'travel_tickets', sample: {...} },
    { hook: useTravelHotels,  table: 'travel_hotels',  sample: {...} },
    // ... 14 entries
  ];
  describe.each(cases)('%s adversarial RLS', ({ hook, table, sample }) => {
    it('free user INSERT returns 403', async () => { ... });
    it('pro user INSERT succeeds', async () => { ... });
    it('downgrade Pro->Free: SELECT works (soft), INSERT blocks', async () => { ... });
  });
  ```
  Adicionar novo travel hook = adicionar 1 linha no array.

### Secret Rotation & Separation (SEC-03)
- **D-09:** Service-role key rotacionado **depois** do deploy do código limpo. Sequência rígida:
  1. Deploy do PR (sem `import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY` no código);
  2. CI verde + smoke test pós-deploy;
  3. Supabase Dashboard → Settings → API → Reset service role key;
  4. `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<novo>` (atualiza secret das edge functions);
  5. `supabase functions deploy --no-verify-jwt` em todas as funções afetadas (re-aplica o secret novo);
  6. Smoke test de cada edge function que usa service-role (`mrr-dashboard`, `google-calendar-auth`, `create-managed-account` se já existir).
- **D-10:** `OAUTH_STATE_SECRET` separado do service-role nesta phase. Sequência:
  1. `OAUTH_STATE_SECRET=$(openssl rand -hex 32)` → `supabase secrets set OAUTH_STATE_SECRET=...`;
  2. `supabase/functions/google-calendar-auth/index.ts:12` lê `Deno.env.get('OAUTH_STATE_SECRET')` (com fallback temporário pro service-role só durante a janela do PR);
  3. Após deploy, remove o fallback;
  4. Documenta no header da function que rotacionar service-role NÃO mais invalida OAuth states.

### Claude's Discretion
- Granularidade interna dos plans dentro do single PR (planner decide se faz 4 ou 6 plans, mas todos no mesmo PR);
- Regex exato do `failOnSecretLeak()` Vite plugin — minimum: `/^VITE_.*(SERVICE_ROLE|SECRET_KEY|WEBHOOK_SECRET|PRIVATE_KEY)/`. Adicionar `_TOKEN`, `STRIPE_*`, `ASAAS_*` é judgment do planner;
- Escopo de cleanup hygiene LOW concerns (3 lockfiles, `.npmrc`, `.lovable/plan.md`, Node version mismatch) — roadmap diz "opportunistic"; planner inclui se couber em 1 plan paralelo, defere caso contrário;
- Naming convention das policies RLS — research usa `travel_cruises_select`/`_insert` snake_case; planner mantém ou padroniza, contanto que seja grep-able;
- Ordem dos commits dentro do PR (planner usa wave-based execution per `parallelization: true` no config);
- Layout exato do CI workflow YAML pra `supabase start` em GitHub Actions.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Trust kernel design + RLS patterns
- `.planning/research/ARCHITECTURE.md` §Plan Gating Server-Side — SQL completo de `has_plan()`, padrões de policy pra `travel_*` e `vip_*`, decisão soft vs hard isolation, component boundary table
- `.planning/research/ARCHITECTURE.md` §Multi-CPF Data Model — `managed_accounts` schema + `can_access_account()` function + headless user creation flow
- `.planning/research/ARCHITECTURE.md` §Build Order — dependency graph e ordem reverse-safe das migrations
- `.planning/research/ARCHITECTURE.md` §Migration Safety — riscos, mitigações, rollback strategy, testing plan
- `.planning/research/SUMMARY.md` §4 Architecture Must-Haves — TL;DR do trust kernel
- `.planning/research/PITFALLS.md` CRIT-01, CRIT-02, HIGH-04, HIGH-05 — guardrails de segurança e enum migration

### Existing codebase state (alvos de modificação)
- `.planning/codebase/CONCERNS.md` §Security/CRITICAL — refs específicas (file:line) dos 3 CRIT/HIGH findings
- `.planning/codebase/CONCERNS.md` §Test Coverage Gaps — lista priorizada dos paths sem teste pra SEC-07
- `.planning/codebase/CONCERNS.md` §Scaling Limits — racional do enum 5↔3 mismatch
- `supabase/migrations/20251228134346_09ff8933-fdd7-4006-b6b0-051e339f9f12.sql` — `CREATE TYPE subscription_plan` original + `can_access_feature()` template + `user_subscriptions` schema base
- `supabase/migrations/20251228141821_83f04594-e44a-4c5a-93e1-3b255d1b4b36.sql` — backfill antigo que setou alguns rows pra `agency`
- `supabase/migrations/20260131123615_267dcb8d-8b75-4b1f-9b24-1596a9ebef74.sql` — RLS atual de `travel_*` (a ser substituído integralmente)
- `supabase/migrations/20260206223914_3afbad61-a11d-4a02-aa23-f50ee801d380.sql` — `ALTER TYPE` que adicionou `basic` e `pro_familia`
- `supabase/migrations/20260206223931_2c1edc7a-14d4-46fe-9284-3ad4f30a6944.sql` — backfill `agency` → `pro_familia` + função `count_monthly_operations` (essa precisa atualizar pro novo enum)

### Secret hygiene
- `src/integrations/supabase/client.ts:7,22-29` — `import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY` + `supabaseAdmin` export (DELETE)
- `vite.config.ts:14` — JWT anon hardcoded fallback (DELETE)
- `supabase/functions/google-calendar-auth/index.ts:12` — reuso de `SUPABASE_SERVICE_ROLE_KEY` como HMAC secret (SEPARATE em `OAUTH_STATE_SECRET`)
- `.planning/research/ARCHITECTURE.md` §Secret Separation — design do `failOnSecretLeak()` Vite plugin

### Enum consolidation alvos no TS
- `src/hooks/useSubscription.ts:5` — type `SubscriptionPlan = 'free' | 'plus' | 'pro'` (vira `'free' | 'pro' | 'vip'`)
- `src/hooks/useSubscription.ts:242-245` — collapse logic (DELETE)
- `src/hooks/useSubscription.ts:264` — `isPlus` flag (DELETE ou renomear)
- `src/components/UpgradeBanner.tsx:46` — `targetPlan === 'plus'`
- `src/components/UpgradePrompt.tsx:39,48` — `plan === 'plus'`
- `src/pages/Assinatura.tsx:532,537` — `plan.id === 'plus'`

### Test scope alvos (SEC-07)
- `src/contexts/AuthProvider.tsx` — signup, signin, signout, profile creation
- `src/components/PlanProtectedRoute.tsx` — route guard (UX hint, não security boundary, mas tem que ter teste)
- `src/hooks/useSubscription.ts` — toda a lógica de plan computation
- `src/components/ErrorBoundary.tsx` — last line of defense
- `src/hooks/travel/*.ts` (14 files) — alvos do `travel.adversarial.test.ts` table-driven
- `supabase/functions/google-calendar-auth/index.ts` — HMAC OAuth state + `OAUTH_STATE_SECRET` migration

### Project guidance
- `CLAUDE.md` (root) — convenções (logger.* não console.*, `@/` alias, react-query patterns, sonner toasts)
- `.planning/codebase/CONVENTIONS.md` — TypeScript strict, naming
- `.planning/codebase/STRUCTURE.md` — src/ layout

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Vitest + RTL já configurados** — 93 testes verdes em `src/lib/` e alguns hooks; reaproveita `vitest.config.ts`, setup files, `@testing-library/react` patterns existentes
- **Logger ao invés de console** — recente migração; todos os novos arquivos usam `logger.*` de `src/lib/logger.ts` (no-op em prod, dev logs em dev)
- **`can_access_feature()` SQL function** já existe em `supabase/migrations/20251228134346...sql:79` mas não é invocada por nenhuma policy; serve de template SECURITY DEFINER pra `has_plan()` e `can_access_account()`
- **`user_subscriptions` table** já tem `is_active`, `expires_at`, `plan` — schema base pra `has_plan()` está pronto
- **Supabase typed client** com `Database` type completo em `src/integrations/supabase/types.ts` (2531 linhas, auto-gerado)
- **`supabase/functions/_shared/validate.ts`** (Zod) existe pra validation pattern em edge functions
- **`scripts/`** dir já existe pra novos shell scripts (regen types, futuro adversarial.sh)

### Established Patterns
- **Migrations versionadas** em `supabase/migrations/<timestamp>_<uuid>.sql` (timestamp prefix obrigatório); Supabase CLI gerencia ordem
- **Edge functions** em Deno com `verify_jwt = true` por padrão; `verify_jwt = false` só em webhooks (mas Phase 1 não tem webhook ainda)
- **Path alias** `@/` aponta pra `src/`; sempre usar em imports cross-folder
- **react-query pra server state** — `useQuery`/`useMutation`; useState/Context pra local
- **shadcn/ui + Tailwind** pra UI (irrelevante pra Phase 1, sem UI)
- **subscription gating client-side existente** em `PlanProtectedRoute` é UX hint (manter), nunca o boundary real (vai virar UX hint formal após RLS rewrite)

### Integration Points
- **Vite plugin loop** em `vite.config.ts:plugins` — onde `failOnSecretLeak()` se adiciona
- **GitHub Actions CI** em `.github/workflows/ci.yml` — onde adicionar step `supabase start` + adversarial Vitest
- **Supabase CLI local** (`supabase start`/`stop`/`db push`/`db dump`) — assumir disponível na dev machine + CI runner
- **`OAUTH_STATE_SECRET`** novo Deno env — adiciona via `supabase secrets set` (afeta TODAS edge functions, mas só `google-calendar-auth` lê)
- **`build` script** em `package.json` — onde adicionar `grep -rE 'service_role|sk_live|sk_test' dist/` pós-build (CI guard)

</code_context>

<specifics>
## Specific Ideas

- **Adversarial Vitest test deve ser determinístico** — usar UUIDs fixos pros 3 test users (free/pro/vip), reset DB entre runs via `supabase db reset` no `beforeAll`, evitar dependência de seed data dinâmico
- **Comment block obrigatório no topo de cada migration** com mapeamento reverso. Ex.:
  ```sql
  -- Migration 01: Consolidate subscription_plan enum 5 -> 3
  -- Forward:  agency -> vip, pro_familia -> vip, basic -> pro
  -- Reverse:  see comment block below + companion file 01-rollback.sql
  -- Snapshot of pre-migration row counts: see 01-precheck.sql output
  ```
- **`travel.adversarial.test.ts` é o "kill switch"** — se ele quebrar, build falha; serve de proxy pro Success Criterion #1 do roadmap
- **OAUTH_STATE_SECRET migration tem fallback temporário** dentro do PR (lê novo secret OU service-role); fallback removido no commit final do PR pra evitar half-applied state
- **Pre-flight check antes da migration** = SQL snippet `SELECT plan, COUNT(*) FROM user_subscriptions GROUP BY plan` documentado na PR description; resultado vai pro commit message do migration backfill

</specifics>

<deferred>
## Deferred Ideas

- **Cleanup hygiene LOW concerns** (3 lockfiles, `.npmrc legacy-peer-deps`, `.lovable/plan.md`, Node 22↔25 type mismatch) — opportunistic per roadmap; planner inclui se couber, senão vira backlog do `gsd-add-backlog`
- **`webhook_events` table** — Phase 2 (Asaas integration); schema já desenhado em ARCHITECTURE.md §Webhook
- **`managed_accounts` UI** (account switcher, "manage CPFs" page) — Phase 2; só a TABLE + RLS sai nesta phase
- **`stripe_*` legacy columns em `user_subscriptions`** — mencionados em ARCHITECTURE.md mas vão virar `asaas_*` em Phase 2
- **pgTAP** como suite alternativa aos Vitest tests — descartado, não adiciona dependência
- **bash `curl` script CI step** dedicado pro Success Criterion #1 — descartado a favor do Vitest equivalente; pode ser adicionado em Phase 3 como smoke test pós-deploy
- **Cleanup do `can_access_feature()`** legacy function (ainda não invocada por nenhuma policy) — defere; planner pode marcar `DEPRECATED` no comment header e remover em Phase 2 ou 3
- **Service-role key rotation periódica programática** (cron 90d) — defere; v1 só rotaciona uma vez nesta phase
- **Auditoria empírica de indexes** (`pg_stat_statements` + Supabase advisors) — defere; CONCERNS.md §Performance lista como MED, planner não trata em Phase 1

</deferred>

---

*Phase: 01-security-foundation-hardening*
*Context gathered: 2026-05-11 via /gsd-discuss-phase*
