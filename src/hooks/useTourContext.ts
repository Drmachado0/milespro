import { useContext } from 'react';
import { TourContext } from '@/contexts/tour-context';

export function useTourContext() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTourContext must be used within TourProvider');
  }
  return context;
}
