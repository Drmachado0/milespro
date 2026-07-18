/* eslint-disable react-hooks/rules-of-hooks -- useRateLimit is a plain function (no React hooks inside); calling it in a loop is safe in tests */
import { describe, it, expect, beforeEach } from 'vitest';

describe('useRateLimit', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('allows attempts when no history', async () => {
    const { useRateLimit } = await import('./useRateLimit');
    const result = useRateLimit();
    expect(result.canAttempt).toBe(true);
    expect(result.remainingAttempts).toBe(5);
  });

  it('records attempts and blocks after max', async () => {
    const { useRateLimit } = await import('./useRateLimit');
    for (let i = 0; i < 5; i++) {
      const r = useRateLimit();
      r.recordAttempt();
    }
    const result = useRateLimit();
    expect(result.canAttempt).toBe(false);
    expect(result.remainingAttempts).toBe(0);
  });

  it('reset clears everything', async () => {
    const { useRateLimit } = await import('./useRateLimit');
    const r = useRateLimit();
    r.recordAttempt();
    r.reset();
    const after = useRateLimit();
    expect(after.remainingAttempts).toBe(5);
  });

  it('blockedMinutesRemaining is 0 when not blocked', async () => {
    const { useRateLimit } = await import('./useRateLimit');
    expect(useRateLimit().blockedMinutesRemaining).toBe(0);
  });
});
