import { describe, it, expect } from 'vitest';
import {
  formatCurrencyBR, formatNumberBR, parseCurrencyBR, parseNumberBR,
  formatCPF, formatCNPJ, formatPhone, formatCEP, formatDateBR,
  toTitleCase,
} from './formatters';

describe('formatters', () => {
  it('formatCurrencyBR', () => {
    expect(formatCurrencyBR(1234.56)).toContain('1.234,56');
  });

  it('formatNumberBR', () => {
    expect(formatNumberBR(1234.5)).toContain('1.234,5');
  });

  it('parseCurrencyBR', () => {
    expect(parseCurrencyBR('R$ 1.234,56')).toBe(1234.56);
    expect(parseCurrencyBR('')).toBe(0);
  });

  it('parseNumberBR', () => {
    expect(parseNumberBR('1.234,5')).toBe(1234.5);
  });

  it('formatCPF', () => {
    expect(formatCPF('12345678901')).toBe('123.456.789-01');
  });

  it('formatCNPJ', () => {
    expect(formatCNPJ('12345678000199')).toBe('12.345.678/0001-99');
  });

  it('formatPhone mobile', () => {
    expect(formatPhone('11999887766')).toBe('(11) 99988-7766');
  });

  it('formatPhone landline', () => {
    expect(formatPhone('1133445566')).toBe('(11) 3344-5566');
  });

  it('formatCEP', () => {
    expect(formatCEP('12345678')).toBe('12345-678');
  });

  it('formatDateBR', () => {
    expect(formatDateBR('2026-05-11')).toContain('05');
  });

  describe('toTitleCase', () => {
    it('capitalizes mixed-case names', () => {
      expect(toTitleCase('juliano silva machado')).toBe('Juliano Silva Machado');
      expect(toTitleCase('Juliano silva Machado')).toBe('Juliano Silva Machado');
      expect(toTitleCase('JULIANO SILVA MACHADO')).toBe('Juliano Silva Machado');
    });

    it('keeps pt-BR prepositions lowercase except as first word', () => {
      expect(toTitleCase('joão da silva')).toBe('João da Silva');
      expect(toTitleCase('maria dos santos')).toBe('Maria dos Santos');
      expect(toTitleCase('de souza')).toBe('De Souza');
    });

    it('handles empty / null / undefined', () => {
      expect(toTitleCase('')).toBe('');
      expect(toTitleCase(null)).toBe('');
      expect(toTitleCase(undefined)).toBe('');
      expect(toTitleCase('   ')).toBe('');
    });

    it('preserves short uppercase acronyms and tokens with digits', () => {
      expect(toTitleCase('joão da USP')).toBe('João da USP');
      expect(toTitleCase('cliente id 7')).toBe('Cliente Id 7');
    });
  });
});
