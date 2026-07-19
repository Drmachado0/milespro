# MilesPro — Claude Code Project Guide

SaaS de gestão de milhas e pontos (Brasil). Stack: Supabase + React 18 + TypeScript + Vite + shadcn/ui + Capacitor (iOS+Android). Em ciclo "pronto pra escala": primeiros 10 pagantes recorrentes.

## Workflow ativo: GSD

Este projeto usa o framework Get Shit Done (GSD) em `.planning/`. Antes de fazer mudanças significativas, **leia**:

- `.planning/PROJECT.md` — visão, requirements ativos, key decisions
- `.planning/REQUIREMENTS.md` — 41 v1 requirements mapeados (SEC, PAY, TIER, TEL, COMPL, MOBILE, LAUNCH)
- `.planning/ROADMAP.md` — 3 phases, status atual em STATE.md
- `.planning/STATE.md` — phase atual, progresso, blockers
- `.planning/codebase/CONCERNS.md` — concerns identificados na auditoria inicial (a maioria mitigada por Phase 1 — ver §Concerns fechados abaixo)
- `.planning/research/SUMMARY.md` — síntese das decisões estratégicas (Asaas, iOS Path C, trust-kernel)

**Status do ciclo (atualizado 2026-05-16):**
- Phase 1 — Security & Foundation Hardening: **DONE 6/6** (deployed 2026-05-12: 44 RLS policies live, CRIT-01/02 fechados, trust kernel + has_plan + service-role removal + enum consolidation)
- Phase 2 — Monetização + Compliance + Telemetria: **5/7 done + 1 partial** (02-07 W3 cutover hard-blocked em CNPJ)
- Phase 3 — Mobile Distribution & Launch: **4/10 done + 1 scaffold-partial** (mobile plans 03-03/06/07/08 **defered by founder 2026-05-16** — web-first revenue strategy)
- Flag canônica em STATE.md: `technical_100_percent_done: true`

**Bloqueadores reais hoje (todos founder-action, não-código):**
1. CNPJ constitution (in progress com contador)
2. Founder roda `02-07-CUTOVER-RUNBOOK.md` após CNPJ + Asaas approval (~30min operacional)
3. Founder roda `02-07-NFSE-MUNICIPAL-SETUP.md` com contador (~1h)
4. Acquisition strategy primeiros 10 pagantes

**Antes de rodar qualquer `/gsd-plan-phase`, `/gsd-execute-phase` ou similar:** consultar `.planning/STATE.md` para o status real. O ROADMAP.md e o STATE.md são source-of-truth; este CLAUDE.md pode envelhecer.

## Comandos GSD frequentes

- `/gsd-plan-phase <n>` — criar plano detalhado pra phase
- `/gsd-execute-phase <n>` — executar plans da phase em paralelo
- `/gsd-verify-work <n>` — UAT conversacional pós-execução
- `/gsd-progress` — ver onde estamos
- `/gsd-discuss-phase <n>` — gather context + gray-area decisions antes de planejar

## Stack & Convenções

**Comandos básicos:**
- Dev server: `npm run dev`
- Build: `npm run build`
- Tests: `npm test` (vitest, 173 testes em `src/**/*.test.ts(x)`)
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Deno tests (edge functions): `npm run test:deno` — 3 falhas residuais conhecidas (`cleanup-push-subscriptions`, `create-checkout-session`, `send-push-notification` com panic em `signer.rs`) — débito técnico em PR separado

**Convenções (ver `.planning/codebase/CONVENTIONS.md`):**
- TypeScript estrito; sem `any` exceto em boundaries documentados
- Components em PascalCase, hooks em camelCase com prefixo `use`
- Path alias `@/` aponta pra `src/`
- shadcn/ui pra componentes base; Tailwind pra estilo
- react-query pra server state; useState/context pra local
- `logger.*` (não `console.*` — recente migração)
- Sonner para toasts

**Estrutura (ver `.planning/codebase/STRUCTURE.md`):**
- `src/components/` — componentes React (~182 hoje)
- `src/pages/` — páginas (~57 hoje)
- `src/hooks/` — custom hooks
- `src/lib/` — utilitários puros
- `src/integrations/supabase/` — client e tipos
- `supabase/migrations/` — migrations SQL
- `supabase/functions/` — edge functions Deno

## Decisões travadas (não questionar sem reabrir discussão)

- **Stack:** Supabase + React + shadcn + Capacitor (NÃO trocar)
- **Gateway:** Asaas (NÃO Stripe BR, NÃO MercadoPago)
- **iOS:** Path C — sem IAP, sem UI de pricing dentro do app (Multiplatform Services exemption)
- **Trial:** 7 dias Pro com cartão on file
- **Entidade:** PJ obrigatória pra Phase 2 (CNPJ pra Asaas)
- **Modelo:** Free + Pro + VIP (3 tiers)
- **Multi-CPF:** exclusivo VIP no v1

## Concerns fechados pela Phase 1 (deployed 2026-05-12)

Para histórico — todos os 7 concerns originais do `codebase/CONCERNS.md` foram mitigados:

1. ~~Plan gating client-side em `travel_*` / `vip_*`~~ — **fechado** por migrations `20260512120005` (travel) + `20260512120006` (vip) + `20260515120001` (tier free limits) com `has_plan()` no WITH CHECK
2. ~~`VITE_SUPABASE_SERVICE_ROLE_KEY` no client~~ — **fechado** (removido + service-role rotation pendente em runbook)
3. ~~JWT anon hardcoded em `vite.config.ts`~~ — **fechado** (env-based agora)
4. ~~Enum `subscription_plan` 5 vs 3~~ — **fechado** por migration `20260512120001_consolidate_subscription_plan_enum`
5. ~~0% test coverage em paths críticos~~ — **substancialmente fechado** (137 unit tests + adversarial RLS suites travel/vip/push)
6. ~~PostHog mock~~ — **fechado** (Plan 02-03 wired real PostHog consent-gated + Sentry PII-scrubbed)
7. 3 lockfiles commitados — **aceito como débito BAIXO** (CI usa só npm)

**Adicional fechado nesta sessão (2026-05-16, walkthrough UX):**
- 3 P0 (logger imports + transferencia bug na CompraCarrinho) — commit `1590c42`
- 3 P1 (Bumerangue split, custo zero warning, "Basic"→"Pro") — commit `a535167`
- 2 P2 (parser de notes, lucro fantasma) — commit `6d0cea5`
- 1 P2 DB enforcement (TIER-02 — Free 20-ops/mês via RLS) — commit `9bfe180`

## Idioma de comunicação

**Sempre responder em português-BR** ao usuário. Mensagens de commit, código, comentários e identificadores permanecem em inglês.

## Backups disponíveis

- Tags remotas: `backup/v2-cursor-final`, `backup/clawdete-review-final` (snapshots de branches obsoletas removidas em 2026-05-11)
- Bundle local: `C:\Users\Machado\Milespro\miles-pro-hub-backup-2026-05-11.bundle` (15.4 MB, todo o repo)

---
*Generated: 2026-05-11 by `/gsd-new-project`. Realinhado 2026-05-16 — status do ciclo, concerns fechados, próximos bloqueadores.*

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes_tool` or `query_graph_tool` instead of Grep
- **Understanding impact**: `get_impact_radius_tool` instead of manually tracing imports
- **Code review**: `detect_changes_tool` + `get_review_context_tool` instead of reading entire files
- **Finding relationships**: `query_graph_tool` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview_tool` + `list_communities_tool`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes_tool` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context_tool` | Need source snippets for review — token-efficient |
| `get_impact_radius_tool` | Understanding blast radius of a change |
| `get_affected_flows_tool` | Finding which execution paths are impacted |
| `query_graph_tool` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes_tool` | Finding functions/classes by name or keyword |
| `get_architecture_overview_tool` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes_tool` for code review.
3. Use `get_affected_flows_tool` to understand impact.
4. Use `query_graph_tool` pattern="tests_for" to check coverage.
