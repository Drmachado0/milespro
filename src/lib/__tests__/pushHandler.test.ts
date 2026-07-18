/**
 * pushHandler.test.ts — unit tests for the Capacitor PushNotifications
 * chokepoint module (Plan 03-05 Task 3).
 *
 * Coverage:
 *   1. No-op when !Capacitor.isNativePlatform() (web build path)
 *   2. Registers all 4 listeners on native platform
 *   3. Upserts push_subscriptions on 'registration' event
 *   4. Navigates to deep_link_path on pushNotificationActionPerformed
 *   5. Falls back to /dashboard when deep_link_path is missing
 *   6. Rejects non-allowlisted deep_link_path (defense-in-depth vs T-3-03f)
 *   7. Emits push_received telemetry on foreground push
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

let isNative = false;
let platform = 'web';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNative,
    getPlatform: () => platform,
  },
}));

const listeners: Record<string, (event: unknown) => void> = {};
vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    addListener: vi.fn((event: string, handler: (e: unknown) => void) => {
      listeners[event] = handler;
      return Promise.resolve({ remove: vi.fn() });
    }),
  },
}));

const trackMock = vi.fn();
vi.mock('@/lib/posthog', () => ({ track: (...args: unknown[]) => trackMock(...args) }));
vi.mock('@/lib/logger', () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const upsertMock = vi.fn().mockResolvedValue({ error: null });
const supabaseMock = {
  from: vi.fn(() => ({ upsert: upsertMock })),
} as unknown as import('@supabase/supabase-js').SupabaseClient;

import { registerPushHandler } from '@/lib/pushHandler';

const navigate = vi.fn();

describe('registerPushHandler', () => {
  beforeEach(() => {
    isNative = true;
    platform = 'ios';
    trackMock.mockReset();
    upsertMock.mockReset().mockResolvedValue({ error: null });
    navigate.mockReset();
    Object.keys(listeners).forEach((k) => delete listeners[k]);
  });

  it('is a no-op when !Capacitor.isNativePlatform()', () => {
    isNative = false;
    const handle = registerPushHandler(supabaseMock, 'user-1', navigate);
    expect(Object.keys(listeners)).toHaveLength(0);
    handle.unsubscribe();
  });

  it('registers all 4 listeners on native platform', () => {
    registerPushHandler(supabaseMock, 'user-1', navigate);
    expect(Object.keys(listeners).sort()).toEqual(
      [
        'pushNotificationActionPerformed',
        'pushNotificationReceived',
        'registration',
        'registrationError',
      ].sort(),
    );
  });

  it('upserts push_subscriptions on registration event', async () => {
    registerPushHandler(supabaseMock, 'user-1', navigate);
    await listeners['registration']?.({ value: 'token-abc' });
    expect(supabaseMock.from).toHaveBeenCalledWith('push_subscriptions');
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        device_token: 'token-abc',
        platform: 'ios',
      }),
      { onConflict: 'user_id,device_token' },
    );
  });

  it('navigates to deep_link_path on pushNotificationActionPerformed', async () => {
    registerPushHandler(supabaseMock, 'user-1', navigate);
    listeners['pushNotificationActionPerformed']?.({
      notification: { data: { event_type: 'promo_alert', deep_link_path: '/promocoes' } },
    });
    expect(navigate).toHaveBeenCalledWith('/promocoes');
    expect(trackMock).toHaveBeenCalledWith(
      'push_opened',
      { event_type: 'promo_alert', deep_link_path: '/promocoes' },
    );
  });

  it('falls back to /dashboard when deep_link_path is missing', async () => {
    registerPushHandler(supabaseMock, 'user-1', navigate);
    listeners['pushNotificationActionPerformed']?.({
      notification: { data: { event_type: 'payment_event' } },
    });
    expect(navigate).toHaveBeenCalledWith('/dashboard');
  });

  it('rejects non-allowlisted deep_link_path (defense-in-depth)', async () => {
    registerPushHandler(supabaseMock, 'user-1', navigate);
    listeners['pushNotificationActionPerformed']?.({
      notification: { data: { event_type: 'payment_event', deep_link_path: '/assinatura' } },
    });
    // /assinatura is NOT in ALLOWED_DEEP_LINK_PREFIXES (T-3-03f); falls back to /dashboard
    expect(navigate).toHaveBeenCalledWith('/dashboard');
  });

  it('emits push_received telemetry on foreground push', async () => {
    registerPushHandler(supabaseMock, 'user-1', navigate);
    listeners['pushNotificationReceived']?.({
      title: 'Test',
      body: 'Test body',
      data: { event_type: 'expiry_60d' },
    });
    expect(trackMock).toHaveBeenCalledWith('push_received', { event_type: 'expiry_60d' });
  });
});
