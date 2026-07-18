/**
 * Brazilian CPF (Cadastro de Pessoas Físicas) validation.
 *
 * Pure functions — no fetch, no React. Reusable from any component, hook,
 * or edge function that needs to validate a CPF before round-tripping to
 * Asaas (which would otherwise return a non-actionable error and bill the
 * user a wasted API call).
 *
 * Algorithm: the standard 11-digit-with-2-check-digits scheme. The check
 * digits are computed by a weighted modulo-11 sum over the first 9 digits
 * (for d1) and the first 10 (for d2).
 *
 * Rejects:
 *  - Strings whose stripped-digit length is not 11.
 *  - All-identical sequences (00000000000, 11111111111, ...) which pass the
 *    arithmetic check but are sentinel values, never legitimate CPFs.
 *
 * Accepts both raw digits (`12345678909`) and the formatted form
 * (`123.456.789-09`) — non-digit characters are stripped before checking.
 */
export function isValidCpf(input: string): boolean {
  const digits = input.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const checkDigit = (slice: string, weightStart: number): number => {
    let sum = 0;
    for (let i = 0; i < slice.length; i++) {
      sum += parseInt(slice[i], 10) * (weightStart - i);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  const d1 = checkDigit(digits.slice(0, 9), 10);
  if (d1 !== parseInt(digits[9], 10)) return false;

  const d2 = checkDigit(digits.slice(0, 10), 11);
  if (d2 !== parseInt(digits[10], 10)) return false;

  return true;
}
