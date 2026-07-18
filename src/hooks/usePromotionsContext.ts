import { useContext } from 'react';
import { PromotionsContext, type PromotionsContextValue } from '@/contexts/promotions-context';

export function usePromotionsContext(): PromotionsContextValue {
  const context = useContext(PromotionsContext);
  if (!context) {
    throw new Error('usePromotionsContext must be used within a PromotionsProvider');
  }
  return context;
}
