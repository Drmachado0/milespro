// supabase/functions/lgpd-delete/index.test.ts
//
// Plan 02-02 W1a — Deno tests for the LGPD delete-request/confirm endpoint
// (COMPL-02). Exercises the HMAC sign/verify round-trip + auth gating.
//
// Run with:
//   deno test --allow-env --allow-net supabase/functions/lgpd-delete/index.test.ts

import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

const TEST_SECRET = 'test-secret-deterministic-' + 'x'.repeat(40);

// Set required envs BEFORE the dynamic import so module-load-time reads pick them up.
Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role');
Deno.env.set('SUPABASE_ANON_KEY', 'test-anon-key');
Deno.env.set('LGPD_DELETE_TOKEN_SECRET', TEST_SECRET);

const TEST_USER = '00000000-0000-0000-0000-000000000001';

// --- Tests -----------------------------------------------------------------

Deno.test('lgpd-delete — signDeletionToken + verifyDeletionToken roundtrip', async () => {
  const mod = await import('./index.ts');
  const { signDeletionToken, verifyDeletionToken } = mod;
  assertExists(signDeletionToken, 'signDeletionToken export required');
  assertExists(verifyDeletionToken, 'verifyDeletionToken export required');

  const expiresAt = Date.now() + 60_000;
  const nonce = 'abcd'.repeat(16);
  const token = await signDeletionToken(TEST_USER, expiresAt, nonce, TEST_SECRET);
  assertExists(token);

  const verified = await verifyDeletionToken(token, TEST_USER, TEST_SECRET);
  assertExists(verified, 'fresh token must verify');
  assertEquals(verified!.userId, TEST_USER);
  assertEquals(verified!.expiresAt, expiresAt);
  assertEquals(verified!.nonce, nonce);
});

Deno.test('lgpd-delete — verifyDeletionToken rejects expired token with null', async () => {
  const mod = await import('./index.ts');
  const { signDeletionToken, verifyDeletionToken } = mod;

  const expiredAt = Date.now() - 60_000; // 1 minute ago
  const nonce = 'aaaa'.repeat(16);
  const token = await signDeletionToken(TEST_USER, expiredAt, nonce, TEST_SECRET);

  const verified = await verifyDeletionToken(token, TEST_USER, TEST_SECRET);
  assertEquals(verified, null, 'expired token must return null');
});

Deno.test('lgpd-delete — verifyDeletionToken rejects tampered signature', async () => {
  const mod = await import('./index.ts');
  const { signDeletionToken, verifyDeletionToken } = mod;

  const expiresAt = Date.now() + 60_000;
  const nonce = 'bbbb'.repeat(16);
  const token = await signDeletionToken(TEST_USER, expiresAt, nonce, TEST_SECRET);

  // Flip the first hex char of the HMAC half to invalidate the signature.
  const colon1 = token.indexOf(':');
  const hmac = token.slice(0, colon1);
  const rest = token.slice(colon1);
  const flipped = (hmac[0] === '0' ? '1' : '0') + hmac.slice(1);
  const tampered = `${flipped}${rest}`;

  const verified = await verifyDeletionToken(tampered, TEST_USER, TEST_SECRET);
  assertEquals(verified, null, 'tampered signature must return null');
});

Deno.test('lgpd-delete — verifyDeletionToken rejects token bound to different user', async () => {
  const mod = await import('./index.ts');
  const { signDeletionToken, verifyDeletionToken } = mod;

  const expiresAt = Date.now() + 60_000;
  const nonce = 'cccc'.repeat(16);
  const token = await signDeletionToken(TEST_USER, expiresAt, nonce, TEST_SECRET);

  // Verify against a DIFFERENT user id — HMAC payload binding must reject.
  const OTHER_USER = '00000000-0000-0000-0000-000000000002';
  const verified = await verifyDeletionToken(token, OTHER_USER, TEST_SECRET);
  assertEquals(verified, null, 'token bound to user A must not verify for user B');
});

Deno.test('lgpd-delete — rejects unauthenticated request with 401', async () => {
  const mod = await import('./index.ts');
  const handler = mod.handler ?? mod.default;
  assertExists(handler, 'handler export required');

  const req = new Request(
    'http://localhost/functions/v1/lgpd-delete?action=request',
    { method: 'POST', headers: { Origin: 'http://localhost:8080' } },
  );
  const res = await handler(req);
  assertEquals(res.status, 401);
});
