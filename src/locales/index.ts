import { ptBR, TranslationKeys } from './pt-BR';
import { enUS } from './en-US';
import { Language } from '@/hooks/useLocalization';

export type { TranslationKeys };

export const translations: Record<Language, TranslationKeys> = {
  'pt-BR': ptBR,
  'en-US': enUS,
  'es-ES': ptBR, // Fallback to PT-BR until Spanish is added
};

export function getTranslations(language: Language): TranslationKeys {
  return translations[language] || translations['pt-BR'];
}

// Type-safe translation key path
type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

export type TranslationKey = NestedKeyOf<TranslationKeys>;

// Get nested value from object using dot notation
export function getNestedValue(obj: unknown, path: string): string {
  const keys = path.split('.');
  let result: unknown = obj;
  
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return path; // Return the key if translation not found
    }
  }
  
  return typeof result === 'string' ? result : path;
}

// Replace placeholders in translation string
export function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  
  return text.replace(/\{(\w+)\}/g, (_, key) => {
    return params[key]?.toString() ?? `{${key}}`;
  });
}
