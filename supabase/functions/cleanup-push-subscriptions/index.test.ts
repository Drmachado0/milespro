// supabase/functions/cleanup-push-subscriptions/index.test.ts
//
// Phase 3 W2 (Plan 03-04b) — Deno tests for cleanup-push-subscriptions.
// Covers auth + 3 modes (single + signed_out + sweep) — Q2 RESOLVED for
// signed_out, D-T08 for sweep cadence.
//
// Run with:
//   deno test --allow-env --allow-net --allow-read \
//     supabase/functions/cleanup-push-subscriptions/index.test.ts

import {
  assertEquals,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

const CLEANUP_TOKEN = 'cleanup-test-' + 'x'.repeat(40);

Deno.env.set('PUSH_CLEANUP_AUTH_TOKEN', CLEANUP_TOKEN);
Deno.env.set('SUPABASE_URL', 'http://localhost:54321');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role');

const TEST_USER = 'aaaaaaaa-0000-0000-0000-000000000099';

Deno.test('cleanup-push-subscriptions — rejects missing Authorization → 401', async () => {
  const mod = await import('./index.ts');
  const req = new Request('http://localhost/functions/v1/cleanup-push-subscriptions', {
    method: 'POST',
    body: JSON.stringify({ user_id: TEST_USER, mode: 'single' }),
  });
  const res = await mod.handler(req);
  assertEquals(res.status, 401);
});

Deno.test('cleanup-push-subscriptions — rejects wrong Bearer → 401', async () => {
  const mod = await import('./index.ts');
  const req = new Request('http://localhost/functions/v1/cleanup-push-subscriptions', {
    method: 'POST',
    headers: { Authorization: 'Bearer WRONG_TOKEN_xxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
    body: JSON.stringify({ user_id: TEST_USER, mode: 'single' }),
  });
  const res = await mod.handler(req);
  assertEquals(res.status, 401);
});

Deno.test('cleanup-push-subscriptions — single mode requires user_id → 400', async () => {
  const mod = await import('./index.ts');
  const req = new Request('http://localhost/functions/v1/cleanup-push-subscriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${CLEANUP_TOKEN}` },
    body: JSON.stringify({ mode: 'single' }),
  });
  const res = await mod.handler(req);
  assertEquals(res.status, 400);
});

Deno.test('cleanup-push-subscriptions — signed_out mode requires user_id → 400 (Q2 RESOLVED, symmetric with single)', async () => {
  const mod = await import('./index.ts');
  const req = new Request('http://localhost/functions/v1/cleanup-push-subscriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${CLEANUP_TOKEN}` },
    body: JSON.stringify({ mode: 'signed_out' }),
  });
  const res = await mod.handler(req);
  assertEquals(res.status, 400);
});

Deno.test('cleanup-push-subscriptions — sweep mode passes auth + body validation (does not require user_id)', async () => {
  const mod = await import('./index.ts');
  const req = new Request('http://localhost/functions/v1/cleanup-push-subscriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${CLEANUP_TOKEN}` },
    body: JSON.stringify({ mode: 'sweep' }),
  });
  const res = await mod.handler(req);
  // The actual DELETE may fail because SUPABASE_URL is unreachable in the
  // unit env — that returns 500. We assert: NOT 401 (auth passed), NOT 400
  // (body shape OK — sweep does not require user_id).
  // Acceptable outcomes: 200 (live stack) or 500 (no live stack).
  assertEquals(res.status === 401 || res.status === 400, false);
});
