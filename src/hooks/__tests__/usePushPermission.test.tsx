/**
 * usePushPermission.test.tsx — D-T07 contextual gate + idempotency tests.
 *
 * Coverage:
 *   1. shouldShowPrompt = false when programCount = 0
 *   2. shouldShowPrompt = true when programCount >= 1 + seen_at null + permission prompt
 *   3. shouldShowPrompt = false when push_pre_prompt_seen_at NOT null (idempotency)
 *   4. requestPermission granted → telemetry + register + setHasPermission(granted)
 *   5. requestPermission denied → telemetry + no register + setHasPermission(denied)
 *   6. Web no-op — hasPermission stays denied, no native calls
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

let isNative = true;

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNative,
    getPlatform: () => 'ios',
  },
}));

const checkPermissionsMock = vi.fn();
const requestPermissionsMock = vi.fn();
const registerMock = vi.fn();
vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    checkPermissions: () => checkPermissionsMock(),
    requestPermissions: () => requestPermissionsMock(),
    register: () => registerMock(),
  },
}));

const upsertMock = vi.fn();
const maybeSingleMock = vi.fn();
const countSelectMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (_table: string) => ({
      select: (_cols: string, options?: { head?: boolean; count?: string }) => ({
        eq: (_col: string, _val: string) => {
          if (options?.head && options?.count === 'exact') return countSelectMock();
          return { maybeSingle: maybeSingleMock };
        },
      }),
      upsert: upsertMock,
    }),
  },
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));

const tel = {
  trackPushPromptShown: vi.fn(),
  trackPushPermissionGranted: vi.fn(),
  trackPushPermissionDenied: vi.fn(),
};
vi.mock('@/hooks/useTelemetry', () => ({ useTelemetry: () => tel }));

vi.mock('@/lib/logger', () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { usePushPermission } from '@/hooks/usePushPermission';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('usePushPermission', () => {
  beforeEach(() => {
    isNative = true;
    checkPermissionsMock.mockReset().mockResolvedValue({ receive: 'prompt' });
    requestPermissionsMock.mockReset();
    registerMock.mockReset();
    upsertMock.mockReset().mockResolvedValue({ error: null });
    maybeSingleMock
      .mockReset()
      .mockResolvedValue({ data: { push_pre_prompt_seen_at: null }, error: null });
    countSelectMock.mockReset().mockResolvedValue({ count: 0, error: null });
    tel.trackPushPromptShown.mockReset();
    tel.trackPushPermissionGranted.mockReset();
    tel.trackPushPermissionDenied.mockReset();
  });

  it('shouldShowPrompt = false when programCount = 0', async () => {
    const { result } = renderHook(() => usePushPermission(), { wrapper });
    await waitFor(() => expect(result.current.hasPermission).toBe('prompt'));
    expect(result.current.shouldShowPrompt).toBe(false);
  });

  it('shouldShowPrompt = true when programCount >= 1 + seen_at is null + permission prompt', async () => {
    countSelectMock.mockResolvedValue({ count: 1, error: null });
    const { result } = renderHook(() => usePushPermission(), { wrapper });
    await waitFor(() => expect(result.current.shouldShowPrompt).toBe(true));
  });

  it('shouldShowPrompt = false when push_pre_prompt_seen_at is NOT null (idempotency)', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { push_pre_prompt_seen_at: '2026-05-01T00:00:00Z' },
      error: null,
    });
    countSelectMock.mockResolvedValue({ count: 1, error: null });
    const { result } = renderHook(() => usePushPermission(), { wrapper });
    await waitFor(() => expect(result.current.hasPermission).toBe('prompt'));
    expect(result.current.shouldShowPrompt).toBe(false);
  });

  it('requestPermission granted → telemetry + register + setHasPermission(granted)', async () => {
    countSelectMock.mockResolvedValue({ count: 1, error: null });
    requestPermissionsMock.mockResolvedValue({ receive: 'granted' });
    registerMock.mockResolvedValue(undefined);
    const { result } = renderHook(() => usePushPermission(), { wrapper });
    await waitFor(() => expect(result.current.shouldShowPrompt).toBe(true));

    await act(async () => {
      await result.current.requestPermission();
    });

    expect(upsertMock).toHaveBeenCalled();
    expect(tel.trackPushPromptShown).toHaveBeenCalledWith({ trigger: 'first_balance' });
    expect(tel.trackPushPermissionGranted).toHaveBeenCalledWith({ platform: 'ios' });
    expect(registerMock).toHaveBeenCalled();
    expect(result.current.hasPermission).toBe('granted');
  });

  it('requestPermission denied → telemetry + no register', async () => {
    countSelectMock.mockResolvedValue({ count: 1, error: null });
    requestPermissionsMock.mockResolvedValue({ receive: 'denied' });
    const { result } = renderHook(() => usePushPermission(), { wrapper });
    await waitFor(() => expect(result.current.shouldShowPrompt).toBe(true));

    await act(async () => {
      await result.current.requestPermission();
    });

    expect(tel.trackPushPermissionDenied).toHaveBeenCalledWith({ platform: 'ios' });
    expect(registerMock).not.toHaveBeenCalled();
    expect(result.current.hasPermission).toBe('denied');
  });

  it('web no-op — hasPermission stays denied, no native calls', async () => {
    isNative = false;
    const { result } = renderHook(() => usePushPermission(), { wrapper });
    await waitFor(() => expect(result.current.hasPermission).toBe('denied'));
    expect(result.current.shouldShowPrompt).toBe(false);
    expect(checkPermissionsMock).not.toHaveBeenCalled();
  });

  // P1-10 — dismissPrePrompt soft-dismiss: marks seen_at + telemetry,
  // but MUST NOT invoke PushNotifications.requestPermissions() so that the
  // user's single native-dialog chance is not burned on a "Not now" click.
  it('dismissPrePrompt marks seen + telemetry without calling native API', async () => {
    countSelectMock.mockResolvedValue({ count: 1, error: null });
    const { result } = renderHook(() => usePushPermission(), { wrapper });
    await waitFor(() => expect(result.current.shouldShowPrompt).toBe(true));

    await act(async () => {
      await result.current.dismissPrePrompt();
    });

    expect(upsertMock).toHaveBeenCalled();
    expect(tel.trackPushPromptShown).toHaveBeenCalledWith({ trigger: 'first_balance' });
    expect(requestPermissionsMock).not.toHaveBeenCalled();
    expect(registerMock).not.toHaveBeenCalled();
    // hasPermission stays at 'prompt' — user can still grant via system Settings.
    expect(result.current.hasPermission).toBe('prompt');
  });

  it('dismissPrePrompt does not record a denial telemetry event', async () => {
    countSelectMock.mockResolvedValue({ count: 1, error: null });
    const { result } = renderHook(() => usePushPermission(), { wrapper });
    await waitFor(() => expect(result.current.shouldShowPrompt).toBe(true));

    await act(async () => {
      await result.current.dismissPrePrompt();
    });

    expect(tel.trackPushPermissionDenied).not.toHaveBeenCalled();
    expect(tel.trackPushPermissionGranted).not.toHaveBeenCalled();
  });
});
