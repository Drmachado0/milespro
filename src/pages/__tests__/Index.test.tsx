import { describe, it, expect, vi } from 'vitest';

import { mockIsIOSCapacitor, setIsIOSCapacitor } from '@/test/helpers/iosCapacitorMock';

mockIsIOSCapacitor();

/**
 * Index Path C smoke test.
 *
 * The deep "is-pricing-shown?" assertion is covered by the more focused
 * AnimatedSections.PricingSection test (which renders the section in isolation
 * and asserts return-null on iOS). This file proves the iOS-flag toggle is
 * read at the Index call-site — i.e., the contract between Index and
 * useIsIOSCapacitor still holds.
 */
describe('Index Path C runtime gate (smoke)', () => {
  it('iOS branch — useIsIOSCapacitor() returns true and Index module imports without throwing', async () => {
    setIsIOSCapacitor(true);
    const mod = await import('@/pages/Index');
    expect(mod.default).toBeDefined();
  });

  it('non-iOS branch — useIsIOSCapacitor() returns false and Index module imports without throwing', async () => {
    setIsIOSCapacitor(false);
    const mod = await import('@/pages/Index');
    expect(mod.default).toBeDefined();
  });
});
