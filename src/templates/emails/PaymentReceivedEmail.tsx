/**
 * PaymentReceivedEmail — receipt after a successful charge via Asaas.
 *
 * Phase 2 Plan 02-04 (W1c). pt-BR neutral branding.
 * Consumed by W2a asaas-webhook on PAYMENT_CONFIRMED / PAYMENT_RECEIVED.
 *
 * NFS-e: copy mentions that the invoice will be issued once the founder
 * PJ activation completes (forward reference to PAY-08).
 *
 * Sender (set in edge function): "MilesPro <noreply@milespro.net.br>"
 */

export interface PaymentReceivedEmailProps {
  firstName?: string | null;
  plan: 'pro' | 'vip';
  amountFormatted: string; // e.g. "R$ 37,90"
  cycleLabel: string; // e.g. "Mensal", "Anual"
  invoiceUrl?: string | null; // Asaas invoice link
  appUrl: string;
}

export function renderPaymentReceivedEmail({
  firstName,
  plan,
  amountFormatted,
  cycleLabel,
  invoiceUrl,
  appUrl,
}: PaymentReceivedEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const greeting = firstName ? `, ${firstName}` : '';
  const planLabel = plan === 'vip' ? 'VIP' : 'Pro';
  const subject = `Pagamento confirmado — MilesPro ${planLabel}`;

  const invoiceTextLine = invoiceUrl
    ? `Fatura / comprovante: ${invoiceUrl}\n`
    : '';

  const invoiceHtmlLine = invoiceUrl
    ? `<p style="margin:12px 0 0;line-height:1.5;font-size:13px;">
        <a href="${invoiceUrl}" style="color:#BF4408;text-decoration:none;font-weight:600;">Ver fatura / comprovante →</a>
      </p>`
    : '';

  const text = `Olá${greeting},

Recebemos seu pagamento do MilesPro ${planLabel}.

Plano: ${planLabel}
Ciclo: ${cycleLabel}
Valor: ${amountFormatted}

${invoiceTextLine}A NFS-e será emitida automaticamente assim que a entidade PJ MilesPro for ativada (cobrança processada via Asaas).

Acesse sua conta: ${appUrl}/dashboard

Dúvidas: suporte@milespro.net.br
Privacidade (LGPD): dpo@milespro.net.br
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
        <span style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:600;background:rgba(34,197,94,.12);color:#15803D;border:1px solid rgba(34,197,94,.22);margin-bottom:12px;">✓ Pagamento recebido</span>
        <h1 style="margin:0 0 16px;font-family:'Inter',sans-serif;font-weight:700;font-size:24px;letter-spacing:-.02em;line-height:1.2;color:#0E1014;">Sua assinatura está renovada.</h1>
        <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#46484F;">Olá${greeting}, recebemos seu pagamento de <strong style="color:#0E1014;">${amountFormatted}</strong> do <strong>MilesPro ${planLabel}</strong>.</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0;font-size:13.5px;">
          <tr><td style="padding:7px 0;color:#4A4C55;border-bottom:1px solid rgba(20,22,28,.06);">Plano</td><td style="padding:7px 0;text-align:right;font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-weight:600;color:#0E1014;border-bottom:1px solid rgba(20,22,28,.06);">${planLabel}</td></tr>
          <tr><td style="padding:7px 0;color:#4A4C55;border-bottom:1px solid rgba(20,22,28,.06);">Ciclo</td><td style="padding:7px 0;text-align:right;font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-weight:600;color:#0E1014;border-bottom:1px solid rgba(20,22,28,.06);">${cycleLabel}</td></tr>
          <tr><td style="padding:7px 0;color:#4A4C55;">Valor</td><td style="padding:7px 0;text-align:right;font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-weight:700;color:#0E1014;font-size:15px;">${amountFormatted}</td></tr>
        </table>
        ${invoiceHtmlLine}
        <p style="margin:18px 0 24px;font-size:13px;line-height:1.6;color:#717480;">A <strong>NFS-e</strong> será emitida automaticamente assim que a entidade PJ MilesPro for ativada (cobrança processada via <strong>Asaas</strong>).</p>
        <a href="${appUrl}/dashboard" style="display:inline-block;background:linear-gradient(180deg,#FF7A2E 0%,#FF6A1A 100%);color:#fff;padding:13px 28px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;box-shadow:0 4px 12px rgba(255,106,26,.30);">
          Acessar minha conta
        </a>
      </td>
    </tr>
    <tr>
      <td style="background:#EFEEEC;padding:24px 32px;text-align:center;border-top:1px solid rgba(20,22,28,.06);">
        <p style="font-size:11px;color:#717480;margin:4px 0;line-height:1.5;">Asaas · MilesPro Tecnologia</p>
        <p style="font-size:11px;color:#717480;margin:4px 0;line-height:1.5;">Dúvidas: <a href="mailto:suporte@milespro.net.br" style="color:#BF4408;text-decoration:none;">suporte@milespro.net.br</a> · LGPD: <a href="mailto:dpo@milespro.net.br" style="color:#BF4408;text-decoration:none;">dpo@milespro.net.br</a></p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

export default renderPaymentReceivedEmail;
