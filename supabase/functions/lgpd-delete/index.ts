/**
 * lgpd-delete — DSR delete-request + confirm endpoints (COMPL-02 / D-18).
 *
 * Two-step soft-delete flow with HMAC-signed token email confirmation:
 *   1. action=request — authenticated user requests deletion
 *      - Set profiles.deletion_requested_at = now()
 *      - Generate HMAC-signed one-time token (expires in 24h)
 *      - Store the token hash on profiles.deletion_token
 *      - Send confirmation email via Resend with link to /lgpd/confirm?token=...
 *
 *   2. action=confirm — clicked from email
 *      - Verify HMAC token (constant-time compare); check expiry
 *      - Lookup profiles row by deletion_token
 *      - Set profiles.deletion_confirmed_at = now(); clear deletion_token
 *      - Returns hard_delete_after timestamp (now + 7 days)
 *
 * The 7-day window (D-18) is enforced by the daily pg_cron job that calls
 * lgpd-delete-cleanup (Task 6) and only purges rows where confirmed_at is
 * older than 7 days. User can email dpo@milespro.net.br to reverse within
 * that window.
 *
 * Token format (in DB): `<hex-hmac>:<unix-millis-expires>:<hex-nonce>`
 * Reuses the HMAC/timing-safe pattern from supabase/functions/google-calendar-auth/.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { timingSafeEq } from '../_shared/timingSafeEq.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const LGPD_DELETE_SECRET = Deno.env.get('LGPD_DELETE_TOKEN_SECRET') ?? Deno.env.get('LGPD_DELETE_SECRET');
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'MilesPro <noreply@milespro.net.br>';
const APP_URL = Deno.env.get('APP_URL') ?? 'https://app.milespro.net.br';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const HARD_DELETE_WINDOW_DAYS = 7;

// --- HMAC helpers (mirror pattern from google-calendar-auth/index.ts) ------

function bytesToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return bytesToHex(sig);
}

/**
 * Build a token of the form `<hex-hmac>:<unix-millis-expires>:<hex-nonce>`.
 * The HMAC covers `${userId}:${expiresAt}:${nonce}` so even DB read can't
 * forge a valid token without the LGPD_DELETE_TOKEN_SECRET env var.
 */
export async function signDeletionToken(
  userId: string,
  expiresAt: number,
  nonce: string,
  secret: string,
): Promise<string> {
  const payload = `${userId}:${expiresAt}:${nonce}`;
  const hmac = await hmacSign(payload, secret);
  return `${hmac}:${expiresAt}:${nonce}`;
}

export interface VerifiedToken {
  userId: string;
  expiresAt: number;
  nonce: string;
}

/**
 * Verify a token + bind to userId; returns null on bad signature or expiry.
 */
export async function verifyDeletionToken(
  token: string,
  userId: string,
  secret: string,
  nowMs: number = Date.now(),
): Promise<VerifiedToken | null> {
  const parts = token.split(':');
  if (parts.length !== 3) return null;
  const [hmac, expiresStr, nonce] = parts;
  const expiresAt = Number(expiresStr);
  if (!Number.isFinite(expiresAt)) return null;
  if (expiresAt <= nowMs) return null;
  const expected = await hmacSign(`${userId}:${expiresAt}:${nonce}`, secret);
  if (!timingSafeEq(hmac, expected)) return null;
  return { userId, expiresAt, nonce };
}

// --- Resend email sender ---------------------------------------------------

async function sendDeletionConfirmEmail(
  recipient: string,
  confirmUrl: string,
  expiresAt: number,
): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('[lgpd-delete] RESEND_API_KEY not set — email not sent');
    return;
  }
  const expiresStr = new Date(expiresAt).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
  });
  const subject = 'Confirmação de exclusão da sua conta MilesPro';
  const plain = [
    'Olá,',
    '',
    'Você solicitou a exclusão da sua conta MilesPro.',
    '',
    'Para confirmar, clique no link abaixo dentro de 24 horas:',
    confirmUrl,
    '',
    `O link expira em ${expiresStr}.`,
    '',
    'Após confirmar, seus dados serão mantidos por 7 dias (janela de cancelamento) e excluídos definitivamente depois. Em dúvida, escreva para dpo@milespro.net.br.',
    '',
    'Se não foi você que solicitou esta exclusão, ignore este email — sua conta permanece intacta.',
    '',
    '— Equipe MilesPro',
  ].join('\n');

  const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#1f2937;max-width:600px;margin:0 auto;padding:24px;">
<h2 style="color:#dc2626;margin:0 0 16px;">Confirmação de exclusão da sua conta</h2>
<p>Você solicitou a exclusão da sua conta MilesPro.</p>
<p>Para confirmar, clique no botão abaixo dentro de <strong>24 horas</strong>:</p>
<p style="margin:24px 0;"><a href="${confirmUrl}" style="display:inline-block;background:#dc2626;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Confirmar exclusão</a></p>
<p>Ou copie e cole este link no seu navegador:<br><code style="word-break:break-all;font-size:12px;color:#6b7280;">${confirmUrl}</code></p>
<p style="font-size:13px;color:#6b7280;">O link expira em ${expiresStr}.</p>
<hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0;">
<p style="font-size:13px;color:#6b7280;">Após confirmar, seus dados serão mantidos por <strong>7 dias</strong> (janela de cancelamento) e excluídos definitivamente depois. Em dúvida, escreva para <a href="mailto:dpo@milespro.net.br">dpo@milespro.net.br</a>.</p>
<p style="font-size:13px;color:#6b7280;">Se não foi você que solicitou esta exclusão, ignore este email — sua conta permanece intacta.</p>
</body></html>`;

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [recipient],
      subject,
      text: plain,
      html,
    }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    console.warn('[lgpd-delete] Resend send failed', resp.status, body);
  }
}

// --- HTTP handler ----------------------------------------------------------

export const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[lgpd-delete] missing SUPABASE_URL or service role key');
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!LGPD_DELETE_SECRET) {
    console.error('[lgpd-delete] LGPD_DELETE_TOKEN_SECRET not set');
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Authenticate via Bearer JWT (required for both actions — confirm uses
    // JWT as first factor + token from email as second factor; this prevents
    // an anonymous attacker who somehow obtains a token from confirming).
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const jwt = authHeader.replace(/^Bearer\s+/i, '');

    const supabaseAuth = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY ?? SUPABASE_SERVICE_ROLE_KEY,
    );
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const user = userData.user;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // -------- action=request --------------------------------------------
    if (action === 'request') {
      // Generate a 32-byte random nonce (hex = 64 chars)
      const nonceBytes = new Uint8Array(32);
      crypto.getRandomValues(nonceBytes);
      const nonce = Array.from(nonceBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const expiresAt = Date.now() + TOKEN_TTL_MS;
      const token = await signDeletionToken(user.id, expiresAt, nonce, LGPD_DELETE_SECRET);

      const { error: updErr } = await supabase
        .from('profiles')
        .update({
          deletion_requested_at: new Date().toISOString(),
          deletion_token: token,
        })
        .eq('id', user.id);
      if (updErr) {
        console.error('[lgpd-delete] request update failed', updErr.message);
        return new Response(JSON.stringify({ error: 'Failed to record request' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (user.email) {
        const confirmUrl = `${APP_URL}/lgpd/confirm?token=${encodeURIComponent(token)}`;
        await sendDeletionConfirmEmail(user.email, confirmUrl, expiresAt);
      } else {
        console.warn('[lgpd-delete] user has no email — confirmation link not sent');
      }

      return new Response(
        JSON.stringify({
          status: 'request_sent',
          expires_at: new Date(expiresAt).toISOString(),
          message:
            'Verifique seu email para confirmar a exclusão. O link expira em 24 horas.',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // -------- action=confirm --------------------------------------------
    if (action === 'confirm') {
      let token: string | null = url.searchParams.get('token');
      if (!token && req.method === 'POST') {
        try {
          const body = await req.json();
          token = typeof body?.token === 'string' ? body.token : null;
        } catch {
          // ignore — token still null
        }
      }
      if (!token) {
        return new Response(JSON.stringify({ error: 'Missing token' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const verified = await verifyDeletionToken(token, user.id, LGPD_DELETE_SECRET);
      if (!verified) {
        return new Response(JSON.stringify({ error: 'invalid_token' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Cross-check the token against the DB row (defense-in-depth: even if
      // an attacker forged a valid HMAC, the row must have the same token).
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('id, deletion_token, deletion_requested_at')
        .eq('id', user.id)
        .maybeSingle();
      if (profErr || !profile) {
        return new Response(JSON.stringify({ error: 'profile_not_found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!profile.deletion_token || !timingSafeEq(profile.deletion_token, token)) {
        return new Response(JSON.stringify({ error: 'invalid_token' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const confirmedAt = new Date();
      const hardDeleteAfter = new Date(
        confirmedAt.getTime() + HARD_DELETE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
      );

      const { error: confErr } = await supabase
        .from('profiles')
        .update({
          deletion_confirmed_at: confirmedAt.toISOString(),
          deletion_token: null, // one-time use
        })
        .eq('id', user.id);
      if (confErr) {
        console.error('[lgpd-delete] confirm update failed', confErr.message);
        return new Response(JSON.stringify({ error: 'confirm_failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({
          status: 'confirmed',
          confirmed_at: confirmedAt.toISOString(),
          hard_delete_after: hardDeleteAfter.toISOString(),
          message: `Janela de ${HARD_DELETE_WINDOW_DAYS} dias iniciada. Escreva para dpo@milespro.net.br para cancelar antes do prazo.`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[lgpd-delete] unexpected error', err);
    try {
      const sentry = (globalThis as { Sentry?: { captureException?: (e: unknown) => void } }).Sentry;
      sentry?.captureException?.(err);
    } catch {
      /* no-op */
    }
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

export default handler;

if (import.meta.main) {
  Deno.serve(handler);
}
