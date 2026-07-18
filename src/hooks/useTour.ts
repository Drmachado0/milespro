import { useState, useEffect, useCallback } from 'react';
import { logger } from "@/lib/logger";
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TOUR_STEPS, TourStep } from '@/data/tourSteps';

interface TourState {
  isActive: boolean;
  currentStepIndex: number;
  hasCompletedTour: boolean;
  isLoading: boolean;
}

export function useTour() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [state, setState] = useState<TourState>({
    isActive: false,
    currentStepIndex: 0,
    hasCompletedTour: false,
    isLoading: true
  });

  // Load tour state from database
  useEffect(() => {
    if (!user?.id) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const loadTourState = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_progress')
          .eq('id', user.id)
          .single();

        const progress = profile?.onboarding_progress as Record<string, unknown> | null;
        const hasCompletedTour = progress?.tourCompleted === true;
        const isFirstLogin = !progress?.hasLoggedInBefore;

        setState(prev => ({
          ...prev,
          hasCompletedTour,
          // Auto-start tour for first-time users
          isActive: isFirstLogin && !hasCompletedTour,
          isLoading: false
        }));

        // Mark that user has logged in before
        if (isFirstLogin) {
          await supabase
            .from('profiles')
            .update({
              onboarding_progress: {
                ...progress,
                hasLoggedInBefore: true
              }
            })
            .eq('id', user.id);
        }
      } catch (error) {
        logger.error('Error loading tour state:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadTourState();
  }, [user?.id]);

  const currentStep: TourStep | null = state.isActive 
    ? TOUR_STEPS[state.currentStepIndex] 
    : null;

  const startTour = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: true,
      currentStepIndex: 0
    }));
    
    // Navigate to first step
    const firstStep = TOUR_STEPS[0];
    if (firstStep) {
      navigate(firstStep.path);
    }
  }, [navigate]);

  const completeTour = useCallback(async () => {
    setState(prev => ({
      ...prev,
      isActive: false,
      hasCompletedTour: true,
      currentStepIndex: 0
    }));

    if (user?.id) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_progress')
          .eq('id', user.id)
          .single();

        await supabase
          .from('profiles')
          .update({
            onboarding_progress: {
              ...(profile?.onboarding_progress as Record<string, unknown> || {}),
              tourCompleted: true,
              tourCompletedAt: new Date().toISOString()
            }
          })
          .eq('id', user.id);
      } catch (error) {
        logger.error('Error saving tour completion:', error);
      }
    }

    navigate('/dashboard');
  }, [user?.id, navigate]);

  const nextStep = useCallback(async () => {
    const nextIndex = state.currentStepIndex + 1;
    
    if (nextIndex >= TOUR_STEPS.length) {
      // Tour completed
      await completeTour();
      return;
    }

    const nextStepData = TOUR_STEPS[nextIndex];
    
    setState(prev => ({
      ...prev,
      currentStepIndex: nextIndex
    }));

    // Navigate to next step's page
    if (nextStepData.action === 'navigate') {
      navigate(nextStepData.path);
    }
  }, [state.currentStepIndex, navigate, completeTour]);

  const previousStep = useCallback(() => {
    if (state.currentStepIndex <= 0) return;

    const prevIndex = state.currentStepIndex - 1;
    const prevStepData = TOUR_STEPS[prevIndex];

    setState(prev => ({
      ...prev,
      currentStepIndex: prevIndex
    }));

    if (prevStepData.action === 'navigate') {
      navigate(prevStepData.path);
    }
  }, [state.currentStepIndex, navigate]);

  const skipTour = useCallback(async () => {
    setState(prev => ({
      ...prev,
      isActive: false,
      currentStepIndex: 0
    }));

    // Mark tour as skipped (not completed, so it can be restarted)
    if (user?.id) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_progress')
          .eq('id', user.id)
          .single();

        await supabase
          .from('profiles')
          .update({
            onboarding_progress: {
              ...(profile?.onboarding_progress as Record<string, unknown> || {}),
              tourSkipped: true
            }
          })
          .eq('id', user.id);
      } catch (error) {
        logger.error('Error saving tour skip state:', error);
      }
    }

    navigate('/dashboard');
  }, [user?.id, navigate]);


  return {
    isActive: state.isActive,
    isLoading: state.isLoading,
    hasCompletedTour: state.hasCompletedTour,
    currentStep,
    currentStepIndex: state.currentStepIndex,
    totalSteps: TOUR_STEPS.length,
    startTour,
    nextStep,
    previousStep,
    skipTour,
    completeTour
  };
}
