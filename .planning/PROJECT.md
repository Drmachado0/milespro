# MilesPro

## What This Is

SaaS para gestão inteligente de milhas e pontos de fidelidade. Centraliza saldos, vencimentos, programas (Livelo, Smiles, TudoAzul, Esfera), cartões e clubes em um painel único, com simulações, alertas e recomendações para que o usuário saiba quando usar milhas, quando pagar em dinheiro, quando transferir pontos e como evitar perda por vencimento. Público principal: pessoa física que acumula pontos. Público secundário, já no v1 via tier VIP: consultores, influenciadores e gestores familiares que administram múltiplos CPFs.

## Core Value

**Tirar o usuário da planilha e dos apps espalhados — dar uma visão única e confiável das milhas/pontos, com decisões claras sobre quando e como usar.** Se a centralização de saldos com confiança nos dados quebrar, nada mais importa.

## Requirements

### Validated

<!-- Inferido do codebase existente (~1100 commits, 6 meses). "Validated" aqui significa "implementado e funcional", não "validado por usuários pagantes" (ainda greenfield em termos de mercado). -->

- ✓ Autenticação via Supabase (email/senha) — existente
- ✓ Dashboard com visualização de saldos — existente
- ✓ CRUD de programas de fidelidade e contas — existente
- ✓ Modelagem de tier de assinatura no DB (free / pro / vip) — existente
- ✓ Integração com Google Calendar (edge function) — existente
- ✓ Build mobile configurado (Capacitor iOS + Android) — existente
- ✓ Geração de PDF lazy-loaded para relatórios — existente
- ✓ Estrutura de testes (Vitest + RTL, 93 testes em utilitários/hooks) — existente

### Active

<!-- Trabalho do ciclo "pronto pra escala". Marco: primeiros 10 pagantes reais. -->

**Segurança e confiabilidade (maior risco percebido — prioridade #1):**
- [ ] **SEC-01**: Plan gating server-side via RLS — usuário free não consegue ler/escrever em tabelas/colunas pagas mesmo via REST direto
- [ ] **SEC-02**: Auditoria de RLS em `travel_*` e `vip_*` — toda policy checa `subscription_plan` quando aplicável, não só `user_id`
- [ ] **SEC-03**: Remover qualquer referência client-side a `SUPABASE_SERVICE_ROLE_KEY` e fail-fast em build se variável for setada no bundle
- [ ] **SEC-04**: Remover JWT anon hardcoded no `vite.config.ts` (ou tornar opcional e mascarar deploys mal-configurados)
- [ ] **SEC-05**: Consolidar enum de plan entre TS e DB (atualmente 5 valores DB vs 3 TS — funciona por acidente)
- [ ] **SEC-06**: Cobertura de testes em paths críticos: `AuthProvider`, `PlanProtectedRoute`, `useSubscription`, `ErrorBoundary`, 14 hooks de travel, edge function `google-calendar-auth`

**Monetização real:**
- [ ] **PAY-01**: Integração Asaas (gateway escolhido) — `create-checkout-session` edge function com checkout em domínio Asaas (Pix + Cartão + Boleto)
- [ ] **PAY-02**: Webhook handler `asaas-webhook` (edge function `verify_jwt = false`, HMAC signature-verified) com idempotência via `webhook_events(provider, event_id) UNIQUE`
- [ ] **PAY-03**: Sincronização do `subscription_plan` no DB a partir do Asaas (source of truth = gateway); reconciliation cron diária
- [ ] **PAY-04**: Tela de planos Free/Pro/VIP em `/planos` com toggle mensal/anual e CTA de upgrade (web only — iOS Path C)
- [ ] **PAY-05**: Portal de gerenciamento de assinatura via Asaas (cancelar, atualizar cartão, ver fatura, pagar Pix em aberto)
- [ ] **PAY-06**: Trial 7 dias do Pro com cartão on file; cobrança automática se não cancelar; período de graça em falha de pagamento (3-7 dias)
- [ ] **PAY-07**: Suporte a planos anuais com ~17% de desconto (Pro mensal e anual + VIP mensal e anual)
- [ ] **PAY-08**: NFS-e emitida automaticamente via Asaas para cada cobrança paga (aproveitar bundle Asaas)

**Diferenciação de tiers (gating de produto):**
- [ ] **TIER-01**: Definir matriz concreta de features por tier (Free básico, Pro libera quase tudo, VIP = Pro + multi-CPF + features premium)
- [ ] **TIER-02**: Free limitado a N programas/contas (definir N na phase) com bloqueio gracioso ao tentar adicionar mais
- [ ] **TIER-03**: Alertas de vencimento e simulações reservados para Pro+
- [ ] **TIER-04**: VIP libera multi-CPF (gerenciar contas de familiares/clientes)
- [ ] **TIER-05**: VIP libera relatórios avançados e área de afiliados/consultor

**Telemetria real:**
- [ ] **TEL-01**: Trocar o mock atual do PostHog por integração real (PostHog Cloud EU para LGPD), com eventos de funil (signup → ativação → upgrade → checkout completo → 1ª cobrança paga) e churn — só após consentimento (COMPL-03)
- [ ] **TEL-02**: Dashboard interno (rota admin) para métricas-chave do ciclo: MRR, conversão free→pago, retenção D7/D30, conversão de trial pra cobrança
- [ ] **TEL-03**: Tracking de erros via Sentry (`@sentry/react` + `@sentry/capacitor` + Sentry edge functions) com PII scrubbing antes do envio (CPF, email, etc)

**Compliance / LGPD (obrigatório antes do primeiro pagante):**
- [ ] **COMPL-01**: Endpoint `/api/lgpd/export` (edge function) que devolve todos os dados pessoais do usuário em formato máquina-legível dentro do prazo legal (15 dias)
- [ ] **COMPL-02**: Endpoint `/api/lgpd/delete` que executa exclusão completa (incluindo backups lógicos) com confirmação por email
- [ ] **COMPL-03**: Banner de consentimento de cookies/analytics com opt-in granular (PostHog só roda após consentimento)
- [ ] **COMPL-04**: Política de privacidade publicada em `/privacidade` listando dados coletados, finalidade, sub-processadores (Supabase, Asaas, PostHog EU, Sentry, Resend)
- [ ] **COMPL-05**: Termos de uso publicados em `/termos`
- [ ] **COMPL-06**: DPO designado (founder no v1) com email `dpo@milespro.net.br` configurado e visível na privacy policy

**Mobile (Capacitor build + distribuição):**
- [ ] **MOBILE-01**: iOS build seguindo Path C — sem IAP, sem UI de pricing/checkout dentro do app (Apple Multiplatform Services exemption 3.1.3b)
- [ ] **MOBILE-02**: Android build com `targetSdk = 35` (requisito Play Store 2026)
- [ ] **MOBILE-03**: Universal Links (iOS) + App Links (Android) configurados pra OAuth callbacks e deep linking de checkout
- [ ] **MOBILE-04**: Push notifications configuradas (iOS APNs + Android FCM) — feature de Pro
- [ ] **MOBILE-05**: Notes de submissão pra App Review explicando exemption Multiplatform Services e demo de fluxo (sign-in + free-tier)

**Aquisição e lançamento:**
- [ ] **LAUNCH-01**: Build de produção web em `app.milespro.net.br` (Vercel ou Cloudflare Pages — escolher na phase)
- [ ] **LAUNCH-02**: Build iOS submetido à App Store e aprovado
- [ ] **LAUNCH-03**: Build Android submetido à Play Store e aprovado
- [ ] **LAUNCH-04**: Página de marketing (landing) com proposta de valor, planos e CTA pra checkout web
- [ ] **LAUNCH-05**: Helpdesk ativo (Crisp/Front + WhatsApp Business) e política de reembolso publicada antes do primeiro pagante
- [ ] **LAUNCH-06**: Primeiros 10 usuários pagantes recorrentes (marco de fechamento do ciclo)

### Out of Scope

<!-- Boundaries explícitas para evitar scope creep durante o ciclo. -->

- **Troca de stack** — Decidido manter Supabase + React + shadcn + Capacitor. Mudar agora multiplicaria custo sem ganho de valor pro ciclo.
- **Marketplace de viagens (busca/compra de passagens)** — Fora do core value. MilesPro é gestão de milhas, não comparador de preços.
- **Programa de loyalty próprio do MilesPro** — Não somos um programa de fidelidade; somos meta-camada sobre os existentes.
- **White-label / multi-tenant para empresas** — Foco é PF + consultor individual. Empresas viraria pivô de modelo, fica pra v2+.
- **Importação automática via scraping dos programas** — Risco legal e técnico alto (programas não tem API pública estável). Entrada manual + integrações oficiais quando existirem.
- **Sistema próprio de transações financeiras** — Toda cobrança via gateway externo (Stripe ou similar). MilesPro não custodia dinheiro.
- **Versão desktop nativa (Electron etc)** — Web + iOS + Android atende. Desktop nativo é overhead sem demanda comprovada.
- **Features de "social"** (compartilhar viagens, feed, etc) — Diluiria o foco em utilidade individual. Pode emergir em v2 se houver sinal.
- **Suporte a moedas que não BRL/USD** — Mercado-alvo BR. Outros mercados é pivô de longo prazo.
- **Multi-CPF e afiliados em tier Free ou Pro** — Decidido: multi-CPF e área de afiliados são exclusivos VIP no v1.

## Context

**Codebase brownfield com 6 meses de desenvolvimento:**
- ~1100 commits, ~239 components/pages, 17 arquivos de teste (93 testes verdes)
- Mapeamento completo em `.planning/codebase/` (STACK, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, INTEGRATIONS, CONCERNS)
- Nunca foi lançado para usuários reais — considerar greenfield em termos de aquisição

**Concerns críticos identificados no mapeamento (`CONCERNS.md`):**
1. **CRÍTICO** — Plan gating é puramente client-side em `travel_*` e `vip_*`; RLS só checa `user_id` (resolvido em SEC-01/02)
2. **ALTO** — `VITE_SUPABASE_SERVICE_ROLE_KEY` referenciado em código client; risco de leak no bundle (resolvido em SEC-03)
3. **ALTO** — JWT anon hardcoded em `vite.config.ts` como fallback de build (resolvido em SEC-04)
4. **MÉDIO** — 0% de cobertura em components/pages, incluindo `AuthProvider`, `PlanProtectedRoute`, `useSubscription`, `ErrorBoundary` (resolvido em SEC-06)
5. **MÉDIO** — 10 page files >800 LOC, 6 sem memoization (performance opportunity, não bloqueante)
6. **MÉDIO** — PostHog atualmente é mock; nenhum evento real sendo enviado (resolvido em TEL-01)
7. **BAIXO** — 3 lockfiles commitados (bun + pnpm + npm); CI usa npm (decisão de cleanup no início do ciclo)
8. **BAIXO** — Enum de plan dessincronizado entre DB (5 valores) e TS (3 valores); funciona por acidente (resolvido em SEC-05)

**Programas de fidelidade no escopo de relacionamento:**
Livelo, Smiles, TudoAzul, Esfera (núcleo inicial). Outros (LATAM Pass, Iberia Plus, etc) entram conforme demanda e podem ser adicionados sem grande refactor por seguir o mesmo modelo de "programa + saldo + vencimento".

**Estado da telemetria:**
PostHog está instalado e configurado mas implementação está mockada. Documentado mas precisa ser destrocado para que decisões do ciclo (conversão Free→Pro, retenção, etc) possam ser tomadas com dados reais.

## Constraints

- **Tech stack**: Supabase (auth + DB + edge functions) + React 18 + TypeScript + Vite + shadcn/ui + react-query + Capacitor — Decidido travar; mudanças de stack fora deste ciclo
- **Plataformas v1**: Web + iOS + Android via Capacitor (tudo no v1, sem deferir mobile) — Usuário final está no celular; web sozinho deixaria valor na mesa
- **Marco do ciclo**: Primeiros 10 pagantes recorrentes (mensal ou anual) — Validação de willingness-to-pay antes de investir em escala
- **Segurança**: Plan gating tem que ser server-side antes de qualquer launch com cobrança — Maior risco percebido pelo PO; vazamento de dados pagos é evento "fim do produto"
- **Compliance**: LGPD básica obrigatória antes de cobrar (política de privacidade, termos, consentimento) — Risco regulatório em produto que lida com CPFs e dados financeiros
- **Equipe**: Solo dev (assumido até confirmação) — Roadmap precisa caber em capacidade de uma pessoa; preferir entregas pequenas e independentes
- **Orçamento**: Otimizar para custo baixo onde sensato — Pré-receita; ferramentas pagas só onde indispensável (Supabase Pro $25/mo + Asaas R$0.99/Pix são exemplos; PostHog/Sentry/Resend ficam em free tier durante o ciclo)
- **Entidade jurídica**: PJ (ME / LTDA / SLU) obrigatória antes de Phase 2 (Monetização) — Asaas e NFS-e exigem CNPJ; PF teria fricção fiscal incompatível com SaaS recorrente

## Key Decisions

| Decisão | Racional | Outcome |
|---------|----------|---------|
| Manter stack atual (Supabase + React + shadcn + Capacitor) | Trocar stack agora seria custo sem valor pro ciclo; codebase já tem 6 meses | — Pending (validar ao longo do ciclo) |
| Modelo de cobrança: Free + Pro + VIP (3 tiers) | Free atrai, Pro é o produto, VIP captura segmento de consultor com upside maior | — Pending |
| Multi-CPF / afiliados são exclusivos VIP no v1 | Cria valor claro pra cobrar VIP; segmento existe (consultores) e está disposto a pagar mais | — Pending |
| Lançar Web + iOS + Android juntos no v1 | Usuário-alvo está no celular; web sozinho perde fricção/conveniência | — Pending |
| Marco do ciclo = 10 pagantes (não 100, não "tecnicamente pronto") | Validação de mercado primeiro; escala vem depois com sinal real | — Pending |
| Maior risco priorizado: vazamento de dados (sec-first) | Plan gating client-side + service-role-key risk = fim do produto se vazar | — Pending |
| Codebase map ANTES de PROJECT.md (`/gsd-map-codebase` rodado primeiro) | Brownfield com 6 meses; map fundamenta decisões de phases | ✓ Good (executado) |
| **Gateway de pagamento: Asaas (não Stripe BR)** | Fees BR-nativos (R$0.99 Pix), NFS-e bundled, Pix Automático maduro, MEI/PJ-friendly | — Pending (aplicar em PAY-*) |
| **iOS Path C: sem IAP, sem UI de checkout dentro do app** | Apple Multiplatform Services exemption (3.1.3b). App iOS é só sign-in + free-tier. Checkout só em `app.milespro.net.br`. Evita 15-30% Apple fee | — Pending (validar em App Review) |
| **Trial 7 dias Pro com cartão on file** | Melhor conversão vs sem cartão; bloqueia abuso de múltiplas contas; padrão de SaaS maduro | — Pending |
| **Entidade jurídica: PJ (ME / LTDA / SLU)** | Sem cap de receita, NFS-e padrão, pronto pra escalar além do ciclo. Bloqueia abertura de conta Asaas até constituição | — Pending (pré-req Phase 2) |
| **Pricing Pro: decidir na phase de monetização** (R$19,90 vs R$29,90+) | R$19,90 = break-even no marco; R$29,90 mais sustentável. Adiar pra ter mais sinal de mercado | — Pending |
| **Plano anual com ~17% desconto** | Reduz risco de churn no v1; padrão de SaaS BR consolidado | — Pending |
| **Domínio de produção: `app.milespro.net.br`** (a confirmar) | Necessário pra Resend, Asaas webhook, OAuth callbacks, App Store listing | ⚠️ Revisit (confirmar registro) |
| **Telemetria: PostHog Cloud EU + Sentry (free tiers)** | LGPD-friendly (EU instance), suficiente pra cycle de 10 usuários, custo zero | — Pending |
| **Email transacional: Resend com domínio verificado** | Já integrado no codebase (`onboarding@resend.dev` deve virar `noreply@milespro.net.br`) | — Pending |
| **Hosting web: Vercel Hobby ou Cloudflare Pages** | Migrar do preview Lovable antes de submeter mobile (Universal Links + OAuth callbacks dependem de domínio fixo) | — Pending |
| **Supabase tier: Pro ($25/mo)** | Free tier auto-pausa em 7d sem uso = incompatível com clientes pagantes | — Pending |
| **DPO: founder se nomeia (`dpo@milespro.net.br`)** | LGPD permite pra pequenas operações; revisitar quando contratar primeiro funcionário | — Pending |
| **Sales channel VIP: self-serve via Asaas** (sem WhatsApp humano no v1) | Consistência com automação; preserva margem; revisitar se conversão VIP for muito baixa | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state (users, feedback, metrics)

---
*Last updated: 2026-05-11 after initialization (research + 4 strategic decisions resolved: gateway=Asaas, iOS=Path C, trial=7d com cartão, entidade=PJ)*
