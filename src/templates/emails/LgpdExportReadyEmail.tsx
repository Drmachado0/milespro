/**
 * LgpdExportReadyEmail — placeholder for future async LGPD export delivery (COMPL-01).
 *
 * Phase 2 Plan 02-04 (W1c). pt-BR neutral branding.
 *
 * Today, lgpd-export returns the JSON bundle inline (synchronous response).
 * This template is a forward-compatible scaffold for the day the export
 * grows past ~5s and we move it to async (file in storage + email link).
 *
 * Sender (set in edge function): "MilesPro <noreply@milespro.net.br>"
 */

export interface LgpdExportReadyEmailProps {
  firstName?: string | null;
  downloadUrl: string; // signed URL to JSON bundle
  expiresAtIso: string; // signed URL expiry (typically 24h)
}

export function renderLgpdExportReadyEmail({
  firstName,
  downloadUrl,
  expiresAtIso,
}: LgpdExportReadyEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const greeting = firstName ? `, ${firstName}` : '';
  const subject = 'Seus dados estão prontos para download — MilesPro';

  const text = `Olá${greeting},

Os dados da sua conta MilesPro foram exportados em formato JSON conforme o Art. 18 da LGPD.

Link para download (expira em ${expiresAtIso}):
${downloadUrl}

O arquivo contém: perfil, assinatura, operações de milhas, programas cadastrados, registros de consentimento. Senhas e tokens NÃO são exportados (não são considerados dados pessoais do usuário).

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
        <span style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:600;background:rgba(34,197,94,.12);color:#15803D;border:1px solid rgba(34,197,94,.22);margin-bottom:12px;">✓ LGPD · exportação concluída</span>
        <h1 style="margin:0 0 16px;font-family:'Inter',sans-serif;font-weight:700;font-size:24px;letter-spacing:-.02em;line-height:1.2;color:#0E1014;">Seus dados estão prontos para download.</h1>
        <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#46484F;">Olá${greeting}, conforme solicitado, geramos um arquivo com <strong style="color:#0E1014;">todos os seus dados pessoais</strong> armazenados no MilesPro: cadastro, assinatura, operações, programas, cartões, alertas e registros de consentimento — em conformidade com o <strong>Art. 18 da LGPD</strong>.</p>
        <div style="background:rgba(255,106,26,.06);border:1px solid rgba(255,106,26,.18);border-radius:8px;padding:16px 18px;margin:18px 0;">
          <div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#BF4408;font-weight:700;margin-bottom:8px;">Conteúdo do arquivo</div>
          <div style="font-size:13px;color:#46484F;line-height:1.7;">
            • <strong style="color:#0E1014;">profile.json</strong> — dados de cadastro<br>
            • <strong style="color:#0E1014;">operations.csv</strong> — histórico de operações<br>
            • <strong style="color:#0E1014;">programs.json</strong> — programas conectados<br>
            • <strong style="color:#0E1014;">subscriptions.json</strong> — histórico de assinatura<br>
            • <strong style="color:#0E1014;">consents.json</strong> — registro LGPD
          </div>
        </div>
        <a href="${downloadUrl}" style="display:inline-block;background:linear-gradient(180deg,#FF7A2E 0%,#FF6A1A 100%);color:#fff;padding:13px 28px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;box-shadow:0 4px 12px rgba(255,106,26,.30);margin-bottom:14px;">
          Baixar meus dados
        </a>
        <p style="margin:0;font-size:12.5px;color:#717480;line-height:1.6;">Este link expira em <strong style="font-family:'JetBrains Mono',ui-monospace,monospace;color:#46484F;">${expiresAtIso}</strong>. Senhas e tokens <strong>não</strong> são exportados — não são dados pessoais do usuário.</p>
      </td>
    </tr>
    <tr>
      <td style="background:#EFEEEC;padding:24px 32px;text-align:center;border-top:1px solid rgba(20,22,28,.06);">
        <p style="font-size:11px;color:#717480;margin:4px 0;line-height:1.5;">Em conformidade com a LGPD — Lei 13.709/2018</p>
        <p style="font-size:11px;color:#717480;margin:4px 0;line-height:1.5;">LGPD: <a href="mailto:dpo@milespro.net.br" style="color:#BF4408;text-decoration:none;">dpo@milespro.net.br</a> · Suporte: <a href="mailto:suporte@milespro.net.br" style="color:#BF4408;text-decoration:none;">suporte@milespro.net.br</a></p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

export default renderLgpdExportReadyEmail;
