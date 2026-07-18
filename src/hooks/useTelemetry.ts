/**
 * useTelemetry — Phase 2 W1b (TEL-01) event taxonomy chokepoint.
 *
 * Single entry point for all PostHog `capture()` calls. Adding a new
 * event = adding a typed helper here. Direct calls to `track()` outside
 * this hook are discouraged (lint rule TBD).
 *
 * Why a hook (and not a constants file)? Two reasons:
 *   1. Typed event signatures (plan/cycle unions) catch taxonomy drift
 *      at the call site, not in a downstream PostHog dashboard.
 *   2. Future evolution (consent re-check, sampling, batching) can be
 *      added inside the hook without rewriting call sites.
 *
 * This hook does NOT consume `useConsent` directly — the consent gate
 * is enforced upstream by `src/components/legal/ConsentWatcher.tsx`
 * via `posthog.opt_in_capturing()` / `posthog.opt_out_capturing()`.
 * When opted-out, `track()` is a no-op at the posthog-js layer.
 */

import { track, pageview } from '@/lib/posthog';

export type Plan = 'pro' | 'vip';
export type BillingCycle = 'monthly' | 'semiannual' | 'annual';
export type SignupSource = 'organic' | 'landing';

export function useTelemetry() {
  return {
    // ------------------------------------------------------------------
    // Auth funnel
    // ------------------------------------------------------------------
    trackSignup: (props: { source?: SignupSource; referrerDomain?: string }) =>
      track('signup', props),

    // ------------------------------------------------------------------
    // Activation
    // ------------------------------------------------------------------
    trackFirstBalanceAdded: (props: { programCode: string }) =>
      track('first_balance_added', props),

    // ------------------------------------------------------------------
    // Purchase funnel
    // ------------------------------------------------------------------
    trackViewedPricing: (props: { fromPath: string }) =>
      track('viewed_pricing', props),

    trackStartedCheckout: (props: {
      plan: Plan;
      cycle: BillingCycle;
      value: number;
    }) => track('started_checkout', props),

    trackPaidFirstInvoice: (props: {
      plan: Plan;
      cycle: BillingCycle;
      value: number;
      subscriptionId: string;
    }) => track('paid_first_invoice', props),

    trackRenewed: (props: {
      plan: Plan;
      cycle: BillingCycle;
      cycleNumber: number;
    }) => track('renewed', props),

    trackCancelled: (props: {
      plan: Plan;
      tenureDays: number;
      cancelReason?: string;
    }) => track('cancelled', props),

    // ------------------------------------------------------------------
    // Pro killer feature (D-13 / TIER-03) — UI wires in W2b
    // ------------------------------------------------------------------
    trackPromotionAlertShown: (props: {
      fromProgram: string;
      toProgram: string;
      bonusPct: number;
    }) => track('promotion_alert_shown', props),

    trackPromotionAlertClicked: (props: {
      fromProgram: string;
      toProgram: string;
      bonusPct: number;
    }) => track('promotion_alert_clicked', props),

    // ------------------------------------------------------------------
    // Compliance (TEL-01 + COMPL-01 + COMPL-02)
    // ------------------------------------------------------------------
    // TODO(W2b): wire trackConsentGiven from ConsentBanner.tsx onSubmit success
    trackConsentGiven: (props: {
      analytics: boolean;
      marketing: boolean;
      version: string;
    }) => track('consent_given', props),

    trackLgpdExportRequested: () => track('lgpd_export_requested'),
    trackLgpdDeleteRequested: () => track('lgpd_delete_requested'),

    // ------------------------------------------------------------------
    // Push lifecycle (Phase 3 / MOBILE-04)
    //
    // The event_type union exactly matches the Plan 03-04b enqueue-push
    // PRO_PLUS_EVENTS + ALL_TIER_EVENTS taxonomy — discriminated typing
    // prevents drift between client + server.
    // ------------------------------------------------------------------
    trackPushPromptShown: (props: { trigger: 'first_balance' | 'manual' }) =>
      track('push_prompt_shown', props),

    trackPushPermissionGranted: (props: { platform: 'ios' | 'android' }) =>
      track('push_permission_granted', props),

    trackPushPermissionDenied: (props: { platform: 'ios' | 'android' }) =>
      track('push_permission_denied', props),

    trackPushReceived: (props: {
      event_type: 'expiry_60d' | 'expiry_13d' | 'payment_event' | 'onboarding' | 'promo_alert';
    }) => track('push_received', props),

    trackPushOpened: (props: {
      event_type: 'expiry_60d' | 'expiry_13d' | 'payment_event' | 'onboarding' | 'promo_alert';
      deep_link_path: string;
    }) => track('push_opened', props),

    // ------------------------------------------------------------------
    // Generic pageview helper (call from route changes)
    // ------------------------------------------------------------------
    pageview,
  };
}
