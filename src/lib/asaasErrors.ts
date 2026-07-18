/**
 * Asaas error → user-friendly pt-BR message mapping.
 *
 * The create-checkout-session edge function calls `sanitizeAsaasError(raw)`
 * server-side, stripping CPF/CNPJ/email and exposing only `code` (from
 * Asaas v3 `errors[0].code`) plus a regex-scrubbed `details` string. This
 * module is the client-side counterpart: it pulls the structured fields
 * out of the FunctionsHttpError thrown by supabase-js and maps the code to
 * a message the user can act on (P1-4 from pre-launch audit).
 *
 * Adding a new mapping = adding a `case` below. Keep messages in pt-BR
 * and ending with an actionable next step (e.g., "Tente outro método").
 */

import type { FunctionsError } from '@supabase/supabase-js';

export interface AsaasErrorInfo {
  code?: string;
  details?: string;
}

/**
 * Extract the sanitized `code` and `details` from an error returned by
 * `supabase.functions.invoke`. supabase-js v2 wraps non-2xx edge-function
 * responses in a FunctionsHttpError whose `context.response` is the raw
 * Response object — we clone it (clone so the caller can re-read), parse
 * JSON best-effort, and tolerate non-JSON / non-HTTP errors.
 */
export async function extractAsaasError(
  error: FunctionsError | Error | null | undefined,
): Promise<AsaasErrorInfo> {
  if (!error) return {};
  const response = (error as { context?: { response?: Response } }).context?.response;
  if (!response || typeof response.clone !== 'function') return {};
  try {
    const body = await response.clone().json();
    if (body && typeof body === 'object') {
      const obj = body as { code?: unknown; details?: unknown };
      return {
        code: typeof obj.code === 'string' ? obj.code : undefined,
        details: typeof obj.details === 'string' ? obj.details : undefined,
      };
    }
    return {};
  } catch {
    return {};
  }
}

/**
 * Map a sanitized Asaas error to a Portuguese message suitable for a toast.
 *
 * Codes are sourced from the Asaas v3 API (errors[].code values seen in
 * practice during checkout sandbox testing). When the code is unknown but
 * `details` is non-generic, we fall through with the details appended; when
 * neither is informative we return the bland-but-safe default.
 */
export function mapAsaasError(info: AsaasErrorInfo): string {
  const { code, details } = info;

  switch (code) {
    case 'invalid_cpfCnpj':
    case 'invalid_cpf':
      return 'CPF inválido. Confira os 11 dígitos e tente novamente.';

    case 'invalid_email':
      return 'E-mail inválido. Verifique e tente novamente.';

    case 'invalid_creditCard':
    case 'invalid_credit_card':
      return 'Cartão recusado. Tente outro método de pagamento ou outro cartão.';

    case 'invalid_value':
      return 'Valor da cobrança inválido. Recarregue a página e tente novamente.';

    case 'invalid_billingType':
      return 'Forma de pagamento indisponível. Recarregue a página e tente novamente.';

    case 'customer_invalid_cep':
    case 'invalid_postalCode':
      return 'CEP inválido no cadastro. Atualize seu perfil e tente novamente.';

    case 'invalid_phone':
    case 'invalid_mobilePhone':
      return 'Telefone inválido no cadastro. Atualize seu perfil e tente novamente.';

    case 'invalid_action':
      return 'Operação não permitida. Atualize a página ou fale com o suporte.';

    default:
      // Fall through with sanitized details when available and non-generic.
      if (
        details &&
        details.length > 0 &&
        details !== 'Erro no processamento do pagamento'
      ) {
        return `${details}. Tente novamente em alguns minutos.`;
      }
      return 'Erro ao iniciar checkout. Tente novamente em alguns minutos.';
  }
}
