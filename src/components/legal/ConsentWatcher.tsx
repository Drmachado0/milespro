/**
 * ConsentWatcher — bridge between useConsent (Plan 02-02 W1a) and the
 * PostHog opt-in/out state (Plan 02-03 W1b).
 *
 * Renders nothing. Mounts inside the React tree (App.tsx) because it
 * depends on react-query (which useConsent uses). At module load,
 * `initPosthog()` (called from src/main.tsx) puts PostHog in opt-out
 * mode. This component then reactively flips opt-in/out based on
 * `analyticsOptedIn` from the latest user_consents row.
 *
 * Gate G-HIGH-03: a fresh browser session at any route shows zero
 * requests to eu.i.posthog.com until ConsentBanner submission with
 * Analytics opted-in.
 */

import { useEffect } from 'react';
import { useConsent } from '@/hooks/useConsent';
import { enableAnalytics, disableAnalytics } from '@/lib/posthog';

export function ConsentWatcher(): null {
  const { analyticsOptedIn } = useConsent();

  useEffect(() => {
    if (analyticsOptedIn) {
      enableAnalytics();
    } else {
      disableAnalytics();
    }
  }, [analyticsOptedIn]);

  return null;
}
