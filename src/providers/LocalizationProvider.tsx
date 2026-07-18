import { useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import {
  LocalizationContext,
  LocalizationContextType,
  LocalizationSettings,
  getStoredSettings,
  saveSettings,
  CURRENCY_OPTIONS,
} from '@/hooks/useLocalization';
import { getTranslations, getNestedValue, interpolate } from '@/locales';
import {
  parseNumber as parseNum,
  parseCurrency as parseCur,
  formatNumberInput as formatNumInput,
  formatCurrencyInput as formatCurInput,
  getDecimalSeparator as getDecSep,
  getThousandSeparator as getThouSep,
  formatReadOnlyValue as formatReadOnly,
  LocaleType,
} from '@/lib/numberFormatter';

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<LocalizationSettings>(getStoredSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<LocalizationSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const getCurrencySymbol = useCallback(() => {
    return CURRENCY_OPTIONS.find(c => c.value === settings.currency)?.symbol || 'R$';
  }, [settings.currency]);

  const formatCurrency = useCallback((value: number): string => {
    return new Intl.NumberFormat(settings.numberFormat, {
      style: 'currency',
      currency: settings.currency,
    }).format(value);
  }, [settings.currency, settings.numberFormat]);

  const formatNumber = useCallback((value: number, decimals?: number): string => {
    return new Intl.NumberFormat(settings.numberFormat, {
      minimumFractionDigits: decimals ?? 0,
      maximumFractionDigits: decimals ?? 2,
    }).format(value);
  }, [settings.numberFormat]);

  const formatDate = useCallback((date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date + (date.includes('T') ? '' : 'T00:00:00')) : date;
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    switch (settings.dateFormat) {
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      default:
        return `${day}/${month}/${year}`;
    }
  }, [settings.dateFormat]);

  const formatDateShort = useCallback((date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date + (date.includes('T') ? '' : 'T00:00:00')) : date;
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);

    switch (settings.dateFormat) {
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      default:
        return `${day}/${month}/${year}`;
    }
  }, [settings.dateFormat]);

  const formatDateWithTimezone = useCallback((date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    return d.toLocaleString(settings.language, {
      timeZone: settings.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [settings.language, settings.timezone]);

  const pluralize = useCallback((count: number, singular: string, plural: string): string => {
    return count === 1 ? singular : plural;
  }, []);

  const getPreviewNumber = useCallback((): string => {
    return formatNumber(1234.56, 2);
  }, [formatNumber]);

  const getPreviewCurrency = useCallback((): string => {
    return formatCurrency(1234.56);
  }, [formatCurrency]);

  const getPreviewDate = useCallback((): string => {
    return formatDate(new Date());
  }, [formatDate]);

  const translations = useMemo(() => getTranslations(settings.language), [settings.language]);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const text = getNestedValue(translations, key);
    return interpolate(text, params);
  }, [translations]);

  // New locale-aware parsing and input formatting
  const locale = settings.numberFormat as LocaleType;

  const parseNumber = useCallback((value: string): number => {
    return parseNum(value, locale);
  }, [locale]);

  const parseCurrency = useCallback((value: string): number => {
    return parseCur(value, locale);
  }, [locale]);

  const formatNumberInput = useCallback((value: string): string => {
    return formatNumInput(value, locale);
  }, [locale]);

  const formatCurrencyInput = useCallback((value: string): string => {
    return formatCurInput(value, locale);
  }, [locale]);

  const formatReadOnlyValue = useCallback((value: number, decimals: number = 2): string => {
    return formatReadOnly(value, locale, decimals);
  }, [locale]);

  const getDecimalSeparator = useCallback((): string => {
    return getDecSep(locale);
  }, [locale]);

  const getThousandSeparator = useCallback((): string => {
    return getThouSep(locale);
  }, [locale]);

  const value: LocalizationContextType = {
    settings,
    updateSettings,
    getCurrencySymbol,
    formatCurrency,
    formatNumber,
    formatDate,
    formatDateShort,
    formatDateWithTimezone,
    pluralize,
    getPreviewNumber,
    getPreviewCurrency,
    getPreviewDate,
    t,
    translations,
    parseNumber,
    parseCurrency,
    formatNumberInput,
    formatCurrencyInput,
    formatReadOnlyValue,
    getDecimalSeparator,
    getThousandSeparator,
  };

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}
