# W3 Production Cutover Runbook — Phase 2 Plan 02-07

Owner: founder (operator workstream). Claude assists with curl composition + log triage; the actual button-clicks happen in the operator's browser. CNPJ-blocked — do NOT begin until Asaas production account is approved.

> Cross-refs: `02-05-PLAN.md` (W2a Asaas scaffold), `02-05-CRIT-04-SMOKE-RUNBOOK.md` (sandbox proof of idempotency), `02-07-NFSE-MUNICIPAL-SETUP.md` (PAY-08 prerequisite), Lovable Cloud project `opusftqbbaozucmbuuug`.

---

## 0. Pre-flight checklist (do not skip)

- [ ] CNPJ ativo, contrato social PDF em mãos
- [ ] Asaas production account approved (email "Bem-vindo ao Asaas" recebido)
- [ ] Production `ASAAS_API_KEY` capturada e armazenada em password manager (NUNCA cole em git nem em logs)
- [ ] Production `ASAAS_WEBHOOK_TOKEN` gerado via `openssl rand -hex 32` e armazenado
- [ ] Asaas Dashboard → Configurações → Webhooks → "Adicionar webhook" preenchido (URL, token, 11 eventos) — passos detalhados em §3
- [ ] Conta bancária PJ vinculada no Asaas (para repasse das cobranças)
- [ ] Sandbox flow testado end-to-end nos últimos 7 dias (regressão guard)
- [ ] Reconcile cron Sandbox tem retornado `drift_count = 0` consistentemente nos últimos 3 runs
- [ ] AR-4 adversarial test verde no `main` (`npm test -- --project=integration --run src/hooks/vip/vip.adversarial.test.ts`)
- [ ] CPF do founder cadastrado em `profiles.cpf` (para os smokes do §5)

Production state pre-cutover (snapshot 2026-05-16):

| Item | Valor |
|------|-------|
| Supabase project | `opusftqbbaozucmbuuug` |
| Edge functions ativas (W2a/W2b/W3) | `create-checkout-session`, `asaas-webhook`, `reconcile-asaas-subscriptions`, `compute-personalized-promos`, `create-managed-account`, ... (13 total) |
| Cron jobs ativos | 5 incluindo `asaas-reconcile-nightly` (jobid=5) |
| Migrations Phase 2 | aplicadas (incluindo `webhook_events`, `profiles.asaas_customer_id + cpf unique`, `managed_accounts`, `user_promo_alerts`) |
| `ASAAS_ENV` atual | `sandbox` (a ser flipado para `production` no §2) |
| Webhook URL | `https://opusftqbbaozucmbuuug.supabase.co/functions/v1/asaas-webhook` |

---

## 1. Schema sanity (run before any flip)

Cole no SQL editor de produção e confirme cada uma — se qualquer linha falhar, PAUSE e abra ticket:

```sql
-- user_subscriptions deve ter as colunas Asaas
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='user_subscriptions'
  AND column_name IN ('asaas_customer_id','asaas_subscription_id','status','plan','is_active','last_paid_at','expires_at','grace_period_ends_at');
-- expected: 8 rows

-- profiles deve ter asaas_customer_id e cpf unique
SELECT indexname FROM pg_indexes
WHERE schemaname='public' AND tablename='profiles'
  AND indexdef ILIKE '%cpf%';
-- expected: 1 row (unique index on cpf)

-- webhook_events table existe (idempotency store da W2a)
SELECT count(*) FROM public.webhook_events LIMIT 1;
-- expected: 0 ou mais (não 42P01)
```

---

## 2. Set production secrets (Lovable Cloud chat)

Abra o chat do Lovable Cloud e cole:

```
Set edge function secrets:
- ASAAS_API_KEY=<production key, sem aspas>
- ASAAS_WEBHOOK_TOKEN=<64-char hex gerado por openssl rand -hex 32>
- ASAAS_ENV=production
```

Smoke imediato após gravação (lesson aprendida em 03-04b D-DEPLOY-2 PUSH_CLEANUP 401 — secret colada errada não falha silenciosa; falha cara depois). Antes de prosseguir para §3, dispare uma chamada NO-OP contra cada secret para detectar pasta incorreta ainda barata:

```bash
# Smoke A: ASAAS_API_KEY consegue conversar com api.asaas.com (200 esperado)
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://api.asaas.com/v3/myAccount" \
  -H "access_token: $ASAAS_API_KEY"
# Esperado: 200
# Se 401: secret colada errada — refaça §2. Se 000: rede / firewall.

# Smoke B: create-checkout-session 503 se ASAAS_API_KEY unset (deve responder
# 401 sem o token Authorization, NÃO 503 — confirma que a edge fn enxerga o secret)
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST "https://opusftqbbaozucmbuuug.supabase.co/functions/v1/create-checkout-session" \
  -H "Content-Type: application/json" -d '{}'
# Esperado: 401 (Unauthorized — token JWT ausente).
# Se 503 com "ASAAS_API_KEY unset": o secret não está visível para a edge fn — refaça §2.
```

Confirme via Lovable: `Show edge function secrets list — confirm ASAAS_API_KEY, ASAAS_WEBHOOK_TOKEN, ASAAS_ENV exist and ASAAS_ENV='production'`.

---

## 3. Asaas Dashboard webhook config (production)

> Esse passo é UI-only no Asaas. Não há automação possível.

3.1. Login em https://www.asaas.com → Configurações → Webhooks → "Adicionar webhook".

3.2. URL: `https://opusftqbbaozucmbuuug.supabase.co/functions/v1/asaas-webhook`

3.3. Header customizado / Token: cole o **mesmo** `ASAAS_WEBHOOK_TOKEN` configurado em §2. Asaas envia esse valor no header `asaas-access-token` — a edge fn faz constant-time compare e responde 401 em mismatch.

3.4. Eventos a marcar (11 eventos — todos exigidos pelo `must_haves.truths`):

- `PAYMENT_CONFIRMED`
- `PAYMENT_RECEIVED`
- `PAYMENT_OVERDUE`
- `PAYMENT_REFUNDED`
- `PAYMENT_PARTIALLY_REFUNDED`
- `PAYMENT_CHARGEBACK_REQUESTED`
- `PAYMENT_CHARGEBACK_DISPUTE`
- `PAYMENT_AWAITING_CHARGEBACK_REVERSAL`
- `SUBSCRIPTION_DELETED`
- `SUBSCRIPTION_INACTIVATED`
- `PAYMENT_CREATED`

3.5. Salve. Asaas envia um "ping" automático — verifique em §4 que ele chegou (linha em `webhook_events`).

---

## 4. Re-verify Gate G-CRIT-04 against PRODUCTION

Mesma curl da sandbox runbook (`02-05-CRIT-04-SMOKE-RUNBOOK.md`), agora com o **production webhook token**. Confirma três coisas de uma vez: (a) token está correto no Asaas Dashboard, (b) handler funciona idempotente em prod, (c) não pegou bug específico de env.

```bash
EVENT_ID="evt_prod_smoke_$(date +%s)"
PAYLOAD='{"id":"'$EVENT_ID'","event":"PAYMENT_RECEIVED","payment":{"subscription":"sub_smoke_prod","value":1.00,"paymentDate":"'$(date -u +%Y-%m-%d)'"}}'

# Primeiro fire
curl -i -X POST https://opusftqbbaozucmbuuug.supabase.co/functions/v1/asaas-webhook \
  -H "asaas-access-token: $ASAAS_WEBHOOK_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"
# Esperado: HTTP 200 + body "OK"

# Segundo fire — MESMO event_id
curl -i -X POST https://opusftqbbaozucmbuuug.supabase.co/functions/v1/asaas-webhook \
  -H "asaas-access-token: $ASAAS_WEBHOOK_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"
# Esperado: HTTP 200 + body inclui "duplicate ignored"
```

SQL de confirmação (cole em produção):

```sql
SELECT event_id, event_type, status, processed_at, retries
FROM public.webhook_events
WHERE event_id = '<o EVENT_ID acima>'
ORDER BY created_at DESC;
-- Esperado: 1 linha (NÃO 2). A segunda chamada foi ignorada por ON CONFLICT.
```

Token errado? A primeira chamada já retorna 401 — refaça §3.3.

---

## 5. Founder payment smoke (real money — R$ 37,90)

> Esse é o teste end-to-end definitivo. Use o CPF do founder; o pagamento volta inteiro no §7 (estorno).

5.1. Login em https://app.milespro.net.br como founder.

5.2. Navegue para `/assinatura` → clique em "Assinar Pro Mensal".

5.3. O navegador redireciona para o Asaas hosted checkout (URL `pay.asaas.com/...`). Esse redirect é a resposta do `create-checkout-session` em §2.

5.4. Complete o pagamento via Pix (Pix tem confirmação em < 4h; cartão confirma em segundos). Valor: R$ 37,90 (Pro mensal — PRICE_TABLE em `create-checkout-session/index.ts`).

5.5. Em até 60 segundos, o `PAYMENT_CONFIRMED` webhook dispara. Watch logs em Lovable Cloud chat: `Show logs for asaas-webhook last 5 minutes`.

5.6. SQL de verificação:

```sql
SELECT id, status, plan, is_active, asaas_subscription_id, last_paid_at, billing_period, price
FROM public.user_subscriptions
WHERE user_id = '<FOUNDER_UUID>'
ORDER BY created_at DESC LIMIT 1;
-- Esperado: status='active', plan='pro', is_active=true, last_paid_at populated,
-- billing_period='monthly', price=37.90.
```

```sql
SELECT event_id, event_type, status, processed_at
FROM public.webhook_events
WHERE event_type LIKE 'PAYMENT_%'
ORDER BY created_at DESC LIMIT 10;
-- Esperado: ver PAYMENT_CREATED, PAYMENT_CONFIRMED, PAYMENT_RECEIVED com status='processed'.
```

5.7. Asaas Dashboard → Cobranças — visualize a cobrança de R$ 37,90 como "Recebida".

5.8. UI sanity: log out + log back in. Em `/assinatura` deve aparecer o painel "Você já tem uma assinatura ativa" com o botão "Gerenciar assinatura" (PAY-05 de Task 4 deste plano).

---

## 6. NFS-e verification (PAY-08)

> Pré-requisito: §02-07-NFSE-MUNICIPAL-SETUP.md já executado para o customer do founder. Sem isso, Asaas rejeita o `invoice: { enabled: true }` no create — o `create-checkout-session` então loga warning e segue (não bloqueia o checkout).

6.1. Aguarde **15 minutos** após o `PAYMENT_RECEIVED` do §5.

6.2. Asaas Dashboard → Notas Fiscais — visualize a NFS-e emitida automaticamente para o founder.

6.3. Download do PDF. Verifique:
- Tomador (founder, CPF/CNPJ correto, endereço correto)
- Prestador (founder PJ, CNPJ, endereço)
- Discriminação do serviço (texto da `municipalServiceName`)
- Código municipal de serviço (CMC) — conferir com contador
- Valor R$ 37,90, alíquota ISS conforme município, base de cálculo
- Número de NFS-e e código de verificação

6.4. SQL — confirma webhook `INVOICE_AUTHORIZED` (nome do evento conforme RESEARCH §2.7 [ASSUMED] — capturar nome real após primeiro disparo e atualizar este runbook):

```sql
SELECT event_type, status, processed_at
FROM public.webhook_events
WHERE event_type ILIKE '%INVOICE%' OR event_type ILIKE '%NF%'
ORDER BY created_at DESC LIMIT 5;
```

6.5. Se `INVOICE_ERROR` ao invés de autorização: pause o cutover, abra ticket Asaas + acionar contador. Não é bloqueante imediato (checkout segue) mas é tax compliance debt.

---

## 7. Refund roundtrip (verifica cancellation flow)

> Estorne o pagamento do §5 — devolve os R$ 37,90 ao founder e prova que `PAYMENT_REFUNDED` desativa a assinatura.

7.1. Asaas Dashboard → Cobranças → clique na cobrança de R$ 37,90 do founder → botão "Estornar" → confirme.

7.2. Aguarde até 60 segundos. `PAYMENT_REFUNDED` webhook dispara.

7.3. SQL:

```sql
SELECT status, plan, is_active, expires_at
FROM public.user_subscriptions
WHERE user_id = '<FOUNDER_UUID>'
ORDER BY created_at DESC LIMIT 1;
-- Esperado: status='canceled', is_active=false. (plan pode permanecer 'pro' ou
-- voltar para 'free' dependendo do handler — confirme com `asaas-webhook/index.ts`.)
```

7.4. UI: `/assinatura` não exibe mais o painel "Gerenciar assinatura". O painel CurrentPlanCard mostra "Plano Gratuito" ou similar.

---

## 8. Reconcile cron — manual trigger

```bash
curl -i -X POST https://opusftqbbaozucmbuuug.supabase.co/functions/v1/reconcile-asaas-subscriptions \
  -H "Authorization: Bearer $ASAAS_RECONCILE_AUTH_TOKEN"
# Esperado: HTTP 200, JSON com drift_count = 0 (ou 1 contando o estorno do §7).
```

Se `drift_count > 1`, há divergência entre DB e Asaas — investigar via `webhook_events` (algum status='failed'?) e Asaas Dashboard (alguma cobrança não refletiu).

---

## 9. Admin metrics dashboard

9.1. Login como founder em https://app.milespro.net.br/admin/metrics (requer `profiles.is_admin = true`).

9.2. Verifique:
- `mrr_total` ≈ R$ 0,00 (cobrança do §5 já estornada; nenhuma outra assinatura ativa ainda)
- `asaas_env` = `production`
- "Last sync" do reconcile mostra timestamp recente

---

## 10. Final hardening

- [ ] Confirme `Show edge function secrets list` em Lovable — `ASAAS_ENV='production'`, `ASAAS_API_KEY` presente, `ASAAS_WEBHOOK_TOKEN` presente.
- [ ] Asaas Dashboard → Webhooks → indicator verde (sem falhas nas últimas 24h).
- [ ] Adicione Asaas Dashboard, Lovable Cloud e Supabase Studio aos bookmarks do founder.
- [ ] Adicione note no PROJECT.md de que o cutover ocorreu em `YYYY-MM-DD HH:MM`.
- [ ] Rode AR-4 adversarial test contra o estado pós-cutover: `npm test -- --project=integration --run src/hooks/vip/vip.adversarial.test.ts`.

---

## Rollback

Se algo der errado pós-cutover (relatos de usuário, taxa de webhook falhada > 5%, double-charge, qualquer coisa weird):

**Rollback nível 1 — env flip (segundos):**
1. Lovable Cloud chat: `Set edge function secret ASAAS_ENV=sandbox`.
2. Imediatamente novos checkouts vão para o sandbox; assinaturas já criadas em produção continuam sendo processadas pela Asaas (Asaas é o source of truth — não dá pra "desligar"). Mas novos clicks param de gerar charges reais.

**Rollback nível 2 — estorno manual:**
3. Para cada cobrança que entrou entre o cutover e o rollback: Asaas Dashboard → Cobranças → filtre por data → "Estornar" em cada uma.
4. Os webhooks `PAYMENT_REFUNDED` correspondentes vão desativar as `user_subscriptions` automaticamente (testado em §7 deste runbook).

**Rollback nível 3 — investigação:**
5. Sentry: filtre por `service=asaas-webhook` ou `service=create-checkout-session` no janelinha de tempo afetada.
6. SQL: `SELECT event_type, status, error_message FROM webhook_events WHERE created_at > 'YYYY-MM-DD' AND status != 'processed' ORDER BY created_at DESC;`
7. Asaas Dashboard → Webhooks → "Tentativas" — veja erros HTTP de envio.

**Re-cutover:**
8. Após fix + post-mortem, execute esse runbook de novo do §2.

> Estado do DB não é mexido pelo rollback. Subscriptions criadas durante a janela podem ficar com status inconsistente — o reconcile cron eventualmente converge (run manual via §8 acelera).

---

## Pós-cutover — monitoring 72h

Checklist diário pelo founder (manhã + noite):

- [ ] Sentry: zero CRITICAL/HIGH em `asaas-webhook` ou `create-checkout-session`
- [ ] `webhook_events`: < 5% status='failed' nas últimas 24h
- [ ] Asaas Dashboard → Cobranças: sem chargebacks abertos
- [ ] Asaas Dashboard → Notas Fiscais: sem INVOICE_ERROR pendente
- [ ] Resend Dashboard: sem spike de bounce em emails de confirmação
- [ ] PostHog funnel: signup → first_balance_added → started_checkout → paid_first_invoice fluindo
- [ ] `/admin/metrics`: MRR refletindo cobranças reais
- [ ] Reconcile cron noturno: `drift_count` baixo nos logs do Lovable Cloud

Trigger automático para escalation: webhook fail rate > 5% em 1h → revisar logs imediatamente.

---

## Apêndice A — As 6 (plan × cycle) tuples explicit

Asaas não tem "produtos" como Stripe. Cada Subscription create envia `value + cycle`. As 6 combinações ficam hard-coded em `create-checkout-session/index.ts → PRICE_TABLE`:

| Plan | Cycle | Asaas cycle | Value (R$) |
|------|-------|-------------|------------|
| pro  | monthly    | MONTHLY       | 37.90  |
| pro  | semiannual | SEMIANNUALLY  | 203.46 |
| pro  | annual     | YEARLY        | 363.84 |
| vip  | monthly    | MONTHLY       | 67.90  |
| vip  | semiannual | SEMIANNUALLY  | 365.10 |
| vip  | annual     | YEARLY        | 652.32 |

Mudanças em preço/ciclo → editar `PRICE_TABLE` + redeploy. Nenhum trabalho no Asaas Dashboard.

---

## Apêndice B — Secret names canônicos (production)

Cole exatamente esses nomes em Lovable Cloud secrets — não invente novos:

| Secret | Valor | Escopo |
|--------|-------|--------|
| `ASAAS_API_KEY`             | token production do Asaas (`$aact_prod_*`) | edge functions |
| `ASAAS_WEBHOOK_TOKEN`       | hex 64 chars (`openssl rand -hex 32`)        | edge functions |
| `ASAAS_ENV`                 | `production`                                  | edge functions |
| `ASAAS_RECONCILE_AUTH_TOKEN`| pre-existente (Plan 02-05); mesmo valor      | edge functions + cron |
| `ASAAS_INVOICE_ENABLED`     | unset (default ON); set `false` para kill   | edge functions |

Não criar duplicatas. Não rotacionar sandbox secret junto — sandbox continua útil para regressão.
