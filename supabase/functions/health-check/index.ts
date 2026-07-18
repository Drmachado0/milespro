import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflight, createCorsResponse } from '../_shared/cors.ts';

const HANDLER = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return handleCorsPreflight(req);

  // Anon-key read-only probe — stateless per request. Disabling
  // autoRefreshToken + persistSession removes the setInterval leak that
  // Deno strict tests flag, and there's no session/refresh token to keep
  // alive on a one-shot health endpoint anyway.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  let dbStatus = 'ok';
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1).maybeSingle();
    if (error && error.code !== 'PGRST116') dbStatus = 'degraded';
  } catch {
    dbStatus = 'error';
  }

  return createCorsResponse({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    supabase_status: dbStatus,
    service: 'milespro-hub',
  }, req);
};

serve(HANDLER);
