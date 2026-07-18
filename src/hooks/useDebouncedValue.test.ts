import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue, useDebouncedCallback } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('debounces value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      { initialProps: { value: 'hello', delay: 300 } }
    );

    expect(result.current).toBe('hello');

    rerender({ value: 'world', delay: 300 });
    expect(result.current).toBe('hello'); // Still old value

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('hello'); // Still old value

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('world'); // Now updated
  });

  it('resets timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'a' } }
    );

    rerender({ value: 'b' });
    act(() => { vi.advanceTimersByTime(150); });

    rerender({ value: 'c' });
    act(() => { vi.advanceTimersByTime(150); });
    expect(result.current).toBe('a'); // Timer was reset

    act(() => { vi.advanceTimersByTime(150); });
    expect(result.current).toBe('c'); // Finally updated
  });

  it('uses default delay of 300ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'changed' });
    act(() => { vi.advanceTimersByTime(299); });
    expect(result.current).toBe('initial');

    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe('changed');
  });

  it('handles different types', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue<number>(value, 100),
      { initialProps: { value: 0 } }
    );

    expect(result.current).toBe(0);

    rerender({ value: 42 });
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe(42);
  });
});

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces callback execution', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    result.current('test');
    expect(callback).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(300); });
    expect(callback).toHaveBeenCalledWith('test');
  });

  it('cancels previous call on rapid invocations', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    result.current('first');
    act(() => { vi.advanceTimersByTime(150); });

    result.current('second');
    act(() => { vi.advanceTimersByTime(300); });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('second');
  });
});
