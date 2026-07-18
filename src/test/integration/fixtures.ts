import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { adminClient } from './adminClient';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

export const FREE_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'free@test.invalid',
};
export const PRO_USER = {
  id: '00000000-0000-0000-0000-000000000002',
  email: 'pro@test.invalid',
};
export const VIP_USER = {
  id: '00000000-0000-0000-0000-000000000003',
  email: 'vip@test.invalid',
};
export const PASSWORD = 'test-password-not-secret-12345';

export type TestUser = typeof FREE_USER;

/** Sign in as a test user; returns a fresh anon-key client with persistSession: false. */
export async function clientAs(user: TestUser) {
  const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: PASSWORD,
  });
  if (error) {
    throw new Error(
      `[fixtures.clientAs] signin failed for ${user.email}: ${error.message}`,
    );
  }
  return client;
}

/**
 * Seed a `travel_clients` row owned by the test user. Required because every
 * `travel_*` table has a NOT NULL `client_id REFERENCES travel_clients(id)`
 * (RESEARCH §Wave 0 Gaps line 1082).
 *
 * NOTE: `travel_clients` requires `cpf` (NOT NULL TEXT, no UNIQUE constraint
 * in the schema — see supabase/migrations/20251129133754_*.sql). We synthesize
 * a deterministic 11-char numeric string from the last segment of the user's
 * UUID so concurrent test runs across users get distinct values without
 * pulling in a CPF generator.
 *
 * Returns the inserted client id.
 */
export async function seedTravelClient(
  userId: string,
  label = 'integration-test-client',
): Promise<string> {
  // Build a stable, syntactically-CPF-shaped value (11 digits) from the UUID.
  // Replace non-digits in the user id and right-pad/truncate to 11 chars.
  const digits = userId.replace(/[^0-9]/g, '').padEnd(11, '0').slice(0, 11);
  const { data, error } = await adminClient
    .from('travel_clients')
    .insert({ user_id: userId, name: label, cpf: digits } as never)
    .select()
    .single();
  if (error) {
    throw new Error(`[fixtures.seedTravelClient] failed: ${error.message}`);
  }
  return (data as { id: string }).id;
}
