import { useMemo, useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useMilestoneStats } from '@/hooks/useMilestoneStats';
import { BADGES, Badge, UnlockedBadge, BadgesProgress } from '@/data/badges';
import { ONBOARDING_STEPS, REQUIRED_STEPS } from '@/data/onboardingSteps';
import { notifyAchievement } from '@/components/achievements/AchievementToast';

interface OnboardingProgressWithBadges {
  completed: string[];
  dismissed: boolean;
  started_at: string | null;
  badges?: Record<string, UnlockedBadge>;
  total_points?: number;
}

// Module-level guard: badges already surfaced via toast this session,
// keyed by `${userId}:${badgeId}`. Shared across every component that mounts
// useBadges (Header — on every page — plus OnboardingCard, BadgesShowcase and
// Conquistas), so a single unlock fires exactly ONE "+X pontos" toast instead
// of one per mounted instance. Keyed by user so switching accounts still
// notifies the new user about their own badges.
const notifiedBadgeKeys = new Set<string>();

export function useBadges() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { completedSteps, isComplete } = useOnboarding();
  const { stats } = useMilestoneStats();
  const previousBadgesRef = useRef<Set<string>>(new Set());
  const hasInitializedRef = useRef(false);

  // Fetch saved badges from profile to initialize previousBadgesRef
  const { data: savedBadgeIds, isLoading: isSavedBadgesLoading } = useQuery({
    queryKey: ['saved-badges', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('profiles')
        .select('onboarding_progress')
        .eq('id', user.id)
        .single();
      
      const progress = data?.onboarding_progress as unknown as OnboardingProgressWithBadges | null;
      return progress?.badges ? Object.keys(progress.badges) : [];
    },
    enabled: !!user?.id,
    staleTime: Infinity, // Only fetch once per session
  });

  // Helper to check milestone conditions
  const checkMilestoneCondition = useCallback((badge: Badge): boolean => {
    if (badge.condition.type !== 'milestone' || !badge.condition.milestone) {
      return false;
    }

    const { metric, operationType, threshold } = badge.condition.milestone;

    switch (metric) {
      case 'operations_count':
        return stats.operationsCount >= threshold;
      case 'operation_type':
        return (stats.operationsByType[operationType || ''] || 0) >= threshold;
      case 'programs_with_balance':
        return stats.programsWithBalance >= threshold;
      case 'vip_entries':
        return stats.vipEntriesCount >= threshold;
      case 'total_miles':
        return stats.totalMilesBalance >= threshold;
      case 'savings_total':
        return stats.savingsTotal >= threshold;
      case 'savings_tickets':
        return stats.savingsByCategory.tickets >= threshold;
      case 'savings_hotels':
        return stats.savingsByCategory.hotels >= threshold;
      case 'savings_cars':
        return stats.savingsByCategory.cars >= threshold;
      case 'savings_cruises':
        return stats.savingsByCategory.cruises >= threshold;
      case 'savings_insurances':
        return stats.savingsByCategory.insurances >= threshold;
      case 'savings_attractions':
        return stats.savingsByCategory.attractions >= threshold;
      case 'savings_transfers':
        return stats.savingsByCategory.transfers >= threshold;
      default:
        return false;
    }
  }, [stats]);

  // Calculate which badges should be unlocked based on current progress
  const unlockedBadgeIds = useMemo(() => {
    const unlocked: string[] = [];
    
    for (const badge of BADGES) {
      let shouldUnlock = false;
      
      switch (badge.condition.type) {
        case 'first_step':
          shouldUnlock = completedSteps.length >= 1;
          break;
        case 'onboarding_step':
          shouldUnlock = completedSteps.includes(badge.condition.stepId!);
          break;
        case 'all_required':
          shouldUnlock = isComplete;
          break;
        case 'all_complete':
          shouldUnlock = completedSteps.length === ONBOARDING_STEPS.length;
          break;
        case 'milestone':
          shouldUnlock = checkMilestoneCondition(badge);
          break;
      }
      
      if (shouldUnlock) {
        unlocked.push(badge.id);
      }
    }
    
    return unlocked;
  }, [completedSteps, isComplete, checkMilestoneCondition]);

  // Get full badge objects for unlocked badges
  const unlockedBadges = useMemo(() => {
    return BADGES.filter(badge => unlockedBadgeIds.includes(badge.id));
  }, [unlockedBadgeIds]);

  // Get locked badges
  const lockedBadges = useMemo(() => {
    return BADGES.filter(badge => !unlockedBadgeIds.includes(badge.id));
  }, [unlockedBadgeIds]);

  // Calculate total points
  const totalPoints = useMemo(() => {
    return unlockedBadges.reduce((sum, badge) => sum + badge.points, 0);
  }, [unlockedBadges]);

  // Initialize previousBadgesRef ONLY when database data is ready
  useEffect(() => {
    // Wait for query to complete before initializing
    if (isSavedBadgesLoading || hasInitializedRef.current) {
      return;
    }

    // Initialize with badges from database (or empty for new users)
    const savedSet = new Set(savedBadgeIds || []);
    previousBadgesRef.current = savedSet;
    hasInitializedRef.current = true;
  }, [savedBadgeIds, isSavedBadgesLoading]);

  // Detect newly unlocked badges AFTER initialization
  const newlyUnlockedBadges = useMemo(() => {
    // Only detect new badges after full initialization
    if (!hasInitializedRef.current || isSavedBadgesLoading) {
      return [];
    }
    
    const newBadges: Badge[] = [];
    for (const badgeId of unlockedBadgeIds) {
      if (!previousBadgesRef.current.has(badgeId)) {
        const badge = BADGES.find(b => b.id === badgeId);
        if (badge) {
          newBadges.push(badge);
        }
      }
    }
    
    return newBadges;
  }, [unlockedBadgeIds, isSavedBadgesLoading]);

  // Mutation to persist badge state
  const persistBadgesMutation = useMutation({
    mutationFn: async (badgesData: BadgesProgress) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      // Get current profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_progress')
        .eq('id', user.id)
        .single();
      
      const currentProgress = (profile?.onboarding_progress as unknown as OnboardingProgressWithBadges) || {
        completed: [],
        dismissed: false,
        started_at: null,
      };
      
      const updatedProgress = {
        ...currentProgress,
        badges: badgesData.badges,
        total_points: badgesData.total_points,
      };
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          onboarding_progress: JSON.parse(JSON.stringify(updatedProgress))
        })
        .eq('id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });

  // `mutate` is referentially stable across renders (unlike the mutation
  // object itself), so depending on it below doesn't re-fire the effect.
  const persistBadges = persistBadgesMutation.mutate;

  // Auto-persist and notify when new badges are unlocked
  useEffect(() => {
    if (newlyUnlockedBadges.length === 0 || !hasInitializedRef.current || !user?.id) {
      return;
    }

    // De-dupe across the multiple components that mount useBadges and across
    // re-renders — otherwise each instance fires its own toast for the same
    // badge, producing the stacked/duplicated "+X pontos" pop-ups.
    const badgesToNotify = newlyUnlockedBadges.filter(
      (badge) => !notifiedBadgeKeys.has(`${user.id}:${badge.id}`)
    );

    badgesToNotify.forEach((badge) => {
      notifiedBadgeKeys.add(`${user.id}:${badge.id}`);
      notifyAchievement(badge);
    });

    // Capture the previously-known set BEFORE overwriting the ref, so freshly
    // unlocked badges are correctly persisted as unseen (`seen: false`).
    const previouslyKnown = previousBadgesRef.current;

    // Update ref for next comparison
    previousBadgesRef.current = new Set(unlockedBadgeIds);

    // Only the instance that actually surfaced new badges persists, to avoid
    // redundant writes from every mounted hook instance.
    if (badgesToNotify.length === 0) {
      return;
    }

    // AUTO-PERSIST to database
    const badges: Record<string, UnlockedBadge> = {};
    unlockedBadgeIds.forEach((id) => {
      badges[id] = {
        unlocked_at: new Date().toISOString(),
        seen: previouslyKnown.has(id),
      };
    });

    persistBadges({
      badges,
      total_points: totalPoints,
    });
  }, [newlyUnlockedBadges, unlockedBadgeIds, totalPoints, persistBadges, user?.id]);

  // Mark a badge as seen
  const markBadgeSeen = useCallback((badgeId: string) => {
    const badge = BADGES.find(b => b.id === badgeId);
    if (!badge || !unlockedBadgeIds.includes(badgeId)) return;
    
    const badges: Record<string, UnlockedBadge> = {};
    unlockedBadgeIds.forEach(id => {
      badges[id] = {
        unlocked_at: new Date().toISOString(),
        seen: id === badgeId ? true : badges[id]?.seen || false,
      };
    });
    
    persistBadges({
      badges,
      total_points: totalPoints,
    });
  }, [unlockedBadgeIds, totalPoints, persistBadges]);

  // Get badges by category
  const onboardingBadges = useMemo(() => 
    BADGES.filter(b => b.category === 'onboarding'), []);
  
  const milestoneBadges = useMemo(() => 
    BADGES.filter(b => b.category === 'milestone'), []);

  return {
    allBadges: BADGES,
    onboardingBadges,
    milestoneBadges,
    unlockedBadges,
    lockedBadges,
    unlockedBadgeIds,
    totalPoints,
    newlyUnlockedBadges,
    markBadgeSeen,
    isPersisting: persistBadgesMutation.isPending,
    stats, // Expose milestone stats
  };
}
