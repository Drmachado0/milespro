# Phase 3: Mobile Distribution & Launch - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-13
**Phase:** 03-mobile-distribution-launch
**Areas discussed:** app-identity, push-notifications, deep-links, submission-outreach

**Session note:** Discussion started 2026-05-13 19:00 UTC, paused at 20:30 UTC (Area 1 / Q4 pending, checkpoint salvo por context budget 65%), retomado a partir do checkpoint na mesma sessão lógica.

---

## App Identity

### Q1 — Bundle ID

| Option | Description | Selected |
|--------|-------------|----------|
| `br.com.milespro.app` | Reverse-DNS canônico .net.br, iOS+Android idêntico | ✓ |
| `com.milespro.app` | Convenção .com global | |
| `net.milespro.app` | Match com .net.br TLD direto | |

**User's choice:** `br.com.milespro.app`
**Notes:** Aderente ao TLD `.net.br`, identifica claramente como BR app. Mesmo bundle iOS+Android (Capacitor best practice).

### Q2 — Display Name

| Option | Description | Selected |
|--------|-------------|----------|
| MilesPro | 1 palavra, 8 chars, canônico | ✓ |
| Miles Pro | 2 palavras, espaço | |
| MilesPro: Gestão de Milhas | Long-form descritivo | |

**User's choice:** `MilesPro`
**Notes:** Não trunca em iPhone SE até iPad Pro; consistente com domain.

### Q3 — Auth Providers

| Option | Description | Selected |
|--------|-------------|----------|
| Email/Password + Google + Apple Sign-In (iOS) / Email/Password + Google (Android) | Apple Sign-In obrigatório iOS por Guideline 4.8 | ✓ |
| Só email/password | Mais simples mas Apple rejeita se Google está presente no web | |
| Email/Password + Google só | Funciona Android mas iOS é rejeição automática | |

**User's choice:** Cobertura cross-platform com Apple Sign-In obrigatório iOS.
**Notes:** Apple Review Guideline 4.8 — qualquer app que use third-party login (Google) deve oferecer Sign in with Apple também.

### Q4 — Icon + Splash Sourcing

| Option | Description | Selected |
|--------|-------------|----------|
| AI generation (banana skill) | Gemini Nano Banana, brand color #e8590c, 1024 master + @capacitor/assets auto-resize | ✓ |
| Designer dedicado (Fiverr/99designs) | R$200-800, 3-7 dias | |
| Você desenha no Figma/Canva | Controle total, tempo seu | |
| Default Capacitor + texto placeholder | Anti-recomendado pro launch | |

**User's choice:** AI generation via banana skill.
**Notes:** Iteração visual durante execução via `/banana`. Light + Dark + Tinted variants necessárias (iOS 18 Home Screen).

---

## Push Notifications

### Q1 — Provider

| Option | Description | Selected |
|--------|-------------|----------|
| @capacitor/push-notifications + FCM/APNs direto | SDK oficial, FCM HTTP v1, custo $0, vendor=Google FCM | ✓ |
| OneSignal SDK | Dashboard pronto, A/B testing, $0 até 10K mobile users, vendor extra | |
| Supabase Realtime + Service Worker (web push) | Não serve native — anti-recomendado | |

**User's choice:** @capacitor/push-notifications direto.
**Notes:** Service-account JSON em Supabase Vault (`push_fcm_service_account`); edge function gera OAuth2 token FCM.

### Q2 — Eventos v1

| Option | Description | Selected |
|--------|-------------|----------|
| Vencimento de milhas [Pro+] | TIER-02 backend pronto, cron diário | ✓ |
| Promotion alert personalizado D-13 [Pro+] | Fanout do compute-personalized-promos | ✓ |
| Payment events (PAYMENT_CONFIRMED, OVERDUE, trial_ending 3d) [All tiers] | Billing system, paywall não aplica | ✓ |
| Onboarding milestone (primeiro saldo/programa) [All tiers] | Engagement nudge, anti-recomendado pra v1 | ✓ |

**User's choice:** Todos os 4 eventos.
**Notes:** Usuário optou por cobertura máxima. Onboarding milestone foi flag como anti-recomendado pra v1 — usuário escolheu manter consciente.

### Q3 — Permission Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Contextual: após primeiro saldo cadastrado (user_programs count >= 1) | iOS HIG-compliant, accept rate ~65-75% | ✓ |
| Onboarding completo (signup screen) | Cobertura nominal alta mas iOS rejeita ~50-60% | |
| Settings only (passive) | Accept rate <30% | |
| Contextual: após tela de Promoções | Free nunca vê (redirect) | |

**User's choice:** Pós-primeiro-saldo com pre-prompt customizado.

### Q4 — Gating + Downgrade

| Option | Description | Selected |
|--------|-------------|----------|
| RLS-gated server queue + downgrade cleanup | push_subscriptions com RLS, enqueue verifica has_plan, downgrade apaga tokens | ✓ |
| Client-side filter | Anti-padrão; Apple HIG penaliza spam | |
| Sem gating | Viola ROADMAP SC#4 explicitamente | |

**User's choice:** Server-side gating com cleanup em downgrade.
**Notes:** ROADMAP §3 SC#4 exige "Free user does not receive the push (RLS check on has_plan('pro') before insertion into delivery queue)".

---

## Deep Links

### Q1 — Routes

| Option | Description | Selected |
|--------|-------------|----------|
| /auth/callback (OAuth roundtrip) [OBRIGATÓRIO] | Precisa de rota dedicada para SC#3 | ✓ |
| /lgpd/confirm-delete (HMAC token) [OBRIGATÓRIO] | Já existe (Plan 02-02) | ✓ |
| /promocoes (push deep-link target) | D-13 fanout | ✓ |
| /assinatura (retorno checkout) | Path C concern — caiu no painel neutro | |

**User's choice:** /auth/callback + /lgpd/confirm-delete + /promocoes.
**Notes:** /assinatura intencionalmente NÃO incluída por Path C concern.

### Q2 — URL Scheme

| Option | Description | Selected |
|--------|-------------|----------|
| Só https:// via Universal/App Links (sem custom scheme) | Mais seguro, Apple HIG moderno | ✓ |
| https:// + milespro:// custom scheme fallback | Risk de spoofing, Apple Review pode flag | |
| Só milespro:// (sem AASA) | Viola ROADMAP SC#3 — anti-recomendado | |

**User's choice:** HTTPS-only via AASA/assetlinks.
**Notes:** String "milespro://" no ROADMAP §3 SC#3 interpretada como prosa, não requisito literal.

### Q3 — AASA Hosting

| Option | Description | Selected |
|--------|-------------|----------|
| Vercel: public/.well-known/ + headers vercel.json | Static files, zero edge function | ✓ |
| Supabase edge function dedicada | Overkill — conteúdo é estático | |
| Cloudflare Worker | Não se aplica — estamos no Vercel | |

**User's choice:** Vercel static files.
**Notes:** vercel.json já existe (Plan 02-04); extender headers route com `/.well-known/*`.

### Q4 — Auth Gate Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect /auth com returnTo em sessionStorage | UX preserva intent | ✓ |
| Redirect /auth sem preservar destino | UX ruim para promo time-sensitive | |
| Permitir conteúdo público | Não se aplica — Promocoes é Pro+ via PlanProtectedRoute | |

**User's choice:** sessionStorage returnTo pattern.
**Notes:** `src/lib/deepLinkHandler.ts` chokepoint único; /auth/callback exceção (executa sem auth).

---

## Submission & Outreach

### Q1 — Submission Order

| Option | Description | Selected |
|--------|-------------|----------|
| Android primeiro, depois iOS | Play mais permissivo, iteração 18-24h vs 48h+ Apple | ✓ |
| iOS + Android paralelo | 2x velocidade mas dobra risco de rework | |
| iOS primeiro, depois Android | Validação Apple primeiro, mais lento | |

**User's choice:** Android-first.
**Notes:** TestFlight iOS abre em paralelo (50 testers) pra warm-up.

### Q2 — Developer Account Status

| Option | Description | Selected |
|--------|-------------|----------|
| Ambos já ativos | Phase 3 pode submeter sem espera | |
| Só Play Console ativo | Apple pendente, DUNS Number bloqueia | |
| Nenhum dos dois ativo | Hard-blocker; tarefa #0 do plan | ✓ |
| Apple ativo, Play pendente | Raro | |

**User's choice:** Nenhum dos dois ativo.
**Notes:** **Hard-blocker pré-execução** — tarefa #0 do Phase 3 plan DEVE incluir abertura paralela. Apple: $99/ano via PJ + DUNS + ~3-7 dias. Play: $25 one-time + ~24h.

### Q3 — Outreach Channels

| Option | Description | Selected |
|--------|-------------|----------|
| Orgânico: comunidades milhas BR | Audiência auto-selecionada, custo=tempo | ✓ |
| Network direto: LinkedIn + amigos consultores | Conversão alta, primeiros 3-5 pagantes | |
| Pago: Meta Ads + Google Ads | CAC > LTV nos primeiros 10 | |
| Influencer: criadores YouTube/Instagram milhas | Alavancagem máxima, timeline 4-8 semanas | ✓ |

**User's choice:** Orgânico (primary) + Influencer (parallel longer cadence).
**Notes:** Paid ads excluídos do v1 — revisitar pós-LAUNCH-06. Network direto não foi selecionado mas usar oportunisticamente.

### Q4 — Outreach Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Web first: lançar orgânico quando app.milespro.net.br + Asaas live | Maximiza tempo aquisição, não bloqueia em Apple | ✓ |
| Esperar mobile aprovar antes de qualquer aquisição | Lançamento coordenado mas perde 2-4 semanas | |
| Influencer outreach começa JÁ em paralelo | Timeline alvo de post = end of June 2026 | |

**User's choice:** Web first.
**Notes:** Success Criterion #5 fala em 10 CPFs com PAYMENT_RECEIVED — não exige mobile. Web first maximiza window.

---

## Claude's Discretion

- **Push notification payload schema** (data fields, badge count, notification grouping/threading via thread-id iOS / tag Android) — researcher/planner propõe durante plano.
- **AuthCallback.tsx loading UX** — researcher propõe skeleton + error state baseado em padrões PlanProtectedRoute/ProtectedRoute.
- **TestFlight tester recruitment list curation** — planner sugere (founder + 5-10 contatos próximos + 30-40 community recruits).
- **Sentry @capacitor/capacitor v4 integration** — deferred from Plan 02-03; planner inclui como tarefa, segue padrão do `src/lib/sentry.ts`.

## Deferred Ideas

- TestFlight tester recruitment list curation
- App Store / Play Store listing copy completa (descrição longa, keywords ASO, what's new)
- App Privacy nutrition labels detalhamento por categoria
- Helpdesk SLA operacional + runbook dos 5 tickets mais prováveis (owned por LAUNCH-05 em Phase 2)
- Push rich notifications (imagem + action buttons + reply inline) — backlog v2
- Notification grouping/threading + badge count strategy detalhado
- Capacitor App Widget iOS Home Screen — V2 / Deferred
- WhatsApp Business alerts (alternativa ao push) — V2 / Deferred
- Deep-link granular `/promocoes/[id]` — backlog
- Deep-link `/assinatura?status=success` — intencionalmente excluído (Path C); revisitar pós-launch
- Paid ads (Meta + Google) pra LAUNCH-06 — revisitar pós-LAUNCH-06
- Network direto pessoal estruturado (50-100 contatos) — não escolhido, usar oportunisticamente
