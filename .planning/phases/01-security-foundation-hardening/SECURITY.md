---
phase: 01-security-foundation-hardening
audit_date: 2026-05-12
auditor: gsd-secure-phase (Claude Opus 4.7)
asvs_level: 2
status: SECURED_WITH_WARNINGS
threats_total: 14
threats_closed: 13
threats_open: 0
threats_warnings: 1
production_state: deployed
production_project: opusftqbbaozucmbuuug.supabase.co
---

# Phase 1 — Security Audit (Security & Foundation Hardening)

> Audit verifica cada mitigação declarada contra o código realmente
> mergeado (PRs #1 e #2 fundidos em `main`, 8 migrations aplicadas em
> Lovable Cloud production, legacy service-role desabilitada em
> 2026-05-12T21:47:41Z). UAT 8/8 pass independentemente confirmado em
> `01-UAT.md`.

---

## 1. Threat Register Verification (por disposition)

Cada ameaça do registro extraído de `01-RESEARCH.md` §PITFALLS,
`01-04-SUMMARY.md` §threat-model-coverage e `CONCERNS.md` §Security foi
verificada por grep / file inspection. Status: **CLOSED** quando a
evidência aparece no código atual; **WARNING** quando a mitigação
existe mas há regressão pós-execução.

| ID | Categoria (STRIDE) | Severidade | Disposition | Status | Evidência |
|----|--------------------|------------|-------------|--------|-----------|
| CRIT-01 | EoP (RLS bypass) | CRITICAL | mitigate | **CLOSED** | `supabase/migrations/20260512120003_create_has_plan_function.sql:31-61` cria `has_plan(uuid, subscription_plan)` SECURITY DEFINER STABLE; `supabase/migrations/20260512120005_rewrite_travel_rls_with_has_plan.sql` contém 40 `CREATE POLICY` ativos (grep `^CREATE POLICY` = 40); `supabase/migrations/20260512120006_rewrite_vip_rls_with_has_plan.sql` contém 4 ativos. Cada INSERT/UPDATE/DELETE invoca `has_plan(auth.uid(), 'pro')` ou `has_plan(auth.uid(), 'vip')` no `WITH CHECK`. Adversarial test prova: `src/hooks/travel/travel.adversarial.test.ts` (9 tabelas × 4 cases = 36 testes, todos green no CI). UAT SC #1 + #2 pass. |
| CRIT-02 | Information Disclosure (service-role no bundle) | CRITICAL | mitigate | **CLOSED** | `src/integrations/supabase/client.ts` (atual, 27 linhas): zero referência a `supabaseAdmin`, `VITE_SUPABASE_SERVICE_ROLE_KEY` ou `service_role`. Grep `supabaseAdmin\|VITE_SUPABASE_SERVICE_ROLE_KEY` em `src/` = 0 matches. Service-role aparece apenas em `src/test/integration/adminClient.ts:5` (Node-side test infra, lido via `process.env`, NÃO `import.meta.env` — não vai pro bundle). Adicionalmente: legacy service-role key desabilitada em prod em 2026-05-12T21:47:41Z (UAT SC #6 confirma curl com a chave antiga retorna 401 "Legacy API keys are disabled"). |
| HIGH-03 | Tampering (JWT anon hardcoded em `vite.config.ts`) | HIGH | mitigate | **WARNING — regressão pós-Plan-03** | Plan 03 commit `4a4d069` deletou os 3 `*_FALLBACK` constants conforme planejado. Porém o commit posterior `a85a7dc` (Lovable Cloud bot, 2026-05-12T21:24Z, mensagem "Changes" precedido por `c8cac4e` "Fixed missing env vars in build") REINTRODUZIU `FALLBACK_SUPABASE_URL`, `FALLBACK_SUPABASE_PUBLISHABLE_KEY` (linhas 71-74 do `vite.config.ts` atual) e `FALLBACK_SUPABASE_PROJECT_ID`. O JWT hardcoded é a chave anon LEGACY do projeto, que está DESABILITADA em prod (vide CRIT-02 acima — 401 "Legacy API keys are disabled"). **Risco operacional residual: nulo** (chave morta não autentica). **Risco de princípio violado: o requisito SEC-04 era "build deve falhar se env ausente, não silenciosamente cair em fallback"** — esta restrição já não vale para essas 3 vars (mas vale para qualquer nova `VITE_*` adicionada porque elas continuam em `REQUIRED_VITE_VARS`). Veja seção 3 "Production-state regressions" abaixo para tratamento recomendado. |
| HIGH-04 | EoP (RLS UPDATE sem WITH CHECK) | HIGH | mitigate | **CLOSED** | Migration 120005 e 120006 estabelecem o padrão `UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), '<tier>'))` para todas as 44 policies de write. Inline `DO $$ ... RAISE EXCEPTION $$` em cada migration verifica em commit-time que toda policy UPDATE tem `polwithcheck IS NOT NULL`. |
| HIGH-05 | Tampering (enum subscription_plan inconsistente DB↔TS) | HIGH | mitigate | **CLOSED** | DB enum canônico `{free,pro,vip}` confirmado em prod (UAT SC #4: Lovable retornou `enum_range = {free,pro,vip}`, zero rows legacy). `src/integrations/supabase/types.ts:2424` e `:2565` ambos declaram `subscription_plan: "free" | "pro" | "vip"`. `src/hooks/useSubscription.ts:5` declara `export type SubscriptionPlan = 'free' \| 'pro' \| 'vip'`. Grep `'plus'\|isPlus\|canAccessPlus` em `src/` = 0 matches. VALID_PLANS guard ativo em `src/hooks/useSubscription.ts:15` + `:259-261` (B-2 Option A, regressão coberta por `src/hooks/useSubscription.test.ts` Test 4 strict `=== 'free'` para `'basic'`). |
| MED-03 | Tampering (HMAC reuse: OAUTH state secret == service-role) | MEDIUM | mitigate | **CLOSED** | `supabase/functions/google-calendar-auth/index.ts:16` lê `STATE_SIGNING_SECRET = Deno.env.get('OAUTH_STATE_SECRET')` como ÚNICA fonte do secret HMAC. Linhas 17-21: `if (!STATE_SIGNING_SECRET) throw new Error(...)` — boot estrito, sem fallback. Plan 03 dual-read removido em commit `e7330d8` (Plan 06 Task 3) >11 min após o deploy do dual-read. UAT SC #7 confirma deploy pós-cutover: health probe retorna 400 "Invalid action" (= boot guard passou, função viva). Adversarial: `supabase/functions/google-calendar-auth/index.test.ts` (3 Deno tests: roundtrip + tampered + TTL). |
| MED-04 | EoP (Pitfall 6 — JWT plan claim) | MEDIUM | mitigate | **CLOSED** | `has_plan()` body (migration 120003 linhas 41-60) faz `SELECT plan FROM public.user_subscriptions` em cada invocação. Zero ocorrências de `auth.jwt() ->> 'plan'` em `supabase/migrations/` (apenas em comentários de Pitfall reminder na ..120003 linha 25). Plan downgrade reflete na próxima call. |
| MED-05 | EoP (search_path injection em SECURITY DEFINER) | MEDIUM | mitigate | **CLOSED** | Ambas `has_plan` e `can_access_account` declaram `SET search_path = public` no header (`..120003:39`, `..120004:can_access_account body`). Hostile session-level `SET search_path` não pode redirecionar lookups. Funções também são `STABLE` (não `VOLATILE`) e `REVOKE EXECUTE FROM public; GRANT EXECUTE TO authenticated`. |
| MED-06 | Tampering (managed_accounts revoke / orphan / self-ref / duplicate) | MEDIUM | mitigate | **CLOSED** | `..120004:38-46`: 2 FK `ON DELETE CASCADE` (auth.users → managed_accounts), `CHECK managed_accounts_no_self (owner != managed)`, `UNIQUE managed_accounts_unique_pair (owner, managed)`. Hard revoke: `can_access_account()` body verifica `revoked_at IS NULL` antes de retornar true (D-06 hard isolation). 2 partial indexes `WHERE revoked_at IS NULL` para perf em rels ativas. |
| LOW-01 | Information Disclosure (chart.tsx dangerouslySetInnerHTML) | LOW | accept | **CLOSED (accepted)** | Não tratado em Phase 1 (CONCERNS.md classifica como LOW — CSS injection sem `expression()` em browsers modernos). Aceita formalmente nesta phase; ver §4 "Accepted Risks". |
| LOW-02 | Defense-in-depth (anon EXECUTE em SECURITY DEFINER) | LOW | mitigate | **CLOSED** | Migration 120008 (PR #2 followup) REVOKE EXECUTE de `has_plan` e `can_access_account` do role `anon`. Inline `DO $$ ... RAISE EXCEPTION IF proacl LIKE '%anon=X%' $$` em commit-time. UAT #8 confirma CI verde na PR #2. |
| LOW-03 | Tampering (user_subscriptions sem FK + 8 orphan rows) | LOW | mitigate | **CLOSED** | Migration 120007 deleta `WHERE NOT EXISTS (SELECT 1 FROM auth.users)` e adiciona `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`. Inline self-check `RAISE EXCEPTION` se `orphan_count > 0`. |
| SEC-07-A | Test Coverage Gap | HIGH | mitigate | **CLOSED** | 4 critical-path test files novos em `src/`: `contexts/AuthProvider.test.tsx` (4 testes), `components/PlanProtectedRoute.test.tsx` (5), `hooks/useSubscription.test.ts` (4 incl. B-2 strict guard), `components/ErrorBoundary.test.tsx` (3 incl. I-1 `getByRole`). Adversarial integration: `src/hooks/travel/travel.adversarial.test.ts` (36 testes cobrindo 9 tabelas × 4 cenários). Edge function: `supabase/functions/google-calendar-auth/index.test.ts` (3 Deno tests). Total: 22 `.test.*` files em `src/` (verificado via `find`). CI integration job aplicou todas as 8 migrations + rodou 36 testes adversariais green pre-merge da PR #2 (UAT #5 + #8). |
| SEC-07-B | CI Secrets Disclosure | MEDIUM | mitigate | **CLOSED** | CI integration job em `.github/workflows/ci.yml` consome zero `${{ secrets.* }}` (verificado por grep no Plan 01 SUMMARY §Self-Check). Todas as chaves para test users vêm de `supabase status -o env` do stack local boot na própria job. Test users usam UUIDs sintéticos `00000000-0000-0000-0000-00000000000{1,2,3}` + emails `@test.invalid` (RFC 6761). |

**Total:** 13 CLOSED / 1 WARNING / 0 OPEN.

---

## 2. Production-state Verification (não derivado de grep)

| Verificação | Resultado | Fonte |
|-------------|-----------|-------|
| Legacy service-role key desabilitada em prod | 2026-05-12T21:47:41Z; curl com a antiga chave retorna 401 "Legacy API keys are disabled" | UAT SC #6 (`01-UAT.md`) |
| Nova `sb_publishable_yeLa...` operacional | Confirmado via Lovable | UAT SC #3 + #6 |
| Bundle live em milespro.lovable.app não contém `service_role` literal | curl + grep em `assets/index`, `vendor-supabase`, `vendor-ui` = 0 matches | UAT SC #3 |
| Edge function `google-calendar-auth` redeployada pós-OAUTH_STATE_SECRET cutover | health probe retorna 400 "Invalid action" (boot guard passou) | UAT SC #7 |
| Todas as 8 migrations Phase 1 aplicadas em prod | snapshot Lovable: `enum_range = {free,pro,vip}`, `travel_policies=40`, `vip_policies=4`, `legacy_survivors=0` | UAT SC #2 + #4 |
| Distribuição final user_subscriptions: 13 rows (3 free, 10 vip), zero legacy enum values | Lovable snapshot pós-migration 7 | UAT SC #4 |
| CI verde no merge da PR #2 (commit 17c9cfd antes do merge) | 3 checks SUCCESS: Lint/Typecheck/Build, Security audit, Adversarial RLS (Vitest+Supabase local) | UAT SC #8 |
| Migration 120008 self-check (anon NOT LIKE '%anon=X%') passou em CI | RAISE EXCEPTION não disparou | UAT SC #8 |

---

## 3. Production-state Regressions (BLOQUEADAS / NÃO-BLOQUEADAS)

### REG-1 — `vite.config.ts` JWT hardcoded fallback reintroduzido

**Categoria:** WARNING (não bloqueador para Phase 1; bloqueador para entrada em Phase 2).

**Histórico:**
- `4a4d069` (Plan 03, 2026-05-12 manhã): deleta `FALLBACK_SUPABASE_URL` + `FALLBACK_SUPABASE_PUBLISHABLE_KEY` + `FALLBACK_SUPABASE_PROJECT_ID`. Plano executado conforme escrito.
- `c8cac4e` + `a85a7dc` (Lovable Cloud bot, 2026-05-12T21:24Z): commit "Fixed missing env vars in build" REINTRODUZ os 3 fallbacks com o mesmo JWT anon legacy. Mensagem: "Lovable's publish CI may not inject VITE_* vars."

**Por que `vite.config.ts` linhas 71-74 ainda referenciam o JWT legacy:**
- A Lovable Cloud publish pipeline aparentemente não injeta `VITE_*` vars no momento do build SPA, somente no runtime do PostgREST. O fallback é como o app "boota" no Lovable apesar do guard.
- Como Lovable desabilitou a chave legacy em 2026-05-12T21:47:41Z (UAT SC #6), o JWT no fallback NÃO autentica. Qualquer build novo que cair no fallback receberá 401 do PostgREST. **Falha rápida ao invés de dado vazado.**

**Risco operacional:** nulo (chave morta).

**Risco arquitetural:** SEC-04 requisito original ("build deve falhar, não silenciosamente cair em fallback") é violado para `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e `VITE_SUPABASE_PROJECT_ID`. Para QUALQUER outra var `VITE_*` (incluindo as Phase 2 do Asaas) o guard continua firme — só estas 3 têm fallback.

**Ação recomendada para Phase 2 entry:**
1. Remover o JWT hardcoded mortinho (substituir por `''` ou `throw`) — está commitado em texto plano no repo.
2. Investigar com Lovable Cloud como injetar `VITE_*` vars no build do SPA (existem env var settings na dashboard que não estão sendo propagados).
3. Re-deletar os 3 fallbacks e re-ativar o `failOnSecretLeak()` strict mode para estas 3 vars.

**Por que não é BLOCKER aqui:** Phase 1 entregou o `failOnSecretLeak()` plugin funcionando, deletou `supabaseAdmin` do código, desabilitou a chave legacy em prod, e provou via curl que o bundle não contém service-role. As mitigações críticas (CRIT-02) estão CLOSED. Esta regressão afeta apenas a defesa contra "misconfigured deploy silenciosa" para 3 vars públicas.

---

## 4. Accepted Risks (formal)

| ID | Descrição | Aceito por | Racional |
|----|-----------|------------|----------|
| AR-1 | LOW-01: `src/components/ui/chart.tsx:70` usa `dangerouslySetInnerHTML` com `config.color` de props. CSS injection teoricamente possível se caller passar strings não-confiáveis. | Phase 1 — CONCERNS.md §Security/LOW | Sem `expression()` em browsers modernos; ataque de CSS-only tem impacto baixo (defacement); todos os callers atuais passam constantes hardcoded. Marca como `accept` até que um caller passe valor user-controlled. |
| AR-2 | REG-1: `vite.config.ts` linhas 71-74 — JWT anon legacy hardcoded como fallback. | Phase 1 → Phase 2 entry | Chave morta em prod (CRIT-02 close); Lovable Cloud limitation; recomendação de fix em Phase 2 entry. |
| AR-3 | Deno test wiring no CI ainda não foi adicionado (`denoland/setup-deno@v1` + `deno test`). Tests existem em `supabase/functions/google-calendar-auth/index.test.ts` mas só rodam manualmente. | Plan 06 §Deferred for user | 1-2 linhas YAML; depende da estratégia Deno-CI preferida pelo operator. Tests são executáveis localmente e provam HMAC roundtrip + tampered + TTL. |
| AR-4 | Adversarial coverage para `vip_*` é estrutural (Plan 05 self-check + 4 policies/table) — sem adversarial Vitest dedicado a `vip_entries`. | Phase 1 closeout | Apenas 1 tabela `vip_*` (`vip_entries`); padrão de policies idêntico a travel_*; risk surface coberto pela invariante "todo `has_plan('vip')` é chave única do trust kernel". Phase 2 TIER-04 adiciona mais tabelas `vip_*` + cobertura adversarial então. |

---

## 5. Unregistered Flags

Nenhum flag emitido por executores que não tenha mapeamento direto no threat register. SUMMARYs 01-01 a 01-06 §Threat Flags todos confirmam "No new threat surface introduced" ou listam apenas mitigações já cobertas (T-1-02, T-1-04, T-1-05 etc.).

---

## 6. Open Follow-ups para Phase 2 entry

Lista do que NÃO bloqueia Phase 1 mas DEVE ser tratado antes do Asaas integration começar:

1. **REG-1 fix** (vite.config.ts JWT hardcoded) — vide §3 acima. Remover o JWT mortinho do source.
2. **Deno test CI wiring** (AR-3) — adicionar `denoland/setup-deno@v1` + `deno test --allow-env --allow-net supabase/functions/google-calendar-auth/index.test.ts` ao `.github/workflows/ci.yml`.
3. **vip_* adversarial coverage** (AR-4) — pré-requisito antes de TIER-04 adicionar novas tabelas `vip_*`.
4. **`can_access_feature()` legacy function cleanup** — Plan 02 dropou e recriou as 5 dependentes; `can_access_feature` é o único que sobrevive sem uso. Marcar como `DEPRECATED` ou drop em Phase 2.
5. **`managed_accounts` UI + `create-managed-account` edge function** — Phase 2 TIER-04 owns; tabela + RLS já estão em prod.
6. **PostHog real integration** (CONCERNS.md MED-03) — mock atual produz zero eventos; analytics ROADMAP item para Phase 2.
7. **`pg_stat_statements` + Supabase advisor empirical index audit** — CONCERNS.md §Performance; deferred per CONTEXT §deferred-9.

---

## 7. Recomendações para Phase 2 Entry

**Phase 2 deve assumir:**
- Trust kernel sólido: `has_plan(uid, 'pro'|'vip')` é o ÚNICO chokepoint para gating server-side. Toda nova tabela `travel_*` ou `vip_*` em Phase 2 DEVE seguir o padrão snake_case `<table>_<action>` + `WITH CHECK (auth.uid() = user_id AND public.has_plan(auth.uid(), '<tier>'))` em INSERT/UPDATE/DELETE.
- Enum `subscription_plan` é canônico e congelado: `{free, pro, vip}`. Adicionar um 4º valor (ex. `'enterprise'` no futuro) requer migration de recreate-type idêntica à 120001.
- Service-role NUNCA aparece em `src/` (verificar regressão via grep CI step).
- `failOnSecretLeak()` plugin protege qualquer `VITE_*SERVICE_ROLE`, `VITE_*SECRET_KEY`, `VITE_*WEBHOOK_SECRET`, `VITE_*PRIVATE_KEY`. Phase 2 (Asaas) deve estender o regex array com `VITE_ASAAS_*SECRET` e `VITE_ASAAS_*WEBHOOK` (linha 22 do `vite.config.ts` já tem TODO comment).
- `OAUTH_STATE_SECRET` é o template de cutover de secrets dependentes: rotacionar via `supabase secrets set` sem precisar redeploy. Phase 2 Asaas webhook signing key deve seguir mesmo padrão.

**Phase 2 NÃO deve assumir:**
- Que `vite.config.ts` está livre de fallbacks (REG-1).
- Que existe FK em todas as user-owned tables — `user_subscriptions` ganhou FK em 120007, mas outras tabelas legacy podem não ter.
- Que Deno tests rodam em CI (AR-3).

---

## 8. Sign-off

- [x] Todas as ameaças CRIT/HIGH do threat register verificadas: 5/5
- [x] Todas as ameaças MED do threat register verificadas: 4/4
- [x] Todas as ameaças LOW do threat register verificadas: 3/3
- [x] CONCERNS.md §Security items mapeados (CRIT-01 = CRIT-01 here; CRIT-02 = CRIT-02 here; HIGH = HIGH-03 + HIGH-05; MEDIUM = MED-03; LOW = LOW-01 accepted)
- [x] SC #1-#5 do ROADMAP confirmados em prod via UAT 8/8 pass
- [x] Production-state regressions documentadas (REG-1) com aceitação formal (AR-2)
- [x] Open follow-ups listados para Phase 2 entry
- [x] Implementation files não foram modificados durante esta auditoria

**Disposition:** SECURED_WITH_WARNINGS. Phase 1 está apto a ser declarado complete. REG-1 / AR-2 não bloqueia mas DEVE ser priorizado em Phase 2 entry checklist.

---

*Audit performed: 2026-05-12*
*Phase: 01-security-foundation-hardening*
*Auditor: gsd-secure-phase (Claude Opus 4.7, 1M context)*
