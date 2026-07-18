// supabase/functions/create-checkout-session/index.test.ts
//
// Phase 2 W2a (Plan 02-05) — Deno tests for create-checkout-session.
// Covers auth gating, body validation, and D-03 7-day trial-window math.
//
// Run with:
//   deno test --allow-env --allow-net --allow-read \
//     supabase/functions/create-checkout-session/index.test.ts

import {
  assertEquals,
  assertExists,
  assertMatch,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

// Set required envs BEFORE the dynamic import.
Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role');
Deno.env.set('ASAAS_API_KEY', 'test-asaas-key');
Deno.env.set('ASAAS_ENV', 'sandbox');

Deno.test('create-checkout-session — computeNextDueDate is today + 7 days (D-03)', async () => {
  const mod = await import('./index.ts');
  const { computeNextDueDate } = mod;
  assertExists(computeNextDueDate, 'computeNextDueDate export required');

  // Pin to a fixed reference date — 2026-05-13 (BR locale) → +7 = 2026-05-20.
  const reference = new Date('2026-05-13T12:00:00Z');
  const nextDue = computeNextDueDate(reference);
  assertEquals(nextDue, '2026-05-20', 'nextDueDate must be exactly 7 days after reference');

  // Format check: YYYY-MM-DD (Asaas wants date-only, not ISO).
  assertMatch(nextDue, /^\d{4}-\d{2}-\d{2}$/);
});

Deno.test('create-checkout-session — computeNextDueDate crosses month boundary correctly', async () => {
  const mod = await import('./index.ts');
  const { computeNextDueDate } = mod;

  // 2026-05-28 + 7 = 2026-06-04 (across month boundary)
  const reference = new Date('2026-05-28T12:00:00Z');
  assertEquals(computeNextDueDate(reference), '2026-06-04');
});

Deno.test('create-checkout-session — computeNextDueDate crosses year boundary correctly', async () => {
  const mod = await import('./index.ts');
  const { computeNextDueDate } = mod;

  // 2026-12-29 + 7 = 2027-01-05
  const reference = new Date('2026-12-29T12:00:00Z');
  assertEquals(computeNextDueDate(reference), '2027-01-05');
});

Deno.test('create-checkout-session — rejects unauthenticated request with 401', async () => {
  const mod = await import('./index.ts');
  const handler = mod.handler;
  assertExists(handler, 'handler export required');

  const req = new Request('http://localhost/functions/v1/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:8080' },
    body: JSON.stringify({ plan: 'pro', cycle: 'monthly' }),
  });
  const res = await handler(req);
  assertEquals(res.status, 401);
});

Deno.test('create-checkout-session — source contains required price constants', async () => {
  // Lock the D-01 / D-02 price + cycle taxonomy at compile time. Any future
  // refactor that breaks these markers fails CI loudly. Real per-row math
  // is exercised in the smoke test against sandbox.
  const src = await Deno.readTextFile(
    new URL('./index.ts', import.meta.url),
  );

  // D-01 pricing
  assertEquals(src.includes('37.90'), true, 'pro monthly price');
  assertEquals(src.includes('67.90'), true, 'vip monthly price');
  assertEquals(src.includes('203.46'), true, 'pro semiannual price');
  assertEquals(src.includes('365.10'), true, 'vip semiannual price');
  assertEquals(src.includes('363.84'), true, 'pro annual price');
  assertEquals(src.includes('652.32'), true, 'vip annual price');

  // D-02 cycles
  assertEquals(src.includes('MONTHLY'), true, 'Asaas monthly enum');
  assertEquals(src.includes('SEMIANNUALLY'), true, 'Asaas semiannual enum');
  assertEquals(src.includes('YEARLY'), true, 'Asaas yearly enum');

  // MED-01 locale
  assertEquals(src.includes("'pt-BR'"), true, 'pt-BR preferredLocale');

  // PAY-08 NFS-e gate. The earlier assertion locked the literal `invoice:
  // { enabled: false }` from when sandbox always disabled NFS-e. Plan 02-07
  // turned NFS-e into a runtime decision via INVOICE_ENABLED (true when
  // ASAAS_ENV === 'production', false otherwise) and the call site became
  // `...(INVOICE_ENABLED ? { invoice: { enabled: true } } : {})`. So the
  // string-grep target moved. Re-lock the two markers that today's source
  // is required to expose: the gate name and the payload shape.
  assertEquals(src.includes('INVOICE_ENABLED'), true, 'PAY-08 invoice gate present');
  assertEquals(
    src.includes('invoice: { enabled: true }') || src.includes('invoice:{enabled:true}'),
    true,
    'PAY-08 invoice payload present',
  );

  // externalReference for webhook correlation (CRIT-04 + mrr-dashboard contract)
  assertEquals(src.includes('externalReference'), true, 'externalReference set');
});
