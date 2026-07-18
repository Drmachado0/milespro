# Phase 3: Mobile Distribution & Launch — Research

**Researched:** 2026-05-13
**Domain:** Capacitor mobile distribution (iOS Path C App Store + Android targetSdk=35 Play Store), Universal/App Links, Push notifications via FCM HTTP v1 + APNs, Sign in with Apple, App Review submission, helpdesk operational readiness, outreach for first 10 pagantes
**Confidence:** HIGH on Capacitor packaging / FCM v1 / AASA mechanics / Supabase Apple provider; MEDIUM on App Review subjective interpretation of Path C neutral language; LOW on accept-rate of contextual push prompt (operational best-practice, not vendor SLA)

---

## Summary

Phase 3 is the **distribution layer** of MilesPro — Phase 2 already shipped the entire revenue path on the web (Asaas billing, LGPD endpoints, telemetry, PostHog/Sentry, production at `app.milespro.net.br`, multi-CPF VIP UI, the `useIsIOSCapacitor` Path C runtime chokepoint, the `compute-personalized-promos` cron that powers the D-13 killer feature). What remains is **wrapping** that web application as native apps that Apple and Google will distribute, **connecting** push notifications from the existing Supabase Edge Functions to iOS APNs and Android FCM, **rerouting** OAuth/email/promo links through Universal Links and App Links so taps land back in the app instead of Safari/Chrome, and **acquiring** the first 10 paying CPFs (web-first; mobile approval is parallel, not blocking).

Three cycle-level kill-switches own this phase: **G-CRIT-03** (`strings | grep` on the iOS bundle must return zero pricing matches — fail = blocked LAUNCH-06), **Apple Guideline 3.1.3(b)** Multiplatform Services exemption (submission notes must explicitly cite + provide demo credentials + link to web checkout outside the app), and **Apple Guideline 4.8** Sign in with Apple (mandatory because Google OAuth is offered; verified at `src/pages/Auth.tsx:86-91`). The Apple Developer Program + Play Console accounts are **both pending** (D-T14) — opening them in parallel with PJ approval is **Task #0** of any plan and is a hard-blocker.

**Primary recommendation:** Plan in 4 parallel tracks — (A) **Developer accounts + assets** (open Apple + Play in parallel; generate icon/splash via banana skill; pin `capacitor.config.ts` to `br.com.milespro.app` + `MilesPro`); (B) **Deep-links infrastructure** (AASA + assetlinks at Vercel `public/.well-known/`, `vercel.json` headers, `src/lib/deepLinkHandler.ts` chokepoint, `src/pages/AuthCallback.tsx` for PKCE exchange, Supabase Apple provider config, `src/pages/Auth.tsx` redirectTo rewrite gated by `useIsIOSCapacitor()`); (C) **Push pipeline** (`push_subscriptions` table + RLS + downgrade trigger, `enqueue-push` edge fn with `has_plan('pro')` gate + `_shared/timingSafeEq.ts` extraction, `send-push-notification` edge fn with FCM HTTP v1 + JWT-from-service-account OAuth2 flow, contextual permission via `useUserPrograms` count >= 1 trigger, 4 events wired from existing crons/webhooks); (D) **Submission + outreach** (Android first to Play Internal → Closed → Production with `targetSdk=35`; iOS TestFlight parallel for warmup; App Privacy nutrition labels derived from Privacidade.tsx §5; outreach starts web-first as soon as Asaas live, not waiting for Apple approval).

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

**App Identity:**
- **D-T01** — Bundle ID `br.com.milespro.app` (iOS + Android identical). Reverse-DNS of TLD `.net.br`. Replace placeholder `app.lovable.e39f4ef4c00a4d6e8e5c8722bb465399`. Applied to: `capacitor.config.ts` `appId`, Apple Developer App ID, Play Console package, AASA `appIDs`, `assetlinks.json` `package_name`.
- **D-T02** — Display Name `MilesPro` (one word, 8 chars, does not truncate). Applied to: `Info.plist` `CFBundleDisplayName`, `AndroidManifest.xml` `android:label`, App Store Connect product name, Play Console title.
- **D-T03** — Auth providers:
  - iOS: email/password + Google + **Apple Sign-In (mandatory per Apple Review Guideline 4.8)**
  - Android: email/password + Google
  - Implementation: create Apple Service ID + Sign In with Apple key in Apple Developer Console; enable Apple provider in Supabase Auth → Providers; entitlement Sign in with Apple in Xcode; `src/pages/Auth.tsx` adds Apple button gated by `useIsIOSCapacitor()`.
- **D-T04** — Icon + Splash via AI generation (banana skill). Brand color `--mp-orange-* #e8590c` (Tailwind). Master 1024×1024 → `@capacitor/assets` resizes to all densities + adaptive icon Android (foreground + background `#171717` from current `SplashScreen.backgroundColor` + monochrome Material You) + dark/light splash via `plugins.SplashScreen.backgroundColorDark`. Replace `/public/pwa-192x192.png`, `/public/pwa-512x512.png`, `/public/placeholder.svg`.

**Push Notifications:**
- **D-T05** — Provider: `@capacitor/push-notifications` + FCM/APNs direct (no OneSignal). FCM HTTP v1 API with service-account JSON in Supabase Vault (`push_fcm_service_account`). Edge function `send-push-notification` generates OAuth2 token from FCM service account JWT and sends payload. Cost: $0. Vendor dependency: Google FCM only.
- **D-T06** — Events v1 (all 4):
  1. Vencimento de milhas [Pro+] — daily cron scans balances `expires_at - alert_antecipation_days <= now()`; backend already exists (TIER-02).
  2. Promotion alert personalizado D-13 [Pro+] — fanout from `compute-personalized-promos` cron @ 02:00 UTC.
  3. Payment events: PAYMENT_CONFIRMED + PAYMENT_OVERDUE + trial_ending 3d antes [All tiers] — billing, no paywall.
  4. Onboarding milestone: first balance + first program [All tiers] — engagement nudge.
- **D-T07** — Permission timing: **contextual** after first balance (`user_programs` INSERT count >= 1). Custom pre-prompt before native prompt: "Avisamos quando suas milhas estiverem perto de vencer ou quando aparecer uma promo de transferência. Permitir avisos?" → [Permitir] [Agora não]. **NOT at signup** (iOS HIG anti-pattern). `Info.plist` `NSUserNotificationsUsageDescription`: "Avisar você sobre vencimentos de milhas e promoções".
- **D-T08** — Gating server-side + downgrade cleanup:
  - Migration: `push_subscriptions(id, user_id, device_token, platform, app_version, created_at, last_seen_at)` + RLS (SELECT/INSERT own; UPDATE/DELETE own or service-role; partial UNIQUE `(user_id, device_token) WHERE device_token IS NOT NULL`).
  - Edge function `enqueue-push` checks `has_plan('pro')` before fetching tokens.
  - `asaas-webhook` downgrade path (PAYMENT_OVERDUE → grace expires → plan=free) triggers `cleanup-push-subscriptions` to wipe Pro+ tokens.
  - Free post-downgrade only receives billing events.

**Deep Links:**
- **D-T09** — Routes: `/auth/callback` (NEW page) + `/lgpd/confirm-delete` (existing) + `/promocoes` (existing). **`/assinatura` INTENTIONALLY EXCLUDED** — Path C concern, no deep-link from iOS to pricing.
- **D-T10** — URL scheme: HTTPS-only via AASA/assetlinks (NO custom `milespro://` scheme).
- **D-T11** — AASA hosting: Vercel `public/.well-known/` + `vercel.json` headers (no `.json` extension on AASA file, MIME `application/json`).
- **D-T12** — Deep-link auth gate: `sessionStorage` returnTo pattern via `src/lib/deepLinkHandler.ts`. Listener registered in `App.tsx` `useEffect` (alongside `initSentry`). Pre-auth deep-link → `sessionStorage.setItem('returnTo', target)` + `navigate('/auth')`. Post-login `AuthProvider` reads + consumes. `/auth/callback` is exception (runs without auth gate — it IS the callback).

**Submission & Outreach:**
- **D-T13** — Order: **Android first**, then iOS. Play Console more permissive + 18-24h iteration vs Apple 48h+. TestFlight runs in parallel (50 testers warm-up).
- **D-T14** — Apple Developer Program ($99/yr via PJ + DUNS, 3-7 days) + Play Console ($25 one-time + ~24h) — **both pending**. Hard-blocker. **Task #0** of plan opens them in parallel.
- **D-T15** — Outreach: orgânico (Facebook miles groups Smiles/Multiplus/LATAM Pass/Livelo/Esfera, Reddit r/MilhasBrasil, Telegram, Passageiro de Primeira) — read group rules, some ban self-promo + influencer (top 10-20 BR miles creators, 4-8 week cadence, R$500-5000 sponsorship). Excluded v1: paid ads, structured personal network.
- **D-T16** — Web first. Outreach launches as soon as `app.milespro.net.br` + Asaas live. Pagantes web count for LAUNCH-06. iOS approval does NOT block outreach.

### Claude's Discretion

- **Push notification payload schema** — data fields, badge count strategy, notification grouping/threading (`thread-id` iOS / `tag` Android). User did not specify; researcher proposes based on Capacitor Push docs.
- **AuthCallback.tsx loading UX** — researcher proposes skeleton + error state based on existing patterns (`PlanProtectedRoute`, `ProtectedRoute`).
- **TestFlight tester recruitment list** — planner recommends (founder + 5-10 close contacts + 30-40 miles-community recruits).
- **Sentry `@sentry/capacitor` v4 integration** — deferred from Plan 02-03; planner includes as task, follows existing `src/lib/sentry.ts` pattern.

### Deferred Ideas (OUT OF SCOPE)

- TestFlight tester recruitment list curation (implementation detail)
- App Store / Play Store listing copy (long description, ASO keywords, what's new) — deferred until Phase 2 W3 + landing finalized
- App Privacy nutrition labels detailed per category — deferred to submission plan; derives from Privacidade.tsx §5 sub-processors
- Helpdesk SLA + runbook for top 5 tickets — owned by LAUNCH-05 in Phase 2 (Crisp + WhatsApp Business already live); Phase 3 only validates operational
- Push rich notifications (image + action buttons + reply inline) — backlog v2. v1 ships text-only
- Notification grouping/threading + badge count strategy — implementation detail in plan; default = no grouping, badge resets on app open
- Capacitor App Widget (iOS Home Screen widget for miles balance) — V2/Deferred per REQUIREMENTS.md
- WhatsApp Business alerts (push alternative) — V2/Deferred
- Deep-link `/promocoes/[id]` specific (v1 ships only `/promocoes` list) — backlog
- Deep-link return-from-checkout-web to app (`/assinatura?status=success`) — intentionally excluded per Path C (D-T09); revisit post-launch
- Paid ads (Meta + Google) for LAUNCH-06 — excluded v1 (CAC > LTV); revisit post-LAUNCH-06
- Structured personal-network launch — not selected; use opportunistically

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MOBILE-01 | iOS Path C build (zero pricing strings in iOS bundle — `strings | grep` returns zero on `planos|checkout|R\$|Upgrade|Assinar`) | §"iOS Path C Build Verification", §"Architectural Responsibility Map" — `useIsIOSCapacitor` already canonical, every pricing surface wrapped (Plan 02-06) |
| MOBILE-02 | Android `targetSdk=35` build, `minSdk` revisited | §"Android targetSdk=35 Migration" (Play Console 2026 deadline, AndroidManifest.xml changes, Capacitor 7 compatibility) |
| MOBILE-03 | Universal Links (iOS AASA) + App Links (Android assetlinks.json) for OAuth + email transactional + checkout-web → app return | §"Universal Links + App Links Setup" (AASA payload, assetlinks payload, Vercel hosting, Capacitor `appUrlOpen`, deepLinkHandler) |
| MOBILE-04 | Push notifications via Capacitor + FCM/APNs, Pro/VIP feature, contextual permission | §"@capacitor/push-notifications Integration" + §"FCM HTTP v1 API Server-side" + §"Push Permission Flow" |
| MOBILE-05 | App Review submission notes citing Multiplatform Services exemption 3.1.3(b) + demo creds + checkout web URL | §"Apple App Store Submission (Path C)" — submission notes template |
| LAUNCH-02 | iOS build submitted + approved | §"Apple App Store Submission" |
| LAUNCH-03 | Android build submitted + approved | §"Play Store Submission" |
| LAUNCH-06 | First 10 paying CPFs (PAYMENT_RECEIVED via Asaas, not in trial) | §"Outreach Playbook" — web-first + orgânico + influencer |

---

## Project Constraints (from CLAUDE.md)

These project-level directives apply to Phase 3 the same as every other phase:

- **Idioma**: All user-facing strings + responses in pt-BR. Code/commits/identifiers in English.
- **TypeScript strict**; no `any` except documented boundaries.
- **Components PascalCase**, hooks `useCamelCase`, path alias `@/` → `src/`.
- **shadcn/ui** for components; **Tailwind** for styles.
- **react-query** for server state; `useState`/context for local.
- **`logger.*`** never `console.*` (Plan 02-03 / TEL-03 / Sentry `beforeBreadcrumb` drops console breadcrumbs anyway).
- **Sonner** for toasts.
- **Locked decisions** (do not reopen): Stack = Supabase + React + shadcn + Capacitor. Gateway = Asaas. **iOS = Path C, no IAP, no pricing UI**. Trial = 7d Pro with card on file. PJ obligatorio for Asaas live. 3 tiers Free/Pro/VIP. Multi-CPF = VIP exclusive.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| iOS Path C runtime pricing-hide | Browser (Capacitor WebView) | — | `useIsIOSCapacitor` checks `Capacitor.getPlatform() === 'ios'` at runtime; same JS bundle ships to web/Android/iOS, branching happens client-side |
| `strings\|grep` gate on iOS bundle | Build/CI (post-build artifact) | — | Verifies static asset (`.ipa`); not a runtime gate, runs against the compiled JS chunks bundled into the iOS app |
| Universal Links / App Links domain verification | CDN/Static (Vercel `/.well-known/*`) | — | Apple's CDN fetches AASA from production domain; assetlinks served same path; not API logic |
| OAuth PKCE code exchange | Browser/Client (`/auth/callback` page) | API (Supabase Auth) | `supabase.auth.exchangeCodeForSession(code)` is a client call; the Auth API validates and issues session |
| Deep-link URL parsing + navigation | Browser (Capacitor App listener) | — | `App.addListener('appUrlOpen', ...)` runs in WebView; `useNavigate` from React Router consumes path |
| Push notification permission prompt | Browser (Capacitor Push plugin) | — | Native permission dialog wrapped by JS API; trigger logic lives in React component |
| Push token registration | Browser (Capacitor) → API (Supabase REST INSERT into `push_subscriptions`) | — | Token comes from APNs/FCM via plugin event; client INSERTs into RLS-gated table |
| Push notification enqueue + delivery | API/Backend (Supabase Edge Function `enqueue-push`) | API (FCM HTTP v1) | Server-side `has_plan('pro')` gate + service-account JWT signing happens in Deno edge fn, never in client |
| Downgrade cleanup of Pro+ tokens | API/Backend (Edge Function `cleanup-push-subscriptions`) | — | Triggered from `asaas-webhook` PAYMENT_OVERDUE/grace-expired path; service-role DELETE bypasses RLS for housekeeping |
| App Store / Play Store listing | Out-of-band (Apple/Google dashboards) | — | Submission metadata + binaries uploaded via web consoles, not git |
| App icon + splash generation | Build artifact (`@capacitor/assets` CLI) | — | One-shot CLI run that writes to `ios/App/App/Assets.xcassets/` + `android/app/src/main/res/`; outputs committed |
| Helpdesk + WhatsApp ops | Out-of-band (Crisp + WhatsApp Business) | — | Crisp widget already shipped (Plan 02-04 W1c, gated by marketing consent + `!useIsIOSCapacitor()`); operations work happens in dashboards |
| Outreach (community + influencer) | Out-of-band (Facebook/Reddit/Telegram/email) | — | Manual outreach work; no code |

---

## Standard Stack

### Core (Capacitor 7.x — pin to existing major)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@capacitor/core` | `^7.6.5` | Capacitor runtime | Already pinned at `^7.4.4` in `package.json:23`. Capacitor 8.3.4 is current latest, but staying on 7.x avoids a major upgrade during launch phase — `latest-7` dist-tag confirms ongoing patch support. `[VERIFIED: npm view @capacitor/core dist-tags → latest-7: 7.6.5]` |
| `@capacitor/cli` | `^7.4.x` | Build/sync CLI | Pinned at `^7.6.2` in devDeps. `[VERIFIED]` |
| `@capacitor/ios` | `^7.6.x` | iOS platform wrapper | Pin same major as core. `[VERIFIED: npm view @capacitor/ios@7]` |
| `@capacitor/android` | `^7.6.x` | Android platform wrapper | Pin same major as core. `[VERIFIED]` |
| `@capacitor/app` | `^7.0.x` | App lifecycle + **`appUrlOpen` listener** for deep links | Canonical Capacitor plugin for deep-link reception. `[VERIFIED: npm view @capacitor/app@7 version → 7.0.0]` `[CITED: capacitorjs.com/docs/apis/app]` |
| `@capacitor/push-notifications` | `^7.0.6` | iOS APNs + Android FCM token registration + permission prompt + delivery events | Locked by D-T05. `[VERIFIED: npm view @capacitor/push-notifications@7 → 7.0.6]` `[CITED: capacitorjs.com/docs/apis/push-notifications]` |

### Supporting (new for Phase 3)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@capacitor/assets` | `^3.0.5` | Icon + splash generator (1024×1024 master → all densities + adaptive icons) | One-shot dev dep; `npx capacitor-assets generate` writes to `ios/App/App/Assets.xcassets/` + `android/app/src/main/res/`. `[VERIFIED: npm view @capacitor/assets version → 3.0.5]` |
| `@sentry/capacitor` | **DEFERRED — see warning below** | Native crash reporting + WebView errors | Plan 02-03 deferred this to Phase 3. `[VERIFIED]` |

### CRITICAL Sentry Capacitor compatibility caveat

`[VERIFIED: npm view @sentry/capacitor@4 peerDependencies]` `@sentry/capacitor@4.0.0` requires `@sentry/react@10.43.0` — but `package.json:53` has `@sentry/react@^8.55.2`. `@sentry/capacitor@3.2.1` (the latest v3) also requires `@sentry/react@10.43.0`. There is **no version of `@sentry/capacitor` that is peer-compatible with `@sentry/react@8`**.

**Three options:**
1. **Upgrade `@sentry/react` to v10** — major version jump from v8 → v10 (skip v9). v10 has breaking changes: `Sentry.BrowserTracing` integration shape, `Sentry.replayIntegration` API. Existing `src/lib/sentry.ts` (`beforeSend` + `beforeBreadcrumb` + `browserTracingIntegration`) needs audit. `[CITED: sentry.io/docs/platforms/javascript/guides/react/migration/]`
2. **Skip `@sentry/capacitor`, use `@sentry/react` alone** — `Sentry.init` runs the same way under Capacitor WebView as in browser; you lose native iOS/Android crash reporting (Sentry can only capture JS errors that surface in the WebView, not native Swift/Java crashes). Acceptable for v1 launch with 10 pagantes.
3. **Defer Sentry Capacitor to backlog v2** — Plan 02-03 already deferred Deno edge fn Sentry to backlog; deferring native Sentry is consistent.

**Recommendation:** Option 2 (skip `@sentry/capacitor`, document deferral). Rationale: native crash visibility is low value at 10-user scale; upgrade burden is high; existing `src/lib/sentry.ts` `beforeSend`/`beforeBreadcrumb` already covers WebView JS errors. Re-evaluate post-LAUNCH-06.

**Verification commands:**
```bash
npm view @capacitor/core dist-tags          # confirm latest-7 still active
npm view @capacitor/push-notifications@7    # confirm 7.0.6 still latest in 7.x
npm view @capacitor/app@7                   # confirm 7.0.0+ in 7.x line
npm view @sentry/capacitor@4 peerDependencies  # confirm requires @sentry/react@10
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@capacitor/push-notifications` + FCM HTTP v1 direct | OneSignal | Locked OUT by D-T05 (vendor lock-in, $0 → eventual paid tier, third-party PII processor not in Privacidade.tsx §5 sub-processor list — would force LGPD policy bump) |
| FCM HTTP v1 from edge function | Firebase Admin SDK (Node) | Deno-native HTTP + JWT signing has no Firebase Admin SDK equivalent; HTTP v1 with manual OAuth2 token mint is the standard pattern `[CITED: firebase.google.com/docs/cloud-messaging/migrate-v1]` |
| `@sentry/capacitor` | `@sentry/react` alone | See above — peer-dep collision with current React Sentry. v1 ships without native crash reporting. |
| Custom `milespro://` scheme | HTTPS Universal Links | Locked OUT by D-T10 (spoofing risk, Apple Review may flag, AASA domain validation is the canonical defense) |
| Apple IAP (Path A) | Path C (no IAP, no pricing UI) | Locked OUT by `.planning/PROJECT.md` Key Decisions (15-30% Apple fee, dual-source-of-truth) |

**Installation:**
```bash
# Already installed (verify versions match)
npm ls @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android

# New for Phase 3
npm install --save @capacitor/app@^7 @capacitor/push-notifications@^7
npm install --save-dev @capacitor/assets@^3
```

---

## Architecture Patterns

### System Architecture Diagram

```
                              ┌──────────────────────────────────────┐
                              │   Apple AASA CDN                     │
                              │   app-site-association.cdn-apple.com │
                              │   (caches 1h, override Cache-Control)│
                              └────────────▲─────────────────────────┘
                                           │ fetches once at install
                                           │ + periodic refresh
┌───────────────────────────────────────────┴──────────────────────────────────┐
│  Vercel (app.milespro.net.br)                                                │
│  ┌────────────────────────────┐  ┌─────────────────────────────────────────┐ │
│  │ public/.well-known/        │  │ React SPA (Capacitor WebView host)      │ │
│  │  ├─ apple-app-site-...     │  │  • /auth/callback (PKCE exchange)       │ │
│  │  └─ assetlinks.json        │  │  • /lgpd/confirm-delete (HMAC token)    │ │
│  │ (Content-Type:             │  │  • /promocoes (D-13 push target)        │ │
│  │  application/json,         │  │  • Other routes (Path C: pricing UI     │ │
│  │  max-age=3600)             │  │    hidden by useIsIOSCapacitor)         │ │
│  └────────────────────────────┘  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
       ▲                                       ▲
       │ Universal Link / App Link            │ HTTPS
       │ tap (notification, email,            │
       │ external share)                      │
       │                                       │
┌──────┴─────────────────────────────┐    ┌────┴──────────────────────────────┐
│  iOS Capacitor App                 │    │  Android Capacitor App            │
│  (br.com.milespro.app)             │    │  (br.com.milespro.app)            │
│  ┌──────────────────────────────┐  │    │  ┌─────────────────────────────┐  │
│  │ AppDelegate verifies AASA    │  │    │  │ AndroidManifest.xml         │  │
│  │ → intercepts matching URL    │  │    │  │ autoVerify=true →           │  │
│  │ → fires UIApplication        │  │    │  │ Play Protect verifies       │  │
│  │   continueUserActivity       │  │    │  │ assetlinks.json             │  │
│  │ → Capacitor App.appUrlOpen   │  │    │  │ → fires onNewIntent         │  │
│  │   listener event             │  │    │  │ → Capacitor App.appUrlOpen  │  │
│  └─────────┬────────────────────┘  │    │  └────────┬────────────────────┘  │
│            ▼                       │    │           ▼                       │
│  ┌──────────────────────────────┐  │    │  ┌─────────────────────────────┐  │
│  │ src/lib/deepLinkHandler.ts   │  │    │  │ src/lib/deepLinkHandler.ts  │  │
│  │ 1. strip origin → path       │  │    │  │ (same code path —           │  │
│  │ 2. check auth + returnTo     │  │    │  │  Capacitor unifies)         │  │
│  │ 3. React Router navigate     │  │    │  │                             │  │
│  └──────────────────────────────┘  │    │  └─────────────────────────────┘  │
│                                    │    │                                   │
│  ┌──────────────────────────────┐  │    │  ┌─────────────────────────────┐  │
│  │ @capacitor/push-notifications│  │    │  │ @capacitor/push-notifications│ │
│  │  → APNs token                │  │    │  │  → FCM token                │  │
│  └──────────┬───────────────────┘  │    │  └──────────┬──────────────────┘  │
└─────────────┼──────────────────────┘    └─────────────┼──────────────────────┘
              │                                         │
              │ POST push_subscriptions                 │ (same path)
              │ (RLS: own row only,                     │
              │  partial UNIQUE user_id+token)          │
              ▼                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Supabase (opusftqbbaozucmbuuug.supabase.co)                                │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Tables                                                                 │ │
│  │  • push_subscriptions (id, user_id, device_token, platform,            │ │
│  │    app_version, created_at, last_seen_at) + RLS                        │ │
│  │  • user_promo_alerts (existing, from Plan 02-06)                       │ │
│  │  • user_subscriptions, user_settings, user_programs (existing)         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Edge Functions (Deno)                                                  │ │
│  │  • enqueue-push (Phase 3) — Bearer auth, checks has_plan('pro') for    │ │
│  │    Pro+ events, fetches push_subscriptions tokens, calls FCM HTTP v1   │ │
│  │  • send-push-notification (Phase 3) — wraps FCM v1: JWT sign with      │ │
│  │    service-account JSON → OAuth2 token → POST to fcm.googleapis.com    │ │
│  │  • cleanup-push-subscriptions (Phase 3) — invoked by asaas-webhook     │ │
│  │    on downgrade, DELETEs Pro+ tokens                                   │ │
│  │  • asaas-webhook (existing, Plan 02-05) — extended to fan out          │ │
│  │    PAYMENT_CONFIRMED/OVERDUE to enqueue-push                           │ │
│  │  • compute-personalized-promos (existing, Plan 02-06) — extended to    │ │
│  │    fan out new user_promo_alerts INSERTs to enqueue-push (D-T06 #2)    │ │
│  │  • _shared/timingSafeEq.ts (Phase 3 — extract from 4 duplications)     │ │
│  │  • _shared/fcmSignJWT.ts (Phase 3 — service-account JWT signing)       │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Vault                                                                  │ │
│  │  • push_fcm_service_account (full service-account JSON, JSONB string)  │ │
│  │  • apple_signin_secret (optional — used only for web/Android Apple     │ │
│  │    OAuth flow; iOS Capacitor uses idToken direct, no secret needed)    │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              │ POST https://fcm.googleapis.com/v1/projects/
                              │      {project_id}/messages:send
                              │ Bearer <oauth2_access_token>
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Google FCM HTTP v1                                                         │
│   • routes to APNs (iOS) or FCM Android transport                           │
│   • payload shape: {message:{token:..., notification:{title,body},          │
│     apns:{...}, android:{...}, data:{deep_link_path:'/promocoes'}}}         │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                       Device receives push
                       → tap → opens app
                       → @capacitor/push-notifications
                         pushNotificationActionPerformed event
                       → reads data.deep_link_path
                       → React Router navigate
```

### Recommended Project Structure

```
src/
├── lib/
│   ├── deepLinkHandler.ts        # NEW — Capacitor App.appUrlOpen chokepoint (D-T12)
│   ├── pushNotifications.ts      # NEW — register, permission prompt, action handler
│   └── sentry.ts                 # EXISTING (no Capacitor SDK — see deferral above)
├── pages/
│   ├── AuthCallback.tsx          # NEW — PKCE exchange after Google/Apple OAuth
│   ├── Auth.tsx                  # MODIFY — redirectTo /auth/callback, add Apple button (gated)
│   ├── Promocoes.tsx             # EXISTING (D-13 push target)
│   └── LgpdConfirmDelete.tsx     # EXISTING (Plan 02-02)
├── contexts/
│   └── AuthProvider.tsx          # MODIFY — emailRedirectTo /auth/callback, sessionStorage returnTo consume
├── hooks/
│   ├── usePushPermission.ts      # NEW — contextual prompt logic (user_programs >= 1 trigger)
│   ├── useIsIOSCapacitor.ts      # EXISTING (Plan 02-06 canonical)
│   ├── useTelemetry.ts           # MODIFY — add 4-5 push helpers
│   └── useUserPrograms.ts        # EXISTING (trigger source for push permission)
├── components/
│   ├── auth/
│   │   └── AppleSignInButton.tsx # NEW — gated by useIsIOSCapacitor()
│   └── push/
│       └── PushPermissionPrompt.tsx  # NEW — pre-prompt UI
└── App.tsx                       # MODIFY — register deepLinkHandler in useEffect, add /auth/callback Route

public/
└── .well-known/
    ├── apple-app-site-association   # NEW — NO .json extension (AASA spec)
    └── assetlinks.json               # NEW

supabase/
├── functions/
│   ├── _shared/
│   │   ├── timingSafeEq.ts       # NEW — extracted from 4 duplications
│   │   ├── fcmSignJWT.ts         # NEW — service-account → OAuth2 token
│   │   └── cors.ts               # EXISTING
│   ├── enqueue-push/             # NEW — has_plan('pro') gate + token fetch + delivery
│   │   ├── index.ts
│   │   └── index.test.ts
│   ├── send-push-notification/   # NEW — FCM HTTP v1 wrapper
│   │   ├── index.ts
│   │   └── index.test.ts
│   ├── cleanup-push-subscriptions/  # NEW — downgrade trigger from asaas-webhook
│   │   ├── index.ts
│   │   └── index.test.ts
│   └── asaas-webhook/            # MODIFY — fan out PAYMENT_* to enqueue-push + grace-expiry triggers cleanup
└── migrations/
    └── 20260515120005_push_subscriptions.sql  # NEW

ios/                              # NEW (regenerated by npx cap add ios)
└── App/App/
    ├── Info.plist                # adds aps-environment, NSUserNotificationsUsageDescription, AppleSignIn entitlement
    └── App.entitlements          # adds Sign in with Apple + Associated Domains (applinks:app.milespro.net.br)

android/                          # NEW (regenerated by npx cap add android)
└── app/src/main/
    ├── AndroidManifest.xml       # adds intent-filter for autoVerify=true + POST_NOTIFICATIONS permission (Android 13+)
    ├── res/
    │   └── mipmap-*/             # adaptive icon (foreground + background + monochrome)
    └── google-services.json      # FCM service account public config (PUBLIC, ok to commit)
```

### Pattern 1: Deep Link Handler Chokepoint (D-T12)

**What:** Single function that parses any incoming Universal/App Link URL, strips the origin to a path, checks auth, and either navigates immediately or stashes `returnTo` in sessionStorage and routes to `/auth`. Registered as a `Capacitor.App` listener in `App.tsx` `useEffect`.

**When to use:** Every deep-link target route (the 3 routes in D-T09 + any future addition).

**Example:**

```typescript
// src/lib/deepLinkHandler.ts
// Source: capacitorjs.com/docs/guides/deep-links + capacitorjs.com/docs/apis/app
import { App, type URLOpenListenerEvent } from '@capacitor/app';
import type { NavigateFunction } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

const ALLOWED_HOST = 'app.milespro.net.br';

/**
 * Subscribes the Capacitor App.appUrlOpen listener. Returns an unsubscribe
 * function for cleanup in useEffect.
 *
 * Why a chokepoint and not inline in App.tsx:
 *   - All deep-link routing logic in one place (testable, replaceable).
 *   - sessionStorage returnTo write happens here so AuthProvider only reads,
 *     never writes — separation of producer and consumer.
 *   - Future routes added by appending to ALLOWED_PATHS; no plumbing in App.tsx.
 */
export function registerDeepLinkHandler(navigate: NavigateFunction): () => void {
  const handle = App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
    try {
      const url = new URL(event.url);
      if (url.host !== ALLOWED_HOST) {
        logger.warn('[DeepLink]', 'Rejected non-allowed host:', url.host);
        return;
      }
      const path = url.pathname + url.search;

      // /auth/callback is the OAuth callback target — runs without auth check
      // (it IS the auth callback). AuthCallback.tsx calls exchangeCodeForSession.
      if (path.startsWith('/auth/callback')) {
        navigate(path);
        return;
      }

      // For all other deep-link targets: check auth first.
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          navigate(path);
        } else {
          sessionStorage.setItem('returnTo', path);
          navigate('/auth');
        }
      });
    } catch (err) {
      logger.error('[DeepLink]', 'Failed to parse URL:', event.url, err);
    }
  });

  return () => {
    handle.then((h) => h.remove());
  };
}
```

```typescript
// src/App.tsx (excerpt — add inside AppRoutes useEffect)
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { registerDeepLinkHandler } from '@/lib/deepLinkHandler';

const navigate = useNavigate();
useEffect(() => {
  if (!Capacitor.isNativePlatform()) return;
  return registerDeepLinkHandler(navigate);
}, [navigate]);
```

```typescript
// src/contexts/AuthProvider.tsx (excerpt — consume returnTo after login)
// Inside the onAuthStateChange listener, after setSession + setUser:
if (event === 'SIGNED_IN' && session) {
  const returnTo = sessionStorage.getItem('returnTo');
  if (returnTo) {
    sessionStorage.removeItem('returnTo');
    // navigate must be called from a component that has React Router context;
    // wire this via a callback prop or via a separate effect in App.tsx that
    // watches session changes — see Plan task for exact wiring.
  }
}
```

### Pattern 2: OAuth PKCE Callback Page

**What:** New page at `/auth/callback` that runs `supabase.auth.exchangeCodeForSession(code)` to complete the OAuth PKCE flow. Required because the OAuth provider (Google/Apple) returns to a `?code=...&state=...` URL, not directly to `/dashboard`. Universal Link captures this URL and routes it through `deepLinkHandler` → React Router → this page.

**When to use:** Any OAuth provider in Supabase (Google now, Apple Phase 3).

**Example:**

```typescript
// src/pages/AuthCallback.tsx
// Source: supabase.com/docs/guides/auth/sessions/pkce-flow
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setError('Código de autenticação ausente');
      return;
    }

    supabase.auth.exchangeCodeForSession(code).then(({ data, error: err }) => {
      if (err) {
        logger.error('[AuthCallback]', 'Code exchange failed:', err);
        setError('Falha ao concluir autenticação');
        return;
      }
      if (!data.session) {
        setError('Sessão não criada');
        return;
      }
      // Consume returnTo (set by deepLinkHandler.ts when pre-auth deep-link
      // landed). Falls back to /dashboard.
      const returnTo = sessionStorage.getItem('returnTo') ?? '/dashboard';
      sessionStorage.removeItem('returnTo');
      navigate(returnTo, { replace: true });
    });
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="text-center text-sm">{error}</p>
        <button onClick={() => navigate('/auth')} className="text-mp-orange-500 underline">
          Voltar para login
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-mp-orange-500" />
      <p className="text-sm text-muted-foreground">Concluindo autenticação…</p>
    </div>
  );
}
```

### Pattern 3: FCM HTTP v1 OAuth2 Token Mint in Deno

**What:** Service-account JSON (private key + client_email) is loaded from Supabase Vault, used to sign a JWT claim, exchanged at `https://oauth2.googleapis.com/token` for a 1-hour access token, then used as `Authorization: Bearer <token>` against `POST https://fcm.googleapis.com/v1/projects/{project_id}/messages:send`. Token cached in-memory per edge fn cold start (max 1 hour, refresh well before expiry).

**When to use:** `send-push-notification` edge fn (the only consumer of FCM).

**Example:**

```typescript
// supabase/functions/_shared/fcmSignJWT.ts
// Source: firebase.google.com/docs/cloud-messaging/migrate-v1 +
//         developers.google.com/identity/protocols/oauth2/service-account
import { create as createJWT, getNumericDate } from 'https://deno.land/x/djwt@v3.0.2/mod.ts';

export interface FCMServiceAccount {
  project_id: string;
  private_key: string;     // PEM-encoded RSA private key
  client_email: string;
  token_uri: string;       // typically https://oauth2.googleapis.com/token
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getFCMAccessToken(sa: FCMServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) {
    return cachedToken.token;
  }

  // Import PEM private key into CryptoKey (RS256)
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = sa.private_key
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '');
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  // Sign JWT claim
  const jwt = await createJWT(
    { alg: 'RS256', typ: 'JWT' },
    {
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: sa.token_uri,
      exp: getNumericDate(60 * 60),
      iat: getNumericDate(0),
    },
    key,
  );

  // Exchange JWT for access token
  const resp = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!resp.ok) throw new Error(`FCM OAuth2 exchange failed: ${resp.status}`);
  const data = await resp.json() as { access_token: string; expires_in: number };

  cachedToken = { token: data.access_token, expiresAt: now + data.expires_in };
  return data.access_token;
}
```

```typescript
// supabase/functions/send-push-notification/index.ts (excerpt)
import { getFCMAccessToken, type FCMServiceAccount } from '../_shared/fcmSignJWT.ts';

const saJson = Deno.env.get('PUSH_FCM_SERVICE_ACCOUNT_JSON') ?? '';
const sa = JSON.parse(saJson) as FCMServiceAccount;

const token = await getFCMAccessToken(sa);
const resp = await fetch(
  `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        token: deviceToken,
        notification: { title, body },
        data: { deep_link_path: '/promocoes', event_type: 'promo_alert' },
        apns: {
          payload: {
            aps: {
              alert: { title, body },
              sound: 'default',
              'thread-id': 'promo',  // groups promo notifications on iOS
            },
          },
        },
        android: {
          notification: { tag: 'promo' },  // collapses on Android
          priority: 'HIGH',
        },
      },
    }),
  },
);
if (!resp.ok) {
  // 404 UNREGISTERED → token invalid; DELETE from push_subscriptions
  // 400 INVALID_ARGUMENT → log + drop
  // 5xx → retry with exponential backoff
}
```

### Pattern 4: AASA Payload + Vercel Headers

**What:** Apple AASA file served at `public/.well-known/apple-app-site-association` (NO `.json` extension) + `assetlinks.json` for Android. Vercel must serve both with `Content-Type: application/json` (Apple's CDN rejects `text/html`). Apple's CDN caches AASA at `https://app-site-association.cdn-apple.com/a/v1/<domain>` with up to 1-hour TTL; rolling out a change takes the CDN refresh + a week-long client check-in window.

**When to use:** Phase 3 W0 task. Verify via Apple's CDN URL + Google's [Statement List Generator](https://developers.google.com/digital-asset-links/tools/generator).

**Example:**

```json
// public/.well-known/apple-app-site-association  (NO .json extension!)
// Source: developer.apple.com/documentation/xcode/supporting-associated-domains
{
  "applinks": {
    "details": [
      {
        "appIDs": ["<TEAM_ID>.br.com.milespro.app"],
        "components": [
          { "/": "/auth/callback*", "comment": "OAuth PKCE callback (Google + Apple)" },
          { "/": "/lgpd/confirm-delete*", "comment": "LGPD deletion email confirmation" },
          { "/": "/promocoes*", "comment": "D-13 push notification target" }
        ]
      }
    ]
  }
}
```

```json
// public/.well-known/assetlinks.json
// Source: developer.android.com/training/app-links/verify-android-applinks
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "br.com.milespro.app",
      "sha256_cert_fingerprints": ["<HEX:HEX:HEX...>"]
    }
  }
]
```

```json
// vercel.json (extend existing headers array)
{
  "headers": [
    /* ...existing entries... */
    {
      "source": "/.well-known/(.*)",
      "headers": [
        { "key": "Content-Type", "value": "application/json" },
        { "key": "Cache-Control", "value": "public, max-age=3600" }
      ]
    }
  ]
}
```

**Vercel SPA rewrite caveat:** The current `vercel.json:8` rewrite (`/((?!api/|assets/).*) → /index.html`) will catch `/.well-known/*` and serve the React HTML. Either extend the negative-lookahead to `(?!api/|assets/|.well-known/)` OR rely on the fact that Vercel serves `public/` files BEFORE rewrites (the file-exists shortcut). The safe path is to extend the negative-lookahead explicitly + verify with `curl -I https://app.milespro.net.br/.well-known/apple-app-site-association` returning `Content-Type: application/json` + the expected JSON body. `[VERIFIED: vercel.json rewrites doc]`

### Pattern 5: Push Permission Contextual Prompt (D-T07)

**What:** Custom pre-prompt UI shown BEFORE the native iOS permission dialog. Triggered after `user_programs` count >= 1 (`useUserPrograms` hook signals first balance). If user taps "Permitir", THEN the native dialog fires. If "Agora não", the native dialog never fires (saves the prompt for a later moment — iOS gives only ONE shot at this).

**When to use:** Triggered from a useEffect in a high-traffic authenticated page (Dashboard) when conditions met. Persist a flag `push_pre_prompt_seen_at` in `user_settings` to avoid re-prompting.

**Example:**

```typescript
// src/hooks/usePushPermission.ts
// Source: capacitorjs.com/docs/apis/push-notifications +
//         developer.apple.com/design/human-interface-guidelines/notifications
import { useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, type PermissionStatus } from '@capacitor/push-notifications';
import { useTelemetry } from './useTelemetry';
import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

export function usePushPermission() {
  const tel = useTelemetry();

  const requestPermission = useCallback(async (userId: string) => {
    if (!Capacitor.isNativePlatform()) return;

    const current: PermissionStatus = await PushNotifications.checkPermissions();
    if (current.receive !== 'prompt') return; // already decided

    const result = await PushNotifications.requestPermissions();
    if (result.receive === 'granted') {
      tel.trackPushPermissionGranted({ source: 'first_balance' });
      await PushNotifications.register(); // triggers 'registration' event with token
    } else {
      tel.trackPushPermissionDenied({ source: 'first_balance' });
    }

    await supabase
      .from('user_settings')
      .update({ push_pre_prompt_seen_at: new Date().toISOString() })
      .eq('user_id', userId);
  }, [tel]);

  return { requestPermission };
}
```

### Anti-Patterns to Avoid

- **Don't** prompt for push permission at signup. iOS HIG anti-pattern; ~50% denial rate vs ~65-75% with contextual prompt after value moment. `[CITED: developer.apple.com/design/human-interface-guidelines/notifications]`
- **Don't** open Asaas checkout from inside iOS app — direct `Browser.open(asaasUrl)` or `<a href>` violates Apple Guideline 3.1.1(a) anti-steering. Path C requires NEUTRAL text ("Gerencie sua assinatura em milespro.net.br pelo navegador web") with NO clickable link. Verified canonical in `src/pages/Assinatura.tsx` post-Plan 02-06.
- **Don't** use custom URL scheme `milespro://` — locked OUT by D-T10. Spoofing risk + Apple Review may flag. AASA HTTPS is the canonical defense.
- **Don't** initialize Sentry Capacitor SDK against `@sentry/react@8` — peer-dep collision. See deferral above.
- **Don't** put service-account JSON in `Deno.env.get()` as a single secret — store in Supabase Vault, fetch in edge fn via `vault.read_secret(...)`. Same pattern as `lgpd_cleanup_auth_token` (Plan 02-02) and `asaas_reconcile_auth_token` (Plan 02-05).
- **Don't** rely on Apple's AASA CDN refreshing instantly — plan AASA changes 24-48h ahead of TestFlight upload. Apple CDN respects max-age but caches up to 1 hour; client devices then check in weekly. `[CITED: digitalbunker.dev/apple-app-site-association/]`
- **Don't** ship a debug build to TestFlight without verifying the iOS bundle strings gate locally. The `strings | grep` gate is cycle-level kill-switch.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Push notification token registration | Custom APNs/FCM token capture | `@capacitor/push-notifications` plugin | Plugin handles platform abstraction (APNs entitlement, FCM Google Play Services init, permission state) + emits `registration`, `pushNotificationReceived`, `pushNotificationActionPerformed` events. Reinventing = days of work + edge cases. |
| FCM service-account JWT signing | Roll your own JWT signing in Deno | `djwt` library (already used by `lgpd-delete` for HMAC tokens) | Battle-tested. Native `crypto.subtle.importKey` + `crypto.subtle.sign` for RS256 with proper PKCS8 import is non-trivial. |
| Universal Link URL parsing | Manual `event.url.replace(origin, '')` | `new URL(event.url)` + check `.host === ALLOWED_HOST` + extract `.pathname + .search` | Browser-native URL API handles encoding/edge cases (`#fragment`, query string, port). Manual string replace breaks on edge cases. |
| Icon + splash multi-density generation | Manual export at every density | `@capacitor/assets` CLI (`npx capacitor-assets generate`) | iOS needs Light/Dark/Tinted variants (iOS 18) + 15+ size variants; Android needs adaptive icon (foreground + background + monochrome Material You) at 5 densities. CLI does all of this from a single 1024×1024 master. |
| OAuth callback page | Inline code exchange in Auth.tsx useEffect | Dedicated `/auth/callback` Route + `AuthCallback.tsx` | Universal Link routes to a path, not a callback; the page must exist as a Route. Inline-in-Auth doesn't work because the URL Apple/Google redirects to ISN'T `/auth`. |
| Constant-time string compare | Roll your own (already done 4 times) | Extract `_shared/timingSafeEq.ts` (threshold reached per Plan 02-05) | Already documented as the next consumer's responsibility. Phase 3 push edge fns ARE the next consumer. |
| Apple Sign In nonce/state validation | Manual nonce generation | Supabase Apple provider (validates idToken server-side) | Supabase Auth Apple provider does the heavy lifting. For native iOS, idToken arrives via `@capacitor-community/apple-sign-in` plugin (or similar) and is passed to `supabase.auth.signInWithIdToken({ provider: 'apple', token })`. `[CITED: supabase.com/docs/guides/auth/social-login/auth-apple]` |
| Apple TeamID + service ID + p8 key tracking | Per-developer scratchpad | Apple Developer Console UI + Supabase Auth → Providers form | The Service ID + .p8 key are configured in Supabase dashboard once; rotate every 6 months. The TeamID goes into AASA `appIDs`. |
| Helpdesk operational backend | Custom inbox app | Crisp (already integrated Plan 02-04) + WhatsApp Business | LAUNCH-05 (Plan 02-04 W1c) already deployed. Phase 3 operations only. |

**Key insight:** Mobile distribution has near-zero "novel code" — almost everything is configuration (AASA payload, Info.plist keys, AndroidManifest intent-filters, App Store Connect metadata, service-account JSON). The actual TypeScript/Deno surface area for Phase 3 is ~6 new files (`AuthCallback.tsx`, `deepLinkHandler.ts`, `pushNotifications.ts`, `usePushPermission.ts`, 3 new edge functions). Plan accordingly — most tasks are "fill in this manifest", not "write this algorithm".

---

## Common Pitfalls

### Pitfall 1: AASA CDN cache traps a wrong payload

**What goes wrong:** Deploy AASA with a typo in `appIDs`. Apple CDN fetches it at first access, caches 1 hour. You push a fix; client devices that already cached the bad version don't refresh for up to a week. Universal Links silently fail in TestFlight; reviewer's device may also see stale AASA.

**Why it happens:** The Vercel `Cache-Control: max-age=3600` header is overridden by Apple's CDN. The CDN refresh rolls out asynchronously per-device.

**How to avoid:**
1. Verify AASA payload via Apple's CDN proxy URL BEFORE submitting to TestFlight: `curl https://app-site-association.cdn-apple.com/a/v1/app.milespro.net.br`.
2. To force CDN re-fetch (after a fix), append any query string: `curl 'https://app-site-association.cdn-apple.com/a/v1/app.milespro.net.br?bust=1'`.
3. For development debug builds, enable "Associated Domains Development" in iOS Settings → Developer to bypass the CDN. `[CITED: digitalbunker.dev/apple-app-site-association/]`
4. Use [Branch.io's AASA validator](https://branch.io/resources/aasa-validator/) or [getuniversal.link](https://getuniversal.link/) for structural validation (but they don't test Apple's matching logic — only structure).

**Warning signs:** TestFlight tap on `https://app.milespro.net.br/promocoes` opens Safari instead of app; Universal Link works on one device but not another after AASA edit.

### Pitfall 2: `assetlinks.json` fingerprint mismatch on Play Store signing

**What goes wrong:** Local debug keystore has SHA256 fingerprint A; you generate `assetlinks.json` with A. Upload to Play Store; Play re-signs with their **App Signing key** (fingerprint B, NOT A). App Links silently fail in production.

**Why it happens:** Google Play App Signing (default for new apps since 2017) strips your upload signing key and re-signs with Google's key. The fingerprint that needs to be in `assetlinks.json` is the **App Signing certificate fingerprint** as shown in Play Console, NOT the upload keystore.

**How to avoid:**
1. After Play Console "App Signing" setup, retrieve the App Signing SHA256 from Play Console → Setup → App integrity → "App signing key certificate" SHA-256.
2. ALSO include the upload key fingerprint as a second entry in `assetlinks.json` so debug builds work in Internal Testing track.
3. Use Google's [Statement List Generator](https://developers.google.com/digital-asset-links/tools/generator) for the JSON shape.
4. Verify via `adb shell pm verify-app-links --re-verify br.com.milespro.app` after install.

**Warning signs:** App Link works in `adb install` debug build but fails in Internal Testing track.

### Pitfall 3: iOS strings | grep gate fires AFTER a regression

**What goes wrong:** A future feature commit accidentally renders a `PricingSection` that doesn't consume `useIsIOSCapacitor()`. Code review misses it. CI passes. `strings | grep` on bundle reveals pricing strings in iOS build. Submission blocked.

**Why it happens:** Path C runtime hiding is enforced ONLY by `useIsIOSCapacitor()` guards (Plan 02-06 canonical). Any new pricing-adjacent component without the guard regresses CRIT-03.

**How to avoid:**
1. **Make G-CRIT-03 a CI step** that runs after every PR merge to main: `npm run build && strings <build_artifact> | grep -E 'planos|checkout|R\$|Upgrade|Assinar' && exit 1 || exit 0`. Inverted logic — exit 0 means CLEAN.
2. **However:** the iOS bundle is the `dist/` directory bundled inside the `.ipa`. `strings` on plain JS chunks works because Vite emits readable JS (not native binary). Run `strings dist/assets/*.js | grep -E '...'` post-build.
3. **iOS-specific run:** after `npx cap sync ios`, the bundle is at `ios/App/App/public/`. Run `strings ios/App/App/public/assets/*.js | grep ...`.
4. **Pre-TestFlight upload:** add a checklist item in plan that runs the gate manually and pastes the output ("zero matches") into the plan SUMMARY. Matches `02-05-CRIT-04-SMOKE-RUNBOOK` pattern.
5. **ESLint rule (optional):** custom rule that flags any `<PricingSection>`-named import not preceded by `useIsIOSCapacitor()` check in the same file. Probably overkill for v1.

**Warning signs:** A new component file appears under `src/components/` that contains R$, "Upgrade", or "Assinar" strings without a `useIsIOSCapacitor()` guard import.

### Pitfall 4: Apple Sign-In Service ID + p8 key 6-month rotation

**What goes wrong:** Six months after launch, Apple Sign-In silently breaks because the .p8 key rotated and Supabase Auth still has the old one.

**Why it happens:** Apple requires 6-month key rotation. Supabase Auth → Providers form holds a secret derived from the .p8 — if you let it expire, OAuth flows return 400.

**How to avoid:**
1. Set a calendar reminder at 5-month intervals to rotate.
2. On native iOS, this matters LESS — per Supabase docs, native iOS Apple Sign-In uses idToken direct verification, which doesn't depend on the .p8/Service ID after initial config. The .p8 is needed only for Android + Web Apple OAuth flows. `[CITED: supabase.com/docs/guides/auth/social-login/auth-apple]`
3. Plan recommends: configure .p8 once, use idToken-flow on native iOS (`signInWithIdToken`), accept that Android web Apple flow needs rotation (Android = D-T03 says Apple NOT offered on Android, so this is moot — only iOS path uses Apple).
4. If iOS uses idToken-only, the Service ID + .p8 are still required for INITIAL provider enable, but the rotation pressure is lower because no live web flow depends on it.

**Warning signs:** N/A pre-launch. Post-launch: Sentry events showing 400 from `auth.signInWithIdToken({ provider: 'apple' })`.

### Pitfall 5: FCM token invalidation goes unhandled → stale rows + delivery failures

**What goes wrong:** User uninstalls app → APNs/FCM marks token UNREGISTERED. Next push fires; FCM returns `404 UNREGISTERED`. Without cleanup, the same dead token gets tried daily; the user re-installs, gets a NEW token, both rows exist; partial UNIQUE index in `push_subscriptions` doesn't help because tokens are different.

**Why it happens:** Token lifecycle is asynchronous; no signal from APNs/FCM other than the next send returning 404.

**How to avoid:**
1. In `send-push-notification`, on `404 UNREGISTERED` or `400 INVALID_ARGUMENT`, DELETE from `push_subscriptions` where `device_token = $token`.
2. Track `last_seen_at` and run a weekly cleanup of tokens not seen in 60+ days (proxy for uninstall).
3. On app open, update `last_seen_at` via Supabase REST PATCH from the registered listener.

**Warning signs:** `push_subscriptions` row count grows unbounded; FCM dashboard shows growing `UNREGISTERED` error rate.

### Pitfall 6: Apple App Privacy Nutrition Labels mismatch what code actually collects

**What goes wrong:** Submit with nutrition labels claiming "Identifiers: NO" but PostHog collects `distinctId`. Apple post-launch audit flags; potential takedown.

**Why it happens:** App Privacy is self-attested at submission. Apple has been increasing audits in 2025-2026.

**How to avoid:** Derive from canonical source — `src/pages/Privacidade.tsx` §5 sub-processors:

| App Privacy Category | Data Type | Declared? | Source |
|---------------------|-----------|-----------|--------|
| Contact Info | Email Address | YES (linked to user) | Supabase Auth |
| Contact Info | Name | YES (linked to user) | `profiles.full_name` |
| Identifiers | User ID | YES (linked to user) | `auth.users.id` (UUID) |
| Identifiers | Device ID | NO (we do not use IDFA) | — |
| Financial Info | Payment Info | YES (linked to user) | Asaas customer_id (we store ref, not card) |
| Health & Fitness | — | NO | — |
| Usage Data | Product Interaction | YES (linked to user, used for analytics + product improvement) | PostHog (consent-gated per LGPD Art. 8 §4) |
| Diagnostics | Crash Data | YES (linked to user via Sentry id only — PII scrubbed) | Sentry (legitimate interest LGPD Art. 7 IX) |
| Diagnostics | Performance Data | YES | Sentry tracesSampleRate=0.1 |
| Sensitive Info | National ID (CPF) | YES (linked to user, used for compliance + transaction) | `profiles.cpf` — fiscal/NFS-e |
| Location | Precise Location | NO | — |
| Location | Coarse Location | NO (IP-based geolocation by Supabase is incidental, declare if Apple flags) | Supabase logs (operational, not product data) |

**Warning signs:** Apple post-launch privacy review email referencing "Data not declared in App Privacy".

### Pitfall 7: Path C neutral panel re-introducing a clickable URL

**What goes wrong:** Future copy refresh changes the Assinatura.tsx Path C panel from plain text "Gerencie sua assinatura em milespro.net.br" to an `<a href>` for "convenience". Apple Reviewer treats as anti-steering violation per 3.1.1(a). Rejection.

**Why it happens:** Anti-steering enforcement is subjective; the safe choice is NO clickable link from inside the iOS app to the web checkout. Even a non-checkout URL (e.g., `/assinatura` info page) is risky.

**How to avoid:**
1. Inline comment in Assinatura.tsx (post-Plan 02-06 already has this) explaining the constraint.
2. Add `eslint-disable-next-line jsx-a11y/anchor-is-valid` would be misleading — the gate is human review, not lint.
3. Plan task: review every `<a href>`, `Browser.open`, `window.location.href` in the codebase guarded by `useIsIOSCapacitor()` — verify NONE point to web checkout/pricing.

**Warning signs:** App Review rejection with note citing 3.1.1(a) "external link" or "anti-steering".

### Pitfall 8: Customer support readiness storm in week 1 of LAUNCH-06

**What goes wrong:** First 10 paying users hit boleto-lag issue. Without runbook, founder reactively writes 10 different replies. Three users file chargebacks (Asaas dispute fee + Asaas chargeback ratio damage; cumulative damage if 6+ disputes in 30 days = potential Asaas account review).

**Why it happens:** First-week pagantes have outsized weight; one bad experience kills 3 referrals.

**How to avoid:**
1. **Pre-write canned responses** in Crisp (already deployed Plan 02-04) for 5 most likely tickets (per HIGH-08 PITFALLS.md):
   - (a) "Boleto não confirmou" — explain 1-2 business day delay, link to Asaas Pix preference, offer Pix link via WhatsApp.
   - (b) "Cancelei mas continuei sendo cobrado" — point to Asaas portal cancel flow; manual cancel via Supabase Studio if customer needs help.
   - (c) "Feature do Pro não apareceu após upgrade" — check `user_subscriptions.plan` row; if mismatch, manually flip + apologize.
   - (d) "Quero meus dados (LGPD)" — point to Configurações > "Exportar meus dados" (when shipped — currently backlog v2 per STATE.md; for v1, manual export via Supabase Studio).
   - (e) "Quero deletar minha conta (LGPD)" — point to Configurações > "Excluir minha conta" (same caveat as (d); manual deletion via `lgpd-delete` edge fn invocation for v1).
2. **Proactive week-1 outreach** to first 10 paying CPFs: "Como tá indo? Algum problema?" via WhatsApp Business. Prevents 80% of disputes per HIGH-08.
3. **Refund policy link** in invoice emails (already covered by Plan 02-04 invoice template? — verify; if not, plan task to add link to Termos §4 7-day guarantee).
4. **Dispute defense template** in Asaas dashboard for boleto-lag scenarios — pre-written explanation of BR boleto next-business-day clearing.

**Warning signs:** Crisp inbox showing >3 of the same ticket type in 24h; chargeback notification from Asaas.

---

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | (1) Existing `auth.users.id` UUIDs are the canonical user_id for `push_subscriptions` rows. (2) Existing `user_promo_alerts` rows from `compute-personalized-promos` cron will be fanned out to push on each new INSERT (no migration needed). (3) `webhook_events` already idempotency-gates Asaas webhooks (Plan 02-05) — push-cleanup-on-downgrade hook reads this same path. | No data migration. New `push_subscriptions` table is empty at launch; fills as users grant push permission. |
| Live service config | (1) **Apple Developer Account** — pending creation (D-T14). (2) **Apple App ID** + Service ID + .p8 key — to be created in Apple Developer Console; Service ID and .p8 stored in Supabase Auth → Providers (Apple) form. (3) **Google Cloud Project / Firebase Project** — must be created for FCM HTTP v1; downloads `google-services.json` (Android, commit) + service-account JSON (Vault). (4) **APNs Auth Key** (.p8) — uploaded to Firebase Console → Cloud Messaging → APNs Authentication Key. Firebase fans out to APNs on iOS sends. (5) **Asaas Dashboard webhook URL** — already registered per Plan 02-05; no change. (6) **Crisp Website ID** + helpdesk inbox — already live per Plan 02-04. | All live-service config goes into pre-launch checklist; cannot live in git. |
| OS-registered state | (1) **iOS Capabilities** in Xcode: Push Notifications, Sign in with Apple, Associated Domains (`applinks:app.milespro.net.br`). (2) **Apple Provisioning Profile** (Apple-managed but Xcode signs based on App ID config). (3) **Android `app/build.gradle` targetSdk=35** + AndroidManifest entries (auto-generated by `npx cap add android` then edited). (4) **Play Console** — Internal/Closed/Production tracks; tester gmail allowlist (Internal up to 100, Closed up to 50 free). | Re-created with each Xcode/Android Studio open; not data-migration but checklist items. |
| Secrets/env vars | (1) `PUSH_FCM_SERVICE_ACCOUNT_JSON` — NEW, full JSON string. Vault as `push_fcm_service_account`. (2) `APPLE_SIGNIN_SECRET` — NEW, derived secret from Apple Service ID + .p8; Supabase Auth → Providers form holds this, no edge-fn env needed. (3) No changes to existing secrets (`ASAAS_API_KEY`, `RESEND_API_KEY`, `LGPD_DELETE_TOKEN_SECRET`, etc.). | Two new secrets to provision in Lovable Cloud (Vault + edge-fn env). |
| Build artifacts | (1) `ios/` folder — created by `npx cap add ios`, committed (per Capacitor conventions; some teams gitignore but committing is canonical for solo dev). (2) `android/` folder — same. (3) `ios/App/App/Assets.xcassets/` — generated by `@capacitor/assets`; commit. (4) `android/app/src/main/res/mipmap-*/` — same. (5) `.ipa` + `.aab` — NOT committed; built per submission. | No stale artifacts (greenfield mobile path).  |

**Nothing found in any category that requires backfill** — this is a greenfield mobile-build phase (no existing iOS/Android binaries in production). All runtime state work is forward-looking checklist items.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Apple Developer Program account | iOS submission | ✗ | — | **BLOCKING** — Task #0 of plan opens this in parallel (D-T14) |
| Google Play Console account | Android submission | ✗ | — | **BLOCKING** — Task #0 of plan opens this in parallel (D-T14) |
| Xcode (macOS) | iOS build + Sign in with Apple capability + Archive | ⚠ | Unknown — verify | If solo dev on Windows: rent a Mac (mac-in-cloud.com, $20-40/mo) or use GitHub Actions macOS runner for archive |
| Android Studio | Android build + signing + Play upload via AAB | ⚠ | Unknown — verify | Required on host machine (Windows OK); plan task to install |
| `@capacitor/cli` | `npx cap add ios`, `npx cap sync`, `npx cap doctor` | ✓ | `^7.6.2` in devDeps | — |
| `@capacitor/assets` CLI | Icon + splash generation | ✗ | — | `npm install --save-dev @capacitor/assets@^3` (Phase 3 task) |
| Firebase project / Google Cloud project | FCM HTTP v1 service account | ✗ | — | Create at console.firebase.google.com — free tier (Spark plan) sufficient for v1 |
| APNs Auth Key (.p8) | iOS push delivery via Firebase | ✗ | — | Created in Apple Developer → Certificates, Identifiers & Profiles → Keys; uploaded to Firebase Console |
| Apple TeamID | AASA appIDs | ✗ | — | Visible in Apple Developer Account profile after PJ + DUNS approval |
| Android signing keystore | App Links (assetlinks.json fingerprint) + Play upload signature | ✗ | — | Generate via `keytool -genkey` OR let Play Console manage (App Signing recommended for new apps) |
| `strings` CLI | G-CRIT-03 gate | ✓ on Linux/Mac, ⚠ on Windows | — | Windows: use Git Bash strings (comes with Git for Windows) OR WSL OR `Select-String` PowerShell alternative |
| Supabase Vault | Secret storage for FCM service-account JSON | ✓ | Live | — |
| `npm` + Node | Build pipeline | ✓ | Node version per `package.json` engines (verify) | — |
| Crisp account + Website ID | Helpdesk (Plan 02-04) | ✓ pending external setup | — | Already deployed per Plan 02-04 W1c; awaiting user provisioning |
| WhatsApp Business account | BR helpdesk channel | ✓ planned per CONTEXT D-T15 | — | Free WhatsApp Business app sufficient |
| `djwt` Deno module | FCM JWT signing | ✓ via esm.sh/deno.land | — | Pin version (`@v3.0.2`) |

**Missing dependencies with no fallback (BLOCKING):**
- Apple Developer Program (D-T14 hard-blocker)
- Play Console (D-T14 hard-blocker)
- Firebase project (Task #0 alongside dev accounts)
- APNs Auth Key (depends on Apple Developer Program)
- Android signing keystore OR Play App Signing enrollment

**Missing dependencies with fallback:**
- Xcode if solo-dev on Windows — fallback to macOS rental
- `strings` on Windows — Git Bash or WSL

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 (web/unit) + Deno test (edge functions) |
| Config files | `vitest.config.ts` (unit/integration projects), `package.json:test` scripts |
| Quick run command | `npm run test:unit` (Vitest, < 30s for current 113 tests) |
| Full suite command | `npm test` (Vitest all projects) + `npx supabase functions test` for Deno (CI) |
| Mobile-specific tests | Manual TestFlight smoke (no automated iOS/Android UI tests in v1) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MOBILE-01 | iOS bundle ships zero pricing strings | smoke (CI step) | `npm run build && strings dist/assets/*.js \| grep -E 'planos\|checkout\|R\$\|Upgrade\|Assinar' && exit 1 \|\| exit 0` | ❌ Wave 0 — add `scripts/check-ios-strings.sh` + CI step |
| MOBILE-01 | `useIsIOSCapacitor` correctly hides every pricing surface | unit | `npm run test:unit -- src/hooks/useIsIOSCapacitor.test.ts + src/pages/Assinatura.test.tsx + src/pages/Index.test.tsx` (Path C component-level tests) | ⚠ Partial — `vip.adversarial.test.ts` exists; Path C UI tests = Wave 0 |
| MOBILE-02 | `targetSdk=35` in Android build | manual | Inspection of `android/app/build.gradle` after `npx cap add android` | manual only |
| MOBILE-02 | Android pre-launch report clean | manual | Play Console Pre-launch Report on Pixel 8 / Android 15 (Closed Testing track) | manual only |
| MOBILE-03 | AASA payload structurally valid | smoke | `curl -s https://app.milespro.net.br/.well-known/apple-app-site-association \| jq .` returns valid JSON with `applinks.details[0].appIDs` populated | ❌ Wave 0 — add post-deploy smoke script |
| MOBILE-03 | assetlinks.json structurally valid | smoke | `curl -s https://app.milespro.net.br/.well-known/assetlinks.json \| jq '.[0].target.package_name'` returns `br.com.milespro.app` | ❌ Wave 0 |
| MOBILE-03 | OAuth callback PKCE roundtrip | integration | `src/test/integration/oauthCallback.test.ts` — mock `supabase.auth.exchangeCodeForSession` + assert `returnTo` consumption + navigate | ❌ Wave 0 |
| MOBILE-03 | `deepLinkHandler` parses URL, strips origin, navigates | unit | `src/lib/deepLinkHandler.test.ts` — assert host validation, auth-gate sessionStorage, exception for /auth/callback | ❌ Wave 0 |
| MOBILE-04 | Push permission contextual prompt fires after user_programs count >= 1 | unit + integration | `src/hooks/usePushPermission.test.ts` — mock PushNotifications.checkPermissions + requestPermissions; assert idempotency via user_settings.push_pre_prompt_seen_at | ❌ Wave 0 |
| MOBILE-04 | `enqueue-push` rejects Free for Pro+ event_types | unit (Deno) | `supabase/functions/enqueue-push/index.test.ts` — Free has_plan('pro') = false → 403 / no FCM call | ❌ Wave 0 |
| MOBILE-04 | `cleanup-push-subscriptions` deletes tokens on downgrade | unit (Deno) | `supabase/functions/cleanup-push-subscriptions/index.test.ts` — service-role DELETE assertion | ❌ Wave 0 |
| MOBILE-04 | FCM JWT signing → OAuth2 token round-trip | unit (Deno) | `supabase/functions/_shared/fcmSignJWT.test.ts` — sign + mock token endpoint + cache verification | ❌ Wave 0 |
| MOBILE-04 | push_subscriptions RLS — Free cannot INSERT for Pro+ event_type? (deferred decision: tokens themselves are tier-agnostic; gating is at enqueue, not at table) | adversarial | `src/test/integration/push.adversarial.test.ts` — verify Free user CAN INSERT own row (token-level), but Free cannot SELECT another user's row (RLS) | ❌ Wave 0 (mirror `vip.adversarial.test.ts` pattern) |
| MOBILE-05 | Submission notes template exists | manual | Inspection of `.planning/phases/03-*/app-review-submission-notes.md` | manual artifact |
| LAUNCH-02 | iOS build approved | manual | App Store Connect status = "Ready for Sale" | manual only |
| LAUNCH-03 | Android build approved | manual | Play Console Production track shows live listing | manual only |
| LAUNCH-06 | 10 distinct CPFs with PAYMENT_RECEIVED | manual | Asaas dashboard query: `SELECT COUNT(DISTINCT customer.cpfCnpj) FROM payments WHERE status='RECEIVED' AND createdAt > <cycle_start>` (via API or CSV export) | manual + PostHog `paid_first_invoice` funnel |

### Sampling Rate

- **Per task commit:** `npm run test:unit` (113 existing tests + Phase 3 additions; < 30s)
- **Per wave merge:** `npm test` (full Vitest including integration) + `supabase functions test` for affected Deno fns; manual `curl` smoke for AASA + assetlinks
- **Phase gate:** Full suite green + `strings | grep` gate green on iOS build + manual TestFlight walkthrough (Path C visual verification) before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `scripts/check-ios-strings.sh` — G-CRIT-03 gate as shell script consumable by CI
- [ ] `src/lib/deepLinkHandler.test.ts` — covers MOBILE-03
- [ ] `src/test/integration/oauthCallback.test.ts` — covers MOBILE-03 PKCE
- [ ] `src/hooks/usePushPermission.test.ts` — covers MOBILE-04 permission flow
- [ ] `src/test/integration/push.adversarial.test.ts` — covers MOBILE-04 RLS (mirror `vip.adversarial.test.ts` shape)
- [ ] `supabase/functions/enqueue-push/index.test.ts` — covers MOBILE-04 gating
- [ ] `supabase/functions/send-push-notification/index.test.ts` — covers FCM v1 contract
- [ ] `supabase/functions/cleanup-push-subscriptions/index.test.ts` — covers downgrade
- [ ] `supabase/functions/_shared/fcmSignJWT.test.ts` — covers JWT signing primitive
- [ ] Smoke script `scripts/smoke-aasa.sh` — post-deploy AASA + assetlinks curl verification (paste output into SUMMARY)
- [ ] (Optional) Path C UI tests for `src/pages/Assinatura.tsx`, `src/pages/Index.tsx` — verify `useIsIOSCapacitor()` branch renders neutral panel without anchor

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth (email/password + Google + Apple), PKCE OAuth flow, Apple Sign-In idToken validation server-side via Supabase |
| V3 Session Management | yes | Supabase Auth refresh tokens, `sessionStorage` for returnTo only (NOT for credentials), JWT-based RLS |
| V4 Access Control | yes | RLS on `push_subscriptions` (`auth.uid() = user_id` + partial UNIQUE), `has_plan('pro')` server-side check in `enqueue-push`, service-role DELETE in `cleanup-push-subscriptions` |
| V5 Input Validation | yes | Zod schemas for any new edge fn payloads (FCM request body, push event payload); Capacitor URL host validation in `deepLinkHandler` |
| V6 Cryptography | yes | FCM service-account RS256 JWT signing via `crypto.subtle.importKey` + `crypto.subtle.sign` (NOT hand-rolled); `_shared/timingSafeEq.ts` for auth-token comparison |
| V7 Error Handling & Logging | yes | `logger.*` (not `console.*`); Sentry beforeBreadcrumb already drops console.log breadcrumbs (Plan 02-03); push fn errors logged but NOT propagated to user (avoid token leak) |
| V8 Data Protection | yes | Device tokens treated as PII (linked to user_id); LGPD App Privacy nutrition labels declare; push payload contains NO CPF/email/balance (only deep_link_path + event_type) |
| V9 Communications | yes | HTTPS-only via AASA (D-T10), no custom URL scheme; FCM transport is HTTPS; Apple AASA fetch is HTTPS |
| V14 Configuration | yes | Service-account JSON in Vault (not edge-fn env var verbatim, though we mirror the pattern); secrets NEVER in client bundle (Phase 1 SEC-03 already enforced) |

### Known Threat Patterns for Mobile + Push Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Custom URL scheme spoofing (`milespro://auth/callback?code=...`) | Spoofing | HTTPS-only via AASA (D-T10); Apple verifies domain ownership via AASA, no other app can claim |
| Universal Link tap from malicious email phishing | Spoofing/Tampering | Host validation in `deepLinkHandler` (host === `app.milespro.net.br`); auth gate via sessionStorage returnTo means deep-link tap still requires valid Supabase session |
| Push token theft (rooted device, malware) → impersonation push | Spoofing | Token is registration credential only; payload comes from our server signed with FCM service-account; APNs/FCM rejects unsigned attempts |
| Free user receives Pro+ push (event-type smuggling) | Elevation of Privilege | `enqueue-push` server-side `has_plan('pro')` gate via `supabase.rpc('has_plan', {_user_id, _required_plan})` — trust-kernel pattern (Phase 1 SEC-06) |
| Service-account JSON leak (Vault breach OR commit accident) | Disclosure | Vault storage (not file/env), CI grep guard against `private_key` in `dist/`, rotate via Firebase Console → new JSON if leaked |
| `strings \| grep` regression smuggling pricing into iOS bundle | Tampering (CI bypass) | CI step + manual gate before TestFlight (PITFALLS HIGH-07 implementation) |
| Apple Sign-In nonce replay | Replay | Supabase Auth Apple provider validates idToken signature + nonce; nothing custom required |
| OAuth `state` parameter not validated | Tampering | Supabase PKCE flow validates `code_verifier` against `code_challenge`; nothing custom required |
| Anti-steering link smuggling (post-launch copy refresh adds clickable URL to web checkout from iOS) | Compliance violation | Inline comment + code review hygiene; Pitfall 7 above |
| LGPD violation: push event payload contains CPF or balance | Disclosure | Code review: enforce push payloads contain only `deep_link_path` + `event_type` + `title/body` (which is generic, e.g., "Sua promoção te espera"); NO balance numbers, NO CPF |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FCM Legacy HTTP API (server key auth) | FCM HTTP v1 (OAuth2 service account) | Legacy deprecated 2024-06-20, fully removed | Must use HTTP v1 from day one. `[CITED: firebase.google.com/docs/cloud-messaging/migrate-v1]` |
| Capacitor 6 + `targetSdk=34` | Capacitor 7 + `targetSdk=35` | Android 15 stable + Play deadline 2025-08-31 for new apps; existing apps require 34+ | We're on Capacitor 7.4.4 — patch to 7.6.5 latest minor before launch. `targetSdk=35` for new submissions. `[CITED: developer.android.com/google/play/requirements/target-sdk]` |
| Custom URL scheme deep links | Universal Links / App Links over HTTPS | iOS 9 (2015) + Android 6.0 (2015) — but Apple/Google have escalated pressure against custom schemes | D-T10 chooses HTTPS-only. AASA + assetlinks.json mandatory. |
| Stripe-style direct mobile checkout | Multiplatform Services exemption (Path C) | App Store Guideline 3.1.3(b) — language stable since 2018 but enforcement tightening post-Epic v. Apple ruling 2024-2025 | Path C is the canonical path for BR SaaS without IAP. D-T05/13/14 locked. |
| `posthog-js` capture-all + manual opt-out | `opt_out_capturing_by_default: true` + ConsentWatcher bridge | Plan 02-03 / TEL-01 (Phase 2) | Already canonical; Phase 3 push events extend the existing `useTelemetry` hook (no PostHog init change) |
| Sentry `@sentry/react@7` | `@sentry/react@8` → `@sentry/react@10` | v10 released ~2025-Q4 | Our codebase is on v8; `@sentry/capacitor` requires v10 → deferral above |
| Apple Sign in via web OAuth flow on iOS | Native idToken flow on iOS (no web roundtrip) | Supabase Auth supports both; native idToken is cleaner | Plan uses native idToken via Capacitor plugin or `@invertase/react-native-apple-authentication` style (verify Capacitor-native plugin exists) `[CITED: supabase.com/docs/guides/auth/social-login/auth-apple]` |
| WhatsApp Business via personal number | WhatsApp Business app (free) or Z-API (programmatic) | LAUNCH-05 / HIGH-08 — Plan 02-04 staged Crisp; WhatsApp manual | v1 plan accepts manual WhatsApp Business app; programmatic later |

**Deprecated/outdated:**
- FCM Legacy API — fully removed mid-2024; do NOT reference in plan
- Apple "Reader App" exemption (3.1.3(a)) — does NOT fit MilesPro (not audio/video/news); Path C uses 3.1.3(b) Multiplatform Services
- Capacitor 6 → Phase 3 stays on 7.x (already on 7.4.4; upgrade patch to 7.6.5)
- OneSignal — vetoed by D-T05

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@sentry/capacitor` v3/v4 cannot peer-bind to `@sentry/react@8` | Standard Stack | Verified via `npm view @sentry/capacitor@N peerDependencies` — `[VERIFIED]`. Not assumed. |
| A2 | Capacitor 7 patch updates remain available (`latest-7` dist-tag active) | Standard Stack | `[VERIFIED: npm view @capacitor/core dist-tags]`. Not assumed. |
| A3 | Apple Sign-In via native idToken flow (not Service ID / .p8 derived) is the canonical path on Capacitor iOS | Pattern 1 / Pitfall 4 | `[CITED: supabase.com/docs/guides/auth/social-login/auth-apple]` says "On native iOS and macOS, Sign in with Apple returns an idToken directly". Plan should still configure Service ID + .p8 for initial provider enable. |
| A4 | Push permission contextual-prompt accept-rate is 65-75% (vs. 50% if asked at signup) | Pattern 5 / Pitfall 1 | [ASSUMED] — operational best-practice, not measured. CONTEXT D-T07 specifies the strategy; researcher proposes target for revisit if accept < 50%. **User confirmation:** acceptable, falsifiable by metrics. |
| A5 | Apple App Privacy nutrition labels derive directly from Privacidade.tsx §5 sub-processor list | Pitfall 6 | [VERIFIED] — Privacidade.tsx was rewritten in Plan 02-02 to list exhaustive sub-processors per LGPD Art. 9 II. The mapping is mechanical. |
| A6 | FCM HTTP v1 service-account JWT exchange returns 1-hour access tokens | Pattern 3 | `[CITED: developers.google.com/identity/protocols/oauth2/service-account]` — standard OAuth2 service-account flow; 1 hour is default. |
| A7 | Apple AASA CDN cache TTL is "up to 1 hour" + client-device weekly re-check | Pitfall 1 | `[CITED: digitalbunker.dev/apple-app-site-association/]` — Apple-published, current. |
| A8 | `assetlinks.json` requires Play Console App Signing certificate fingerprint (not upload keystore) | Pitfall 2 | `[CITED: developer.android.com/training/app-links/verify-android-applinks]` — verified. |
| A9 | Apple Developer Program requires DUNS Number for PJ entity verification | Environment Availability | [ASSUMED based on CONTEXT D-T14] — standard Apple Developer enrollment for organizations requires DUNS. **User confirmation:** founder should pre-verify via D&B (free in BR via gerenciadordns.com.br or Apple's flow). |
| A10 | Capacitor 7 + `@capacitor/push-notifications@7` does NOT require additional Firebase plugin (`@capacitor-firebase/messaging`) | Standard Stack | [ASSUMED based on Capacitor docs] — `@capacitor/push-notifications` is the official Capacitor team plugin and uses Firebase under the hood on Android via `google-services.json`. **User confirmation:** verify with `npx cap doctor` after install. |
| A11 | The `strings | grep` gate runs against the bundled JS chunks in `dist/assets/*.js`, NOT the native iOS binary | Pitfall 3 | [ASSUMED] — Capacitor WebView loads JS from `ios/App/App/public/` which is `cap sync`'d from `dist/`. Pricing strings live in JS, not native code. **User confirmation:** trivially verifiable post-first-build. |
| A12 | `@sentry/react@8 → @sentry/react@10` major upgrade is breaking enough to defer | Standard Stack (Sentry caveat) | [ASSUMED] — v10 has new integration shape per Sentry docs. **User confirmation:** if user prefers Sentry native crash reporting, plan an upgrade task instead of deferral. |

**Assumptions tagged `[ASSUMED]` (A4, A9, A10, A11, A12) should be confirmed before plan execution.** A4 is operational target (not blocking). A9/A10/A11 are easily verified at execution time. A12 is a strategic choice on whether to defer Sentry Capacitor or upgrade `@sentry/react`.

---

## Open Questions (RESOLVED)

*All 6 open questions resolved 2026-05-14 during plan-phase 3 revision. Decisions below are LOCKED for downstream plans.*

1. **Apple Sign-In Capacitor plugin choice** — **RESOLVED: web OAuth fallback for v1.**
   - Decision: Use `supabase.auth.signInWithOAuth({ provider: 'apple' })` (Supabase's web Apple OAuth flow) inside the iOS WebView. Skip native `@capacitor-community/apple-sign-in` evaluation for v1.
   - Why: Apple Sign-In is required by App Store guideline 4.8 only when other 3rd-party social logins are present. Web OAuth via Safari works for Path C — uglier UX than native dialog but compliant. Native plugin can be added in v2 if conversion data justifies the investment.
   - Impact on plans: 03-03 ships web OAuth Apple button gated by `useIsIOSCapacitor()`. No new Capacitor plugin dependency. Plan 03-03 is correct as-is.

2. **Push token persistence across logout/login** — **RESOLVED: cleanup on SIGNED_OUT event.**
   - Decision: On Supabase `AuthProvider` SIGNED_OUT event, call edge function `cleanup-push-subscriptions` (or direct authenticated DELETE) to remove rows for the logged-out user_id BEFORE clearing the session.
   - Why: Without this, a shared device leaks pushes from user A's expiring milhas to user B who later signs in on the same device. RLS prevents B from *seeing* A's row but does not prevent stale push delivery from the cron-scanned fan-out targeting the device_token.
   - Impact on plans: 03-05 must include a task wiring `AuthProvider`'s SIGNED_OUT listener to the cleanup call. Add to task list during revision.

3. **`/auth/callback` for password-reset email flow** — **RESOLVED: reuse `/auth/callback`.**
   - Decision: Password-reset email magic-links route to `/auth/callback` (same Universal Link path as OAuth). Supabase email templates updated to point reset link at `https://app.milespro.net.br/auth/callback?type=recovery&token=...`. The page detects `?type=recovery` and routes to the reset-password form post-exchange.
   - Why: Single Universal Link route reduces AASA complexity (only 3 paths in D-T09 instead of 4). Same PKCE pattern works for any Supabase email magic-link flow.
   - Impact on plans: 03-03 task list already covers `/auth/callback`. Plan revision adds: (a) Supabase email template configuration step (operator runbook), (b) `?type=recovery` branch in AuthCallback handler.

4. **Multi-device push for same user** — **RESOLVED: deliver to ALL tokens; client-side dedup via tag.**
   - Decision: `enqueue-push` fans out to ALL `push_subscriptions` rows for the user. Each notification payload includes a unique `tag` (Android) / `thread-id` (iOS) keyed by `(event_type, balance_id)` to allow native OS dedup if user switches devices mid-stream.
   - Why: Sending to "last_seen_at only" is fragile — a user who checks the app on phone A and the notification arrives on phone B (because B was their primary the last time TIER-02 cron ran) creates worse UX than receiving 2 notifications and dismissing one.
   - Impact on plans: 03-04 `enqueue-push` enumerates ALL rows for user; payload builder sets `tag` / `thread-id` consistently. No new task.

5. **Universal Link rollout timing relative to AASA CDN cache** — **RESOLVED: deploy AASA 48h before first TestFlight upload.**
   - Decision: AASA gets deployed to `https://app.milespro.net.br/.well-known/apple-app-site-association` at least 48h BEFORE the first iOS TestFlight upload. Verify via `curl https://app-site-association.cdn-apple.com/a/v1/app.milespro.net.br` returning the expected payload prior to submission.
   - Why: Apple CDN caches AASA up to 1 hour; devices re-check ~weekly. 48h ensures the CDN has crawled and devices that download the TestFlight build have the AASA payload available immediately for Universal Link round-trip.
   - Impact on plans: 03-03 (AASA deploy) must complete and verify BEFORE 03-07 (iOS submission) — already enforced by `depends_on: ["03"]` in 03-07. Add 48h-wait gate to 03-07's pre-submission checklist task.

6. **Apple Developer Account TeamID dependency on PJ + DUNS approval** — **RESOLVED: AASA deploys AFTER TeamID is known.**
   - Decision: AASA file requires the real Apple Team ID — Apple verifies the signed bundle's TeamID matches AASA at deep-link resolution. The AASA file gets deployed only AFTER Apple Developer Program approval gives us the TeamID.
   - Why: A placeholder TeamID would cause Universal Links to silently fail on real devices (the OS sees TeamID mismatch and falls back to browser).
   - Impact on plans: 03-03 has 2 sub-tasks: (a) write AASA template with `<APPLE_TEAM_ID>` placeholder + checked into repo (Wave 1 — autonomous), (b) operator runbook to substitute real TeamID + deploy via Vercel (Wave 1 — `autonomous: false`, gated on 03-00 hard-blocker completion). Already modeled correctly in current 03-03.

---

## Code Examples

### App Review Submission Notes Template (MOBILE-05)

```
Olá, equipe de revisão da App Store!

MilesPro é um app de gestão de milhas e pontos de fidelidade para o mercado
brasileiro (Smiles, LATAM Pass, TudoAzul, Livelo, Esfera, etc.). O app oferece:

(1) Camada gratuita ("Free") — totalmente acessível dentro do app
(2) Camadas pagas ("Pro" e "VIP") — vendidas EXCLUSIVAMENTE em
    https://app.milespro.net.br fora do app, conforme exceção
    de App Store Review Guideline 3.1.3(b) (Multiplatform Services).

O app iOS NÃO contém:
- Qualquer UI de preços, planos, checkout ou upgrade
- Qualquer link clicável para o checkout web
- Qualquer botão "Assinar", "Comprar" ou "Upgrade"

Verificável programaticamente: `strings MilesPro.app/MilesPro | grep -E
'planos|checkout|R\$|Upgrade|Assinar'` retorna ZERO matches.

Demo credentials (free-tier walkthrough):
  Email: reviewer@milespro.net.br
  Senha: [provisioned at submission]

Sequência de teste sugerida:
  1. Sign-in com Google ou Apple → dashboard Free
  2. Adicionar programa Smiles + saldo
  3. Visualizar alerta de vencimento (>30d, feature Free per LGPD/anti-paywall)
  4. (Opcional) Conferir Configurações → links LGPD funcionais

Para conferir as camadas pagas, o usuário acessa
https://app.milespro.net.br/assinatura pelo navegador web — fora do app iOS.

Compliance:
- LGPD (Brazilian GDPR) implementado: política de privacidade em /privacidade,
  endpoints DSR (export + delete), DPO designado dpo@milespro.net.br.
- Sign in with Apple oferecido (Guideline 4.8) pois também oferecemos
  Google Sign-In.
- Push notifications são opt-in contextual (Pro+ feature gated server-side via
  RLS + has_plan check) — não pedimos no signup.

Qualquer dúvida: dpo@milespro.net.br ou pelo Crisp helpdesk em milespro.net.br.

Obrigado!
```

### `push_subscriptions` migration

```sql
-- supabase/migrations/20260515120005_push_subscriptions.sql
-- Phase 3 — MOBILE-04 / D-T08 push subscriptions + RLS + downgrade trigger surface.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  app_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Same-user same-token = idempotent INSERT
CREATE UNIQUE INDEX push_subscriptions_user_token_unique
  ON public.push_subscriptions (user_id, device_token)
  WHERE device_token IS NOT NULL;

CREATE INDEX push_subscriptions_user_id_idx ON public.push_subscriptions (user_id);
CREATE INDEX push_subscriptions_last_seen_idx ON public.push_subscriptions (last_seen_at);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- SELECT: user reads own rows only (RLS-AAA per Plan 01-05)
CREATE POLICY push_subscriptions_select ON public.push_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: user inserts own rows (token capture from Capacitor registration event)
CREATE POLICY push_subscriptions_insert ON public.push_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: user updates own rows (last_seen_at refresh on app open)
CREATE POLICY push_subscriptions_update ON public.push_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: user deletes own (logout cleanup); service-role can delete (downgrade cleanup)
CREATE POLICY push_subscriptions_delete ON public.push_subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Tokens themselves are tier-agnostic — gating is at enqueue-push, not at table.
-- Free user can have a row; enqueue-push checks has_plan('pro') before fetching.
```

### Apple Sign-In Button (gated by `useIsIOSCapacitor`)

```typescript
// src/components/auth/AppleSignInButton.tsx
// Source: supabase.com/docs/guides/auth/social-login/auth-apple +
//         developer.apple.com/design/human-interface-guidelines/sign-in-with-apple
import { useIsIOSCapacitor } from '@/hooks/useIsIOSCapacitor';
import { Button } from '@/components/ui/button';
import { Apple } from 'lucide-react';  // Apple logo svg
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

// Capacitor-native Apple Sign In plugin — see Open Question #1 for plugin choice
// (placeholder import path; replace with selected plugin)
import { SignInWithApple } from '@capacitor-community/apple-sign-in';

export function AppleSignInButton({ onLoading }: { onLoading?: (b: boolean) => void }) {
  const isIOS = useIsIOSCapacitor();
  if (!isIOS) return null;  // Web/Android = NO Apple button (D-T03)

  const handleAppleSignIn = async () => {
    onLoading?.(true);
    try {
      const result = await SignInWithApple.authorize({
        clientId: 'br.com.milespro.app',
        redirectURI: 'https://app.milespro.net.br/auth/callback',
        scopes: 'email name',
        state: crypto.randomUUID(),
        nonce: crypto.randomUUID(),
      });
      const idToken = result.response.identityToken;
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: idToken,
      });
      if (error) throw error;
    } catch (err) {
      logger.error('[AppleSignIn]', err);
      toast({
        title: 'Erro ao entrar com Apple',
        description: 'Tente novamente ou use outro método.',
        variant: 'destructive',
      });
    } finally {
      onLoading?.(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full bg-black text-white hover:bg-black/90"
      onClick={handleAppleSignIn}
    >
      <Apple className="mr-2 h-4 w-4" />
      Entrar com Apple
    </Button>
  );
}
```

### `useTelemetry` push extensions

```typescript
// src/hooks/useTelemetry.ts (excerpt — additions for Phase 3)
// ...existing helpers...

trackPushPermissionGranted: (props: { source: 'first_balance' | 'second_session' | 'other' }) =>
  track('push_permission_granted', props),

trackPushPermissionDenied: (props: { source: 'first_balance' | 'second_session' | 'other' }) =>
  track('push_permission_denied', props),

trackPushReceived: (props: {
  eventType: 'vencimento' | 'promo_alert' | 'payment_confirmed' | 'payment_overdue' | 'trial_ending' | 'onboarding';
}) => track('push_received', props),

trackPushOpened: (props: {
  eventType: 'vencimento' | 'promo_alert' | 'payment_confirmed' | 'payment_overdue' | 'trial_ending' | 'onboarding';
  deepLinkPath: string;
}) => track('push_opened', props),
```

### Vercel `vercel.json` extension (full file after edit)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "rewrites": [
    { "source": "/((?!api/|assets/|\\.well-known/).*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/.well-known/(.*)",
      "headers": [
        { "key": "Content-Type", "value": "application/json" },
        { "key": "Cache-Control", "value": "public, max-age=3600" }
      ]
    }
  ]
}
```

---

## Sources

### Primary (HIGH confidence)
- npm registry (verified versions via `npm view`):
  - `@capacitor/core` dist-tags (`latest-7: 7.6.5`, `latest: 8.3.4`)
  - `@capacitor/push-notifications@7.0.6` peer deps (`@capacitor/core: >=7.0.0`)
  - `@capacitor/app@7.0.0`
  - `@capacitor/assets@3.0.5`
  - `@sentry/capacitor@4.0.0` peer deps (`@sentry/react: 10.43.0`)
  - `@sentry/react` dist-tags (`v8: 8.55.2`, `v9: 9.47.1`, `latest: 10.53.1`)
- Apple App Store Review Guidelines — [developer.apple.com/app-store/review/guidelines](https://developer.apple.com/app-store/review/guidelines/) (3.1.3(b) Multiplatform Services, 3.1.1(a) anti-steering, 4.8 Sign in with Apple)
- Apple AASA spec — [developer.apple.com/documentation/xcode/supporting-associated-domains](https://developer.apple.com/documentation/xcode/supporting-associated-domains)
- Capacitor Push Notifications — [capacitorjs.com/docs/apis/push-notifications](https://capacitorjs.com/docs/apis/push-notifications)
- Capacitor App plugin (appUrlOpen) — [capacitorjs.com/docs/apis/app](https://capacitorjs.com/docs/apis/app)
- Capacitor Deep Links guide — [capacitorjs.com/docs/guides/deep-links](https://capacitorjs.com/docs/guides/deep-links)
- Firebase Cloud Messaging migration to HTTP v1 — [firebase.google.com/docs/cloud-messaging/migrate-v1](https://firebase.google.com/docs/cloud-messaging/migrate-v1)
- FCM HTTP v1 API send — [firebase.google.com/docs/cloud-messaging/send/v1-api](https://firebase.google.com/docs/cloud-messaging/send/v1-api)
- Google OAuth2 service account — [developers.google.com/identity/protocols/oauth2/service-account](https://developers.google.com/identity/protocols/oauth2/service-account)
- Google Digital Asset Links (assetlinks.json) — [developer.android.com/training/app-links/verify-android-applinks](https://developer.android.com/training/app-links/verify-android-applinks)
- Google Play targetSdk requirements — [developer.android.com/google/play/requirements/target-sdk](https://developer.android.com/google/play/requirements/target-sdk) and [Play Console Help](https://support.google.com/googleplay/android-developer/answer/11926878)
- Supabase Auth Apple — [supabase.com/docs/guides/auth/social-login/auth-apple](https://supabase.com/docs/guides/auth/social-login/auth-apple)

### Secondary (MEDIUM confidence)
- AASA CDN cache behavior — [Digital Bunker: Everything You Need To Know About The AASA File](https://digitalbunker.dev/apple-app-site-association/) (verified against Apple Developer Forums thread 684943)
- Universal Links validator — [getuniversal.link](https://getuniversal.link/) (structural validation only — does not test Apple matching logic)
- AASA CDN proxy URL `https://app-site-association.cdn-apple.com/a/v1/<domain>` — confirmed in multiple Apple Developer Forum threads (816498, 765051)

### Tertiary (LOW confidence, marked for validation)
- `[ASSUMED]` Push permission accept-rate target 65-75% (operational best-practice, not vendor-published SLA)
- `[ASSUMED]` Apple Developer Program for PJ requires DUNS Number in 2026 (consistent with 2024-2025 Apple enrollment docs; verify at execution time)
- `[ASSUMED]` `@capacitor-community/apple-sign-in` is Capacitor-7-compatible (verify via npm view + npm test install at execution time; fallback plugins exist)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified via `npm view`; one critical Sentry caveat documented honestly
- Architecture (deep links + push + Path C): HIGH — patterns derive from Capacitor official docs + Supabase official docs + existing canonical hooks (`useIsIOSCapacitor`, `useTelemetry`, edge-fn `_shared/` pattern)
- Pitfalls: HIGH on AASA CDN, assetlinks fingerprint, FCM token lifecycle (vendor-documented); MEDIUM on Path C copy review subjectivity (Apple Review is human + variable); LOW on push accept-rate target (operational estimate)
- Submission process: HIGH on App Review notes shape (3.1.3(b) guideline language stable); MEDIUM on what reviewers actually flag (subjective per reviewer)
- Outreach: MEDIUM on community-specific rules (some Facebook groups ban self-promo) — operational, not vendor-documented

**Research date:** 2026-05-13
**Valid until:** 2026-06-13 (30 days for Capacitor 7 + Apple Review Guidelines — stable); re-verify Capacitor patch versions before each TestFlight cycle (faster-moving); re-verify Play Store deadlines if launch slips past August 2026 (next Android SDK ratchet expected ~August 2026 for `targetSdk=36`).
