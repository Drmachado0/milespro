import { ReactNode } from 'react';
import { useTour } from '@/hooks/useTour';
import { TourModal } from '@/components/tour/TourModal';
import { TourTooltips } from '@/components/tour/TourTooltips';
import { TourContext } from '@/contexts/tour-context';

export function TourProvider({ children }: { children: ReactNode }) {
  const tour = useTour();

  return (
    <TourContext.Provider value={tour}>
      {children}
      <TourTooltips
        currentStep={tour.currentStep}
        isActive={tour.isActive}
      />
      <TourModal
        isOpen={tour.isActive}
        currentStep={tour.currentStep}
        currentStepIndex={tour.currentStepIndex}
        totalSteps={tour.totalSteps}
        onNext={tour.nextStep}
        onPrevious={tour.previousStep}
        onSkip={tour.skipTour}
      />
    </TourContext.Provider>
  );
}

