/**
 * PostHog Analytics Wrapper — Phase 2 W1b (TEL-01 / HIGH-03)
 *
 * Replaces the Phase 1 mock. Real `posthog-js` integration with:
 *   - EU region host (LGPD residency — D-04 / Privacidade.tsx §5)
 *   - `opt_out_capturing_by_default: true` — no events fire until
 *     ConsentBanner submission flips analytics_opted_in === true,
 *     at which point `enableAnalytics()` calls `posthog.opt_in_capturing()`
 *   - `property_denylist: ['cpf','email','phone','$ip']` defense-in-depth
 *   - `autocapture: false` + `disable_session_recording: true` — no
 *     accidental form scraping, no replay storage of PII
 *   - `person_profiles: 'identified_only'` — anonymous visitors do NOT
 *     create person profiles in PostHog
 *
 * Gate G-HIGH-03: a fresh browser session at any route must produce
 * zero requests to eu.i.posthog.com before consent. Verified via the
 * Network tab + the smoke flow documented in 02-03-PLAN §verification.
 */

import posthog from 'posthog-js';
import { logger } from '@/lib/logger';

let initialized = false;

const API_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const API_HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ??
  'https://eu.i.posthog.com';

export function initPosthog(): void {
  if (initialized) return;
  if (!API_KEY) {
    logger.warn('[Posthog] No API key — analytics disabled');
    return;
  }

  posthog.init(API_KEY, {
    api_host: API_HOST,
    ui_host: 'https://eu.posthog.com',
    person_profiles: 'identified_only',
    property_denylist: ['cpf', 'email', 'phone', '$ip'],
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    opt_out_capturing_by_default: true,
    loaded: (ph) => {
      // Defense in depth: re-assert opt-out at boot. Some PostHog versions
      // honor `opt_out_capturing_by_default` only on first install (after
      // which the user's localStorage opt-state takes over). Forcing opt-out
      // here guarantees consent is the ONLY path to capturing.
      ph.opt_out_capturing();
    },
  });

  initialized = true;
  logger.info('[Posthog] Initialized (opt-out by default)');
}

export function enableAnalytics(): void {
  if (!initialized) initPosthog();
  if (!initialized) return;
  posthog.opt_in_capturing();
  logger.info('[Posthog] Opted in to capturing');
}

export function disableAnalytics(): void {
  if (!initialized) return;
  posthog.opt_out_capturing();
  logger.info('[Posthog] Opted out of capturing');
}

export function identify(
  userId: string,
  properties?: Record<string, unknown>,
): void {
  if (!initialized) return;
  // Defense in depth: even though `property_denylist` covers these, we
  // strip them from the identify payload before it reaches the library.
  const safeProperties: Record<string, unknown> = { ...(properties ?? {}) };
  delete safeProperties.email;
  delete safeProperties.cpf;
  delete safeProperties.phone;
  posthog.identify(userId, safeProperties);
}

export function track(
  eventName: string,
  properties?: Record<string, unknown>,
): void {
  if (!initialized) return;
  posthog.capture(eventName, properties);
}

export function pageview(
  path: string,
  properties?: Record<string, unknown>,
): void {
  if (!initialized) return;
  posthog.capture('$pageview', { $current_url: path, ...(properties ?? {}) });
}

export function reset(): void {
  if (!initialized) return;
  posthog.reset();
}

export function isEnabled(): boolean {
  return initialized;
}
