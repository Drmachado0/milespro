/**
 * Adversarial RLS test for the VIP multi-CPF surface (managed_accounts +
 * user_promo_alerts).
 *
 * Closes Gate G-AR-4 (Plan 02-06 W2b): proves the policies created in
 * supabase/migrations/20260512120004_create_managed_accounts_and_can_access_account.sql
 * (Phase 1, managed_accounts) and
 * supabase/migrations/20260515120003_user_promo_alerts.sql (Plan 02-06,
 * user_promo_alerts) actually block Free / Pro callers from writing /
 * reading rows they don't own.
 *
 * Scenario coverage (TIER-04..06 + TIER-03):
 *   1. Free SELECT managed_accounts                       → empty array
 *   2. Free INSERT managed_accounts                       → RLS error (42501)
 *   3. Pro INSERT managed_accounts                        → RLS error (42501)
 *   4. VIP INSERT managed_accounts with owner_user_id=self → succeeds
 *      (note: this is the direct REST path. In production the dialog calls
 *      the create-managed-account edge function which also creates the
 *      headless auth.users row; this test uses an already-existing fixture
 *      user id as the managed_user_id so the FK is satisfiable.)
 *   5. VIP INSERT managed_accounts with cross-owner       → RLS error (42501)
 *   6. user_promo_alerts SELECT by Free user              → empty array
 *   7. user_promo_alerts SELECT by Pro user               → succeeds (any
 *      length; empty until compute-personalized-promos populates)
 *
 * IMPORTANT: this file uses the `*.adversarial.test.ts` suffix so the vitest
 * "integration" project (vitest.config.ts) picks it up and the "unit" project
 * excludes it. Run via:
 *   npm test -- --project=integration --run
 *
 * Environment: requires a local Supabase stack with SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY exported (see
 * src/test/integration/setup.ts). When those envs are missing locally,
 * the file imports adminClient which already throws — CI's deno-tests +
 * integration jobs are the authoritative runners.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { adminClient } from '@/test/integration/adminClient';
import {
  FREE_USER,
  PRO_USER,
  VIP_USER,
  clientAs,
} from '@/test/integration/fixtures';

describe('VIP managed_accounts + user_promo_alerts adversarial RLS', () => {
  // We use FREE_USER.id as the cross-owner managed_user_id for the VIP-success
  // case (test #4). The schema disallows owner == managed (CHECK constraint
  // managed_accounts_no_self), so we need a *different* id; the FREE fixture
  // is already created by setup.ts and unrelated to VIP_USER.
  const MANAGED_TARGET_ID = FREE_USER.id;
  const CROSS_OWNER_ID = PRO_USER.id; // arbitrary other-user id for test #5

  // Clean up any rows we create so re-running the suite stays idempotent.
  afterAll(async () => {
    await adminClient
      .from('managed_accounts')
      .delete()
      .eq('owner_user_id', VIP_USER.id);
  }, 30_000);

  it('Free user SELECT managed_accounts returns empty', async () => {
    const client = await clientAs(FREE_USER);
    const { data, error } = await client.from('managed_accounts').select('*');
    expect(error).toBeNull();
    expect(Array.isArray(data) ? data.length : -1).toBe(0);
  });

  it('Free user INSERT managed_accounts returns 42501 (RLS)', async () => {
    const client = await clientAs(FREE_USER);
    const { error } = await client.from('managed_accounts').insert({
      owner_user_id: FREE_USER.id,
      managed_user_id: PRO_USER.id,
      label: 'free-attempt',
    } as never);
    expect(error).not.toBeNull();
    expect(error?.code).toBe('42501');
  });

  it('Pro user INSERT managed_accounts returns 42501 (RLS — VIP-only)', async () => {
    const client = await clientAs(PRO_USER);
    const { error } = await client.from('managed_accounts').insert({
      owner_user_id: PRO_USER.id,
      managed_user_id: VIP_USER.id,
      label: 'pro-attempt',
    } as never);
    expect(error).not.toBeNull();
    expect(error?.code).toBe('42501');
  });

  it('VIP user INSERT managed_accounts with owner_user_id = self succeeds', async () => {
    // Clean any prior row for this pair (idempotent re-run).
    await adminClient
      .from('managed_accounts')
      .delete()
      .eq('owner_user_id', VIP_USER.id)
      .eq('managed_user_id', MANAGED_TARGET_ID);

    const client = await clientAs(VIP_USER);
    const { data, error } = await client
      .from('managed_accounts')
      .insert({
        owner_user_id: VIP_USER.id,
        managed_user_id: MANAGED_TARGET_ID,
        label: 'vip-self-insert',
      } as never)
      .select()
      .single();
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('VIP user INSERT managed_accounts with owner_user_id != self returns 42501', async () => {
    const client = await clientAs(VIP_USER);
    const { error } = await client.from('managed_accounts').insert({
      owner_user_id: CROSS_OWNER_ID, // not VIP_USER.id
      managed_user_id: MANAGED_TARGET_ID,
      label: 'vip-cross-owner-attempt',
    } as never);
    expect(error).not.toBeNull();
    expect(error?.code).toBe('42501');
  });

  it('user_promo_alerts SELECT by Free user returns empty (Pro+ gate)', async () => {
    const client = await clientAs(FREE_USER);
    const { data, error } = await client.from('user_promo_alerts').select('*');
    // The select policy filters out everything; SELECT itself doesn't error,
    // it just returns zero rows. Either no error + empty, or an explicit
    // RLS denial — both are acceptable proofs of the gate.
    if (error) {
      expect(error.code).toBe('42501');
    } else {
      expect(Array.isArray(data) ? data.length : -1).toBe(0);
    }
  });

  it('user_promo_alerts SELECT by Pro user succeeds (possibly empty)', async () => {
    const client = await clientAs(PRO_USER);
    const { data, error } = await client.from('user_promo_alerts').select('*');
    expect(error).toBeNull();
    // Empty data is OK at this stage (compute-personalized-promos may or may
    // not have run for this user in the test DB). The contract is that the
    // SELECT itself does NOT return an RLS error for a Pro caller.
    expect(Array.isArray(data)).toBe(true);
  });
});
