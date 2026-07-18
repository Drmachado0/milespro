/**
 * CrispWidget — embedded helpdesk live-chat (LAUNCH-05 / D-23).
 *
 * Phase 2 Plan 02-04 (W1c) initial; Plan 02-06 (W2b) replaced the userAgent
 * fallback with the canonical useIsIOSCapacitor hook. Lifecycle-only component
 * (returns null).
 *
 * Three gates before the widget initializes:
 *   1. VITE_CRISP_WEBSITE_ID must be set (graceful degrade, like posthog.ts)
 *   2. User must have given marketing consent (useConsent().marketingOptedIn)
 *      — Crisp drops cookies and shares chat history with EU servers.
 *      Privacidade.tsx §5 declares Crisp as sub-processor; banner gates load.
 *   3. Not running inside iOS Capacitor (Path C — Apple Multiplatform Services
 *      exemption requires zero pricing/checkout UI on iOS, which includes
 *      the helpdesk widget linking back to the web pricing page).
 *
 * Authenticated users have their email forwarded to Crisp (declared in
 * Privacidade.tsx §5 Crisp sub-processor block) so the inbox can thread.
 */

import { useEffect } from 'react';
import { Crisp } from 'crisp-sdk-web';
import { useAuth } from '@/hooks/useAuth';
import { useConsent } from '@/hooks/useConsent';
import { useIsIOSCapacitor } from '@/hooks/useIsIOSCapacitor';
import { logger } from '@/lib/logger';

const WEBSITE_ID = import.meta.env.VITE_CRISP_WEBSITE_ID;

export function CrispWidget(): null {
  const { user } = useAuth();
  const { marketingOptedIn } = useConsent();
  const isIOS = useIsIOSCapacitor();

  useEffect(() => {
    if (!WEBSITE_ID) {
      logger.warn('[Crisp] VITE_CRISP_WEBSITE_ID unset — widget disabled');
      return;
    }

    // iOS Capacitor — Path C exemption: never load the widget on iOS native.
    if (isIOS) {
      logger.info('[Crisp] iOS Capacitor detected — widget disabled (Path C)');
      return;
    }

    // Consent gate: Crisp drops cookies and forwards chat history to EU
    // servers; marketing consent (which covers helpdesk cookies in our
    // Privacidade.tsx framing) must be in place before init.
    if (!marketingOptedIn) {
      return;
    }

    try {
      Crisp.configure(WEBSITE_ID, {
        autoload: true,
      });

      if (user?.email) {
        // Forward only the email so the operator can thread messages.
        // CPF is NEVER sent (PII denylist matches PostHog convention).
        Crisp.user.setEmail(user.email);
      }
    } catch (err) {
      logger.warn('[Crisp] configure failed', err);
    }

    return () => {
      try {
        // Defensive teardown on unmount or consent revocation.
        Crisp.chat.hide();
      } catch {
        /* no-op */
      }
    };
  }, [marketingOptedIn, user?.email, isIOS]);

  return null;
}

export default CrispWidget;
