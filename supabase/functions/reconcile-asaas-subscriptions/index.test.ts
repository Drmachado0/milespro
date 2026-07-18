// supabase/functions/reconcile-asaas-subscriptions/index.test.ts
//
// Phase 2 W2a (Plan 02-05) — Deno tests for the daily reconcile cron.
// Covers auth gating + pure-function drift math (no live Asaas required).
//
// Run with:
//   deno test --allow-env --allow-net --allow-read \
//     supabase/functions/reconcile-asaas-subscriptions/index.test.ts

import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

const TEST_TOKEN = 'test-reconcile-' + 'x'.repeat(40);

Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role');
Deno.env.set('ASAAS_API_KEY', 'test-asaas-key');
Deno.env.set('ASAAS_RECONCILE_AUTH_TOKEN', TEST_TOKEN);

Deno.test('reconcile — rejects request without bearer token with 403', async () => {
  const mod = await import('./index.ts');
  const handler = mod.handler;
  assertExists(handler, 'handler export required');

  const req = new Request('http://localhost/functions/v1/reconcile-asaas-subscriptions', {
    method: 'POST',
  });
  const res = await handler(req);
  assertEquals(res.status, 403);
});

Deno.test('reconcile — rejects wrong bearer token with 403 (constant-time)', async () => {
  const mod = await import('./index.ts');
  const handler = mod.handler;

  const req = new Request('http://localhost/functions/v1/reconcile-asaas-subscriptions', {
    method: 'POST',
    headers: { Authorization: 'Bearer WRONG_TOKEN' },
  });
  const res = await handler(req);
  assertEquals(res.status, 403);
});

Deno.test('reconcile — computeDrift returns zero drift when sets match exactly', async () => {
  const mod = await import('./index.ts');
  const { computeDrift } = mod;
  assertExists(computeDrift, 'computeDrift export required');

  const asaasSubs = [
    { id: 'sub_001', externalReference: 'ext_001' },
    { id: 'sub_002', externalReference: 'ext_002' },
  ];
  const dbActive = [
    { id: 'ext_001', user_id: 'u1', asaas_subscription_id: 'sub_001', status: 'active', plan: 'pro' },
    { id: 'ext_002', user_id: 'u2', asaas_subscription_id: 'sub_002', status: 'active', plan: 'vip' },
  ];

  const drift = computeDrift(asaasSubs, dbActive);
  assertEquals(drift.drift_count, 0);
  assertEquals(drift.drift_pct, 0);
  assertEquals(drift.asaas_count, 2);
  assertEquals(drift.db_count, 2);
  assertEquals(drift.only_in_asaas.length, 0);
  assertEquals(drift.only_in_db.length, 0);
});

Deno.test('reconcile — computeDrift catches Asaas-only orphan (missed webhook)', async () => {
  const mod = await import('./index.ts');
  const { computeDrift } = mod;

  const asaasSubs = [
    { id: 'sub_001' },
    { id: 'sub_002' }, // Asaas says active; DB has not flipped is_active yet
  ];
  const dbActive = [
    { id: 'ext_001', user_id: 'u1', asaas_subscription_id: 'sub_001', status: 'active', plan: 'pro' },
  ];

  const drift = computeDrift(asaasSubs, dbActive);
  assertEquals(drift.drift_count, 1);
  assertEquals(drift.only_in_asaas, ['sub_002']);
  assertEquals(drift.only_in_db.length, 0);
  // 1 out of 2 Asaas subs → 50% drift
  assertEquals(drift.drift_pct, 50);
});

Deno.test('reconcile — computeDrift catches DB-only orphan (missed cancellation)', async () => {
  const mod = await import('./index.ts');
  const { computeDrift } = mod;

  const asaasSubs = [
    { id: 'sub_001' },
  ];
  const dbActive = [
    { id: 'ext_001', user_id: 'u1', asaas_subscription_id: 'sub_001', status: 'active', plan: 'pro' },
    { id: 'ext_002', user_id: 'u2', asaas_subscription_id: 'sub_orphan', status: 'active', plan: 'vip' },
  ];

  const drift = computeDrift(asaasSubs, dbActive);
  assertEquals(drift.drift_count, 1);
  assertEquals(drift.only_in_asaas.length, 0);
  assertEquals(drift.only_in_db, ['sub_orphan']);
  // 1 orphan over 1 total Asaas → 100% drift
  assertEquals(drift.drift_pct, 100);
});

Deno.test('reconcile — source contains drift threshold marker (>5%)', async () => {
  const src = await Deno.readTextFile(
    new URL('./index.ts', import.meta.url),
  );

  // Threshold contract — RESEARCH §2.8 calls 5% as the alert line.
  assertEquals(
    src.includes('drift_pct > 5') || src.includes('drift.drift_pct > 5'),
    true,
    'reconcile must alert Sentry at >5% drift',
  );

  // Asaas endpoint contract — must page status=ACTIVE.
  assertEquals(
    src.includes('/subscriptions?status=ACTIVE'),
    true,
    'reconcile must page status=ACTIVE',
  );

  // Pagination contract — must respect hasMore=false break.
  assertEquals(src.includes('hasMore'), true, 'reconcile must paginate via hasMore');
});
