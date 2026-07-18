/**
 * Shared payload validation helper for Supabase Edge Functions.
 *
 * Wraps `await req.json()` with:
 *   - try/catch around JSON.parse failures (prevents 500 crashes on malformed input)
 *   - Zod schema validation (rejects unexpected shapes)
 *   - Payload size cap (rejects oversized bodies before parsing)
 */

import { z } from 'https://esm.sh/zod@3.23.8';

const MAX_BODY_BYTES = 64 * 1024; // 64 KB — raise per-function if needed.

export type ValidationOk<T> = { ok: true; data: T };
export type ValidationErr = { ok: false; status: number; error: string };
export type ValidationResult<T> = ValidationOk<T> | ValidationErr;

export async function parseAndValidate<S extends z.ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<ValidationResult<z.infer<S>>> {
  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) {
    return { ok: false, status: 413, error: 'Payload too large' };
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, status: 400, error: 'Invalid JSON body' };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join('.') || 'body';
    return {
      ok: false,
      status: 400,
      error: `Invalid payload at "${path}": ${issue?.message ?? 'unknown error'}`,
    };
  }

  return { ok: true, data: parsed.data };
}

export { z };
