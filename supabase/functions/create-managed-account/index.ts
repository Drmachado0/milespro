/**
 * create-managed-account — Phase 2 W2b (Plan 02-06) / TIER-05.
 *
 * Lets a VIP user add a managed CPF (a 'profile-only' user that the VIP
 * controls). Flow:
 *   1. JWT-auth the caller via the standard Bearer header.
 *   2. Server-side `has_plan(caller, 'vip')` check (NOT client-trusted).
 *   3. Validate body { label, cpf (11 digits), full_name } via zod.
 *   4. CPF uniqueness check against public.profiles (HIGH-01 carry-over from W2a).
 *   5. supabase.auth.admin.createUser() to create a headless user with email
 *      `headless-<uuid>@managed.milespro.invalid` (RFC 6761 — .invalid is
 *      reserved for never-routing-anywhere addresses).
 *   6. Backfill the new profile (cpf, full_name) — the handle_new_user
 *      trigger already inserts the bare profile row.
 *   7. INSERT into public.managed_accounts(owner_user_id = caller,
 *      managed_user_id = headless.id, label). RLS WITH CHECK enforces
 *      auth.uid() = owner_user_id AND has_plan('vip'); since we're running
 *      under the service-role here, RLS doesn't actually fire — but the
 *      adversarial test (vip.adversarial.test.ts) proves that a client
 *      attempting the same INSERT via REST is blocked.
 *   8. On any failure post-step-5, best-effort delete the headless auth
 *      user to avoid orphans.
 *
 * Returns: { id, managed_user_id, label } on success.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  handleCorsPreflight,
  createCorsResponse,
  createCorsErrorResponse,
} from '../_shared/cors.ts';
import { parseAndValidate, z } from '../_shared/validate.ts';

const BodySchema = z.object({
  label: z.string().min(1).max(60),
  cpf: z.string().regex(/^\d{11}$/, '11 dígitos, sem máscara'),
  full_name: z.string().min(2).max(120),
});

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  // 1. JWT auth — extract token first (cheap; fail-fast on unauthenticated
  // requests before instantiating any clients with internal keep-alive timers).
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!jwt) {
    return createCorsErrorResponse('Authentication required', req, 401);
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return createCorsErrorResponse('Server misconfigured', req, 500);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
  const caller = userData?.user;
  if (userErr || !caller) {
    return createCorsErrorResponse('Invalid or expired token', req, 401);
  }

  // 2. Server-side VIP gate via the trust kernel.
  const { data: hasVip, error: planErr } = await (supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: boolean | null; error: { message: string } | null }>;
  }).rpc('has_plan', { _user_id: caller.id, _required_plan: 'vip' });

  if (planErr) {
    return createCorsErrorResponse(`has_plan check failed: ${planErr.message}`, req, 500);
  }
  if (!hasVip) {
    return createCorsErrorResponse('VIP plan required (TIER-05)', req, 403);
  }

  // 3. Validate body.
  const parsed = await parseAndValidate(req, BodySchema);
  if (!parsed.ok) {
    return createCorsErrorResponse(parsed.error, req, parsed.status);
  }
  const { label, cpf, full_name } = parsed.data;

  // 4. CPF uniqueness check (HIGH-01 — defense alongside the partial UNIQUE
  // index on profiles.cpf from W2a). The unique constraint will also reject
  // duplicates at INSERT time; we check upfront for a friendlier error.
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('cpf', cpf)
    .maybeSingle();

  if (existingProfile) {
    return createCorsErrorResponse(
      'CPF já cadastrado em outra conta MilesPro',
      req,
      409,
    );
  }

  // 5. Create the headless auth user. RFC 6761 reserves the `.invalid` TLD
  // for guaranteed-never-routable addresses; this prevents accidental email
  // delivery to a real domain. Email confirmation is set to true so the
  // user is fully usable from the start.
  const headlessEmail = `headless-${crypto.randomUUID()}@managed.milespro.invalid`;
  const { data: createdAuth, error: createErr } = await supabase.auth.admin.createUser({
    email: headlessEmail,
    email_confirm: true,
    user_metadata: {
      headless: true,
      owner_user_id: caller.id,
      full_name,
    },
  });

  if (createErr || !createdAuth?.user) {
    return createCorsErrorResponse(
      `Failed to create managed auth user: ${createErr?.message ?? 'unknown'}`,
      req,
      500,
    );
  }

  const managedUserId = createdAuth.user.id;

  // 6. Backfill the profile row (handle_new_user trigger creates the bare
  // row; we still set cpf + full_name explicitly because the trigger does
  // not have those fields available from the headless flow).
  const { error: profileErr } = await supabase
    .from('profiles')
    .upsert(
      {
        id: managedUserId,
        cpf,
        full_name,
      },
      { onConflict: 'id' },
    );

  if (profileErr) {
    // Cleanup the orphan auth user.
    await supabase.auth.admin.deleteUser(managedUserId).catch(() => undefined);
    return createCorsErrorResponse(
      `Failed to backfill profile: ${profileErr.message}`,
      req,
      500,
    );
  }

  // 7. Link the managed account.
  const { data: linkRow, error: linkErr } = await supabase
    .from('managed_accounts')
    .insert({
      owner_user_id: caller.id,
      managed_user_id: managedUserId,
      label,
    })
    .select('id, managed_user_id, label')
    .single();

  if (linkErr || !linkRow) {
    // Cleanup: drop the headless user so the next attempt is clean. The
    // profile row cascades on the auth.users delete.
    await supabase.auth.admin.deleteUser(managedUserId).catch(() => undefined);
    return createCorsErrorResponse(
      `Failed to link managed_account: ${linkErr?.message ?? 'unknown'}`,
      req,
      500,
    );
  }

  return createCorsResponse(
    {
      success: true,
      id: linkRow.id,
      managed_user_id: linkRow.managed_user_id,
      label: linkRow.label,
    },
    req,
    200,
  );
}

if (import.meta.main) {
  Deno.serve(handler);
}
