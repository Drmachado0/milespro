import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { parseAndValidate, z } from '../_shared/validate.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// P1-8 — Configurable sender. Defaults to the production "noreply@milespro.net.br"
// once the Resend domain is verified; until then operator can set RESEND_FROM env
// to `MilesPro <onboarding@resend.dev>` for the sandbox-test path. Hardcoding
// `onboarding@resend.dev` previously meant production emails shipped from a
// Resend-owned domain — bad for deliverability (SPF/DKIM/DMARC fail) and brand.
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "MilesPro <noreply@milespro.net.br>";

// In-memory rate limiter: max 5 emails per user per hour
const EMAIL_RATE_LIMIT_WINDOW_MS = 3_600_000;
const MAX_EMAILS_PER_HOUR = 5;
const emailCounts = new Map<string, { count: number; resetAt: number }>();

function checkEmailRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = emailCounts.get(userId);
  if (!entry || now > entry.resetAt) {
    emailCounts.set(userId, { count: 1, resetAt: now + EMAIL_RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_EMAILS_PER_HOUR) return false;
  entry.count++;
  return true;
}

// Spam detection: reject if body is >50% uppercase
function isSpammyBody(body: string): boolean {
  const letters = body.replace(/[^a-zA-ZÀ-ÿ]/g, '');
  if (letters.length < 10) return false;
  const upperCount = letters.split('').filter(c => c === c.toUpperCase() && c !== c.toLowerCase()).length;
  return (upperCount / letters.length) > 0.5;
}

const sendEmailSchema = z.object({
  client_id: z.string().uuid(),
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(50_000),
  attachment_url: z.string().url().max(2000).optional(),
  attachment_name: z.string().max(300).optional(),
  attachment_size: z.number().int().nonnegative().max(25 * 1024 * 1024).optional(),
});

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return handleCorsPreflight(req);
  }

  try {
    // P1-8 — All log lines below are scrubbed of PII (no email, no user.id,
    // no client.email, no Resend response body). We log event names and
    // bounded counters only. Operator forensics for a specific email goes
    // through the `client_messages` table (RLS-gated), not edge fn logs.
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    // Anon-key client with the caller's JWT pinned in the global
    // Authorization header so supabase.auth.getUser() resolves against
    // that token (stateless validation — no session is stored). Disabling
    // autoRefreshToken + persistSession is safe here: there's no refresh
    // token to spin and no localStorage in Deno. Closes the supabase-js
    // setInterval leak Deno strict tests flag.
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn("[send-client-email] auth_failed");
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Email rate limit per user
    if (!checkEmailRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: "Limite de 5 emails por hora atingido. Aguarde antes de enviar mais." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse and validate request body
    const validated = await parseAndValidate(req, sendEmailSchema);
    if (!validated.ok) {
      return new Response(
        JSON.stringify({ error: validated.error }),
        { status: validated.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    const { client_id, subject, body, attachment_url, attachment_name, attachment_size } = validated.data;

    // Spam check
    if (isSpammyBody(body)) {
      return new Response(
        JSON.stringify({ error: "Conteúdo suspeito detectado. Revise o texto do email." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get client data
    const { data: client, error: clientError } = await supabase
      .from("travel_clients")
      .select("*")
      .eq("id", client_id)
      .eq("user_id", user.id)
      .single();

    if (clientError || !client) {
      console.warn("[send-client-email] client_not_found");
      return new Response(
        JSON.stringify({ error: "Cliente não encontrado" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!client.email) {
      return new Response(
        JSON.stringify({ error: "Cliente não possui email cadastrado" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get agency settings for sender name
    const { data: agencySettings } = await supabase
      .from("agency_settings")
      .select("name, email")
      .eq("user_id", user.id)
      .single();

    const senderName = agencySettings?.name || "MilesPro";

    // Escape HTML to prevent injection from user-controlled content
    const escapeHtml = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const safeSenderName = escapeHtml(senderName);
    const safeBody = escapeHtml(body);

    // Build email HTML
    let htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { border-bottom: 2px solid #6366f1; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { color: #6366f1; margin: 0; font-size: 24px; }
          .content { padding: 20px 0; white-space: pre-wrap; }
          .attachment { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 20px; }
          .attachment a { color: #6366f1; text-decoration: none; font-weight: 500; }
          .footer { border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 30px; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${safeSenderName}</h1>
          </div>
          <div class="content">${safeBody}</div>
    `;

    // Add attachment link if present
    if (attachment_url && attachment_name) {
      // Generate signed URL for attachment (valid for 7 days)
      const attachmentPath = attachment_url.replace(/^.*\/client-attachments\//, '');
      const { data: signedUrlData, error: signedUrlError } = await supabase
        .storage
        .from("client-attachments")
        .createSignedUrl(attachmentPath, 60 * 60 * 24 * 7); // 7 days

      if (!signedUrlError && signedUrlData?.signedUrl) {
        const safeAttachmentName = escapeHtml(attachment_name);
        const safeUrl = encodeURI(signedUrlData.signedUrl);
        htmlBody += `
          <div class="attachment">
            <p><strong>📎 Anexo:</strong></p>
            <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeAttachmentName}</a>
          </div>
        `;
      }
    }

    htmlBody += `
          <div class="footer">
            <p>Esta mensagem foi enviada por ${safeSenderName} através do MilesPro.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: RESEND_FROM,
      to: [client.email],
      subject: subject,
      html: htmlBody,
    });

    // Check for errors
    if (emailResponse.error) {
      console.warn(
        "[send-client-email] resend_error",
        emailResponse.error.name ?? "unknown",
      );
      
      // Parse Resend error for user-friendly message
      let userMessage = emailResponse.error.message;
      let resolution = "";
      
      // Check for domain verification error
      if (emailResponse.error.message?.includes("only send testing emails to your own email") ||
          emailResponse.error.message?.includes("verify a domain")) {
        userMessage = "O Resend está em modo de teste. Emails só podem ser enviados para o endereço da conta Resend.";
        resolution = "Para enviar para outros destinatários, verifique seu domínio em resend.com/domains";
      } else if (emailResponse.error.message?.includes("rate limit")) {
        userMessage = "Limite de envio atingido. Aguarde alguns minutos.";
        resolution = "O Resend limita a quantidade de emails enviados por minuto.";
      } else if (emailResponse.error.message?.includes("invalid email")) {
        userMessage = "Endereço de email do destinatário é inválido.";
        resolution = "Verifique se o email do cliente está correto.";
      }
      
      // Save failed message to database
      await supabase.from("client_messages").insert({
        user_id: user.id,
        client_id: client_id,
        subject: subject,
        body: body,
        attachment_url: attachment_url || null,
        attachment_name: attachment_name || null,
        attachment_size: attachment_size || null,
        status: "failed",
        error_message: emailResponse.error.message,
      });

      return new Response(
        JSON.stringify({ 
          error: userMessage,
          resolution: resolution,
          original_error: emailResponse.error.message,
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Save successful message to database
    const { data: savedMessage, error: saveError } = await supabase.from("client_messages").insert({
      user_id: user.id,
      client_id: client_id,
      subject: subject,
      body: body,
      attachment_url: attachment_url || null,
      attachment_name: attachment_name || null,
      attachment_size: attachment_size || null,
      status: "sent",
    }).select().single();

    if (saveError) {
      console.warn("[send-client-email] save_failed");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_id: savedMessage?.id,
        email_id: emailResponse.data?.id
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    // Strip the error message before logging — it can echo back user input
    // (subject/body) on validation failures. Log only the constructor name.
    console.error(
      "[send-client-email] uncaught",
      error?.constructor?.name ?? "Error",
    );
    return new Response(
      JSON.stringify({ error: error?.message || "Erro interno do servidor" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
