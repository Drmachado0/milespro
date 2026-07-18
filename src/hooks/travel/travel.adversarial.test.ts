/**
 * Adversarial RLS test for every travel_* table.
 *
 * SEC-01 / SEC-02 / SEC-06 (Phase 1 ROADMAP SC #1):
 *   Prove the trust-kernel policies (Plan 05) actually block Free users
 *   from INSERTing into travel_* tables — and that Pro / VIP can.
 *
 * Also covers D-05 (soft-isolation downgrade):
 *   PRO writes a row -> admin downgrades to FREE -> SELECT still works (audit
 *   trail preserved) -> INSERT now blocks with 42501. Then restore PRO so
 *   subsequent describe.each iterations remain idempotent (Pitfall 6: re-signin
 *   AFTER admin update so the JWT carries the new plan).
 *
 * Test infrastructure: Wave 0 (Plan 01) — adminClient + clientAs + fixtures.
 *
 * IMPORTANT: this file uses `*.adversarial.test.ts` suffix so the vitest
 * "integration" project (vitest.config.ts) picks it up and the "unit" project
 * excludes it. Run via:
 *   npm test -- --project=integration --run
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { adminClient } from '@/test/integration/adminClient';
import {
  FREE_USER,
  PRO_USER,
  VIP_USER,
  clientAs,
  seedTravelClient,
} from '@/test/integration/fixtures';

interface AdvCase {
  table: string;
  sampleInsert: (userId: string, clientId: string) => Record<string, unknown>;
}

// One entry per travel_* table (other than travel_clients, which is the
// FK seed target). Field shape derived from the CREATE TABLE migrations:
//   travel_tickets:        20251129133754_*.sql
//   travel_hotel_reservations: 20251129133754_*.sql
//   travel_car_rentals:    20251129133754_*.sql
//   travel_cruises / travel_insurances / travel_attractions / travel_transfers:
//                          20260131123615_*.sql
//   travel_quotes:         20251211003239_*.sql
//   travel_receivables:    20251211005745_*.sql
//
// Each sampleInsert(uid, cid) provides every NOT NULL column that does not
// already have a DEFAULT, so the insert reaches the RLS check rather than
// failing on a NOT NULL violation earlier.
const TRAVEL_TABLES: AdvCase[] = [
  {
    table: 'travel_tickets',
    sampleInsert: (uid, cid) => ({
      user_id: uid,
      client_id: cid,
      origin: 'GRU',
      destination: 'GIG',
      airline: 'LATAM',
      flight_date: '2026-06-01',
      miles_used: 10000,
    }),
  },
  {
    table: 'travel_hotel_reservations',
    sampleInsert: (uid, cid) => ({
      user_id: uid,
      client_id: cid,
      hotel_name: 'Test Hotel',
      city: 'Sao Paulo',
      check_in: '2026-06-01',
      check_out: '2026-06-05',
      nights: 4,
      miles_used: 5000,
    }),
  },
  {
    table: 'travel_car_rentals',
    sampleInsert: (uid, cid) => ({
      user_id: uid,
      client_id: cid,
      rental_company: 'Localiza',
      pickup_location: 'GRU',
      dropoff_location: 'GIG',
      pickup_date: '2026-06-01',
      dropoff_date: '2026-06-03',
      days: 2,
      vehicle_category: 'compact',
      miles_used: 3000,
    }),
  },
  {
    table: 'travel_cruises',
    sampleInsert: (uid, cid) => ({
      user_id: uid,
      client_id: cid,
      cruise_line: 'MSC',
      ship_name: 'Seaside',
      cabin_type: 'inside',
      departure_port: 'Santos',
      arrival_port: 'Rio de Janeiro',
      departure_date: '2026-06-01',
      return_date: '2026-06-08',
    }),
  },
  {
    table: 'travel_insurances',
    sampleInsert: (uid, cid) => ({
      user_id: uid,
      client_id: cid,
      insurance_company: 'Assist Card',
      plan_name: 'Plano 60',
      destination: 'Europe',
      start_date: '2026-06-01',
      end_date: '2026-06-15',
    }),
  },
  {
    table: 'travel_attractions',
    sampleInsert: (uid, cid) => ({
      user_id: uid,
      client_id: cid,
      attraction_name: 'Cristo Redentor',
      city: 'Rio de Janeiro',
      activity_date: '2026-06-01',
    }),
  },
  {
    table: 'travel_transfers',
    sampleInsert: (uid, cid) => ({
      user_id: uid,
      client_id: cid,
      origin: 'GRU',
      destination: 'Hotel Tivoli',
      transfer_date: '2026-06-01',
    }),
  },
  {
    table: 'travel_quotes',
    sampleInsert: (uid, cid) => ({
      user_id: uid,
      client_id: cid,
      quote_number: 'Q-2026-0001',
      quote_type: 'ticket',
    }),
  },
  {
    table: 'travel_receivables',
    sampleInsert: (uid, cid) => ({
      user_id: uid,
      client_id: cid,
      description: 'Servico de emissao',
      due_date: '2026-06-15',
    }),
  },
];

let proClientId: string;
let vipClientId: string;
let freeClientId: string;

beforeAll(async () => {
  // travel_clients itself is plan-gated (Plan 05 Option A: has_plan('pro')),
  // so seed via the service-role admin client (bypasses RLS) to make rows
  // available for the FK on every other travel_* table.
  proClientId = await seedTravelClient(PRO_USER.id, 'pro-test-client');
  vipClientId = await seedTravelClient(VIP_USER.id, 'vip-test-client');
  freeClientId = await seedTravelClient(FREE_USER.id, 'free-test-client');
}, 30_000);

describe.each(TRAVEL_TABLES)('$table -- adversarial RLS', ({ table, sampleInsert }) => {
  it('FREE user INSERT is blocked with code 42501', async () => {
    const client = await clientAs(FREE_USER);
    const { data, error } = await client
      .from(table as never)
      .insert(sampleInsert(FREE_USER.id, freeClientId) as never);
    expect(error).not.toBeNull();
    expect(error?.code).toBe('42501');
    expect(data).toBeNull();
  });

  it('PRO user INSERT succeeds', async () => {
    const client = await clientAs(PRO_USER);
    const { data, error } = await client
      .from(table as never)
      .insert(sampleInsert(PRO_USER.id, proClientId) as never)
      .select()
      .single();
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('VIP user INSERT succeeds', async () => {
    const client = await clientAs(VIP_USER);
    const { data, error } = await client
      .from(table as never)
      .insert(sampleInsert(VIP_USER.id, vipClientId) as never)
      .select()
      .single();
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('soft-isolation downgrade (D-05): PRO writes -> downgrade -> SELECT works, INSERT blocks', async () => {
    // 1. PRO writes a row (will be visible after downgrade).
    let client = await clientAs(PRO_USER);
    const { data: row, error: insErrPro } = await client
      .from(table as never)
      .insert(sampleInsert(PRO_USER.id, proClientId) as never)
      .select()
      .single();
    expect(insErrPro).toBeNull();
    expect(row).toBeDefined();

    // 2. Admin downgrades PRO -> FREE.
    const { error: dErr } = await adminClient
      .from('user_subscriptions')
      .update({ plan: 'free' as const })
      .eq('user_id', PRO_USER.id);
    expect(dErr).toBeNull();

    // 3. Pitfall 6: re-sign-in so the new client carries a JWT minted AFTER
    //    the plan update. has_plan() reads user_subscriptions directly so
    //    the change is reflected on the next call regardless, but we keep the
    //    re-signin to mirror real client behaviour and avoid a stale-JWT trap.
    client = await clientAs(PRO_USER);

    // 4. SELECT still works on the pre-existing row (D-05 soft isolation —
    //    USING uses auth.uid() only).
    const { data: rows } = await client
      .from(table as never)
      .select('*')
      .eq('user_id', PRO_USER.id);
    expect(Array.isArray(rows) ? rows.length : 0).toBeGreaterThan(0);

    // 5. INSERT now blocks (WITH CHECK includes has_plan('pro')).
    const { error: insErrFree } = await client
      .from(table as never)
      .insert(sampleInsert(PRO_USER.id, proClientId) as never);
    expect(insErrFree?.code).toBe('42501');

    // 6. Restore PRO so the next describe.each iteration starts clean.
    const { error: rErr } = await adminClient
      .from('user_subscriptions')
      .update({ plan: 'pro' as const })
      .eq('user_id', PRO_USER.id);
    expect(rErr).toBeNull();
  });
});
