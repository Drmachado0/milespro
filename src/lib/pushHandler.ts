/**
 * pushHandler — Capacitor PushNotifications chokepoint (Plan 03-05 / MOBILE-04).
 *
 * Mounting point: ProtectedProviders.tsx useEffect (where useAuth().user.id is
 * available + the authed supabase singleton is in scope + React Router
 * navigate() is reachable via useNavigate).
 *
 * Listener responsibilities (4 total):
 *   - 'registration'                    → INSERT/upsert token into push_subscriptions
 *   - 'registrationError'               → log only (no UI fallback in v1)
 *   - 'pushNotificationReceived'        → foreground telemetry; no UI
 *   - 'pushNotificationActionPerformed' → background tap: telemetry + navigate
 *
 * No-op when !Capacitor.isNativePlatform() — safe to call from web builds.
 *
 * Defense-in-depth (T-3-03f): pushNotificationActionPerformed only navigates to
 * paths that match ALLOWED_DEEP_LINK_PREFIXES (mirrors AASA host validation
 * from Plan 03-03). Untrusted-looking paths fall back to /dashboard. We
 * control enqueue-push server-side so payloads SHOULD be trustworthy, but the
 * allowlist is the last fence against a future regression.
 */

import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  type Token,
  type PushNotificationSchema,
  type ActionPerformed,
} from '@capacitor/push-notifications';
import type { NavigateFunction } from 'react-router-dom';
import type { SupabaseClient } from '@supabase/supabase-js';

import { logger } from '@/lib/logger';
import { track } from '@/lib/posthog';

// Read app version from Vite env (set by build) or fall back
const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? '1.0.0';

// AASA-aligned allowed deep-link paths (defense in depth — should match
// public/.well-known/apple-app-site-association from Plan 03-03).
// Any path that does NOT startWith one of these prefixes falls back to /dashboard.
const ALLOWED_DEEP_LINK_PREFIXES = [
  '/auth/callback',
  '/lgpd/confirm-delete',
  '/promocoes',
  '/dashboard',
];

function isAllowedDeepLinkPath(path: string): boolean {
  return ALLOWED_DEEP_LINK_PREFIXES.some((p) => path.startsWith(p));
}

export interface PushHandlerHandle {
  unsubscribe: () => void;
}

/**
 * Registers all four Capacitor PushNotifications listeners.
 *
 * @param supabase - authed Supabase client (singleton from @/integrations/supabase/client)
 * @param userId   - current authenticated user.id (RLS auth.uid()=user_id INSERT path)
 * @param navigate - React Router navigate fn from useNavigate()
 *
 * @returns handle.unsubscribe() — removes all 4 listeners (call in useEffect cleanup)
 */
export function registerPushHandler(
  supabase: SupabaseClient,
  userId: string,
  navigate: NavigateFunction,
): PushHandlerHandle {
  if (!Capacitor.isNativePlatform()) {
    return { unsubscribe: () => {} };
  }

  const platform: 'ios' | 'android' =
    Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';

  // 1. Registration (token received from APNs/FCM)
  const regHandlePromise = PushNotifications.addListener(
    'registration',
    async (token: Token) => {
      logger.log('[PushHandler]', 'registration token received');
      try {
        // Upsert: partial UNIQUE index push_subscriptions_user_token_uniq on
        // (user_id, device_token) — on conflict, bump last_seen_at.
        const { error } = await supabase
          .from('push_subscriptions')
          .upsert(
            {
              user_id: userId,
              device_token: token.value,
              platform,
              app_version: APP_VERSION,
              last_seen_at: new Date().toISOString(),
            } as never,
            { onConflict: 'user_id,device_token' },
          );
        if (error) {
          logger.error('[PushHandler]', 'upsert push_subscriptions failed', error);
        }
      } catch (err) {
        logger.error('[PushHandler]', 'unexpected error during token upsert', err);
      }
    },
  );

  // 2. Registration error (e.g., user revoked permission mid-flight)
  const errHandlePromise = PushNotifications.addListener(
    'registrationError',
    (err) => {
      logger.error('[PushHandler]', 'registration error', err);
    },
  );

  // 3. Foreground received (push arrives while app is open)
  const recvHandlePromise = PushNotifications.addListener(
    'pushNotificationReceived',
    (notification: PushNotificationSchema) => {
      logger.log('[PushHandler]', 'foreground push received', notification.title);
      const eventType = (notification.data?.event_type as string | undefined) ?? 'unknown';
      track('push_received', { event_type: eventType });
    },
  );

  // 4. Background tap (user tapped notification from outside the app)
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

  return {
    unsubscribe: () => {
      regHandlePromise.then((h) => h.remove()).catch(() => {});
      errHandlePromise.then((h) => h.remove()).catch(() => {});
      recvHandlePromise.then((h) => h.remove()).catch(() => {});
      actHandlePromise.then((h) => h.remove()).catch(() => {});
    },
  };
}
