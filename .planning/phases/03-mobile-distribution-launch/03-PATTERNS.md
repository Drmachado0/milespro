# Phase 3: Mobile Distribution & Launch — Pattern Map

**Mapped:** 2026-05-13
**Files analyzed:** 27 (15 new, 12 modified)
**Analogs found:** 24 / 27 (3 with no direct codebase analog — AASA, assetlinks, FCM service-account)

---

## File Classification

### NEW files

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `public/.well-known/apple-app-site-association` | config (static asset) | HTTP GET (CDN) | none (greenfield — payload-only JSON) | research-only |
| `public/.well-known/assetlinks.json` | config (static asset) | HTTP GET (CDN) | none (greenfield) | research-only |
| `firebase/service-account.json` (gitignored) | secret (Vault payload) | n/a (loaded into Vault) | `apple_signin_secret` / `LGPD_DELETE_TOKEN_SECRET` env pattern | partial |
| `ios/App/App/GoogleService-Info.plist` | config (cap-sync target) | iOS build asset | existing `Info.plist` location | role-match |
| `android/app/google-services.json` | config (cap-sync target) | Android build asset | existing `android/app/build.gradle:48-54` try-apply | exact (pre-wired) |
| `resources/icon.png`, `resources/splash.png` | build artifact (master images) | `@capacitor/assets` input | `public/pwa-{192,512}.png` (current PWA icons) | partial |
| `scripts/check-ios-strings.sh` | utility (CI gate) | shell `strings | grep` | none in repo today (NEW CI surface) | research-only |
| `src/pages/AuthCallback.tsx` | page (route component) | request-response (PKCE exchange) | `src/pages/LgpdConfirmDelete.tsx` | exact |
| `src/lib/deepLinkHandler.ts` | utility (chokepoint) | event-driven (`appUrlOpen` listener) | `src/lib/sentry.ts` (init-once + module-level helper) | role-match |
| `src/hooks/useAppleSignIn.ts` | hook | request-response (OAuth) | `Auth.tsx:75-101` (handleGoogleSignIn) + `useIsIOSCapacitor` | exact |
| `src/hooks/usePushPermission.ts` | hook | event-driven (permission prompt) | `useConsent.ts` (state + mutate pattern) | role-match |
| `src/lib/pushHandler.ts` | utility (chokepoint) | event-driven (Capacitor listener) | `src/lib/sentry.ts` initSentry + `src/lib/posthog.ts` initPosthog | role-match |
| `supabase/migrations/<ts>_create_push_subscriptions.sql` | migration (table + RLS) | DDL | `20260515120003_user_promo_alerts.sql` | exact |
| `supabase/migrations/<ts>_schedule_cleanup_push_cron.sql` | migration (pg_cron) | DDL | `20260515120004_schedule_compute_personalized_promos_cron.sql` | exact |
| `supabase/functions/_shared/timingSafeEq.ts` | utility (Deno shared) | pure function | `supabase/functions/_shared/crypto.ts` (export-style module) | exact |
| `supabase/functions/_shared/fcmSignJWT.ts` | utility (Deno shared) | pure function (JWT sign) | `supabase/functions/google-calendar-auth/index.ts:50-86` HMAC sign + verify | role-match |
| `supabase/functions/enqueue-push/index.ts` | edge function | JWT-authed, RPC has_plan, INSERT lookup | `create-managed-account/index.ts:41-80` (JWT + has_plan gate) | exact |
| `supabase/functions/send-push-notification/index.ts` | edge function | Bearer-authed, outbound HTTP (FCM v1) | `compute-personalized-promos/index.ts:104-119` (Bearer auth + service role) | exact |
| `supabase/functions/cleanup-push-subscriptions/index.ts` | edge function | Bearer-authed, DELETE rows | `lgpd-delete-cleanup/index.ts:144-296` (Bearer + service-role + bulk delete) | exact |
| `src/test/integration/push.adversarial.test.ts` | test (RLS adversarial) | integration | `src/hooks/vip/vip.adversarial.test.ts` | exact |

### MODIFIED files

| Modified File | Role | Change Type | Reference Pattern |
|---------------|------|-------------|-------------------|
| `capacitor.config.ts` | config | full rewrite (appId, appName, remove server.url, add deep-link scheme) | self (D-T01/T02) |
| `vercel.json` | config | extend `headers` rule | self lines 11-19 |
| `src/pages/Auth.tsx` | page | line 89 redirectTo + add Apple Sign-In button | self (Google handler 75-101) |
| `src/contexts/AuthProvider.tsx` | provider | line 61 emailRedirectTo + returnTo consumption | self |
| `src/App.tsx` | bootstrap | add `/auth/callback` route + appUrlOpen listener useEffect | self (PostHog pageview 110-117) |
| `src/hooks/useTelemetry.ts` | hook | add 4-5 push helpers | self (existing 12 helpers) |
| `src/lib/sentry.ts` | utility | optional `@sentry/capacitor` (deferred per research) | self |
| `supabase/functions/asaas-webhook/index.ts` | edge function | downgrade path fanout to cleanup-push + replace local constantTimeEq with `_shared/timingSafeEq.ts` | self |
| `supabase/functions/compute-personalized-promos/index.ts` | edge function | fanout to enqueue-push per inserted alert + replace constantTimeEq | self |
| `ios/App/App/Info.plist` | config | `CFBundleDisplayName`, associated-domains entitlement, `NSUserNotificationsUsageDescription` rewrite | self |
| `android/app/build.gradle` | config | `applicationId`, `targetSdk=35`, `minSdk` | self lines 3-18 |
| `android/app/src/main/AndroidManifest.xml` | config | intent-filter for App Links + assetlinks autoVerify | self |

---

## Pattern Assignments

### `src/pages/AuthCallback.tsx` (page, request-response)

**Analog:** `src/pages/LgpdConfirmDelete.tsx`

**Reason:** Both are deep-link landing pages that (a) read a query param on mount, (b) invoke a Supabase auth/edge call, (c) render 3 states (loading / success / error), (d) use `LandingHeader` + shadcn `Button`. AuthCallback differs only in that it calls `supabase.auth.exchangeCodeForSession(code)` instead of invoking the lgpd-delete function, and navigates to a `returnTo` path on success instead of showing a confirmation card.

**Imports + State machine pattern** (`LgpdConfirmDelete.tsx:16-44`):

```typescript
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { logger } from '@/lib/logger';

type State =
  | { status: 'loading' }
  | { status: 'confirmed'; hardDeleteAfter: string }
  | { status: 'error'; reason: string };
```

**Core effect pattern** (`LgpdConfirmDelete.tsx:41-88`):

```typescript
useEffect(() => {
  let cancelled = false;
  async function run() {
    if (!token) {
      setState({ status: 'error', reason: 'Link inválido (token ausente).' });
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke<ConfirmResponse>(
        'lgpd-delete',
        { body: { action: 'confirm', token }, method: 'POST' },
      );
      if (cancelled) return;
      // ... 3-state setState branches
    } catch (err) {
      if (cancelled) return;
      logger.warn('[LgpdConfirmDelete] unexpected error', err);
      setState({ status: 'error', reason: 'Erro inesperado...' });
    }
  }
  run();
  return () => { cancelled = true; };
}, [token]);
```

**Deviation needed for AuthCallback:**
- Replace `supabase.functions.invoke('lgpd-delete', ...)` with `supabase.auth.exchangeCodeForSession(searchParams.get('code') ?? '')`.
- On success, read `sessionStorage.getItem('returnTo')`, remove it, and `navigate(returnTo ?? '/dashboard')` via `useNavigate()` (instead of rendering a card).
- Error state copy should reference OAuth callback flow (expired/invalid code) not deletion.

---

### `src/lib/deepLinkHandler.ts` (utility, event-driven chokepoint)

**Analog:** `src/lib/sentry.ts` (init-once module pattern)

**Reason:** Both are module-level utilities loaded at app boot. `sentry.ts` exports `initSentry()` called from `main.tsx:9`; `deepLinkHandler.ts` will export `initDeepLinkHandler()` called from `App.tsx` `useEffect` per CONTEXT D-T12. Both have a "one-shot at boot + module-level helpers" shape. Push handler follows the same pattern.

**Init-once + module-level helpers** (`src/lib/sentry.ts:61-93`):

```typescript
export function initSentry(): void {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    // ...
  });
}

export function identifyUser(userId: string): void { Sentry.setUser({ id: userId }); }
export function clearUser(): void { Sentry.setUser(null); }
```

**`initialized` guard pattern** (`src/lib/posthog.ts:23-38`):

```typescript
let initialized = false;

export function initPosthog(): void {
  if (initialized) return;
  if (!API_KEY) {
    logger.warn('[Posthog] No API key — analytics disabled');
    return;
  }
  // ...
  initialized = true;
}
```

**Deviation needed for deepLinkHandler:**
- `init` body calls `App.addListener('appUrlOpen', ...)` from `@capacitor/app`, NOT `Sentry.init`.
- Listener handler strips origin: `url.replace('https://app.milespro.net.br', '')` → relative path.
- If user is not authenticated AND path !== `/auth/callback`, write `sessionStorage.setItem('returnTo', path)` and navigate to `/auth`; otherwise pass the path to `navigate()`. Navigation must come from a `useNavigate()` instance — pass it in as an arg (`initDeepLinkHandler(navigate)`) since the module itself can't use hooks.
- Add `if (!Capacitor.isNativePlatform()) return;` short-circuit at the top to make the helper safe to call from `App.tsx` on web builds.

---

### `src/hooks/useAppleSignIn.ts` (hook, request-response)

**Analog:** `src/pages/Auth.tsx` lines 75-101 (`handleGoogleSignIn`) + `src/hooks/useIsIOSCapacitor.ts`

**Reason:** Apple Sign-In is the iOS-only mirror of the existing Google OAuth handler. Path C requires the button to be visible only on iOS Capacitor, so it must be gated by `useIsIOSCapacitor()`. The shape of `signInWithOAuth({ provider, options: { redirectTo } })` is identical between Google and Apple.

**OAuth handler pattern** (`Auth.tsx:75-101`):

```typescript
const handleGoogleSignIn = async () => {
  if (!isOnline) {
    toast({
      title: 'Sem conexão',
      description: 'Verifique sua conexão com a internet e tente novamente.',
      variant: 'destructive',
    });
    return;
  }

  setIsGoogleLoading(true);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard`,
    },
  });

  if (error) {
    setIsGoogleLoading(false);
    toast({
      title: 'Erro',
      description: 'Não foi possível conectar com o Google. Tente novamente.',
      variant: 'destructive',
    });
  }
};
```

**iOS gate canonical pattern** (`src/hooks/useIsIOSCapacitor.ts:32-41`):

```typescript
export function isIOSCapacitor(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

export function useIsIOSCapacitor(): boolean {
  return isIOSCapacitor();
}
```

**Deviation needed for useAppleSignIn:**
- Provider `'apple'` instead of `'google'`.
- `redirectTo` MUST be `${origin}/auth/callback` (D-T09 — also the change for handleGoogleSignIn in `Auth.tsx:89` rewrite).
- Hook exposes `{ signInWithApple, isLoading, isAvailable }`. `isAvailable = useIsIOSCapacitor()`.
- The Auth.tsx button render must be gated: `{isAvailable && <Button onClick={signInWithApple}>Continuar com Apple</Button>}`. **Note for G-CRIT-03:** the button text "Continuar com Apple" is fine — no pricing-related string. Same render rule as the Google button.

---

### `src/hooks/usePushPermission.ts` (hook, event-driven)

**Analog:** `src/hooks/useConsent.ts` (consent flag + mutate pattern)

**Reason:** Both hooks wrap a permission/consent state, expose a flag (`needsConsent` vs. `needsPermission`), and a setter (`saveConsent` vs. `requestPermission`). Both check `useAuth().user` and gate behavior server-side.

**Hook shape with useQuery + useMutation** (`useConsent.ts:43-77`):

```typescript
export interface UseConsentResult {
  consent: Consent | null;
  isLoading: boolean;
  needsConsent: boolean;
  analyticsOptedIn: boolean;
  marketingOptedIn: boolean;
  saveConsent: (input: ConsentInput) => void;
  isSaving: boolean;
}

export function useConsent(): UseConsentResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: consent, isLoading } = useQuery<Consent | null>({
    queryKey: ['user_consent', user?.id, CURRENT_CONSENT_VERSION],
    queryFn: async () => { /* ... */ },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
```

**Deviation needed for usePushPermission:**
- `useQuery` reads from `push_subscriptions` table filtered by `user_id = user.id` to see whether a device_token already exists.
- `useMutation` wraps `PushNotifications.requestPermissions()` from `@capacitor/push-notifications` and on success INSERTs `(user_id, device_token, platform, app_version)` into `push_subscriptions`.
- Contextual gate: hook returns `shouldShowPrompt = userProgramsCount >= 1 && !hasToken && !hasDismissed` (D-T07 — count >= 1 trigger). The `userProgramsCount` comes from a small `useQuery` against `user_programs` (or a new hook `useUserProgramsCount`).
- Pre-prompt message comes from the hook caller (UI layer renders a shadcn `<Dialog>` before calling `requestPermission`).

---

### `src/lib/pushHandler.ts` (utility, event-driven chokepoint)

**Analog:** `src/lib/sentry.ts` + `src/lib/posthog.ts` (init-once module pattern)

**Reason:** Same shape as deepLinkHandler — module-level init, registered listeners, single boot call.

**Init-once pattern** (already shown above for `deepLinkHandler`).

**Deviation needed for pushHandler:**
- `init` registers three Capacitor listeners: `'registration'` (writes device_token to `push_subscriptions`), `'pushNotificationReceived'` (fires `useTelemetry.trackPushReceived`), `'pushNotificationActionPerformed'` (parses `data.deep_link_path` and hands off to `deepLinkHandler` via React Router navigate).
- `if (!Capacitor.isNativePlatform()) return;` short-circuit.
- Token registration must INSERT through the user's authed Supabase client (RLS WITH CHECK requires `auth.uid() = user_id`) — accept a Supabase client + user.id as arguments rather than importing the singleton, OR use the singleton (already authed in the WebView).
- Telemetry helpers from `useTelemetry` are React hooks — cannot import directly. Either (a) accept callbacks as args, OR (b) call `track()` from `@/lib/posthog` directly (escape-hatch with comment citing that this is a non-React event-listener context).

---

### `supabase/functions/_shared/timingSafeEq.ts` (utility, pure function)

**Analog:** `supabase/functions/_shared/crypto.ts` (existing `_shared/` module)

**Reason:** All four existing duplications (`asaas-webhook:55-60`, `compute-personalized-promos:32-39`, `lgpd-delete:60-65`, `lgpd-delete-cleanup:63-68`, `google-calendar-auth:62-67`) share the identical 5-line implementation. Plan 02-06 SUMMARY explicitly defers extraction to the next consumer — Phase 3's three new push edge fns push the count from 4 to 7, well past extraction threshold.

**Existing duplicate** (`supabase/functions/asaas-webhook/index.ts:55-60`):

```typescript
/**
 * Constant-time string equality. Prevents timing-attack leakage of the
 * webhook token through response-time differential analysis.
 */
export function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
```

**`_shared/` module shape** (`supabase/functions/_shared/crypto.ts:8-11`):

```typescript
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits recommended for GCM
```

**Deviation needed for `_shared/timingSafeEq.ts`:**
- Single `export function timingSafeEq(a: string, b: string): boolean` — body is the 5-line copy above.
- Doc comment explains: timing-attack defense, replaces 4 duplications, exported as the canonical name `timingSafeEq` (not `constantTimeEq`) so future readers don't have to remember which is which. Each consumer migration is a 2-line patch: import + delete local copy.
- Re-export deprecation alias `export { timingSafeEq as constantTimeEq }` so the asaas-webhook test (`index.test.ts:35`) and any other prod code that imports the old name still works during the transition.

---

### `supabase/functions/_shared/fcmSignJWT.ts` (utility, pure function — JWT sign for FCM HTTP v1)

**Analog:** `supabase/functions/google-calendar-auth/index.ts:50-86` (HMAC sign + verify pattern using `crypto.subtle`)

**Reason:** FCM HTTP v1 service-account JWT is signed with RS256 over the header+payload using the private key from the service-account JSON. The existing google-calendar-auth helper uses HMAC-SHA256 (different algorithm) but the same WebCrypto `importKey` → `sign` → base64url-encode pipeline. Pattern is transferable.

**WebCrypto sign pattern** (`google-calendar-auth/index.ts:50-67`):

```typescript
async function hmacSign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(STATE_SIGNING_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return b64urlEncode(new Uint8Array(sig));
}
```

**Base64url helpers** (`google-calendar-auth/index.ts:37-48`):

```typescript
function b64urlEncode(bytes: Uint8Array): string {
  const s = btoa(String.fromCharCode(...bytes));
  return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function b64urlEncodeStr(str: string): string {
  return b64urlEncode(new TextEncoder().encode(str));
}
```

**Deviation needed for `_shared/fcmSignJWT.ts`:**
- Algorithm: `RSASSA-PKCS1-v1_5` with `hash: 'SHA-256'` (= JWT RS256).
- `importKey` reads the `private_key` PEM from the service-account JSON. PEM → DER (`pkcs8`) conversion: strip header/footer + base64 decode. Pass `format: 'pkcs8'`.
- Build standard JWT header `{ alg: 'RS256', typ: 'JWT' }` and payload `{ iss: client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', exp, iat }`.
- Exchange the signed JWT at `https://oauth2.googleapis.com/token` for an OAuth2 access token (grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer). Cache the token for ~50 min (FCM tokens expire in 60).
- Return shape `{ accessToken, expiresAt }` so callers can re-fetch when expired.

---

### `supabase/functions/enqueue-push/index.ts` (edge function, JWT-authed → has_plan gate → token lookup)

**Analog:** `supabase/functions/create-managed-account/index.ts:41-80` (JWT auth + has_plan RPC + service-role downstream write)

**Reason:** Both fns gate access on a server-side `has_plan` RPC, take a JWT-authed caller, and operate as service-role for downstream writes. Push enqueue mirrors managed-account creation: authenticate caller → check plan → perform privileged action.

**JWT extraction + has_plan gate** (`create-managed-account/index.ts:53-79`):

```typescript
// 1. JWT auth — extract the caller's user via the access token.
const authHeader = req.headers.get('Authorization') ?? '';
const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
if (!jwt) {
  return createCorsErrorResponse('Authentication required', req, 401);
}

const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
const caller = userData?.user;
if (userErr || !caller) {
  return createCorsErrorResponse('Invalid or expired token', req, 401);
}

// 2. Server-side VIP gate via the trust kernel.
const { data: hasVip, error: planErr } = await (supabase as unknown as {
  rpc: (fn: string, args: Record<string, unknown>) =>
    Promise<{ data: boolean | null; error: { message: string } | null }>;
}).rpc('has_plan', { _user_id: caller.id, _required_plan: 'vip' });

if (planErr) {
  return createCorsErrorResponse(`has_plan check failed: ${planErr.message}`, req, 500);
}
if (!hasVip) {
  return createCorsErrorResponse('VIP plan required (TIER-05)', req, 403);
}
```

**Deviation needed for enqueue-push:**
- Replace `_required_plan: 'vip'` with `'pro'` for Pro+ events (vencimento de milhas, promo D-13). Free-tier events (payment events, onboarding milestone) skip the has_plan gate entirely — they go through the same fn with an `event_type` body field that branches the check.
- Body schema: `{ event_type: 'expiring_miles' | 'promo_alert' | 'payment_event' | 'onboarding_milestone', user_id: string, payload: {...} }`.
- After has_plan gate passes (or event_type is free-tier), SELECT `device_token, platform` from `push_subscriptions` WHERE `user_id = body.user_id` (service-role bypasses RLS — that's the point of running this fn as a cron fan-out).
- For each token, fire `send-push-notification` (or call it inline) with the rendered payload + deep_link_path.
- Cron callers fan-out from `compute-personalized-promos` (one POST per inserted `user_promo_alerts` row) and `asaas-webhook` (payment events). Both pass their existing `Authorization: Bearer <VAULT_SECRET>` and the caller user_id explicitly (since the cron has no JWT).
- **Dual auth shape:** accept either (a) JWT Bearer (when invoked from client by a self-user) OR (b) shared-secret Bearer (when invoked by another edge function or pg_cron). Mirror the `lgpd-delete` pattern which already does JWT + token-second-factor.

---

### `supabase/functions/send-push-notification/index.ts` (edge function, Bearer-authed → outbound FCM v1)

**Analog:** `supabase/functions/compute-personalized-promos/index.ts:104-194` (Bearer auth + service-role + cron-driven)

**Reason:** Both fns are pg_cron / edge-fn-fanout-driven (no end-user JWT), Bearer-authenticated via Vault secret + `constantTimeEq` (will be `_shared/timingSafeEq.ts`), and call service-role-only DB reads. send-push-notification adds an outbound HTTPS POST to FCM after the auth gate.

**Bearer auth + Vault-secret pattern** (`compute-personalized-promos/index.ts:104-119`):

```typescript
export async function handler(req: Request): Promise<Response> {
  const PROMO_COMPUTE_AUTH_TOKEN = Deno.env.get('PROMO_COMPUTE_AUTH_TOKEN');

  // 1. Bearer auth (Vault-stored secret).
  const auth = req.headers.get('Authorization') ?? '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!PROMO_COMPUTE_AUTH_TOKEN || !constantTimeEq(provided, PROMO_COMPUTE_AUTH_TOKEN)) {
    return new Response('Forbidden', { status: 403 });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('Server misconfigured', { status: 500 });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
```

**Deviation needed for send-push-notification:**
- Replace `PROMO_COMPUTE_AUTH_TOKEN` with `PUSH_SEND_AUTH_TOKEN`.
- Import `timingSafeEq` from `../_shared/timingSafeEq.ts` (Phase 3 extraction).
- After auth gate: read `push_fcm_service_account` from Deno.env (the full service-account JSON, set via `supabase secrets set`). Parse JSON.
- Call `_shared/fcmSignJWT.ts` to mint an OAuth2 access token. Cache for reuse.
- POST to `https://fcm.googleapis.com/v1/projects/<project_id>/messages:send` with `Bearer <access_token>` and body `{ message: { token, notification: { title, body }, data: { deep_link_path }, apns: { ... }, android: { ... } } }`.
- On per-token errors: tokens returning 404/NOT_FOUND or `UNREGISTERED` should trigger a DELETE on `push_subscriptions` for that token (stale token cleanup, per FCM docs). Returns `{ sent, failed, removed_stale }` summary.

---

### `supabase/functions/cleanup-push-subscriptions/index.ts` (edge function, Bearer-authed → DELETE tokens)

**Analog:** `supabase/functions/lgpd-delete-cleanup/index.ts:144-296` (Bearer + service-role + bulk delete by predicate)

**Reason:** Both are downgrade-triggered cleanup fns. lgpd-delete-cleanup runs on a 7-day cutoff; cleanup-push runs when asaas-webhook detects a downgrade (PAYMENT_OVERDUE → grace expired → plan=free). Both DELETE rows owned by users that have crossed a state boundary.

**Bearer auth + service-role + bulk operation** (`lgpd-delete-cleanup/index.ts:158-185`):

```typescript
if (!LGPD_CLEANUP_AUTH_TOKEN) {
  console.error('[lgpd-cleanup] LGPD_CLEANUP_AUTH_TOKEN not set');
  return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
    status: 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Bearer auth — constant-time compare
const authHeader = req.headers.get('Authorization') ?? '';
const expected = `Bearer ${LGPD_CLEANUP_AUTH_TOKEN}`;
if (!timingSafeEq(authHeader, expected)) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const startedAt = Date.now();
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
```

**Summary shape** (`lgpd-delete-cleanup/index.ts:181-186`):

```typescript
const summary: CleanupSummary = {
  processed: 0,
  errors: [],
  deleted_user_ids: [],
  duration_ms: 0,
};
```

**Deviation needed for cleanup-push-subscriptions:**
- Replace `LGPD_CLEANUP_AUTH_TOKEN` with `PUSH_CLEANUP_AUTH_TOKEN`.
- Import `timingSafeEq` from `../_shared/timingSafeEq.ts`.
- Body shape: either `{ user_id: string }` (single-user invocation from asaas-webhook downgrade path — preferred) OR no body (full sweep mode invoked from a future periodic cron).
- Action: DELETE FROM `push_subscriptions` WHERE `user_id = <param>`. Pro+ tokens get wiped; on next app open the user re-registers but `enqueue-push` will refuse to send Pro+ events because `has_plan('pro')` is now false.
- Return `{ deleted: <count>, user_id, duration_ms }`.
- **Important:** Free post-downgrade STILL receives billing events (payment retry success, etc.) because those events skip the has_plan gate. The push permission is NOT revoked — only Pro+ event types stop fanning out. The cleanup wipes the device_token row entirely, so the user re-registers on next app open. That's the simplest correct model.

---

### `supabase/migrations/<ts>_create_push_subscriptions.sql` (migration, table + RLS)

**Analog:** `supabase/migrations/20260515120003_user_promo_alerts.sql`

**Reason:** Both are Pro+ feature tables with RLS that combines `auth.uid() = user_id` + a column-specific predicate. push_subscriptions has the same shape (own row only) but adds INSERT (user registers own device) and DELETE (user removes own device or service-role wipes on downgrade) policies that user_promo_alerts doesn't need.

**Table + index + RLS shape** (`20260515120003_user_promo_alerts.sql:27-75`):

```sql
BEGIN;

CREATE TABLE public.user_promo_alerts (
  id              UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promo_id        TEXT         NOT NULL,
  -- ...
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  dismissed_at    TIMESTAMPTZ
);

-- Hot-path: "show me my active (non-dismissed) alerts, newest first".
-- Partial index keeps it tiny (only undismissed rows).
CREATE INDEX user_promo_alerts_user_active_idx
  ON public.user_promo_alerts (user_id, created_at DESC)
  WHERE dismissed_at IS NULL;

ALTER TABLE public.user_promo_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_promo_alerts_select ON public.user_promo_alerts
  FOR SELECT USING (
    auth.uid() = user_id
    AND public.has_plan(auth.uid(), 'pro'::public.subscription_plan)
  );

CREATE POLICY user_promo_alerts_update ON public.user_promo_alerts
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND public.has_plan(auth.uid(), 'pro'::public.subscription_plan)
  )
  WITH CHECK (
    auth.uid() = user_id
    AND public.has_plan(auth.uid(), 'pro'::public.subscription_plan)
  );
```

**Self-check pattern** (`20260515120003_user_promo_alerts.sql:77-96`):

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'user_promo_alerts'
  ) THEN
    RAISE EXCEPTION 'TIER-03 self-check failed: user_promo_alerts table not created';
  END IF;
  -- ...
  RAISE NOTICE 'TIER-03 self-check passed: user_promo_alerts table + Pro+ RLS in place';
END $$;

COMMIT;
```

**Deviation needed for push_subscriptions:**
- Columns: `(id UUID, user_id UUID, device_token TEXT, platform TEXT CHECK IN ('ios','android'), app_version TEXT, created_at, last_seen_at)`. Drop `promo_id/from_program/...`.
- **Partial UNIQUE** index: `CREATE UNIQUE INDEX push_subscriptions_user_token_uniq ON public.push_subscriptions (user_id, device_token) WHERE device_token IS NOT NULL;` (D-T08).
- Policies (4 total, NOT 2):
  - `push_subscriptions_select` — own row: `USING (auth.uid() = user_id)`. NO has_plan gate on SELECT — Free users may also have read access to their own row (push permission is per-user, not per-tier; only the *event types* are tier-gated by `enqueue-push`).
  - `push_subscriptions_insert` — own row registers: `WITH CHECK (auth.uid() = user_id)`. NO has_plan gate.
  - `push_subscriptions_update` — own row touches `last_seen_at`: `USING + WITH CHECK (auth.uid() = user_id)`.
  - `push_subscriptions_delete` — own row removes (settings panel): `USING (auth.uid() = user_id)`. Service-role bypass handles the downgrade cleanup path.
- Self-check: verify table + 4 policies + partial unique index all exist.

---

### `supabase/migrations/<ts>_schedule_cleanup_push_cron.sql` (migration, pg_cron schedule)

**Analog:** `supabase/migrations/20260515120004_schedule_compute_personalized_promos_cron.sql`

**Reason:** Identical pattern — Vault secret presence check + `cron.unschedule` (idempotent) + `cron.schedule` with `net.http_post` calling an edge function authed by Bearer + Vault-stored secret. Push cleanup needs a periodic sweep mode (in addition to the per-event call from asaas-webhook) to catch any users whose downgrade was missed (defense-in-depth).

**Cron + net.http_post pattern** (`20260515120004_schedule_compute_personalized_promos_cron.sql:19-52`):

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'promo_compute_auth_token') THEN
    RAISE WARNING 'promo_compute_auth_token missing in vault.secrets — run: '
      'SELECT vault.create_secret(''<token>'', ''promo_compute_auth_token'') '
      'before the cron job will succeed';
  END IF;
END $$;

-- 3. Unschedule any prior version of the job (idempotent re-run)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'compute-personalized-promos-nightly') THEN
    PERFORM cron.unschedule('compute-personalized-promos-nightly');
  END IF;
END $$;

SELECT cron.schedule(
  'compute-personalized-promos-nightly',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://opusftqbbaozucmbuuug.supabase.co/functions/v1/compute-personalized-promos',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'promo_compute_auth_token'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('source', 'pg_cron', 'invoked_at', now()::text)
  );
  $$
);
```

**Deviation needed for schedule_cleanup_push_cron:**
- Vault secret name: `push_cleanup_auth_token`.
- Job name: `cleanup-push-subscriptions-weekly`.
- Schedule: `'0 5 * * 0'` (weekly sweep on Sundays at 05:00 UTC — low-load window, doesn't compete with daily 02:00 promo cron or 03:00 reconcile cron).
- URL: `…/functions/v1/cleanup-push-subscriptions`.
- Body: `jsonb_build_object('source', 'pg_cron', 'mode', 'sweep')` — the edge fn branches on body.mode (single-user when called from asaas-webhook; sweep when called from cron).

---

### `supabase/functions/asaas-webhook/index.ts` MODIFICATIONS (fanout to cleanup-push + telemetry trigger on payment events)

**Analog:** Self — extend existing switch statement.

**Self-pattern** (`asaas-webhook/index.ts:296-339`):

```typescript
// 4. Dispatch on event type (RESEARCH §3 state machine)
try {
  switch (eventType) {
    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RECEIVED':
      await handlePaymentSuccess(supabase, payment ?? {});
      break;
    case 'PAYMENT_CREATED':
      await handlePaymentCreated(supabase, payment ?? {});
      break;
    case 'PAYMENT_OVERDUE':
      await handlePaymentOverdue(supabase, payment ?? {});
      break;
    case 'PAYMENT_REFUNDED':
    case 'PAYMENT_PARTIALLY_REFUNDED':
      await handleRefund(supabase, payment ?? {});
      break;
    // ...
```

**Deviation needed:**
- In `handleRefund` and `handleSubscriptionCanceled` (the downgrade paths), after the `user_subscriptions` UPDATE, fire `await fetch(<cleanup_push_url>, { method: 'POST', headers: { Authorization: 'Bearer ' + PUSH_CLEANUP_AUTH_TOKEN }, body: JSON.stringify({ user_id: sub.user_id, mode: 'single' }) })`. Best-effort — wrap in try/catch and log on failure (don't fail the webhook over a push cleanup miss; the weekly cron sweep is the backstop).
- In `handlePaymentSuccess` and `handlePaymentOverdue`, after the state mutation, fire `enqueue-push` with `event_type: 'payment_event'` and the appropriate user_id (look up from the user_subscriptions row already SELECTed at line 106). Best-effort wrap.
- Replace local `constantTimeEq` (lines 55-60) with `import { timingSafeEq as constantTimeEq } from '../_shared/timingSafeEq.ts'` (alias to keep `index.test.ts:35` working without test rewrite).

---

### `supabase/functions/compute-personalized-promos/index.ts` MODIFICATIONS (fanout to enqueue-push per insert)

**Analog:** Self — extend the insert loop with a post-insert fanout.

**Self-pattern** (`compute-personalized-promos/index.ts:163-182`):

```typescript
for (const match of matches) {
  const { error: insErr } = await supabase
    .from('user_promo_alerts')
    .insert({
      user_id: match.user_id,
      promo_id: match.promo_id,
      from_program: match.from_program,
      to_program: match.to_program,
      bonus_pct: match.bonus_pct,
      balance_in_from: null,
      starts_at: match.starts_at,
      ends_at: match.ends_at,
    });
  if (insErr) {
    errors.push(`user=${u.user_id} promo=${match.promo_id}: ${insErr.message}`);
  } else {
    inserted++;
  }
}
```

**Deviation needed:**
- After the successful `inserted++`, fire `await fetch(<enqueue_push_url>, { method: 'POST', headers: { Authorization: 'Bearer ' + PUSH_SEND_AUTH_TOKEN }, body: JSON.stringify({ event_type: 'promo_alert', user_id: match.user_id, payload: { from_program, to_program, bonus_pct, deep_link_path: '/promocoes' } }) })`. Best-effort — failure does not roll back the insert, and the absence of a push only means the user sees the alert next time they open the app (which is the v1 contract).
- Replace local `constantTimeEq` (lines 32-39) with `import { timingSafeEq } from '../_shared/timingSafeEq.ts'`.

---

### `src/test/integration/push.adversarial.test.ts` (test, RLS adversarial)

**Analog:** `src/hooks/vip/vip.adversarial.test.ts`

**Reason:** Same RLS adversarial test fixture — Free/Pro/VIP client comparisons using fixture users from `@/test/integration/fixtures` + service-role `adminClient` for cleanup. Replicate the 7-scenario structure adapted to push_subscriptions semantics + downgrade trigger.

**Test fixture shape** (`vip.adversarial.test.ts:37-67`):

```typescript
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { adminClient } from '@/test/integration/adminClient';
import {
  FREE_USER,
  PRO_USER,
  VIP_USER,
  clientAs,
} from '@/test/integration/fixtures';

describe('VIP managed_accounts + user_promo_alerts adversarial RLS', () => {
  const MANAGED_TARGET_ID = FREE_USER.id;
  const CROSS_OWNER_ID = PRO_USER.id;

  afterAll(async () => {
    await adminClient
      .from('managed_accounts')
      .delete()
      .eq('owner_user_id', VIP_USER.id);
  }, 30_000);
```

**RLS-error assertion pattern** (`vip.adversarial.test.ts:70-79`):

```typescript
it('Free user INSERT managed_accounts returns 42501 (RLS)', async () => {
  const client = await clientAs(FREE_USER);
  const { error } = await client.from('managed_accounts').insert({
    owner_user_id: FREE_USER.id,
    managed_user_id: PRO_USER.id,
    label: 'free-attempt',
  } as never);
  expect(error).not.toBeNull();
  expect(error?.code).toBe('42501');
});
```

**Deviation needed for push.adversarial.test.ts — 5-7 scenarios:**
1. Free user INSERT own `push_subscriptions` row → succeeds (no Pro gate on the table).
2. Free user INSERT cross-user `push_subscriptions` row (user_id != self) → 42501.
3. Pro user INSERT own row + duplicate device_token → unique violation on partial UNIQUE index (23505).
4. Free user SELECT cross-user row → empty (RLS filter).
5. Pro user UPDATE own `last_seen_at` → succeeds.
6. Pro user UPDATE another user's row → 42501.
7. Optional: post-downgrade simulation — service-role DELETE wipes Pro+ user's tokens → subsequent SELECT by that user returns empty (proves cleanup path works).

---

### `capacitor.config.ts` MODIFICATIONS

**Analog:** Self — full rewrite.

**Current state** (`capacitor.config.ts:1-43`):

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.e39f4ef4c00a4d6e8e5c8722bb465399',
  appName: 'milespro',
  webDir: 'dist',
  server: {
    url: 'https://e39f4ef4-c00a-4d6e-8e5c-8722bb465399.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 2000,
      backgroundColor: '#171717',
      // ...
```

**Deviation needed:**
- `appId: 'br.com.milespro.app'` (D-T01).
- `appName: 'MilesPro'` (D-T02).
- **DELETE `server` block entirely** — `server.url` points at the Lovable dev preview, which is incompatible with Path C (deep-link domain validation needs the bundled web assets, not a remote URL). `cleartext: true` is also unsafe for prod and Apple Review will flag it.
- Add `plugins.SplashScreen.backgroundColorDark: '#0a0a0a'` (D-T04 dark variant).
- Add `plugins.PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] }` (D-T05).
- `android.allowMixedContent` should be `false` for prod (currently `true` — required for Lovable dev URL, no longer needed once `server` is removed).

---

### `vercel.json` MODIFICATIONS

**Analog:** Self — extend `headers` array.

**Self-pattern** (`vercel.json:10-26`):

```json
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
  }
]
```

**Rewrites self-pattern** (`vercel.json:7-9`):

```json
"rewrites": [
  { "source": "/((?!api/|assets/).*)", "destination": "/index.html" }
]
```

**Deviation needed:**
- Extend `rewrites` regex to also exclude `\\.well-known/`: `"source": "/((?!api/|assets/|\\.well-known/).*)"`. Without this, the SPA catch-all rewrite returns `/index.html` for the AASA URL, which would serve HTML with status 200 and break Apple's content-type validation.
- Add a new entry to `headers`:
  ```json
  {
    "source": "/.well-known/(.*)",
    "headers": [
      { "key": "Content-Type", "value": "application/json" },
      { "key": "Cache-Control", "value": "public, max-age=3600" }
    ]
  }
  ```
  (D-T11 — AASA file has NO `.json` extension, so the content-type header is the only way to set it correctly; `assetlinks.json` already has the extension but we override for consistency.)

---

### `src/pages/Auth.tsx` MODIFICATIONS (redirectTo + Apple button)

**Analog:** Self — `handleGoogleSignIn` shape carries over to Apple.

**Single-line redirect rewrite** (`Auth.tsx:89`):

```typescript
redirectTo: `${window.location.origin}/dashboard`,
```

**Deviation needed:**
- Change line 89 to `redirectTo: \`${window.location.origin}/auth/callback\`,` (D-T09).
- Add `import { useAppleSignIn } from '@/hooks/useAppleSignIn';` and `const { signInWithApple, isLoading: isAppleLoading, isAvailable: isAppleAvailable } = useAppleSignIn();`.
- After the Google button JSX in BOTH `<TabsContent value="login">` and `<TabsContent value="signup">`, add:
  ```tsx
  {isAppleAvailable && (
    <Button type="button" variant="outline" className="w-full" onClick={signInWithApple} disabled={isAppleLoading || isLoading || isGoogleLoading}>
      {isAppleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AppleIcon className="mr-2 h-4 w-4" />}
      Continuar com Apple
    </Button>
  )}
  ```
  Apple icon is the official `apple-logo` SVG — researcher should propose final markup. Placement: directly under the Google button, before the separator.

---

### `src/contexts/AuthProvider.tsx` MODIFICATIONS (emailRedirectTo + returnTo consumption)

**Analog:** Self.

**Self-pattern** (`AuthProvider.tsx:54-66`):

```typescript
const signUp = async (email: string, password: string, fullName: string) => {
  const redirectUrl = `${window.location.origin}/dashboard`;
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        full_name: fullName,
      },
    },
  });
```

**Deviation needed:**
- Change line 55 to `const redirectUrl = \`${window.location.origin}/auth/callback\`;`.
- In `onAuthStateChange` handler (around line 30), when `event === 'SIGNED_IN'`, read `sessionStorage.getItem('returnTo')`. If present, navigate to it (need to wire a navigate callback in via context, OR — simpler — leave the navigate to AuthCallback.tsx and only have AuthProvider clear the sessionStorage key after a successful post-callback session is observed). Recommended: AuthCallback.tsx handles the navigate itself per the analog above; AuthProvider stays unchanged for navigation semantics, only the `emailRedirectTo` URL changes.

---

### `src/App.tsx` MODIFICATIONS (route + listener)

**Analog:** Self.

**Self-pattern — route registration** (`App.tsx:135-136`):

```typescript
<Route path="/lgpd/confirm" element={<ProtectedRoute><LgpdConfirmDelete /></ProtectedRoute>} />
<Route path="/lgpd/confirm-delete" element={<ProtectedRoute><LgpdConfirmDelete /></ProtectedRoute>} />
```

**Self-pattern — listener registration in useEffect** (`App.tsx:110-117`):

```typescript
const AppRoutes = () => {
  const location = useLocation();
  
  // Track page views with PostHog
  useEffect(() => {
    pageview(location.pathname);
  }, [location.pathname]);
```

**Deviation needed:**
- Add lazy import: `const AuthCallback = lazy(() => import("./pages/AuthCallback"));`.
- Add route: `<Route path="/auth/callback" element={<AuthCallback />} />` — NOT wrapped in `ProtectedRoute` (it IS the page that establishes auth; per D-T12 exception clause). Place above `/dashboard` near line 137.
- Add a separate `useEffect` (alongside the existing pageview effect at line 113-115) calling `initDeepLinkHandler(navigate)` (where `navigate` comes from `useNavigate()`). The init helper is no-op on web (`Capacitor.isNativePlatform()` check), safe to always call.
- Optionally add `initPushHandler(supabase, user.id)` inside `ProtectedProviders` (since pushHandler needs auth context) — researcher to confirm component boundary.

---

### `src/hooks/useTelemetry.ts` MODIFICATIONS (4-5 new push helpers)

**Analog:** Self.

**Self-pattern — typed helper additions** (`useTelemetry.ts:74-85`):

```typescript
trackPromotionAlertShown: (props: {
  fromProgram: string;
  toProgram: string;
  bonusPct: number;
}) => track('promotion_alert_shown', props),

trackPromotionAlertClicked: (props: {
  fromProgram: string;
  toProgram: string;
  bonusPct: number;
}) => track('promotion_alert_clicked', props),
```

**Deviation needed — add a new section "Push lifecycle" with 5 helpers:**

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
  event_type: 'expiring_miles' | 'promo_alert' | 'payment_event' | 'onboarding_milestone';
}) => track('push_received', props),

trackPushOpened: (props: {
  event_type: 'expiring_miles' | 'promo_alert' | 'payment_event' | 'onboarding_milestone';
  deep_link_path: string;
}) => track('push_opened', props),
```

---

### `ios/App/App/Info.plist` MODIFICATIONS

**Analog:** Self.

**Current Info.plist** (`ios/App/App/Info.plist:7-8, 56-57`):

```xml
<key>CFBundleDisplayName</key>
<string>miles-pro-hub</string>
...
<key>NSUserNotificationsUsageDescription</key>
<string>O MilesPro envia alertas de expiração de milhas, promoções e tarefas.</string>
```

**Deviation needed:**
- `CFBundleDisplayName` → `MilesPro` (D-T02).
- `NSUserNotificationsUsageDescription` keep the existing string (already pt-BR + matches D-T07 intent). Verify it satisfies Apple Review: "Avisar você sobre vencimentos de milhas e promoções" or similar.
- Add `<key>com.apple.developer.associated-domains</key><array><string>applinks:app.milespro.net.br</string></array>` — actually this entitlement lives in `App.entitlements`, NOT `Info.plist`. Researcher should verify which file Xcode generated; in Capacitor 7 it's typically `ios/App/App/App.entitlements`. Plan to grep for or create that file.
- Add `<key>CFBundleURLTypes</key>` only if a custom scheme is ever added — per D-T10 we use HTTPS-only, so this stays empty.

---

### `android/app/build.gradle` MODIFICATIONS (applicationId + SDK versions)

**Analog:** Self.

**Self-pattern** (`android/app/build.gradle:6-12`):

```gradle
defaultConfig {
    applicationId "com.example.milesprohub"
    minSdkVersion rootProject.ext.minSdkVersion
    targetSdkVersion rootProject.ext.targetSdkVersion
    versionCode 1
    versionName "1.0"
    testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
```

**Deviation needed:**
- `applicationId "br.com.milespro.app"` (D-T01).
- `namespace "br.com.milespro.app"` (top of `android { ... }`).
- The `minSdkVersion` / `targetSdkVersion` references read from `android/variables.gradle` (root). Plan to bump `targetSdkVersion = 35` and review `minSdkVersion` (currently likely 22 or 23; verify and document — Capacitor 7 supports minSdk 22+).
- `versionCode` and `versionName` will need updates per release.
- The existing `try { def servicesJSON = file('google-services.json') }` block (lines 47-54) is already wired — placing the new `google-services.json` in `android/app/` triggers the FCM plugin automatically. No code change needed there.

---

### `android/app/src/main/AndroidManifest.xml` MODIFICATIONS (intent-filter for App Links)

**Analog:** Self.

**Self-pattern** (`AndroidManifest.xml:12-25`):

```xml
<activity
    android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation"
    android:name=".MainActivity"
    android:label="@string/title_activity_main"
    android:theme="@style/AppTheme.NoActionBarLaunch"
    android:launchMode="singleTask"
    android:exported="true">

    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>

</activity>
```

**Deviation needed — add a SECOND intent-filter inside the same `<activity>` block:**

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="app.milespro.net.br" />
    <data android:pathPrefix="/auth/callback" />
    <data android:pathPrefix="/lgpd/confirm-delete" />
    <data android:pathPrefix="/promocoes" />
</intent-filter>
```

- `android:autoVerify="true"` triggers Play Protect to fetch `https://app.milespro.net.br/.well-known/assetlinks.json` at install + every 24h.
- `android:label="@string/app_name"` and a string resource update — `strings.xml` currently has `app_name = "miles-pro-hub"`; bump to `MilesPro` (D-T02).

---

## Shared Patterns

### Shared Pattern 1: Edge Function Bearer Auth + Vault Secret + `_shared/timingSafeEq.ts`

**Source files (duplicate consumers):**
- `supabase/functions/asaas-webhook/index.ts:55-60`
- `supabase/functions/compute-personalized-promos/index.ts:32-39`
- `supabase/functions/lgpd-delete/index.ts:60-65`
- `supabase/functions/lgpd-delete-cleanup/index.ts:63-68`
- `supabase/functions/google-calendar-auth/index.ts:62-67`

**Apply to:** All 3 new push edge functions (`enqueue-push`, `send-push-notification`, `cleanup-push-subscriptions`).

**Canonical excerpt** (will be `supabase/functions/_shared/timingSafeEq.ts` after extraction):

```typescript
export function timingSafeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
```

**Use as:** `import { timingSafeEq } from '../_shared/timingSafeEq.ts';`

---

### Shared Pattern 2: iOS-only UI gating via `useIsIOSCapacitor`

**Source:** `src/hooks/useIsIOSCapacitor.ts:32-41`

**Apply to:** `src/pages/Auth.tsx` (Apple button render guard), `src/hooks/useAppleSignIn.ts` (isAvailable flag), any future iOS-specific UI in Phase 3.

```typescript
export function isIOSCapacitor(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

export function useIsIOSCapacitor(): boolean {
  return isIOSCapacitor();
}
```

**Rule:** Any new pricing surface, OAuth provider, or platform-specific UI in Phase 3 MUST gate render through this hook. Failing this is the failure mode of G-CRIT-03 (the `strings | grep` post-build gate).

---

### Shared Pattern 3: Pro+ RLS with `has_plan(auth.uid(), 'pro')`

**Source:** `supabase/migrations/20260515120003_user_promo_alerts.sql:53-70`

**Apply to:** `push_subscriptions` SELECT policy (own-row only, no plan gate at table level) + `enqueue-push` edge fn's server-side `has_plan` RPC check (per-event-type gate).

```sql
CREATE POLICY user_promo_alerts_select ON public.user_promo_alerts
  FOR SELECT USING (
    auth.uid() = user_id
    AND public.has_plan(auth.uid(), 'pro'::public.subscription_plan)
  );

CREATE POLICY user_promo_alerts_update ON public.user_promo_alerts
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND public.has_plan(auth.uid(), 'pro'::public.subscription_plan)
  )
  WITH CHECK (
    auth.uid() = user_id
    AND public.has_plan(auth.uid(), 'pro'::public.subscription_plan)
  );
```

**Note:** `push_subscriptions` itself is NOT Pro+-gated at the table — Free users can also store a token. The Pro+ gate is applied per-event in `enqueue-push` (RPC `has_plan(user_id, 'pro')` check before fan-out for `expiring_miles` and `promo_alert` events).

---

### Shared Pattern 4: Idempotent migration self-check + COMMIT

**Source:** `supabase/migrations/20260515120003_user_promo_alerts.sql:77-98`

**Apply to:** `create_push_subscriptions.sql` + `schedule_cleanup_push_cron.sql`.

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'user_promo_alerts'
  ) THEN
    RAISE EXCEPTION 'TIER-03 self-check failed: user_promo_alerts table not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_promo_alerts'
      AND policyname = 'user_promo_alerts_select'
  ) THEN
    RAISE EXCEPTION 'TIER-03 self-check failed: user_promo_alerts_select policy not created';
  END IF;

  RAISE NOTICE 'TIER-03 self-check passed: user_promo_alerts table + Pro+ RLS in place';
END $$;

COMMIT;
```

---

### Shared Pattern 5: PII scrubbing in Sentry/PostHog

**Source:** `src/lib/sentry.ts:35-59` (scrubPII) + `src/lib/posthog.ts:41` (property_denylist)

**Apply to:** Any new Sentry init (if `@sentry/capacitor` lands per researcher's "Option 2" — defer recommended), any push payload telemetry. Push notification payloads MUST NOT contain CPF/email — keep to non-PII fields (program codes, bonus_pct, deep_link_path).

```typescript
const CPF_REGEX = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const EMAIL_REGEX = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g;

export function scrubPII(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  if (event.message) {
    event.message = event.message
      .replace(CPF_REGEX, '[CPF_REDACTED]')
      .replace(EMAIL_REGEX, '[EMAIL_REDACTED]');
  }
  // ...
}
```

---

### Shared Pattern 6: Init-once module helpers called from `App.tsx` / `main.tsx`

**Source:** `src/main.tsx:9-15` (initSentry + initPosthog) + `src/lib/posthog.ts:23, 30-58`

**Apply to:** `src/lib/deepLinkHandler.ts` `initDeepLinkHandler(navigate)`, `src/lib/pushHandler.ts` `initPushHandler(supabase, userId)`.

```typescript
// main.tsx
initSentry();
initPosthog();

// posthog.ts
let initialized = false;
export function initPosthog(): void {
  if (initialized) return;
  if (!API_KEY) {
    logger.warn('[Posthog] No API key — analytics disabled');
    return;
  }
  posthog.init(API_KEY, { /* ... */ });
  initialized = true;
}
```

**Difference:** `deepLinkHandler` + `pushHandler` are called from `App.tsx` `useEffect` (NOT `main.tsx`) because they need React-Router's `navigate` + the authenticated Supabase client (which only exists inside `AuthProvider`).

---

## No Analog Found

| File | Role | Data Flow | Reason | Substitute Source |
|------|------|-----------|--------|-------------------|
| `public/.well-known/apple-app-site-association` | static JSON | n/a | First AASA file in repo | RESEARCH.md §"Universal Links + App Links Setup" — payload shape from D-T11 |
| `public/.well-known/assetlinks.json` | static JSON | n/a | First assetlinks file in repo | RESEARCH.md §"Universal Links + App Links Setup" — payload shape from D-T11 |
| `firebase/service-account.json` | secret | n/a | Generated by Firebase Console, stored in Vault, never committed | RESEARCH.md §"FCM HTTP v1 API Server-side" — service-account JSON shape |
| `scripts/check-ios-strings.sh` | CI script | shell | No existing CI gate scripts in repo | RESEARCH.md §"G-CRIT-03 gate" + ROADMAP §3 SC#1 — `strings <ipa-bundle> | grep -E "planos|checkout|R\\\$|Upgrade|Assinar"` must return zero |

---

## Metadata

**Analog search scope:** `src/`, `supabase/functions/`, `supabase/migrations/`, `ios/`, `android/`, `public/`, root configs (`capacitor.config.ts`, `vercel.json`).
**Files scanned:** 27 files read (Read tool calls), 8 directories globbed.
**Existing canonical chokepoints leveraged:** 6 (`useIsIOSCapacitor`, `useTelemetry`, `useConsent`, `sentry.ts`, `posthog.ts`, `_shared/cors.ts`).
**Cross-cutting consumers of `_shared/timingSafeEq.ts` after Phase 3:** 7 edge functions (5 existing + 3 new — extraction long overdue).
**Pattern extraction date:** 2026-05-13.
