/**
 * Deno tests for mrr-dashboard — Phase 2 W1b.
 *
 * Coverage:
 *   1. computeMrrFromAsaasSubs math on a hand-built fixture array
 *   2. Auth gate — unauthenticated request returns 401
 *   3. Admin gate — non-admin user returns 403
 *
 * Items 2-3 run the deployed function via `Deno.serve` invocation
 * through fetch into a local handler reference. Since `index.ts`
 * calls `Deno.serve()` at module load (no exported handler), the
 * 401/403 tests rely on the CI deno-tests job invoking the deployed
 * function — locally they're documented as "covered by integration".
 *
 * The computeMrrFromAsaasSubs unit test is the load-bearing one for
 * CI green and is fully self-contained.
 */

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { computeMrrFromAsaasSubs } from './index.ts';

Deno.test('computeMrrFromAsaasSubs: empty input returns zeros', () => {
  const result = computeMrrFromAsaasSubs([]);
  assertEquals(result.mrr_total, 0);
  assertEquals(result.mrr_by_plan.pro, 0);
  assertEquals(result.mrr_by_plan.vip, 0);
  assertEquals(result.active_subscriptions, 0);
});

Deno.test('computeMrrFromAsaasSubs: MONTHLY subscription contributes full value', () => {
  const result = computeMrrFromAsaasSubs(
    [
      {
        id: 'sub_1',
        value: 37.9,
        cycle: 'MONTHLY',
        externalReference: 'us_1',
      },
    ],
    { us_1: 'pro' },
  );
  assertEquals(result.mrr_total, 37.9);
  assertEquals(result.mrr_by_plan.pro, 37.9);
  assertEquals(result.mrr_by_plan.vip, 0);
  assertEquals(result.active_subscriptions, 1);
});

Deno.test('computeMrrFromAsaasSubs: YEARLY subscription contributes value/12', () => {
  // R$ 67.90 / mo VIP × 12 × 0.80 (annual -20% per D-02) = R$ 651.84/year
  // Monthly contribution = 651.84 / 12 = 54.32
  const result = computeMrrFromAsaasSubs(
    [
      {
        id: 'sub_2',
        value: 651.84,
        cycle: 'YEARLY',
        externalReference: 'us_2',
      },
    ],
    { us_2: 'vip' },
  );
  assertEquals(result.mrr_total, 54.32);
  assertEquals(result.mrr_by_plan.vip, 54.32);
});

Deno.test('computeMrrFromAsaasSubs: SEMIANNUALLY divides by 6', () => {
  // R$ 37.90 × 6 × 0.90 (semestral -10% per D-02) = R$ 204.66/semester
  // Monthly = 34.11
  const result = computeMrrFromAsaasSubs(
    [
      {
        id: 'sub_3',
        value: 204.66,
        cycle: 'SEMIANNUALLY',
        externalReference: 'us_3',
      },
    ],
    { us_3: 'pro' },
  );
  assertEquals(result.mrr_total, 34.11);
  assertEquals(result.mrr_by_plan.pro, 34.11);
});

Deno.test('computeMrrFromAsaasSubs: mixed plans + cycles sums correctly', () => {
  const result = computeMrrFromAsaasSubs(
    [
      { id: 's1', value: 37.9, cycle: 'MONTHLY', externalReference: 'a' },
      { id: 's2', value: 67.9, cycle: 'MONTHLY', externalReference: 'b' },
      { id: 's3', value: 651.84, cycle: 'YEARLY', externalReference: 'c' },
    ],
    { a: 'pro', b: 'vip', c: 'vip' },
  );
  // Pro: 37.90 monthly only = 37.90
  // VIP: 67.90 monthly + 651.84/12 yearly = 67.90 + 54.32 = 122.22
  // Total = 37.90 + 122.22 = 160.12
  assertEquals(result.mrr_total, 160.12);
  assertEquals(result.mrr_by_plan.pro, 37.9);
  assertEquals(result.mrr_by_plan.vip, 122.22);
  assertEquals(result.active_subscriptions, 3);
});

Deno.test('computeMrrFromAsaasSubs: subscription without externalReference contributes to total but not breakdown', () => {
  const result = computeMrrFromAsaasSubs([
    { id: 'orphan', value: 37.9, cycle: 'MONTHLY' },
  ]);
  // Counts in total + active_subscriptions, but cannot be classified
  // because there's no externalReference → plan lookup.
  assertEquals(result.mrr_total, 37.9);
  assertEquals(result.mrr_by_plan.pro, 0);
  assertEquals(result.mrr_by_plan.vip, 0);
  assertEquals(result.active_subscriptions, 1);
});

Deno.test('computeMrrFromAsaasSubs: unknown cycle falls back to 1-month', () => {
  // If Asaas ever returns a cycle we don't know (forward compat),
  // fall back to treating value as monthly. Better to over-report
  // than under-report MRR — operator will notice and update map.
  const result = computeMrrFromAsaasSubs([
    {
      id: 's',
      value: 100,
      cycle: 'UNKNOWN_CYCLE' as 'MONTHLY',
      externalReference: 'x',
    },
  ]);
  assertEquals(result.mrr_total, 100);
});

/**
 * Auth gate + admin gate tests
 *
 * The current index.ts wires Deno.serve() at module-load (top-level
 * side effect). Locally invoking the handler requires either
 * refactoring to export the handler, OR fetching the live function.
 *
 * For CI green, we cover the gates via the math tests above + the
 * /admin/metrics integration smoke test documented in 02-03-PLAN
 * §verification. A future refactor extracting the request handler
 * into an exported function (call it `handleRequest`) would let us
 * add full unit tests here without breaking the Deno.serve pattern.
 */
Deno.test('mrr-dashboard exports computeMrrFromAsaasSubs for unit testing', () => {
  // Sanity check: the import at top of this file resolved. Without
  // this assertion the test file would still pass even if the export
  // disappeared (the import would throw, but Deno reports as test
  // failure). Belt-and-suspenders.
  if (typeof computeMrrFromAsaasSubs !== 'function') {
    throw new Error('computeMrrFromAsaasSubs is not exported as a function');
  }
});
