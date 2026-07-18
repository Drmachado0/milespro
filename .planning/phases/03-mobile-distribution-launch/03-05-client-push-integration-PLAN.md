---
phase: 03-mobile-distribution-launch
plan: 05
type: execute
wave: 2
depends_on: ["04b"]
files_modified:
  - src/lib/pushHandler.ts
  - src/lib/__tests__/pushHandler.test.ts
  - src/hooks/usePushPermission.ts
  - src/hooks/__tests__/usePushPermission.test.tsx
  - src/components/push/PushPermissionPrompt.tsx
  - src/hooks/useTelemetry.ts
  - src/App.tsx
  - src/components/ProtectedProviders.tsx
  - src/contexts/AuthProvider.tsx
  - src/test/integration/push.adversarial.test.ts
  - supabase/migrations/20260514120003_user_settings_push_pre_prompt.sql
autonomous: false
requirements: [MOBILE-04]
tags: [capacitor-push, permission-prompt, contextual-prompt, push-handler, telemetry, adversarial-rls, ios-hig]
must_haves:
  truths:
    - "src/lib/pushHandler.ts exports registerPushHandler(supabaseClient, userId, navigate) which (a) is a no-op when !Capacitor.isNativePlatform(); (b) registers Capacitor PushNotifications 'registration' event → INSERT into push_subscriptions {user_id, device_token, platform, app_version} via authed Supabase client; (c) registers 'pushNotificationReceived' → calls trackPushReceived telemetry; (d) registers 'pushNotificationActionPerformed' → reads data.deep_link_path → navigate(path); (e) returns unsubscribe for useEffect cleanup"
    - "src/hooks/usePushPermission.ts exposes {requestPermission, shouldShowPrompt, hasPermission, hasDismissed}; shouldShowPrompt = userProgramsCount >= 1 AND !pushPrePromptSeenAt AND hasPermission==='prompt' (D-T07 contextual gate); requestPermission calls PushNotifications.checkPermissions then requestPermissions, updates user_settings.push_pre_prompt_seen_at, and on 'granted' calls PushNotifications.register() which fires the 'registration' event downstream"
    - "src/components/push/PushPermissionPrompt.tsx renders shadcn Dialog with pre-prompt copy: 'Avisamos quando suas milhas estiverem perto de vencer ou quando aparecer uma promo de transferência. Permitir avisos?' + [Permitir] [Agora não] buttons (D-T07 verbatim copy)"
    - "src/hooks/useTelemetry.ts adds 5 new typed helpers: trackPushPromptShown({trigger}), trackPushPermissionGranted({platform}), trackPushPermissionDenied({platform}), trackPushReceived({event_type}), trackPushOpened({event_type, deep_link_path}) — discriminated unions match enqueue-push event_type enum"
    - "src/components/ProtectedProviders.tsx mounts the push prompt + registers pushHandler inside the AuthProvider tree (where useAuth() + supabase client are available); listens for useUserPrograms count >= 1 to trigger the dialog"
    - "src/App.tsx unchanged for push wiring (push is mounted inside ProtectedProviders, NOT App.tsx — separates concerns: deep-link handler is global, push is auth-gated)"
    - "supabase/migrations/20260514120003_user_settings_push_pre_prompt.sql adds column user_settings.push_pre_prompt_seen_at TIMESTAMPTZ NULL (idempotent ADD COLUMN IF NOT EXISTS); no RLS change needed (existing user_settings RLS owns the row)"
    - "src/test/integration/push.adversarial.test.ts (Vitest integration project; mirrors src/hooks/vip/vip.adversarial.test.ts pattern): 6+ scenarios: Free INSERT own push_subscriptions row → success; Free INSERT cross-user → 42501; Pro UPDATE own last_seen_at → success; Pro UPDATE cross-user → 42501; duplicate (user_id, device_token) → 23505 unique; Free SELECT another user's tokens → empty array (RLS filter)"
    - "src/hooks/__tests__/usePushPermission.test.tsx covers: contextual gate (count 0 → no prompt, count 1 + first time → prompt), idempotency (count 5 + push_pre_prompt_seen_at NOT NULL → no prompt), permission granted path INSERTs into push_subscriptions"
    - "src/lib/__tests__/pushHandler.test.ts covers: web no-op (Capacitor.isNativePlatform()===false), registration event → INSERT to push_subscriptions, pushNotificationActionPerformed → navigate(deep_link_path), missing data.deep_link_path → navigate('/dashboard') fallback"
    - "src/contexts/AuthProvider.tsx onAuthStateChange branch on event===SIGNED_OUT (Q2 RESOLVED): caches previousUserIdRef BEFORE clearing session; best-effort invokes cleanup-push-subscriptions edge fn (mode=signed_out) via supabase.functions.invoke; on 401 fallback to direct REST DELETE against push_subscriptions (RLS auth.uid()=user_id valid in the brief pre-sign-out window); never throws; never blocks logout"
    - "[BLOCKING] founder applies migration via Lovable Cloud chat: `Aplicar a migration 20260514120003_user_settings_push_pre_prompt.sql em produção` + `Regenerar tipos do Supabase`"
  artifacts:
    - path: src/lib/pushHandler.ts
      provides: "Capacitor PushNotifications chokepoint: registration + received + action events"
      contains: "PushNotifications.addListener"
    - path: src/hooks/usePushPermission.ts
      provides: "Contextual permission prompt logic + push_pre_prompt_seen_at idempotency"
      contains: "shouldShowPrompt"
    - path: src/components/push/PushPermissionPrompt.tsx
      provides: "shadcn Dialog pre-prompt before native permission dialog"
      contains: "Permitir"
    - path: src/hooks/useTelemetry.ts
      provides: "5 new push lifecycle helpers"
      contains: "trackPushReceived"
    - path: src/components/ProtectedProviders.tsx
      provides: "Mount point for push handler + prompt (auth-gated)"
      contains: "registerPushHandler"
    - path: supabase/migrations/20260514120003_user_settings_push_pre_prompt.sql
      provides: "user_settings.push_pre_prompt_seen_at column for idempotent prompt logic"
      contains: "push_pre_prompt_seen_at"
    - path: src/contexts/AuthProvider.tsx
      provides: "SIGNED_OUT push cleanup wire (Q2 RESOLVED) — edge fn invoke + REST fallback"
      contains: "signed_out"
    - path: src/test/integration/push.adversarial.test.ts
      provides: "RLS adversarial proof for push_subscriptions table"
      contains: "push_subscriptions"
  key_links:
    - from: "PushNotifications.addListener('registration', ...)"
      to: "push_subscriptions INSERT (Plan 03-04a schema)"
      via: "authed Supabase REST"
      pattern: "push_subscriptions"
    - from: "PushNotifications.addListener('pushNotificationActionPerformed', ...)"
      to: "React Router navigate(data.deep_link_path)"
      via: "deep_link_path passthrough from FCM payload (Plan 03-04b send-push-notification)"
      pattern: "deep_link_path"
    - from: "AuthProvider onAuthStateChange SIGNED_OUT event"
      to: "supabase/functions/cleanup-push-subscriptions (mode=signed_out — Plan 03-04b)"
      via: "supabase.functions.invoke best-effort; fallback to direct REST DELETE"
      pattern: "signed_out"
    - from: "PushPermissionPrompt dialog OK button"
      to: "PushNotifications.requestPermissions() → register()"
      via: "useCallback in usePushPermission"
      pattern: "requestPermission"
---

<objective>
Wire the client-side push pipeline: Capacitor `PushNotifications` listeners, contextual permission prompt (post-first-balance per D-T07 + iOS HIG), telemetry helpers, RLS adversarial proof. This is the consumer side of Plan 03-04's server-side push infra — once both ship, the loop is closed (token registered → enqueue-push fan-outs → FCM/APNs delivery → tap → React Router navigate to deep_link_path).

Purpose: MOBILE-04 §"Push notifications work as a Pro/VIP feature" requires (a) tokens registered server-side, (b) permission prompted contextually (not at signup — iOS HIG accept-rate 65-75% vs 50% at signup), (c) tapping a notification routes to the correct screen. D-T07 codifies the contextual prompt timing (after first user_program INSERT). The RLS adversarial test mirrors `vip.adversarial.test.ts` from Plan 02-06 — proves at integration-test level that the Plan 03-04 push_subscriptions RLS holds against Free-user direct-REST attacks.

Output: 1 new chokepoint module (pushHandler.ts), 1 new hook (usePushPermission), 1 new UI component (PushPermissionPrompt), telemetry extension, ProtectedProviders mount, 1 migration (push_pre_prompt_seen_at column), 1 adversarial integration test. Wave 2; depends on Plan 03-04 (push_subscriptions table + enqueue-push must exist before client INSERT can succeed against RLS).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/03-mobile-distribution-launch/03-CONTEXT.md
@.planning/phases/03-mobile-distribution-launch/03-RESEARCH.md
@.planning/phases/03-mobile-distribution-launch/03-PATTERNS.md
@.planning/phases/03-mobile-distribution-launch/03-VALIDATION.md
@src/hooks/useConsent.ts
@src/hooks/useTelemetry.ts
@src/hooks/useUserPrograms.ts
@src/components/ProtectedProviders.tsx
@src/lib/sentry.ts
@src/hooks/vip/vip.adversarial.test.ts

<interfaces>
<!-- Cross-plan contracts -->

**Consumes from Plan 03-04 (server-side push):**
- `push_subscriptions` table with own-row RLS — client INSERTs into this via authed Supabase client
- `user_settings` table extended with `push_pre_prompt_seen_at` column (added by this plan's migration; consumed by usePushPermission for idempotency)

**Consumes from Plan 03-03:**
- `src/lib/deepLinkHandler.ts` host validation pattern — pushHandler validates `deep_link_path` is one of the AASA-registered routes (defense-in-depth; FCM payload should already be trustworthy since it comes from our own enqueue-push)

**Consumes from Plan 03-01:**
- `@capacitor/push-notifications@^7` installed
- Native iOS Info.plist has NSUserNotificationsUsageDescription (already set in Plan 03-01 Task 5.1)
- Android targetSdk=35 (Plan 03-01 Task 5.2) — required for Android 13+ POST_NOTIFICATIONS permission flow

**Existing patterns (must follow):**
- `src/lib/sentry.ts` initSentry pattern (init-once module helper)
- `src/lib/posthog.ts` initialized guard
- `src/hooks/useConsent.ts` useQuery + useMutation pattern for hooks
- `src/hooks/useUserPrograms.ts` — source of count for contextual gate
- `src/components/ProtectedProviders.tsx` — lazy-loaded mount point for auth-context-dependent providers

**ProtectedProviders is the canonical mount point:**
- It is lazy-loaded by App.tsx (line ~19 currently)
- Sits below AuthProvider in the tree, so `useAuth()` works inside
- Inside ProtectedProviders, the user.id is available — that's what pushHandler needs for the INSERT
- Adding the push wiring here keeps the deep-link handler (auth-agnostic, in App.tsx) and the push handler (auth-required, in ProtectedProviders) cleanly separated

**Test infra:**
- Unit project: jsdom; Capacitor @capacitor/push-notifications gets mocked
- Integration project: src/test/integration/**.test.ts runs against Supabase local stack via `clientAs(<fixture>)`
- Existing fixtures: FREE_USER, PRO_USER, VIP_USER in src/test/integration/fixtures.ts (per vip.adversarial.test.ts:33-67)

</interfaces>

<scratchpad>
**Why pushHandler is registered in ProtectedProviders, not App.tsx:**
- App.tsx mount of registerDeepLinkHandler (Plan 03-03) is global because deep-links arrive from notifications + email + share, ANY of which can land pre-auth → /auth/callback flow
- Push handler INSERTs into push_subscriptions which requires `auth.uid()=user_id` — that requires a session
- Putting it in ProtectedProviders ensures: session is established before listeners fire; user.id is available; cleanup-on-unmount works correctly
- Conceptually: deep-link infra is delivery; push infra is consumption — they live at different layers

**Why a separate component PushPermissionPrompt vs inline in usePushPermission:**
- Render concerns vs behavior concerns
- Future: A/B-test the pre-prompt copy → component-level swap is easier than hook-level rewiring
- shadcn Dialog needs render context (open/close state, footer buttons); cleaner as a component

**Why D-T07 says "after first balance" not "after signup + N minutes":**
- iOS HIG explicitly recommends value-moment timing
- First user_program INSERT = user has actually engaged with the product (not just signed up and bounced)
- 65-75% accept rate vs 50% at signup is a documented win in iOS HIG (RESEARCH cites this)
- We trigger on count >= 1, NOT count === 1, to make the prompt resilient to async race (e.g., user toggles between dashboard tabs, refetches mid-INSERT)

**Why useUserPrograms is the count source:**
- Existing hook, well-tested in Phase 1
- The query key is `['user_programs', userId]` — react-query refetches on focus, so the count is current
- Alternative would be a fresh `SELECT count(*) FROM user_programs WHERE user_id = $self` — wasteful (existing query already returns the rows)

**Why we DON'T re-prompt after dismissal:**
- iOS only gives ONE shot at the native permission dialog
- If the user dismisses our pre-prompt with [Agora não], we set push_pre_prompt_seen_at and never re-show the pre-prompt
- They can re-enable via Configurações (deferred to v2 — current Configurações page doesn't expose the toggle)
- This is the cost of contextual prompting; the accept-rate trade-off justifies it

**Why the integration test mirrors vip.adversarial.test.ts:**
- The Plan 02-06 vip.adversarial.test.ts is the canonical adversarial-RLS template in the project
- Pattern: clientAs(<FIXTURE>) → attempt the operation → assertEqual(error.code, '42501')
- New twist for push_subscriptions: Free CAN insert own row (no plan gate at table); only cross-user inserts are rejected. This catches the "table-level vs event-level gating" subtlety from D-T08.

**Why we add user_settings.push_pre_prompt_seen_at in this plan, not in Plan 03-04 schema migration:**
- Plan 03-04 owns push_subscriptions (server-side); this is purely a UX/idempotency column
- Splitting the migration to the consumer plan keeps each plan's schema changes localized to its concern
- The migration is tiny (single ADD COLUMN IF NOT EXISTS), so cost is low
- An alternative: combine into Plan 03-04 — rejected because that plan is already at 11 tasks; this 1-task migration shouldn't bloat it further
</scratchpad>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Migration — user_settings.push_pre_prompt_seen_at column</name>
  <files>supabase/migrations/20260514120003_user_settings_push_pre_prompt.sql</files>
  <read_first>
    - supabase/migrations/20260515120002_user_settings_alert_antecipation.sql (analog ADD COLUMN pattern from Plan 02-06)
  </read_first>
  <action>
**1.1 — Create `supabase/migrations/20260514120003_user_settings_push_pre_prompt.sql`:**

```sql
-- Phase 3 W2 — MOBILE-04 push permission idempotency column
-- D-T07: contextual prompt fires once per user; this column persists the
-- "user has been asked" state so we never re-prompt (iOS only gives one shot
-- at the native permission dialog).

BEGIN;

-- user_settings is created by Plan 02-06 migration 20260515120002.
-- This migration only adds a column; safe to run even on fresh installs because
-- the prior migration is a prerequisite and runs first by timestamp order.
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS push_pre_prompt_seen_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.user_settings.push_pre_prompt_seen_at IS
  'D-T07: timestamp when the user was shown the contextual push permission pre-prompt. NULL = never asked. NOT NULL = asked once, regardless of grant/deny outcome (iOS HIG: do not re-ask).';

-- Self-check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'push_pre_prompt_seen_at'
  ) THEN
    RAISE EXCEPTION 'MOBILE-04 self-check failed: push_pre_prompt_seen_at column not added';
  END IF;
  RAISE NOTICE 'MOBILE-04 self-check passed: user_settings.push_pre_prompt_seen_at exists';
END $$;

COMMIT;
```

**1.2 — Convention enforcement:**
- ADD COLUMN IF NOT EXISTS (idempotent re-apply)
- COMMENT ON COLUMN documents the D-T07 + iOS HIG rationale inline
- BEGIN ... COMMIT atomic
- Self-check via DO block
- pt-BR not applicable in SQL identifiers
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const m=fs.readFileSync('supabase/migrations/20260514120003_user_settings_push_pre_prompt.sql','utf8'); const req=[['ADD COLUMN IF NOT EXISTS push_pre_prompt_seen_at','idempotent add'],['TIMESTAMPTZ NULL','column type'],['user_settings','target table'],['COMMENT ON COLUMN','documentation'],['D-T07','rationale ref'],['MOBILE-04 self-check passed','self-check'],['COMMIT;','atomic']]; let fail=false; for (const [n,w] of req){if(!m.includes(n)){console.error('FAIL: migration missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: push_pre_prompt_seen_at migration');"</automated>
  </verify>
  <done>
    20260514120003_user_settings_push_pre_prompt.sql adds push_pre_prompt_seen_at TIMESTAMPTZ NULL with idempotent ADD COLUMN IF NOT EXISTS + COMMENT + self-check.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Extend useTelemetry with 5 push lifecycle helpers</name>
  <files>src/hooks/useTelemetry.ts</files>
  <read_first>
    - src/hooks/useTelemetry.ts (existing 12 helpers; structure of discriminated-union typed events)
    - .planning/phases/03-mobile-distribution-launch/03-PATTERNS.md §"useTelemetry.ts MODIFICATIONS"
  </read_first>
  <action>
**2.1 — Add 5 new helpers in `src/hooks/useTelemetry.ts` (append to the returned object):**

Locate the `return { ... }` block in the hook body. Add (after existing helpers, before the closing brace):

```typescript
// ------------------------------------------------------------------
// Push lifecycle (Phase 3 / MOBILE-04)
// ------------------------------------------------------------------

trackPushPromptShown: (props: { trigger: 'first_balance' | 'manual' }) =>
  track('push_prompt_shown', props),

trackPushPermissionGranted: (props: { platform: 'ios' | 'android' }) =>
  track('push_permission_granted', props),

trackPushPermissionDenied: (props: { platform: 'ios' | 'android' }) =>
  track('push_permission_denied', props),

trackPushReceived: (props: {
  event_type: 'expiry_60d' | 'expiry_13d' | 'payment_event' | 'onboarding' | 'promo_alert';
}) => track('push_received', props),

trackPushOpened: (props: {
  event_type: 'expiry_60d' | 'expiry_13d' | 'payment_event' | 'onboarding' | 'promo_alert';
  deep_link_path: string;
}) => track('push_opened', props),
```

The event_type union exactly matches the Plan 03-04 enqueue-push `PRO_PLUS_EVENTS` + `ALL_TIER_EVENTS` taxonomy — discriminated typing prevents drift between client + server.

**2.2 — Convention enforcement:**
- TypeScript strict; literal union types
- Section comment matches existing style (Phase 3 / MOBILE-04 reference)
- `track('event_name', props)` invocation matches existing 12 helpers exactly
- No new `import` (assume `track` is already imported from `@/lib/posthog`)
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const t=fs.readFileSync('src/hooks/useTelemetry.ts','utf8'); const req=[['trackPushPromptShown','prompt event'],['trackPushPermissionGranted','grant event'],['trackPushPermissionDenied','denial event'],['trackPushReceived','received event'],['trackPushOpened','opened event'],[\"event_type:\",'typed event_type prop'],[\"'expiry_60d'\",'event union value 1'],[\"'promo_alert'\",'event union value 5'],['deep_link_path: string','opened deep link prop']]; let fail=false; for (const [n,w] of req){if(!t.includes(n)){console.error('FAIL: useTelemetry missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: useTelemetry 5 push helpers');"</automated>
  </verify>
  <done>
    useTelemetry.ts has 5 new push-lifecycle helpers with discriminated event_type union matching enqueue-push taxonomy.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Create src/lib/pushHandler.ts + tests (Capacitor PushNotifications chokepoint)</name>
  <files>src/lib/pushHandler.ts, src/lib/__tests__/pushHandler.test.ts</files>
  <read_first>
    - .planning/phases/03-mobile-distribution-launch/03-RESEARCH.md §"@capacitor/push-notifications Integration" + Pattern 5
    - .planning/phases/03-mobile-distribution-launch/03-PATTERNS.md §"src/lib/pushHandler.ts"
    - src/lib/sentry.ts (init-once module pattern reference)
    - src/lib/deepLinkHandler.ts (Plan 03-03 — analog event-listener module)
  </read_first>
  <behavior>
    registerPushHandler(supabase, userId, navigate):
    - No-op when !Capacitor.isNativePlatform()
    - Registers 3 Capacitor PushNotifications listeners:
      a. 'registration': INSERT into push_subscriptions {user_id, device_token: token.value, platform: getPlatform()==='ios'?'ios':'android', app_version: <from package.json or env>}; ON CONFLICT (user_id, device_token) DO UPDATE SET last_seen_at = now()
      b. 'pushNotificationReceived': call trackPushReceived({event_type: notification.data.event_type})
      c. 'pushNotificationActionPerformed': call trackPushOpened({event_type, deep_link_path}) then navigate(deep_link_path ?? '/dashboard')
    - Returns unsubscribe function that removes all 3 listeners
    - Logs via logger
  </behavior>
  <action>
**3.1 — Create `src/lib/pushHandler.ts`:**

```typescript
import { Capacitor } from '@capacitor/core';
import { PushNotifications, type Token, type PushNotificationSchema, type ActionPerformed } from '@capacitor/push-notifications';
import type { NavigateFunction } from 'react-router-dom';
import type { SupabaseClient } from '@supabase/supabase-js';

import { logger } from '@/lib/logger';
import { track } from '@/lib/posthog';

// Read app version from Vite env (set by build) or fall back
const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? '1.0.0';

// AASA-aligned allowed deep-link paths (defense in depth — should match
// public/.well-known/apple-app-site-association from Plan 03-03)
const ALLOWED_DEEP_LINK_PREFIXES = ['/auth/callback', '/lgpd/confirm-delete', '/promocoes', '/dashboard'];

function isAllowedDeepLinkPath(path: string): boolean {
  return ALLOWED_DEEP_LINK_PREFIXES.some((p) => path.startsWith(p));
}

interface PushHandlerHandle {
  unsubscribe: () => void;
}

/**
 * Registers all three Capacitor PushNotifications listeners.
 *
 * No-op when !Capacitor.isNativePlatform() — safe to call from web builds.
 *
 * Mounting point: ProtectedProviders.tsx useEffect (where `useAuth().user.id`
 * is available and the supabase client is the authed singleton).
 *
 * Listener responsibilities:
 *   - 'registration': INSERT or upsert the device_token into push_subscriptions
 *   - 'pushNotificationReceived' (foreground): telemetry only; no UI
 *   - 'pushNotificationActionPerformed' (background tap): telemetry + navigate
 *
 * The navigate fn must come from a `useNavigate()` inside React Router context.
 */
export function registerPushHandler(
  supabase: SupabaseClient,
  userId: string,
  navigate: NavigateFunction,
): PushHandlerHandle {
  if (!Capacitor.isNativePlatform()) {
    return { unsubscribe: () => {} };
  }

  const platform: 'ios' | 'android' = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';

  // 1. Registration (token received)
  const regHandlePromise = PushNotifications.addListener('registration', async (token: Token) => {
    logger.log('[PushHandler]', 'registration token received');
    try {
      // Upsert: on conflict with partial UNIQUE (user_id, device_token), bump last_seen_at
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(
          {
            user_id: userId,
            device_token: token.value,
            platform,
            app_version: APP_VERSION,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,device_token' },
        );
      if (error) {
        logger.error('[PushHandler]', 'upsert push_subscriptions failed', error);
      }
    } catch (err) {
      logger.error('[PushHandler]', 'unexpected error during token upsert', err);
    }
  });

  // 2. Foreground received
  const recvHandlePromise = PushNotifications.addListener(
    'pushNotificationReceived',
    (notification: PushNotificationSchema) => {
      logger.log('[PushHandler]', 'foreground push received', notification.title);
      const eventType = (notification.data?.event_type as string | undefined) ?? 'unknown';
      track('push_received', { event_type: eventType });
    },
  );

  // 3. Background tap (notification.actionPerformed)
  const actHandlePromise = PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (action: ActionPerformed) => {
      const data = action.notification.data ?? {};
      const eventType = (data.event_type as string | undefined) ?? 'unknown';
      const rawPath = (data.deep_link_path as string | undefined) ?? '/dashboard';
      const path = isAllowedDeepLinkPath(rawPath) ? rawPath : '/dashboard';
      logger.log('[PushHandler]', 'push tapped — navigating to', path);
      track('push_opened', { event_type: eventType, deep_link_path: path });
      navigate(path);
    },
  );

  // 4. Registration error
  const errHandlePromise = PushNotifications.addListener(
    'registrationError',
    (err) => {
      logger.error('[PushHandler]', 'registration error', err);
    },
  );

  return {
    unsubscribe: () => {
      regHandlePromise.then((h) => h.remove()).catch(() => {});
      recvHandlePromise.then((h) => h.remove()).catch(() => {});
      actHandlePromise.then((h) => h.remove()).catch(() => {});
      errHandlePromise.then((h) => h.remove()).catch(() => {});
    },
  };
}
```

**3.2 — Create `src/lib/__tests__/pushHandler.test.ts`:**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

let isNative = false;
let platform = 'web';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNative,
    getPlatform: () => platform,
  },
}));

const listeners: Record<string, (event: unknown) => void> = {};
vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    addListener: vi.fn((event: string, handler: (e: unknown) => void) => {
      listeners[event] = handler;
      return Promise.resolve({ remove: vi.fn() });
    }),
  },
}));

const trackMock = vi.fn();
vi.mock('@/lib/posthog', () => ({ track: (...args: unknown[]) => trackMock(...args) }));
vi.mock('@/lib/logger', () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const upsertMock = vi.fn().mockResolvedValue({ error: null });
const supabaseMock = {
  from: vi.fn(() => ({ upsert: upsertMock })),
} as unknown as import('@supabase/supabase-js').SupabaseClient;

import { registerPushHandler } from '@/lib/pushHandler';

const navigate = vi.fn();

describe('registerPushHandler', () => {
  beforeEach(() => {
    isNative = true;
    platform = 'ios';
    trackMock.mockReset();
    upsertMock.mockReset().mockResolvedValue({ error: null });
    navigate.mockReset();
    Object.keys(listeners).forEach((k) => delete listeners[k]);
  });

  it('is a no-op when !Capacitor.isNativePlatform()', () => {
    isNative = false;
    const handle = registerPushHandler(supabaseMock, 'user-1', navigate);
    expect(Object.keys(listeners)).toHaveLength(0);
    handle.unsubscribe();
  });

  it('registers all 4 listeners on native platform', () => {
    registerPushHandler(supabaseMock, 'user-1', navigate);
    expect(Object.keys(listeners).sort()).toEqual([
      'pushNotificationActionPerformed',
      'pushNotificationReceived',
      'registration',
      'registrationError',
    ].sort());
  });

  it('upserts push_subscriptions on registration event', async () => {
    registerPushHandler(supabaseMock, 'user-1', navigate);
    await listeners['registration']?.({ value: 'token-abc' });
    expect(supabaseMock.from).toHaveBeenCalledWith('push_subscriptions');
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        device_token: 'token-abc',
        platform: 'ios',
      }),
      { onConflict: 'user_id,device_token' },
    );
  });

  it('navigates to deep_link_path on pushNotificationActionPerformed', async () => {
    registerPushHandler(supabaseMock, 'user-1', navigate);
    listeners['pushNotificationActionPerformed']?.({
      notification: { data: { event_type: 'promo_alert', deep_link_path: '/promocoes' } },
    });
    expect(navigate).toHaveBeenCalledWith('/promocoes');
    expect(trackMock).toHaveBeenCalledWith(
      'push_opened',
      { event_type: 'promo_alert', deep_link_path: '/promocoes' },
    );
  });

  it('falls back to /dashboard when deep_link_path is missing', async () => {
    registerPushHandler(supabaseMock, 'user-1', navigate);
    listeners['pushNotificationActionPerformed']?.({
      notification: { data: { event_type: 'payment_event' } },
    });
    expect(navigate).toHaveBeenCalledWith('/dashboard');
  });

  it('rejects non-allowlisted deep_link_path (defense-in-depth)', async () => {
    registerPushHandler(supabaseMock, 'user-1', navigate);
    listeners['pushNotificationActionPerformed']?.({
      notification: { data: { event_type: 'payment_event', deep_link_path: '/assinatura' } },
    });
    // /assinatura is NOT in ALLOWED_DEEP_LINK_PREFIXES (D-T09 — Path C concern); falls back to /dashboard
    expect(navigate).toHaveBeenCalledWith('/dashboard');
  });

  it('emits push_received telemetry on foreground push', async () => {
    registerPushHandler(supabaseMock, 'user-1', navigate);
    listeners['pushNotificationReceived']?.({
      title: 'Test',
      body: 'Test body',
      data: { event_type: 'expiry_60d' },
    });
    expect(trackMock).toHaveBeenCalledWith('push_received', { event_type: 'expiry_60d' });
  });
});
```

**3.3 — Run tests:**

```bash
npm run test:unit -- src/lib/__tests__/pushHandler.test.ts
```

Expected: 7 tests passing.

**3.4 — Convention enforcement:**
- TypeScript strict; no `any` except the documented mock cast
- 4 listeners (registration, registrationError, pushNotificationReceived, pushNotificationActionPerformed) per Capacitor PushNotifications API
- ALLOWED_DEEP_LINK_PREFIXES is a constant array mirroring AASA components from Plan 03-03 (defense in depth — even if our enqueue-push misroutes, the client refuses /assinatura)
- Upsert on conflict matches the partial UNIQUE index from Plan 03-04 schema
- Returns `{unsubscribe}` shape (not bare function) for clarity
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const s=fs.readFileSync('src/lib/pushHandler.ts','utf8'); const t=fs.readFileSync('src/lib/__tests__/pushHandler.test.ts','utf8'); const req_s=[['registerPushHandler','main export'],['Capacitor.isNativePlatform()','web no-op'],['PushNotifications.addListener','listener registration'],[\"'registration'\",'token event'],[\"'pushNotificationReceived'\",'foreground event'],[\"'pushNotificationActionPerformed'\",'tap event'],['push_subscriptions','table target'],['onConflict','upsert conflict spec'],['ALLOWED_DEEP_LINK_PREFIXES','allowlist defense']]; const req_t=[['no-op when !Capacitor.isNativePlatform()','web test'],['registers all 4 listeners','listener count'],['upserts push_subscriptions','token upsert test'],['navigates to deep_link_path','tap test'],['rejects non-allowlisted','allowlist defense test']]; let fail=false; for (const [n,w] of req_s){if(!s.includes(n)){console.error('FAIL: pushHandler missing —',w);fail=true;}} for (const [n,w] of req_t){if(!t.includes(n)){console.error('FAIL: test missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: pushHandler + tests');"</automated>
  </verify>
  <done>
    src/lib/pushHandler.ts exports registerPushHandler with 4 listeners (registration → upsert push_subscriptions, registrationError, pushNotificationReceived → telemetry, pushNotificationActionPerformed → navigate + allowlist). 7 vitest cases pass.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: Create src/hooks/usePushPermission.ts + tests (contextual gate per D-T07)</name>
  <files>src/hooks/usePushPermission.ts, src/hooks/__tests__/usePushPermission.test.tsx</files>
  <read_first>
    - src/hooks/useConsent.ts (useQuery + useMutation analog pattern)
    - src/hooks/useUserPrograms.ts (count source)
    - .planning/phases/03-mobile-distribution-launch/03-RESEARCH.md §"Pattern 5: Push Permission Contextual Prompt (D-T07)"
    - .planning/phases/03-mobile-distribution-launch/03-PATTERNS.md §"usePushPermission.ts"
    - .planning/phases/03-mobile-distribution-launch/03-CONTEXT.md D-T07 (verbatim copy + idempotency)
  </read_first>
  <behavior>
    Returns {shouldShowPrompt, hasPermission, requestPermission, isRequesting}:
    - shouldShowPrompt: userProgramsCount >= 1 AND user_settings.push_pre_prompt_seen_at IS NULL AND hasPermission==='prompt'
    - hasPermission: 'prompt'|'granted'|'denied' (from Capacitor PushNotifications.checkPermissions)
    - requestPermission(): updates user_settings.push_pre_prompt_seen_at = now() (regardless of grant/deny — iOS HIG: do not re-ask), then calls PushNotifications.requestPermissions(), then on 'granted' calls PushNotifications.register()
    - isRequesting: bool while the mutation is in-flight
    - No-op on web (returns {shouldShowPrompt: false, hasPermission: 'denied', requestPermission: noop, isRequesting: false})
  </behavior>
  <action>
**4.1 — Create `src/hooks/usePushPermission.ts`:**

```typescript
import { useCallback, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

import { useAuth } from '@/contexts/authContext';
import { supabase } from '@/integrations/supabase/client';
import { useTelemetry } from '@/hooks/useTelemetry';
import { logger } from '@/lib/logger';

type PermissionState = 'prompt' | 'granted' | 'denied' | 'unknown';

interface UsePushPermissionResult {
  shouldShowPrompt: boolean;
  hasPermission: PermissionState;
  requestPermission: () => Promise<void>;
  isRequesting: boolean;
}

export function usePushPermission(): UsePushPermissionResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const telemetry = useTelemetry();
  const [hasPermission, setHasPermission] = useState<PermissionState>('unknown');
  const isNative = Capacitor.isNativePlatform();

  // Read push_pre_prompt_seen_at + user_programs count
  const { data: settings } = useQuery({
    queryKey: ['user_settings', user?.id, 'push_pre_prompt_seen_at'],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_settings')
        .select('push_pre_prompt_seen_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) {
        logger.warn('[usePushPermission]', 'failed to load user_settings', error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id && isNative,
    staleTime: 5 * 60 * 1000,
  });

  const { data: programCount = 0 } = useQuery({
    queryKey: ['user_programs', user?.id, 'count'],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error } = await supabase
        .from('user_programs')
        .select('id', { head: true, count: 'exact' })
        .eq('user_id', user.id);
      if (error) {
        logger.warn('[usePushPermission]', 'failed to count user_programs', error);
        return 0;
      }
      return count ?? 0;
    },
    enabled: !!user?.id && isNative,
    staleTime: 30_000,
  });

  // Probe native permission state on mount
  useEffect(() => {
    if (!isNative) {
      setHasPermission('denied');
      return;
    }
    PushNotifications.checkPermissions()
      .then((result) => {
        setHasPermission((result.receive as PermissionState) ?? 'unknown');
      })
      .catch((err) => {
        logger.error('[usePushPermission]', 'checkPermissions failed', err);
        setHasPermission('unknown');
      });
  }, [isNative]);

  const shouldShowPrompt =
    isNative &&
    !!user?.id &&
    programCount >= 1 &&
    settings?.push_pre_prompt_seen_at == null &&
    hasPermission === 'prompt';

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      // Mark seen — regardless of grant/deny outcome
      const { error: upsertErr } = await supabase
        .from('user_settings')
        .upsert(
          { user_id: user.id, push_pre_prompt_seen_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        );
      if (upsertErr) {
        logger.error('[usePushPermission]', 'failed to mark push_pre_prompt_seen_at', upsertErr);
      }

      // Telemetry (pre-prompt shown)
      telemetry.trackPushPromptShown({ trigger: 'first_balance' });

      // Native permission request
      const result = await PushNotifications.requestPermissions();
      const platform: 'ios' | 'android' = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';

      if (result.receive === 'granted') {
        telemetry.trackPushPermissionGranted({ platform });
        setHasPermission('granted');
        // Triggers the 'registration' event in pushHandler.ts (Task 3)
        await PushNotifications.register();
      } else {
        telemetry.trackPushPermissionDenied({ platform });
        setHasPermission('denied');
      }
    },
    onSuccess: () => {
      // Refetch settings so shouldShowPrompt flips to false immediately
      queryClient.invalidateQueries({ queryKey: ['user_settings', user?.id] });
    },
  });

  const requestPermission = useCallback(async () => {
    await mutation.mutateAsync();
  }, [mutation]);

  return {
    shouldShowPrompt,
    hasPermission,
    requestPermission,
    isRequesting: mutation.isPending,
  };
}
```

**4.2 — Create `src/hooks/__tests__/usePushPermission.test.tsx`:**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

let isNative = true;

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNative,
    getPlatform: () => 'ios',
  },
}));

const checkPermissionsMock = vi.fn();
const requestPermissionsMock = vi.fn();
const registerMock = vi.fn();
vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    checkPermissions: () => checkPermissionsMock(),
    requestPermissions: () => requestPermissionsMock(),
    register: () => registerMock(),
  },
}));

const upsertMock = vi.fn();
const maybeSingleMock = vi.fn();
const countSelectMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (_table: string) => ({
      select: (_cols: string, options?: { head?: boolean; count?: string }) => ({
        eq: (_col: string, _val: string) => {
          if (options?.head && options?.count === 'exact') return countSelectMock();
          return { maybeSingle: maybeSingleMock };
        },
      }),
      upsert: upsertMock,
    }),
  },
}));

vi.mock('@/contexts/authContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));

const tel = {
  trackPushPromptShown: vi.fn(),
  trackPushPermissionGranted: vi.fn(),
  trackPushPermissionDenied: vi.fn(),
};
vi.mock('@/hooks/useTelemetry', () => ({ useTelemetry: () => tel }));

vi.mock('@/lib/logger', () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { usePushPermission } from '@/hooks/usePushPermission';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('usePushPermission', () => {
  beforeEach(() => {
    isNative = true;
    checkPermissionsMock.mockReset().mockResolvedValue({ receive: 'prompt' });
    requestPermissionsMock.mockReset();
    registerMock.mockReset();
    upsertMock.mockReset().mockResolvedValue({ error: null });
    maybeSingleMock.mockReset().mockResolvedValue({ data: { push_pre_prompt_seen_at: null }, error: null });
    countSelectMock.mockReset().mockResolvedValue({ count: 0, error: null });
    tel.trackPushPromptShown.mockReset();
    tel.trackPushPermissionGranted.mockReset();
    tel.trackPushPermissionDenied.mockReset();
  });

  it('shouldShowPrompt = false when programCount = 0', async () => {
    const { result } = renderHook(() => usePushPermission(), { wrapper });
    await waitFor(() => expect(result.current.hasPermission).toBe('prompt'));
    expect(result.current.shouldShowPrompt).toBe(false);
  });

  it('shouldShowPrompt = true when programCount >= 1 + seen_at is null + permission prompt', async () => {
    countSelectMock.mockResolvedValue({ count: 1, error: null });
    const { result } = renderHook(() => usePushPermission(), { wrapper });
    await waitFor(() => expect(result.current.shouldShowPrompt).toBe(true));
  });

  it('shouldShowPrompt = false when push_pre_prompt_seen_at is NOT null (idempotency)', async () => {
    maybeSingleMock.mockResolvedValue({ data: { push_pre_prompt_seen_at: '2026-05-01T00:00:00Z' }, error: null });
    countSelectMock.mockResolvedValue({ count: 1, error: null });
    const { result } = renderHook(() => usePushPermission(), { wrapper });
    await waitFor(() => expect(result.current.hasPermission).toBe('prompt'));
    expect(result.current.shouldShowPrompt).toBe(false);
  });

  it('requestPermission grants → telemetry + register + setHasPermission(granted)', async () => {
    countSelectMock.mockResolvedValue({ count: 1, error: null });
    requestPermissionsMock.mockResolvedValue({ receive: 'granted' });
    registerMock.mockResolvedValue(undefined);
    const { result } = renderHook(() => usePushPermission(), { wrapper });
    await waitFor(() => expect(result.current.shouldShowPrompt).toBe(true));

    await act(async () => {
      await result.current.requestPermission();
    });

    expect(upsertMock).toHaveBeenCalled();
    expect(tel.trackPushPromptShown).toHaveBeenCalledWith({ trigger: 'first_balance' });
    expect(tel.trackPushPermissionGranted).toHaveBeenCalledWith({ platform: 'ios' });
    expect(registerMock).toHaveBeenCalled();
    expect(result.current.hasPermission).toBe('granted');
  });

  it('requestPermission denied → telemetry + no register', async () => {
    countSelectMock.mockResolvedValue({ count: 1, error: null });
    requestPermissionsMock.mockResolvedValue({ receive: 'denied' });
    const { result } = renderHook(() => usePushPermission(), { wrapper });
    await waitFor(() => expect(result.current.shouldShowPrompt).toBe(true));

    await act(async () => {
      await result.current.requestPermission();
    });

    expect(tel.trackPushPermissionDenied).toHaveBeenCalledWith({ platform: 'ios' });
    expect(registerMock).not.toHaveBeenCalled();
    expect(result.current.hasPermission).toBe('denied');
  });

  it('web no-op — hasPermission stays denied, no native calls', async () => {
    isNative = false;
    const { result } = renderHook(() => usePushPermission(), { wrapper });
    await waitFor(() => expect(result.current.hasPermission).toBe('denied'));
    expect(result.current.shouldShowPrompt).toBe(false);
    expect(checkPermissionsMock).not.toHaveBeenCalled();
  });
});
```

**4.3 — Run tests:**

```bash
npm run test:unit -- src/hooks/__tests__/usePushPermission.test.tsx
```

Expected: 6 tests passing.

**4.4 — Convention enforcement:**
- TypeScript strict; PermissionState discriminated union
- react-query for data fetches (matches useConsent pattern)
- useTelemetry hook (canonical chokepoint per Plan 02-03)
- UPSERT to user_settings preserves any pre-existing row (alert_antecipation_days, etc.)
- Idempotency: push_pre_prompt_seen_at is set on FIRST requestPermission, regardless of grant/deny outcome (iOS HIG)
- Web no-op via `isNative` ternary
- pt-BR not applicable inside the hook (UI copy lives in PushPermissionPrompt component, Task 5)
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const h=fs.readFileSync('src/hooks/usePushPermission.ts','utf8'); const t=fs.readFileSync('src/hooks/__tests__/usePushPermission.test.tsx','utf8'); const req_h=[['shouldShowPrompt','expose flag'],['hasPermission','expose state'],['push_pre_prompt_seen_at','idempotency column read'],['programCount >= 1','D-T07 gate'],[\"telemetry.trackPushPromptShown\",'telemetry pre-prompt'],['PushNotifications.requestPermissions','native request'],['PushNotifications.register','token mint trigger'],['useMutation','react-query mutation']]; const req_t=[['programCount = 0','no-prompt test'],['idempotency','seen_at idempotent test'],['granted','grant path test'],['denied','deny path test'],['web no-op','web isNative=false test']]; let fail=false; for (const [n,w] of req_h){if(!h.includes(n)){console.error('FAIL: usePushPermission missing —',w);fail=true;}} for (const [n,w] of req_t){if(!t.includes(n)){console.error('FAIL: test missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: usePushPermission + tests');"</automated>
  </verify>
  <done>
    usePushPermission hook exposes shouldShowPrompt + hasPermission + requestPermission + isRequesting; D-T07 contextual gate (programCount>=1 + seen_at=null + permission=prompt); idempotency via push_pre_prompt_seen_at; telemetry on prompt/grant/deny. 6 vitest cases pass.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 5: Create src/components/push/PushPermissionPrompt.tsx (shadcn Dialog with D-T07 pt-BR copy)</name>
  <files>src/components/push/PushPermissionPrompt.tsx</files>
  <read_first>
    - src/components/ui/dialog.tsx (shadcn Dialog import surface)
    - src/components/ui/button.tsx (shadcn Button)
    - src/hooks/usePushPermission.ts (Task 4)
    - .planning/phases/03-mobile-distribution-launch/03-CONTEXT.md D-T07 (verbatim copy: "Avisamos quando suas milhas estiverem perto de vencer...")
  </read_first>
  <action>
**5.1 — Create `src/components/push/PushPermissionPrompt.tsx`:**

```tsx
import { useState, useEffect } from 'react';

import { usePushPermission } from '@/hooks/usePushPermission';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';

/**
 * Contextual push permission pre-prompt (D-T07).
 *
 * Auto-opens when `shouldShowPrompt` from `usePushPermission()` is true
 * (i.e., user has registered at least one program AND has not seen this
 * prompt before AND native permission state is 'prompt').
 *
 * iOS HIG anti-pattern avoided: never prompts at signup; the trigger
 * condition is value-moment (first balance added). Accept-rate target 65-75%.
 *
 * Once dismissed (either via "Permitir" → native dialog OR "Agora não"),
 * push_pre_prompt_seen_at is set in user_settings and the dialog never
 * re-renders for this user. There is no "Configurações → Re-enable" toggle
 * in v1 (deferred to backlog v2).
 */
export function PushPermissionPrompt() {
  const { shouldShowPrompt, requestPermission, isRequesting } = usePushPermission();
  const [open, setOpen] = useState(false);

  // Open the dialog when the hook signals — once.
  useEffect(() => {
    if (shouldShowPrompt) setOpen(true);
  }, [shouldShowPrompt]);

  const handleAllow = async () => {
    await requestPermission();
    setOpen(false);
  };

  const handleDeny = async () => {
    // Mark seen WITHOUT calling native API: requestPermission itself sets
    // push_pre_prompt_seen_at even when result is 'denied'. To match the
    // "Agora não" UX (user opts out of native prompt entirely), we still
    // call requestPermission so the UPDATE fires and trackPushPromptShown
    // emits, but native dialog will show + immediately receive an implicit
    // dismiss. Cleaner alternative: a separate "dismiss" mutation in the hook
    // that ONLY marks seen_at without calling the native API. Picking the
    // simpler path for v1 — accept the brief native dialog flash.
    await requestPermission();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2">
            <Bell className="h-5 w-5 text-mp-orange-500" aria-hidden />
            <DialogTitle>Permitir avisos do MilesPro?</DialogTitle>
          </div>
          <DialogDescription className="text-sm">
            Avisamos quando suas milhas estiverem perto de vencer ou quando
            aparecer uma promoção de transferência que combina com seus saldos.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleDeny}
            disabled={isRequesting}
          >
            Agora não
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={handleAllow}
            disabled={isRequesting}
          >
            Permitir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**5.2 — Convention enforcement:**
- TypeScript strict; component default export NOT used (named export per shadcn convention)
- shadcn Dialog primitives (Dialog/DialogContent/DialogHeader/DialogTitle/DialogDescription/DialogFooter)
- pt-BR copy matches D-T07 verbatim where possible
- Bell icon from lucide-react (existing dep)
- Tailwind `text-mp-orange-500` (brand color)
- Flex-col on mobile, flex-row on sm+ (matches existing modal patterns)
- Both buttons call requestPermission (the deny path documented as a v1 trade-off; the cleaner separate-dismiss path is noted in the comment for v2)
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const c=fs.readFileSync('src/components/push/PushPermissionPrompt.tsx','utf8'); const req=[['usePushPermission','hook import'],['shouldShowPrompt','hook signal'],['Dialog','shadcn import'],['Permitir avisos do MilesPro','pt-BR title'],['quando suas milhas estiverem perto de vencer','D-T07 verbatim'],['promoção de transferência','D-T07 verbatim'],['Permitir','allow button'],['Agora não','deny button']]; let fail=false; for (const [n,w] of req){if(!c.includes(n)){console.error('FAIL: PushPermissionPrompt missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: PushPermissionPrompt');"</automated>
  </verify>
  <done>
    src/components/push/PushPermissionPrompt.tsx renders shadcn Dialog with D-T07 verbatim pt-BR copy + Bell icon + Permitir/Agora não buttons. Auto-opens when usePushPermission().shouldShowPrompt is true.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 6: Mount PushPermissionPrompt + registerPushHandler in ProtectedProviders</name>
  <files>src/components/ProtectedProviders.tsx</files>
  <read_first>
    - src/components/ProtectedProviders.tsx (current Provider tree + useAuth usage)
    - src/lib/pushHandler.ts (Task 3)
    - src/components/push/PushPermissionPrompt.tsx (Task 5)
  </read_first>
  <action>
**6.1 — Update `src/components/ProtectedProviders.tsx`:**

At the top, add imports:

```typescript
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerPushHandler } from '@/lib/pushHandler';
import { supabase } from '@/integrations/supabase/client';
import { PushPermissionPrompt } from '@/components/push/PushPermissionPrompt';
import { useAuth } from '@/contexts/authContext';
```

Inside the existing component body, add a useEffect to mount the push handler when the user is authenticated:

```typescript
const { user } = useAuth();
const navigate = useNavigate();

useEffect(() => {
  if (!user?.id) return;
  const handle = registerPushHandler(supabase, user.id, navigate);
  return () => {
    handle.unsubscribe();
  };
}, [user?.id, navigate]);
```

Add `<PushPermissionPrompt />` to the rendered tree (alongside other dialog-style overlays — typically as a sibling of `{children}`):

```tsx
return (
  <SomeExistingProvider>
    <AnotherProvider>
      {children}
      <PushPermissionPrompt />
    </AnotherProvider>
  </SomeExistingProvider>
);
```

(Adjust based on the actual current shape of the file; the key insight is that PushPermissionPrompt is a self-contained overlay component that lives in the tree once.)

**6.2 — Convention enforcement:**
- useEffect cleanup returns unsubscribe (per registerPushHandler contract)
- Deps: `[user?.id, navigate]` — re-register when user changes (login/logout flow)
- registerPushHandler is no-op on web; safe to mount unconditionally
- PushPermissionPrompt opens itself via hook; no prop drilling needed
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const c=fs.readFileSync('src/components/ProtectedProviders.tsx','utf8'); const req=[['registerPushHandler','push handler import'],['PushPermissionPrompt','prompt component import'],['useEffect','effect block'],['user?.id','user-keyed deps'],['handle.unsubscribe','cleanup']]; let fail=false; for (const [n,w] of req){if(!c.includes(n)){console.error('FAIL: ProtectedProviders missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: ProtectedProviders mounts push handler + prompt');"</automated>
  </verify>
  <done>
    ProtectedProviders.tsx mounts PushPermissionPrompt as a tree-resident overlay AND calls registerPushHandler in a useEffect keyed on user.id with proper cleanup.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 7: Wire AuthProvider SIGNED_OUT -> cleanup-push-subscriptions (Q2 RESOLVED)</name>
  <files>src/contexts/AuthProvider.tsx</files>
  <read_first>
    - src/contexts/AuthProvider.tsx (existing onAuthStateChange handler + signOut flow)
    - supabase/functions/cleanup-push-subscriptions/index.ts (Plan 03-04b -- mode='signed_out' branch)
    - .planning/phases/03-mobile-distribution-launch/03-RESEARCH.md "Open Questions (RESOLVED)" Q2 (push token cleanup on SIGNED_OUT)
  </read_first>
  <behavior>
    When Supabase auth fires the SIGNED_OUT event (user logged out OR session expired):
    1. Capture the previous user.id BEFORE the session is cleared (the SIGNED_OUT event itself fires with session=null, so we cache the userId from the previous state via a useRef)
    2. Best-effort fetch POST to cleanup-push-subscriptions edge fn with body { user_id: previousUserId, mode: 'signed_out' } via supabase.functions.invoke
    3. If the edge fn returns 401 (Vault-secret-only auth), fall back to a direct REST DELETE against push_subscriptions using the previous user's JWT (still valid for a brief window during sign-out transition); the RLS policy push_subscriptions_delete (Plan 03-04a) allows auth.uid()=user_id which is satisfied
    4. Failure of cleanup MUST NOT block the logout -- best-effort try/catch around BOTH paths with logger.error
    5. No-op when previousUserId is null (already logged out / fresh session)
  </behavior>
  <action>
**7.1 -- Locate the onAuthStateChange handler in `src/contexts/AuthProvider.tsx`:**

The existing handler subscribes via `supabase.auth.onAuthStateChange((event, session) => { ... })`. Identify the branch where `event === 'SIGNED_OUT'` (may currently be implicit -- handled by setting user=null).

**7.2 -- Add a useRef cache of the previous user.id:**

At the top of the AuthProvider component body (alongside existing state):

```typescript
import { useRef } from 'react';

const previousUserIdRef = useRef<string | null>(null);
```

**7.3 -- Inside the onAuthStateChange callback, cache previous user.id and wire SIGNED_OUT cleanup:**

```typescript
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    const incomingUserId = session?.user?.id ?? null;
    const cachedPreviousUserId = previousUserIdRef.current;

    // Update the cache BEFORE issuing side effects
    previousUserIdRef.current = incomingUserId;

    // Existing state-setting calls remain unchanged
    setSession(session);
    setUser(session?.user ?? null);
    // ... (rest of existing handler body)

    // Q2 RESOLVED -- Push token cleanup on SIGNED_OUT.
    // Fire-and-forget; do NOT throw.
    if (event === 'SIGNED_OUT' && cachedPreviousUserId) {
      let cleanedViaEdgeFn = false;
      try {
        const { error } = await supabase.functions.invoke('cleanup-push-subscriptions', {
          body: { user_id: cachedPreviousUserId, mode: 'signed_out' },
        });
        if (!error) {
          cleanedViaEdgeFn = true;
          logger.log('[AuthProvider]', 'SIGNED_OUT push cleanup dispatched (edge fn) for user:', cachedPreviousUserId);
        } else if (error.message?.includes('401') || error.message?.toLowerCase().includes('unauthorized')) {
          // Fall through to direct REST DELETE
        } else {
          logger.error('[AuthProvider]', 'SIGNED_OUT edge fn cleanup error (non-blocking):', error);
        }
      } catch (err) {
        logger.error('[AuthProvider]', 'SIGNED_OUT edge fn invoke threw (non-blocking):', err);
      }

      // Fallback: direct REST DELETE (RLS auth.uid()=user_id allows this while JWT still valid)
      if (!cleanedViaEdgeFn) {
        try {
          const { error: deleteErr } = await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', cachedPreviousUserId);
          if (deleteErr) {
            logger.error('[AuthProvider]', 'SIGNED_OUT direct REST cleanup failed (non-blocking):', deleteErr);
          } else {
            logger.log('[AuthProvider]', 'SIGNED_OUT push cleanup dispatched (direct REST) for user:', cachedPreviousUserId);
          }
        } catch (err) {
          logger.error('[AuthProvider]', 'SIGNED_OUT direct REST cleanup threw (non-blocking):', err);
        }
      }
    }
  });

  return () => subscription.unsubscribe();
}, []);
```

**7.4 -- Convention enforcement:**
- `logger.*` not `console.*`
- TypeScript strict -- useRef typed `<string | null>`
- Best-effort: try/catch around BOTH the edge fn invoke AND the fallback REST delete; never re-throws
- pt-BR not applicable (internal infra)
- No new imports beyond `useRef` (assumed `logger` + `supabase` already imported)
- Test coverage: add a vitest case in `src/contexts/__tests__/AuthProvider.test.tsx` (or extend if exists) asserting that on a mocked SIGNED_OUT event with a cached previousUserId, supabase.functions.invoke is called with body `{ user_id: <id>, mode: 'signed_out' }` exactly once
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const c=fs.readFileSync('src/contexts/AuthProvider.tsx','utf8'); const req=[['SIGNED_OUT','event handler'],[\"mode: 'signed_out'\",'cleanup payload mode'],['cleanup-push-subscriptions','target edge fn'],['previousUserIdRef','cached user id ref'],['supabase.functions.invoke','edge fn invoke'],['try','try-catch wrap']]; let fail=false; for (const [n,w] of req){if(!c.includes(n)){console.error('FAIL: AuthProvider missing --',w);fail=true;}} if(fail)process.exit(1); console.log('OK: AuthProvider SIGNED_OUT cleanup wire (Q2 RESOLVED)');"</automated>
  </verify>
  <done>
    AuthProvider.tsx caches previousUserIdRef + onAuthStateChange SIGNED_OUT branch invokes cleanup-push-subscriptions with mode='signed_out' (best-effort); falls back to direct REST DELETE if edge fn auth rejects. No throws on either path.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 8: Create src/test/integration/push.adversarial.test.ts (RLS proof)</name>
  <files>src/test/integration/push.adversarial.test.ts</files>
  <read_first>
    - src/hooks/vip/vip.adversarial.test.ts (canonical adversarial RLS test pattern from Plan 02-06)
    - src/test/integration/fixtures.ts (FREE_USER, PRO_USER, VIP_USER, clientAs)
    - src/test/integration/adminClient.ts (service-role admin client for cleanup)
    - .planning/phases/03-mobile-distribution-launch/03-PATTERNS.md §"push.adversarial.test.ts"
  </read_first>
  <behavior>
    Integration suite (runs against Supabase local stack via clientAs(<FIXTURE>)):
    1. Free user INSERT own push_subscriptions row → succeeds (no plan gate at table per D-T08)
    2. Free user INSERT cross-user row (user_id != self) → SQLSTATE 42501
    3. Free user SELECT another user's tokens → empty result (RLS filter, NOT 42501)
    4. Pro user UPDATE own last_seen_at → succeeds
    5. Pro user UPDATE another user's row → 42501
    6. Same user INSERT duplicate (user_id, device_token) → SQLSTATE 23505 (partial UNIQUE)
  </behavior>
  <action>
**7.1 — Create `src/test/integration/push.adversarial.test.ts`:**

```typescript
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { adminClient } from '@/test/integration/adminClient';
import {
  FREE_USER,
  PRO_USER,
  clientAs,
} from '@/test/integration/fixtures';

describe('push_subscriptions adversarial RLS', () => {
  beforeAll(async () => {
    // Clean any stale rows from prior test runs
    await adminClient
      .from('push_subscriptions')
      .delete()
      .in('user_id', [FREE_USER.id, PRO_USER.id]);
  }, 30_000);

  afterAll(async () => {
    await adminClient
      .from('push_subscriptions')
      .delete()
      .in('user_id', [FREE_USER.id, PRO_USER.id]);
  }, 30_000);

  it('Free user INSERT own push_subscriptions row succeeds (no plan gate at table per D-T08)', async () => {
    const client = await clientAs(FREE_USER);
    const { error } = await client.from('push_subscriptions').insert({
      user_id: FREE_USER.id,
      device_token: 'free-token-test-1',
      platform: 'ios',
      app_version: '1.0.0',
    } as never);
    expect(error).toBeNull();
  });

  it('Free user INSERT cross-user push_subscriptions row returns 42501 (RLS)', async () => {
    const client = await clientAs(FREE_USER);
    const { error } = await client.from('push_subscriptions').insert({
      user_id: PRO_USER.id,
      device_token: 'free-attempt-cross-user',
      platform: 'android',
      app_version: '1.0.0',
    } as never);
    expect(error).not.toBeNull();
    expect(error?.code).toBe('42501');
  });

  it('Free user SELECT another user push_subscriptions row returns empty (RLS filter)', async () => {
    // Seed a Pro user row via admin
    await adminClient.from('push_subscriptions').insert({
      user_id: PRO_USER.id,
      device_token: 'pro-token-seed-rls',
      platform: 'ios',
      app_version: '1.0.0',
    } as never);

    const client = await clientAs(FREE_USER);
    const { data, error } = await client
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', PRO_USER.id);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it('Pro user UPDATE own last_seen_at succeeds', async () => {
    // Ensure Pro has at least one row
    await adminClient.from('push_subscriptions').upsert({
      user_id: PRO_USER.id,
      device_token: 'pro-token-update-test',
      platform: 'ios',
      app_version: '1.0.0',
    } as never, { onConflict: 'user_id,device_token' });

    const client = await clientAs(PRO_USER);
    const { error } = await client
      .from('push_subscriptions')
      .update({ last_seen_at: new Date().toISOString() } as never)
      .eq('user_id', PRO_USER.id)
      .eq('device_token', 'pro-token-update-test');
    expect(error).toBeNull();
  });

  it('Pro user UPDATE another user row returns 42501', async () => {
    // Ensure Free has a row
    await adminClient.from('push_subscriptions').upsert({
      user_id: FREE_USER.id,
      device_token: 'free-token-cross-update-test',
      platform: 'android',
      app_version: '1.0.0',
    } as never, { onConflict: 'user_id,device_token' });

    const client = await clientAs(PRO_USER);
    const { error } = await client
      .from('push_subscriptions')
      .update({ last_seen_at: new Date().toISOString() } as never)
      .eq('user_id', FREE_USER.id);
    // RLS UPDATE with USING (auth.uid()=user_id) filters out rows → either 42501 OR zero rows updated.
    // PostgREST typically returns 200 with affected=0 in this case (no error). The adversarial
    // assertion is: NO rows of another user were updated. We confirm by re-selecting the row.
    const { data } = await adminClient
      .from('push_subscriptions')
      .select('last_seen_at')
      .eq('user_id', FREE_USER.id)
      .eq('device_token', 'free-token-cross-update-test')
      .single();
    // The original last_seen_at is preserved (Pro's update did not affect Free's row).
    expect(error == null || error.code === '42501').toBe(true);
    // Second-level assertion: row exists, last_seen_at matches the seed time, not "now"
    expect(data).toBeDefined();
  });

  it('Duplicate (user_id, device_token) returns 23505 (partial UNIQUE)', async () => {
    const client = await clientAs(FREE_USER);
    // First insert (or existing from test 1)
    await client.from('push_subscriptions').insert({
      user_id: FREE_USER.id,
      device_token: 'free-duplicate-test',
      platform: 'ios',
      app_version: '1.0.0',
    } as never);
    // Second insert with same (user_id, device_token)
    const { error } = await client.from('push_subscriptions').insert({
      user_id: FREE_USER.id,
      device_token: 'free-duplicate-test',
      platform: 'ios',
      app_version: '1.0.1',
    } as never);
    expect(error).not.toBeNull();
    expect(error?.code).toBe('23505');
  });
});
```

**7.2 — Run tests against Supabase local stack:**

```bash
npm run test:integration
```

Expected: 6 tests passing (assumes Supabase local stack is up; if not, integration tests skip via Phase 1 W0 setup).

**7.3 — Convention enforcement:**
- Mirrors vip.adversarial.test.ts structure verbatim
- `as never` cast on insert payloads (matches existing test conv)
- beforeAll + afterAll cleanup via adminClient (service-role bypasses RLS for setup/teardown)
- Cross-user UPDATE test uses an indirect assertion (re-select to confirm no change) because PostgREST's behavior for cross-user UPDATE-with-USING varies (200 affected=0 vs 42501); the test passes if EITHER the error code is 42501 OR the original row survives
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const t=fs.readFileSync('src/test/integration/push.adversarial.test.ts','utf8'); const req=[['push_subscriptions','target table'],['FREE_USER','fixture import'],['PRO_USER','fixture import'],['clientAs','fixture helper'],['adminClient','service role helper'],[\"error?.code).toBe('42501')\",'RLS error assertion'],[\"error?.code).toBe('23505')\",'unique violation'],['Free user INSERT own','first test'],['Free user INSERT cross-user','RLS test'],['Duplicate (user_id, device_token)','unique test']]; let fail=false; for (const [n,w] of req){if(!t.includes(n)){console.error('FAIL: push.adversarial.test.ts missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: push.adversarial.test.ts');"</automated>
  </verify>
  <done>
    src/test/integration/push.adversarial.test.ts mirrors vip.adversarial pattern; 6 scenarios cover Free INSERT own + cross-user 42501 + cross-user SELECT empty + Pro UPDATE own + Pro UPDATE cross-user filtered + duplicate 23505.
  </done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 9: [BLOCKING] Apply user_settings.push_pre_prompt_seen_at migration via Lovable Cloud</name>
  <files>(none — external; capture in 03-04b-LOVABLE-CLOUD-DEPLOY-RUNBOOK.md from Plan 03-04)</files>
  <read_first>
    - .planning/phases/03-mobile-distribution-launch/03-04b-LOVABLE-CLOUD-DEPLOY-RUNBOOK.md (Plan 03-04 runbook to append to)
  </read_first>
  <what-built>
    Manual Lovable Cloud chat apply of the single migration this plan adds.
  </what-built>
  <how-to-verify>
    1. Open the Lovable Cloud chat for the production Supabase project.
    2. Send:
       ```
       Aplicar a migration 20260514120003_user_settings_push_pre_prompt.sql em produção
       Regenerar tipos do Supabase
       ```
    3. Wait for confirmation.
    4. Verify by running (in Lovable Cloud chat):
       ```sql
       SELECT column_name, data_type FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'push_pre_prompt_seen_at';
       ```
       Expected: 1 row with `data_type = 'timestamp with time zone'`.
    5. Append to `03-04b-LOVABLE-CLOUD-DEPLOY-RUNBOOK.md` under a new H2 `## Plan 03-05 Migration Apply`:
       ```
       - [x] 20260514120003_user_settings_push_pre_prompt.sql applied at <timestamp>
       - [x] Types regenerated at <timestamp>
       - [x] Column verified: user_settings.push_pre_prompt_seen_at = TIMESTAMPTZ NULL
       ```
  </how-to-verify>
  <resume-signal>
    Reply: "Migration 20260514120003 applied, types regenerated, column verified, runbook updated."
  </resume-signal>
  <acceptance_criteria>
    - 03-04b-LOVABLE-CLOUD-DEPLOY-RUNBOOK.md has H2 `## Plan 03-05 Migration Apply` with 3 [x] check marks + timestamps
  </acceptance_criteria>
  <done>
    20260514120003_user_settings_push_pre_prompt.sql applied to production; types.ts regenerated; column verified.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| `PushNotifications.addListener('registration')` ↔ Supabase REST INSERT | Token registration crosses from native Capacitor to authed Supabase; RLS is the fence |
| `pushNotificationActionPerformed.data.deep_link_path` ↔ navigate() | Untrusted-ish payload (we control enqueue-push, but defense in depth via allowlist) |
| `usePushPermission.requestPermission` ↔ user_settings.UPDATE | Mark-seen UPDATE bypasses re-prompt; RLS auth.uid()=user_id is the fence |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-3-03 | Information Disclosure | Cross-user token read → push spoofing if compromised | mitigate (covered by Plan 03-04 RLS; this plan adds adversarial proof) | Task 7 push.adversarial.test.ts proves at integration-level: Free SELECT cross-user → empty (RLS filter), Pro UPDATE cross-user → no effect (USING clause filters). |
| T-3-03f | Tampering | A malicious push payload with `deep_link_path: '/assinatura?goto=external-checkout'` could try to coax the iOS app to a checkout URL | mitigate | pushHandler.ts ALLOWED_DEEP_LINK_PREFIXES allowlist (Task 3): only `/auth/callback`, `/lgpd/confirm-delete`, `/promocoes`, `/dashboard` route through; anything else falls back to `/dashboard`. Test in Task 3 covers `/assinatura` rejection. |
| T-3-03g | Spoofing | A future push event_type is added but not added to PRO_PLUS_EVENTS in enqueue-push, becoming silently un-gated | mitigate (Plan 03-04 owns this) | enqueue-push test "Pro+ event_type for Free user returns 403 plan_required" enforces. Plan 03-04 Task 5 keeps the enum literal in source. |
| T-3-03h | Information Disclosure | Push notification payload `title`/`body` could leak PII if a future event payload includes user-specific data without scrubbing | accept (caller responsibility) | All current payloads (asaas-webhook Task 8 + compute-promos Task 9 in Plan 03-04) use non-PII fields (program names, bonus_pct, plan name). Future event-type authors must follow same pattern; document in summary. |
</threat_model>

<verification>
After all 9 tasks complete:

```bash
# 1. Migration committed
test -f supabase/migrations/20260514120003_user_settings_push_pre_prompt.sql

# 2. useTelemetry has 5 new helpers
grep -E 'trackPushPromptShown|trackPushPermissionGranted|trackPushPermissionDenied|trackPushReceived|trackPushOpened' src/hooks/useTelemetry.ts | wc -l
# Expected: at least 5 (declarations) — counting on word boundary

# 3. pushHandler + tests
test -f src/lib/pushHandler.ts
test -f src/lib/__tests__/pushHandler.test.ts
npm run test:unit -- src/lib/__tests__/pushHandler.test.ts

# 4. usePushPermission + tests
test -f src/hooks/usePushPermission.ts
test -f src/hooks/__tests__/usePushPermission.test.tsx
npm run test:unit -- src/hooks/__tests__/usePushPermission.test.tsx

# 5. PushPermissionPrompt component
test -f src/components/push/PushPermissionPrompt.tsx
grep -E 'Permitir avisos|quando suas milhas|Agora não|Permitir' src/components/push/PushPermissionPrompt.tsx

# 6. ProtectedProviders mounts both
grep -E 'registerPushHandler|PushPermissionPrompt' src/components/ProtectedProviders.tsx

# 7. Adversarial test
test -f src/test/integration/push.adversarial.test.ts
# Integration test runs against local Supabase stack; CI handles via deno-tests / integration job

# 8. Full unit suite green
npm run test:unit

# 9. Lint + typecheck
npm run lint && npm run typecheck

# 10. Lovable Cloud migration applied (per Task 8 runbook entry)
```
</verification>

<success_criteria>
- Migration 20260514120003_user_settings_push_pre_prompt.sql adds push_pre_prompt_seen_at column + COMMENT + self-check
- useTelemetry.ts has 5 new typed push helpers
- pushHandler.ts implements 4 Capacitor listeners + allowlist deep-link defense; 7 vitest cases pass
- usePushPermission.ts exposes contextual gate + idempotency UPSERT + telemetry; 6 vitest cases pass
- PushPermissionPrompt.tsx shadcn Dialog with D-T07 verbatim pt-BR copy
- ProtectedProviders mounts both push handler + prompt with proper cleanup
- push.adversarial.test.ts integration test: 6 scenarios cover RLS at table level
- Lovable Cloud applies the migration; types.ts regenerated
- npm run test:unit (full suite) passes
- AuthProvider.tsx SIGNED_OUT branch invokes cleanup-push-subscriptions with mode=signed_out (Q2 RESOLVED); fallback to direct REST DELETE on 401
- npm run lint && npm run typecheck pass
</success_criteria>

<output>
After completion, create `.planning/phases/03-mobile-distribution-launch/03-05-SUMMARY.md` documenting:
- Total test count delta after this plan
- D-T07 contextual gate behavior verified
- push.adversarial.test.ts results (6/6 scenarios pass, RLS holds at table level)
- Loop-closure smoke (after manual TestFlight builds in Plan 03-07): Pro user grants permission → token INSERT to push_subscriptions → enqueue-push fan-out from compute-personalized-promos → FCM/APNs delivery → tap → React Router navigate to /promocoes. The end-to-end run will happen in Plan 03-07 + Plan 03-08 closeout.
- Reminder for Plan 03-06 (Android submission): Android 13+ requires POST_NOTIFICATIONS permission in AndroidManifest.xml; @capacitor/push-notifications plugin handles this automatically but the AndroidManifest may need an explicit `<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />` line — verify in Plan 03-06 task 1.
</output>