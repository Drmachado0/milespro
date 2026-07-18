import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type SubscriptionPlan = 'free' | 'pro' | 'vip';

// VALID_PLANS runtime validation guard (Plan 02 B-2 Option A): prevents the deleted
// collapse logic from coming back silently. If the DB ever returned an unexpected value
// (legacy 'basic'/'agency'/'pro_familia' that escaped the consolidation migration, future
// enum drift, or a manual SQL injection of an out-of-canonical value), the cast
// `as SubscriptionPlan` would let it through as an untyped string and break the
// canAccessPro/canAccessVip checks downstream. We sanitize at this single chokepoint
// and default to 'free' for any non-canonical value. Plan 06 Task 2 §2.3 Test 4 asserts
// this guard works (legacy 'basic' -> 'free').
const VALID_PLANS = ['free', 'pro', 'vip'] as const;

export interface SubscriptionLimits {
  maxUsers: number;
  maxOperationsPerMonth: number | null;
  currentMonthOperations: number;
  maxPrograms: number | null;
  // Plan 02-06 (D-12 / TIER-01) — multi-account limit. Free=5, Pro/VIP=null (unlimited).
  // Mirrors the DB-side WITH CHECK on program_accounts in migration 20260515120001.
  maxAccounts: number | null;
  historyDays: number | null;
  currentProgramsCount: number;
}

export interface SubscriptionFeatures {
  unlimited_miles: boolean;
  family_management: boolean;
  credit_card_control: boolean;
  vip_lounge_tracking: boolean;
  multiplication_strategies: boolean;
  points_projection: boolean;
  miles_calculator: boolean;
  miles_pricing: boolean;
  detailed_reports: boolean;
  export_excel_pdf: boolean;
  email_support_24h: boolean;
  individual_login: boolean;
  family_dashboard_total: boolean;
  priority_support: boolean;
}

export interface SubscriptionData {
  plan: SubscriptionPlan;
  limits: SubscriptionLimits;
  features: SubscriptionFeatures;
  // Plan access helpers
  canAccessPro: boolean;
  canAccessVip: boolean;
  isVip: boolean;
  isPro: boolean;
  isFree: boolean;
  // Operation limits
  isLimitReached: boolean;
  remainingOperations: number | null;
  canCreateOperation: boolean;
  // Program limits
  canAddProgram: boolean;
  remainingPrograms: number | null;
  // History limits
  historyStartDate: string | null;
  // Subscription details
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  billingPeriod: string | null;
  price: number | null;
}

const DEFAULT_FEATURES: SubscriptionFeatures = {
  unlimited_miles: false,
  family_management: false,
  credit_card_control: false,
  vip_lounge_tracking: false,
  multiplication_strategies: false,
  points_projection: false,
  miles_calculator: false,
  miles_pricing: false,
  detailed_reports: false,
  export_excel_pdf: false,
  email_support_24h: false,
  individual_login: false,
  family_dashboard_total: false,
  priority_support: false,
};

const FREE_FEATURES: SubscriptionFeatures = {
  ...DEFAULT_FEATURES,
  credit_card_control: true,
};

// PRO_FEATURES (formerly PLUS_FEATURES): paid mid-tier. Old mid-tier semantics == new 'pro'.
const PRO_FEATURES: SubscriptionFeatures = {
  unlimited_miles: true,
  family_management: false,
  credit_card_control: true,
  vip_lounge_tracking: true,
  multiplication_strategies: true,
  points_projection: true,
  miles_calculator: true,
  miles_pricing: true,
  detailed_reports: true,
  export_excel_pdf: true,
  email_support_24h: true,
  individual_login: false,
  family_dashboard_total: false,
  priority_support: false,
};

// VIP_FEATURES (formerly PRO_FEATURES — the top tier): Pro + multi-CPF / family / agency.
// Multi-CPF is VIP-exclusive in v1 per CLAUDE.md.
const VIP_FEATURES: SubscriptionFeatures = {
  unlimited_miles: true,
  family_management: true,
  credit_card_control: true,
  vip_lounge_tracking: true,
  multiplication_strategies: true,
  points_projection: true,
  miles_calculator: true,
  miles_pricing: true,
  detailed_reports: true,
  export_excel_pdf: true,
  email_support_24h: true,
  individual_login: true,
  family_dashboard_total: true,
  priority_support: true,
};

// Plan defaults. Old mid-tier defaults move to 'pro'; old top-tier defaults
// move to 'vip' per CONTEXT D-01.
// Plan 02-06 W2b (D-12 / TIER-01): Free bump from 1→3 programas + 5 contas
// (program_accounts). RLS enforces the same numbers in
// supabase/migrations/20260515120001_tier_rls_free_limits.sql so a client
// bypassing this hook still gets blocked at the DB layer.
const PLAN_DEFAULTS = {
  free: {
    maxPrograms: 3,            // D-12: bumped from 1 to 3
    historyDays: 30,
    maxOperationsPerMonth: 20,
    maxUsers: 1,
    maxAccounts: 5,            // D-12: 5 contas (program_accounts)
  },
  pro: {
    maxPrograms: null,
    historyDays: null,
    maxOperationsPerMonth: null,
    maxUsers: 1,
    maxAccounts: null,
  },
  vip: {
    maxPrograms: null,
    historyDays: null,
    maxOperationsPerMonth: null,
    maxUsers: 5,
    maxAccounts: null,
  },
};

function getDefaultFeatures(plan: SubscriptionPlan): SubscriptionFeatures {
  switch (plan) {
    case 'vip':
      return VIP_FEATURES;
    case 'pro':
      return PRO_FEATURES;
    default:
      return FREE_FEATURES;
  }
}

function parseFeatures(
  featuresJson: Record<string, unknown> | null,
  plan: SubscriptionPlan
): SubscriptionFeatures {
  const defaults = getDefaultFeatures(plan);

  if (!featuresJson) {
    return defaults;
  }

  return {
    unlimited_miles: Boolean(featuresJson.unlimited_miles ?? defaults.unlimited_miles),
    family_management: Boolean(featuresJson.family_management ?? defaults.family_management),
    credit_card_control: Boolean(featuresJson.credit_card_control ?? defaults.credit_card_control),
    vip_lounge_tracking: Boolean(featuresJson.vip_lounge_tracking ?? defaults.vip_lounge_tracking),
    multiplication_strategies: Boolean(featuresJson.multiplication_strategies ?? defaults.multiplication_strategies),
    points_projection: Boolean(featuresJson.points_projection ?? defaults.points_projection),
    miles_calculator: Boolean(featuresJson.miles_calculator ?? defaults.miles_calculator),
    miles_pricing: Boolean(featuresJson.miles_pricing ?? defaults.miles_pricing),
    detailed_reports: Boolean(featuresJson.detailed_reports ?? defaults.detailed_reports),
    export_excel_pdf: Boolean(featuresJson.export_excel_pdf ?? defaults.export_excel_pdf),
    email_support_24h: Boolean(featuresJson.email_support_24h ?? defaults.email_support_24h),
    individual_login: Boolean(featuresJson.individual_login ?? defaults.individual_login),
    family_dashboard_total: Boolean(featuresJson.family_dashboard_total ?? defaults.family_dashboard_total),
    priority_support: Boolean(featuresJson.priority_support ?? defaults.priority_support),
  };
}

export function useSubscription(): SubscriptionData & { isLoading: boolean } {
  const { user } = useAuth();

  // Fetch subscription data
  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['user_subscription', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Count monthly operations
  const { data: monthlyOperationsCount = 0 } = useQuery({
    queryKey: ['monthly_operations_count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const { count, error } = await supabase
        .from('operations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  // Count user's active programs (custom programs added)
  const { data: currentProgramsCount = 0 } = useQuery({
    queryKey: ['user_programs_count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from('user_programs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_custom', true);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  // Determine plan via VALID_PLANS runtime guard (B-2 Option A — Plan 02).
  // Default to 'free' for any non-canonical value (legacy basic/agency/pro_familia,
  // future enum drift, or null/undefined). The pre-Plan-02 collapse CASE at
  // useSubscription.ts:240-245 is intentionally DELETED; this guard replaces it.
  const rawPlan = subscription?.plan as string | undefined;
  const plan: SubscriptionPlan = VALID_PLANS.includes(rawPlan as SubscriptionPlan)
    ? (rawPlan as SubscriptionPlan)
    : 'free';

  // Get defaults for the plan
  const planDefaults = PLAN_DEFAULTS[plan];

  // Use subscription values with fallback to plan defaults
  const maxOperationsPerMonth = subscription?.max_operations_per_month ?? planDefaults.maxOperationsPerMonth;
  const maxUsers = subscription?.max_users ?? planDefaults.maxUsers;
  const maxPrograms = subscription?.max_programs ?? planDefaults.maxPrograms;
  // Plan 02-06 (D-12) — maxAccounts has no per-row override yet; pull straight
  // from PLAN_DEFAULTS. When user_subscriptions grows a `max_accounts` column
  // (deferred to backlog), wire fallback the same way as maxPrograms above.
  const maxAccounts = planDefaults.maxAccounts;
  const historyDays = subscription?.history_days ?? planDefaults.historyDays;

  // Parse features from subscription or use defaults
  const features = parseFeatures(
    subscription?.features as Record<string, unknown> | null,
    plan
  );

  // Plan checks
  const isFree = plan === 'free';
  const isPro = plan === 'pro';
  const isVip = plan === 'vip';

  // Access checks (hierarchical): Pro access includes VIP; VIP access is VIP-only.
  const canAccessPro = isPro || isVip;
  const canAccessVip = isVip;

  // Operations limits
  const isLimitReached = isFree && maxOperationsPerMonth !== null && monthlyOperationsCount >= maxOperationsPerMonth;
  const remainingOperations = maxOperationsPerMonth !== null
    ? Math.max(0, maxOperationsPerMonth - monthlyOperationsCount)
    : null;

  // Program limits
  const canAddProgram = maxPrograms === null || currentProgramsCount < maxPrograms;
  const remainingPrograms = maxPrograms !== null
    ? Math.max(0, maxPrograms - currentProgramsCount)
    : null;

  // History date limit (only for plans with historyDays set)
  const historyStartDate = historyDays !== null
    ? new Date(Date.now() - historyDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  return {
    isLoading: subscriptionLoading,
    plan,
    limits: {
      maxUsers,
      maxOperationsPerMonth,
      currentMonthOperations: monthlyOperationsCount,
      maxPrograms,
      maxAccounts,
      historyDays,
      currentProgramsCount,
    },
    features,
    canAccessPro,
    canAccessVip,
    isVip,
    isPro,
    isFree,
    isLimitReached,
    remainingOperations,
    canCreateOperation: !isLimitReached,
    canAddProgram,
    remainingPrograms,
    historyStartDate,
    startsAt: subscription?.started_at || null,
    expiresAt: subscription?.expires_at || null,
    isActive: subscription?.is_active ?? false,
    billingPeriod: subscription?.billing_period ?? null,
    price: subscription?.price ? Number(subscription.price) : null,
  };
}
