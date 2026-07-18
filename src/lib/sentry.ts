/**
 * Sentry Client Init — Phase 2 W1b (TEL-03 / HIGH-03)
 *
 * Legitimate-interest under LGPD Art. 7 IX: Sentry runs unconditionally
 * at boot (no consent gate) BUT must scrub PII before send:
 *   - `sendDefaultPii: false` (do not auto-attach user/IP/cookies)
 *   - `beforeSend` runs `scrubPII()` on every event
 *   - `beforeBreadcrumb` drops `console.log` breadcrumbs (only warn+error
 *     survive, and those go through the same regex strip in beforeSend)
 *   - `replayIntegration` is NOT enabled (no session replay storage)
 *   - `tracesSampleRate: 0.1` (10% performance traces)
 *
 * scrubPII redacts CPF (3 formats: raw 11 digits, dot-formatted, mixed)
 * and email from:
 *   - event.message
 *   - event.request.url query string
 *   - event.breadcrumbs[].message
 *   - event.user.email / event.user.username (kept: id only)
 *
 * Verified by src/lib/sentry.test.ts.
 */

import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

// Matches: 99999999999 (raw 11) OR 999.999.999-99 OR mixed (999999999-99 etc).
// The optional dots/dash account for the most common BR CPF presentations.
const CPF_REGEX = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;

// Conservative RFC-2822-ish: local-part [\w.+-], domain [\w-]+ TLD [\w.-]+.
// Good enough to catch any user-facing email; we don't try to be exhaustive.
const EMAIL_REGEX = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g;

export function scrubPII(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  if (event.message) {
    event.message = event.message
      .replace(CPF_REGEX, '[CPF_REDACTED]')
      .replace(EMAIL_REGEX, '[EMAIL_REDACTED]');
  }
  if (event.request?.url) {
    event.request.url = event.request.url
      .replace(/([?&])cpf=[^&]+/gi, '$1cpf=[REDACTED]')
      .replace(/([?&])email=[^&]+/gi, '$1email=[REDACTED]');
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((b) => ({
      ...b,
      message: b.message
        ?.replace(CPF_REGEX, '[CPF_REDACTED]')
        ?.replace(EMAIL_REGEX, '[EMAIL_REDACTED]'),
    }));
  }
  if (event.user) {
    delete event.user.email;
    delete event.user.username;
  }
  return event;
}

export function initSentry(): void {
  if (!DSN) return;

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend: (event) => scrubPII(event as Sentry.ErrorEvent),
    beforeBreadcrumb: (breadcrumb) => {
      if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
        return null;
      }
      return breadcrumb;
    },
  });
}

export function identifyUser(userId: string): void {
  Sentry.setUser({ id: userId });
}

export function clearUser(): void {
  Sentry.setUser(null);
}

export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  Sentry.captureException(error, { extra: context });
}
