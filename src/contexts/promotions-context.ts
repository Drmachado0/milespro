import { createContext } from 'react';
import type { Promotion } from '@/types/promotion';

export interface PromotionsContextValue {
  promotions: Promotion[];
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  refresh: () => Promise<void>;
  isLive: boolean;
  newCount: number;
  clearNewCount: () => void;
  markAsRead: (promotionId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  readPromotionIds: Set<string>;
}

export const PromotionsContext = createContext<PromotionsContextValue | null>(null);
