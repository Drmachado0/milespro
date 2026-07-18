/**
 * DeletionConfirmEmail — LGPD account deletion confirmation (COMPL-02).
 *
 * Phase 2 Plan 02-04 (W1c). pt-BR neutral branding.
 * The HMAC token is bound to user.id in the calling edge function
 * (supabase/functions/lgpd-delete/index.ts from Plan 02-02).
 * Token format: <hex-hmac>:<unix-millis-expires>:<hex-nonce> (24h TTL).
 *
 * After confirmation, the account enters a 7-day reversibility window
 * before the daily pg_cron job (lgpd-delete-cleanup) hard-deletes it.
 *
 * Sender (set in edge function): "MilesPro <noreply@milespro.net.br>"
 */

export interface DeletionConfirmEmailProps {
  firstName?: string | null;
  tokenUrl: string; // e.g. https://app.milespro.net.br/lgpd/confirm?token=...
  expiresAtIso: string; // ISO-8601; rendered locally as text
}

export function renderDeletionConfirmEmail({
  firstName,
  tokenUrl,
  expiresAtIso,
}: DeletionConfirmEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const greeting = firstName ? `, ${firstName}` : '';
  const subject = 'Confirme a exclusão da sua conta MilesPro';

  const text = `Olá${greeting},

Recebemos um pedido de exclusão da sua conta MilesPro. Para confirmar a operação, clique no link abaixo:

${tokenUrl}

Este link expira em ${expiresAtIso} (24h após o pedido).

ATENÇÃO: a exclusão é IRREVERSÍVEL após 7 dias da confirmação. Durante essa janela de 7 dias, você pode cancelar a exclusão respondendo este email ou escrevendo para dpo@milespro.net.br.

Se você NÃO solicitou esta exclusão, ignore este email — nenhuma ação será tomada sem a confirmação no link.

Dúvidas LGPD: dpo@milespro.net.br
Suporte geral: suporte@milespro.net.br
`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:24px;background:#F4F4F1;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1A1B22;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(20,22,28,.06);">
    <tr>
      <td style="height:100px;background:linear-gradient(135deg,#FF842E 0%,#FF6A1A 50%,#FF2D87 100%);padding:0 32px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="vertical-align:middle;padding:32px 0;">
              <span style="display:inline-block;width:36px;height:36px;border-radius:9px;background:rgba(255,255,255,.18);text-align:center;line-height:36px;color:#fff;font-weight:800;font-size:18px;vertical-align:middle;box-shadow:inset 0 1px 0 rgba(255,255,255,.4);">M</span>
              <span style="display:inline-block;margin-left:10px;color:#fff;font-weight:800;font-size:19px;letter-spacing:-.02em;vertical-align:middle;">MilesPro</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:36px 32px 28px;">
        <span style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:600;background:rgba(239,68,68,.10);color:#B91C1C;border:1px solid rgba(239,68,68,.22);margin-bottom:12px;">⚠ Confirmação obrigatória</span>
        <h1 style="margin:0 0 16px;font-family:'Inter',sans-serif;font-weight:700;font-size:24px;letter-spacing:-.02em;line-height:1.2;color:#0E1014;">Você pediu pra excluir sua conta.</h1>
        <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#46484F;">Olá${greeting}, recebemos um pedido de <strong style="color:#0E1014;">exclusão LGPD</strong> da sua conta. Para confirmar, clique no botão abaixo dentro das próximas <strong>24 horas</strong>.</p>
        <a href="${tokenUrl}" style="display:inline-block;background:linear-gradient(180deg,#EF4444 0%,#DC2626 100%);color:#fff;padding:13px 28px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;box-shadow:0 4px 12px rgba(239,68,68,.30);margin-bottom:18px;">
          Confirmar exclusão definitiva
        </a>
        <p style="margin:0 0 18px;font-size:12.5px;color:#717480;line-height:1.6;word-break:break-all;">Ou copie e cole no navegador: <span style="font-family:'JetBrains Mono',ui-monospace,monospace;color:#46484F;">${tokenUrl}</span></p>
        <div style="background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.22);border-radius:8px;padding:16px 18px;margin:18px 0 0;">
          <div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#B45309;font-weight:700;margin-bottom:8px;">O que acontece ao confirmar</div>
          <div style="font-size:13px;color:#78350F;line-height:1.7;">
            • Seu cadastro, operações e programas serão excluídos<br>
            • Sua assinatura ativa será cancelada (sem reembolso pro-rata)<br>
            • Logs de auditoria serão mantidos por 5 anos<br>
            • A ação <strong>não pode ser desfeita</strong> após 30 dias
          </div>
        </div>
        <p style="margin:18px 0 0;font-size:12.5px;color:#717480;line-height:1.6;">Este link expira em <strong style="font-family:'JetBrains Mono',ui-monospace,monospace;color:#46484F;">${expiresAtIso}</strong>. Se você não fez essa solicitação, ignore este email — nenhuma ação será tomada sem a confirmação.</p>
      </td>
    </tr>
    <tr>
      <td style="background:#EFEEEC;padding:24px 32px;text-align:center;border-top:1px solid rgba(20,22,28,.06);">
        <p style="font-size:11px;color:#717480;margin:4px 0;line-height:1.5;">Você tem direito ao esquecimento, conforme LGPD Art. 18.</p>
        <p style="font-size:11px;color:#717480;margin:4px 0;line-height:1.5;">LGPD: <a href="mailto:dpo@milespro.net.br" style="color:#BF4408;text-decoration:none;">dpo@milespro.net.br</a> · Suporte: <a href="mailto:suporte@milespro.net.br" style="color:#BF4408;text-decoration:none;">suporte@milespro.net.br</a></p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

export default renderDeletionConfirmEmail;
