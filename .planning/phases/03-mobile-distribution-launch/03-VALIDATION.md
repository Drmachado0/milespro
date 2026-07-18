---
phase: 3
slug: mobile-distribution-launch
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-14
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Sourced from `03-RESEARCH.md` §"Validation Architecture".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 (web/unit + integration projects) + Deno test (edge functions) |
| **Config file** | `vitest.config.ts` (unit/integration projects); Deno tests colocated as `*.test.ts` next to edge fn entrypoints |
| **Quick run command** | `npm run test:unit` |
| **Full suite command** | `npm test` (all Vitest projects) + `npx supabase functions test` for Deno edge functions in CI |
| **Estimated runtime** | ~30s for current 113 unit tests; <5s for new Deno edge tests |

Mobile-specific automated UI tests are out of scope for v1 — TestFlight smoke walkthrough + Play Console pre-launch report are the manual gates for iOS and Android respectively.

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit` (Vitest unit project — <30s)
- **After every plan wave:** Run `npm test` (all Vitest projects) plus `npx supabase functions test` if any edge function changed in the wave
- **Before `/gsd-verify-work`:** Full suite must be green AND CI `check-ios-strings.sh` must exit 0 on the production build artifact
- **Max feedback latency:** 30 seconds (unit), 90 seconds (full + Deno)

---

## Per-Task Verification Map

> Plan/task IDs are placeholders until the planner emits PLAN.md files; each row anchors a behavior to its automated command. The planner MUST map these onto its concrete task IDs.

| Behavior | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|----------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| iOS bundle ships zero pricing strings | 0 | MOBILE-01 | CRIT-03 | iOS .ipa contains no `planos\|checkout\|R\$\|Upgrade\|Assinar` substrings (Path C exemption proof) | smoke (CI step) | `scripts/check-ios-strings.sh` (runs `npm run build && strings dist/assets/*.js \| grep -E 'planos\|checkout\|R\$\|Upgrade\|Assinar' && exit 1 \|\| exit 0`) | ❌ W0 — add script + CI step | ⬜ pending |
| `useIsIOSCapacitor` hides every pricing surface | 1 | MOBILE-01 | CRIT-03 | When `useIsIOSCapacitor()` returns true, `<Assinatura>`, `<Index>`, `<AnimatedSections>` and `<CrispWidget>` render no pricing/checkout DOM | unit | `npm run test:unit -- src/hooks/useIsIOSCapacitor.test.ts src/pages/__tests__/Assinatura.test.tsx src/pages/__tests__/Index.test.tsx` | ⚠ partial — hook exists; per-page Path C tests = W0 | ⬜ pending |
| `targetSdk=35` in Android build.gradle | 1 | MOBILE-02 | HIGH-07 | `android/app/build.gradle` declares `targetSdk = 35` and `minSdk` >= 24 (Capacitor floor) | smoke | `grep -E 'targetSdk\s*=\s*35' android/app/build.gradle && grep -E 'minSdk\s*=\s*[2-9][0-9]' android/app/build.gradle` | ❌ W0 — generated after `npx cap add android` | ⬜ pending |
| Android pre-launch report clean | 3 | MOBILE-02 | HIGH-07 | Play Console pre-launch on Pixel 8 / Android 15 returns zero crashes, zero ANRs, zero security warnings | manual | Play Console Pre-launch Report (Closed Testing track) | manual only | ⬜ pending |
| AASA payload structurally valid | 1 | MOBILE-03 | — | `https://app.milespro.net.br/.well-known/apple-app-site-association` returns JSON with `applinks.details[0].appIDs` populated and `Content-Type: application/json` | smoke | `scripts/smoke-deeplinks.sh` (curl + jq assertion on appIDs presence) | ❌ W0 | ⬜ pending |
| assetlinks.json structurally valid | 1 | MOBILE-03 | — | `https://app.milespro.net.br/.well-known/assetlinks.json` returns array with `target.package_name == 'br.com.milespro.app'` and SHA-256 fingerprint string non-empty | smoke | `scripts/smoke-deeplinks.sh` (curl + jq assertion on package_name + fingerprint) | ❌ W0 | ⬜ pending |
| OAuth callback PKCE round-trip | 2 | MOBILE-03 | — | After deep-link to `/auth/callback?code=...`, `supabase.auth.exchangeCodeForSession` is invoked, session lands in Capacitor storage, `returnTo` query param is consumed and navigation happens once (no double-fire) | integration | `npm run test:unit -- src/test/integration/oauthCallback.test.ts` | ❌ W0 | ⬜ pending |
| `deepLinkHandler` parses URL, strips origin, navigates | 1 | MOBILE-03 | — | `deepLinkHandler(url)` validates `host === 'app.milespro.net.br'`, sets sessionStorage `pendingDeepLink` for auth-gated paths, navigates immediately for `/auth/callback` and `/lgpd/confirm-delete` and `/promocoes` | unit | `npm run test:unit -- src/lib/__tests__/deepLinkHandler.test.ts` | ❌ W0 | ⬜ pending |
| Push permission contextual prompt fires after first user_program | 2 | MOBILE-04 | — | `usePushPermission` only calls `PushNotifications.requestPermissions()` when `user_programs.count >= 1` AND `user_settings.push_pre_prompt_seen_at IS NULL`; idempotent on subsequent renders | unit + integration | `npm run test:unit -- src/hooks/__tests__/usePushPermission.test.ts src/test/integration/pushPermission.test.tsx` | ❌ W0 | ⬜ pending |
| `enqueue-push` rejects Free for Pro+ event_types | 2 | MOBILE-04 | — | Edge fn `enqueue-push` returns 403 with body `{error: 'plan_required'}` when caller has `has_plan('pro') === false` AND `event_type IN ('expiry_60d','expiry_13d')`; no FCM/APNs call made | unit (Deno) | `deno test supabase/functions/enqueue-push/index.test.ts` | ❌ W0 | ⬜ pending |
| `cleanup-push-subscriptions` deletes tokens on downgrade | 2 | MOBILE-04 | — | Cron-triggered Deno fn issues service-role DELETE against `push_subscriptions WHERE user_id IN (downgraded set)` ; assertion on row count delta | unit (Deno) | `deno test supabase/functions/cleanup-push-subscriptions/index.test.ts` | ❌ W0 | ⬜ pending |
| FCM JWT signing round-trip | 2 | MOBILE-04 | — | `_shared/fcmSignJWT.ts` signs with service-account private key, exchanges with `https://oauth2.googleapis.com/token`, caches access token for `expires_in - 60s` | unit (Deno) | `deno test supabase/functions/_shared/fcmSignJWT.test.ts` | ❌ W0 | ⬜ pending |
| push_subscriptions RLS — Free CAN INSERT own row, NOT another user's row | 2 | MOBILE-04 | — | Free user INSERT own row succeeds; Free user INSERT another user's row → SQLSTATE 42501; Free user SELECT another user's row → empty (RLS denies, not 42501) | adversarial | `npm run test:unit -- src/test/integration/push.adversarial.test.ts` (mirrors `vip.adversarial.test.ts` pattern) | ❌ W0 | ⬜ pending |
| Submission notes template exists with Guideline 3.1.3(b) citation | 3 | MOBILE-05 | CRIT-03 | `.planning/phases/03-*/app-review-submission-notes.md` contains "3.1.3(b)" verbatim and step-by-step demo flow with test credentials placeholder | manual | `grep -F '3.1.3(b)' .planning/phases/03-mobile-distribution-launch/app-review-submission-notes.md` | manual artifact | ⬜ pending |
| iOS build approved | 3 | LAUNCH-02 | CRIT-03 | App Store Connect status reads "Ready for Sale", no open rejections referencing 3.1.1 or 3.1.3 | manual | App Store Connect dashboard inspection | manual only | ⬜ pending |
| Android build approved on production track | 3 | LAUNCH-03 | HIGH-07 | Play Console shows production-track build live with no policy violations | manual | Play Console dashboard inspection | manual only | ⬜ pending |
| LAUNCH-06 — 10 paying CPFs with PAYMENT_RECEIVED | 3 | LAUNCH-06 | HIGH-08 | Asaas dashboard shows ≥10 distinct CPFs each with at least one PAYMENT_RECEIVED event; PostHog funnel matches; helpdesk ticket SLA respected | manual | Asaas dashboard + PostHog funnel + helpdesk inbox | manual only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/check-ios-strings.sh` — Path C kill-switch grep on built bundle (MOBILE-01 / CRIT-03)
- [ ] `scripts/smoke-deeplinks.sh` — curl+jq smoke for AASA and assetlinks endpoints (MOBILE-03)
- [ ] `src/hooks/useIsIOSCapacitor.test.ts` — already exists via Phase 2 W2b; verify still green
- [ ] `src/pages/__tests__/Assinatura.test.tsx` — render+grep no-pricing for iOS branch (MOBILE-01)
- [ ] `src/pages/__tests__/Index.test.tsx` — Path C `PricingSection` returns null (MOBILE-01)
- [ ] `src/lib/__tests__/deepLinkHandler.test.ts` — URL parse / host validate / sessionStorage gate (MOBILE-03)
- [ ] `src/test/integration/oauthCallback.test.ts` — PKCE round-trip via mocked Supabase auth (MOBILE-03)
- [ ] `src/hooks/__tests__/usePushPermission.test.ts` — gating logic + idempotency (MOBILE-04)
- [ ] `src/test/integration/pushPermission.test.tsx` — contextual prompt after first user_program (MOBILE-04)
- [ ] `src/test/integration/push.adversarial.test.ts` — RLS adversarial (MOBILE-04, mirrors `vip.adversarial.test.ts`)
- [ ] `supabase/functions/enqueue-push/index.test.ts` — Free/Pro tier gating (MOBILE-04)
- [ ] `supabase/functions/cleanup-push-subscriptions/index.test.ts` — downgrade cleanup (MOBILE-04)
- [ ] `supabase/functions/_shared/fcmSignJWT.test.ts` — JWT sign + token exchange (MOBILE-04)
- [ ] CI step `check-ios-strings` running on every PR that touches `src/**` or `vite.config.ts`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| TestFlight walkthrough confirms no pricing UI | MOBILE-01 / LAUNCH-02 | App Store reviewer behavior; physical device + TestFlight build | Install TestFlight build on iPhone/iPad → tap through all screens accessible in free tier → verify no `R$`, no "Pro/VIP" pricing copy, no "Upgrade" buttons, no clickable links to checkout. Record screen capture for submission notes. |
| Play Console pre-launch report | MOBILE-02 / LAUNCH-03 | Google emulator-based automation requires actual upload | Upload Android `.aab` to Closed Testing track → wait for pre-launch report → verify zero crashes / zero ANRs / zero policy warnings on Pixel 8 + Android 15. |
| App Store Connect "Ready for Sale" status | LAUNCH-02 | Requires Apple reviewer approval | After binary upload and submission with notes citing Guideline 3.1.3(b), monitor App Store Connect status; treat any rejection mentioning 3.1.1 or 3.1.3 as CRIT-03 escalation. |
| Push payload deep-links to correct screen on physical device | MOBILE-04 | APNs and FCM payload routing varies by device + OS version | Send test push from `send-vencimento-alert` with deep-link payload → tap notification on physical iPhone (iOS 17+) and Pixel (Android 14+) → assert app opens to `/programa/<id>` screen, not landing page. |
| 10-pagantes outreach SLA + week-1 follow-up | LAUNCH-06 / HIGH-08 | Human helpdesk response | Crisp/WhatsApp inbox audit: every inbound ticket from a first-10-pagante answered within 24h; proactive outreach message sent within 7 days of first payment. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies (planner gate)
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all ❌-marked references in §"Per-Task Verification Map"
- [ ] No `--watch` flags in CI or post-task scripts
- [ ] Feedback latency < 30s for unit, < 90s for full suite + Deno
- [ ] `nyquist_compliant: true` set in frontmatter once W0 closes

**Approval:** pending
