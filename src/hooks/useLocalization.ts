import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { logger } from "@/lib/logger";
import { getTranslations, getNestedValue, interpolate, TranslationKeys } from '@/locales';
import {
  parseNumber as parseNum,
  parseCurrency as parseCur,
  formatNumberInput as formatNumInput,
  formatCurrencyInput as formatCurInput,
  getDecimalSeparator as getDecSep,
  getThousandSeparator as getThouSep,
  formatReadOnlyValue,
  LocaleType,
} from '@/lib/numberFormatter';

export type Currency = 'BRL' | 'USD' | 'EUR' | 'GBP';
export type NumberFormat = 'pt-BR' | 'en-US' | 'de-DE';
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
export type Language = 'pt-BR' | 'en-US' | 'es-ES';
export type Timezone = string;

export interface LocalizationSettings {
  currency: Currency;
  numberFormat: NumberFormat;
  dateFormat: DateFormat;
  language: Language;
  timezone: Timezone;
}

const STORAGE_KEY = 'milespro-localization';

const DEFAULT_SETTINGS: LocalizationSettings = {
  currency: 'BRL',
  numberFormat: 'pt-BR',
  dateFormat: 'DD/MM/YYYY',
  language: 'pt-BR',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

export const CURRENCY_OPTIONS: { value: Currency; label: string; symbol: string }[] = [
  { value: 'BRL', label: 'Real Brasileiro (BRL)', symbol: 'R$' },
  { value: 'USD', label: 'Dólar Americano (USD)', symbol: '$' },
  { value: 'EUR', label: 'Euro (EUR)', symbol: '€' },
  { value: 'GBP', label: 'Libra Esterlina (GBP)', symbol: '£' },
];

export const NUMBER_FORMAT_OPTIONS: { value: NumberFormat; label: string; example: string }[] = [
  { value: 'pt-BR', label: 'Brasileiro', example: 'R$ 1.234,56' },
  { value: 'en-US', label: 'Americano', example: '$1,234.56' },
  { value: 'de-DE', label: 'Europeu', example: '€1.234,56' },
];

export const DATE_FORMAT_OPTIONS: { value: DateFormat; label: string; example: string }[] = [
  { value: 'DD/MM/YYYY', label: 'Dia/Mês/Ano', example: '29/11/2025' },
  { value: 'MM/DD/YYYY', label: 'Mês/Dia/Ano', example: '11/29/2025' },
  { value: 'YYYY-MM-DD', label: 'Ano-Mês-Dia (ISO)', example: '2025-11-29' },
];

export const LANGUAGE_OPTIONS: { value: Language; label: string; flag: string }[] = [
  { value: 'pt-BR', label: 'Português (Brasil)', flag: '🇧🇷' },
  { value: 'en-US', label: 'English (US)', flag: '🇺🇸' },
  { value: 'es-ES', label: 'Español (España)', flag: '🇪🇸' },
];

export const TIMEZONE_OPTIONS: { value: string; label: string; offset: string }[] = [
  { value: 'America/Sao_Paulo', label: 'Brasília', offset: 'GMT-3' },
  { value: 'America/New_York', label: 'Nova York', offset: 'GMT-5' },
  { value: 'America/Los_Angeles', label: 'Los Angeles', offset: 'GMT-8' },
  { value: 'Europe/London', label: 'Londres', offset: 'GMT+0' },
  { value: 'Europe/Paris', label: 'Paris', offset: 'GMT+1' },
  { value: 'Europe/Berlin', label: 'Berlim', offset: 'GMT+1' },
  { value: 'Asia/Tokyo', label: 'Tóquio', offset: 'GMT+9' },
  { value: 'Asia/Dubai', label: 'Dubai', offset: 'GMT+4' },
  { value: 'Australia/Sydney', label: 'Sydney', offset: 'GMT+11' },
];

// Translation function type
export type TranslateFunction = (key: string, params?: Record<string, string | number>) => string;

export interface LocalizationContextType {
  settings: LocalizationSettings;
  updateSettings: (updates: Partial<LocalizationSettings>) => void;
  getCurrencySymbol: () => string;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number, decimals?: number) => string;
  formatDate: (date: Date | string) => string;
  formatDateShort: (date: Date | string) => string;
  formatDateWithTimezone: (date: Date | string) => string;
  pluralize: (count: number, singular: string, plural: string) => string;
  getPreviewNumber: () => string;
  getPreviewCurrency: () => string;
  getPreviewDate: () => string;
  t: TranslateFunction;
  translations: TranslationKeys;
  // New parsing and input formatting functions
  parseNumber: (value: string) => number;
  parseCurrency: (value: string) => number;
  formatNumberInput: (value: string) => string;
  formatCurrencyInput: (value: string) => string;
  formatReadOnlyValue: (value: number, decimals?: number) => string;
  getDecimalSeparator: () => string;
  getThousandSeparator: () => string;
}

export const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export function getStoredSettings(): LocalizationSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    logger.error('Error loading localization settings:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: LocalizationSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

// Helper functions for formatting
export function createFormatters(settings: LocalizationSettings) {
  const getCurrencySymbol = () => {
    return CURRENCY_OPTIONS.find(c => c.value === settings.currency)?.symbol || 'R$';
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat(settings.numberFormat, {
      style: 'currency',
      currency: settings.currency,
    }).format(value);
  };

  const formatNumber = (value: number, decimals?: number): string => {
    return new Intl.NumberFormat(settings.numberFormat, {
      minimumFractionDigits: decimals ?? 0,
      maximumFractionDigits: decimals ?? 2,
    }).format(value);
  };

  const formatDate = (date: Date | string): string => {
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
  };

  const formatDateShort = (date: Date | string): string => {
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
  };

  const formatDateWithTimezone = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    return d.toLocaleString(settings.language, {
      timeZone: settings.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const pluralize = (count: number, singular: string, plural: string): string => {
    return count === 1 ? singular : plural;
  };

  // New locale-aware parsing and input formatting
  const locale = settings.numberFormat as LocaleType;
  
  const parseNumber = (value: string): number => parseNum(value, locale);
  const parseCurrency = (value: string): number => parseCur(value, locale);
  const formatNumberInputFn = (value: string): string => formatNumInput(value, locale);
  const formatCurrencyInputFn = (value: string): string => formatCurInput(value, locale);
  const formatReadOnlyValueFn = (value: number, decimals: number = 2): string => formatReadOnlyValue(value, locale, decimals);
  const getDecimalSeparator = (): string => getDecSep(locale);
  const getThousandSeparator = (): string => getThouSep(locale);

  return {
    getCurrencySymbol,
    formatCurrency,
    formatNumber,
    formatDate,
    formatDateShort,
    formatDateWithTimezone,
    pluralize,
    getPreviewNumber: () => formatNumber(1234.56, 2),
    getPreviewCurrency: () => formatCurrency(1234.56),
    getPreviewDate: () => formatDate(new Date()),
    parseNumber,
    parseCurrency,
    formatNumberInput: formatNumberInputFn,
    formatCurrencyInput: formatCurrencyInputFn,
    formatReadOnlyValue: formatReadOnlyValueFn,
    getDecimalSeparator,
    getThousandSeparator,
  };
}

// Create translation function
export function createTranslator(language: Language): TranslateFunction {
  const translationData = getTranslations(language);
  
  return (key: string, params?: Record<string, string | number>): string => {
    const text = getNestedValue(translationData, key);
    return interpolate(text, params);
  };
}

export function useLocalization(): LocalizationContextType {
  const context = useContext(LocalizationContext);
  
  if (context === undefined) {
    // Return default implementation for components outside provider
    const settings = getStoredSettings();
    const formatters = createFormatters(settings);
    const translationData = getTranslations(settings.language);
    const t = createTranslator(settings.language);
    
    return {
      settings,
      updateSettings: () => {},
      ...formatters,
      t,
      translations: translationData,
    };
  }
  
  return context;
}
