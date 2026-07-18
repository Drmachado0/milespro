import { describe, it, expect, vi, beforeEach } from 'vitest';
import { identify, track, pageview, reset, isEnabled } from './posthog';

/**
 * NOTE: Phase 2 W1b rewrote src/lib/posthog.ts as a real consent-gated
 * wrapper. `initPosthog()` now takes NO arguments — it reads
 * `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST` from `import.meta.env`.
 *
 * In the Vitest jsdom environment those env vars are unset, so
 * `initPosthog()` early-returns without touching posthog-js. That's the
 * shape these tests rely on: every helper must safely no-op when
 * `initialized === false`.
 */
describe('posthog wrapper (real)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('is disabled by default (no VITE_POSTHOG_KEY in test env)', () => {
    expect(isEnabled()).toBe(false);
  });

  it('helpers no-op when uninitialized — must not throw', () => {
    expect(() => {
      identify('user1');
      identify('user1', { email: 'should-be-stripped@example.com', plan: 'pro' });
      track('event1');
      track('event2', { foo: 'bar' });
      pageview('/test');
      pageview('/test', { ref: 'org' });
      reset();
    }).not.toThrow();
  });
});
