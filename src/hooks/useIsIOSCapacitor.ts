/**
 * useIsIOSCapacitor — canonical iOS-runtime detection chokepoint (D-10 / CRIT-03).
 *
 * Phase 2 W2b (Plan 02-06). Replaces the userAgent fallback that lived in
 * src/components/layout/CrispWidget.tsx (W1c) until this plan landed.
 *
 * Why two exports:
 *   - `useIsIOSCapacitor()` — React hook variant for use inside components.
 *     Memoizes the result (Capacitor.getPlatform() never changes during a
 *     single page lifecycle, so the result is constant for the session).
 *   - `isIOSCapacitor()` — pure function variant for non-React contexts
 *     (utility modules, edge-handler-side code paths, useEffect imperatives).
 *
 * Both wrap the same Capacitor check:
 *   `Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'`
 *
 * iOS Capacitor builds set getPlatform() to 'ios'; Android Capacitor builds
 * set it to 'android'; web (mobile Safari, desktop, PWA) sets it to 'web'.
 * We gate on === 'ios' specifically because Apple Multiplatform Services
 * exemption (3.1.3b) only applies to the iOS native app — the web build
 * (Safari on iOS) can still show pricing per Apple's own carve-out.
 *
 * Anywhere this returns true, pricing UI MUST be hidden (Assinatura.tsx,
 * Index.tsx PricingSection, UpgradeBanner, CrispWidget helpdesk).
 * Phase 3's `strings | grep` gate (G-CRIT-03) verifies the iOS bundle
 * post-build contains no pricing strings — that gate only passes if every
 * pricing surface is wrapped behind this hook.
 */

import { Capacitor } from '@capacitor/core';

export function isIOSCapacitor(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

export function useIsIOSCapacitor(): boolean {
  // Capacitor.getPlatform() returns a stable value for the lifetime of the
  // process; there is no need to wrap this in useMemo or useState. Returning
  // the raw value keeps the call site cheap.
  return isIOSCapacitor();
}
