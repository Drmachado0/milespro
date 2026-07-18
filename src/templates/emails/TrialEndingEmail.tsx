/**
 * TrialEndingEmail — 3 days before the 7-day Pro trial ends, billed via card on file.
 *
 * Phase 2 Plan 02-04 (W1c). pt-BR neutral branding. D-03 trial copy.
 * Consumed by future W3 trial-reminder cron job.
 *
 * Sender (set in edge function): "MilesPro <noreply@milespro.net.br>"
 */

export interface TrialEndingEmailProps {
  firstName?: string | null;
  daysRemaining: number; // typically 3
  appUrl: string;
}

export function renderTrialEndingEmail({
  firstName,
  daysRemaining,
  appUrl,
}: TrialEndingEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const greeting = firstName ? `, ${firstName}` : '';
  const subject = `Seu trial Pro termina em ${daysRemaining} dias`;

  const text = `Olá${greeting},

Seu trial gratuito do MilesPro Pro termina em ${daysRemaining} dias. A partir de então, vamos cobrar automaticamente a primeira mensalidade no cartão que você cadastrou na ativação.

Quer continuar? Não precisa fazer nada — o acesso Pro continua sem interrupção.

Quer cancelar? Sem multa, sem burocracia. Acesse:
${appUrl}/assinatura

Garantia de 7 dias após a primeira cobrança continua valendo: se mudar de ideia, devolvemos o valor.

Dúvidas: suporte@milespro.net.br
LGPD/Privacidade: dpo@milespro.net.br
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
        <span style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:600;background:rgba(245,158,11,.10);color:#B45309;border:1px solid rgba(245,158,11,.22);margin-bottom:12px;">⏱ Termina em ${daysRemaining} dias</span>
        <h1 style="margin:0 0 16px;font-family:'Inter',sans-serif;font-weight:700;font-size:24px;letter-spacing:-.02em;line-height:1.2;color:#0E1014;">Seu trial Pro termina em ${daysRemaining} dias.</h1>
        <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#46484F;">Olá${greeting}, seu trial gratuito do <strong style="color:#0E1014;">MilesPro Pro</strong> termina em <strong>${daysRemaining} dias</strong>. Após esse período, faremos a primeira cobrança automaticamente no cartão cadastrado na ativação.</p>
        <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#46484F;"><strong style="color:#0E1014;">Quer continuar?</strong> Não precisa fazer nada — o acesso Pro segue sem interrupção.</p>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#46484F;"><strong style="color:#0E1014;">Quer cancelar?</strong> Sem multa, sem burocracia.</p>
        <a href="${appUrl}/assinatura" style="display:inline-block;background:linear-gradient(180deg,#FF7A2E 0%,#FF6A1A 100%);color:#fff;padding:13px 28px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;box-shadow:0 4px 12px rgba(255,106,26,.30);margin-bottom:18px;">
          Gerenciar minha assinatura
        </a>
        <div style="background:rgba(255,106,26,.06);border:1px solid rgba(255,106,26,.18);border-radius:8px;padding:16px 18px;margin:18px 0;">
          <div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#BF4408;font-weight:700;margin-bottom:6px;">Garantia de 7 dias</div>
          <div style="font-size:13px;color:#46484F;line-height:1.5;">Lembrando: a garantia incondicional de 7 dias após a primeira cobrança continua valendo. Se mudar de ideia, devolvemos o valor.</div>
        </div>
      </td>
    </tr>
    <tr>
      <td style="background:#EFEEEC;padding:24px 32px;text-align:center;border-top:1px solid rgba(20,22,28,.06);">
        <p style="font-size:11px;color:#717480;margin:4px 0;line-height:1.5;">Para cancelar, acesse Configurações → Assinatura.</p>
        <p style="font-size:11px;color:#717480;margin:4px 0;line-height:1.5;">Dúvidas: <a href="mailto:suporte@milespro.net.br" style="color:#BF4408;text-decoration:none;">suporte@milespro.net.br</a> · LGPD: <a href="mailto:dpo@milespro.net.br" style="color:#BF4408;text-decoration:none;">dpo@milespro.net.br</a></p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

export default renderTrialEndingEmail;
