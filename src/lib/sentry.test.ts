import { describe, it, expect } from 'vitest';
import { scrubPII } from './sentry';

/**
 * Gate G-HIGH-03 unit tests. These prove that CPF + email patterns are
 * stripped from Sentry events BEFORE they leave the browser. If any of
 * these fail, the LGPD legitimate-interest base for Sentry collapses.
 *
 * `as never` casts let us hand-build minimal event fixtures without
 * importing Sentry's full ErrorEvent shape (which has ~40 required
 * fields and is awkward to mock).
 */
describe('Sentry beforeSend PII scrubbing', () => {
  it('redacts CPF from message (formatted and unformatted)', () => {
    const e1 = scrubPII({ message: 'User 12345678901 had error' } as never);
    expect(e1.message).not.toContain('12345678901');
    expect(e1.message).toContain('[CPF_REDACTED]');

    const e2 = scrubPII({
      message: 'User 123.456.789-01 had error',
    } as never);
    expect(e2.message).not.toContain('123.456.789-01');
    expect(e2.message).toContain('[CPF_REDACTED]');

    // Mixed-format also caught (e.g. 12345678901 without separators).
    const e3 = scrubPII({
      message: 'Auth attempt for 999.99999999-99',
    } as never);
    expect(e3.message).not.toContain('999.99999999-99');
  });

  it('redacts email from message', () => {
    const e = scrubPII({
      message: 'Login failed for joao@example.com',
    } as never);
    expect(e.message).not.toContain('joao@example.com');
    expect(e.message).toContain('[EMAIL_REDACTED]');
  });

  it('redacts email from request.url query string', () => {
    const e = scrubPII({
      request: { url: 'https://app.milespro.net.br?email=joao@example.com' },
    } as never);
    expect(e.request!.url).not.toContain('joao@example.com');
    expect(e.request!.url).toContain('[REDACTED]');
  });

  it('strips email and username from event.user but keeps id', () => {
    const e = scrubPII({
      user: {
        id: 'abc-uuid',
        email: 'joao@example.com',
        username: 'joao',
      },
    } as never);
    expect(e.user!.email).toBeUndefined();
    expect(e.user!.username).toBeUndefined();
    expect(e.user!.id).toBe('abc-uuid');
  });

  it('redacts CPF in breadcrumb message', () => {
    const e = scrubPII({
      breadcrumbs: [{ message: 'Auth attempt for CPF 123.456.789-01' }],
    } as never);
    expect(e.breadcrumbs![0].message).not.toContain('123.456.789-01');
    expect(e.breadcrumbs![0].message).toContain('[CPF_REDACTED]');
  });

  it('redacts email in breadcrumb message (defense in depth)', () => {
    const e = scrubPII({
      breadcrumbs: [
        { message: 'POST /api/login user=joao@example.com status=401' },
      ],
    } as never);
    expect(e.breadcrumbs![0].message).not.toContain('joao@example.com');
    expect(e.breadcrumbs![0].message).toContain('[EMAIL_REDACTED]');
  });
});
