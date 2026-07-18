import { createContext } from 'react';
import type { TourStep } from '@/data/tourSteps';

export interface TourContextValue {
  isActive: boolean;
  isLoading: boolean;
  hasCompletedTour: boolean;
  currentStep: TourStep | null;
  currentStepIndex: number;
  totalSteps: number;
  startTour: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTour: () => void;
}

export const TourContext = createContext<TourContextValue | null>(null);
