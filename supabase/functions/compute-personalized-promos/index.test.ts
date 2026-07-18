// supabase/functions/compute-personalized-promos/index.test.ts
//
// Phase 2 W2b (Plan 02-06) — Deno tests for the personalized-promo cron.
// Covers auth gating + pure-function match math (no live Supabase required).
//
// Run with:
//   deno test --allow-env --allow-net --allow-read \
//     supabase/functions/compute-personalized-promos/index.test.ts

import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

const TEST_TOKEN = 'test-promo-compute-' + 'x'.repeat(32);

Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role');
Deno.env.set('PROMO_COMPUTE_AUTH_TOKEN', TEST_TOKEN);

Deno.test('compute-personalized-promos — rejects request without bearer token with 403', async () => {
  const mod = await import('./index.ts');
  const handler = mod.handler;
  assertExists(handler, 'handler export required');

  const req = new Request('http://localhost/functions/v1/compute-personalized-promos', {
    method: 'POST',
  });
  const res = await handler(req);
  assertEquals(res.status, 403);
});

Deno.test('compute-personalized-promos — rejects wrong bearer token with 403 (constant-time)', async () => {
  const mod = await import('./index.ts');
  const handler = mod.handler;

  const req = new Request('http://localhost/functions/v1/compute-personalized-promos', {
    method: 'POST',
    headers: { Authorization: 'Bearer WRONG_TOKEN' },
  });
  const res = await handler(req);
  assertEquals(res.status, 403);
});

Deno.test('compute-personalized-promos — matchPromosForUser returns empty when user has no matching program', async () => {
  const mod = await import('./index.ts');
  const { matchPromosForUser } = mod;
  assertExists(matchPromosForUser, 'matchPromosForUser export required');

  const matches = matchPromosForUser(
    'user-1',
    [{ program_name: 'Smiles' }],
    [
      {
        id: 'promo-a',
        from_program: 'Livelo',
        to_program: 'TudoAzul',
        bonus_pct: 100,
      },
    ],
  );
  assertEquals(matches.length, 0);
});

Deno.test('compute-personalized-promos — matchPromosForUser surfaces promo when user has the from_program', async () => {
  const mod = await import('./index.ts');
  const { matchPromosForUser } = mod;

  const matches = matchPromosForUser(
    'user-1',
    [
      { program_name: 'Livelo' },
      { program_name: 'Esfera' },
    ],
    [
      {
        id: 'promo-a',
        from_program: 'Livelo',
        to_program: 'Smiles',
        bonus_pct: 80,
        starts_at: '2026-05-13T00:00:00Z',
        ends_at: '2026-05-20T23:59:59Z',
      },
      {
        id: 'promo-b',
        from_program: 'Bradesco',
        to_program: 'Latam Pass',
        bonus_pct: 100,
      },
    ],
  );
  assertEquals(matches.length, 1);
  assertEquals(matches[0].promo_id, 'promo-a');
  assertEquals(matches[0].from_program, 'livelo');
  assertEquals(matches[0].to_program, 'smiles');
  assertEquals(matches[0].bonus_pct, 80);
});

Deno.test('compute-personalized-promos — matchPromosForUser falls back to legacy promotion shape (program/bonus_target)', async () => {
  const mod = await import('./index.ts');
  const { matchPromosForUser } = mod;

  const matches = matchPromosForUser(
    'user-1',
    [{ program_name: 'Esfera' }],
    [
      {
        id: 'legacy-promo',
        program: 'Esfera',
        bonus_target: 'TudoAzul',
        bonus_pct: 50,
      },
    ],
  );
  assertEquals(matches.length, 1);
  assertEquals(matches[0].from_program, 'esfera');
  assertEquals(matches[0].to_program, 'tudoazul');
  assertEquals(matches[0].bonus_pct, 50);
});

Deno.test('compute-personalized-promos — matchPromosForUser coerces invalid bonus_pct to 0', async () => {
  const mod = await import('./index.ts');
  const { matchPromosForUser } = mod;

  const matches = matchPromosForUser(
    'user-1',
    [{ program_name: 'Livelo' }],
    [
      {
        id: 'bad-promo',
        from_program: 'Livelo',
        to_program: 'Smiles',
        bonus_pct: NaN as unknown as number,
      },
    ],
  );
  assertEquals(matches.length, 1);
  assertEquals(matches[0].bonus_pct, 0);
});
