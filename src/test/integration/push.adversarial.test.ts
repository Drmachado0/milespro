/**
 * Adversarial RLS test for push_subscriptions (Plan 03-04b — D-T08).
 *
 * Proves the policies created in
 * supabase/migrations/20260515120005_push_subscriptions.sql actually block
 * cross-user reads + writes, AND that the partial UNIQUE index
 * `push_subscriptions_user_token_uniq` prevents duplicate device_token rows
 * for the same user.
 *
 * Scenario coverage:
 *   1. Free user INSERT own push_subscriptions row → succeeds (no has_plan gate
 *      at table level — gating happens in enqueue-push, NOT in push_subscriptions)
 *   2. Free user INSERT cross-user row                   → SQLSTATE 42501
 *   3. Free user SELECT another user's tokens           → empty array (RLS denial)
 *   4. Pro user UPDATE own last_seen_at                  → succeeds
 *   5. Pro user UPDATE another user's row               → SQLSTATE 42501
 *   6. Same user INSERT duplicate device_token          → SQLSTATE 23505 unique violation
 *
 * IMPORTANT: this file uses the `*.adversarial.test.ts` suffix so the vitest
 * "integration" project (vitest.config.ts) picks it up and the "unit" project
 * excludes it. Run via:
 *   npm test -- --project=integration --run
 *
 * Environment: requires a local Supabase stack with SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY exported (see
 * src/test/integration/setup.ts).
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { adminClient } from '@/test/integration/adminClient';
import {
  FREE_USER,
  PRO_USER,
  clientAs,
} from '@/test/integration/fixtures';

describe('push_subscriptions adversarial RLS', () => {
  // Stable test tokens — using prefix `test-` so any prod sweep can identify
  // and ignore them. Tokens are NOT real FCM tokens; FCM would 404 if you
  // tried to send to them.
  const FREE_TOKEN_OWN = 'test-free-own-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const FREE_TOKEN_DUP = 'test-free-dup-token-bbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  const PRO_TOKEN_OWN = 'test-pro-own-token-ccccccccccccccccccccccccccccc';
  const CROSS_TOKEN = 'test-cross-token-ddddddddddddddddddddddddddddddd';

  // Idempotent cleanup — wipe any rows from prior runs before AND after.
  beforeAll(async () => {
    await adminClient
      .from('push_subscriptions')
      .delete()
      .in('user_id', [FREE_USER.id, PRO_USER.id]);
  }, 30_000);

  afterAll(async () => {
    await adminClient
      .from('push_subscriptions')
      .delete()
      .in('user_id', [FREE_USER.id, PRO_USER.id]);
  }, 30_000);

  it('Free user INSERT own push_subscriptions row succeeds (no has_plan gate at table)', async () => {
    const client = await clientAs(FREE_USER);
    const { data, error } = await client
      .from('push_subscriptions')
      .insert({
        user_id: FREE_USER.id,
        device_token: FREE_TOKEN_OWN,
        platform: 'ios',
        app_version: '1.0.0',
      } as never)
      .select()
      .single();
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('Free user INSERT cross-user push_subscriptions row returns 42501 (RLS)', async () => {
    const client = await clientAs(FREE_USER);
    const { error } = await client.from('push_subscriptions').insert({
      user_id: PRO_USER.id, // not self — RLS WITH CHECK should reject
      device_token: CROSS_TOKEN,
      platform: 'android',
    } as never);
    expect(error).not.toBeNull();
    expect(error?.code).toBe('42501');
  });

  it('Free user SELECT another user tokens returns empty array (RLS filter)', async () => {
    // Seed a PRO_USER row via admin client (bypasses RLS).
    await adminClient
      .from('push_subscriptions')
      .upsert(
        {
          user_id: PRO_USER.id,
          device_token: PRO_TOKEN_OWN,
          platform: 'ios',
        } as never,
        { onConflict: 'user_id,device_token' },
      );

    const client = await clientAs(FREE_USER);
    const { data, error } = await client
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', PRO_USER.id);
    // SELECT under RLS returns empty rather than 42501 because the policy
    // is a filter (USING clause), not a hard deny.
    expect(error).toBeNull();
    expect(Array.isArray(data) ? data.length : -1).toBe(0);
  });

  it('Pro user UPDATE own last_seen_at succeeds', async () => {
    // Ensure the row from the prior seed is in place.
    await adminClient
      .from('push_subscriptions')
      .upsert(
        {
          user_id: PRO_USER.id,
          device_token: PRO_TOKEN_OWN,
          platform: 'ios',
        } as never,
        { onConflict: 'user_id,device_token' },
      );

    const client = await clientAs(PRO_USER);
    const { error } = await client
      .from('push_subscriptions')
      .update({ last_seen_at: new Date().toISOString() } as never)
      .eq('user_id', PRO_USER.id)
      .eq('device_token', PRO_TOKEN_OWN);
    expect(error).toBeNull();
  });

  it('Pro user UPDATE another user row returns 42501 (cross-user denial)', async () => {
    // Ensure Free's row exists.
    await adminClient
      .from('push_subscriptions')
      .upsert(
        {
          user_id: FREE_USER.id,
          device_token: FREE_TOKEN_OWN,
          platform: 'ios',
        } as never,
        { onConflict: 'user_id,device_token' },
      );

    const client = await clientAs(PRO_USER);
    const { error, count } = await client
      .from('push_subscriptions')
      .update(
        { last_seen_at: new Date().toISOString() } as never,
        { count: 'exact' },
      )
      .eq('user_id', FREE_USER.id);
    // Under RLS, an UPDATE that matches zero rows (because USING filtered
    // them out for this caller) returns 0 affected rows rather than 42501.
    // 42501 occurs when WITH CHECK would be violated. The contract proof:
    // either an explicit RLS error OR count===0. Both are acceptable.
    if (error) {
      expect(error.code).toBe('42501');
    } else {
      expect(count ?? 0).toBe(0);
    }
  });

  it('Duplicate device_token for same user returns 23505 unique violation', async () => {
        // Garantia local de estado: remove a linha (user_id, FREE_TOKEN_DUP) caso
        // tenha sobrado de cenarios anteriores, para que o primeiro insert sempre
        // crie a linha base e o segundo sempre viole o indice unico parcial.
        await adminClient
          .from('push_subscriptions')
          .delete()
          .eq('user_id', FREE_USER.id)
          .eq('device_token', FREE_TOKEN_DUP);

        const client = await clientAs(FREE_USER);

        // Primeiro insert (sob RLS) — semeia a linha base.
        const firstInsert = await client.from('push_subscriptions').insert({
                user_id: FREE_USER.id,
                device_token: FREE_TOKEN_DUP,
                platform: 'ios',
        } as never);
        expect(firstInsert.error).toBeNull();

        // Segundo insert idêntico — deve violar push_subscriptions_user_token_uniq.
        const { error } = await client.from('push_subscriptions').insert({
                user_id: FREE_USER.id,
                device_token: FREE_TOKEN_DUP,
                platform: 'ios',
        } as never);
        expect(error).not.toBeNull();
        expect(error?.code).toBe('23505');
  });
});
