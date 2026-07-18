import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    '[integration/adminClient] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Did you forget to run `supabase status -o env >> .env.test` after `supabase start`?',
  );
}

// CRITICAL (Pitfall 1): persistSession: false avoids jsdom session collision with user clients.
export const adminClient = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
