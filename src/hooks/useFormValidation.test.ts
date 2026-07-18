import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormValidation } from './useFormValidation';

describe('useFormValidation', () => {
  const config = {
    name: { required: true, requiredMessage: 'Nome obrigatório' },
    age: { minValue: 18, minValueMessage: 'Idade mínima: 18' },
    email: { required: true },
  };

  it('marks form invalid when required fields empty', () => {
    const { result } = renderHook(() => useFormValidation({ name: '', age: 0, email: '' }, config));
    expect(result.current.isFormValid).toBe(false);
  });

  it('marks form valid when all fields pass', () => {
    const { result } = renderHook(() => useFormValidation({ name: 'Juliano', age: 30, email: 'a@b.com' }, config));
    expect(result.current.isFormValid).toBe(true);
  });

  it('shows error only after field is touched', () => {
    const { result } = renderHook(() => useFormValidation({ name: '', age: 25, email: 'a@b.com' }, config));
    expect(result.current.fieldValidations.name.error).toBeUndefined();

    act(() => { result.current.markFieldTouched('name'); });
    expect(result.current.fieldValidations.name.error).toBe('Nome obrigatório');
  });

  it('validates minValue', () => {
    const { result } = renderHook(() => useFormValidation({ name: 'Test', age: 10, email: 'a@b.com' }, config));
    act(() => { result.current.markFieldTouched('age'); });
    expect(result.current.fieldValidations.age.error).toBe('Idade mínima: 18');
  });

  it('custom validation works', () => {
    const cfg = { code: { custom: (v: unknown) => (v as string).length < 3 ? 'Mínimo 3 chars' : undefined } };
    const { result } = renderHook(() => useFormValidation({ code: 'ab' }, cfg));
    act(() => { result.current.markFieldTouched('code'); });
    expect(result.current.fieldValidations.code.error).toBe('Mínimo 3 chars');
  });

  it('markAllFieldsTouched touches all fields', () => {
    const { result } = renderHook(() => useFormValidation({ name: '', age: 0, email: '' }, config));
    act(() => { result.current.markAllFieldsTouched(); });
    expect(result.current.invalidFields).toContain('name');
    expect(result.current.invalidFields).toContain('email');
  });

  it('getInvalidFieldsLabels maps field names to labels', () => {
    const { result } = renderHook(() => useFormValidation({ name: '', age: 30, email: 'a@b.com' }, config));
    act(() => { result.current.markAllFieldsTouched(); });
    const labels = result.current.getInvalidFieldsLabels({ name: 'Nome', email: 'E-mail' });
    expect(labels).toContain('Nome');
  });
});
