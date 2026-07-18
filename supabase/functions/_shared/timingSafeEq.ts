/**
 * Constant-time string equality for fixed-length tokens.
 *
 * Why this exists: 5 edge functions previously duplicated this 5-line
 * implementation; Plan 03-04b adds 4 more consumers (enqueue-push,
 * send-push-notification, cleanup-push-subscriptions, send-vencimento-alert).
 * 9 consumers is well past the extraction threshold documented in Plan 02-05 SUMMARY.
 *
 * Security note: returning early on length mismatch DOES leak the length of
 * the secret. This is acceptable for our usage because all consumed tokens
 * have fixed lengths (64-char hex strings for openssl-generated secrets,
 * 32-char base64 for HMACs, etc.) — the length is a known constant.
 */
export function timingSafeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) {
    r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return r === 0;
}

/**
 * Backward-compat alias for the legacy name. Existing edge functions
 * imported `constantTimeEq` from their local inline copy; the alias keeps
 * their existing tests green during the gradual migration in Task 2.
 */
export { timingSafeEq as constantTimeEq };
