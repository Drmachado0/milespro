import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import {
  ProductTier,
  ModuleKey,
  canAccessModule as canAccessModuleFn,
  tierAtLeast,
} from '@/config/planModules';

// Runtime guard mirroring useSubscription's VALID_PLANS. Any non-canonical /
// null value collapses to 'free' — the safe, least-privileged default (a bad
// value must NEVER accidentally unlock the pro/agency surface).
const VALID_TIERS: readonly ProductTier[] = ['free', 'starter', 'pro', 'agency'];

export interface ProductTierData {
  productTier: ProductTier;
  isFree: boolean;
  isStarter: boolean;
  isPro: boolean;
  isAgency: boolean;
  /** Whether the user's tier is at least `min` (hierarchical). */
  hasTier: (min: ProductTier) => boolean;
  /** Whether a given product module is unlocked for the user's tier. */
  canAccessModule: (moduleKey: ModuleKey) => boolean;
  isLoading: boolean;
}

// profiles.product_tier is added by migration 20260718120000; until the
// Supabase types are regenerated it is not present on the generated Row type,
// so we select it untyped and sanitize here (same convention as AdminMetrics.tsx
// is_admin before its types regen).
type ProfileTierSlice = { product_tier: string | null };

export function useProductTier(): ProductTierData {
  const { user } = useAuth();

  const { data: rawTier, isLoading } = useQuery({
    queryKey: ['profile_product_tier', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Resilient by design: before migration 20260718120000 is applied the
      // column does not exist yet and the select errors — we swallow that and
      // fall back to 'starter' (the safe default) instead of spamming retries.
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('product_tier')
          .eq('id', user.id)
          .maybeSingle();

        if (error) return null;
        return (data as ProfileTierSlice | null)?.product_tier ?? null;
      } catch {
        return null;
      }
    },
    retry: false,
    enabled: !!user,
    // Tier changes rarely (only on an explicit upgrade); keep it cached across
    // the session to avoid re-fetching on every nav render.
    staleTime: 5 * 60 * 1000,
  });

  const productTier: ProductTier = VALID_TIERS.includes(rawTier as ProductTier)
    ? (rawTier as ProductTier)
    : 'free';

  return {
    productTier,
    isFree: productTier === 'free',
    isStarter: productTier === 'starter',
    isPro: productTier === 'pro',
    isAgency: productTier === 'agency',
    hasTier: (min: ProductTier) => tierAtLeast(productTier, min),
    canAccessModule: (moduleKey: ModuleKey) => canAccessModuleFn(productTier, moduleKey),
    isLoading,
  };
}
