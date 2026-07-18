import { describe, expect, it } from 'vitest';
import {
  parseNumber,
  parseCurrency,
  formatNumber,
  formatCurrency,
  formatNumberInput,
  formatCurrencyInput,
} from './numberFormatter';

describe('parseNumber', () => {
  it('parses pt-BR localized numbers', () => {
    expect(parseNumber('1.234,56', 'pt-BR')).toBe(1234.56);
    expect(parseNumber('1.234.567,89', 'pt-BR')).toBe(1234567.89);
    expect(parseNumber('0,5', 'pt-BR')).toBe(0.5);
  });

  it('parses en-US localized numbers', () => {
    expect(parseNumber('1,234.56', 'en-US')).toBe(1234.56);
    expect(parseNumber('1,234,567.89', 'en-US')).toBe(1234567.89);
  });

  it('returns 0 for empty/invalid input', () => {
    expect(parseNumber('', 'pt-BR')).toBe(0);
    expect(parseNumber('   ', 'pt-BR')).toBe(0);
    // @ts-expect-error - defensive check
    expect(parseNumber(null, 'pt-BR')).toBe(0);
  });
});

describe('parseCurrency', () => {
  it('strips R$/€/£ before parsing', () => {
    expect(parseCurrency('R$ 1.234,56', 'pt-BR')).toBe(1234.56);
    expect(parseCurrency('€ 1.000,00', 'pt-BR')).toBe(1000);
    expect(parseCurrency('$1,234.56', 'en-US')).toBe(1234.56);
  });
});

describe('formatNumber', () => {
  it('formats with correct locale separators', () => {
    expect(formatNumber(1234567, 'pt-BR')).toBe('1.234.567');
    expect(formatNumber(1234567, 'en-US')).toBe('1,234,567');
  });

  it('respects the decimals argument', () => {
    expect(formatNumber(1234.5678, 'pt-BR', 2)).toBe('1.234,57');
  });
});

describe('formatCurrency', () => {
  it('uses BRL by default in pt-BR', () => {
    const out = formatCurrency(1234.56, 'pt-BR');
    // Intl injects NBSP between symbol and value — normalize for the assertion.
    expect(out.replace(/\s/g, ' ')).toBe('R$ 1.234,56');
  });
});

describe('formatNumberInput', () => {
  it('live-formats integers with thousand separators', () => {
    expect(formatNumberInput('1000000', 'pt-BR')).toBe('1.000.000');
    expect(formatNumberInput('1000000', 'en-US')).toBe('1,000,000');
    expect(formatNumberInput('abc123', 'pt-BR')).toBe('123');
    expect(formatNumberInput('', 'pt-BR')).toBe('');
  });
});

describe('formatCurrencyInput', () => {
  it('caps to 2 decimals and inserts thousand separators', () => {
    expect(formatCurrencyInput('1234,567', 'pt-BR')).toBe('1.234,56');
    expect(formatCurrencyInput('1234.567', 'en-US')).toBe('1,234.56');
  });

  it('keeps only the first decimal separator and still caps to 2 decimals', () => {
    expect(formatCurrencyInput('12,34,56', 'pt-BR')).toBe('12,34');
  });
});
