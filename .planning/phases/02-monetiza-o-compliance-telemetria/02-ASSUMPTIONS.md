---
phase: 02-monetiza-o-compliance-telemetria
phase_name: "Monetização, Compliance & Telemetria"
authored: 2026-05-12
author: gsd-assumptions-analyzer (Claude Opus 4.7, 1M context)
calibration_tier: full_maturity
requirements_in_scope:
  - PAY-01..PAY-08 (8)
  - TIER-01..TIER-06 (6)
  - TEL-01..TEL-03 (3)
  - COMPL-01..COMPL-06 (6)
  - LAUNCH-01, LAUNCH-04, LAUNCH-05 (3)
total_reqs: 26
status: ready_for_user_confirmation
---

# Phase 2 — Gray Areas / Assumptions Map

> Identifica as decisões A/B/C que precisam ser fechadas **antes** de
> `/gsd-plan-phase 2` poder produzir planos executáveis. Cada item tem
> recomendação default (justificada) e dependências em cascata.
>
> **Princípio de seleção:** só listar onde a decisão muda materialmente
> o escopo, a arquitetura, ou o conjunto de plans. Decisões já travadas
> em `PROJECT.md` Key Decisions / `SUMMARY.md` §2 não reaparecem aqui.
>
> **Phase 1 entry assumptions (já validadas):** trust kernel `has_plan()` +
> `can_access_account()` deployados em prod; enum `{free,pro,vip}` canônico;
> `managed_accounts` table + RLS prontos; `failOnSecretLeak()` Vite plugin
> ativo; service-role legacy desabilitada em prod 2026-05-12T21:47:41Z;
> `subscription_leads` table existe.
>
> **Phase 1 carry-over que afeta Phase 2 entry:**
> - **AR-2** (`vite.config.ts:71-74`): JWT anon legacy hardcoded reintroduzido
>   por commit Lovable Cloud. Phase 2 deve deletar antes de adicionar novos
>   secrets do Asaas (sob risco de mascarar configuração quebrada).
> - **AR-3**: Deno test CI wiring pendente — pre-req para testar Asaas webhook.
> - **AR-4**: cobertura adversarial `vip_*` é estrutural — Phase 2 TIER-04/06
>   precisa adicionar quando criar novas tabelas `vip_*`.
> - **DPO email pendente**: `Privacidade.tsx:127` ainda usa `suporte@milespro.net.br`,
>   não `dpo@milespro.net.br` exigido em COMPL-06.

---

## Sumário das Gray Areas

| # | ID | Categoria | Decisão | Default | Bloqueia |
|---|----|-----------|---------|---------|----------|
| 1 | PRICE-01 | pricing | Pro mensal R$19,90 vs R$29,90 vs manter R$37,90 atual | C (manter R$37,90) | PAY-04, PAY-07, LAUNCH-04, TEL-02 |
| 2 | PRICE-02 | pricing | Anual ~17% off vs 20% off (paridade landing) vs estrutura 3-tier | B (anual 20% + semestral 10%) | PAY-07, PAY-04 |
| 3 | PRICE-03 | pricing | Trial 7d Pro card-on-file vs 14d sem cartão (Termos atual) | A (7d com cartão) | PAY-06, COMPL-05 |
| 4 | INFRA-01 | infra | Supabase region: migrar pra sa-east-1 vs ficar + documentar SCC | B (ficar + SCC) | COMPL-04 |
| 5 | INFRA-02 | infra | Hosting: Vercel Hobby vs Cloudflare Pages vs Lovable Cloud | A (Vercel) | LAUNCH-01, MOBILE-03 |
| 6 | INFRA-03 | infra | Domínio: app.milespro.net.br vs single domain | A (subdomínio app.*) | LAUNCH-01, COMPL-04, PAY-02 |
| 7 | TECH-01 | tech | Asaas: Subscriptions API vs Charges API | A (Subscriptions) | PAY-01..03 |
| 8 | TECH-02 | tech | Source of truth: Asaas + webhook → DB vs DB + reconcile | A (Asaas SoT) | PAY-02, PAY-03 |
| 9 | TECH-03 | tech | Reconciliation cron: pg_cron + edge fn vs GH Actions vs none | A (pg_cron) | PAY-03 |
| 10 | TECH-04 | tech | iOS Path C: runtime via Capacitor vs build-time env | A (runtime) | TIER-01..06 UI |
| 11 | SCOPE-01 | scope | Reescrever Assinatura/Index pricing vs substituir CTA mantendo shell | B (substituir CTA) | PAY-04, LAUNCH-04 |
| 12 | SCOPE-02 | scope | TIER-01 Free limit: 3 prog/5 contas (research) vs 1 prog (atual) | A (3/5) | TIER-01, TIER-02 |
| 13 | SCOPE-03 | scope | TIER-03 killer Pro: alerta promoção personalizado incluído? | A (incluir) | TIER-03, PAY-04, TEL-01 |
| 14 | SCOPE-04 | scope | MRR dashboard: refactor mrr-dashboard existente vs rewrite | B (rewrite) | TEL-02, PAY-03 |
| 15 | SCOPE-05 | scope | VIP sales: self-serve Asaas vs WhatsApp fallback | A (self-serve) | PAY-04, LAUNCH-05 |
| 16 | COMPL-A | compliance | Consent banner: in-house vs CMP terceiro | A (in-house) | COMPL-03, TEL-01 |
| 17 | COMPL-B | compliance | Sub-processadores em /privacidade: atualizar lista (Stripe → Asaas etc) | A (atualizar) | COMPL-04, LAUNCH-04 |
| 18 | COMPL-C | compliance | LGPD delete: hard imediato vs soft + 7d window + cron | B (soft + cron) | COMPL-02, PAY-05 |
| 19 | COMPL-D | compliance | Refund: 7d incondicional vs 14d vs sem garantia | A (7d) | LAUNCH-05, PAY-06 |
| 20 | COMPL-E | compliance | DPO email: dpo@milespro.net.br dedicado vs suporte@ | A (dedicado) | COMPL-06, COMPL-04 |
| 21 | SEQ-01 | sequencing | PJ blocker: waves desacopladas vs full block vs sandbox CPF | A (waves) | toda Phase 2 |
| 22 | SEQ-02 | sequencing | NFS-e PAY-08: incluir v1 (bundle Asaas) vs deferir | A (incluir) | PAY-08 |
| 23 | SEQ-03 | sequencing | Helpdesk: Crisp free vs Front vs só email | A (Crisp free) | LAUNCH-05 |
| 24 | SEQ-04 | sequencing | Resend: domain noreply@milespro.net.br vs default | A (custom) | COMPL-02, PAY-02, LAUNCH-04 |

**Total:** 24 gray areas. 20 com recomendação A; 4 com B/C onde default contradiz interpretação ingênua.

---

## Categoria: PRICING

### PRICE-01 — Pro mensal: R$19,90 / R$29,90 / R$37,90?

**Question:** Qual o preço de catálogo do plano Pro mensal?
- **A:** R$19,90/mês — research §3 "break-even point @ 10 users"
- **B:** R$29,90/mês — research §3 "mais sustentável long-term"
- **C:** R$37,90/mês — preço atual já publicado em `src/pages/Assinatura.tsx:74`
  e `src/pages/Index.tsx:182` (landing)

**Why it matters:** Define o produto que o Asaas vai criar (PAY-01), o número
exibido em LAUNCH-04 landing, e a base do MRR em TEL-02. Mudar preço pós-launch
tem fricção (precisa avisar com 30 dias por Termos §4).

**Recommended default: C (R$37,90)**

**Rationale:** A landing E a página de assinatura já mostram R$37,90 — usuários
em sessão atual já viram esse preço. R$19,90 não estava na decisão original do
SUMMARY (foi proposta de research, não confirmada). Manter R$37,90 evita
revisar `Assinatura.tsx`, `Index.tsx`, e mensagens-âncora ("uma emissão paga
vários meses"). VIP segue R$67,90 (coerente com codebase atual). Se PO quiser
baixar pra R$19,90 pra testar conversion, isso é pivot de marketing em phase
pós-launch.

**Cascading:** Define `Asaas.Subscription.value`; afeta cálculo de break-even
em LAUNCH-06; define copy de TrustMetrics; afeta TIER-04 limites (manter "Pro 1
perfil" justifica R$37,90 vs VIP 5 perfis).

**Confidence:** Likely.

---

### PRICE-02 — Estrutura de planos anuais

**Question:** Manter 3 ciclos (mensal/semestral/anual) com -10%/-20% que já
estão em `Assinatura.tsx` e `Index.tsx`, ou simplificar para mensal/anual com
~17% off (research recommendation)?
- **A:** Mensal + Anual com ~17% off (SUMMARY §3)
- **B:** Mensal + Semestral -10% + Anual -20% (atual)
- **C:** Só mensal

**Why it matters:** Define quantos "produtos" criar no Asaas (2 vs 3 por tier).
Pro 3-ciclos = 3 Asaas products; VIP 3-ciclos = 3 = **6 produtos totais**.
Toggle anual/mensal em `/planos` (PAY-04) depende disso.

**Recommended default: B (3 ciclos)**

**Rationale:** Já implementado e visível em
`Assinatura.tsx:162-207`, `Index.tsx:53`. Trocar é regressão visual + perda de
variante (semestral é forte em BR como "meio-termo"). Custo extra é apenas mais
2 IDs no Asaas — não muda arquitetura de webhook.

**Cascading:** Define quantos `asaas_product_id` salvar em `user_subscriptions`;
define toggle em `<PricingSection>`; afeta migration de `user_subscriptions`
para adicionar `billing_period` se não tiver (verificar em Phase 2 W0).

**Confidence:** Confident.

---

### PRICE-03 — Trial period

**Question:** Trial 7d Pro com card-on-file vs 14d sem cartão (atual em
`Termos.tsx:69-72`)?

**Recommended default: A (7d com card-on-file)**

**Rationale:** Já é Key Decision travada em `PROJECT.md`. Termos.tsx menciona
14d sem cartão — **isso é inconsistência de Termos a corrigir em COMPL-05
(W1)**. Research §HIGH-01 explica: card-on-file bloqueia abuso de múltiplas
contas; Asaas refusa segundo trial no mesmo customer.

**Cascading:** `Termos.tsx` precisa ser reescrito (COMPL-05 task); Asaas
Subscription criada com `trialDays=7`; PAY-06 plan inclui "period of grace
3-7d" em falha de pagamento; messaging em PAY-04 deve dizer "7 dias grátis,
cobramos automaticamente — cancele a qualquer momento".

**Confidence:** Confident (Key Decision — listado aqui só para sinalizar
inconsistência em Termos.tsx).

---

## Categoria: INFRA

### INFRA-01 — Supabase region

**Question:** Migrar projeto `opusftqbbaozucmbuuug` de região atual (us-east-*
provável) para `sa-east-1` antes de Phase 2, ou ficar e documentar transferência
internacional com cláusulas SCC?

**Recommended default: B (ficar + documentar SCC)**

**Rationale:** Migrar projeto Supabase em produção implica downtime/clonagem +
re-deploy de edge functions + atualizar URLs em DNS + recriar secrets + revogar
publishable key. Phase 1 acabou de deploy 8 migrations + RLS. Custo de migração
agora >> benefício. SCC é solução válida sob LGPD Art. 33 e ANPD orientação;
research §6 lista Supabase como sub-processador conhecido.

**Cascading:** `Privacidade.tsx` precisa de seção "Transferência Internacional"
expandida (já tem §10 modelo); COMPL-04 plan inclui SCC clause; revisar
Asaas Pix routing latency (Asaas é BR, Supabase é US → primary trip BR→US;
aceitável para webhook + REST).

**Confidence:** Likely.

---

### INFRA-02 — Hosting web em produção

**Question:** Onde hospedar o build de `app.milespro.net.br`?
- **A:** Vercel Hobby (free)
- **B:** Cloudflare Pages (free)
- **C:** Continuar em Lovable Cloud com domain redirect

**Why it matters:** LAUNCH-01. Asaas webhook precisa URL HTTPS estável;
Universal Links + App Links (Phase 3) dependem de domínio fixo controlado;
AR-2 (vite.config.ts JWT fallback) existe **porque** Lovable não injeta VITE_*
— sair de Lovable resolve o issue.

**Recommended default: A (Vercel Hobby)**

**Rationale:** Vercel tem suporte nativo a Vite + React melhor que Cloudflare;
preview deployments por PR; edge runtime se precisarmos rodar middleware
serverless (PAY-04 redirect lógica iOS-aware); free tier suficiente pro ciclo.
Cloudflare Pages é boa alternativa mas DX é pior para Vite SSG. Lovable não
resolve AR-2.

**Cascading:** Define DNS records; afeta `capacitor.config.ts` `server.url` em
Phase 3; define onde rodar edge functions auxiliares; resolve AR-2 (ao sair do
Lovable Cloud publish pipeline, `failOnSecretLeak()` pode rodar strict mode
novamente).

**Confidence:** Likely.

---

### INFRA-03 — Domain strategy

**Question:** Como dividir o produto entre landing + app?
- **A:** `milespro.net.br` (landing) + `app.milespro.net.br` (SPA + auth)
- **B:** `milespro.net.br/` (landing) + `milespro.net.br/app` (SPA) single domain
- **C:** Tudo em `app.milespro.net.br` incluindo landing pública

**Recommended default: A (subdomínio app.*)**

**Rationale:** PROJECT.md já marca `app.milespro.net.br` como decision.
Separação landing/app permite landing em CMS estático futuro; OAuth callbacks
ficam isolados em `app.*`; Asaas webhook URL fica em
`https://app.milespro.net.br/functions/v1/asaas-webhook`.

**Cascading:** Resend deve verificar **ambos** os domínios (DKIM/DMARC); Asaas
webhook URL definida; Universal Links (Phase 3) usam `app.*`; landing em
`milespro.net.br` precisa ter redirect /auth → app.milespro.net.br/auth; CORS
allowlist em edge functions deve incluir AMBOS.

**Confidence:** Confident (Key Decision listada, marcada "Revisit (confirmar
registro)" — só falta confirmar que o domínio foi adquirido).

---

## Categoria: TECH

### TECH-01 — Asaas API model: Subscriptions vs Charges

**Question:** Usar Asaas Subscriptions API (recorrência nativa) ou Asaas
Charges API (criar charge manual via cron)?

**Recommended default: A (Subscriptions API)**

**Rationale:** Asaas Subscriptions já implementa: trial period (`trialDays`),
recurrence (`cycle: MONTHLY/SEMIANNUALLY/YEARLY`), automatic retry em falha,
billing portal nativo (PAY-05). Charges API seria reinventar a roda. Único
contra: Subscriptions API tem menos flexibilidade para upgrades proporcionais
(Pro→VIP no meio do ciclo). Mitigation: cancelar Sub atual + criar nova com
prorate calculado manualmente.

**Cascading:** Define que `asaas-webhook` ouve eventos `SUBSCRIPTION_*` +
`PAYMENT_*` (não `CHARGE_*`); `create-checkout-session` chama `POST
/v3/subscriptions`; PAY-07 (anual) mapeia direto pra `cycle: YEARLY`; PAY-06
(trial) mapeia pra `trialDays: 7` — Asaas requer card-on-file pra Subscription
com trial.

**Confidence:** Confident.

---

### TECH-02 — Source of truth: Asaas vs DB

**Question:** Quando há divergência entre `user_subscriptions.plan` (DB) e
status na Asaas, qual vence?
- **A:** Asaas = SoT; DB é read-replica atualizada via webhook + cron
- **B:** DB = SoT; cron envia updates a Asaas

**Recommended default: A (Asaas = SoT)**

**Rationale:** Research §4.2 + ARCHITECTURE.md §4 explicitam: "Asaas is source
of truth; local `user_subscriptions` is read-replica + daily reconciliation
cron". Asaas é quem processa pagamento real — DB nunca vai saber primeiro.
Padrão de SaaS maduro. Trade-off: split-brain (Asaas paid mas webhook não
chegou) fica com lag até 60s — aceitável.

**Cascading:** Define que **nenhum código frontend** pode escrever em
`user_subscriptions.plan` (apenas read); webhook é o ÚNICO writer; existe
um cron `pg_cron` que lê `GET /v3/subscriptions` e compara com DB
diariamente; RLS em `user_subscriptions` (Phase 1 já tem só SELECT policy —
manter); LGPD delete (COMPL-02) precisa cancelar Asaas customer + dar tempo
de webhook processar antes de hard-delete DB row.

**Confidence:** Confident.

---

### TECH-03 — Reconciliation cron infrastructure

**Question:** Onde rodar o cron de reconciliação diária Asaas↔DB?
- **A:** `pg_cron` (Supabase extension) chamando edge function via
  `net.http_post`
- **B:** GitHub Actions cron schedule
- **C:** Pular reconciliação no v1

**Recommended default: A (pg_cron + edge fn)**

**Rationale:** `pg_cron` já disponível em Supabase Pro (que vai estar ativo per
Key Decision); roda dentro do mesmo plano de produção, sem dependência
externa. GitHub Actions tem latência de agendamento (até 30min off-schedule).
Pular reconcile é arriscado: webhooks falham (1-2% rate típica) e drift
acumula.

**Cascading:** Cria migration que `SELECT cron.schedule('asaas-reconcile', '0
3 * * *', 'SELECT net.http_post(...)')`; edge function `asaas-reconcile` deve
ser idempotente; alerta Sentry se drift > 5% rows; afeta TEL-02 dashboard que
mostra "última reconciliação".

**Confidence:** Likely.

---

### TECH-04 — iOS Path C: build-time vs runtime detection

**Question:** Como esconder UI de pricing/checkout no iOS app?
- **A:** Runtime via `Capacitor.getPlatform() === 'ios'` (mesma bundle)
- **B:** Build-time via env var `VITE_PLATFORM_IOS=true` (bundles separadas)

**Why it matters:** Apple reviewer vai testar **a bundle iOS instalada**.
CRIT-03 risk: qualquer referência a `/planos`, `R$`, "Upgrade", link de
checkout = rejection. Phase 3 verification é `strings MilesPro.app | grep -E
'planos|checkout|R\$|Upgrade'` returning **zero**.

**Recommended default: A (runtime)**

**Rationale:** Build-time (B) garante zero strings na bundle iOS mas requer
manter 2 bundles em CI (complexidade alta para solo dev). Runtime (A) permite
uma única codebase + tree shake via `if (Capacitor.getPlatform() === 'ios')
return null` + dynamic import. Trade-off A: strings residuais (Vite minifica
but not elide). Mitigation: Phase 3 verify ALÉM de `strings`: walkthrough manual
em TestFlight + reviewer notes citando 3.1.3(b).

**Cascading:** `Assinatura.tsx`, `Index.tsx` PricingSection, `UpgradeBanner.tsx`
precisam de `useIsIOSCapacitor()` hook; Phase 3 herda verificação; deep links
em emails de Asaas (PAY confirmation) precisam apontar pra `https://app.milespro.net.br/...`
mesmo no iOS (não Universal Link de volta ao app, senão CRIT-03 risk).

**Confidence:** Likely. Apple historicamente accepted runtime branching para
Multiplatform Services (Spotify, Netflix); mas Phase 3 testing é load-bearing.

---

## Categoria: SCOPE

### SCOPE-01 — Reescrever `Assinatura.tsx` + `Index.tsx` pricing section

**Question:** CTA atual em ambas as páginas envia WhatsApp manual
(`createSubscriptionLead` + `wa.me/...`). Para PAY-04:
- **A:** Reescrever ambas do zero, removendo subscription_leads pipeline
- **B:** Manter shell visual; substituir handler `handlePlanCta` por chamada a
  edge function `create-checkout-session`; deixar subscription_leads como
  fallback se Asaas falhar

**Recommended default: B (substituir CTA, manter shell)**

**Rationale:** Página já está bem design-validated (3 ciclos toggle, comparison
table, FAQs); reescrever é trabalho desnecessário. Trocar **só** o handler de
`handlePlanCta` em `Assinatura.tsx:226-302` por chamada a Asaas; e em
`PricingSection` da landing (`AnimatedSections.tsx`) por mesma chamada.
subscription_leads é mantido como **shadow log** para casos de erro.
**Importante:** `Index.tsx:181-232` ainda usa nome "Plus" (legacy); precisa ser
renomeado para "Pro" pra consistência com Phase 1 enum consolidation.

**Cascading:**
- delete `VITE_SALES_WHATSAPP` env var no end-state
- delete `VITE_ENABLE_SUBSCRIPTION_LEADS` flag
- rename "Plus" → "Pro" em `Index.tsx:181-232` + `comparisonFeatures` array
- ToS update: `Termos.tsx:69` ainda menciona "Plus e Pro" (precisa virar "Pro e VIP")
- helpdesk runbook (LAUNCH-05) precisa explicar fluxo se Asaas falhar
- FAQs em `Assinatura.tsx:123` precisa atualizar "diferença entre Pro e VIP"

**Confidence:** Confident.

---

### SCOPE-02 — TIER-01: Free limit

**Question:** Limite Free é "3 programas / 5 contas" (research §3) ou "1
programa / 20 ops/mês" (atual em `useSubscription.ts:131-137`)?
- **A:** 3 programas / 5 contas (research)
- **B:** 1 programa (atual)
- **C:** Outro N (e.g. 2 programas)

**Why it matters:** TIER-01 SC #3 ROADMAP: "Free user attempts creating a 4th
programa via direct REST returns 403 with 'free_plan_limit_exceeded' code".
Define o número de policy RLS check.

**Recommended default: A (3 programas / 5 contas)**

**Rationale:** Research argumenta que 1 programa é dolorosamente limitado
("instant 1-star review" — FEATURES.md anti-pattern); 3 é o sweet spot. **Mas:**
mudar de 1 → 3 é loosening (todo Free atual vira "compatível"). Direção oposta
seria breaking change requerendo grandfather.

**Cascading:** Migration `UPDATE max_programs=3 WHERE plan='free'`;
`useSubscription.ts:133` muda `maxPrograms: 1` → `maxPrograms: 3`; RLS policy
`user_programs` precisa checar `count < max_programs` (adicionar em Phase 2 W1);
UpgradeBanner em `Configuracoes.tsx` muda copy. Também define "5 contas" =
`program_accounts` limit.

**Confidence:** Likely.

---

### SCOPE-03 — TIER-03 killer Pro feature

**Question:** Pro inclui "alerta de promoção de transferência personalizado"
(Livelo→Smiles bonus tied to user balance) como feature distintiva?

**Recommended default: A (incluir, é o pilar da diferenciação Pro)**

**Rationale:** Research §3 / SUMMARY §3 marcam como ⭐ killer feature: "Without
this, R$19,90 (or R$37,90) is 'porque sim'". Sem isso, Pro fica indistinguível
de "Free com limite maior". **Mas:** implementar feature inteira em Phase 2 é
escopo grande.

**Cascading:** Se A, precisa:
- edge function `fetch-promotions` já existe, estender pra correlacionar com
  `user_programs` balances
- novo evento PostHog `promotion_alert_shown` / `promotion_alert_clicked` para TEL-01
- nova route `/promocoes` ou seção no Dashboard
- impact em landing/Assinatura copy: "Avisamos quando Livelo→Smiles está com bônus"

Se deferido: marca explícito em `deferred-items.md` e diferenciação Pro vira
"atualização automática de saldos + alertas avançados de vencimento".

**Confidence:** Unclear. Research recomenda forte mas é escopo significativo
pra entregar em uma phase já lotada.

---

### SCOPE-04 — MRR dashboard data source

**Question:** TEL-02 admin dashboard é construído sobre:
- **A:** Edge function `mrr-dashboard` existente (refactor in-place; tem
  prices legacy `'basic': 29.90, 'plus': 37.90, 'pro': 67.90, 'pro_familia':
  149.90`)
- **B:** Rewrite do zero usando Asaas API + `user_subscriptions` consolidado

**Recommended default: B (rewrite)**

**Rationale:** Edge function existente usa prices legacy que não existem mais
em produção (enum collapsed em Phase 1); refatorar é tão grande quanto
reescrever. Reescrita aproveita `Asaas.listSubscriptions` + agrupa por status,
fornecendo verdadeiro MRR (não soma de prices declarados em DB).

**Cascading:** Drop `PLAN_PRICES` const; chamar Asaas `/v3/subscriptions?status=ACTIVE`
paginado; calcular MRR como `sum(value / cycle_months)`; expor cohort metrics
(signup → trial start → paid → cancelled) via PostHog query API; rota
`/admin/metrics` deve ser gated por role check em DB (criar `is_admin` em
`profiles` ou tabela `admin_users`).

**Confidence:** Likely. Existem edge cases (refunds, prorations) que research
não detalha — pode precisar iteração pós-launch.

---

### SCOPE-05 — VIP sales channel

**Question:** VIP é vendido via self-serve Asaas (mesmo que Pro) ou tem canal
humano (WhatsApp / call)?

**Recommended default: A (self-serve unified)**

**Rationale:** Já é Key Decision travada em PROJECT.md. Listado aqui só para
sinalizar que isso bloqueia o uso de `VITE_SALES_WHATSAPP` (que existe hoje
em `.env.example:6`) — em Phase 2 essa env var morre.

**Cascading:** Deletar `VITE_SALES_WHATSAPP` reference de `Assinatura.tsx:249`;
deletar fallback WhatsApp em `handlePlanCta`; `subscription_leads` continua
existindo apenas como audit log (não como pipeline ativo).

**Confidence:** Confident (Key Decision).

---

## Categoria: COMPLIANCE

### COMPL-A — Consent banner: build vs CMP

**Question:** Cookie/analytics consent banner é construído in-house ou usa CMP
de terceiro (OneTrust/Cookiebot)?

**Recommended default: A (build in-house)**

**Rationale:** Research §2 + §STACK.md: "LGPD CMP: Build in-house (banner +
DSR endpoints + DPO email) HIGH confidence; Third-party CMP overkill at 10
users". CMPs cobram a partir de ~$20/mês + setup; in-house é ~200 LOC React +
tabela `user_consents` + 1 hook `useConsent()`. ANPD não exige CMP específico
— exige consentimento granular (LGPD Art. 8 §4: opt-in separado para cada
finalidade), o que in-house entrega. Confirmado: `Grep CookieConsent` em
`src/` retorna **0 arquivos** — nada existe ainda.

**Cascading:** Componente `<ConsentBanner>` em `src/components/legal/`;
migration cria `public.user_consents (user_id, analytics_opted_in,
marketing_opted_in, terms_accepted_at, privacy_accepted_at, consent_version,
created_at)`; PostHog mock em `src/lib/posthog.ts:1-46` reescrito para ler
`useConsent()` antes de `init()`; Sentry mantém PII scrubbing
independente de consent (legitimate interest); checkboxes em signup separados
pra cada base legal.

**Confidence:** Confident.

---

### COMPL-B — Sub-processadores em `/privacidade`

**Question:** `Privacidade.tsx` atual menciona Stripe (legacy referência) e GA4.
Atualizar para refletir Asaas + PostHog EU + Sentry + Resend + remover Stripe?

**Recommended default: A (atualizar lista completa)**

**Rationale:** LGPD Art. 9º exige lista de sub-processadores. Listar Stripe
quando estamos usando Asaas é tecnicamente uma falsa declaração. Compliance
trivial.

**Cascading:** `Privacidade.tsx` substituições:
- linha 56: "processados diretamente pela Stripe" → "processados diretamente
  pela Asaas (gateway brasileiro certificado PCI DSS)"
- linha 94: substituir bloco completo. Listar: Supabase, Asaas, PostHog Cloud
  EU, Sentry, Resend, Google Calendar API (opcional)
- linha 96: remover GA4 referência se não estiver mais usando; ou clarificar
  "agregado e anonimizado, opt-in via banner de consentimento"
- linha 152: seção 10 transferência internacional deve listar onde cada
  sub-processador armazena (US Supabase, BR Asaas, EU PostHog, US Sentry, US
  Resend)
- adicionar nova seção "Contato DPO" com `dpo@milespro.net.br` (COMPL-06)

**Confidence:** Confident.

---

### COMPL-C — LGPD delete: soft vs hard

**Question:** Quando usuário pede delete (COMPL-02), executar:
- **A:** Hard delete imediato (UUID + rows + Asaas customer + PostHog identity)
- **B:** Soft delete + 7-day cancellation window + hard delete via cron

**Recommended default: B (soft + cron)**

**Rationale:** ROADMAP Phase 2 SC #4 já especifica: "7-day cancellation window
honored". LGPD permite ambos, mas window de 7d protege contra: (a) usuário
arrependido, (b) account hijacker (legítimo titular tem 7d pra contestar via
email confirmação), (c) sync issues (Asaas webhook ainda em voo). Trade-off:
implementação mais complexa.

**Cascading:** Adicionar colunas em `profiles`: `deletion_requested_at TIMESTAMPTZ`,
`deletion_confirmed_at TIMESTAMPTZ`; criar `deletion_audit` table; edge
function `lgpd-delete-cleanup` rodando via `pg_cron` daily que processa rows
com `deletion_requested_at < now() - interval '7 days' AND
deletion_confirmed_at IS NOT NULL`; criar Resend email template "Confirmação de
exclusão" com link único token-signed; RLS em `profiles` deve esconder dados
de usuários com `deletion_requested_at IS NOT NULL` (soft hide).

**Confidence:** Confident.

---

### COMPL-D — Refund / money-back guarantee window

**Question:** Política de reembolso publicada (COMPL-04 + LAUNCH-05):
- **A:** 7 dias incondicionais
- **B:** 14 dias
- **C:** Sem garantia (apenas direito CDC)

**Recommended default: A (7d incondicionais)**

**Rationale:** Trial 7d card-on-file (PRICE-03) já cobre primeira cobrança; se
usuário cancela antes do dia 7, Asaas não cobra. 7d adicional pós-primeira
cobrança = total 14d de "saída fácil". Mais que isso vira abuse vector.
Termos.tsx atual menciona "7 dias de garantia" (linha 150) e CDC art. 49 dá
direito de arrependimento de 7d.

**Cascading:** `Termos.tsx` §5 cancelamento já menciona; adicionar §
explícito sobre garantia 7d em LAUNCH-05 helpdesk runbook; PAY-05 portal
manager precisa ter botão "Solicitar reembolso" com formulário; dispute defense
template sabe quando alegar abuso.

**Confidence:** Likely.

---

### COMPL-E — DPO email

**Question:** DPO email é `dpo@milespro.net.br` dedicado ou continua
`suporte@milespro.net.br` (atual em `Privacidade.tsx:127, 165`)?

**Recommended default: A (`dpo@milespro.net.br` dedicado)**

**Rationale:** Key Decision já lista `dpo@milespro.net.br`. LGPD não exige
email separado, mas ANPD recomenda. Separação evita que mensagens críticas
LGPD (DSR requests, vazamento de dados) fiquem perdidas em fila de suporte.

**Cascading:** Verificar com Resend que `dpo@milespro.net.br` é deliverable;
update `Privacidade.tsx:127` e `:165` (mailto links); adicionar footer em
todas as páginas com DPO contact; banner de consent footer linka pra `dpo@`;
LAUNCH-04 landing precisa do DPO contact visível.

**Confidence:** Confident.

---

## Categoria: SEQUENCING

### SEQ-01 - PJ blocker workstream organization

**Question:** Phase 2 tem 26 reqs onde PAY-* (8 reqs) e hard-blocked por PJ
CNPJ. Como organizar plans?
- **A:** Waves desacopladas: W0 (Phase 1 carry-over) -> W1 (compliance +
  telemetria + infra - nao bloqueado por CNPJ) -> W2 (Asaas design + scaffold em
  sandbox) -> W3 (cutover quando CNPJ chegar)
- **B:** Bloquear toda Phase 2 ate CNPJ
- **C:** Sandbox com CPF temporario

**Recommended default: A (waves desacopladas)**

**Rationale:** PROJECT.md ja marca PAY-* como CNPJ-blocked. Mas COMPL-*,
TEL-*, TIER-*, LAUNCH-01/04/05 nao dependem de CNPJ. Bloquear toda Phase 2
perde ~2 meses de timeline. Sandbox com CPF (C) viola Asaas TOS e quando
converter pra prod vai precisar reconfigurar tudo.

**Cascading - Estrutura preliminar de plans** (validar em /gsd-plan-phase 2):
- **02-01-PLAN**: W0 Phase 1 carry-over (AR-2 vite fallback delete, AR-3
  Deno CI, rename Plus -> Pro em Index/landing, DPO email migration, vite
  plugin regex extend pra VITE_ASAAS_*)
- **02-02-PLAN**: W1a Telemetry (PostHog real + Sentry + consent banner)
- **02-03-PLAN**: W1b Compliance (LGPD endpoints export+delete, privacy/terms
  rewrite, COMPL-04 sub-processors)
- **02-04-PLAN**: W1c Infra (Vercel deploy, Resend domain, DNS,
  app.milespro.net.br)
- **02-05-PLAN**: W2a Asaas design + scaffold (edge functions + migrations
  webhook_events + asaas_customer_id columns; sandbox API)
- **02-06-PLAN**: W2b TIER UI gating (mostra/esconde features iOS-aware,
  paywall Free->Pro, multi-CPF UI VIP)
- **02-07-PLAN**: W3 PAY cutover quando CNPJ ativo (flip Asaas sandbox->prod;
  reconciliation cron; produto IDs reais; LAUNCH-04 final pricing)
- **02-08-PLAN**: LAUNCH-05 helpdesk + dispute templates + runbook

**Confidence:** Likely. Order especifico dos waves pode variar conforme
prioridades do PO.

---

### SEQ-02 - NFS-e in v1 vs deferred

**Question:** PAY-08 (NFS-e automatica) entra no v1 ou deferred pra cycle
pos-launch?

**Recommended default: A (incluir, usando bundle Asaas)**

**Rationale:** Research STACK.md "Tax invoice (NFS-e): Asaas-bundled (defer
eNotas) MEDIUM confidence". Bundle Asaas literalmente e toggle
invoice.enabled=true - zero codigo extra. eNotas swap fica pra v2 (ja
listado em REQUIREMENTS.md V2). Adversamente, lancar SaaS BR sem NFS-e pode
gerar friccao fiscal pra cliente que pede nota.

**Cascading:** Asaas Subscription create payload inclui invoice: { enabled:
true }; verificar com contador qual municipal_inscription e exigida;
documentar em LAUNCH-05 runbook como reemitir nota se falhar.

**Confidence:** Confident.

---

### SEQ-03 - Helpdesk software

**Question:** LAUNCH-05 helpdesk = Crisp (free tier) / Front (paid) / so email
com regras de SLA?

**Recommended default: A (Crisp free tier)**

**Rationale:** Crisp free tier = chat widget + email integration + WhatsApp
Business (pago 25 USD add-on); suficiente para 10 usuarios iniciais. Front e
overkill (pago 24 USD/user/mo). So email nao tem widget no app - friccao alta.
Crisp tem SDK Capacitor (futuro Phase 3).

**Cascading:** CrispWidget em LandingHeader + DashboardLayout; secret
VITE_CRISP_WEBSITE_ID (publico, safe); LGPD: Crisp armazena chat history
fora do BR - declarar em Privacidade.tsx (ja vai estar na lista COMPL-B);
template de primeiro contato em Crisp configurado.

**Confidence:** Likely.

---

### SEQ-04 - Resend domain setup

**Question:** Sender de email transacional: noreply@milespro.net.br (custom
domain verificado) vs continuar onboarding@resend.dev (default)?

**Recommended default: A (custom domain)**

**Rationale:** Pre-requisito de COMPL-02 (email de confirmacao de delete
precisa ser deliverable + parecer oficial), PAY-02 (email pos-checkout
confirmando assinatura), LAUNCH-04 (welcome email). onboarding@resend.dev
cai em spam frequentemente; tambem nao parece profissional.

**Cascading:** DNS SPF + DKIM + DMARC em milespro.net.br; warm-up de
domain (research MED-02) por 1 semana antes de cutover; migrar email
templates em supabase/functions/send-client-email/index.ts e outras edge
functions; verificar bounces no Resend dashboard.

**Decisao adicional sobre inboxes:**
- noreply@milespro.net.br para automated (transactional)
- suporte@milespro.net.br para inbox de tickets (Crisp routes here)
- dpo@milespro.net.br para LGPD requests (separate inbox)

Resend so faz outbound - inbox emails podem usar Google Workspace ou
Cloudflare Email Routing (free) forwarding para gmail do founder.

**Confidence:** Confident.

---

## Decisoes ja LOCKED (Key Decisions em PROJECT.md - nao reabrir)

Listadas aqui para que /gsd-plan-phase 2 nao as reabra acidentalmente:

| Decisao | Locked em | Aplicacao Phase 2 |
|---------|-----------|-------------------|
| Stack = Supabase + React + shadcn + Capacitor | PROJECT.md original | Nao trocar |
| Gateway = Asaas (nao Stripe BR) | PROJECT.md Key Decisions | PAY-01..PAY-08 todos via Asaas |
| iOS Path C (sem IAP, sem UI de pricing) | PROJECT.md Key Decisions | TIER-* + PAY-04 gating iOS-aware |
| Trial = 7 dias Pro com card-on-file | PROJECT.md Key Decisions | PAY-06 mecanica |
| Entidade = PJ obrigatoria pra Phase 2 | PROJECT.md Constraints | SEQ-01 wave strategy |
| Modelo = Free + Pro + VIP (3 tiers) | PROJECT.md Key Decisions | TIER-01..06 matrix |
| Multi-CPF e VIP-only no v1 | PROJECT.md Out of Scope | TIER-04/06 implementation |
| Plano anual ~17% desconto | PROJECT.md Key Decisions | PRICE-02 (ajustado pra 10/20%) |
| Telemetria = PostHog Cloud EU + Sentry free | PROJECT.md Key Decisions | TEL-01, TEL-03 |
| Hosting = Vercel ou Cloudflare Pages | PROJECT.md Key Decisions | INFRA-02 (default Vercel) |
| Supabase tier = Pro 25 USD/mo | PROJECT.md Key Decisions | Habilita pg_cron (TECH-03) |
| DPO = founder | PROJECT.md Key Decisions | COMPL-E |
| Sales channel VIP = self-serve Asaas | PROJECT.md Key Decisions | SCOPE-05 |
| Out-of-scope: scraping, multi-tenant, custodia, social, multi-currency | PROJECT.md Out of Scope | Nao considerar |

---

## Open Issues que NAO viram gray areas (dependem de CNPJ chegar)

1. Asaas account approval flow (~2-7 days apos docs submitted)
2. Quais municipios o municipio do PJ aceita NFS-e via Asaas
3. Webhook secret rotation cadence (definir apos Asaas live mode ativo)
4. Pix Automatico onboarding (Asaas requires extra docs alem de NFS-e)
5. Banking integration pra payouts Asaas -> conta PJ (separate onboarding step)

Estes ficam em deferred-items.md como **W3 prerequisites**.

---

## Needs External Research

Apos confirmacao do PO sobre as gray areas A/B/C, vale investigar antes de
/gsd-plan-phase 2:

1. **Asaas API event taxonomy** - quais eventos exatos disparam
   SUBSCRIPTION_* vs PAYMENT_*; idempotency keys; HMAC signature scheme
   atual (Asaas mudou docs em 2025). Source recomendada: Asaas docs portal + 1
   chamada sandbox.
2. **Asaas trialDays + card-on-file flow** - confirmar que sandbox API
   aceita trial sem cobrar mas guarda o card; failure modes em "card declined
   at trial end".
3. **Asaas refund / dispute API** - qual endpoint para reembolso parcial vs
   total (COMPL-D + LAUNCH-05 dispute defense).
4. **NFS-e bundle Asaas requirements** - quais municipios sao suportados;
   municipal_inscription mandatoria ou opcional; tax rate (ISS) configuravel.
5. **Apple App Review 3.1.3(b) Multiplatform Services current status** -
   confirmar que exemption nao foi alterada em 2026 (research STACK.md flag).
6. **PostHog EU instance LGPD specifics** - posthog.init config flags
   (property_blacklist, autocapture: false, person_profiles: identified_only,
   disable_session_recording: true); confirmar que EU instance e compliant
   sem precisar DPA assinada (research HIGH-03).
7. **pg_cron + net.http_post pattern** - Supabase docs sobre como invocar edge
   function via cron; auth flow (service_role automaticamente disponivel?);
   alerta em falha de schedule.
8. **Sentry + Capacitor + edge functions** - confirmar 3 SDKs separados
   (@sentry/react, @sentry/capacitor, Sentry Deno) e que beforeSend
   regex-strip CPF e a abordagem padrao.

---

## Next Action

Apos confirmacao do PO sobre as gray areas A/B/C, o proximo step e:
/gsd-plan-phase 2

Estimativa preliminar: 7-8 plans paralelizaveis em 4 waves (W0..W3).
Plan-checker deve iterar 2-3 vezes dado o tamanho do escopo (26 reqs).

---

*Authored: 2026-05-12 by gsd-assumptions-analyzer*
*Calibration tier: full_maturity (24 gray areas across 5 categories)*
