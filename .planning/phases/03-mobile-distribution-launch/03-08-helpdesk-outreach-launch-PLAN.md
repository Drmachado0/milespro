---
phase: 03-mobile-distribution-launch
plan: 08
type: execute
wave: 3
depends_on: ["06", "07"]
files_modified:
  - .planning/phases/03-mobile-distribution-launch/03-08-HELPDESK-RUNBOOK.md
  - .planning/phases/03-mobile-distribution-launch/03-08-OUTREACH-PLAYBOOK.md
  - .planning/phases/03-mobile-distribution-launch/03-08-WEEK-1-SLA-TRACKER.md
  - .planning/phases/03-mobile-distribution-launch/03-08-LAUNCH-06-CLOSEOUT.md
autonomous: false
requirements: [LAUNCH-06, MOBILE-04, MOBILE-05, LAUNCH-02, LAUNCH-03, MOBILE-01, MOBILE-02, MOBILE-03]
tags: [launch-06, helpdesk, outreach, ten-pagantes, sla, runbook, organico, influencer, week-1, founder-action, phase-closeout, must-haves]
must_haves:
  truths:
    - "ROADMAP §Phase 3 SC#1 verbatim: `strings dist/assets/*.js | grep -E 'planos|checkout|R\\$|Upgrade|Assinar'` returns ZERO matches AND TestFlight walkthrough confirms no pricing UI (G-CRIT-03 cycle-level kill switch — owned by Plan 03-02 + Plan 03-07 Task 4; this plan VERIFIES at close-out)"
    - "ROADMAP §Phase 3 SC#2 verbatim: `android/app/build.gradle` declares `targetSdk = 35`; Play Console pre-launch report on Pixel 8 / Android 15 returns zero crashes / zero ANRs / zero security warnings; build promoted to production track (owned by Plan 03-06)"
    - "ROADMAP §Phase 3 SC#3 verbatim: Universal Links / App Links round-trip: deep-link `milespro://auth/callback?code=...` (and the HTTPS analog via AASA) re-opens the iOS app, completes PKCE exchange, and lands an authenticated Capacitor session. Android equivalent via assetlinks.json (owned by Plan 03-03 + Plan 03-07 Task 4 walkthrough)"
    - "ROADMAP §Phase 3 SC#4 verbatim: Push payload from `send-vencimento-alert` cron with fake 30-day-out expires_at row → APNs/FCM delivers within 30s on Pro user device; tapping deep-links to the program screen; Free user receives NO push (gated at enqueue by `has_plan('pro')`). (Owned by Plan 03-04 + Plan 03-05 + Plan 03-07 Task 4 step 10 e2e smoke)"
    - "ROADMAP §Phase 3 SC#5 verbatim: Asaas dashboard shows 10 distinct CPFs each with at least one PAYMENT_RECEIVED event (first invoice PAID, not trial). PostHog funnel report matches. Helpdesk SLA respected on inbound tickets. No open CRITICAL pitfall. (LAUNCH-06 — owned by THIS plan via outreach playbook + week-1 SLA tracker)"
    - "03-08-HELPDESK-RUNBOOK.md captures top-5 ticket templates per HIGH-08 (boleto não confirmou, cancelei mas continuei cobrado, feature Pro não apareceu, LGPD export, LGPD delete) with canned responses in pt-BR + Crisp triage rules"
    - "03-08-OUTREACH-PLAYBOOK.md captures: (a) BR miles community posting sequence (TudoSobreMilhas, MaisMilhas, Passageiro de Primeira, Reddit r/MilhasBrasil, Facebook groups Smiles/Multiplus/LATAM Pass/Livelo/Esfera, Telegram groups); (b) influencer outreach list with email/IG-DM template (D-T15); (c) timing per D-T16 (web first, mobile second)"
    - "03-08-WEEK-1-SLA-TRACKER.md captures real-time tally of: paying customers (cumulative), tickets opened/resolved (with SLA breach flags), churn events, refund requests, dispute notifications — updated daily during week-1 of LAUNCH-06"
    - "03-08-LAUNCH-06-CLOSEOUT.md is the phase-level acceptance document — captures the 5 ROADMAP success criteria with evidence links + dates, signed by founder once all 5 are GREEN"
    - "[BLOCKING] founder action sequence: (a) Crisp helpdesk inbox configured with canned responses per HIGH-08; (b) Week-1 outreach kickoff once Plan 03-06 (Android) is production-live; (c) Daily check-in on tickets + paying-customer count for 14 days OR until LAUNCH-06 closes; (d) Sign off 03-08-LAUNCH-06-CLOSEOUT.md when 10th paying CPF lands"
  artifacts:
    - path: .planning/phases/03-mobile-distribution-launch/03-08-HELPDESK-RUNBOOK.md
      provides: "Top-5 ticket templates + Crisp triage + dispute-defense pre-writes"
      contains: "boleto não confirmou"
    - path: .planning/phases/03-mobile-distribution-launch/03-08-OUTREACH-PLAYBOOK.md
      provides: "Orgânico + influencer outreach playbook (D-T15)"
      contains: "TudoSobreMilhas"
    - path: .planning/phases/03-mobile-distribution-launch/03-08-WEEK-1-SLA-TRACKER.md
      provides: "Daily metrics: tickets opened/resolved/breached, paying customers count, refunds, disputes"
      contains: "SLA"
    - path: .planning/phases/03-mobile-distribution-launch/03-08-LAUNCH-06-CLOSEOUT.md
      provides: "Phase 3 acceptance: 5 verbatim ROADMAP success criteria with evidence + sign-off"
      contains: "LAUNCH-06"
  key_links:
    - from: "Crisp helpdesk (Plan 02-04 W1c — already live)"
      to: "03-08-HELPDESK-RUNBOOK canned responses"
      via: "Crisp shortcuts + auto-replies configured by founder"
      pattern: "canned response"
    - from: "Asaas dashboard PAYMENT_RECEIVED events"
      to: "10-distinct-CPF check (LAUNCH-06)"
      via: "Asaas API or CSV export query"
      pattern: "PAYMENT_RECEIVED"
    - from: "PostHog funnel — paid_first_invoice"
      to: "10-paying-customer cross-validation"
      via: "PostHog cohort filter"
      pattern: "paid_first_invoice"
---

<objective>
Close the cycle — Phase 3 + the whole 10-pagantes milestone — by (a) operationalizing the helpdesk (HIGH-08 mitigation: pre-written top-5 ticket responses + Crisp triage rules + dispute-defense templates), (b) running the orgânico + influencer outreach per D-T15/D-T16, (c) tracking the week-1 SLA + customer count daily until LAUNCH-06 closes (10 distinct CPFs with PAYMENT_RECEIVED), (d) signing off the Phase 3 acceptance document with verbatim ROADMAP success criteria evidence.

Purpose: LAUNCH-06 is the cycle milestone — without it, the whole MilesPro cycle remains open. ROADMAP success criteria 1-4 land in earlier plans (03-02, 03-04, 03-05, 03-06, 03-07); SC#5 (10 paying CPFs + helpdesk SLA respected + no open CRITICAL) lands HERE. This is the phase-closing plan. Plan-level must_haves carry the 5 verbatim ROADMAP success criteria so phase verification can pick them up at a single location (per planner-source-audit "highest-numbered plan carries phase-level must_haves").

Output: 4 founder runbooks covering helpdesk + outreach + week-1 tracking + close-out sign-off. No code changes; this is the operational rump that turns the technical phase into a closed milestone.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/03-mobile-distribution-launch/03-CONTEXT.md
@.planning/phases/03-mobile-distribution-launch/03-RESEARCH.md
@.planning/phases/02-monetiza-o-compliance-telemetria/02-04-HELPDESK-SLA-RUNBOOK.md
@.planning/research/PITFALLS.md
@src/pages/Privacidade.tsx
@src/pages/Termos.tsx

<interfaces>
**Consumes:**
- Plan 02-04: Crisp helpdesk + WhatsApp Business already deployed (LAUNCH-05) — this plan operationalizes it
- Plan 02-04: Resend transactional email already live + 6 email templates shipped
- Plan 02-05: Asaas sandbox + production webhook + invoice generation
- Plan 02-06: handlePlanCta → create-checkout-session live (paying customers can convert)
- Plan 03-06: Android Play Store production listing live
- Plan 03-07: iOS App Store production listing live (parallel; not blocking outreach per D-T16)

**HIGH-08 reference:**
PITFALLS.md HIGH-08 is the "customer support readiness" risk. This plan is its primary mitigation.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Write 03-08-HELPDESK-RUNBOOK.md (top-5 ticket templates + Crisp triage rules)</name>
  <files>.planning/phases/03-mobile-distribution-launch/03-08-HELPDESK-RUNBOOK.md</files>
  <read_first>
    - .planning/research/PITFALLS.md HIGH-08 (top-5 likely tickets enumerated)
    - .planning/phases/02-monetiza-o-compliance-telemetria/02-04-HELPDESK-SLA-RUNBOOK.md (pre-existing Crisp scaffolding)
    - src/pages/Termos.tsx §4 (7-day refund guarantee — referenced in canned responses)
  </read_first>
  <action>
**1.1 — Create `.planning/phases/03-mobile-distribution-launch/03-08-HELPDESK-RUNBOOK.md`:**

```markdown
# MilesPro — Helpdesk Operational Runbook (Phase 3 / LAUNCH-06)

**Created:** <date>
**Owner:** Founder (single-operator helpdesk for v1; consider delegation post-LAUNCH-06)
**Channels:** Crisp (web + iOS + Android in-app chat) + WhatsApp Business + suporte@milespro.net.br + dpo@milespro.net.br (LGPD only)
**SLA target:** 24h first response on inbound tickets during week-1 of LAUNCH-06; relaxed to 48h thereafter

---

## Top-5 Most-Likely Tickets (HIGH-08 pre-written canned responses)

### 1. "Boleto não confirmou" / "Paguei mas não apareceu"

**Trigger words (Crisp auto-tag):** boleto, paguei, não confirmou, demorando, não compensou

**Canned response (pt-BR):**

> Olá! Obrigado por escolher MilesPro.
>
> Boleto bancário pode levar até **2 dias úteis** para compensar — esse é o prazo padrão dos bancos. Pix entra em segundos, cartão em minutos.
>
> Se ainda não compensou após 2 dias úteis:
> 1. Confira se o pagamento foi efetuado (extrato bancário)
> 2. Me envie o comprovante (PDF ou print) por aqui
> 3. Vou consultar o Asaas e ajustar manualmente se necessário
>
> Quer trocar pra Pix? Posso gerar um link novo:
> 1. Acesse milespro.net.br/assinatura no navegador
> 2. Cancele a cobrança aberta (botão "Cancelar")
> 3. Refaça e escolha Pix
>
> Estou aqui se precisar de ajuda.
>
> Abraço, <founder name>

**Behind-the-scenes action:**
- Open Asaas dashboard → search by customer CPF
- Check if `boleto` payment exists with status `PENDING`
- If past 2 business days + customer confirms payment via screenshot → manually mark as RECEIVED via Asaas dashboard
- Webhook fires → user_subscriptions flips to active

### 2. "Cancelei mas continuei sendo cobrado"

**Trigger words:** cancelei, cancelar, continua cobrando, débito recorrente

**Canned response:**

> Vamos resolver isso agora.
>
> Pra cancelar a assinatura imediatamente:
> 1. Acesse milespro.net.br/assinatura no navegador
> 2. Clique em "Gerenciar assinatura" (abre o portal Asaas)
> 3. Cancele lá
>
> Se já fez o cancelamento e foi cobrado de novo: me envie o número do cartão (4 últimos dígitos) + data da cobrança. Vou conferir no Asaas e estornar se houve erro.
>
> Reembolso: garantia incondicional de **7 dias** após a primeira cobrança (artigo 4 dos Termos). Depois disso, prorrateamos o mês.

**Behind-the-scenes action:**
- Asaas → find subscription by CPF
- Verify cancellation status (cancelled vs active vs past_due)
- If cancelled but charged → issue refund via Asaas portal (`Estornar`)
- If still active despite user request → cancel manually + record in ticket notes

### 3. "Feature do Pro não apareceu após upgrade"

**Trigger words:** upgrade, Pro, premium, comprei, não apareceu, ainda free

**Canned response:**

> Boa! Vamos verificar.
>
> 1. Saia do app (logout) e entre de novo (a sessão atualiza o tier)
> 2. Se ainda aparecer Free, me passa seu email cadastrado
> 3. Vou conferir no painel se o webhook do Asaas processou
>
> Geralmente é só refazer login. Se persistir, faço o ajuste manual em <2min.

**Behind-the-scenes action:**
- Asaas → confirm PAYMENT_RECEIVED event registered
- Supabase Studio → `SELECT plan FROM user_subscriptions WHERE user_id = (SELECT id FROM auth.users WHERE email='<email>')`
- If plan != 'pro': manually UPDATE user_subscriptions.plan + log in ticket notes
- If plan = 'pro': customer needs a logout/login cycle; instruct via chat

### 4. "Quero exportar meus dados (LGPD)"

**Trigger words:** exportar, meus dados, LGPD, Art. 18, portabilidade

**Canned response:**

> Claro, é seu direito pela LGPD.
>
> Atualmente o botão "Exportar meus dados" está sendo finalizado dentro do app (próxima versão). Enquanto isso, eu faço o export manualmente em até 5 dias úteis.
>
> Me confirma:
> - Seu email cadastrado
> - Formato preferido (JSON ou CSV)
>
> Recebo via DPO (dpo@milespro.net.br) e te envio o pacote completo (profile + assinatura + operações + programas + viagens + consentimentos).

**Behind-the-scenes action:**
- Invoke lgpd-export edge function via Lovable Cloud chat with the user's UUID
- Wait for return JSON (~5s)
- Save JSON to disk → email to customer via Resend (or attach in WhatsApp Business)
- Log in deletion_audit / lgpd_export_log

### 5. "Quero excluir minha conta (LGPD)"

**Trigger words:** excluir, deletar, apagar, remover conta, LGPD

**Canned response:**

> Pode deixar. Pela LGPD você tem esse direito a qualquer momento.
>
> Processo:
> 1. Me confirma o email cadastrado
> 2. Vou disparar o pedido de exclusão (você receberá um email de confirmação)
> 3. Você tem 7 dias pra cancelar (caso mude de ideia) — basta responder o email
> 4. Após o prazo, a conta e todos os dados são deletados em definitivo
>
> Esse processo está em conformidade com a LGPD Art. 18 IV. DPO: dpo@milespro.net.br se quiser falar diretamente.

**Behind-the-scenes action:**
- Invoke lgpd-delete edge function (action=request) with the user's email
- Confirm Resend email sent
- Tag ticket with "LGPD-delete-requested" + expected cleanup date (today + 7d)
- The lgpd-delete-cleanup cron handles the rest @ 04:00 UTC daily

---

## Dispute / Chargeback Defense Templates

Asaas notifies of chargeback initiations via dashboard alert + email. Pre-written defense template:

```
Dear Asaas dispute team,

Customer <customer_id> initiated a chargeback for transaction <payment_id> on <date> for R$ <amount>.

DEFENSE EVIDENCE:

1. Customer agreed to terms of service: <link to Termos.tsx + timestamp of consent in user_consents table>
2. Customer received product: account active from <date>; features used: <count of operations / programs registered>
3. Refund policy: 7-day guarantee per Termos §4. Customer did NOT request refund within window.
4. Chargeback timing: <X days after first payment> — well outside the 7-day window
5. Communication record: <link to Crisp ticket history if any>

Requesting dispute denial.

Sincerely,
MilesPro (CNPJ <PJ-CNPJ>)
```

For boleto-lag scenarios specifically (Pitfall 2 from RESEARCH):

```
Dear Asaas team,

This is a boleto-clearance timing dispute (Brazilian banking 2-business-day clearance window). Customer paid via boleto on <date> + boleto cleared on <date + 1-2 business days>. No service interruption; customer access was not affected.

Refund policy: 7-day guarantee was available + not exercised.

Requesting dispute denial.

Sincerely,
MilesPro
```

---

## Crisp Triage Rules

Configure in Crisp dashboard (Plan 02-04 already set up Crisp; this is the routing config):

### Auto-tags

| Trigger keyword | Tag | Priority |
|----------------|-----|----------|
| boleto, paguei, não confirmou | `billing-boleto` | High |
| cancelei, continua cobrando | `billing-cancel` | High |
| upgrade, Pro, não apareceu, free | `tier-mismatch` | High |
| exportar, LGPD, meus dados | `lgpd-export` | Medium |
| excluir, deletar, apagar conta | `lgpd-delete` | Medium |
| iOS, App Store, baixar, instalar | `ios-app` | Low |
| Android, Play Store | `android-app` | Low |
| outro, dúvida geral | `general` | Low |

### Auto-replies (instant; before founder picks up)

Whenever any tag is set: send auto-reply "Recebido! Vou responder em até 24h (geralmente bem antes). Se for urgente, manda 'urgente' que eu vejo prioridade. — Equipe MilesPro"

### Office hours

08:00-20:00 BRT, segunda a sábado. Sunday is "best effort". Set Crisp office-hours block accordingly.

---

## Daily Check-in (week-1 of LAUNCH-06)

Each morning at ~09:00 BRT (or first thing after wake):
1. Open Crisp → triage new tickets (Mark as "claimed" within 1h of arrival)
2. Open Asaas dashboard → check overnight PAYMENT_* events
3. Update 03-08-WEEK-1-SLA-TRACKER.md with the current customer count + ticket counts
4. Reply to all "High" priority tagged tickets first

Each evening at ~22:00 BRT:
1. Confirm all High-priority tickets responded to
2. Send proactive WhatsApp to any first-time payer who has NOT logged in within 24h ("Tudo bem? Conseguiu acessar?")
3. Update tracker

---

## Escalation Triggers

Stop the line + reassess if ANY of:
- 3 chargebacks within 30 days (Asaas may freeze account at 1% dispute rate)
- 5 same-root-cause tickets in 24h (= product bug; emergency fix needed)
- Apple/Google review escalation referencing 3.1.1 or Play policy violation
- A user reports getting a push for a feature they did NOT subscribe to (= has_plan gate bug = SEC regression)

Founder personally responds to escalations within 4h regardless of SLA.
```

**1.2 — Convention enforcement:**
- pt-BR canned responses (locale match)
- "Behind-the-scenes action" section for each ticket = explicit operator handoff
- Dispute templates in pt-BR + English (Asaas may need both)
- Tag mapping uses kebab-case for Crisp consistency
- Escalation triggers are explicit thresholds (not subjective)
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const r=fs.readFileSync('.planning/phases/03-mobile-distribution-launch/03-08-HELPDESK-RUNBOOK.md','utf8'); const req=[['Boleto não confirmou','ticket 1'],['Cancelei mas continuei','ticket 2'],['Feature do Pro não apareceu','ticket 3'],['exportar meus dados','LGPD export ticket'],['excluir minha conta','LGPD delete ticket'],['Dispute','dispute templates'],['Crisp Triage Rules','triage section'],['Daily Check-in','daily routine'],['Escalation Triggers','escalation section'],['7-day guarantee','refund policy ref'],['dpo@milespro.net.br','DPO email'],['suporte@milespro.net.br','support email']]; let fail=false; for (const [n,w] of req){if(!r.includes(n)){console.error('FAIL: helpdesk runbook missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: helpdesk runbook');"</automated>
  </verify>
  <done>
    03-08-HELPDESK-RUNBOOK.md captures top-5 canned responses in pt-BR + Crisp triage rules + dispute templates + daily check-in routine + escalation triggers.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Write 03-08-OUTREACH-PLAYBOOK.md (D-T15 orgânico + influencer + D-T16 web-first timing)</name>
  <files>.planning/phases/03-mobile-distribution-launch/03-08-OUTREACH-PLAYBOOK.md</files>
  <read_first>
    - .planning/phases/03-mobile-distribution-launch/03-CONTEXT.md D-T15, D-T16
    - src/pages/Index.tsx (landing copy — value proposition for outreach)
    - .planning/phases/03-mobile-distribution-launch/03-06-RELEASE-NOTES.md (feature highlights)
  </read_first>
  <action>
**2.1 — Create `.planning/phases/03-mobile-distribution-launch/03-08-OUTREACH-PLAYBOOK.md`:**

```markdown
# MilesPro — Outreach Playbook (LAUNCH-06)

**Goal:** First 10 paying customers (PAYMENT_RECEIVED, not trial). Target: 4-6 weeks from start.
**Timing:** Web first (Plan 02 web build live). Mobile launches in parallel (Plans 03-06 + 03-07) but does NOT gate outreach.
**Constraints (D-T15 / D-T16):** Orgânico + influencer mix; NO paid ads (Meta/Google) for v1; NO structured personal-network blast.

---

## Phase 1 (Week 0-2): Orgânico in BR Miles Communities

### Target Communities

**Facebook Groups:**
- Smiles (and subgroups: Smiles SP, Smiles RJ, etc.)
- Multiplus (LATAM passes)
- TudoAzul (Azul passes)
- Livelo, Esfera (transferência)
- "Milhas e Pontos" (general)

**Reddit:**
- r/MilhasBrasil (~20K subscribers)
- r/brasil (general; only relevant subreddit posts allowed)

**Telegram:**
- "TudoSobreMilhas" channel + chat
- "Passageiro de Primeira" channel
- Local groups (cidade-specific miles groups)

**Other:**
- Quora pt-BR (questions about miles management)
- Hacker News if a English-friendly post angle exists (low priority)

### Posting Rules (read BEFORE posting)

1. **Read each group's rules.** Some ban self-promo entirely. Respect the rule + look for "Vitrines" / "Sextou" / "Quartas de Auto-Promo" threads where it's allowed.
2. **Provide value first.** Post answers to other people's questions; introduce MilesPro as "ferramenta que uso" naturally after 3-5 contributions.
3. **NO spam.** One post per group per week MAX.
4. **Engage in comments.** Reply to every comment within 24h (helpdesk SLA cross-reference).

### Post Templates

**Template 1: "Ferramenta que eu uso pra controlar minhas milhas"** (intro)

```
Galera, depois de anos perdendo milhas vencendo + tendo que abrir 8 abas pra checar Smiles, TudoAzul, LATAM, Livelo e Esfera, montei uma ferramenta pra mim: MilesPro (milespro.net.br).

É gestão de milhas + pontos no Brasil. Visualiza tudo em um lugar, alerta antes de vencer, e — o que mais uso — recomenda quando fazer transferência (Livelo > Smiles +50% etc).

Tem versão gratuita pra cadastrar até 3 programas. Pro são R$ 37,90/mês (alertas push, multi-programa ilimitado, gráficos).

Não é foguete, é só uma ferramenta. Quem usa o que? Curioso pra saber.
```

**Template 2: "Como vocês organizam multi-CPF?"** (question + soft mention)

```
Pergunta pros consultores e cabeça-de-família: vocês conseguem ter visão consolidada das milhas da família toda? Eu separava em planilha mas era inferno.

Comecei a usar um app pra isso (MilesPro VIP). Tem multi-CPF + relatório consolidado. Estou testando há 3 meses, ajuda bastante.

Vocês usam algum sistema? Compartilha aí.
```

**Template 3: Reddit r/MilhasBrasil** (text post; longer-form OK)

```
Title: Lancei MilesPro — gestão de milhas + pontos pra brasileiros (feedback bem-vindo)

Pessoal, oi! Sou <founder name>, dev. Cansei de perder milhas em planilha e fiz uma ferramenta pra mim, depois mostrei pra alguns amigos consultores e disseram "lança isso".

Lançou: milespro.net.br

O que faz:
- Consolida saldos: Smiles, TudoAzul, LATAM Pass, Livelo, Esfera (programas Brasil)
- Alerta antes de vencer (configurável: 30/60/90/180 dias)
- Recomenda promoções de transferência baseado nos seus saldos (Killer feature)
- Multi-CPF (VIP) pra quem gerencia milhas da família ou clientes

Preço: free pra 3 programas. Pro R$ 37,90/mês. VIP R$ 67,90/mês (multi-CPF). Trial 7 dias do Pro com cartão (cancela quando quiser).

Quero feedback honesto: o que está faltando? O que sobra? O que vocês fariam diferente?

(Não vou pagar Meta Ads — quero atingir os 10 primeiros pagantes via comunidade. Daí decido se escala. Transparência total.)
```

### Tracking

| Group / Channel | Posted on | Engagement (likes/comments/views) | Signups attributed | First payments | Status |
|----------------|-----------|----------------------------------|-------------------|----------------|--------|
| Facebook Smiles | _<date>_ | _<numbers>_ | _<count>_ | _<count>_ | _<active/closed>_ |
| Reddit r/MilhasBrasil | _<date>_ | _<numbers>_ | _<count>_ | _<count>_ | _<active/closed>_ |
| ... | ... | ... | ... | ... | ... |

Update weekly. UTM-tagged links (`?utm_source=facebook&utm_medium=group&utm_campaign=launch1`) make attribution traceable in PostHog.

---

## Phase 2 (Week 2-8): Influencer Outreach (parallel, longer cadence)

### Target List

BR miles content creators on YouTube + Instagram + Twitch + TikTok:

| Name | Platform | Followers (approx) | Niche | Contact |
|------|----------|---------------------|-------|---------|
| _<creator 1>_ | YouTube | 250k | Miles + business class reviews | _<email/IG-DM>_ |
| _<creator 2>_ | Instagram | 80k | Multiplus + Smiles tips | _<email>_ |
| _<creator 3>_ | YouTube | 120k | Premium economy strategy | _<email>_ |
| _<creator 4>_ | Twitch | 15k | Live miles redemption | _<email>_ |
| _<creator 5>_ | TikTok | 200k | Quick travel hacks | _<email>_ |
| _<creator 6>_ | YouTube | 50k | Family travel optimization | _<email>_ |
| _<creator 7>_ | Instagram | 100k | Luxury travel | _<email>_ |
| _<creator 8>_ | Newsletter | 10k subs | Brazil miles weekly digest | _<email>_ |

(Founder fills in actual names + handles. List is illustrative.)

### Outreach Template (email or IG-DM)

```
Subject: Parceria — MilesPro (gestão de milhas pra creators)

Oi <nome>,

Sou <founder>, dev. Acabei de lançar MilesPro (milespro.net.br) — gestão de milhas + pontos no Brasil.

Vi seu conteúdo sobre <último vídeo / post relevante>. Achei interessante a parte de <feedback específico — 1-2 frases mostrando que conhece o trabalho>.

Por que escrever pra você: você fala pro público que MAIS precisa do que MilesPro resolve (multi-programa + ferro para gerenciar vencimentos + alertas de promo).

Proposta:
- Acesso lifetime ao plano VIP (multi-CPF) pra você usar de verdade
- Comissão de afiliado por conversão (15% no primeiro ano da assinatura)
- Materiais prontos: thumbnails, screenshots, screen recordings, dados reais de uso

Se rolar resenha honesta no seu canal/IG, top demais. Se não rolar e ainda assim quiser testar o produto, sem compromisso — me responde que mando o acesso.

Aliás, não tô fazendo Meta/Google Ads. Estratégia é só orgânico + creators autênticos. Acho que o seu público é o público certo.

Bora?

Abraço,
<founder>
<phone para WhatsApp se preferir>
```

### Follow-up cadence

- D+0: First outreach
- D+7: Friendly bump if no response ("Bumping caso tenha perdido")
- D+14: Second bump with specific ask ("Sem stress se não rolar; me avisa se quiser que eu pare de te escrever")
- D+28: Stop reaching out

Track in a spreadsheet (Google Sheets) with columns: creator, contact, last reached, status (cold / responded / negotiating / signed / passed), notes.

### Sponsorship pricing

Suggested ranges per content piece:
- Instagram Story (single): R$ 200-500
- Instagram Reel: R$ 800-1500
- YouTube dedicated video: R$ 1500-5000
- YouTube integration (10-30s): R$ 500-1500
- Newsletter sponsorship (single edition): R$ 300-1000

These are NEGOTIATING ANCHORS, not fixed prices. Always start with the "lifetime VIP + commission" pitch first; cash is fallback for those who explicitly require upfront payment.

---

## Phase 3 (Continuous): Proactive Week-1 Outreach to First 10 Pagantes

Per HIGH-08 mitigation. For every customer who hits PAYMENT_RECEIVED:

### Within 24h of first payment

WhatsApp (or in-app chat, depending on customer preference):

```
Oi <nome>! Aqui é o <founder> do MilesPro.

Vi que você acabou de assinar — bem-vindo!

Queria perguntar:
1. Conseguiu logar tranquilo? Sem nenhum bug?
2. Faz sentido começar cadastrando seus programas (Smiles, TudoAzul, etc.)? Posso te guiar pelo app.
3. Algum recurso que você esperava encontrar e não achou?

Vou ficar atento aqui. Manda mensagem se travar em qualquer coisa, tá?
```

### Within 7 days of first payment

```
E aí <nome>, como tá a experiência com o MilesPro?

Algumas perguntas que ajudam muito:
- Tá conseguindo controlar suas milhas melhor?
- O alerta de vencimento já te salvou alguma milha?
- Tem algo confuso na interface?

Se preferir, manda 2 prints + 30 segundos de feedback em audio no WhatsApp. Vai ajudar demais a melhorar o app pros próximos.

E lembrete: garantia de 7 dias se quiser cancelar (sem perguntas). Só me avisa.
```

### Within 30 days

If renewal triggered (Asaas PAYMENT_RECEIVED for the recurring charge):

```
<nome>, seguindo aqui! Vi que sua renovação rolou.

Tá tudo bem? Algum recurso que você gostaria de ver no app que ainda não existe?

A próxima feature que tô considerando é <feature>. Faria sentido pro seu uso?
```

If churn (subscription cancelled OR PAYMENT_OVERDUE):

```
<nome>, vi que você cancelou (ou tá pendente). Queria entender:

1. Foi o produto que não atendeu?
2. Foi o preço?
3. Foi outra coisa (mudou de programa, deixou de fazer milhas, etc.)?

Sem stress se não quiser responder. Mas qualquer feedback vai me ajudar a fazer um produto melhor.

Se for problema de produto ou preço, eu posso te dar 1 mês grátis pra retomar — só me responde. (Aproveito pra dizer que a garantia de 7 dias é incondicional, sempre.)
```

---

## Success Criteria for LAUNCH-06

- [ ] 10 distinct CPFs in Asaas with at least one PAYMENT_RECEIVED event (NOT trial)
- [ ] PostHog `paid_first_invoice` funnel report matches the 10
- [ ] Helpdesk SLA respected: ALL inbound tickets responded within 24h during week-1
- [ ] NO open CRITICAL pitfall in PITFALLS.md
- [ ] NO chargeback or dispute on the first 10 (HIGH-08 mitigation working)

When all 5 boxes checked: cycle closes. Update 03-08-LAUNCH-06-CLOSEOUT.md.
```

**2.2 — Convention enforcement:**
- All outreach copy in pt-BR (D-T15)
- 3 phases match D-T16 (web-first → influencer parallel → proactive followups)
- NO paid ads strategy (CAC > LTV for first 10)
- Tracking columns explicit for spreadsheet maintenance
- UTM-tagging convention for attribution
- Sponsorship ranges are negotiating anchors, not fixed
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const r=fs.readFileSync('.planning/phases/03-mobile-distribution-launch/03-08-OUTREACH-PLAYBOOK.md','utf8'); const req=[['TudoSobreMilhas','Telegram channel'],['MilhasBrasil','reddit subreddit'],['Smiles','community ref 1'],['Multiplus','community ref 2'],['Livelo','community ref 3'],['paid ads','no-paid-ads policy ref'],['UTM','attribution mention'],['Phase 1','orgânico phase'],['Phase 2','influencer phase'],['Phase 3','proactive phase'],['10 distinct CPFs','LAUNCH-06 criterion'],['LAUNCH-06','milestone reference'],['utm_source','attribution example']]; let fail=false; for (const [n,w] of req){if(!r.includes(n)){console.error('FAIL: outreach playbook missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: outreach playbook');"</automated>
  </verify>
  <done>
    03-08-OUTREACH-PLAYBOOK.md has 3 phases (orgânico + influencer + proactive), target communities, post templates, influencer outreach emails, proactive customer messaging templates, success criteria, UTM tracking columns.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Write 03-08-WEEK-1-SLA-TRACKER.md (daily customer count + ticket SLA tally)</name>
  <files>.planning/phases/03-mobile-distribution-launch/03-08-WEEK-1-SLA-TRACKER.md</files>
  <read_first>
    - .planning/phases/03-mobile-distribution-launch/03-08-HELPDESK-RUNBOOK.md (Task 1 — SLA target referenced)
    - .planning/phases/03-mobile-distribution-launch/03-08-OUTREACH-PLAYBOOK.md (Task 2 — success criteria referenced)
  </read_first>
  <action>
**3.1 — Create `.planning/phases/03-mobile-distribution-launch/03-08-WEEK-1-SLA-TRACKER.md`:**

```markdown
# Week-1 SLA Tracker — LAUNCH-06 cycle

**Cycle start:** <date when first paying customer lands>
**Cycle target:** 10 distinct CPFs with PAYMENT_RECEIVED by <date+30d>
**Helpdesk SLA:** 24h first response on any inbound ticket
**Owner:** Founder (single-operator)

---

## Daily Tally (update every morning + every evening)

| Date | Paying customers (cumulative) | New tickets | Tickets resolved | SLA breached (24h+) | Refunds requested | Chargebacks / disputes | Notes |
|------|------------------------------|-------------|-----------------|--------------------|--------------------|------------------------|-------|
| <D+0> | 1 | 0 | 0 | 0 | 0 | 0 | First payment received — proactive WhatsApp sent. |
| <D+1> | 2 | 1 | 1 | 0 | 0 | 0 | Boleto-lag ticket → resolved with canned response #1. |
| <D+2> | 3 | 0 | 0 | 0 | 0 | 0 | Outreach post #4 on Facebook Smiles group. |
| ... | ... | ... | ... | ... | ... | ... | ... |
| <D+14> | 10 | <total> | <total> | <breach count> | <refund count> | <dispute count> | LAUNCH-06 target reached. Closing? |

---

## Per-Customer Tracker

For each of the first 10:

| # | Date paid | CPF (last 4) | Name | Plan | Source (UTM or "direct") | First login? | Proactive WhatsApp sent? | Week-1 followup sent? | Churn/Renewal status |
|---|----------|-------------|------|------|--------------------------|--------------|--------------------------|----------------------|---------------------|
| 1 | _<date>_ | _<XXXX>_ | _<name>_ | _<Pro/VIP>_ | _<utm or direct>_ | _<yes/no>_ | _<date sent>_ | _<date sent>_ | _<active>_ |
| 2 | _<date>_ | _<XXXX>_ | _<name>_ | _<Pro/VIP>_ | _<utm or direct>_ | _<yes/no>_ | _<date sent>_ | _<date sent>_ | _<active>_ |
| 3 | ... | ... | ... | ... | ... | ... | ... | ... | ... |
| 10 | _<date>_ | _<XXXX>_ | _<name>_ | _<Pro/VIP>_ | _<utm or direct>_ | _<yes/no>_ | _<date sent>_ | _<date sent>_ | _<active>_ |

---

## Critical Incidents (escalation log)

| Date | Type | Customer (if applicable) | Description | Root cause | Resolution | Status |
|------|------|--------------------------|-------------|-----------|------------|--------|
| _<date>_ | _<bug/dispute/etc>_ | _<customer or "none">_ | _<description>_ | _<RCA>_ | _<fix>_ | _<open/closed>_ |

Empty section is a good thing. Populate only when an incident occurs.

---

## Asaas + PostHog Cross-Check

Run this weekly (or daily during week-1):

```bash
# 1. Asaas paying customers (via API or CSV export)
# Count of distinct customer CPFs with at least one payment.status='RECEIVED'
# Expected query against Asaas v3/payments endpoint:
# GET /api/v3/payments?status=RECEIVED&offset=0&limit=100
# Count distinct customer.cpfCnpj across results.

# 2. PostHog paid_first_invoice events
# Filter: event = paid_first_invoice + date range = cycle start to now
# Expected count = same as Asaas count
```

| Date | Asaas count (distinct CPFs with PAYMENT_RECEIVED) | PostHog count (paid_first_invoice unique users) | Delta | Notes |
|------|--------------------------------------------------|------------------------------------------------|-------|-------|
| <date> | _<count>_ | _<count>_ | _<diff>_ | _<reconciliation notes>_ |

Non-zero delta = telemetry gap; investigate (likely PostHog consent declined OR webhook delivery delay).

---

## Sign-off (when LAUNCH-06 closes)

- [ ] 10th distinct CPF reached PAYMENT_RECEIVED on: <date>
- [ ] All 10 customers contacted within 24h of payment
- [ ] All 10 customers received 7-day followup
- [ ] Helpdesk SLA respected (zero 24h+ breaches during week-1 of cycle)
- [ ] No chargebacks
- [ ] No open CRITICAL pitfall

Founder signature: _<date + name>_
```

**3.2 — Convention enforcement:**
- Markdown table format (founder updates manually)
- Per-customer columns include UTM source for attribution + churn status for retention monitoring
- Critical incidents log is opt-in (empty is fine)
- Asaas + PostHog cross-check validates data integrity
- Sign-off section turns this into the milestone-acceptance document
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const r=fs.readFileSync('.planning/phases/03-mobile-distribution-launch/03-08-WEEK-1-SLA-TRACKER.md','utf8'); const req=[['Daily Tally','daily section'],['Per-Customer Tracker','per-customer section'],['Critical Incidents','incident log'],['Asaas + PostHog Cross-Check','data reconciliation'],['PAYMENT_RECEIVED','Asaas event'],['paid_first_invoice','PostHog event'],['10th distinct CPF','LAUNCH-06 marker'],['Helpdesk SLA','SLA reference']]; let fail=false; for (const [n,w] of req){if(!r.includes(n)){console.error('FAIL: SLA tracker missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: week-1 SLA tracker');"</automated>
  </verify>
  <done>
    03-08-WEEK-1-SLA-TRACKER.md has daily tally template + per-customer rows for the 10 first pagantes + critical incidents log + Asaas/PostHog cross-check + sign-off section.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: Write 03-08-LAUNCH-06-CLOSEOUT.md (phase-level must_haves + evidence + sign-off)</name>
  <files>.planning/phases/03-mobile-distribution-launch/03-08-LAUNCH-06-CLOSEOUT.md</files>
  <read_first>
    - .planning/ROADMAP.md (Phase 3 Success Criteria 1-5 verbatim)
    - .planning/phases/03-mobile-distribution-launch/03-08-WEEK-1-SLA-TRACKER.md (Task 3)
    - All Plan 03-* SUMMARY.md files (when they exist post-execution)
  </read_first>
  <action>
**4.1 — Create `.planning/phases/03-mobile-distribution-launch/03-08-LAUNCH-06-CLOSEOUT.md`:**

```markdown
# Phase 3 + LAUNCH-06 Closeout — MilesPro Cycle Acceptance

**Phase:** 03-mobile-distribution-launch
**Cycle milestone:** First 10 paying recurring customers
**Created:** <date>
**Sign-off date:** <to be filled when all 5 criteria GREEN>

This document is the single acceptance artifact for Phase 3 + the entire MilesPro v1.0 cycle. Each criterion below maps verbatim to ROADMAP §"Phase 3: Mobile Distribution & Launch" → "Success Criteria". When all 5 are GREEN, the cycle is complete.

---

## SC#1 — iOS bundle ships zero pricing UI; TestFlight walkthrough confirms

> **ROADMAP verbatim:** `strings dist/assets/*.js | grep -E 'planos|checkout|R\$|Upgrade|Assinar'` returns ZERO matches AND TestFlight walkthrough confirms no pricing UI.

**Evidence:**
- [ ] G-CRIT-03 CI gate green on main since: _<date>_ (Plan 03-02)
- [ ] Local pre-archive gate green at submission: _<timestamp>_ (Plan 03-07 Task 5 Step 0)
- [ ] TestFlight walkthrough signed APPROVED at: _<date>_ (Plan 03-07 Task 4)
- [ ] App Store Review approved with no 3.1.1 / 3.1.3 references: _<date>_ (Plan 03-07 Task 5 Step 8)

Status: ⬜ pending · 🟡 in progress · ✅ green

---

## SC#2 — Android targetSdk=35 + clean Pre-launch Report + production track

> **ROADMAP verbatim:** `android/app/build.gradle` declares `targetSdk = 35`; Play Console pre-launch report on Pixel 8 / Android 15 returns zero crashes / zero ANRs / zero security warnings; build promoted to production track.

**Evidence:**
- [ ] `android/app/build.gradle` + `android/variables.gradle` declare targetSdk=35: verified at: _<date>_ (Plan 03-01 + Plan 03-06)
- [ ] Play Console Pre-launch Report URL: _<url>_ (Plan 03-06 Task 5 Step 3)
- [ ] Pixel 8 + Android 15 row in Pre-launch Report: ZERO crashes / ANRs / security warnings at: _<timestamp>_
- [ ] Production track approved + listing live: _<url>_ at: _<date>_ (Plan 03-06 Task 5 Step 8)

Status: ⬜ pending · 🟡 in progress · ✅ green

---

## SC#3 — Universal Links / App Links OAuth round-trip

> **ROADMAP verbatim:** Universal Links / App Links round-trip: deep-link `milespro://auth/callback?code=...` (and the HTTPS analog via AASA) re-opens the iOS app, completes PKCE exchange, and lands an authenticated Capacitor session. Android equivalent via assetlinks.json.

**Evidence:**
- [ ] AASA payload deployed at https://app.milespro.net.br/.well-known/apple-app-site-association with valid appIDs: _<date>_ (Plan 03-03 Task 1 + smoke-deeplinks.sh CI green)
- [ ] assetlinks.json deployed at https://app.milespro.net.br/.well-known/assetlinks.json with valid package_name + 2 SHA-256 fingerprints: _<date>_ (Plan 03-03 Task 1)
- [ ] deepLinkHandler.ts unit tests + strict host allowlist green: _<date>_ (Plan 03-03 Task 3)
- [ ] TestFlight walkthrough Step 3 (Sign In with Apple Universal Link round-trip) PASSED: _<date>_ (Plan 03-07 Task 4)
- [ ] Android App Links verified via `adb shell pm verify-app-links --re-verify br.com.milespro.app` on a real Pixel device: _<output>_ at: _<date>_

Status: ⬜ pending · 🟡 in progress · ✅ green

---

## SC#4 — Push payload delivers Pro+ to device within 30s + Free user gated

> **ROADMAP verbatim:** Push payload from `send-vencimento-alert` cron with fake 30-day-out expires_at row → APNs/FCM delivers within 30s on Pro user device; tapping deep-links to the program screen; Free user receives NO push (gated at enqueue by `has_plan('pro')`).

**Evidence:**
- [ ] push_subscriptions migration applied: _<date>_ (Plan 03-04 Task 4 + Lovable Cloud deploy in Plan 03-04 Task 11)
- [ ] enqueue-push has_plan('pro') gate verified via Deno test + push.adversarial.test.ts integration test: _<date>_ (Plan 03-04 Task 5 + Plan 03-05 Task 7)
- [ ] End-to-end smoke (TestFlight Step 10): real promo INSERT → cron fanout → FCM/APNs delivery → tap → React Router navigate to /promocoes within 30 seconds: _<timestamp>_ (Plan 03-07 Task 4)
- [ ] Free user adversarial: invoke enqueue-push with event_type='promo_alert' as a Free user JWT → returns 403 plan_required: _<timestamp>_ (curl smoke; Plan 03-04 Task 5 test scenario validated against live deploy)

Status: ⬜ pending · 🟡 in progress · ✅ green

---

## SC#5 — LAUNCH-06: 10 distinct paying CPFs + helpdesk SLA + no open CRITICAL

> **ROADMAP verbatim:** Asaas dashboard shows 10 distinct CPFs each with at least one PAYMENT_RECEIVED event (first invoice PAID, not trial). PostHog funnel report matches. Helpdesk SLA respected on inbound tickets. No open CRITICAL pitfall.

**Evidence:**
- [ ] Asaas dashboard query: distinct CPFs with PAYMENT_RECEIVED count = 10: _<date>_ (Plan 03-08 Task 3 SLA tracker per-customer table fully filled)
- [ ] PostHog funnel for cycle window shows paid_first_invoice events ≥ 10: _<date>_ (Plan 03-08 Task 3 cross-check)
- [ ] All week-1 inbound tickets responded within 24h: _<date>_ (Plan 03-08 Task 3 SLA tracker zero breach rows)
- [ ] PITFALLS.md CRITICAL findings audit: _<date>_ — all status≠"open"
  - CRIT-01 (plan gating client-side) — Phase 1 closed (per STATE.md)
  - CRIT-02 (service-role key in client) — Phase 1 closed
  - CRIT-03 (Apple IAP 3.1.1) — closed by SC#1 above
  - CRIT-04 (webhook idempotency) — closed by Plan 02-05 W2a (verified smoke post-deploy)
  - CRIT-05 (LGPD 15-day DSR) — Phase 2 closed
- [ ] No chargebacks within first 30 days of LAUNCH-06: _<date>_

Status: ⬜ pending · 🟡 in progress · ✅ green

---

## Closeout Sign-off

When all 5 criteria above are ✅ GREEN:

- [ ] All 5 ROADMAP success criteria GREEN
- [ ] PROJECT.md updated with "v1.0 cycle complete" status
- [ ] STATE.md milestone bumped from "v1.0" to "v1.1 post-launch iteration"
- [ ] Retrospective scheduled with founder + key contributors

**Founder signature:** _<name + date>_

---

## Post-Closeout Next Steps

Once cycle closes:
1. Generate `.planning/RETROSPECTIVE.md` entry covering the v1.0 cycle (what worked, what was inefficient, key lessons)
2. Re-evaluate deferred items (e.g., paid ads, Configurações LGPD UI buttons, App Widget) for v1.1
3. Plan v1.1 cycle: data-driven from week-2/3 customer feedback + churn signal
4. Consider scaling: outsource helpdesk if ticket volume > 10/day; hire content strategist if outreach saturates
```

**4.2 — Convention enforcement:**
- 5 ROADMAP success criteria quoted VERBATIM (planner-source-audit "highest-numbered plan carries phase must_haves")
- Each criterion has a dedicated H2 + Evidence checklist + Status indicator
- Sign-off section requires all 5 GREEN before founder signs
- Post-Closeout points the next plan (v1.1 RETROSPECTIVE.md)
- pt-BR not applicable (this is a planning artifact)
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const r=fs.readFileSync('.planning/phases/03-mobile-distribution-launch/03-08-LAUNCH-06-CLOSEOUT.md','utf8'); const req=[['SC#1','criterion 1'],['SC#2','criterion 2'],['SC#3','criterion 3'],['SC#4','criterion 4'],['SC#5','criterion 5'],['strings dist/assets','SC1 verbatim grep'],['targetSdk = 35','SC2 verbatim'],['milespro://auth/callback','SC3 verbatim'],['send-vencimento-alert','SC4 verbatim'],['10 distinct CPFs','SC5 verbatim'],['PAYMENT_RECEIVED','SC5 Asaas event'],['paid_first_invoice','SC5 PostHog event'],['No open CRITICAL pitfall','SC5 pitfall criterion'],['Founder signature','sign-off']]; let fail=false; for (const [n,w] of req){if(!r.includes(n)){console.error('FAIL: closeout missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: launch-06 closeout');"</automated>
  </verify>
  <done>
    03-08-LAUNCH-06-CLOSEOUT.md has 5 H2 sections with verbatim ROADMAP success criteria + evidence checklists + status indicators + founder sign-off section + post-closeout next steps.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 5: [BLOCKING] Founder week-1 operational execution + LAUNCH-06 sign-off</name>
  <files>.planning/phases/03-mobile-distribution-launch/03-08-WEEK-1-SLA-TRACKER.md, .planning/phases/03-mobile-distribution-launch/03-08-LAUNCH-06-CLOSEOUT.md</files>
  <read_first>
    - All four 03-08-*.md runbooks (Tasks 1-4)
  </read_first>
  <what-built>
    All 4 runbooks committed in tasks 1-4. This checkpoint is the founder executing them daily over the cycle window (typically 4-6 weeks) and signing off when LAUNCH-06 closes.
  </what-built>
  <how-to-verify>
    Daily during the cycle window:
    1. Crisp + WhatsApp inbox triage per `03-08-HELPDESK-RUNBOOK.md` Daily Check-in section (~09:00 + ~22:00 BRT)
    2. Outreach actions per `03-08-OUTREACH-PLAYBOOK.md` Phase schedule
    3. Tracker update per `03-08-WEEK-1-SLA-TRACKER.md` daily-tally table

    Cumulative until 10th distinct paying CPF lands:
    1. Update `03-08-LAUNCH-06-CLOSEOUT.md` SC#1..#5 evidence rows as each gate goes GREEN
    2. Cross-check Asaas + PostHog counts weekly via `03-08-WEEK-1-SLA-TRACKER.md` reconciliation
    3. Trigger CRITICAL escalation per `03-08-HELPDESK-RUNBOOK.md` escalation triggers if any threshold hit

    Sign-off when:
    - [ ] All 5 ROADMAP SC GREEN in `03-08-LAUNCH-06-CLOSEOUT.md`
    - [ ] Founder signature line filled
    - [ ] Update PROJECT.md + STATE.md milestone status
    - [ ] Schedule retrospective
  </how-to-verify>
  <resume-signal>
    Reply: "LAUNCH-06 closed — 10th paying CPF reached on <date>. Closeout document signed. Schedule retrospective." OR provide status update if mid-cycle.
  </resume-signal>
  <acceptance_criteria>
    - `03-08-LAUNCH-06-CLOSEOUT.md` has all 5 SC sections marked ✅
    - Founder signature populated
    - `03-08-WEEK-1-SLA-TRACKER.md` per-customer table has 10 filled rows
    - PROJECT.md updated with v1.0 cycle complete status
  </acceptance_criteria>
  <done>
    LAUNCH-06 closed: 10 distinct paying CPFs in Asaas with PAYMENT_RECEIVED + PostHog funnel matches + helpdesk SLA respected + no open CRITICAL pitfall. Founder signs `03-08-LAUNCH-06-CLOSEOUT.md`. Phase 3 + v1.0 milestone complete.
  </done>
</task>

</tasks>

<threat_model>
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-3-06 | Denial of Service (operational) | Refund/dispute storm in week-1 of LAUNCH-06 → operational meltdown + Asaas account freeze (1% dispute rate threshold) | mitigate | (a) Task 1 helpdesk runbook with top-5 ticket templates + dispute-defense pre-writes. (b) Task 2 outreach playbook with proactive week-1 WhatsApp to each first-10 customer. (c) Task 3 SLA tracker daily check-in. (d) Plan 02-04 LAUNCH-05 Crisp already live + Termos §4 7-day guarantee published. (e) Escalation triggers in Task 1 stop the line at 3 chargebacks in 30 days. |
| T-3-06b | Repudiation | Customer disputes charge claiming "didn't authorize" — Asaas auto-refunds if no defense submitted within 7 days | mitigate | Task 1 dispute defense template ready; founder monitors Asaas dashboard daily per Task 3 routine. |
| T-3-06c | Tampering | A bad outreach post in a community gets group banned → loss of acquisition channel | accept (manual judgment) | Task 2 explicit "read group rules" warning + 1 post per group per week max. If banned: move to next community; do not appeal (low ROI). |
| T-3-06d | Information Disclosure | Helpdesk responses leak PII (e.g., quoting CPF in chat history) | mitigate | Task 1 canned responses use placeholders ("seu email cadastrado"), not actual PII. Crisp chat history is owned by founder; deleted on customer request per LGPD Art. 18. |
</threat_model>

<verification>
```bash
# All 4 runbooks committed
test -f .planning/phases/03-mobile-distribution-launch/03-08-HELPDESK-RUNBOOK.md
test -f .planning/phases/03-mobile-distribution-launch/03-08-OUTREACH-PLAYBOOK.md
test -f .planning/phases/03-mobile-distribution-launch/03-08-WEEK-1-SLA-TRACKER.md
test -f .planning/phases/03-mobile-distribution-launch/03-08-LAUNCH-06-CLOSEOUT.md

# Closeout document has all 5 SC sections + verbatim refs
grep -c 'SC#' .planning/phases/03-mobile-distribution-launch/03-08-LAUNCH-06-CLOSEOUT.md
# Expected: at least 5 (one per criterion)

# Helpdesk runbook has all 5 ticket templates
grep -c 'Canned response' .planning/phases/03-mobile-distribution-launch/03-08-HELPDESK-RUNBOOK.md
# Expected: at least 5

# Outreach playbook has 3 phases
grep -E '^## Phase [1-3]' .planning/phases/03-mobile-distribution-launch/03-08-OUTREACH-PLAYBOOK.md | wc -l
# Expected: 3
```
</verification>

<success_criteria>
- 03-08-HELPDESK-RUNBOOK.md: top-5 canned responses pt-BR + Crisp triage rules + dispute templates + daily routine + escalation triggers
- 03-08-OUTREACH-PLAYBOOK.md: 3-phase plan (orgânico + influencer + proactive) + community list + post templates + influencer outreach email + customer follow-up templates
- 03-08-WEEK-1-SLA-TRACKER.md: daily tally template + per-customer table for 10 + critical incidents log + Asaas/PostHog reconciliation
- 03-08-LAUNCH-06-CLOSEOUT.md: 5 verbatim ROADMAP success criteria + evidence checklists + status + sign-off
- [BLOCKING] manual: LAUNCH-06 closed; 10 distinct paying CPFs in Asaas with PAYMENT_RECEIVED; founder sign-off on closeout document
</success_criteria>

<output>
After completion, create `.planning/phases/03-mobile-distribution-launch/03-08-SUMMARY.md` documenting:
- LAUNCH-06 close date (10th paying CPF timestamp)
- Average time-to-first-payment (signup → PAYMENT_RECEIVED median)
- Total ticket volume during week-1 + average response time
- Outreach attribution: % from orgânico vs influencer vs direct
- Critical incidents (if any) + RCA + fix
- Cycle retrospective summary (links to RETROSPECTIVE.md once written)
- Next cycle (v1.1) candidate ideas from customer feedback
</output>