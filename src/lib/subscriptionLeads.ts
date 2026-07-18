import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';

export type SubscriptionLeadPlan = 'free' | 'pro' | 'vip';
export type SubscriptionLeadBillingPeriod = 'monthly' | 'semiannual' | 'annual';
export type SubscriptionLeadSource = 'landing_pricing' | 'dashboard_subscription' | 'feature_gate' | 'unknown';

export interface SubscriptionLeadInput {
  email?: string | null;
  userId?: string | null;
  plan: SubscriptionLeadPlan;
  billingPeriod: SubscriptionLeadBillingPeriod;
  source: SubscriptionLeadSource;
  priceLabel?: string | null;
  totalLabel?: string | null;
  whatsappSent?: boolean;
  metadata?: Record<string, unknown>;
}

export interface SubscriptionLeadResult {
  id: string | null;
  saved: boolean;
  error?: string;
}

const getAnonymousLeadId = () => {
  if (typeof window === 'undefined') return null;
  const key = 'milespro:anonymous-lead-id';
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const id = crypto.randomUUID();
  window.localStorage.setItem(key, id);
  return id;
};

export async function createSubscriptionLead(input: SubscriptionLeadInput): Promise<SubscriptionLeadResult> {
  const anonymousId = getAnonymousLeadId();
  const leadCaptureEnabled = import.meta.env.VITE_ENABLE_SUBSCRIPTION_LEADS === 'true';

  if (!leadCaptureEnabled) {
    return { id: null, saved: false, error: 'subscription_leads disabled' };
  }

  try {
    const { data, error } = await (supabase as unknown as {
      from: (t: string) => {
        insert: (v: Record<string, unknown>) => {
          select: (s: string) => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> };
        };
      };
    })
      .from('subscription_leads')
      .insert({
        user_id: input.userId || null,
        anonymous_id: anonymousId,
        email: input.email || null,
        plan_interest: input.plan,
        billing_period: input.billingPeriod,
        source: input.source,
        price_label: input.priceLabel || null,
        total_label: input.totalLabel || null,
        whatsapp_sent_at: input.whatsappSent ? new Date().toISOString() : null,
        metadata: input.metadata || {},
      })
      .select('id')
      .single();

    if (error) {
      logger.warn('[subscription-leads] lead capture failed', error.message);
      return { id: null, saved: false, error: error.message };
    }

    return { id: data?.id || null, saved: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.warn('[subscription-leads] lead capture failed', message);
    return { id: null, saved: false, error: message };
  }
}

export function saveSubscriptionIntentLocally(input: SubscriptionLeadInput & { leadId?: string | null }) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem('milespro:last-subscription-intent', JSON.stringify({
    leadId: input.leadId || null,
    plan: input.plan,
    billingPeriod: input.billingPeriod,
    price: input.priceLabel || null,
    total: input.totalLabel || null,
    email: input.email || null,
    source: input.source,
    createdAt: new Date().toISOString(),
  }));
}
