export interface Promotion {
  id: string;
  type: 'warning' | 'promo' | 'income' | 'bonus';
  title: string;
  description: string;
  link?: string | null;
  source: string;
  expires_at?: string | null;
  created_at: string;
  is_active: boolean;
}

export type PromotionType = Promotion['type'];
