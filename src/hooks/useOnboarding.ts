import { useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ONBOARDING_STEPS, REQUIRED_STEPS } from '@/data/onboardingSteps';

interface OnboardingProgress {
  completed: string[];
  dismissed: boolean;
  started_at: string | null;
}

const DEFAULT_PROGRESS: OnboardingProgress = {
  completed: [],
  dismissed: false,
  started_at: null,
};

export function useOnboarding() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user profile with onboarding progress
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_progress')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch holders for auto-detection - use user.id in key
  const { data: holders } = useQuery({
    queryKey: ['holders', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('holders')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch cards for auto-detection
  const { data: cards } = useQuery({
    queryKey: ['credit_cards', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('credit_cards')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch program balances for prices auto-detection - use user.id in key
  const { data: programBalances } = useQuery({
    queryKey: ['program_balances', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('program_balances')
        .select('average_cost')
        .eq('user_id', user.id)
        .gt('average_cost', 0)
        .limit(3);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch operations for balance auto-detection
  const { data: entryOperations } = useQuery({
    queryKey: ['entry-operations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('operations')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'entrada_manual')
        .limit(1);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch club subscriptions for auto-detection - use user.id in key
  const { data: clubSubscriptions } = useQuery({
    queryKey: ['club_subscriptions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('club_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('active', true)
        .limit(1);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // NEW: Fetch alert settings for auto-detection
  const { data: alertSettings } = useQuery({
    queryKey: ['alert-settings-check', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('user_alert_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // NEW: Fetch any operation for first_operation auto-detection
  const { data: anyOperation } = useQuery({
    queryKey: ['any-operation', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('operations')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // NEW: Fetch cards with VIP quota configured
  const { data: vipCards } = useQuery({
    queryKey: ['vip-cards-check', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('credit_cards')
        .select('id')
        .eq('user_id', user.id)
        .or('vip_quota_titular.gt.0,vip_quota_convidado.gt.0')
        .limit(1);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Calculate auto-completed steps based on existing data
  const autoCompletedSteps = useMemo(() => {
    const completed: string[] = [];
    
    if (holders && holders.length > 0) {
      completed.push('holders');
    }
    
    if (cards && cards.length > 0) {
      completed.push('cards');
    }
    
    if (programBalances && programBalances.length >= 1) {
      completed.push('prices');
    }
    
    if (entryOperations && entryOperations.length > 0) {
      completed.push('balance');
    }
    
    if (clubSubscriptions && clubSubscriptions.length > 0) {
      completed.push('club');
    }

    // NEW: Auto-detect alerts configuration
    if (alertSettings) {
      completed.push('alerts');
    }

    // NEW: Auto-detect first operation
    if (anyOperation && anyOperation.length > 0) {
      completed.push('first_operation');
    }

    // NEW: Auto-detect VIP quota configuration
    if (vipCards && vipCards.length > 0) {
      completed.push('vip_quota');
    }
    
    return completed;
  }, [holders, cards, programBalances, entryOperations, clubSubscriptions, alertSettings, anyOperation, vipCards]);

  // Get stored progress
  const storedProgress = useMemo((): OnboardingProgress => {
    if (!profile?.onboarding_progress) return DEFAULT_PROGRESS;
    
    const progress = profile.onboarding_progress as unknown as OnboardingProgress;
    return {
      completed: progress.completed || [],
      dismissed: progress.dismissed || false,
      started_at: progress.started_at || null,
    };
  }, [profile]);

  // Combine auto-detected with manually completed steps
  const completedSteps = useMemo(() => {
    return [...new Set([...autoCompletedSteps, ...storedProgress.completed])];
  }, [autoCompletedSteps, storedProgress.completed]);

  // Calculate completion percentage (only required steps)
  const completionPercentage = useMemo(() => {
    const completedRequiredCount = REQUIRED_STEPS.filter(
      step => completedSteps.includes(step.id)
    ).length;
    return Math.round((completedRequiredCount / REQUIRED_STEPS.length) * 100);
  }, [completedSteps]);

  // Check if all required steps are complete
  const isComplete = useMemo(() => {
    return REQUIRED_STEPS.every(step => completedSteps.includes(step.id));
  }, [completedSteps]);

  // Determine if card should be shown
  const shouldShowCard = useMemo(() => {
    return !storedProgress.dismissed && !isComplete;
  }, [storedProgress.dismissed, isComplete]);

  // Mutation to update onboarding progress
  const updateProgressMutation = useMutation({
    mutationFn: async (newProgress: Partial<OnboardingProgress>) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const updatedProgress = {
        ...storedProgress,
        ...newProgress,
        started_at: storedProgress.started_at || new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          onboarding_progress: JSON.parse(JSON.stringify(updatedProgress))
        })
        .eq('id', user.id);
      
      if (error) throw error;
      return updatedProgress;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });

  // Mark a step as complete
  const markComplete = useCallback((stepId: string) => {
    if (completedSteps.includes(stepId)) return;
    
    updateProgressMutation.mutate({
      completed: [...storedProgress.completed, stepId],
    });
  }, [completedSteps, storedProgress.completed, updateProgressMutation]);

  // Skip an optional step (mark as complete)
  const skipStep = useCallback((stepId: string) => {
    markComplete(stepId);
  }, [markComplete]);

  // Dismiss the onboarding card
  const dismiss = useCallback(() => {
    updateProgressMutation.mutate({
      dismissed: true,
    });
  }, [updateProgressMutation]);

  // Reset onboarding (for testing/debugging)
  const reset = useCallback(() => {
    updateProgressMutation.mutate({
      completed: [],
      dismissed: false,
      started_at: null,
    });
  }, [updateProgressMutation]);

  return {
    steps: ONBOARDING_STEPS,
    completedSteps,
    completionPercentage,
    isComplete,
    shouldShowCard,
    markComplete,
    skipStep,
    dismiss,
    reset,
    isLoading: profileLoading,
    isUpdating: updateProgressMutation.isPending,
  };
}
