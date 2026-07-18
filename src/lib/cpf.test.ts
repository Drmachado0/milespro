import { describe, it, expect } from 'vitest';
import { isValidCpf } from './cpf';

describe('isValidCpf', () => {
  it('accepts a well-known valid CPF in raw form', () => {
    // 11144477735 is a frequently-used test CPF that satisfies the algorithm.
    expect(isValidCpf('11144477735')).toBe(true);
  });

  it('accepts the same CPF in formatted form', () => {
    expect(isValidCpf('111.444.777-35')).toBe(true);
  });

  it('rejects a CPF with wrong check digits', () => {
    expect(isValidCpf('11144477730')).toBe(false);
    expect(isValidCpf('11144477700')).toBe(false);
  });

  it('rejects sentinel all-identical sequences', () => {
    expect(isValidCpf('00000000000')).toBe(false);
    expect(isValidCpf('11111111111')).toBe(false);
    expect(isValidCpf('99999999999')).toBe(false);
  });

  it('rejects strings with wrong digit count', () => {
    expect(isValidCpf('123')).toBe(false);
    expect(isValidCpf('12345678901234')).toBe(false);
    expect(isValidCpf('')).toBe(false);
  });

  it('rejects strings with letters (after digit strip leaves wrong length)', () => {
    expect(isValidCpf('abc.def.ghi-jk')).toBe(false);
    expect(isValidCpf('111.444.777-3a')).toBe(false); // strips to 10 digits
  });

  it('accepts another known-valid CPF (different check digits path)', () => {
    // 52998224725 — second canonical test CPF.
    expect(isValidCpf('52998224725')).toBe(true);
    expect(isValidCpf('529.982.247-25')).toBe(true);
  });
});
