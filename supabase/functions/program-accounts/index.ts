/**
 * program-accounts edge function.
 *
 * Wraps CRUD on the `program_accounts` table so that the `password_encrypted`
 * column is stored using AES-GCM (via _shared/crypto.ts) instead of being
 * accepted as plaintext from the client. The column name is preserved for
 * backwards compatibility, but the value is always real ciphertext.
 *
 * Actions (POST body):
 *   { action: 'list' }
 *   { action: 'get',    id }
 *   { action: 'create', program, login, password?, holder_id?, notes? }
 *   { action: 'update', id, program?, login?, password?, holder_id?, notes? }
 *   { action: 'delete', id }
 *
 * The `password` field is optional. When omitted on update, the existing
 * stored password is left untouched. When the caller asks for `get`, the
 * response includes `password` (decrypted) so the UI can display it. `list`
 * never returns passwords — only metadata.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { parseAndValidate, z } from '../_shared/validate.ts';
import { encryptString, decryptString } from '../_shared/crypto.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const accountFields = {
  program: z.string().min(1).max(100),
  login: z.string().min(1).max(255),
  password: z.string().max(500).optional(),
  holder_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
};

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('list') }),
  z.object({ action: z.literal('get'), id: z.string().uuid() }),
  z.object({ action: z.literal('create'), ...accountFields }),
  z.object({
    action: z.literal('update'),
    id: z.string().uuid(),
    program: accountFields.program.optional(),
    login: accountFields.login.optional(),
    password: accountFields.password,
    holder_id: accountFields.holder_id,
    notes: accountFields.notes,
  }),
  z.object({ action: z.literal('delete'), id: z.string().uuid() }),
]);

export async function handler(req: Request): Promise<Response> {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return handleCorsPreflight(req);

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Unauthorized' }, 401, corsHeaders);
    }
    const { data: userData, error: authErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (authErr || !userData.user) {
      return json({ error: 'Unauthorized' }, 401, corsHeaders);
    }
    const userId = userData.user.id;

    const validated = await parseAndValidate(req, bodySchema);
    if (!validated.ok) {
      return json({ error: validated.error }, validated.status, corsHeaders);
    }
    const body = validated.data;

    if (body.action === 'list') {
      const { data, error } = await supabase
        .from('program_accounts')
        .select('id, program, login, holder_id, notes, created_at, updated_at')
        .eq('user_id', userId)
        .order('program', { ascending: true });
      if (error) return json({ error: error.message }, 500, corsHeaders);
      return json({ accounts: data ?? [] }, 200, corsHeaders);
    }

    if (body.action === 'get') {
      const { data, error } = await supabase
        .from('program_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('id', body.id)
        .maybeSingle();
      if (error) return json({ error: error.message }, 500, corsHeaders);
      if (!data) return json({ error: 'Not found' }, 404, corsHeaders);
      const password = await decryptString(data.password_encrypted);
      return json(
        {
          id: data.id,
          program: data.program,
          login: data.login,
          holder_id: data.holder_id,
          notes: data.notes,
          password,
          created_at: data.created_at,
          updated_at: data.updated_at,
        },
        200,
        corsHeaders,
      );
    }

    if (body.action === 'create') {
      const password_encrypted = body.password
        ? await encryptString(body.password)
        : null;
      const { data, error } = await supabase
        .from('program_accounts')
        .insert({
          user_id: userId,
          program: body.program,
          login: body.login,
          password_encrypted,
          holder_id: body.holder_id ?? null,
          notes: body.notes ?? null,
        })
        .select('id')
        .single();
      if (error) return json({ error: error.message }, 500, corsHeaders);
      return json({ id: data.id }, 200, corsHeaders);
    }

    if (body.action === 'update') {
      const updates: Record<string, unknown> = {};
      if (body.program !== undefined) updates.program = body.program;
      if (body.login !== undefined) updates.login = body.login;
      if (body.holder_id !== undefined) updates.holder_id = body.holder_id;
      if (body.notes !== undefined) updates.notes = body.notes;
      if (body.password !== undefined) {
        updates.password_encrypted = body.password
          ? await encryptString(body.password)
          : null;
      }
      const { error } = await supabase
        .from('program_accounts')
        .update(updates)
        .eq('user_id', userId)
        .eq('id', body.id);
      if (error) return json({ error: error.message }, 500, corsHeaders);
      return json({ success: true }, 200, corsHeaders);
    }

    if (body.action === 'delete') {
      const { error } = await supabase
        .from('program_accounts')
        .delete()
        .eq('user_id', userId)
        .eq('id', body.id);
      if (error) return json({ error: error.message }, 500, corsHeaders);
      return json({ success: true }, 200, corsHeaders);
    }

    return json({ error: 'Unsupported action' }, 400, corsHeaders);
  } catch (err) {
    console.error('program-accounts error:', err);
    return json(
      { error: 'Internal error' },
      500,
      getCorsHeaders(req),
    );
  }
}

function json(payload: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

if (import.meta.main) {
  Deno.serve(handler);
}
