---
status: complete
phase: 01-security-foundation-hardening
source:
  - 01-01-SUMMARY.md
  - 01-02-SUMMARY.md
  - 01-03-SUMMARY.md
  - 01-04-SUMMARY.md
  - 01-05-SUMMARY.md
  - 01-06-SUMMARY.md
started: 2026-05-12T22:30:00Z
updated: 2026-05-12T22:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. SC #1 — Trust kernel functions deployed and ACL-locked
expected: |
  has_plan() e can_access_account() existem em prod como SECURITY DEFINER
  com search_path locked; anon role NÃO tem EXECUTE (já provado via
  pg_proc.proacl snapshot durante deploy).
result: pass

### 2. SC #2 — RLS rewrite ativa: 44 policies trust-kernel-wrapped
expected: |
  Em prod, há 40 policies em travel_* (10 tabelas × 4 ações
  _select/_insert/_update/_delete) + 4 policies em vip_entries, todas
  wrapped em has_plan('pro') ou has_plan('vip') no WITH CHECK de
  INSERT/UPDATE/DELETE. Zero policies legacy sobreviventes (já
  validado no snapshot Lovable: travel_policies=40, vip_policies=4,
  legacy_survivors=0).

  Validação adicional: tentativa adversarial real contra prod com
  JWT de user FREE deve retornar 42501. Isto é mais difícil de
  testar sem JWT real (requer login). CI já cobre via Vitest +
  Supabase local com 36 testes (todos pass).

  Status esperado: PASS (CI 36/36 + snapshot estrutural)
result: pass

### 3. SC #3 — Bundle de produção é secret-free
expected: |
  Bundle live em https://milespro.lovable.app não contém referência
  textual à JWT antiga (eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...) nem
  à nova publishable (sb_publishable_yeLa...) embarcadas nos chunks
  carregados imediatamente. Service-role nunca esteve no bundle
  desde merge da PR #1 (CRIT-02 fix). Bundle adicionalmente protegido
  pelo failOnSecretLeak() plugin que aborta build se VITE_*SERVICE_ROLE
  vazar.

  Validação local: curl + grep em assets/index, vendor-supabase,
  vendor-ui retornaram 0 matches pra service_role e pras 2 keys.
  Chaves embedded estão em chunks lazy-loaded (esperado em SPA Vite).

  Status esperado: PASS (já validado via curl direto)
result: pass

### 4. SC #4 — Enum subscription_plan canônico em prod
expected: |
  enum_range(NULL::public.subscription_plan) em prod retorna
  exatamente {free, pro, vip}. Zero rows em user_subscriptions com
  valores legacy (agency/pro_familia/basic). TypeScript
  SubscriptionPlan type está alinhado em código (validado por
  npm run typecheck no CI).

  Já validado: Lovable confirmou enum_range = {free,pro,vip} após
  Migration 1. user_subscriptions distribution após Migration 7:
  free=3, vip=10 (total 13, zero rows com plan legacy).

  Status esperado: PASS
result: pass

### 5. SC #5 — Critical-path test coverage existe + CI passa
expected: |
  Arquivos de teste para os componentes/hooks security-sensitive
  existem em src/ — listáveis via:
  - src/contexts/AuthProvider.test.tsx (184L)
  - src/components/PlanProtectedRoute.test.tsx (141L)
  - src/hooks/useSubscription.test.ts (131L)
  - src/components/ErrorBoundary.test.tsx (107L)
  - src/hooks/travel/travel.adversarial.test.ts (247L, 36 testes integration)
  - supabase/functions/google-calendar-auth/index.test.ts (88L, Deno)

  CI integration job na PR #2 (último run pre-merge) rodou
  `supabase db reset --no-seed` aplicando todas as 72 migrations
  + Adversarial RLS Vitest com 36 testes — todos passaram.

  Total no repo: 109 unit tests (+16 novos da Phase 1) + 36
  adversarial integration tests.

  Verificação fs: 22 .test.* files em src/.
  Status esperado: PASS
result: pass

### 6. CRIT-02 mitigação completa em infra (legacy keys disabled)
expected: |
  Além do fix em código (supabaseAdmin export deletado, JWT hardcoded
  removido do vite.config.ts, failOnSecretLeak() plugin ativo), a
  service-role legacy do projeto foi DESABILITADA em
  2026-05-12T21:47:41Z (confirmado via curl com a JWT antiga, que
  agora retorna 401 "Legacy API keys are disabled"). Nova publishable
  key sb_publishable_yeLa... opera normalmente.

  Status esperado: PASS (rotação atômica das keys, confirmada)
result: pass

### 7. SEC-04 — OAUTH_STATE_SECRET cutover deployed
expected: |
  Em prod, edge function google-calendar-auth aceitou o secret
  OAUTH_STATE_SECRET (gerado openssl rand -hex 32, 64 chars hex) e
  redeployou sem o erro de boot "OAUTH_STATE_SECRET environment
  variable is required". Health probe via GET /google-calendar-auth/health
  retorna 400 "Invalid action" (boot guard passou, função roteou,
  validou action e rejeitou — sinal positivo de função viva pós-cutover).

  Plan 03 dual-read (env first, fallback service-role) → Plan 06
  kill-switch (strict env-only) completo.

  Status esperado: PASS (deploy confirmado por Lovable 21:12 UTC)
result: pass

### 8. CI verde no merge da PR #2 (followup migration cleanup)
expected: |
  GitHub Actions na PR #2 (commit final 17c9cfd antes do merge)
  rodou 3 checks contra a versão final do código + Phase 1
  migration 120008 (REVOKE anon backfill):
  - Lint, Typecheck & Build: SUCCESS
  - Security audit: SUCCESS
  - Adversarial RLS (Vitest + Supabase local): SUCCESS

  Self-check inline da migration 120008 (RAISE EXCEPTION se anon
  ainda tem EXECUTE) passou — confirma estado de ACL esperado.

  Status esperado: PASS (merge commit 4792749 baseado em verde)
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
