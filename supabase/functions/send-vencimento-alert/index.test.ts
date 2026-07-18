// supabase/functions/send-vencimento-alert/index.test.ts
//
// Phase 3 W2 (Plan 03-04b) — Deno tests for send-vencimento-alert.
// Covers the pure `findUsersToAlert(...)` function (ROADMAP SC#4 + D-T06 #1)
// plus a handler-auth gate.
//
// Run with:
//   deno test --allow-env --allow-net --allow-read \
//     supabase/functions/send-vencimento-alert/index.test.ts

import {
  assertEquals,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { findUsersToAlert } from './index.ts';

const PRO_USER = 'aaaaaaaa-0000-0000-0000-000000000001';
const FREE_USER = 'bbbbbbbb-0000-0000-0000-000000000002';
const BALANCE_PRO = 'cccccccc-0000-0000-0000-000000000003';
const BALANCE_FREE = 'dddddddd-0000-0000-0000-000000000004';
const PROGRAM = 'eeeeeeee-0000-0000-0000-000000000005';

const NOW = new Date('2026-05-14T00:00:00Z').getTime();
const DAY = 24 * 60 * 60 * 1000;

Deno.test('findUsersToAlert — Free user is filtered out (Pro+ only per D-T06 #1)', () => {
  const result = findUsersToAlert(
    [{
      id: BALANCE_FREE,
      user_id: FREE_USER,
      program_id: PROGRAM,
      points: 50000,
      expires_at: new Date(NOW + 30 * DAY).toISOString(),
    }],
    [{ user_id: FREE_USER, alert_antecipation_days: 60 }],
    [{ user_id: FREE_USER, plan: 'free' }],
    NOW,
  );
  assertEquals(result.length, 0);
});

Deno.test('findUsersToAlert — Pro user with NULL alert_antecipation_days defaults to 60', () => {
  const result = findUsersToAlert(
    [{
      id: BALANCE_PRO,
      user_id: PRO_USER,
      program_id: PROGRAM,
      program_name: 'Smiles',
      points: 50000,
      expires_at: new Date(NOW + 50 * DAY).toISOString(),
    }],
    [],
    [{ user_id: PRO_USER, plan: 'pro' }],
    NOW,
  );
  assertEquals(result.length, 1);
  assertEquals(result[0].event_type, 'expiry_60d');
});

Deno.test('findUsersToAlert — balance expiring in 60 days → event_type=expiry_60d', () => {
  const result = findUsersToAlert(
    [{
      id: BALANCE_PRO,
      user_id: PRO_USER,
      program_id: PROGRAM,
      program_name: 'Smiles',
      points: 50000,
      expires_at: new Date(NOW + 50 * DAY).toISOString(),
    }],
    [{ user_id: PRO_USER, alert_antecipation_days: 60 }],
    [{ user_id: PRO_USER, plan: 'pro' }],
    NOW,
  );
  assertEquals(result.length, 1);
  assertEquals(result[0].event_type, 'expiry_60d');
  assertEquals(result[0].balance_id, BALANCE_PRO);
});

Deno.test('findUsersToAlert — balance expiring in 10 days → event_type=expiry_13d (urgent overrides antecipation)', () => {
  const result = findUsersToAlert(
    [{
      id: BALANCE_PRO,
      user_id: PRO_USER,
      program_id: PROGRAM,
      program_name: 'Smiles',
      points: 50000,
      expires_at: new Date(NOW + 10 * DAY).toISOString(),
    }],
    [{ user_id: PRO_USER, alert_antecipation_days: 60 }],
    [{ user_id: PRO_USER, plan: 'pro' }],
    NOW,
  );
  assertEquals(result.length, 1);
  assertEquals(result[0].event_type, 'expiry_13d');
});

Deno.test('findUsersToAlert — already-expired balance is excluded', () => {
  const result = findUsersToAlert(
    [{
      id: BALANCE_PRO,
      user_id: PRO_USER,
      program_id: PROGRAM,
      program_name: 'Smiles',
      points: 50000,
      expires_at: new Date(NOW - 5 * DAY).toISOString(),
    }],
    [{ user_id: PRO_USER, alert_antecipation_days: 60 }],
    [{ user_id: PRO_USER, plan: 'pro' }],
    NOW,
  );
  assertEquals(result.length, 0);
});

Deno.test('findUsersToAlert — VIP plan is also alerted (Pro+ inclusive)', () => {
  const result = findUsersToAlert(
    [{
      id: BALANCE_PRO,
      user_id: PRO_USER,
      program_id: PROGRAM,
      program_name: 'Smiles',
      points: 50000,
      expires_at: new Date(NOW + 50 * DAY).toISOString(),
    }],
    [{ user_id: PRO_USER, alert_antecipation_days: 60 }],
    [{ user_id: PRO_USER, plan: 'vip' }],
    NOW,
  );
  assertEquals(result.length, 1);
});

Deno.test('send-vencimento-alert handler — rejects missing auth → 401', async () => {
  Deno.env.set('PUSH_VENCIMENTO_AUTH_TOKEN', 'token-test-' + 'a'.repeat(40));
  Deno.env.set('SUPABASE_URL', 'http://localhost:54321');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-srk');
  Deno.env.set('PUSH_ENQUEUE_AUTH_TOKEN', 'enq-test-' + 'b'.repeat(40));

  const mod = await import('./index.ts');
  const resp = await mod.handler(
    new Request('http://localhost/functions/v1/send-vencimento-alert', {
      method: 'POST',
      body: '{}',
    }),
  );
  assertEquals(resp.status, 401);
});
