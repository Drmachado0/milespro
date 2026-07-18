# Phase 3: Mobile Distribution & Launch - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 entrega o ciclo de distribuição mobile e fechamento do milestone "10 pagantes recorrentes":

1. **iOS Path C aprovado na App Store** — sem IAP, sem UI de pricing dentro do app, exemption Multiplatform Services 3.1.3(b), Sign in with Apple obrigatório, push notifications Pro/VIP funcionais.
2. **Android `targetSdk=35` aprovado na Play Store** — Universal/App Links roundtrip OAuth, push notifications via FCM, pre-launch report limpo.
3. **Universal Links + App Links operacionais** em `app.milespro.net.br/.well-known/*` cobrindo `/auth/callback`, `/lgpd/confirm-delete`, `/promocoes`.
4. **Push notifications conectadas** ao backend Phase 2 (D-13 promo personalizada, vencimento de milhas, payment events, onboarding milestone) com gating server-side via `has_plan('pro')` e cleanup em downgrade.
5. **LAUNCH-06 fechado** — 10 CPFs distintos com PAYMENT_RECEIVED via Asaas. Aquisição via orgânico (comunidades milhas BR) + parceria com criadores de conteúdo (timeline 4-8 semanas pra primeiro post influencer); aquisição web first começa assim que `app.milespro.net.br` + Asaas live (não bloqueia em iOS approval).

Requirements cobertos: MOBILE-01, MOBILE-02, MOBILE-03, MOBILE-04, MOBILE-05, LAUNCH-02, LAUNCH-03, LAUNCH-06.

</domain>

<decisions>
## Implementation Decisions

### App Identity

- **D-T01 — Bundle ID `br.com.milespro.app`** (iOS + Android idênticos). Reverse-DNS do TLD `.net.br`. Substitui placeholder Lovable `app.lovable.e39f4ef4c00a4d6e8e5c8722bb465399`. Aplica em: `capacitor.config.ts` `appId`, Apple Developer App ID, Play Console package, AASA `appIDs`, `assetlinks.json` `package_name`.
- **D-T02 — Display Name `MilesPro`** (1 palavra, 8 chars, não trunca). Aplica em: `Info.plist` `CFBundleDisplayName`, `AndroidManifest.xml` `android:label`, App Store Connect product name, Play Console title.
- **D-T03 — Auth providers**:
  - iOS: email/password + Google + **Apple Sign-In (obrigatório por Apple Review Guideline 4.8)**
  - Android: email/password + Google
  - Implementation: criar Apple Service ID + Sign In with Apple key no Apple Developer Console; enable Apple provider em Supabase Auth → Providers; entitlement Sign in with Apple no Xcode; `src/pages/Auth.tsx` adiciona botão Apple Sign-In condicionado a `useIsIOSCapacitor()`.
- **D-T04 — Ícone + Splash via AI generation (banana skill)**. Brand color `--mp-orange-* #e8590c` (Tailwind). Master 1024x1024 → `@capacitor/assets` faz auto-resize pra todas as densidades + adaptive icon Android (foreground + background `#171717` do `SplashScreen.backgroundColor` atual + monochrome Material You) + dark/light splash via `plugins.SplashScreen.backgroundColorDark`. Substituir `/public/pwa-192x192.png`, `/public/pwa-512x512.png`, `/public/placeholder.svg` com versões finais.

### Push Notifications

- **D-T05 — Provider: `@capacitor/push-notifications` + FCM/APNs direto** (sem OneSignal). FCM HTTP v1 API com service-account JSON em Supabase Vault (`push_fcm_service_account`). Edge function `send-push-notification` gera OAuth2 token FCM e envia payload. Custo: $0. Vendor dependency: Google FCM apenas.
- **D-T06 — Eventos v1 que disparam push** (todos os 4):
  1. Vencimento de milhas [Pro+] — cron diário escaneia balances onde `expires_at - alert_antecipation_days <= now()`; backend já existe (TIER-02).
  2. Promotion alert personalizado D-13 [Pro+] — fanout do `compute-personalized-promos` cron @02:00 UTC.
  3. Payment events: PAYMENT_CONFIRMED + PAYMENT_OVERDUE + trial_ending 3d antes [All tiers] — billing system, paywall não aplica.
  4. Onboarding milestone: primeiro saldo + primeiro programa [All tiers] — engagement nudge.
- **D-T07 — Permission timing: contextual após primeiro saldo cadastrado** (`user_programs` INSERT count >= 1). Pre-prompt customizado antes do prompt nativo: "Avisamos quando suas milhas estiverem perto de vencer ou quando aparecer uma promo de transferência. Permitir avisos?" → [Permitir] [Agora não]. NÃO pedir no signup (anti-pattern iOS HIG). `Info.plist` `NSUserNotificationsUsageDescription`: "Avisar você sobre vencimentos de milhas e promoções".
- **D-T08 — Gating server-side + downgrade cleanup**:
  - Migration: `push_subscriptions(id, user_id, device_token, platform, app_version, created_at, last_seen_at)` + RLS (SELECT/INSERT do user; UPDATE/DELETE do user ou service-role; partial UNIQUE `(user_id, device_token) WHERE device_token IS NOT NULL`).
  - Edge function `enqueue-push` verifica `has_plan('pro')` antes de buscar tokens.
  - `asaas-webhook` downgrade path (PAYMENT_OVERDUE → grace expira → plan=free) dispara edge function `cleanup-push-subscriptions` que apaga `device_token` dos eventos Pro+.
  - Free pós-downgrade só recebe billing events.

### Deep Links

- **D-T09 — Rotas Universal/App Links**:
  - `/auth/callback` — OBRIGATÓRIO. Criar `src/pages/AuthCallback.tsx` (recebe `?code=...&state=...` e chama `supabase.auth.exchangeCodeForSession(code)`). Mudar `Auth.tsx:89` `redirectTo` de `${origin}/dashboard` para `${origin}/auth/callback`. Mesmo em `AuthProvider.tsx:61` `emailRedirectTo`.
  - `/lgpd/confirm-delete` — OBRIGATÓRIO. Já existe (Plan 02-02). Email LGPD abre o app direto via Universal Link em vez do Safari.
  - `/promocoes` — Target de deep-link de push notification D-13 + share externo de promo.
  - `/assinatura` — **INTENCIONALMENTE NÃO INCLUÍDA**. Path C concern: evitar deep-link pra rota relacionada a pricing no iOS.
- **D-T10 — URL Scheme: só `https://` via Universal/App Links — sem custom `milespro://`**. AASA garante domain validation. Custom scheme tem risco de spoofing + Apple Review pode flag. ROADMAP §3 SC#3 string "milespro://" é prosa, não requisito literal — o que importa é "AASA causes the deep-link to re-open the iOS app" e isso é HTTPS via AASA.
- **D-T11 — AASA + assetlinks hosting: Vercel `public/.well-known/` + `vercel.json` headers**:
  - `public/.well-known/apple-app-site-association` (SEM extensão `.json`; mime `application/json`).
  - `public/.well-known/assetlinks.json`.
  - `vercel.json` headers route: `/.well-known/*` → `Content-Type application/json`, `Cache-Control max-age=3600`.
  - Payload AASA: `{"applinks":{"details":[{"appIDs":["<TEAM_ID>.br.com.milespro.app"],"components":[{"/":"/auth/callback*"},{"/":"/lgpd/confirm-delete*"},{"/":"/promocoes*"}]}]}}`.
  - Payload assetlinks: `[{"relation":["delegate_permission/common.handle_all_urls"],"target":{"namespace":"android_app","package_name":"br.com.milespro.app","sha256_cert_fingerprints":["<SHA256>"]}}]`.
  - `TEAM_ID` vem do Apple Developer Account; `SHA256_FINGERPRINT` do keystore release Android (gerar no plan de Android build).
- **D-T12 — Auth gate: redirect `/auth` com returnTo em sessionStorage**:
  - Criar `src/lib/deepLinkHandler.ts` — chokepoint único pra parsing + navigation.
  - `Capacitor.App.addListener('appUrlOpen', ...)` inicializado em `App.tsx` `useEffect` (junto com `initSentry`).
  - Se deep-link chega sem auth: `sessionStorage.setItem('returnTo', target)` + `navigate('/auth')`.
  - `AuthProvider.tsx` pós-login lê `sessionStorage.getItem('returnTo')`, navega, remove.
  - Exceção: `/auth/callback` executa sem auth check (é o callback DA auth).

### Submission & Outreach

- **D-T13 — Ordem: Android primeiro, depois iOS**. Play Console mais permissivo + iteração 18-24h vs 48h+ Apple. TestFlight do iOS abre em paralelo (50 testers) pra warm-up enquanto Android está na fila. iOS submission só quando Android está PROD + sabemos que o fluxo nativo não tem bugs críticos.
- **D-T14 — Apple Developer Program + Play Console: AMBOS pendentes**. **Hard-blocker pré-execução**. Tarefa #0 do plan 03-* DEVE incluir abertura paralela das contas:
  - Apple Developer Program: $99/ano via PJ; exige DUNS Number do D&B + verificação telefônica; tipicamente 3-7 dias após PJ ativo.
  - Play Console: $25 one-time via cartão internacional; ~24h com PJ.
  - **Recomendação:** abrir hoje em paralelo com PJ approval (Phase 2 W3 também depende de PJ). Tarefa #0 do Phase 3 plan trabalha em paralelo com plans subsequentes.
- **D-T15 — Outreach channels**:
  - **Orgânico (primary)**: comunidades de milhas BR — Facebook (grupos Smiles, Multiplus, LATAM Pass, Livelo, Esfera), Reddit r/MilhasBrasil, grupos Telegram, Passageiro de Primeira. Audiência auto-selecionada. Leia regras de cada grupo antes de postar (alguns vetam self-promo). CTAs: trial 7d Pro + multi-CPF VIP feature.
  - **Influencer (parallel, longer cadence)**: top 10-20 criadores BR de milhas no YouTube + Instagram. Outreach com tempo (4-8 semanas pra primeiro post). Comissão ou patrocínio (R$500-5000). Timeline alvo de post = ~end of June 2026 se Phase 3 fechar em 4 semanas.
  - **Excluídos do v1**: Meta Ads / Google Ads pago (CAC > LTV nos primeiros 10 pagantes — invest em learning, não em margem; revisitar pós-LAUNCH-06); Network direto pessoal (não foi selecionado, mas usar oportunisticamente se conversa relevante surgir).
- **D-T16 — Timing: Web first**. Lançar orgânico assim que `app.milespro.net.br` + Asaas live (Phase 2 W3 cutover). Pagantes da web contam pro LAUNCH-06 (Success Criterion #5 fala em 10 CPFs distintos com PAYMENT_RECEIVED, não exige mobile). Quando mobile aprovar, mensagem muda pra "baixe na App Store/Play Store". Maximiza tempo de aquisição; não bloqueia em Apple Review.

### Claude's Discretion

- **Push notification payload schema** (data fields, badge count strategy, notification grouping/threading via `thread-id` iOS / `tag` Android) — usuário não especificou; researcher/planner pode propor durante plano com base em Capacitor Push docs.
- **AppCallback.tsx loading UX** — usuário não especificou; researcher pode propor skeleton + error state baseado em padrões existentes (`PlanProtectedRoute`, `ProtectedRoute`).
- **TestFlight tester recruitment list** — implementation detail; planner pode recomendar (founder + 5-10 contatos próximos + 30-40 pessoas das comunidades de milhas).
- **Sentry @capacitor/sentry v4 integration** — deferred from Plan 02-03; planner inclui como tarefa, segue padrão do `src/lib/sentry.ts` existente.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level
- `.planning/PROJECT.md` — Constraints, key decisions (gateway Asaas, iOS Path C, trial 7d, PJ obrigatório), out-of-scope list.
- `.planning/REQUIREMENTS.md` §MOBILE-01..05 + §LAUNCH-02/03/06 — requirements desta phase com acceptance criteria.
- `.planning/ROADMAP.md` §"Phase 3: Mobile Distribution & Launch" — goal + 5 success criteria + pitfall guardrails (CRIT-03, HIGH-07, HIGH-08, MED-07).

### Prior phase context (carry-forward)
- `.planning/phases/02-monetiza-o-compliance-telemetria/02-CONTEXT.md` — D-06 (domain `app.milespro.net.br`), D-10 (iOS Path C runtime detection), D-13 (promotion alert killer feature).
- `.planning/phases/02-monetiza-o-compliance-telemetria/02-03-SUMMARY.md` §"Deferred" — Sentry @capacitor/capacitor v4 integration handed off pra Phase 3.
- `.planning/phases/02-monetiza-o-compliance-telemetria/02-06-SUMMARY.md` — Path C wrappers + useIsIOSCapacitor canon (referência durante implementation de iOS-specific UI).

### Codebase canons
- `src/hooks/useIsIOSCapacitor.ts` — **Path C runtime canonical hook**. Anywhere iOS-specific UI renders, wrap com este hook.
- `src/pages/Auth.tsx` linha 89, 293 — `redirectTo` que precisa mudar para `/auth/callback`.
- `src/contexts/AuthProvider.tsx` linha 61 — `emailRedirectTo` que também precisa atualizar.
- `src/App.tsx` linha 135-136 — Routes `/lgpd/confirm` e `/lgpd/confirm-delete` (deep-link target #2). Adicionar `/auth/callback`.
- `src/pages/LgpdConfirmDelete.tsx` — deep-link target #2 (HMAC token).
- `src/pages/Promocoes.tsx` — deep-link target #3 (push fanout from D-13).
- `src/hooks/useUserPrograms.ts` — trigger pra push permission contextual (count >= 1).
- `capacitor.config.ts` — current placeholders (appId Lovable, appName lowercase, server.url dev-mode, cleartext=true) — todos a corrigir.
- `vercel.json` — extender `headers` route com `/.well-known/*` rules.
- `supabase/functions/asaas-webhook` — downgrade trigger source pra push cleanup.
- `supabase/functions/compute-personalized-promos` — D-13 fanout source.

### External docs / specs
- Apple Multiplatform Services exemption: App Store Review Guideline 3.1.3(b) — submission notes (MOBILE-05) precisam citar explicitamente.
- Apple Sign in with Apple: Guideline 4.8 — obrigatório porque usamos Google OAuth.
- Capacitor Push Notifications docs: https://capacitorjs.com/docs/apis/push-notifications.
- Capacitor App plugin docs: https://capacitorjs.com/docs/apis/app — `appUrlOpen` event listener canonical pattern.
- FCM HTTP v1 API docs: https://firebase.google.com/docs/cloud-messaging/migrate-v1.
- Apple AASA spec: https://developer.apple.com/documentation/xcode/supporting-associated-domains.
- Google Digital Asset Links: https://developer.android.com/training/app-links/verify-android-applinks.

### Pitfall references
- `.planning/research/PITFALLS.md` CRIT-03 (Apple IAP rule 3.1.1) — Phase 3 owns implementation prevention.
- `.planning/research/PITFALLS.md` HIGH-07 (Mobile build pitfalls) — pin Capacitor versions, NSUsageDescription strings, targetSdk=35, no IDFA → no ATT prompt, PostHog/Sentry consent.
- `.planning/research/PITFALLS.md` HIGH-08 (Customer support readiness) — operational runbook for refund/dispute storm.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`useIsIOSCapacitor` hook** (`src/hooks/useIsIOSCapacitor.ts`) — Path C runtime gate. Reuse em qualquer UI iOS-conditional dentro da Phase 3 (ex: botão Apple Sign-In condicional em Auth.tsx; iOS app icon dark variant).
- **`PlanProtectedRoute` component** — pattern reusável pra gating de rotas Pro+ (push permission prompt, Promocoes deep-link target já gated).
- **`useTelemetry` hook** (`src/hooks/useTelemetry.ts`) — 12 typed helpers já wired. Adicionar `trackPushPermissionGranted/Denied`, `trackPushReceived`, `trackPushOpened` no Phase 3 plan.
- **`useConsent` hook** — pode usar `marketingOptedIn` como gate pra opt-in de push de promo (D-13). Consultar.
- **Edge function pattern `_shared/` (constantTimeEq duplicated 4x; threshold reached)** — Plan 02-05 SUMMARY marca que próximo consumidor deve extrair pra `supabase/functions/_shared/timingSafeEq.ts`. Phase 3 push edge fns são candidato.
- **`vercel.json` headers pattern** (Plan 02-04) — extension pra `/.well-known/*` segue mesma shape de `/api/*` exclusions.
- **`Sentry beforeBreadcrumb` console-log drop** (Plan 02-03 / Rule 2) — mesmo padrão se aplica ao @sentry/capacitor v4 integration.

### Established Patterns

- **Migration sem `CREATE EXTENSION` pra pg_cron/pg_net** — já documentado em Plan 02-02 e 02-05. Push-related migrations seguem.
- **`externalReference = our UUID, not user.id`** (Plan 02-05) — não se aplica a push, mas relevante se add Asaas-driven push events (use existing externalReference para correlação).
- **`headless-<uuid>@managed.milespro.invalid` email pattern** (Plan 02-06) — managed accounts não recebem push direto; só owner. Se VIP olhando managed account, push contextualizado ao **owner**, não ao managed.
- **AAA-grade RLS pattern** (Plan 01-05) — `auth.uid() = user_id` + `has_plan(...)` em USING e WITH CHECK em UPDATE. Aplicar a `push_subscriptions`.
- **Adversarial test fixture pattern** (`src/test/integration/vip.adversarial.test.ts` Plan 02-06) — replicar pra `push.adversarial.test.ts`: Free attempts INSERT em push_subscriptions com event_type='promo_alert' → 42501; downgrade trigger limpa tokens etc.
- **`useIsIOSCapacitor` chokepoint canon** — aplica a auth providers UI, ícone iOS-specific behavior, splash duration adjustments. **G-CRIT-03 gate** (`strings | grep` no iOS bundle por pricing strings) passa só porque toda surface de pricing consome este hook — Phase 3 NÃO pode regredir.

### Integration Points

- **OAuth callback rewrite**: `Auth.tsx:89` + `AuthProvider.tsx:61` mudam `redirectTo` de `/dashboard` pra `/auth/callback`. Criar `src/pages/AuthCallback.tsx` + adicionar Route em `App.tsx`. **Compatibilidade web mantida**: rota funciona igual no browser.
- **Asaas webhook → push cleanup**: `supabase/functions/asaas-webhook` no path de downgrade (já wired em Plan 02-05 SUMMARY) dispara nova edge fn `cleanup-push-subscriptions` (Phase 3). Não rewrite — adiciona side-effect step.
- **`compute-personalized-promos` cron → push fanout**: edge function existente (Plan 02-06) chama nova edge fn `enqueue-push` pra cada user_promo_alerts INSERT recente. Cron-fanout pattern.
- **Capacitor App listener → React Router**: `Capacitor.App.addListener('appUrlOpen', deepLinkHandler)` precisa converter URL absoluta (`https://app.milespro.net.br/promocoes`) pra path relativo (`/promocoes`) e chamar `navigate(path)` do React Router. Stripping do origin é seguro porque AASA garante que só nosso domain chega aqui.
- **PostHog event taxonomy extension**: 12 helpers atuais em `useTelemetry.ts` ganham 4-5 novos pra push lifecycle. Discriminated union mantém type-safety.
- **Sentry Capacitor SDK integration**: `src/lib/sentry.ts` existing init chamado em `main.tsx`. Adicionar `@sentry/capacitor` initialization condicionada a `Capacitor.isNativePlatform()`. Same `beforeSend` PII scrubbing aplica.

</code_context>

<specifics>
## Specific Ideas

- **Banana skill direction (D-T04)**: Usuário escolheu AI generation. Iteração visual durante execução do plan via `/banana` — primeira batch deve testar variações do "M" estilizado com brand color #e8590c em background mais claro (Light icon — Apple HIG ondas iOS 18+). Dark variant + tinted variant também precisam (iOS 18 Home Screen).
- **iOS HIG accept-rate target pra D-T07**: 65-75%. Se ficar abaixo de 50% após o primeiro release, considerar mover pra "depois do 2º balance" (signal mais forte de intent).
- **Influencer outreach (D-T15)**: Não foi escolhido network direto pessoal, mas se uma conversa relevante surgir oportunisticamente (ex: amigo consultor pergunta o que você anda fazendo), aproveitar. Não é canal estruturado, é serendipity.
- **G-CRIT-03 gate é cycle-level kill switch** (ROADMAP §3 SC#1 e §"Test invocation matrix"): falhar este `strings | grep` no iOS bundle bloqueia LAUNCH-06. Phase 3 plan deve incluir gate explícito + execution antes de cada TestFlight upload.

</specifics>

<deferred>
## Deferred Ideas

- **TestFlight tester recruitment list curation** — implementation detail, planner sugere durante plano (founder + 5-10 contatos próximos + 30-40 community recruits).
- **App Store / Play Store listing copy completa** (descrição longa, keywords ASO, what's new) — deferred até depois de Phase 2 W3 + landing finalizado pra reaproveitar copy.
- **App Privacy nutrition labels detalhamento por categoria** (Apple obrigatório) — deferred ao plan específico de submission; deriva da Privacidade.tsx §5 sub-processadores list.
- **Helpdesk SLA operacional + runbook dos 5 tickets mais prováveis** — owned por LAUNCH-05 em Phase 2; Phase 3 só valida operacional.
- **Push rich notifications (imagem + action buttons + reply inline)** — backlog v2. v1 ships text-only payload.
- **Notification grouping/threading + badge count strategy** — implementation detail no plan; default = no grouping, badge resetar quando app abrir.
- **Capacitor App Widget (iOS Home Screen widget pra balanço de milhas)** — V2 / Deferred per REQUIREMENTS.md.
- **WhatsApp Business alerts (alternativa ao push)** — V2 / Deferred.
- **Deep-link de `/promocoes/[id]` específico** — v1 manda só `/promocoes` (lista); deep-link granular pra promo específica é backlog.
- **Deep-link de retorno de checkout web pro app** (`/assinatura?status=success`) — intencionalmente excluído por Path C concern (D-T09); revisitar pós-launch se sinal de friction.
- **Paid ads (Meta + Google) pra LAUNCH-06** — excluído do v1 (CAC > LTV); revisitar pós-LAUNCH-06.
- **Network direto pessoal estruturado** (lançamento privado pros 50-100 contatos) — não foi escolhido; usar oportunisticamente.

</deferred>

---

*Phase: 03-Mobile Distribution & Launch*
*Context gathered: 2026-05-13*
