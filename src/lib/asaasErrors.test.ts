import { describe, it, expect } from 'vitest';
import { extractAsaasError, mapAsaasError } from './asaasErrors';

describe('mapAsaasError', () => {
  it('maps invalid_cpfCnpj to CPF guidance', () => {
    expect(mapAsaasError({ code: 'invalid_cpfCnpj' })).toContain('CPF inválido');
  });

  it('maps invalid_creditCard to card guidance', () => {
    expect(mapAsaasError({ code: 'invalid_creditCard' })).toContain('Cartão recusado');
  });

  it('maps invalid_email to email guidance', () => {
    expect(mapAsaasError({ code: 'invalid_email' })).toContain('E-mail inválido');
  });

  it('falls back to sanitized details when code is unknown but details are informative', () => {
    const out = mapAsaasError({ code: 'something_new', details: 'Saldo insuficiente' });
    expect(out).toBe('Saldo insuficiente. Tente novamente em alguns minutos.');
  });

  it('returns the generic message when both code and details are missing', () => {
    expect(mapAsaasError({})).toBe('Erro ao iniciar checkout. Tente novamente em alguns minutos.');
  });

  it('returns the generic message when details is the generic placeholder', () => {
    const out = mapAsaasError({ details: 'Erro no processamento do pagamento' });
    expect(out).toBe('Erro ao iniciar checkout. Tente novamente em alguns minutos.');
  });
});

describe('extractAsaasError', () => {
  it('returns empty object for null/undefined error', async () => {
    expect(await extractAsaasError(null)).toEqual({});
    expect(await extractAsaasError(undefined)).toEqual({});
  });

  it('returns empty object for a plain Error without context.response', async () => {
    expect(await extractAsaasError(new Error('network'))).toEqual({});
  });

  it('extracts code and details from a JSON error body', async () => {
    const response = new Response(
      JSON.stringify({ code: 'invalid_cpfCnpj', details: 'CPF informado é inválido' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
    const fakeErr = { context: { response } } as never;
    const info = await extractAsaasError(fakeErr);
    expect(info).toEqual({
      code: 'invalid_cpfCnpj',
      details: 'CPF informado é inválido',
    });
  });

  it('tolerates non-JSON response bodies', async () => {
    const response = new Response('plain text', { status: 502 });
    const fakeErr = { context: { response } } as never;
    expect(await extractAsaasError(fakeErr)).toEqual({});
  });

  it('returns empty object when JSON has neither code nor details', async () => {
    const response = new Response(JSON.stringify({ message: 'oops' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
    const fakeErr = { context: { response } } as never;
    expect(await extractAsaasError(fakeErr)).toEqual({
      code: undefined,
      details: undefined,
    });
  });
});
