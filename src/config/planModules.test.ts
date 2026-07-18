import { describe, it, expect } from 'vitest';
import {
  tierAtLeast,
  canAccessModule,
  MODULE_MIN_TIER,
  ProductTier,
} from './planModules';
import { getNavGroups } from './sidebarNavigation';
import { ALL_QUICK_ACTIONS, filterQuickActionsByTier } from '@/data/quickActionsRegistry';

const PROFESSIONAL_GROUP_KEYS = ['nav.travelAgency', 'nav.reservations'];

describe('planModules — tier ordering', () => {
  it('is hierarchical: agency ⊇ pro ⊇ starter ⊇ free', () => {
    expect(tierAtLeast('free', 'free')).toBe(true);
    expect(tierAtLeast('free', 'starter')).toBe(false);
    expect(tierAtLeast('starter', 'free')).toBe(true);
    expect(tierAtLeast('starter', 'pro')).toBe(false);
    expect(tierAtLeast('pro', 'starter')).toBe(true);
    expect(tierAtLeast('pro', 'agency')).toBe(false);
    expect(tierAtLeast('agency', 'pro')).toBe(true);
    expect(tierAtLeast('agency', 'agency')).toBe(true);
  });
});

describe('planModules — canAccessModule', () => {
  it('Free and Starter share the personal core, no professional modules', () => {
    (['free', 'starter'] as const).forEach((tier) => {
      expect(canAccessModule(tier, 'accounts')).toBe(true);
      expect(canAccessModule(tier, 'milesCalculator')).toBe(true);
      // professional modules are hidden
      expect(canAccessModule(tier, 'clients')).toBe(false);
      expect(canAccessModule(tier, 'partnerCpfs')).toBe(false);
      expect(canAccessModule(tier, 'informeRendimentos')).toBe(false);
      expect(canAccessModule(tier, 'promoEngine')).toBe(false);
    });
  });

  it('Pro unlocks Starter + consultant modules but not Agency intelligence', () => {
    expect(canAccessModule('pro', 'accounts')).toBe(true);
    expect(canAccessModule('pro', 'clients')).toBe(true);
    expect(canAccessModule('pro', 'travelBooking')).toBe(true);
    expect(canAccessModule('pro', 'promoEngine')).toBe(false);
    expect(canAccessModule('pro', 'community')).toBe(false);
  });

  it('Agency unlocks everything', () => {
    (Object.keys(MODULE_MIN_TIER) as Array<keyof typeof MODULE_MIN_TIER>).forEach((m) => {
      expect(canAccessModule('agency', m)).toBe(true);
    });
  });
});

describe('sidebarNavigation — getNavGroups gates by tier', () => {
  it('Free and Starter see no professional groups', () => {
    (['free', 'starter'] as ProductTier[]).forEach((tier) => {
      const keys = getNavGroups(tier).map((g) => g.titleKey);
      PROFESSIONAL_GROUP_KEYS.forEach((k) => expect(keys).not.toContain(k));
      expect(keys).toContain('nav.home');
      expect(keys).toContain('nav.system');
    });
  });

  it('Pro/Agency see the professional groups', () => {
    (['pro', 'agency'] as ProductTier[]).forEach((tier) => {
      const keys = getNavGroups(tier).map((g) => g.titleKey);
      PROFESSIONAL_GROUP_KEYS.forEach((k) => expect(keys).toContain(k));
    });
  });

  it('Starter operations group no longer exposes the agency sale route', () => {
    const paths = getNavGroups('starter').flatMap((g) => g.items.map((i) => i.to));
    expect(paths).not.toContain('/agencia/venda');
  });
});

describe('quickActionsRegistry — filterQuickActionsByTier', () => {
  it('drops every /agencia action for Free and Starter', () => {
    (['free', 'starter'] as ProductTier[]).forEach((tier) => {
      const paths = filterQuickActionsByTier(ALL_QUICK_ACTIONS, tier).map((a) => a.path);
      expect(paths.some((p) => p.startsWith('/agencia'))).toBe(false);
      // personal actions survive
      expect(paths).toContain('/lancamentos/compra');
    });
  });

  it('keeps agency actions for Pro', () => {
    const proPaths = filterQuickActionsByTier(ALL_QUICK_ACTIONS, 'pro').map((a) => a.path);
    expect(proPaths).toContain('/agencia/venda');
    expect(proPaths.some((p) => p.startsWith('/agencia/'))).toBe(true);
  });
});
