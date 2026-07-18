import { describe, expect, it, vi } from 'vitest';
import { sanitizeError, isUserFacingError, getSafeErrorMessage } from './errorSanitizer';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn() },
}));

describe('sanitizeError', () => {
  it.each([
    ['violates foreign key constraint', 'Este item está vinculado a outros registros e não pode ser removido.'],
    ['duplicate key value violates unique constraint', 'Este registro já existe.'],
    ['null value in column "x"', 'Campos obrigatórios estão faltando.'],
    ['permission denied for table', 'Você não tem permissão para esta ação.'],
    ['row-level security violation', 'Você não tem permissão para esta ação.'],
    ['storage bucket not found', 'Erro ao processar o arquivo.'],
    ['network error: fetch failed', 'Erro de conexão. Verifique sua internet.'],
    ['invalid jwt', 'Sessão expirada. Faça login novamente.'],
    ['check constraint violation', 'Dados inválidos. Verifique os valores informados.'],
  ])('maps %s to a friendly Portuguese message', (raw, expected) => {
    expect(sanitizeError(new Error(raw))).toBe(expected);
  });

  it('falls back to a generic message when the pattern is unknown', () => {
    expect(sanitizeError(new Error('some unexpected db error'))).toBe(
      'Ocorreu um erro. Tente novamente.',
    );
  });

  it('never leaks the raw error string', () => {
    const result = sanitizeError(new Error('connection to 10.0.0.5:5432 refused (password: hunter2)'));
    expect(result).not.toContain('10.0.0.5');
    expect(result).not.toContain('hunter2');
  });

  it('handles non-Error inputs without crashing', () => {
    expect(sanitizeError(null)).toBe('Ocorreu um erro. Tente novamente.');
    expect(sanitizeError(undefined)).toBe('Ocorreu um erro. Tente novamente.');
    expect(sanitizeError('raw string')).toBe('Ocorreu um erro. Tente novamente.');
  });
});

describe('isUserFacingError', () => {
  it('preserves limit/plan messages meant for the user', () => {
    expect(isUserFacingError(new Error('Você atingiu o limite de 20 operações'))).toBe(true);
    expect(isUserFacingError(new Error('Faça upgrade para o plano basic'))).toBe(true);
  });

  it('does not treat DB errors as user-facing', () => {
    expect(isUserFacingError(new Error('duplicate key value'))).toBe(false);
  });
});

describe('getSafeErrorMessage', () => {
  it('returns user-facing messages as-is', () => {
    const msg = 'Você atingiu o limite de 20 operações por mês';
    expect(getSafeErrorMessage(new Error(msg))).toBe(msg);
  });

  it('sanitizes system errors', () => {
    expect(getSafeErrorMessage(new Error('permission denied for table operations'))).toBe(
      'Você não tem permissão para esta ação.',
    );
  });
});
