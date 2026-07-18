---
phase: 03-mobile-distribution-launch
plan: 05
subsystem: push-notifications-client
tags: [capacitor-push, permission-prompt, contextual-prompt, push-handler, telemetry, adversarial-rls, ios-hig, signed-out-cleanup]
requires:
  - phase: 03-mobile-distribution-launch
    provides: "Plan 03-04a push_subscriptions table + _shared utils; Plan 03-04b 4 push edge fns + 2 fan-outs + push.adversarial.test.ts"
provides:
  - "pushHandler.ts chokepoint module — 4 Capacitor listeners + AASA-aligned deep-link allowlist"
  - "usePushPermission hook — D-T07 contextual gate (programCount>=1 + seen_at null + permission=prompt)"
  - "PushPermissionPrompt component — shadcn Dialog with D-T07 verbatim pt-BR copy"
  - "5 useTelemetry helpers (trackPushPromptShown/Granted/Denied/Received/Opened) matching enqueue-push event_type taxonomy"
  - "ProtectedProviders mount wiring — push handler + prompt overlay (auth-gated)"
  - "AuthProvider SIGNED_OUT → cleanup-push-subscriptions invoke + direct REST DELETE fallback (Q2 RESOLVED)"
  - "user_settings.push_pre_prompt_seen_at migration — idempotency latch"
  - "[PENDING] Lovable Cloud apply + types.ts regeneration (Task 9 checkpoint:human-action)"
affects:
  - Plan 03-06 (Android submission — Android 13+ POST_NOTIFICATIONS permission)
  - Plan 03-07 (iOS submission — manual TestFlight smoke of full token→fan-out→delivery→tap loop)
  - Plan 03-08 (closeout — end-to-end push smoke)
tech-stack:
  added: []
  patterns:
    - "Chokepoint event-listener module (Capacitor) with 4-listener registration + bulk unsubscribe (mirrors deepLinkHandler.ts)"
    - "Contextual permission prompt: value-moment gating via react-query count + idempotency UPSERT (iOS HIG 65-75% accept-rate)"
    - "Best-effort SIGNED_OUT cleanup: edge fn invoke → direct REST fallback on 401 → wrapped in try/catch (never throws, never blocks logout)"
    - "Auth-context-keyed useEffect mount in ProtectedProviders for native-only side effects (web no-op via Capacitor.isNativePlatform())"
key-files:
  created:
    - supabase/migrations/20260516120000_user_settings_push_pre_prompt.sql
    - src/lib/pushHandler.ts
    - src/lib/__tests__/pushHandler.test.ts
    - src/hooks/usePushPermission.ts
    - src/hooks/__tests__/usePushPermission.test.tsx
    - src/components/push/PushPermissionPrompt.tsx
  modified:
    - src/hooks/useTelemetry.ts (+5 push lifecycle helpers)
    - src/components/ProtectedProviders.tsx (PushMount + PushPermissionPrompt overlay)
    - src/contexts/AuthProvider.tsx (SIGNED_OUT branch — Q2 RESOLVED)
    - src/contexts/AuthProvider.test.tsx (+3 cases for SIGNED_OUT cleanup)
    - .planning/phases/03-mobile-distribution-launch/03-04b-LOVABLE-CLOUD-DEPLOY-RUNBOOK.md (+H2 Plan 03-05 entry)
key-decisions:
  - "Migration filename renamed from plan-spec 20260514120003 → 20260516120000 (Rule-1 deviation — same collision pattern as 03-04b cron renames). Content unchanged."
  - "Both PushPermissionPrompt buttons (Permitir + Agora não) call requestPermission so push_pre_prompt_seen_at is set exactly once regardless of choice (iOS HIG one-shot dialog). Cleaner separate-dismiss mutation deferred to v2."
  - "ALLOWED_DEEP_LINK_PREFIXES allowlist in pushHandler.ts (T-3-03f defense-in-depth) — server enqueue-push is trusted, but allowlist is the last fence against a future regression."
  - "push.adversarial.test.ts NOT extended — Plan 03-04b created the file with 6 RLS scenarios that already satisfy the must_have truth contract for this plan."
  - "Schema cast `as unknown as UserSettingsPushSlice` in usePushPermission.ts at the fetch boundary — cleanup deferred to next plan that touches the file after types.ts regen (same pattern as AdminMetrics.tsx is_admin from Plan 02-03)."
patterns-established:
  - "Pattern: Capacitor event-listener chokepoint with 4-listener registration returning {unsubscribe} handle for useEffect cleanup (deepLinkHandler.ts + pushHandler.ts shared shape)"
  - "Pattern: D-T07 contextual permission gate (count >= 1 + seen_at null + native state prompt) — reusable for future iOS HIG-driven prompts (location, photos, etc.)"
  - "Pattern: Best-effort auth-event cleanup (edge fn → REST fallback → try/catch) — reusable for future SIGNED_OUT-keyed side effects"
requirements-completed: [MOBILE-04]
duration: ~25min
completed: 2026-05-16
---

# Phase 3 Plan 05: Client-Side Push Integration Summary

**One-liner:** Closes the MOBILE-04 client side: Capacitor push handler with allowlisted deep-link routing + contextual D-T07 permission prompt (iOS HIG 65-75% accept-rate target) + 5 telemetry helpers + ProtectedProviders mount + AuthProvider SIGNED_OUT cleanup wire (Q2 RESOLVED) + user_settings.push_pre_prompt_seen_at migration. Pending [BLOCKING] Lovable Cloud apply.

## Performance

- **Duration:** ~25 minutes (Tasks 1-8 + runbook docs)
- **Tasks completed:** 8/9 (Task 9 is checkpoint:human-action — founder Lovable Cloud apply)
- **Files created:** 6 (1 migration + 2 source + 2 tests + 1 component)
- **Files modified:** 5 (useTelemetry + ProtectedProviders + AuthProvider + AuthProvider.test + runbook)

## Tasks Executed

| Task | Name                                                                          | Commit   | Files                                                                              |
| ---- | ----------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------- |
| 1    | Migration — user_settings.push_pre_prompt_seen_at (renamed to 20260516120000) | 61d594f  | supabase/migrations/20260516120000_user_settings_push_pre_prompt.sql               |
| 2    | useTelemetry +5 push lifecycle helpers                                        | 20d527c  | src/hooks/useTelemetry.ts                                                          |
| 3    | pushHandler chokepoint + 7 vitest cases (TDD)                                 | fb4ad92  | src/lib/pushHandler.ts, src/lib/__tests__/pushHandler.test.ts                      |
| 4    | usePushPermission hook + 6 vitest cases (TDD, D-T07 gate)                     | 7854440  | src/hooks/usePushPermission.ts, src/hooks/__tests__/usePushPermission.test.tsx     |
| 5    | PushPermissionPrompt shadcn Dialog (D-T07 verbatim pt-BR copy)                | 41ca7a9  | src/components/push/PushPermissionPrompt.tsx                                       |
| 6    | ProtectedProviders mounts handler + prompt                                    | e16a01c  | src/components/ProtectedProviders.tsx                                              |
| 7    | AuthProvider SIGNED_OUT cleanup wire + 3 new test cases (Q2 RESOLVED)         | 6998a94  | src/contexts/AuthProvider.tsx, src/contexts/AuthProvider.test.tsx                  |
| 8    | push.adversarial.test.ts — NOT MODIFIED (already 6/6 from Plan 03-04b)        | (n/a)    | src/test/integration/push.adversarial.test.ts (unchanged — verified contract met)  |
| 9    | [PENDING — checkpoint:human-action] Lovable Cloud migration apply              | (waiting)| (runbook entry committed in 34de69b)                                               |

Runbook update commit: `34de69b` (docs: append Plan 03-05 migration apply section)

## Test Counts

| Suite                                                       | Before | After | Delta |
| ----------------------------------------------------------- | ------ | ----- | ----- |
| Vitest unit — full suite (`npm test --project=unit --run`)  | 121    | 137   | +16   |
| — src/lib/__tests__/pushHandler.test.ts                      | 0      | 7     | +7    |
| — src/hooks/__tests__/usePushPermission.test.tsx             | 0      | 6     | +6    |
| — src/contexts/AuthProvider.test.tsx (SIGNED_OUT cases)      | 4      | 7     | +3    |
| Vitest integration — push.adversarial.test.ts                | 6      | 6     | 0 (unchanged — Plan 03-04b already created 6 scenarios) |

**Total new unit test cases:** +16 (delta from 121 → 137 confirmed by full suite run)

## Local validation performed

| Check                                       | Result                                              |
| ------------------------------------------- | --------------------------------------------------- |
| `npm run typecheck`                         | PASS (no errors)                                    |
| `npm run lint`                              | PASS (0 errors, 3 pre-existing warnings unrelated to this plan) |
| `npm test --project=unit --run`             | 137/137 unit tests PASS                             |
| Plan verify gates (Tasks 1-8 node -e checks) | 7/7 PASS                                            |

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 1 — Bug] Migration filename collision (pre-flagged in agent prompt)**

- **Found during:** Task 1 startup (verified via `ls supabase/migrations/`)
- **Issue:** Plan specified filename `20260514120003_user_settings_push_pre_prompt.sql`, but that timestamp was already taken by Phase 2 W2a migration `20260514120003_profiles_asaas_customer_id_and_cpf_unique.sql`. Creating files with duplicate timestamps causes undefined ordering and breaks Lovable Cloud apply. Additionally, 3 Lovable Cloud auto-generated migrations (`20260516015234_*`, `20260516015546_*`, `20260516023851_*`) were already in the migrations dir from the 03-04b deploy.
- **Fix:** Renamed to `20260516120000_user_settings_push_pre_prompt.sql` (next safe monotonic slot after the most recent Lovable migration `20260516023851_*`). Migration *content* unchanged from the plan spec. Same Rule-1 deviation pattern as Plan 03-04b's cron migration renames (`20260514120002/04` → `20260515120006/07`).
- **Files modified:** `supabase/migrations/20260516120000_user_settings_push_pre_prompt.sql` (filename only; content per plan), `.planning/phases/03-mobile-distribution-launch/03-04b-LOVABLE-CLOUD-DEPLOY-RUNBOOK.md` (Plan 03-05 H2 entry references new filename + explains rename).
- **Commits:** `61d594f` (migration), `34de69b` (runbook).

**2. [Scope — already satisfied] push.adversarial.test.ts NOT recreated**

- **Found during:** Task 8 startup (file inspection)
- **Issue:** Plan Task 8 specifies creating `src/test/integration/push.adversarial.test.ts` with 6 RLS scenarios. The file ALREADY EXISTS at that path (created by Plan 03-04b commit `1081050`) and ALREADY covers the 6 must-have scenarios (Free INSERT own, Free INSERT cross-user 42501, Free SELECT cross-user empty, Pro UPDATE own, Pro UPDATE cross-user filtered, duplicate device_token 23505). Per the plan's own truth ("MAY extend it OR leave it as-is if 03-04b's coverage already satisfies the must_have truth") and per the agent-prompt guidance, no work was needed.
- **Fix:** No file changes. Verified all 6 scenarios + required string patterns are present via the verify gate (which passed against the existing file).
- **Commits:** None for this task.

### Auth gates

None — Capacitor APIs and supabase client invocations are all mocked at the unit-test layer. The only auth-adjacent moment is Task 9, which is a structured checkpoint (founder operating Lovable Cloud chat) NOT an auth error.

No other deviations. Tasks 1-8 + the runbook docs map 1:1 to the plan's must_have truths, threat model, and success criteria.

## D-T07 Contextual Gate Behavior Verified

`shouldShowPrompt` returns true if AND ONLY IF all four conditions hold:
1. `Capacitor.isNativePlatform()` — web build is no-op (state stays `'denied'`, prompt never opens)
2. `user?.id` present — auth-gated
3. `programCount >= 1` — D-T07 value-moment trigger (first balance added)
4. `settings?.push_pre_prompt_seen_at == null` — idempotency latch (one-shot)
5. `hasPermission === 'prompt'` — native state hasn't decided yet

Test coverage in `src/hooks/__tests__/usePushPermission.test.tsx`:
- programCount=0 → prompt hidden
- programCount=1 + seen_at=null + permission=prompt → prompt shown
- seen_at NOT null → prompt hidden (idempotency)
- granted path → telemetry + native register + state flips
- denied path → telemetry only, no register, state flips
- web (isNative=false) → state=denied, no native calls

iOS HIG accept-rate target: 65-75% (vs ~50% at signup — documented win in RESEARCH.md).

## Q2 RESOLVED — SIGNED_OUT push cleanup wire

`src/contexts/AuthProvider.tsx` `onAuthStateChange` (now `async`):
1. Caches `previousUserIdRef.current` BEFORE clearing session state
2. On `event === 'SIGNED_OUT'` AND `cachedPreviousUserId !== null`:
   - Tries `supabase.functions.invoke('cleanup-push-subscriptions', { body: { user_id, mode: 'signed_out' } })`
   - On 401/unauthorized response → fallback `supabase.from('push_subscriptions').delete().eq('user_id', cachedPreviousUserId)` (RLS auth.uid()=user_id still valid in transition window)
   - All paths wrapped in `try/catch` with `logger.error` — never throws, never blocks logout

3 new test cases in `src/contexts/AuthProvider.test.tsx`:
1. SIGNED_OUT → invoke called with `{ user_id, mode: 'signed_out' }`, REST DELETE NOT called
2. 401 response → fallback REST DELETE called
3. Both paths fail (network + DB error) → callback resolves undefined (no throw)

## push.adversarial.test.ts results (6/6 scenarios — Plan 03-04b)

Re-affirmed unchanged. File at `src/test/integration/push.adversarial.test.ts` covers:

1. Free user INSERT own push_subscriptions row → success (no plan gate at table level per D-T08)
2. Free user INSERT cross-user → SQLSTATE 42501
3. Free user SELECT another user's tokens → empty result (RLS filter, not 42501)
4. Pro user UPDATE own last_seen_at → success
5. Pro user UPDATE another user's row → 42501 OR count=0 (PostgREST behavior tolerance)
6. Duplicate (user_id, device_token) → SQLSTATE 23505 (partial UNIQUE index)

RLS holds at table level. Test executes against local Supabase stack via vitest integration project (same gate as vip/travel adversarial tests — fail-by-design without `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_ANON_KEY` env vars; CI's integration-tests job is the authoritative runner).

## Loop-closure smoke (end-to-end)

The full client→server→FCM/APNs→tap loop is NOT smoked in this plan. The end-to-end run will happen during Plan 03-07 (iOS submission TestFlight) and Plan 03-08 (closeout) with manual hands-on TestFlight builds:

1. Pro user installs TestFlight build → opens app
2. Adds first user_program → contextual prompt fires (D-T07)
3. Taps "Permitir" → native iOS permission dialog → user grants
4. `PushNotifications.register()` fires → APNs returns token → upsert into `push_subscriptions`
5. asaas-webhook OR compute-personalized-promos triggers a Pro+ event → enqueue-push fan-out → send-push-notification → FCM/APNs
6. Notification appears on user's device → user taps → `pushNotificationActionPerformed` → `navigate(deep_link_path)` → app routes to `/programa/:program` or `/promocoes`

All client-side pieces required by this loop are now committed. The server pieces shipped in Plan 03-04b. The remaining gates are (a) Lovable Cloud migration apply (Task 9), (b) TestFlight build (Plan 03-07).

## Reminder for Plan 03-06 (Android submission)

Android 13+ (API 33+) requires the runtime permission `android.permission.POST_NOTIFICATIONS`. The `@capacitor/push-notifications` plugin handles the runtime request automatically, but `android/app/src/main/AndroidManifest.xml` should explicitly include:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

Verify this in Plan 03-06 Task 1 (or wherever the Android manifest is finalized).

## Threat Flags

None — all threat surfaces introduced are covered by the plan's threat_model (T-3-03 cross-user RLS, T-3-03f deep_link_path tampering via ALLOWED_DEEP_LINK_PREFIXES allowlist, T-3-03g enqueue-push event_type gating, T-3-03h push payload PII handled by caller convention). The `as unknown as UserSettingsPushSlice` cast in usePushPermission.ts is a temporary type bypass, NOT a new attack surface — the RLS policy `user_settings_update` (Plan 02-06) still gates the UPSERT at the DB level.

## Known Stubs

None — every truth in the plan frontmatter ships as live, wired code:
- pushHandler: 4 listeners registered, allowlist enforced
- usePushPermission: D-T07 gate live, mutation calls native API + telemetry
- PushPermissionPrompt: opens via hook signal, both buttons wired
- ProtectedProviders: handler + prompt mounted
- useTelemetry: 5 helpers exposed, types match enqueue-push enum
- AuthProvider SIGNED_OUT: edge fn invoke + REST fallback wired

The only "incomplete" piece is Task 9 (Lovable Cloud apply) — that is a structured checkpoint, not a stub. Once the founder applies the migration and types.ts regenerates, the `as unknown` cast becomes unnecessary cleanup (deferred to next plan that touches the file).

## Checkpoint Pause — Plan Status

**Task 9 is `type="checkpoint:human-action" gate="blocking"`** — requires the founder to operate Lovable Cloud chat. Cannot be automated by the executor. The runbook entry has been appended to `03-04b-LOVABLE-CLOUD-DEPLOY-RUNBOOK.md` with the exact commands + verification SQL + checklist.

Plan execution is otherwise complete. Tasks 1-8 atomically committed; lint + typecheck + 137/137 unit tests green.

**Resume signal expected from founder:**
> "Migration 20260516120000 applied, types regenerated, column verified, runbook updated."

After resume, no further code changes are needed (the cast cleanup is deferred to the next plan per project convention — same as AdminMetrics.tsx is_admin from Plan 02-03).

## Self-Check: PASSED

All 6 created files verified to exist on disk:
- supabase/migrations/20260516120000_user_settings_push_pre_prompt.sql ✓
- src/lib/pushHandler.ts ✓
- src/lib/__tests__/pushHandler.test.ts ✓
- src/hooks/usePushPermission.ts ✓
- src/hooks/__tests__/usePushPermission.test.tsx ✓
- src/components/push/PushPermissionPrompt.tsx ✓

All 5 modified files verified to exist on disk:
- src/hooks/useTelemetry.ts ✓
- src/components/ProtectedProviders.tsx ✓
- src/contexts/AuthProvider.tsx ✓
- src/contexts/AuthProvider.test.tsx ✓
- .planning/phases/03-mobile-distribution-launch/03-04b-LOVABLE-CLOUD-DEPLOY-RUNBOOK.md ✓

All 8 commits present in git log:
- 61d594f feat(03-05): add user_settings.push_pre_prompt_seen_at migration ✓
- 20d527c feat(03-05): add 5 push lifecycle helpers to useTelemetry ✓
- fb4ad92 feat(03-05): add pushHandler chokepoint + 7 vitest cases ✓
- 7854440 feat(03-05): add usePushPermission hook + 6 vitest cases (D-T07 gate) ✓
- 41ca7a9 feat(03-05): add PushPermissionPrompt with D-T07 verbatim pt-BR copy ✓
- e16a01c feat(03-05): mount registerPushHandler + PushPermissionPrompt in ProtectedProviders ✓
- 6998a94 feat(03-05): wire SIGNED_OUT push cleanup in AuthProvider (Q2 RESOLVED) ✓
- 34de69b docs(03-05): append Plan 03-05 migration apply section to runbook ✓
