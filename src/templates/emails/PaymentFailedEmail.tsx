/**
 * PaymentFailedEmail — past_due notification after a failed Asaas charge.
 *
 * Phase 2 Plan 02-04 (W1c). pt-BR neutral branding.
 * Consumed by W2a asaas-webhook on PAYMENT_CREDIT_CARD_CAPTURE_REFUSED
 * or PAYMENT_AWAITING_RISK_ANALYSIS / PAYMENT_OVERDUE.
 *
 * Grace period: 7 days (D-06 default) before account drops to Free.
 *
 * Sender (set in edge function): "MilesPro <noreply@milespro.net.br>"
 */

export interface PaymentFailedEmailProps {
  firstName?: string | null;
  amountFormatted: string;
  gracePeriodDays: number; // typically 7
  appUrl: string;
}

export function renderPaymentFailedEmail({
  firstName,
  amountFormatted,
  gracePeriodDays,
  appUrl,
}: PaymentFailedEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const greeting = firstName ? `, ${firstName}` : '';
  const subject = 'Pagamento não processado — MilesPro';

  const text = `Olá${greeting},

Tentamos cobrar ${amountFormatted} no seu cartão e ele foi recusado. Isso normalmente se resolve assim:

1. Confirme saldo / limite no cartão
2. Atualize o método de pagamento em ${appUrl}/assinatura
3. Aguarde a próxima tentativa automática (ou reenvie agora pelo painel)

Status atual: past_due. Você tem ${gracePeriodDays} dias para regularizar — após isso, sua conta volta automaticamente para o plano Free (sem perda de dados).

Dúvidas: suporte@milespro.net.br
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
        <span style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:600;background:rgba(239,68,68,.10);color:#B91C1C;border:1px solid rgba(239,68,68,.22);margin-bottom:12px;">⚠ Falha no pagamento</span>
        <h1 style="margin:0 0 16px;font-family:'Inter',sans-serif;font-weight:700;font-size:24px;letter-spacing:-.02em;line-height:1.2;color:#0E1014;">Tentativa de cobrança recusada.</h1>
        <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#46484F;">Olá${greeting}, tentamos cobrar <strong style="color:#0E1014;font-family:'JetBrains Mono',ui-monospace,monospace;">${amountFormatted}</strong> no seu cartão e ele foi recusado. Isso normalmente acontece por limite atingido, cartão expirado ou bloqueio temporário.</p>
        <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#46484F;">Resolve assim:</p>
        <ol style="margin:0 0 18px 20px;padding:0;font-size:14px;line-height:1.7;color:#46484F;">
          <li>Confirme saldo / limite no cartão</li>
          <li>Atualize o método de pagamento no painel</li>
          <li>Aguarde a próxima tentativa automática (ou reenvie agora)</li>
        </ol>
        <a href="${appUrl}/assinatura" style="display:inline-block;background:linear-gradient(180deg,#FF7A2E 0%,#FF6A1A 100%);color:#fff;padding:13px 28px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;box-shadow:0 4px 12px rgba(255,106,26,.30);margin-bottom:18px;">
          Atualizar pagamento
        </a>
        <div style="background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.22);border-radius:8px;padding:14px 18px;margin:18px 0 0;">
          <div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#B45309;font-weight:700;margin-bottom:6px;">Status · past_due</div>
          <div style="font-size:13px;color:#78350F;line-height:1.5;">Você tem <strong style="font-family:'JetBrains Mono',ui-monospace,monospace;">${gracePeriodDays} dias</strong> para regularizar. Depois disso, a conta volta automaticamente para o plano Free (sem perda de dados).</div>
        </div>
      </td>
    </tr>
    <tr>
      <td style="background:#EFEEEC;padding:24px 32px;text-align:center;border-top:1px solid rgba(20,22,28,.06);">
        <p style="font-size:11px;color:#717480;margin:4px 0;line-height:1.5;">Dúvidas: <a href="mailto:suporte@milespro.net.br" style="color:#BF4408;text-decoration:none;">suporte@milespro.net.br</a></p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

export default renderPaymentFailedEmail;
