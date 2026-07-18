import { useState, useCallback, useMemo, useRef } from 'react';

export interface FieldValidation {
  isValid: boolean;
  isTouched: boolean;
  error?: string;
}

export interface ValidationRule {
  required?: boolean;
  requiredMessage?: string;
  minValue?: number;
  minValueMessage?: string;
  custom?: (value: unknown) => string | undefined;
}

export interface FormValidationConfig {
  [fieldName: string]: ValidationRule;
}

export function useFormValidation<T extends Record<string, unknown>>(
  formData: T,
  config: FormValidationConfig
) {
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const fieldRefs = useRef<Map<string, HTMLElement>>(new Map());

  const markFieldTouched = useCallback((fieldName: string) => {
    setTouchedFields((prev) => {
      const newSet = new Set(prev);
      newSet.add(fieldName);
      return newSet;
    });
  }, []);

  const markAllFieldsTouched = useCallback(() => {
    setTouchedFields(new Set(Object.keys(config)));
  }, [config]);

  const registerFieldRef = useCallback((fieldName: string, element: HTMLElement | null) => {
    if (element) {
      fieldRefs.current.set(fieldName, element);
    } else {
      fieldRefs.current.delete(fieldName);
    }
  }, []);

  const validateField = useCallback(
    (fieldName: string, value: unknown): string | undefined => {
      const rule = config[fieldName];
      if (!rule) return undefined;

      // Required validation
      if (rule.required) {
        const isEmpty =
          value === undefined ||
          value === null ||
          value === '' ||
          (typeof value === 'number' && (isNaN(value) || value === 0));
        
        if (isEmpty) {
          return rule.requiredMessage || 'Campo obrigatório';
        }
      }

      // Min value validation
      if (rule.minValue !== undefined && typeof value === 'number') {
        if (value < rule.minValue) {
          return rule.minValueMessage || `Valor mínimo: ${rule.minValue}`;
        }
      }

      // Custom validation
      if (rule.custom) {
        return rule.custom(value);
      }

      return undefined;
    },
    [config]
  );

  const fieldValidations = useMemo(() => {
    const validations: Record<string, FieldValidation> = {};

    for (const fieldName of Object.keys(config)) {
      const value = formData[fieldName];
      const error = validateField(fieldName, value);
      const isTouched = touchedFields.has(fieldName);

      validations[fieldName] = {
        isValid: !error,
        isTouched,
        error: isTouched ? error : undefined,
      };
    }

    return validations;
  }, [config, formData, touchedFields, validateField]);

  const isFormValid = useMemo(() => {
    return Object.values(fieldValidations).every((v) => v.isValid);
  }, [fieldValidations]);

  const invalidFields = useMemo(() => {
    return Object.entries(fieldValidations)
      .filter(([, v]) => !v.isValid)
      .map(([fieldName]) => fieldName);
  }, [fieldValidations]);

  const getInvalidFieldsLabels = useCallback(
    (fieldLabels: Record<string, string>) => {
      return invalidFields
        .map((field) => fieldLabels[field] || field)
        .filter(Boolean);
    },
    [invalidFields]
  );

  const scrollToFirstError = useCallback(() => {
    for (const fieldName of invalidFields) {
      const element = fieldRefs.current.get(fieldName);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Apply shake animation via inline styles
        element.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
          element.style.animation = '';
        }, 600);
        break;
      }
    }
  }, [invalidFields]);

  const handleDisabledClick = useCallback(() => {
    markAllFieldsTouched();
    setTimeout(() => {
      scrollToFirstError();
    }, 100);
  }, [markAllFieldsTouched, scrollToFirstError]);

  return {
    fieldValidations,
    isFormValid,
    invalidFields,
    markFieldTouched,
    markAllFieldsTouched,
    registerFieldRef,
    getInvalidFieldsLabels,
    scrollToFirstError,
    handleDisabledClick,
  };
}
