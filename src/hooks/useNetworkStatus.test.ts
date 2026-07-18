import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNetworkStatus } from './useNetworkStatus';

describe('useNetworkStatus', () => {
  const originalOnLine = navigator.onLine;
  const listeners: Record<string, EventListener[]> = {};

  beforeEach(() => {
    // Mock window event listeners
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });

    vi.spyOn(window, 'addEventListener').mockImplementation(((type: string, listener: EventListenerOrEventListenerObject) => {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(listener as EventListener);
    }) as typeof window.addEventListener);

    vi.spyOn(window, 'removeEventListener').mockImplementation(((type: string, listener: EventListenerOrEventListenerObject) => {
      if (listeners[type]) {
        listeners[type] = listeners[type].filter(l => l !== (listener as EventListener));
      }
    }) as typeof window.removeEventListener);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.keys(listeners).forEach(key => delete listeners[key]);
    Object.defineProperty(navigator, 'onLine', {
      value: originalOnLine,
      writable: true,
      configurable: true,
    });
  });

  it('returns online status on mount', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.online).toBe(true);
    expect(result.current.effectiveType).toBe('unknown');
    expect(result.current.saveData).toBe(false);
    expect(result.current.isSlowConnection).toBe(false);
  });

  it('updates when going offline', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.online).toBe(true);

    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    
    act(() => {
      const offlineListeners = listeners['offline'] || [];
      offlineListeners.forEach(l => l(new Event('offline')));
    });

    expect(result.current.online).toBe(false);
  });

  it('updates when coming back online', () => {
    // Start offline
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.online).toBe(false);

    // Go online
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    act(() => {
      const onlineListeners = listeners['online'] || [];
      onlineListeners.forEach(l => l(new Event('online')));
    });

    expect(result.current.online).toBe(true);
  });

  it('cleans up event listeners on unmount', () => {
    const { unmount } = renderHook(() => useNetworkStatus());
    
    const addCalls = (window.addEventListener as ReturnType<typeof vi.fn>).mock.calls.length;
    unmount();
    
    const removeCalls = (window.removeEventListener as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(removeCalls).toBeGreaterThanOrEqual(addCalls);
  });
});
