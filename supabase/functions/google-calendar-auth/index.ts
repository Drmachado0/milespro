import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { parseAndValidate, z } from '../_shared/validate.ts';
import { encrypt, decrypt, looksEncrypted } from '../_shared/crypto.ts';
import { timingSafeEq } from '../_shared/timingSafeEq.ts';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY');
// SEC-03 / D-10 step 2: OAUTH_STATE_SECRET is the SOLE source of the HMAC secret.
// The PR-window fallback to SUPABASE_SERVICE_ROLE_KEY (Plan 03) has been removed
// in Plan 06 (>10 min after the dual-read deploy, ensuring all in-flight states
// have expired -- state TTL is 10 min, see line 156). Service-role key rotation
// no longer affects OAuth state verification.
const STATE_SIGNING_SECRET = Deno.env.get('OAUTH_STATE_SECRET');
if (!STATE_SIGNING_SECRET) {
  throw new Error(
    'OAUTH_STATE_SECRET not configured. Set via: supabase secrets set OAUTH_STATE_SECRET=$(openssl rand -hex 32)',
  );
}

const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

const initBodySchema = z.object({
  redirect_url: z.string().url().max(2000).optional(),
});

const stateSchema = z.object({
  user_id: z.string().uuid(),
  redirect_url: z.string().url().max(2000),
  nonce: z.string().min(16).max(128),
  ts: z.number().int().positive(),
});

// Base64url helpers
function b64urlEncode(bytes: Uint8Array): string {
  const s = btoa(String.fromCharCode(...bytes));
  return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function b64urlEncodeStr(str: string): string {
  return b64urlEncode(new TextEncoder().encode(str));
}
function b64urlDecodeStr(str: string): string {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return atob(b64);
}

async function hmacSign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(STATE_SIGNING_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return b64urlEncode(new Uint8Array(sig));
}

export async function signState(data: object): Promise<string> {
  const payload = b64urlEncodeStr(JSON.stringify(data));
  const sig = await hmacSign(payload);
  return `${payload}.${sig}`;
}

export async function verifyState(token: string): Promise<unknown | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = await hmacSign(payload);
  if (!timingSafeEq(sig, expected)) return null;
  try {
    return JSON.parse(b64urlDecodeStr(payload));
  } catch {
    return null;
  }
}

// Encrypt a token value
async function encryptToken(token: string): Promise<string> {
  if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY not configured');
  return encrypt(token, ENCRYPTION_KEY);
}

// Decrypt a token value
async function decryptToken(token: string | null): Promise<string | null> {
  if (!token) return null;
  if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY not configured');
  // If it doesn't look encrypted, return as-is (for migration from plaintext)
  if (!looksEncrypted(token)) return token;
  return decrypt(token, ENCRYPTION_KEY);
}

export async function handler(req: Request): Promise<Response> {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  if (!ENCRYPTION_KEY) {
    console.error('ENCRYPTION_KEY environment variable is not set');
    return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }

    // Handle OAuth callback (doesn't require auth header)
    if (action === 'callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      if (!code || !state) {
        return new Response(JSON.stringify({ error: 'Missing code or state' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify HMAC-signed state to prevent CSRF / token-binding attacks.
      let user_id: string;
      let redirect_url: string;
      try {
        const verified = await verifyState(state);
        if (!verified) throw new Error('bad signature');
        const stateData = stateSchema.parse(verified);
        // Reject states older than 10 minutes
        if (Date.now() - stateData.ts > 10 * 60 * 1000) throw new Error('expired');
        user_id = stateData.user_id;
        redirect_url = stateData.redirect_url;
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid state parameter' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          code,
          grant_type: 'authorization_code',
          redirect_uri: `${SUPABASE_URL}/functions/v1/google-calendar-auth?action=callback`,
        }),
      });

      const tokens = await tokenResponse.json();

      if (tokens.error) {
        console.error('Token exchange error:', tokens);
        return Response.redirect(`${redirect_url}?error=token_exchange_failed`);
      }

      // Calculate expiration time
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      // Encrypt tokens before storing
      const encryptedAccessToken = await encryptToken(tokens.access_token);
      const encryptedRefreshToken = await encryptToken(tokens.refresh_token);

      // Store or update tokens (encrypted)
      const { error: upsertError } = await supabase
        .from('google_calendar_integrations')
        .upsert({
          user_id: user_id,
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          expires_at: expiresAt.toISOString(),
          enabled: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (upsertError) {
        console.error('Database error:', upsertError);
        return Response.redirect(`${redirect_url}?error=database_error`);
      }

      console.log(`Google Calendar connected for user: ${user_id}`);
      return Response.redirect(`${redirect_url}?success=true`);
    }

    // All other actions require authentication
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize OAuth flow
    if (action === 'init') {
      const validated = await parseAndValidate(req, initBodySchema);
      if (!validated.ok) {
        return new Response(JSON.stringify({ error: validated.error }), {
          status: validated.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const redirectUrl = validated.data.redirect_url || 'https://app.milespro.net.br/agencia/configuracoes';

      const nonceBytes = new Uint8Array(24);
      crypto.getRandomValues(nonceBytes);
      const nonce = b64urlEncode(nonceBytes);
      const state = await signState({
        user_id: userId,
        redirect_url: redirectUrl,
        nonce,
        ts: Date.now(),
      });

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID!);
      authUrl.searchParams.set('redirect_uri', `${SUPABASE_URL}/functions/v1/google-calendar-auth?action=callback`);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', SCOPES);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', state);

      return new Response(JSON.stringify({ auth_url: authUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check connection status
    if (action === 'status') {
      const { data, error } = await supabase
        .from('google_calendar_integrations')
        .select('enabled, calendar_id, expires_at, updated_at')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return new Response(JSON.stringify({ connected: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        connected: true,
        enabled: data.enabled,
        calendar_id: data.calendar_id,
        last_sync: data.updated_at,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Disconnect
    if (action === 'disconnect') {
      // Get current tokens to revoke
      const { data: integration } = await supabase
        .from('google_calendar_integrations')
        .select('access_token')
        .eq('user_id', userId)
        .single();

      if (integration?.access_token) {
        try {
          const accessToken = await decryptToken(integration.access_token);
          if (accessToken) {
            await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
              method: 'POST',
            }).catch(() => {});
          }
        } catch {
          // If decryption fails, token might be plaintext - try as-is
          await fetch(`https://oauth2.googleapis.com/revoke?token=${integration.access_token}`, {
            method: 'POST',
          }).catch(() => {});
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('google_calendar_integrations')
        .delete()
        .eq('user_id', userId);

      // Also delete all calendar events for this user
      await supabase
        .from('calendar_events')
        .delete()
        .eq('user_id', userId);

      if (error) {
        return new Response(JSON.stringify({ error: 'Failed to disconnect' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Refresh token if needed
    if (action === 'refresh') {
      const { data: integration } = await supabase
        .from('google_calendar_integrations')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!integration) {
        return new Response(JSON.stringify({ error: 'Not connected' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if token is expired or about to expire (5 min buffer)
      const expiresAt = new Date(integration.expires_at);
      const now = new Date();
      const bufferMs = 5 * 60 * 1000;

      if (expiresAt.getTime() - now.getTime() > bufferMs) {
        // Token still valid, decrypt and return
        const accessToken = await decryptToken(integration.access_token);
        return new Response(JSON.stringify({ 
          access_token: accessToken,
          valid: true 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Decrypt refresh token
      const refreshToken = await decryptToken(integration.refresh_token);
      if (!refreshToken) {
        return new Response(JSON.stringify({ error: 'Failed to decrypt refresh token' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Refresh the token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const tokens = await refreshResponse.json();

      if (tokens.error) {
        console.error('Token refresh error:', tokens);
        return new Response(JSON.stringify({ error: 'Token refresh failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      // Encrypt and store new tokens
      const newEncryptedAccessToken = await encryptToken(tokens.access_token);
      const newEncryptedRefreshToken = tokens.refresh_token 
        ? await encryptToken(tokens.refresh_token)
        : integration.refresh_token; // Keep old if not provided

      await supabase
        .from('google_calendar_integrations')
        .update({
          access_token: newEncryptedAccessToken,
          refresh_token: newEncryptedRefreshToken,
          expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      return new Response(JSON.stringify({ 
        access_token: tokens.access_token,
        valid: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
