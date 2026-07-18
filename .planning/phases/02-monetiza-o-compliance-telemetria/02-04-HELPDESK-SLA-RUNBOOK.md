# Helpdesk SLA Runbook — Phase 2 W1c (LAUNCH-05 / D-13 / D-19 / D-23)

**Last updated:** 2026-05-13 (Plan 02-04 execution)
**Owner:** Founder (julianosmachado@gmail.com) + 1 backup agent (TBD)
**Status:** Awaiting Crisp account creation + Website ID

---

## Channels

| Channel | Purpose | Activation status |
|---------|---------|-------------------|
| **Crisp live-chat** (primary) | Embedded on landing + dashboard via `<CrispWidget />`; consent-gated, iOS Capacitor hidden | ⏳ Pending Crisp account creation |
| **Email `suporte@milespro.net.br`** | General questions, account issues, refund requests | ⏳ Pending Cloudflare Email Routing setup |
| **Email `dpo@milespro.net.br`** | LGPD-specific (export, deletion, consent revocation) | ✓ Wired in Privacidade.tsx §13 — needs Email Routing destination |
| **WhatsApp Business** (urgent payment issues) | Number TBD by founder during W3 cutover | ❌ Deferred to W3 / founder PJ |

---

## SLA targets — first-10-paying-users window

| Priority | Acknowledge | Resolve simple | Resolve complex |
|----------|-------------|----------------|-----------------|
| P1 — Refund / payment / login blocker | < 1h business-hours, < 4h off-hours | < 4h | < 24h |
| P2 — Plan change, account issue | < 4h business-hours | < 24h | < 48h |
| P3 — Feature question, "how do I…" | < 4h business-hours | < 24h | < 72h |

**Business hours (D-13):** Seg–Sex, 8h–20h BRT.

**Out-of-hours:** auto-reply via Crisp `first-message-greeting` trigger listing business hours + the `suporte@` fallback. No SLA off-hours but best-effort response same evening for P1.

---

## Top 5 most-likely ticket scenarios (with response templates, all pt-BR)

### 1. Refund request (within 7-day money-back guarantee — D-19)

**Trigger:** User emails `dpo@` or messages Crisp within 7d of first charge, says some variant of "quero cancelar e receber meu dinheiro de volta".

**Acknowledge template (≤ 1h):**

```
Olá [nome],

Confirmamos sua solicitação de reembolso. A garantia de 7 dias é incondicional —
não precisa explicar nada se não quiser.

Próximos passos:
1. Vou processar o estorno manualmente pelo painel da Asaas
2. Você receberá um email da Asaas confirmando o estorno (24-48h)
3. O crédito aparece no seu cartão em 5-10 dias úteis (varia por banco)
4. Sua conta MilesPro volta automaticamente para o plano Free — sem perda de dados

Se quiser contar o motivo (opcional, ajuda a gente a melhorar): responda este email.

Abraços,
[seu nome] — equipe MilesPro
```

**Operator action checklist:**

1. Confirme a janela 7-day: Asaas Dashboard → Cobranças → busca CPF/email → primeira cobrança data
2. Se DENTRO de 7 dias: processe imediatamente
   - Asaas → Cobranças → cancelar + estornar
   - Asaas → Assinaturas → cancelar a subscription (não só o charge — webhook handler em W2a precisa receber `SUBSCRIPTION_CANCELLED` para flippar `user_subscriptions.is_active=false` automaticamente)
   - Verifique se `user_subscriptions.is_active` ficou false; se não, manual UPDATE
3. Se FORA de 7 dias (caso ambíguo, e.g., usuário diz que tentou cancelar antes mas falhou):
   - Verifique logs (PostHog) por evento `cancelled` na janela
   - Se tem evidência, processe mesmo assim (boa-vontade pré-revenue)
   - Se não tem, explique educadamente que fora do prazo o ciclo segue até o fim
4. Reply confirmando.
5. Registre no Crisp note: "Refund processado, primeira cobrança em DD/MM"

### 2. Payment failed (`PAYMENT_CREDIT_CARD_CAPTURE_REFUSED` past_due)

**Trigger:** User sees the `PaymentFailedEmail` OR Crisp `Vi que tem um problema com meu pagamento`.

**Response template:**

```
Olá [nome],

Vimos que a Asaas tentou cobrar e o cartão recusou. Isso costuma se resolver assim:

1. Confirme saldo / limite disponível no cartão
2. Atualize o cartão no portal: https://app.milespro.net.br/assinatura
   → vai aparecer um link "Atualizar pagamento"
3. Aguarde a próxima tentativa automática (24-48h)
   OU clique "Tentar novamente agora" no portal

Você tem 7 dias para regularizar — depois disso a conta volta automaticamente
para o plano Free (sem perda de dados; é só atualizar e tudo volta).

Qualquer coisa, manda a mensagem por aqui que ajudo.
```

**Operator action:** Nenhuma manual normalmente. O usuário se auto-serve via PAY-05 portal (W3).

**Escalação:** Se 3+ tentativas falhadas no mesmo cartão em 7 dias, oferecer Pix manual via Asaas (link no chat).

### 3. Plan change (Pro → VIP upgrade ou downgrade)

**Trigger:** "Quero mudar de plano".

**Response template:**

```
Olá [nome],

Para mudar de plano:

OPÇÃO A (autoatendimento):
1. Cancele a assinatura atual em https://app.milespro.net.br/assinatura
2. Assine o novo plano logo em seguida — o acesso ao plano antigo continua
   até o fim do ciclo pago, e o novo começa em paralelo

OPÇÃO B (transferência manual com pro-rata):
Se você quer pagar a diferença proporcional ao tempo restante (em vez de
pagar duas mensalidades sobrepostas), me responda com:
- Seu CPF
- Para qual plano você quer mudar
- Em que ciclo (mensal / semestral / anual)

Faço a transferência pelo painel da Asaas em 24h e mando confirmação.

Abraços.
```

**Operator action (Opção B):**

1. Asaas Dashboard → Assinaturas → busca CPF/email
2. Cancela a subscription atual com motivo "Migração para VIP" (ou para Pro)
3. Cria nova subscription no plano destino com `value` ajustado pelo tempo restante (calcular manual: `dias_restantes / 30 * valor_velho` = crédito; novo `value` = `valor_novo - crédito`)
4. Email Asaas envia o link de cobrança da nova subscription
5. Confirma com o usuário

Limitação: Asaas Subscriptions API não tem upgrade nativo com proration (RESEARCH §2 TECH-01). Manual é o caminho v1.

### 4. Account deletion request (COMPL-02 LGPD)

**Trigger:** User clica "Excluir minha conta" no app → recebe `DeletionConfirmEmail` → confirma → entra na janela de 7 dias.

**Soft-confirmation response template (auto, via lgpd-delete flow):**

```
[Sent automatically by the lgpd-delete edge function — template
DeletionConfirmEmail.tsx, Plan 02-04 Task 3]
```

**If user emails DURING the 7-day reversibility window saying "mudei de ideia":**

```
Olá [nome],

Recebemos sua mudança de ideia. Acabei de cancelar o pedido de exclusão —
sua conta segue ativa normalmente. Nenhuma dado foi removido.

Se a exclusão foi acidental ou se você quer revisar suas configurações de
privacidade (analytics, marketing emails), acesse Configurações → Privacidade
no app.

Abraços.
```

**Operator action:** Manual UPDATE no DB:

```sql
UPDATE public.profiles
SET    deletion_requested_at = NULL,
       deletion_confirmed_at = NULL,
       deletion_token = NULL
WHERE  id = '<user-uuid>';
```

(O usuário fala o CPF/email; busca em `auth.users`; aplica via Lovable Cloud chat.)

Após 7 dias, o cron `lgpd-delete-cleanup` (Plan 02-02 W1a) purga automaticamente — IRREVERSÍVEL.

### 5. Password reset

**Trigger:** "Não consigo entrar".

**Response template:**

```
Olá,

Para resetar a senha:

1. Acesse https://app.milespro.net.br/auth
2. Clique "Esqueci minha senha"
3. Digite o email cadastrado
4. Você recebe um link em até 5 min — abra no celular ou no computador
5. Crie a nova senha (mínimo 8 caracteres)

Se o email não chegar em 5 min:
- Verifique a pasta spam / promoções
- Me avise por aqui que reenvio manualmente
```

**Operator action:** Nenhuma normalmente. Caso reset falhe:

1. Verifique se `RESEND_API_KEY` está configurado e o domain está verificado (cobertura aqui: o usuário diria "o email não chega")
2. Se Supabase auth tá retornando erro: Lovable Cloud chat → ver logs do auth service
3. Último recurso: manual UPDATE em `auth.users` via Supabase (admin SQL), comunicar a nova senha por canal seguro

---

## Chargeback / dispute defense — emergency runbook

**Trigger:** Asaas webhook recebe `PAYMENT_CHARGEBACK_REQUESTED` → Sentry alerta → ticket no inbox.

**Within 24h (the Asaas dispute window is tight — usually 7 days, sometimes less):**

1. Sentry/Crisp notifica ops → identifique o user em questão (CPF/email da cobrança disputada)
2. Pull evidence:
   - `subscription_leads` row (Phase 1 shadow log com timestamp do interesse)
   - Asaas Dashboard → Cobranças → histórico completo
   - PostHog `paid_first_invoice` event timestamp (W2a wires)
   - `user_consents` row mostrando aceite de ToS + Privacy com timestamp
   - `operations` count (mostra o usuário ATIVAMENTE usou o produto)
3. Asaas Dashboard → Disputa → "Contestar" → upload das evidências:
   - Termos aceitos (PDF screenshot do `/termos` + timestamp do consent)
   - Política de privacidade aceita
   - Logs de uso (CSV de operations / travel_*)
   - Comprovante de oferta de reembolso (se houve email/chat anterior)
4. Reply no Asaas com argumento curto: "Cliente assinou voluntariamente em DD/MM, usou ativamente o serviço por X dias (Y operações registradas), nunca solicitou reembolso dentro da janela de 7 dias publicada nos Termos."

**Pre-emption (best policy):** Reembolso dentro de 7 dias é SEMPRE preferível ao chargeback. Se o usuário reclamar dentro de 7d, ofereça o refund proativamente — chargeback custa taxa fixa + dano reputacional na adquirente.

---

## Operator daily checklist (until first 10 pagantes)

- [ ] Abrir Crisp inbox; responder mensagens P1 < 1h
- [ ] Conferir email founder + dpo@; responder LGPD requests < 4h
- [ ] Conferir Sentry alerts; investigar erros novos
- [ ] Conferir PostHog dashboard (signups, started_checkout, paid)
- [ ] Conferir Resend deliverability (bounce/complaint)
- [ ] Conferir Asaas Dashboard: cobranças pendentes / past_due / chargebacks

## Operator weekly checklist

- [ ] Revisar tickets fechados; identificar padrões (qual feature confunde?)
- [ ] Update este runbook com novos cenários encontrados
- [ ] DMARC aggregate report review (dmarcian.com gratuito)
- [ ] MRR dashboard check em `/admin/metrics` (Plan 02-03)
- [ ] Backlog de feature requests vindos do helpdesk → 999-backlog.md

---

## Cross-references

- D-13 (Plan 02-CONTEXT.md): SLA 4h business-hours / 24h max
- D-19 (Plan 02-CONTEXT.md): 7-day money-back guarantee
- D-23 (Plan 02-CONTEXT.md): Crisp free tier + WhatsApp Business
- Plan 02-01 / src/pages/Termos.tsx §4 — garantia incondicional com anchor `#garantia` (Plan 02-04 Task 6)
- Plan 02-02 W1a / lgpd-delete edge function — auto-confirmation flow for deletion
- Plan 02-04 RESEND-WARMUP-RUNBOOK.md — paired runbook for email side
- Plan 02-04 Task 4 / src/components/layout/CrispWidget.tsx — widget code
