# Phase 1: Security & Foundation Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 01-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-11
**Phase:** 01-security-foundation-hardening
**Areas discussed:** Enum mapping (5→3), Migration cadence, RLS isolation behavior, Test strategy, Service-role rotation

---

## Enum Consolidation (5→3)

### Q1: Mapping strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Mapeamento semântico | `agency`→`vip`, `pro_familia`→`vip`, `basic`→`pro`. Honra intent histórico. Backfill via UPDATE. | ✓ |
| Tudo pra free + repromove manualmente | Sem pagantes, zero custo, repromove via SQL depois | |
| Auditoria primeiro | Pre-migration count antes de decidir | |

**User's choice:** Mapeamento semântico
**Notes:** Pre-flight check (`SELECT plan, COUNT(*) GROUP BY plan`) ainda vai entrar no PR como documentação no commit message do backfill — é boa prática mesmo confirmando o mapping.

### Q2: TypeScript refactor scope

| Option | Description | Selected |
|--------|-------------|----------|
| Big bang em 1 PR | Migration DB + delete collapse + grep-replace `'plus'`→`'pro'` + atualiza UpgradeBanner/Prompt/Assinatura | ✓ |
| Faseado: DB primeiro, TS limpa depois | Collapse temporariamente mapeia `vip`→`pro`, refactor em PR seguinte | |
| Dual-read durante 1 deploy | TS aceita ambos enums por janela curta | |

**User's choice:** Big bang em 1 PR
**Notes:** Justificativa: solo dev sem pagantes = zero risco de runtime overlap.

---

## Migration Cadence

### Q1: PR grouping

| Option | Description | Selected |
|--------|-------------|----------|
| 1 PR único | Todas migrations + secret cleanup + Vite plugin + TS refactor + testes | ✓ |
| 2 PRs: foundation + RLS rewrite | PR1 enum/trust kernel/secrets, PR2 RLS policies | |
| 3 PRs: foundation, RLS travel/vip, multi-CPF + testes | Mais granular | |
| Você decide — plan-phase pode quebrar em plans | Deixa o planner organizar | |

**User's choice:** 1 PR único
**Notes:** Rollback é `git revert` + `supabase migration repair`. Single deploy fica viável porque não tem usuário ativo.

### Q2: Pre-deploy testing

| Option | Description | Selected |
|--------|-------------|----------|
| Supabase local + dump da prod | dump → restore local → migrate → test → push pra prod | ✓ |
| Supabase Branching (preview branch) | Preview branch via dashboard, $0,01344/hr | |
| Direto em prod com janela manutenção | Sem usuários, aplica direto, revert se quebrar | |
| CI roda migration contra Supabase efêmero | GitHub Action com supabase start + tests | |

**User's choice:** Supabase local + dump da prod
**Notes:** CI step com `supabase start` ainda entra (faz parte do D-07 — adversarial Vitest precisa disso); só não vira o gate principal do migration test.

---

## RLS Isolation Behavior

### Q1: Soft vs hard per table family

| Option | Description | Selected |
|--------|-------------|----------|
| Soft em tudo | Travel + VIP + managed_accounts mantêm SELECT após downgrade | ✓ |
| Hard em vip_* + managed_accounts | Downgrade VIP esconde lounge_visits + managed list | |
| Soft em vip_*, hard em managed_accounts | Meio-termo | |

**User's choice:** Soft em tudo
**Notes:** Adicionado pelo Claude (não foi pergunta direta, é implicação): revoke explícito de managed_account é hard via `revoked_at IS NULL` em `can_access_account()`. Diferente de downgrade.

---

## Test Strategy (SEC-07)

### Q1: Test layer for adversarial RLS

| Option | Description | Selected |
|--------|-------------|----------|
| Vitest contra Supabase local | CI levanta supabase start, 3 users com JWT real, Vitest dispara inserts | ✓ |
| Bash/curl + pgTAP | Bash curl + pgTAP para policies; mais close ao curl literal do Success Criterion #1 | |
| Vitest + 1 bash script CI-only | Vitest pra hooks, bash dedicado pra adversarial | |

**User's choice:** Vitest contra Supabase local
**Notes:** Equivalência: Vitest+supabase-js dispara HTTP exatamente como curl faria; aderência ao Success Criterion #1 mantida.

### Q2: Travel hooks coverage scope

| Option | Description | Selected |
|--------|-------------|----------|
| Table-driven: 1 arquivo loopa nos 14 | `describe.each(cases)` cobre os 14 com mesmo set de asserts | ✓ |
| 1 arquivo por hook | 14 arquivos, padrão clássico | |
| Só RLS direto + 1 hook representativo | Confia que se RLS bloqueia, todos hooks falham igual | |

**User's choice:** Table-driven
**Notes:** Adicionar novo travel hook = +1 entrada no array. Manutenção mínima.

---

## Service-Role Rotation

### Q1: Rotation timing

| Option | Description | Selected |
|--------|-------------|----------|
| Depois do deploy do código limpo | Deploy → CI verde → rotate → update edge secrets → re-deploy → smoke | ✓ |
| Antes do deploy do código | Rotate primeiro, deploy depois (risco: cache do bundle antigo) | |
| Em paralelo — separe em 2 PRs | PR1 code, PR2 ops | |

**User's choice:** Depois do deploy do código limpo
**Notes:** Sequência de 6 passos detalhada em D-09 do CONTEXT.md.

### Q2: OAUTH_STATE_SECRET separation

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, separa nesta phase | Adiciona OAUTH_STATE_SECRET, atualiza google-calendar-auth | ✓ |
| Defere pra Phase 2 | Documenta como tech-debt | |
| Defere pra Phase 3 (mobile) | Junta com OAuth callbacks mobile | |

**User's choice:** Sim, separa nesta phase
**Notes:** Resolve o MEDIUM finding em CONCERNS.md de uma vez. Janela de quebra: zero (sem usuários ativos com OAuth in-flight).

---

## Claude's Discretion

Áreas onde o usuário deferiu pro planner:
- Granularidade interna dos plans (4 vs 6 plans dentro do single PR)
- Regex exato do `failOnSecretLeak()` (mínimo definido em research; expansão pra `_TOKEN`/`STRIPE_*`/`ASAAS_*` é judgment do planner)
- Escopo de cleanup hygiene LOW concerns
- Naming convention das policies RLS (snake_case do research vs outra)
- Ordem dos commits dentro do PR
- Layout exato do CI workflow YAML

## Deferred Ideas

(Surgiram no fluxo da discussão, registrados pra phases seguintes ou backlog):
- Cleanup hygiene LOW concerns (planner decide se inclui ou defere)
- pgTAP descartado
- Bash curl smoke test descartado em favor do Vitest equivalente (pode voltar em Phase 3)
- `webhook_events` table (Phase 2)
- `managed_accounts` UI (Phase 2)
- `can_access_feature()` legacy cleanup (Phase 2 ou 3)
- Rotação periódica programática do service-role (não-v1)
- Auditoria empírica de indexes (Phase 2+ se surgir necessidade)
