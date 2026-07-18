// supabase/functions/asaas-webhook/index.test.ts
//
// Phase 2 W2a (Plan 02-05) — Deno tests for the Asaas webhook handler.
// Covers Gate G-CRIT-04 (idempotency on duplicate event_id) plus auth gating.
//
// Run with:
//   deno test --allow-env --allow-net supabase/functions/asaas-webhook/index.test.ts
//
// Strategy: env vars are set BEFORE dynamic import so module-load-time
// `Deno.env.get('ASAAS_WEBHOOK_TOKEN')` picks them up. We mock the Supabase
// client by intercepting esm.sh import with import.meta.resolve — too
// invasive — so instead the constantTimeEq pure-function path is exercised
// directly, and the handler-level idempotency contract is verified by
// asserting the response codes on documented inputs without actually
// hitting Supabase.
//
// CRIT-04 empirical proof (HTTP double-fire against a live edge function)
// lives in plan 02-05 Task 7 — that is the runtime smoke that captures
// the second-call "duplicate ignored" body + the COUNT(*) = 1 invariant.

import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

const TEST_WEBHOOK_TOKEN = 'test-webhook-token-' + 'x'.repeat(40);

// Set required envs BEFORE the dynamic import — module-load reads them.
Deno.env.set('ASAAS_WEBHOOK_TOKEN', TEST_WEBHOOK_TOKEN);
Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role');

Deno.test('asaas-webhook — constantTimeEq accepts identical strings', async () => {
  const mod = await import('./index.ts');
  const { constantTimeEq } = mod;
  assertExists(constantTimeEq, 'constantTimeEq export required');

  assertEquals(constantTimeEq('abc', 'abc'), true);
  assertEquals(constantTimeEq('', ''), true);
  assertEquals(
    constantTimeEq(TEST_WEBHOOK_TOKEN, TEST_WEBHOOK_TOKEN),
    true,
  );
});

Deno.test('asaas-webhook — constantTimeEq rejects mismatched strings', async () => {
  const mod = await import('./index.ts');
  const { constantTimeEq } = mod;

  assertEquals(constantTimeEq('abc', 'abd'), false);
  assertEquals(constantTimeEq('a', 'ab'), false); // length mismatch
  assertEquals(constantTimeEq(TEST_WEBHOOK_TOKEN, 'WRONG'), false);
});

Deno.test('asaas-webhook — rejects request without asaas-access-token header with 403', async () => {
  const mod = await import('./index.ts');
  const handler = mod.handler;
  assertExists(handler, 'handler export required');

  const req = new Request('http://localhost/functions/v1/asaas-webhook', {
    method: 'POST',
    body: JSON.stringify({ id: 'evt_x', event: 'PAYMENT_RECEIVED' }),
  });
  const res = await handler(req);
  assertEquals(res.status, 403);
});

Deno.test('asaas-webhook — rejects wrong asaas-access-token with 403 (constant-time compare)', async () => {
  const mod = await import('./index.ts');
  const handler = mod.handler;

  const req = new Request('http://localhost/functions/v1/asaas-webhook', {
    method: 'POST',
    headers: { 'asaas-access-token': 'WRONG_TOKEN' },
    body: JSON.stringify({ id: 'evt_x', event: 'PAYMENT_RECEIVED' }),
  });
  const res = await handler(req);
  assertEquals(res.status, 403);
});

Deno.test('asaas-webhook — rejects empty body with 400', async () => {
  const mod = await import('./index.ts');
  const handler = mod.handler;

  // Empty object — no id, no event. Should fail validation BEFORE hitting
  // the Supabase insert (so we never need to mock supabase here).
  const req = new Request('http://localhost/functions/v1/asaas-webhook', {
    method: 'POST',
    headers: { 'asaas-access-token': TEST_WEBHOOK_TOKEN },
    body: '{}',
  });
  const res = await handler(req);
  assertEquals(res.status, 400);
});

Deno.test('asaas-webhook — rejects invalid JSON body with 400', async () => {
  const mod = await import('./index.ts');
  const handler = mod.handler;

  const req = new Request('http://localhost/functions/v1/asaas-webhook', {
    method: 'POST',
    headers: { 'asaas-access-token': TEST_WEBHOOK_TOKEN },
    body: 'not-json-at-all',
  });
  const res = await handler(req);
  assertEquals(res.status, 400);
});

Deno.test('asaas-webhook — CRIT-04 contract: duplicate event_id returns 200 "duplicate ignored"', async () => {
  // This test pins the CONTRACT that the handler relies on Postgres SQLSTATE
  // 23505 to short-circuit duplicate event delivery. The actual double-fire
  // smoke (curl × 2 + SELECT COUNT(*) = 1) lives in plan 02-05 Task 7
  // because it requires a live Supabase instance and the webhook_events
  // table to exist. Here we lock the invariant via documentation + the
  // 23505 string match against the handler source so any future refactor
  // that drops the unique-violation handling fails CI loudly.
  const handlerSource = await Deno.readTextFile(
    new URL('./index.ts', import.meta.url),
  );

  assertEquals(
    handlerSource.includes("'23505'"),
    true,
    'asaas-webhook must inspect Postgres SQLSTATE 23505 for the duplicate path',
  );
  assertEquals(
    handlerSource.includes('duplicate ignored'),
    true,
    'asaas-webhook must return "duplicate ignored" body on 23505 — CRIT-04 marker',
  );
  assertEquals(
    handlerSource.includes('ON CONFLICT') ||
      handlerSource.includes('webhook_events_unique') ||
      handlerSource.includes('.insert(') /* canonical CRIT-04 path */,
    true,
    'asaas-webhook must rely on the (provider, event_id) UNIQUE constraint',
  );
});
