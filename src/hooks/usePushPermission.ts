/**
 * usePushPermission — D-T07 contextual permission gate (Plan 03-05 / MOBILE-04).
 *
 * Exposes:
 *   - shouldShowPrompt: bool — true when the user has registered at least one
 *     program AND has not seen the pre-prompt before AND native permission is
 *     in 'prompt' state. Fires per D-T07 (iOS HIG: value-moment prompt = 65-75%
 *     accept rate vs 50% at signup).
 *   - hasPermission: 'prompt' | 'granted' | 'denied' | 'unknown' (from
 *     Capacitor PushNotifications.checkPermissions).
 *   - requestPermission(): mark seen_at, emit telemetry, call native API,
 *     and on 'granted' call PushNotifications.register() (which fires the
 *     'registration' event that pushHandler upserts into push_subscriptions).
 *   - isRequesting: bool while the mutation is in-flight.
 *
 * Idempotency: push_pre_prompt_seen_at is set on FIRST requestPermission call,
 * regardless of grant/deny outcome (iOS only gives one shot at the native
 * permission dialog — see D-T07 + iOS HIG).
 *
 * Web no-op: when !Capacitor.isNativePlatform(), returns inert values.
 *
 * Schema note: user_settings.push_pre_prompt_seen_at is added by Plan 03-05
 * migration 20260516120000. Until Lovable regenerates types.ts after applying
 * the migration, we cast through `unknown` for the typed access (same pattern
 * as AdminMetrics.tsx is_admin from Plan 02-03). Cleanup deferred to the next
 * touching plan after types regen.
 */

import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useTelemetry } from '@/hooks/useTelemetry';
import { logger } from '@/lib/logger';

export type PermissionState = 'prompt' | 'granted' | 'denied' | 'unknown';

export interface UsePushPermissionResult {
  shouldShowPrompt: boolean;
  hasPermission: PermissionState;
  /**
   * "Allow" path: mark the pre-prompt as seen AND fire the native iOS/Android
   * permission dialog. Use this when the user clicks the affirmative CTA.
   */
  requestPermission: () => Promise<void>;
  /**
   * "Not now" path (P1-10): mark the pre-prompt as seen WITHOUT triggering
   * the native dialog. iOS only grants one shot at the native dialog per
   * install — invoking it on a soft dismiss would burn that one chance and,
   * combined with the push_pre_prompt_seen_at latch, would lock the user
   * out of push entirely with no recovery path until app reinstall.
   */
  dismissPrePrompt: () => Promise<void>;
  isRequesting: boolean;
}

// Typed shape for the user_settings row slice we care about. Cast `as unknown`
// at the fetch boundary because push_pre_prompt_seen_at is not yet in the
// generated supabase types.ts (added by Plan 03-05 migration).
interface UserSettingsPushSlice {
  push_pre_prompt_seen_at: string | null;
}

export function usePushPermission(): UsePushPermissionResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const telemetry = useTelemetry();
  const [hasPermission, setHasPermission] = useState<PermissionState>('unknown');
  const isNative = Capacitor.isNativePlatform();

  // Read user_settings.push_pre_prompt_seen_at (idempotency latch)
  const { data: settings } = useQuery<UserSettingsPushSlice | null>({
    queryKey: ['user_settings', user?.id, 'push_pre_prompt_seen_at'],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_settings')
        .select('push_pre_prompt_seen_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) {
        logger.warn('[usePushPermission]', 'failed to load user_settings', error);
        return null;
      }
      return (data as unknown as UserSettingsPushSlice | null) ?? null;
    },
    enabled: !!user?.id && isNative,
    staleTime: 5 * 60 * 1000,
  });

  // Count user_programs (D-T07 contextual gate — programCount >= 1)
  const { data: programCount = 0 } = useQuery<number>({
    queryKey: ['user_programs', user?.id, 'count'],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error } = await supabase
        .from('user_programs')
        .select('id', { head: true, count: 'exact' })
        .eq('user_id', user.id);
      if (error) {
        logger.warn('[usePushPermission]', 'failed to count user_programs', error);
        return 0;
      }
      return count ?? 0;
    },
    enabled: !!user?.id && isNative,
    staleTime: 30_000,
  });

  // Probe native permission state on mount
  useEffect(() => {
    if (!isNative) {
      setHasPermission('denied');
      return;
    }
    PushNotifications.checkPermissions()
      .then((result) => {
        setHasPermission((result.receive as PermissionState) ?? 'unknown');
      })
      .catch((err) => {
        logger.error('[usePushPermission]', 'checkPermissions failed', err);
        setHasPermission('unknown');
      });
  }, [isNative]);

  const shouldShowPrompt =
    isNative &&
    !!user?.id &&
    programCount >= 1 &&
    settings?.push_pre_prompt_seen_at == null &&
    hasPermission === 'prompt';

  // Shared helper: mark the pre-prompt as seen (idempotent latch).
  // Used by both the request-permission and dismiss-pre-prompt paths.
  const markSeen = useCallback(async () => {
    if (!user?.id) return;
    const { error: upsertErr } = await supabase.from('user_settings').upsert(
      {
        user_id: user.id,
        push_pre_prompt_seen_at: new Date().toISOString(),
      } as never,
      { onConflict: 'user_id' },
    );
    if (upsertErr) {
      logger.error(
        '[usePushPermission]',
        'failed to mark push_pre_prompt_seen_at',
        upsertErr,
      );
    }
  }, [user?.id]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      // Mark seen — regardless of grant/deny outcome (iOS HIG: do not re-ask)
      await markSeen();

      // Telemetry (pre-prompt shown)
      telemetry.trackPushPromptShown({ trigger: 'first_balance' });

      // Native permission request
      const result = await PushNotifications.requestPermissions();
      const platform: 'ios' | 'android' =
        Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';

      if (result.receive === 'granted') {
        telemetry.trackPushPermissionGranted({ platform });
        setHasPermission('granted');
        // Triggers the 'registration' event in pushHandler (Task 3)
        await PushNotifications.register();
      } else {
        telemetry.trackPushPermissionDenied({ platform });
        setHasPermission('denied');
      }
    },
    onSuccess: () => {
      // Refetch settings so shouldShowPrompt flips to false immediately
      queryClient.invalidateQueries({ queryKey: ['user_settings', user?.id] });
    },
  });

  // P1-10 — "Not now" path. Marks the pre-prompt latch + emits telemetry, but
  // does NOT call PushNotifications.requestPermissions(). iOS only gives the
  // app one shot at the native dialog; burning it on a soft dismiss would,
  // combined with the latch, lock the user out of push entirely (no recovery
  // in v1 — there is no "Configurações → Re-enable push" toggle, deferred to
  // v2 backlog). Path C friendly: user can still later receive push if they
  // grant via system Settings → Notifications, since we never said "denied".
  const dismissMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      await markSeen();
      telemetry.trackPushPromptShown({ trigger: 'first_balance' });
      // Intentionally NO PushNotifications.requestPermissions() call.
      // hasPermission stays at 'prompt' so the iOS system dialog can still
      // fire later if the user enables push from Settings.
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_settings', user?.id] });
    },
  });

  const requestPermission = useCallback(async () => {
    await mutation.mutateAsync();
  }, [mutation]);

  const dismissPrePrompt = useCallback(async () => {
    await dismissMutation.mutateAsync();
  }, [dismissMutation]);

  return {
    shouldShowPrompt,
    hasPermission,
    requestPermission,
    dismissPrePrompt,
    isRequesting: mutation.isPending || dismissMutation.isPending,
  };
}
