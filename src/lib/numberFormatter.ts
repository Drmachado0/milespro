// Unified locale-aware number formatting utilities

export type LocaleType = 'pt-BR' | 'en-US' | 'de-DE';

/**
 * Parse a localized string to a number
 */
export function parseNumber(value: string, locale: LocaleType): number {
  if (!value || typeof value !== 'string') return 0;
  
  const cleaned = value.trim();
  if (!cleaned) return 0;

  if (locale === 'pt-BR' || locale === 'de-DE') {
    // pt-BR/de-DE: 1.234,56 -> 1234.56
    // Remove thousand separators (dots), replace decimal separator (comma) with dot
    const normalized = cleaned
      .replace(/\./g, '')
      .replace(',', '.');
    return parseFloat(normalized) || 0;
  }
  
  // en-US: 1,234.56 -> 1234.56
  // Remove thousand separators (commas), keep decimal separator (dot)
  const normalized = cleaned.replace(/,/g, '');
  return parseFloat(normalized) || 0;
}

/**
 * Parse a localized currency string to a number
 */
export function parseCurrency(value: string, locale: LocaleType): number {
  if (!value || typeof value !== 'string') return 0;
  
  // Remove currency symbols and whitespace
  const cleaned = value.replace(/[R$€£\s]/g, '').trim();
  return parseNumber(cleaned, locale);
}

/**
 * Format a number for display (output)
 */
export function formatNumber(
  value: number,
  locale: LocaleType,
  decimals: number = 0
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a currency value for display (output)
 */
export function formatCurrency(
  value: number,
  locale: LocaleType,
  currency: string = 'BRL'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Get decimal separator for locale
 */
export function getDecimalSeparator(locale: LocaleType): string {
  return locale === 'en-US' ? '.' : ',';
}

/**
 * Get thousand separator for locale
 */
export function getThousandSeparator(locale: LocaleType): string {
  return locale === 'en-US' ? ',' : '.';
}

/**
 * Format number input while user is typing (live formatting)
 * For integer inputs (quantities)
 */
export function formatNumberInput(value: string, locale: LocaleType): string {
  // Remove all non-numeric characters
  const cleaned = value.replace(/\D/g, '');
  if (!cleaned) return '';
  
  const thousandSep = getThousandSeparator(locale);
  
  // Add thousand separators
  return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep);
}

/**
 * Format currency input while user is typing (live formatting)
 * For decimal inputs (money values)
 */
export function formatCurrencyInput(value: string, locale: LocaleType): string {
  const decimalSep = getDecimalSeparator(locale);
  const thousandSep = getThousandSeparator(locale);
  
  // Remove invalid characters, keep only digits and decimal separator
  let cleaned = value.replace(new RegExp(`[^\\d${decimalSep === '.' ? '\\.' : decimalSep}]`, 'g'), '');
  
  // Handle decimal separator: keep the first one, merge any extras into the decimal part.
  const parts = cleaned.split(decimalSep);
  const intSection = parts[0] ?? '';
  let decSection = parts.length > 1 ? parts.slice(1).join('') : undefined;

  // Limit decimal places to 2
  if (decSection !== undefined && decSection.length > 2) {
    decSection = decSection.slice(0, 2);
  }

  cleaned = decSection !== undefined ? intSection + decimalSep + decSection : intSection;
  
  // Add thousand separators to integer part
  const [intPart, decPart] = cleaned.split(decimalSep);
  if (intPart && intPart.length > 3) {
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep);
    cleaned = decPart !== undefined ? formattedInt + decimalSep + decPart : formattedInt;
  }
  
  return cleaned;
}

/**
 * Format a number as a read-only display value (for computed fields)
 */
export function formatReadOnlyValue(
  value: number,
  locale: LocaleType,
  decimals: number = 2
): string {
  if (value === 0 || isNaN(value)) return '';
  return formatNumber(value, locale, decimals);
}
