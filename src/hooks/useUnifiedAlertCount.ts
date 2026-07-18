import { useMemo } from 'react';
import { usePromotions } from './usePromotions';
import { usePriceAlerts } from './usePriceAlerts';
import { useExpirationAlerts } from './useExpirationAlerts';

export interface UnifiedAlertCounts {
  promotions: number;
  priceAlerts: number;
  expirations: number;
  total: number;
  hasCritical: boolean;
}

export function useUnifiedAlertCount(): UnifiedAlertCounts {
  const { promotions = [], newCount = 0, readPromotionIds } = usePromotions();
  const { triggeredAlerts = [] } = usePriceAlerts();
  const { criticalExpirations = [] } = useExpirationAlerts();

  const counts = useMemo(() => {
    // Count unread promotions
    const unreadPromotions = promotions.filter(p => !readPromotionIds.has(p.id)).length;
    
    // Count active triggered price alerts
    const triggeredPriceAlerts = triggeredAlerts.length;
    
    // Count critical expirations (7 days or less)
    const criticalCount = criticalExpirations.length;
    
    const total = unreadPromotions + triggeredPriceAlerts + criticalCount;
    
    return {
      promotions: unreadPromotions,
      priceAlerts: triggeredPriceAlerts,
      expirations: criticalCount,
      total,
      hasCritical: criticalCount > 0,
    };
  }, [promotions, readPromotionIds, triggeredAlerts, criticalExpirations]);

  return counts;
}
