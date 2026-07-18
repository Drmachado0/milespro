/**
 * useConsent — LGPD Art. 8 §4 granular consent hook (COMPL-03 / D-16).
 *
 * Reads the latest consent row for the current user + consent_version, and
 * exposes flags for the ConsentBanner (`needsConsent`) and downstream
 * telemetry wiring (`analyticsOptedIn` consumed by plan 02-03 PostHog init).
 *
 * Append-only semantics: revoking consent is modeled as a NEW INSERT with
 * flags flipped, not as UPDATE/DELETE of prior rows (no UPDATE policy on
 * user_consents — enforced at DB level by migration 20260513120001).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';

/**
 * Bump this whenever the policy text in /termos or /privacidade changes
 * meaningfully (LGPD Art. 9 transparency — users must re-consent on material
 * policy revisions).
 */
export const CURRENT_CONSENT_VERSION = '2026-05-12';

export interface Consent {
  id: string;
  user_id: string;
  consent_version: string;
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
  analytics_opted_in: boolean;
  marketing_opted_in: boolean;
  created_at: string;
}

export interface ConsentInput {
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
  analytics_opted_in: boolean;
  marketing_opted_in: boolean;
}

export interface UseConsentResult {
  consent: Consent | null;
  isLoading: boolean;
  needsConsent: boolean;
  analyticsOptedIn: boolean;
  marketingOptedIn: boolean;
  saveConsent: (input: ConsentInput) => void;
  isSaving: boolean;
}

export function useConsent(): UseConsentResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: consent, isLoading } = useQuery<Consent | null>({
    queryKey: ['user_consent', user?.id, CURRENT_CONSENT_VERSION],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_consents')
        .select('*')
        .eq('user_id', user.id)
        .eq('consent_version', CURRENT_CONSENT_VERSION)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        logger.warn('[useConsent] fetch error', error.message);
        return null;
      }
      return (data as Consent | null) ?? null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: async (input: ConsentInput) => {
      if (!user) throw new Error('not authenticated');
      const { error } = await supabase.from('user_consents').insert({
        user_id: user.id,
        consent_version: CURRENT_CONSENT_VERSION,
        terms_accepted_at: input.terms_accepted_at,
        privacy_accepted_at: input.privacy_accepted_at,
        analytics_opted_in: input.analytics_opted_in,
        marketing_opted_in: input.marketing_opted_in,
        // ip_address + user_agent ideally captured server-side via an
        // edge function on a future iteration; for now they remain NULL.
      });
      if (error) throw error;
    },
    onSuccess: () => {
      logger.info('[useConsent] consent recorded');
      queryClient.invalidateQueries({ queryKey: ['user_consent'] });
    },
    onError: (err: unknown) => {
      logger.warn('[useConsent] save error', err);
    },
  });

  const hasConsent = !!consent;
  const termsOk = !!consent?.terms_accepted_at;
  const privacyOk = !!consent?.privacy_accepted_at;

  return {
    consent: consent ?? null,
    isLoading,
    // needsConsent: only true for authenticated users without a current-version
    // record with BOTH required acceptances. Anonymous visitors do not need
    // consent (no PII collection until they sign up).
    needsConsent: !!user && (!hasConsent || !termsOk || !privacyOk),
    analyticsOptedIn: consent?.analytics_opted_in ?? false,
    marketingOptedIn: consent?.marketing_opted_in ?? false,
    saveConsent: saveMutation.mutate,
    isSaving: saveMutation.isPending,
  };
}
