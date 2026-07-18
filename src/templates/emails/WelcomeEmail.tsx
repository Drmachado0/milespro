/**
 * WelcomeEmail — sent after a user confirms email signup.
 *
 * Phase 2 Plan 02-04 (W1c). Renderable as an HTML string from any context
 * (Deno edge functions, Node, browser) since it does not import React.
 * Templates are pt-BR and neutrally branded (MilesPro wordmark only —
 * no Asaas branding inside email body per D-15/D-17).
 *
 * Future consumers:
 *   - W3 signup confirmation edge fn (post-cutover)
 *
 * Sender (set in edge function, NOT here): "MilesPro <noreply@milespro.net.br>"
 */

export interface WelcomeEmailProps {
  firstName?: string | null;
  appUrl: string; // e.g. https://app.milespro.net.br
}

export function renderWelcomeEmail({ firstName, appUrl }: WelcomeEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const greeting = firstName ? `, ${firstName}` : '';
  const subject = 'Bem-vindo ao MilesPro';

  const text = `Bem-vindo${greeting}!

Sua conta MilesPro está ativa. Comece adicionando seus programas de fidelidade no painel:
${appUrl}/dashboard

Dúvidas? Responda este email ou escreva para suporte@milespro.net.br.
Para questões de privacidade (LGPD): dpo@milespro.net.br.

MilesPro — gestão de milhas e pontos para viajantes brasileiros.
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
        <p style="margin:0 0 10px;font-size:15px;color:#1A1B22;font-weight:500;">Olá${greeting},</p>
        <h1 style="margin:0 0 16px;font-family:'Inter',sans-serif;font-weight:700;font-size:24px;letter-spacing:-.02em;line-height:1.2;color:#0E1014;">Sua conta foi criada com sucesso.</h1>
        <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#46484F;">Bem-vindo ao MilesPro. Você acaba de entrar no controlador de milhas e pontos do Brasil — sem planilha, com cálculo automático de CM, e alertas que valem dinheiro de verdade.</p>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#46484F;">Seu trial gratuito do <strong>plano Pro</strong> começou agora. Você tem acesso completo a relatórios avançados, simulador, e até 11 programas conectados.</p>
        <a href="${appUrl}/dashboard" style="display:inline-block;background:linear-gradient(180deg,#FF7A2E 0%,#FF6A1A 100%);color:#fff;padding:13px 28px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;box-shadow:0 4px 12px rgba(255,106,26,.30);margin:6px 0 24px;">
          Conectar meu primeiro programa
        </a>
        <div style="height:1px;background:rgba(20,22,28,.08);margin:22px 0;"></div>
        <p style="font-size:12.5px;color:#717480;line-height:1.6;margin:0;">Próximos passos sugeridos: adicionar seus titulares, cadastrar seus cartões, configurar alertas. Em ~10 minutos seu controle está rodando.</p>
      </td>
    </tr>
    <tr>
      <td style="background:#EFEEEC;padding:24px 32px;text-align:center;border-top:1px solid rgba(20,22,28,.06);">
        <p style="font-size:11px;color:#717480;margin:4px 0;line-height:1.5;"><strong style="color:#1A1B22;">MilesPro</strong> · controle de milhas e pontos</p>
        <p style="font-size:11px;color:#717480;margin:4px 0;line-height:1.5;">Você está recebendo isso porque criou uma conta.</p>
        <p style="font-size:11px;color:#717480;margin:4px 0;line-height:1.5;">Dúvidas: <a href="mailto:suporte@milespro.net.br" style="color:#BF4408;text-decoration:none;">suporte@milespro.net.br</a> · LGPD: <a href="mailto:dpo@milespro.net.br" style="color:#BF4408;text-decoration:none;">dpo@milespro.net.br</a></p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

export default renderWelcomeEmail;
