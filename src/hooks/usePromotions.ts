import { useContext } from 'react';
import { PromotionsContext } from '@/contexts/promotions-context';
import type { Promotion } from '@/types/promotion';

// Re-export type for components that need it
export type { Promotion };

// Hook for backward compatibility
export function usePromotions() {
  const context = useContext(PromotionsContext);
  
  // Return default values if context is not available (e.g., during SSR or outside provider)
  if (!context) {
    return {
      promotions: [] as Promotion[],
      loading: true,
      error: null,
      lastUpdate: null,
      refresh: async () => {},
      isLive: false,
      newCount: 0,
      clearNewCount: () => {},
      markAsRead: async () => {},
      markAllAsRead: async () => {},
      readPromotionIds: new Set<string>(),
    };
  }
  
  return context;
}
